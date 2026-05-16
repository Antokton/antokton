import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'sq,en-US;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(18000)
    });
    const text = await res.text();
    console.log(`Fetched ${url}: ${text.length} chars`);
    return text;
  } catch (e) {
    console.error("Fetch error:", e.message);
    return "";
  }
}

function extractStructuredData(html) {
  // Try __NEXT_DATA__ (Next.js SSR)
  let ssrData = null;
  const nextMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextMatch) {
    try {
      const nd = JSON.parse(nextMatch[1]);
      const pp = nd?.props?.pageProps;
      ssrData = pp?.product || pp?.job || pp?.data || pp?.listing || pp?.item || pp?.post || null;
      if (ssrData?.productData) ssrData = ssrData.productData;
    } catch(e) {}
  }

  // Try JSON-LD structured data (LinkedIn, Indeed, etc.)
  let jsonLd = null;
  const ldMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item['@type'] === 'JobPosting' || item['@type'] === 'Product' || item['@type'] === 'Offer') {
          jsonLd = item;
          break;
        }
      }
    } catch(e) {}
  }

  // Extract images
  let images = [];
  if (ssrData) {
    for (const f of ['gallery', 'images', 'photos', 'imageUrls', 'pictures', 'media']) {
      const val = ssrData[f];
      if (Array.isArray(val) && val.length > 0) {
        const ext = val.map(v => typeof v === 'string' ? v : v?.url || v?.src || '').filter(u => u?.startsWith('http'));
        if (ext.length > 0) { images = ext; break; }
      }
    }
  }
  if (images.length === 0) {
    const fbImgs = [...html.matchAll(/src=["'](https:\/\/firebasestorage\.googleapis\.com[^"'\s>]+)["']/gi)];
    images = [...new Set(fbImgs.map(m => m[1]))].filter(u => !u.includes('placeholder') && !u.includes('avatar'));
  }

  // Extract phone from tel: links and WhatsApp
  let phone = null;
  const telMatch = html.match(/href=["']tel:(\+?[\d\s\-\.]+)["']/i);
  if (telMatch) phone = telMatch[1].replace(/[\s\-\.]/g, '').trim();
  if (!phone) {
    const waMatch = html.match(/whatsapp\.com\/send\?phone=([\d]+)/i);
    if (waMatch) phone = "+" + waMatch[1];
  }
  if (!phone && ssrData) {
    phone = ssrData?.user?.phone || ssrData?.contact?.phone || ssrData?.phoneNumber || null;
  }

  // Basic fields from SSR/JSON-LD
  const title = ssrData?.title || ssrData?.name || jsonLd?.title || jsonLd?.name || null;
  const description = ssrData?.description || jsonLd?.description || null;
  const salary = jsonLd?.baseSalary?.value?.value || jsonLd?.salary || ssrData?.salary || ssrData?.price || null;
  const employmentType = jsonLd?.employmentType || null;
  const datePosted = jsonLd?.datePosted || null;
  const validThrough = jsonLd?.validThrough || null;

  // Location
  let city = null, country = null, address = null;
  const jlLoc = jsonLd?.jobLocation;
  if (jlLoc) {
    address = jlLoc?.address?.streetAddress || null;
    city = jlLoc?.address?.addressLocality || null;
    country = jlLoc?.address?.addressCountry || null;
  }
  if (!city && ssrData) {
    city = ssrData?.city || ssrData?.location?.city || null;
    country = ssrData?.country || ssrData?.location?.country || null;
    address = ssrData?.address || ssrData?.location?.address || null;
  }
  // Albanian cities fallback
  if (!city) {
    const cm = html.match(/\b(Prishtinë|Prishtina|Tiranë|Tirana|Shkodër|Shkodra|Gjakovë|Prizren|Mitrovicë|Ferizaj|Pejë|Gjilan|Vushtrri|Lipjan|Viti|Dragash|Rahovec|Suharekë|Kamenicë|Istog|Deçan|Malishevë|Kaçanik|Shtime|Podujevë|Skenderaj|Lezhë|Durrës|Fier|Elbasan|Korçë|Vlorë|Berat|Gjirokastër)\b/i);
    if (cm) city = cm[1];
  }

  // Poster
  const posterName = ssrData?.user?.name || ssrData?.user?.displayName || ssrData?.seller?.name || jsonLd?.hiringOrganization?.name || null;
  const posterUrl = ssrData?.user?.profileUrl || null;

  return { title, description, images, phone, city, country, address, salary, employmentType, datePosted, validThrough, posterName, posterUrl };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth check - admin or moderator only
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      return Response.json({ success: false, error: 'Qasje e ndaluar' }, { status: 403 });
    }

    const { url, job_type } = await req.json();
    if (!url) return Response.json({ success: false, error: "URL është e detyrueshme" }, { status: 400 });

    console.log("Importing job from:", url);

    // Step 1: Fetch HTML
    const html = await fetchHtml(url);
    const scraped = extractStructuredData(html);
    console.log("Scraped:", JSON.stringify({ title: scraped.title, city: scraped.city, phone: scraped.phone, images: scraped.images.length }));

    // Step 2: AI extraction — use up to 30k chars of HTML for max info
    const htmlSnippet = html.slice(0, 30000);

    const prompt = `Analizo HTML-në e mëposhtme nga faqja "${url}" dhe nxirr informacion MAKSIMAL për njoftimin e punës.

HTML:
${htmlSnippet}

Nxirr SA MË SHUMË informacion:
- title: Titulli i saktë i pozicionit
- description: Përshkrimi i plotë (ruaj paragrafët, lista me detyra dhe kualifikime)
- profession: Profesioni/pozicioni (p.sh. "Inxhinier Softueri", "Kuzhinier", "Shofer")
- job_type: "ofroj" (ofrohet punë) ose "kerkoj" (kërkohet punë)
- contract_type: "full-time" | "part-time" | "contract" | "freelance" | "internship"
- experience_level: "entry" | "mid" | "senior" | "executive"
- salary_info: Paga/kompensimi (p.sh. "800-1200€/muaj", "Negociabile")
- city: Qyteti (p.sh. "Prishtinë", "Tiranë")
- country: Shteti (p.sh. "Kosovë", "Shqipëri", "Gjermani")
- address: Adresa e saktë nëse ka
- phone_number: Numri nga href="tel:+..." ose whatsapp — VETËM nëse gjendet direkt, mos shpiko
- contact_info: Email, website, ose adresë tjetër kontakti
- poster_name: Emri i kompanisë ose personit
- author_profile_url: URL e profilit/kompanisë
- required_skills: Aftësitë e kërkuara (si tekst, p.sh. "JavaScript, React, Node.js")
- halal_standard: "po" nëse pozicioni ka të bëjë me ushqim/pije dhe kërkon standard hallall, "jo" ndryshe
- image_urls: URL-të e fotove (src="https://...")

Kthe VETËM JSON valid. Mos shpiko — nëse nuk gjendet, lëre fushën bosh ose null.`;

    const ai = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          profession: { type: "string" },
          job_type: { type: "string" },
          contract_type: { type: "string" },
          experience_level: { type: "string" },
          salary_info: { type: "string" },
          city: { type: "string" },
          country: { type: "string" },
          address: { type: "string" },
          phone_number: { type: "string" },
          contact_info: { type: "string" },
          poster_name: { type: "string" },
          author_profile_url: { type: "string" },
          required_skills: { type: "string" },
          halal_standard: { type: "string" },
          image_urls: { type: "array", items: { type: "string" } },
        }
      }
    });

    console.log("AI result:", JSON.stringify({ title: ai?.title, city: ai?.city, contract: ai?.contract_type, exp: ai?.experience_level }));

    // Validate phone
    const rawPhone = scraped.phone || ai?.phone_number || "";
    const cleanPhone = rawPhone.match(/^\+?[\d]{7,15}$/) ? rawPhone : "";

    // Merge images
    const aiImages = Array.isArray(ai?.image_urls) ? ai.image_urls.filter(u => u?.startsWith('http')) : [];
    const finalImages = scraped.images.length > 0 ? scraped.images : aiImages;

    // Determine job_type
    const resolvedJobType = job_type || ai?.job_type || "ofroj";

    // Validate contract_type and experience_level against allowed enums
    const validContracts = ["full-time", "part-time", "contract", "freelance", "internship"];
    const validExperience = ["entry", "mid", "senior", "executive"];
    const contract = validContracts.includes(ai?.contract_type) ? ai.contract_type : null;
    const experience = validExperience.includes(ai?.experience_level) ? ai.experience_level : null;

    const data = {
      title: scraped.title || ai?.title || "Pa titull",
      description: scraped.description || ai?.description || "",
      profession: ai?.profession || "",
      job_type: resolvedJobType,
      contract_type: contract,
      experience_level: experience,
      salary_info: scraped.salary ? String(scraped.salary) : (ai?.salary_info || ""),
      city: scraped.city || ai?.city || "",
      country: scraped.country || ai?.country || "",
      address: scraped.address || ai?.address || "",
      phone_number: cleanPhone,
      contact_info: ai?.contact_info || "",
      poster_name: scraped.posterName || ai?.poster_name || "",
      author_profile_url: scraped.posterUrl || ai?.author_profile_url || "",
      required_skills: ai?.required_skills || "",
      halal_standard: ai?.halal_standard === "po" ? "po" : "jo",
      image_urls: finalImages,
      category: "pune",
      source_url: url,
    };

    return Response.json({ success: true, data });

  } catch (error) {
    console.error("Import job error:", error.message);
    return Response.json({ success: false, error: "Gabim: " + error.message }, { status: 500 });
  }
});
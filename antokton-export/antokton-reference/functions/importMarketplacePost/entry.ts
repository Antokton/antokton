// importMarketplacePost.ts
// Merr te dhena nga nje link marketplace (p.sh. merrfal.com)
// SHENIM: Merrfal fsheh telefonin dhe adresen e plote me JavaScript;
// importohen: titulli, pershkrimi, cmimi, imazhet, qyteti.

async function fetchHtml(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'sq,en;q=0.8',
      },
      redirect: 'follow',
    });
    return await res.text();
  } catch (e: any) {
    console.error('Fetch error:', e.message);
    return '';
  }
}

function clipBeforeRelated(html: string): string {
  const patterns = ['produkte-te-tjera', 'Produkte t\u00eb tjera', 'Produkte t\u00eb ngjashme', 'similar-products'];
  for (const p of patterns) {
    const idx = html.toLowerCase().indexOf(p.toLowerCase(), 2000);
    if (idx > 2000) return html.slice(0, idx);
  }
  return html;
}

function extractFromHtml(htmlRaw: string) {
  if (!htmlRaw) return { images: [], phone: null, address: null, city: null, posterName: null, price: null, title: null, description: null, phone_number: null, location: null };

  const html = clipBeforeRelated(htmlRaw);

  // === SSR __NEXT_DATA__ ===
  let productData: any = null;
  const nextMatch = htmlRaw.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextMatch) {
    try {
      const nd = JSON.parse(nextMatch[1]);
      const pp = nd?.props?.pageProps;
      const candidate = pp?.product || pp?.data || pp?.listing || pp?.item || pp?.post || pp?.productData;
      productData = candidate?.productData || candidate || null;
    } catch (e) {}
  }

  console.log('SSR data keys:', productData ? Object.keys(productData).join(',') : 'none');

  // === IMAZHET ===
  let images: string[] = [];
  if (productData) {
    for (const key of ['gallery', 'images', 'photos', 'imageUrls', 'pictures', 'media']) {
      const val = productData[key];
      if (Array.isArray(val) && val.length > 0) {
        const extracted = val
          .map((v: any) => (typeof v === 'string' ? v : v?.url || v?.imageUrl || v?.src || ''))
          .filter((u: string) => u && u.startsWith('http') && !u.includes('placeholder') && !u.includes('no-product'));
        if (extracted.length > 0) { images = extracted; break; }
      }
    }
  }
  if (images.length === 0) {
    const fbMatches = [...htmlRaw.matchAll(/src=["'](https:\/\/firebasestorage\.googleapis\.com[^"'\s>]+)["']/g)];
    images = [...new Set(fbMatches.map((m: any) => m[1]))].filter((u: string) =>
      !u.includes('placeholder') && !u.includes('no-product') && !u.includes('no-avatar')
    );
  }

  // === TELEFONI: tel: href ose WhatsApp ===
  // Merrfal e gjeneron me JavaScript - nuk eshte ne HTML statik
  let phone: string | null = null;
  const telM = html.match(/href=["']tel:([\+\d\s\-\.]{6,20})["']/);
  if (telM) phone = telM[1].replace(/[\s\-\.]/g, '').trim();
  if (!phone) {
    const waM = html.match(/(?:wa\.me|whatsapp\.com\/send)[^"']*phone=([\d]{6,20})/i);
    if (waM) phone = '+' + waM[1];
  }
  if (!phone && productData) {
    const raw = productData.phone || productData.phoneNumber || productData.phone_number
      || productData.contact?.phone || productData.user?.phone || null;
    if (raw) phone = String(raw).replace(/\s/g, '');
  }
  console.log('HTML:', htmlRaw.length, 'chars | tel:', !!html.includes('href="tel:'), '| whatsapp:', !!html.includes('wa.me'));

  // === ADRESA dhe QYTETI ===
  let address: string | null = null;
  let city: string | null = null;
  if (productData) {
    const loc = productData.location || productData.address || productData.locationName;
    if (typeof loc === 'string' && loc.trim()) {
      address = loc.trim();
    } else if (loc && typeof loc === 'object') {
      address = loc.address || loc.name || null;
      city = loc.city || loc.cityName || null;
    }
    if (!city) city = productData.city || productData.cityName || productData.municipality || null;
  }
  if (!address) {
    const rrM = html.match(/Rruga\s+([^<"'\n]{5,60})/);
    if (rrM) {
      const raw = rrM[0].replace(/<[^>]+>/g, '').trim();
      address = raw.slice(0, 60);
      const cM = address.match(/,\s*(.{3,30})$/);
      if (cM) city = cM[1].trim();
    }
  }
  if (!city) {
    const cityM = htmlRaw.match(/\b(Prishtin[e\u00eb]|Prishtina|Prizren|Gjakov[ae]|Pej[ae]|Mitrovic[ae]|Ferizaj|Podujeve|Vushtrri)\b/i);
    if (cityM) city = cityM[1];
  }

  // === TITULLI ===
  let title: string | null = null;
  if (productData) title = productData.name || productData.title || productData.headline || null;
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([^<]{3,100})<\/h1>/i);
    if (h1) title = h1[1].replace(/&amp;/g, '&').trim();
  }
  if (!title) {
    const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']{3,100})["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{3,100})["'][^>]+property=["']og:title["']/i);
    if (og) title = og[1].trim();
  }

  // === CMIMI ===
  let price: string | null = null;
  if (productData) {
    const p = productData.price || productData.salary || productData.salary_info || productData.amount;
    if (p !== undefined && p !== null) {
      price = String(p).trim();
      if (price === '0' || price.toLowerCase() === 'falas') price = 'Falas';
    }
  }
  if (!price) {
    if (/\bFalas\b/i.test(html)) price = 'Falas';
    else {
      const pm = html.match(/(\d[\d\.,\s]{0,8}\s*(?:\u20ac|EUR))/i);
      if (pm) price = pm[1].trim();
    }
  }

  // === PERSHKRIMI ===
  let description: string | null = null;
  if (productData) {
    const d = productData.description || productData.body || productData.content || productData.text;
    if (d) description = String(d).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  if (!description) {
    const dm = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{10,})["']/i)
      || html.match(/<meta[^>]+content=["']([^"']{10,})["'][^>]+name=["']description["']/i);
    if (dm) description = dm[1].trim();
  }

  // === EMRI I POSTUESIT ===
  let posterName: string | null = null;
  if (productData) {
    posterName = productData.user?.name || productData.user?.username
      || productData.seller?.name || productData.owner?.name || productData.posterName || null;
  }

  return {
    images,
    phone,
    phone_number: phone,
    address,
    location: address || city || null,
    city,
    posterName,
    price,
    title,
    description,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' } });
  }

  try {
    const { url } = await req.json();
    if (!url) return Response.json({ error: 'URL mungon' }, { status: 400 });

    console.log('Importing:', url);
    const html = await fetchHtml(url);
    if (!html) return Response.json({ error: 'Nuk u mor HTML' }, { status: 500 });

    const scraped = extractFromHtml(html);
    console.log('Scraped:', JSON.stringify({ title: scraped.title, images: scraped.images.length, phone: scraped.phone, city: scraped.city, address: scraped.address }));

    const result = {
      success: true,
      data: {
        title: scraped.title || '',
        description: scraped.description || '',
        salary_info: scraped.price || '',
        image_urls: scraped.images,
        phone_number: scraped.phone_number || '',
        location: scraped.location || '',
        address: scraped.address || '',
        city: scraped.city || '',
        poster_name: scraped.posterName || '',
        author_profile_url: '',
        import_author_profile_url: '',
        contact_info: '',
        country: '',
        source_url: url || '',
        import_source_url: url || '',
        show_source_url: false,
        show_author_profile_url: false,
      }
    };

    return Response.json(result, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (error: any) {
    console.error('Import error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
  }
});

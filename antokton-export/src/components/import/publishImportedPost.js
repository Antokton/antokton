import { extractImportedPostFields, sanitizeImportedText } from "@/lib/importExtractors";

const STAFF_DEFAULT_POSTER_NAME = "Koordinator Projekti";

const ANTOKTON_CITY_RE = /\b(tiran[eë]?|tirana|durr[eë]s|durres|shkod[eë]r|shkoder|elbasan|vlor[eë]|vlore|kor[çc][eë]|korce|prishtin[eë]?|prishtina|prizren|pej[eë]|gjakov[eë]|gjilan|ferizaj|budva|ulqin|tivar|tuzi|plav[eë]|guci|preshev[eë]|bujanovc|medvegj[eë]|shkup|tetov[eë]|gostivar|kumanov[eë]|oh[eë]r|strug[eë]|janin[eë]|filat|[çc]am[eë]ri)\b/i;

export function normalizeImportedCountry(post = {}) {
  const country = sanitizeImportedText(post.country || "").trim();
  const locationText = sanitizeImportedText([post.city, post.region, post.address].filter(Boolean).join(" "));
  if (/^(shqip[eë]ri|shqiperia|albania|kosov[eë]|kosova|mal i zi|mali i zi|serbi|serbia|greqi|greqia|maqedoni|maqedonia|maqedoni e veriut|maqedonia e veriut)$/i.test(country)) {
    return "Antokton";
  }
  if (ANTOKTON_CITY_RE.test(locationText)) return "Antokton";
  return country;
}

export function normalizeImportedCategory(post = {}) {
  const category = String(post.category || "").trim();
  if (category === "prona") return "pazar";
  return category || "pune";
}

export function normalizeImportedListingType(post = {}) {
  const listingType = String(post.listing_type || "").trim();
  const category = normalizeImportedCategory(post);
  if (category === "pune" || category === "sherbime") {
    if (listingType === "kerkoj" || listingType === "ofroj") return listingType;
    if (/kerkoj|k[eë]rkoj/i.test(sanitizeImportedText(`${post.title || ""} ${post.edited_text || ""}`))) return "kerkoj";
    return "ofroj";
  }
  if (category === "pazar" && !listingType) return "shitje";
  return listingType || "tjeter";
}

export function buildJobPayloadFromImportedPost(post = {}, user = {}) {
  const cleanOriginalText = sanitizeImportedText(post.original_text || post.import_original_text || post.edited_text || "");
  const cleanEditedText = sanitizeImportedText(post.edited_text || post.description || cleanOriginalText);
  const prepared = extractImportedPostFields(cleanOriginalText, {
    ...post,
    description: cleanEditedText,
    source_url: post.source_url || post.import_source_url || post.original_post_url,
    import_source_url: post.import_source_url || post.source_url || post.original_post_url,
    author_profile_url: post.author_profile_url || post.import_author_profile_url,
    import_author_profile_url: post.import_author_profile_url || post.author_profile_url,
  });
  const images = (Array.isArray(post.image_urls) ? post.image_urls : post.image_url ? [post.image_url] : [])
    .filter(Boolean)
    .slice(0, 6);
  const mainImageIndex = Math.min(
    Math.max(Number.parseInt(post.main_image_index, 10) || 0, 0),
    Math.max(images.length - 1, 0)
  );
  const title = sanitizeImportedText(post.title || cleanEditedText.split(/\r?\n/).find(Boolean) || "Njoftim").slice(0, 120);
  const category = normalizeImportedCategory(post);

  return {
    title,
    description: prepared.description || cleanEditedText,
    category,
    pazar_category: post.pazar_category || (category === "pazar" && post.category === "prona" ? "prona" : ""),
    pazar_subcategory: post.pazar_subcategory || "",
    profession: post.profession || post.position || "",
    job_type: normalizeImportedListingType({ ...post, category }),
    listing_type: normalizeImportedListingType({ ...post, category }),
    country: normalizeImportedCountry({ ...post, ...prepared }),
    city: prepared.city || post.city || "",
    zone: post.zone || post.region || "",
    region: post.region || post.zone || "",
    address: prepared.address || post.address || "",
    salary: post.salary || post.price || "",
    price: post.price || post.salary || "",
    phone_number: prepared.phone_number || post.phone_number || "",
    contact_info: prepared.contact_info || post.contact_info || "",
    source_url: prepared.source_url || post.source_url || post.import_source_url || post.original_post_url || "",
    import_source_url: prepared.import_source_url || post.import_source_url || post.source_url || post.original_post_url || "",
    author_profile_url: prepared.author_profile_url || post.author_profile_url || post.import_author_profile_url || "",
    import_author_profile_url: prepared.import_author_profile_url || post.import_author_profile_url || post.author_profile_url || "",
    show_source_url: post.show_source_url === true || post.show_original_post_url_publicly === true,
    show_author_profile_url: post.show_author_profile_url === true,
    imported_by: post.imported_by || user.email || "",
    importer_email: user.email || post.importer_email || post.imported_by || "",
    import_original_text: prepared.import_original_text || cleanOriginalText,
    poster_name: post.poster_name || post.platform_poster_name || STAFF_DEFAULT_POSTER_NAME,
    image_urls: images,
    main_image_index: mainImageIndex,
    image_url: images[mainImageIndex] || "",
    status: "approved",
    moderation_status: "approved",
    imported_community_request: true,
    import_type: "manual_import",
    original_import_id: post.id,
    likes_count: 0,
    dislikes_count: 0,
    comments_count: 0,
  };
}

export async function publishImportedPost(base44, post = {}, user = {}) {
  if (post.published_post_id) {
    await base44.entities.ImportedPost.update(post.id, {
      status: "publikuar",
      published_at: post.published_at || new Date().toISOString(),
    });
    return { id: post.published_post_id, alreadyPublished: true };
  }
  const created = await base44.entities.Job.create(buildJobPayloadFromImportedPost(post, user));
  await base44.entities.ImportedPost.update(post.id, {
    status: "publikuar",
    published_at: new Date().toISOString(),
    published_post_id: created?.id || created?._id || "",
  });
  return created;
}

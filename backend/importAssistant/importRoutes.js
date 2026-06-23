const { runImport, testImportSource, ensureDefaultSettings, ensureDefaultSources, normalizeSelectedSourceId } = require("./importRunner");
const { translateContactMessage } = require("./translateImportedItem");
const { buildExpiryFields } = require("./expiry");
const { normalizeSourceType, technicalDefaultsForSource } = require("./seedSources");
const { discoverSourceConfig } = require("./discoverSourceConfig");

function normalizeSourcePayload(body = {}) {
  let parserConfig = body.parser_config || {};
  if (typeof body.parser_config_json === "string" && body.parser_config_json.trim()) {
    try { parserConfig = JSON.parse(body.parser_config_json); } catch { parserConfig = body.parser_config || {}; }
  }
  const frequencyMinutes = Number(
    body.crawl_frequency_minutes ??
    (body.crawl_frequency_hours !== undefined ? Number(body.crawl_frequency_hours) * 60 : 360)
  );
  const enabled = body.enabled !== undefined
    ? body.enabled === true
    : (body.is_active !== undefined ? body.is_active !== false : true);
  const defaults = technicalDefaultsForSource(body);
  const sourceType = normalizeSourceType(defaults.source_type || body.source_type || body.parser_type || "manual");
  const importMode = body.import_mode || defaults.import_mode;
  const crawlMethod = body.crawl_method || defaults.crawl_method;
  const automationLevel = body.automation_level || defaults.automation_level;
  const sourceUrl = body.source_url || body.base_url || "";
  const providerKey = defaults.provider_key !== "custom"
    ? defaults.provider_key
    : (body.provider_key || defaults.provider_key);
  const sourceGroup = defaults.source_group !== "manual_url"
    ? defaults.source_group
    : (body.source_group || defaults.source_group);
  return {
    name: body.name || "Burim i ri",
    provider_key: providerKey,
    source_type: sourceType,
    import_mode: importMode,
    crawl_method: crawlMethod,
    automation_level: automationLevel,
    source_url: sourceUrl,
    base_url: body.base_url || body.source_url || "",
    api_endpoint: body.api_endpoint || (crawlMethod === "api" ? sourceUrl : ""),
    rss_url: body.rss_url || (crawlMethod === "rss" ? sourceUrl : ""),
    jobs_url: body.jobs_url || "",
    category_url: body.category_url || "",
    country_scope: body.country_scope || "",
    region_scope: body.region_scope || "",
    language: body.language || "",
    enabled,
    is_active: enabled,
    crawl_frequency_minutes: Math.max(0, frequencyMinutes || 0),
    crawl_frequency_hours: Math.max(0, Math.round((frequencyMinutes || 0) / 60)),
    country_filter: body.country_filter || "",
    category_filter: body.category_filter || "",
    profession_filter: body.profession_filter || "",
    excluded_keywords: body.excluded_keywords || "",
    source_group: sourceGroup,
    parser_type: body.parser_type || defaults.parser_type || crawlMethod || "manual",
    parser_config: parserConfig,
    trust_level: body.trust_level || defaults.trust_level || "needs_review",
    login_required: body.login_required === true,
    is_editable_by_admin: body.is_editable_by_admin !== false,
    original_source_required: body.original_source_required !== false,
    moderation_required: body.moderation_required !== undefined ? body.moderation_required !== false : defaults.moderation_required !== false,
    notes: body.notes || defaults.notes || "",
  };
}

function mapImportedToJob(post = {}, userEmail = "") {
  let contactMethods = post.contact_methods || [];
  if (typeof contactMethods === "string") {
    try { contactMethods = JSON.parse(contactMethods); } catch { contactMethods = []; }
  }
  const phone = contactMethods.find((m) => ["phone", "whatsapp"].includes(m.type))?.value || post.phone_number || "";
  const email = contactMethods.find((m) => m.type === "email")?.value || "";
  const website = contactMethods.find((m) => ["website", "application_form"].includes(m.type))?.value || "";
  const title = post.title || post.shqip_title || post.edited_text?.split(/\r?\n/).find(Boolean) || "Njoftim i importuar";
  const expiry = buildExpiryFields(post);
  return {
    title,
    description: post.edited_text || post.shqip_summary || post.original_text || "",
    category: post.category || "pune",
    profession: post.profession || "",
    job_type: post.listing_type || "ofroj",
    listing_type: post.listing_type || "ofroj",
    country: post.country || "",
    city: post.city || "",
    salary: post.salary || "",
    phone_number: phone,
    contact_info: [email, website].filter(Boolean).join(" "),
    contact_methods: contactMethods,
    source_url: post.source_url || post.import_source_url || "",
    import_source_url: post.import_source_url || post.source_url || "",
    source_name: post.source_name || post.source || "",
    show_source_url: post.source_public_visible === true || post.show_source_url === true,
    source_public_visible: post.source_public_visible === true || post.show_source_url === true,
    imported_public_badge_visible: post.imported_public_badge_visible === true,
    imported_by: post.imported_by || userEmail,
    importer_email: post.importer_email || userEmail,
    import_original_text: post.original_text || post.import_original_text || "",
    original_import_id: post.id,
    communication_languages: post.communication_languages || post.contact_languages || [],
    show_communication_language: post.show_communication_language === true || post.contact_language_required === true,
    relevance_score: post.relevance_score,
    risk_score: post.risk_score,
    ethical_score: post.ethical_score,
    hallall_score: post.hallall_score || post.ethical_score,
    final_score: post.final_score,
    ...expiry,
    status: "approved",
    moderation_status: "approved",
    import_type: "automatic_import",
    imported_community_request: true,
    poster_name: "Koordinator Projekti",
    likes_count: 0,
    comments_count: 0
  };
}

async function handleImportAssistantRoute(deps) {
  const {
    req,
    res,
    segments,
    send,
    sendError,
    readPayload,
    requesterHasRole,
    getRequestUserEmail,
    store,
    config
  } = deps;
  if (!(await requesterHasRole(req, ["admin", "moderator", "superadmin"]))) {
    return sendError(res, 403, "Admin/moderator role required");
  }

  const tail = segments.slice(3);
  const action = tail[0] || "";
  const userEmail = await getRequestUserEmail(req);

  if (req.method === "GET" && action === "settings") {
    return send(res, 200, await ensureDefaultSettings(store, config));
  }

  if (req.method === "PUT" && action === "settings") {
    const body = await readPayload(req);
    const settings = await ensureDefaultSettings(store, config);
    return send(res, 200, await store.updateRecord("ImportAssistantSettings", settings.id, {
      auto_import_enabled: body.auto_import_enabled === true,
      import_frequency_hours: Math.max(1, Number(body.import_frequency_hours || 6)),
      max_items_per_run: Math.max(1, Number(body.max_items_per_run || 100)),
      auto_publish_enabled: body.auto_publish_enabled === true,
      default_source_id: body.default_source_id || "",
      default_provider_key: body.default_provider_key || "",
      default_category_filter: body.default_category_filter || "",
      default_country_filter: body.default_country_filter || "",
      default_profession_filter: body.default_profession_filter || "",
      default_excluded_keywords: body.default_excluded_keywords || "",
      min_new_items_per_run: Math.max(0, Number(body.min_new_items_per_run || 20)),
      min_relevance_score: Math.max(0, Math.min(100, Number(body.min_relevance_score || 0))),
      max_risk_score: Math.max(0, Math.min(100, Number(body.max_risk_score || 100)))
    }));
  }

  if (req.method === "POST" && action === "run") {
    const body = await readPayload(req);
    console.log("IMPORT BODY", body);
    console.log("IMPORT QUERY", req.query || {});
    const allActiveSources = body.allActiveSources === true || body.all_active_sources === true;
    const selectedSourceId = allActiveSources ? "" : normalizeSelectedSourceId(body.source_id || body.sourceId || body.default_source_id || "");
    const selectedProviderKey = normalizeSelectedSourceId(body.provider_key || "");
    const result = await runImport({
      store,
      config,
      sourceId: selectedSourceId,
      maxItems: body.maxResults || body.max_items || body.maxItems,
      requestedBy: userEmail || "manual",
      options: {
        all_active_sources: allActiveSources,
        provider_filter: selectedProviderKey,
        category_filter: body.category_filter || body.default_category_filter || "",
        country_filter: body.country_filter || body.default_country_filter || "",
        countries: body.countries || [],
        profession_filter: body.profession_filter || body.default_profession_filter || "",
        queries: body.queries || [],
        excluded_keywords: body.excluded_keywords || body.default_excluded_keywords || "",
        min_new_items_per_run: body.min_new_items_per_run,
        min_quality_score: body.minQualityScore || body.min_quality_score,
        min_relevance_score: body.min_relevance_score,
        max_risk_score: body.max_risk_score,
        manual_run: true
      }
    });
    return send(res, 200, result);
  }

  if (req.method === "POST" && action === "discover-source") {
    const body = await readPayload(req);
    return send(res, 200, await discoverSourceConfig(body));
  }

  if (req.method === "GET" && action === "sources") {
    await ensureDefaultSources(store);
    return send(res, 200, await store.allRecords("ImportedSource"));
  }

  if (req.method === "POST" && action === "sources") {
    const body = await readPayload(req);
    return send(res, 200, await store.createRecord("ImportedSource", {
      ...normalizeSourcePayload(body),
      failure_count: 0
    }, userEmail));
  }

  if (["PUT", "DELETE", "POST"].includes(req.method) && action === "sources" && tail[1]) {
    const id = tail[1];
    if (req.method === "DELETE") return send(res, 200, { success: await store.deleteRecord("ImportedSource", id) });
    if (tail[2] === "test") {
      if (!id) return sendError(res, 400, "Missing source_id");
      const source = (await store.allRecords("ImportedSource")).find((item) => item.id === id);
      if (!source) return sendError(res, 404, "Source not found");
      const result = await testImportSource({ store, config, sourceId: id, maxItems: 5, requestedBy: userEmail });
      return send(res, 200, result);
    }
    const body = await readPayload(req);
    const existing = (await store.allRecords("ImportedSource")).find((item) => item.id === id);
    if (!existing) return sendError(res, 404, "Source not found");
    return send(res, 200, await store.updateRecord("ImportedSource", id, normalizeSourcePayload({ ...existing, ...body })));
  }

  if (req.method === "GET" && action === "logs") {
    return send(res, 200, (await store.allRecords("ImportLog")).sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || ""))).slice(0, 100));
  }

  if (req.method === "GET" && action === "failures") {
    return send(res, 200, (await store.allRecords("ImportFailure"))
      .sort((a, b) => String(b.created_date || b.created_at || "").localeCompare(String(a.created_date || a.created_at || "")))
      .slice(0, 200));
  }

  if (req.method === "POST" && action === "translate-contact-message") {
    return send(res, 200, await translateContactMessage(await readPayload(req)));
  }

  if (req.method === "POST" && action === "items" && tail[1]) {
    const imported = (await store.allRecords("ImportedPost")).find((item) => item.id === tail[1]);
    if (!imported) return sendError(res, 404, "Imported item not found");
    const operation = tail[2] || "";
    if (operation === "approve") {
      return send(res, 200, await store.updateRecord("ImportedPost", imported.id, {
        status: "approved",
        approved_by: userEmail,
        approved_at: new Date().toISOString()
      }));
    }
    if (operation === "reject") {
      return send(res, 200, await store.updateRecord("ImportedPost", imported.id, { status: "rejected" }));
    }
    if (operation === "publish") {
      const created = await store.createRecord("Job", mapImportedToJob(imported, userEmail), userEmail);
      const updated = await store.updateRecord("ImportedPost", imported.id, {
        status: "published",
        published_post_id: created.id,
        published_at: new Date().toISOString(),
        approved_by: userEmail,
        approved_at: imported.approved_at || new Date().toISOString()
      });
      return send(res, 200, { success: true, imported: updated, post: created });
    }
  }

  return sendError(res, 404, "Import Assistant endpoint not found");
}

module.exports = { handleImportAssistantRoute };

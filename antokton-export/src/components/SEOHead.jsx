import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://antokton.com";
const SITE_TITLE = "Antokton | Platforma e Shqiptarëve në Europë";
const SITE_DESCRIPTION = "Antokton është platformë shqiptare për komunitet, punë, treg, edukim dhe mundësi në Europë.";
const SITE_IMAGE = `${SITE_URL}/icons/antokton-512.png`;

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
}

function upsertJsonLd(id, data) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement("script");
    element.id = id;
    element.type = "application/ld+json";
    document.head.appendChild(element);
  }

  element.textContent = JSON.stringify(data);
}

function canonicalPath(pathname) {
  if (!pathname || pathname === "/" || pathname.toLowerCase() === "/home") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

export default function SEOHead() {
  const location = useLocation();

  useEffect(() => {
    const path = canonicalPath(location.pathname);
    const canonicalUrl = `${SITE_URL}${path}`;

    document.documentElement.lang = "sq";
    document.title = SITE_TITLE;

    upsertMeta('meta[name="description"]', { name: "description", content: SITE_DESCRIPTION });
    upsertMeta('meta[name="robots"]', { name: "robots", content: "index, follow" });
    upsertLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });

    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Antokton" });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: SITE_TITLE });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: "Komunitet, punë, treg, edukim dhe mundësi për shqiptarët në Europë." });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: SITE_IMAGE });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "sq_AL" });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: SITE_TITLE });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: "Komunitet, punë, treg, edukim dhe mundësi për shqiptarët në Europë." });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: SITE_IMAGE });

    upsertJsonLd("antokton-website-schema", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Antokton",
      alternateName: "Platforma e Shqiptarëve në Europë",
      url: SITE_URL,
      inLanguage: "sq",
      description: SITE_DESCRIPTION,
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/Search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      },
      publisher: {
        "@type": "Organization",
        name: "Antokton",
        url: SITE_URL,
        logo: SITE_IMAGE
      }
    });
  }, [location.pathname]);

  return null;
}

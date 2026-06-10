import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_URL = "https://antokton.com";
const SITE_TITLE = "Antokton – Punë, Treg, Komunitet dhe Edukim në Europë";
const SITE_DESCRIPTION = "Antokton është platforma shqiptare për komunitet, punë, treg, edukim, media, shërbime dhe mundësi për shqiptarët në Europë, diasporë dhe më gjerë në një vend.";
const OG_DESCRIPTION = "Antokton lidh shqiptarët në Europë me komunitet, punë, treg, edukim, media dhe shërbime në një platformë të përbashkët.";
const SITE_IMAGE = `${SITE_URL}/og/antokton-og-1200x630.jpg`;
const UPDATED_TIME = "2026-06-11T00:00:00+02:00";
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

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

function loadGoogleAnalytics(measurementId) {
  if (!measurementId || document.getElementById("antokton-ga-script")) return;

  const script = document.createElement("script");
  script.id = "antokton-ga-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { send_page_view: false });
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

    loadGoogleAnalytics(GA_MEASUREMENT_ID);
    document.documentElement.lang = "sq";
    document.title = SITE_TITLE;

    upsertMeta('meta[name="description"]', { name: "description", content: SITE_DESCRIPTION });
    upsertMeta('meta[name="robots"]', { name: "robots", content: "index, follow" });
    upsertLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });

    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: "Antokton" });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: SITE_TITLE });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: OG_DESCRIPTION });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: SITE_IMAGE });
    upsertMeta('meta[property="og:image:width"]', { property: "og:image:width", content: "1200" });
    upsertMeta('meta[property="og:image:height"]', { property: "og:image:height", content: "630" });
    upsertMeta('meta[property="og:updated_time"]', { property: "og:updated_time", content: UPDATED_TIME });
    upsertMeta('meta[property="og:locale"]', { property: "og:locale", content: "sq_AL" });

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: SITE_TITLE });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: OG_DESCRIPTION });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: SITE_IMAGE });

    if (window.gtag && GA_MEASUREMENT_ID) {
      window.gtag("event", "page_view", {
        page_title: SITE_TITLE,
        page_location: canonicalUrl,
        page_path: path
      });
    }

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

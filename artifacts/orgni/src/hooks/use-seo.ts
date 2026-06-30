import { useEffect } from "react";

const SITE_URL = (import.meta.env.VITE_SITE_URL ?? "https://orgni.com").replace(/\/$/, "");
const DEFAULT_OG_IMAGE = `${SITE_URL}/opengraph.jpg`;

type SeoOptions = {
  title: string;
  description: string;
  /** Path beginning with "/" used to build the canonical and og:url. */
  path: string;
  image?: string;
  /** Optional JSON-LD structured data injected for this page only. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function useSeo({ title, description, path, image = DEFAULT_OG_IMAGE, jsonLd }: SeoOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`;

    document.title = title;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertCanonical(url);

    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:image"]', "property", "og:image", image);

    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", image);

    const SCRIPT_ID = "page-jsonld";
    document.getElementById(SCRIPT_ID)?.remove();
    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = SCRIPT_ID;
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      document.getElementById(SCRIPT_ID)?.remove();
    };
  }, [title, description, path, image, jsonLd]);
}

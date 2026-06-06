export type MetadataPreview = {
  title: string | null;
  site_name: string | null;
  canonical_url: string | null;
  description: string | null;
  preview_url: string | null;
};

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function clean(value: string | null) {
  const trimmed = value ? decodeHtml(value).trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function firstMatch(html: string, pattern: RegExp) {
  return clean(pattern.exec(html)?.[1] ?? null);
}

function metaContent(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const propertyFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
    "i",
  );

  return firstMatch(html, propertyFirst) ?? firstMatch(html, contentFirst);
}

function resolveUrl(value: string | null, baseUrl: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

export function extractMetadataFromHtml(
  html: string,
  sourceUrl: string,
): MetadataPreview {
  const title =
    metaContent(html, "og:title") ??
    metaContent(html, "twitter:title") ??
    firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const siteName =
    metaContent(html, "og:site_name") ?? new URL(sourceUrl).hostname;
  const description =
    metaContent(html, "og:description") ??
    metaContent(html, "description") ??
    metaContent(html, "twitter:description");
  const previewUrl =
    metaContent(html, "og:image") ?? metaContent(html, "twitter:image");
  const canonicalHref = firstMatch(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
  );

  return {
    title,
    site_name: siteName,
    canonical_url: resolveUrl(canonicalHref, sourceUrl),
    description,
    preview_url: resolveUrl(previewUrl, sourceUrl),
  };
}

import { describe, expect, it } from "vitest";
import { extractMetadataFromHtml } from "../lib/metadata";

describe("metadata extraction", () => {
  it("prefers Open Graph metadata and resolves relative canonical URLs", () => {
    const metadata = extractMetadataFromHtml(
      `<!doctype html>
      <html>
        <head>
          <title>Fallback title</title>
          <link rel="canonical" href="/assets/ui-pack" />
          <meta property="og:title" content="Kenney UI Pack" />
          <meta property="og:site_name" content="Kenney" />
          <meta property="og:description" content="A game UI reference pack." />
          <meta property="og:image" content="/preview.png" />
        </head>
      </html>`,
      "https://kenney.nl/assets/ui-pack?ref=demo",
    );

    expect(metadata).toEqual({
      title: "Kenney UI Pack",
      site_name: "Kenney",
      canonical_url: "https://kenney.nl/assets/ui-pack",
      description: "A game UI reference pack.",
      preview_url: "https://kenney.nl/preview.png",
    });
  });
});


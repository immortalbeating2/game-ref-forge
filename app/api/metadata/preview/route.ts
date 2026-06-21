import { env } from "cloudflare:workers";
import { requireValidE2eToken } from "../../../../lib/e2e-auth";
import { extractMetadataFromHtml } from "../../../../lib/metadata";

export async function POST(request: Request) {
  const e2eError = requireValidE2eToken(request, env.REF_FORGE_E2E_TOKEN);
  if (e2eError) {
    return e2eError;
  }

  const payload = (await request.json()) as { source_url?: string };
  const sourceUrl = payload.source_url?.trim() ?? "";

  try {
    const url = new URL(sourceUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return Response.json(
        { error: "source_url must use http or https" },
        { status: 400 },
      );
    }

    const response = await fetch(url, {
      headers: {
        "user-agent": "RefForge metadata preview",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return Response.json(
        { error: `metadata preview failed with status ${response.status}` },
        { status: 502 },
      );
    }

    const html = await response.text();
    return Response.json({
      metadata: extractMetadataFromHtml(html, url.toString()),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview failed";
    return Response.json({ error: message }, { status: 400 });
  }
}


#!/usr/bin/env node

import { pathToFileURL } from "node:url";

export const E2E_TOKEN_HEADER = "x-ref-forge-e2e-token";

const STEP_NAMES = [
  "created",
  "readAfterCreate",
  "updated",
  "metadataSuccess",
  "metadataFailure",
  "deleted",
  "goneAfterDelete",
];

export function classifyFetchFailure({ status, body }) {
  if (
    status === 401 &&
    /Sign in required|You're almost in|Continue with ChatGPT/i.test(body)
  ) {
    return "sites-sign-in";
  }

  if (status === 401 && /e2e token is invalid/i.test(body)) {
    return "app-unauthorized";
  }

  return "http-error";
}

export function createRunSummary(results) {
  const failedSteps = STEP_NAMES.filter((step) => !results[step]);
  return {
    ok: failedSteps.length === 0,
    failedSteps,
  };
}

function timestampId() {
  return new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

function createPayload(stamp, title) {
  return {
    title,
    source_url: `https://example.com/ref-forge-e2e-${stamp}`,
    media_type: "image",
    asset_category: "ui_hud",
    source_category: "production qa",
    style_tags: ["e2e", "round-6"],
    use_tags: ["qa"],
    mechanic_tags: ["navigation"],
    mood_tags: ["focused"],
    visual_language_tags: ["dense-card"],
    license_status: "private_reference",
    public_status: "private",
    quality_status: "needs_analysis",
    rating: 4,
    reference_value_score: 4,
    transformability_score: 5,
    copyright_risk_score: 2,
    production_readiness_score: 3,
    inspiration_points: ["验证生产写入路径"],
    inspiration_entries: [
      {
        observation: "生产 API 可以创建结构化引用记录",
        principle: "发布后复测应可重复执行",
        transferable_idea: "用唯一标题验证端到端写入读取删除",
        original_application: "测试记录仅用于 QA",
        avoid_copying: "不保留测试数据",
      },
    ],
    deconstruction_notes: "Production API CRUD smoke verification note.",
    transformation_ideas: "Use structured fields for later workspace QA.",
    avoid_copying_notes: "QA-only record, deleted after verification.",
    related_original_asset: "RefForge production smoke runner",
  };
}

async function requestJson(baseUrl, path, token, options = {}) {
  const headers = new Headers(options.headers);
  headers.set(E2E_TOKEN_HEADER, token);

  if (options.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(new URL(path, baseUrl), {
    ...options,
    headers,
  });
  const bodyText = await response.text();

  if (!response.ok) {
    const kind = classifyFetchFailure({
      status: response.status,
      body: bodyText,
    });
    const error = new Error(
      kind === "sites-sign-in"
        ? "Production request was intercepted by the Sites sign-in layer."
        : `Production request failed with ${response.status}.`,
    );
    error.kind = kind;
    error.status = response.status;
    error.body = bodyText;
    throw error;
  }

  return bodyText ? JSON.parse(bodyText) : null;
}

export async function runProductionCrudSmoke({
  baseUrl,
  token,
  fetchImpl,
} = {}) {
  const originalFetch = globalThis.fetch;

  if (fetchImpl) {
    globalThis.fetch = fetchImpl;
  }

  let createdId = null;
  const stamp = timestampId();
  const title = `E2E RefForge ${stamp}`;
  const updatedTitle = `${title} updated`;
  const results = {
    created: false,
    readAfterCreate: false,
    updated: false,
    metadataSuccess: false,
    metadataFailure: false,
    deleted: false,
    goneAfterDelete: false,
  };

  try {
    const createPayloadBody = createPayload(stamp, title);
    const createResponse = await requestJson(baseUrl, "/api/references", token, {
      method: "POST",
      body: JSON.stringify(createPayloadBody),
    });
    createdId = createResponse.reference.id;
    results.created = Boolean(createdId);

    const listAfterCreate = await requestJson(baseUrl, "/api/references", token);
    results.readAfterCreate = listAfterCreate.references.some(
      (reference) => reference.id === createdId && reference.title === title,
    );

    const updatePayload = {
      ...createPayloadBody,
      title: updatedTitle,
      quality_status: "analyzed",
      production_readiness_score: 4,
    };
    const updateResponse = await requestJson(
      baseUrl,
      `/api/references/${createdId}`,
      token,
      {
        method: "PUT",
        body: JSON.stringify(updatePayload),
      },
    );
    results.updated =
      updateResponse.reference.title === updatedTitle &&
      updateResponse.reference.quality_status === "analyzed";

    const metadataSuccess = await requestJson(
      baseUrl,
      "/api/metadata/preview",
      token,
      {
        method: "POST",
        body: JSON.stringify({ source_url: "https://example.com/" }),
      },
    );
    results.metadataSuccess = Boolean(metadataSuccess.metadata);

    try {
      await requestJson(baseUrl, "/api/metadata/preview", token, {
        method: "POST",
        body: JSON.stringify({ source_url: "not-a-url" }),
      });
    } catch (error) {
      results.metadataFailure =
        error.kind === "http-error" && error.status === 400;
    }

    const deleteResponse = await requestJson(
      baseUrl,
      `/api/references/${createdId}`,
      token,
      { method: "DELETE" },
    );
    results.deleted = deleteResponse.deleted === true;

    const listAfterDelete = await requestJson(baseUrl, "/api/references", token);
    results.goneAfterDelete = !listAfterDelete.references.some(
      (reference) => reference.id === createdId,
    );

    return {
      ...createRunSummary(results),
      id: createdId,
      title,
      results,
    };
  } finally {
    if (createdId && !results.deleted) {
      try {
        await requestJson(baseUrl, `/api/references/${createdId}`, token, {
          method: "DELETE",
        });
      } catch {
        // Best-effort cleanup only. The main failure remains the useful signal.
      }
    }

    if (fetchImpl) {
      globalThis.fetch = originalFetch;
    }
  }
}

async function main() {
  const baseUrl = process.env.REF_FORGE_PRODUCTION_URL;
  const token = process.env.REF_FORGE_E2E_TOKEN;

  if (!baseUrl || !token) {
    console.error(
      "Missing REF_FORGE_PRODUCTION_URL or REF_FORGE_E2E_TOKEN. Example: REF_FORGE_PRODUCTION_URL=https://game-ref-forge.yeep-6613.chatgpt-team.site REF_FORGE_E2E_TOKEN=... npm run qa:production-crud",
    );
    process.exitCode = 2;
    return;
  }

  try {
    const summary = await runProductionCrudSmoke({ baseUrl, token });
    console.log(JSON.stringify(summary, null, 2));
    process.exitCode = summary.ok ? 0 : 1;
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          kind: error.kind ?? "unexpected",
          status: error.status ?? null,
          message: error.message,
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SynthesisDetail, SynthesisSummary } from "../lib/synthesis";

vi.mock("../lib/synthesis-db", () => ({
  createSynthesis: vi.fn(),
  deleteSynthesis: vi.fn(),
  getSynthesis: vi.fn(),
  listSyntheses: vi.fn(),
  refreshSynthesisReference: vi.fn(),
  updateSynthesis: vi.fn(),
}));

import {
  createSynthesis,
  deleteSynthesis,
  getSynthesis,
  listSyntheses,
  refreshSynthesisReference,
  updateSynthesis,
} from "../lib/synthesis-db";

type CollectionRoute = typeof import("../app/api/syntheses/route");
type DetailRoute = typeof import("../app/api/syntheses/[id]/route");
type RefreshRoute = typeof import("../app/api/syntheses/[id]/references/[relationId]/refresh/route");

const summary: SynthesisSummary = {
  id: "syn-1",
  title: "Study",
  target_asset: "Dungeon prop",
  status: "draft",
  updated_at: "2026-07-14T00:00:00.000Z",
  reference_count: 2,
};

const synthesis: SynthesisDetail = {
  ...summary,
  created_at: "2026-07-14T00:00:00.000Z",
  shared_principles: null,
  key_differences: null,
  original_direction: null,
  avoid_copying_notes: null,
  design_constraints: null,
  experiment_plan: null,
  next_actions: null,
  additional_notes: null,
  references: [],
};

const createPayload = {
  title: "Study",
  status: "draft",
  reference_ids: ["ref-1", "ref-2"],
};

let collection: CollectionRoute;
let detail: DetailRoute;
let refresh: RefreshRoute;

function jsonRequest(url: string, method: "POST" | "PATCH", body: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(async () => {
  vi.resetAllMocks();
  [collection, detail, refresh] = await Promise.all([
    import("../app/api/syntheses/route"),
    import("../app/api/syntheses/[id]/route"),
    import("../app/api/syntheses/[id]/references/[relationId]/refresh/route"),
  ]);
});

describe("synthesis API routes", () => {
  it("lists summaries for a valid status and recent sort", async () => {
    vi.mocked(listSyntheses).mockResolvedValue([summary]);

    const response = await collection.GET(new Request("http://local/api/syntheses?status=draft&sort=recent"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ syntheses: [summary] });
    expect(listSyntheses).toHaveBeenCalledWith("draft");
  });

  it("rejects an invalid list status before calling the database", async () => {
    const response = await collection.GET(new Request("http://local/api/syntheses?status=invalid"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errors: ["status is invalid"] });
    expect(listSyntheses).not.toHaveBeenCalled();
  });

  it("rejects an unsupported list sort before calling the database", async () => {
    const response = await collection.GET(new Request("http://local/api/syntheses?sort=title"));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errors: ["sort must be recent"] });
    expect(listSyntheses).not.toHaveBeenCalled();
  });

  it("creates a synthesis and returns its server snapshot detail", async () => {
    vi.mocked(createSynthesis).mockResolvedValue({ ok: true, synthesis });

    const response = await collection.POST(jsonRequest("http://local/api/syntheses", "POST", createPayload));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ synthesis });
    expect(createSynthesis).toHaveBeenCalledWith(createPayload);
  });

  it("returns validation errors for malformed create JSON", async () => {
    const response = await collection.POST(new Request("http://local/api/syntheses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errors: ["request body must be valid JSON"] });
    expect(createSynthesis).not.toHaveBeenCalled();
  });

  it("returns validation errors from create", async () => {
    vi.mocked(createSynthesis).mockResolvedValue({
      ok: false,
      code: "validation",
      errors: ["title is required"],
    });

    const response = await collection.POST(jsonRequest("http://local/api/syntheses", "POST", {
      ...createPayload,
      title: "",
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errors: ["title is required"] });
  });

  it("maps a missing selected reference to a not-found response", async () => {
    vi.mocked(createSynthesis).mockResolvedValue({
      ok: false,
      code: "reference_not_found",
      reference_ids: ["ref-2"],
    });

    const response = await collection.POST(jsonRequest("http://local/api/syntheses", "POST", createPayload));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Selected references were not found",
      code: "reference_not_found",
    });
  });

  it("returns migration guidance for a missing synthesis table without leaking error details", async () => {
    vi.mocked(listSyntheses).mockRejectedValue(new Error("no such table: syntheses; token=super-secret"));

    const response = await collection.GET(new Request("http://local/api/syntheses"));
    const body = await response.json() as { error: string };

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/migration/i);
    expect(body.error).not.toContain("super-secret");
  });

  it("returns a detail through async vinext params", async () => {
    vi.mocked(getSynthesis).mockResolvedValue(synthesis);

    const response = await detail.GET(new Request("http://local/api/syntheses/syn-1"), {
      params: Promise.resolve({ id: "syn-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ synthesis });
    expect(getSynthesis).toHaveBeenCalledWith("syn-1");
  });

  it("returns not found when a requested synthesis does not exist", async () => {
    vi.mocked(getSynthesis).mockResolvedValue(null);

    const response = await detail.GET(new Request("http://local/api/syntheses/missing"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Synthesis not found", code: "not_found" });
  });

  it("updates a synthesis through async vinext params", async () => {
    vi.mocked(updateSynthesis).mockResolvedValue({ ok: true, synthesis });
    const payload = { title: "Updated", status: "actionable" };

    const response = await detail.PATCH(jsonRequest("http://local/api/syntheses/syn-1", "PATCH", payload), {
      params: Promise.resolve({ id: "syn-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ synthesis });
    expect(updateSynthesis).toHaveBeenCalledWith("syn-1", payload);
  });

  it("returns validation errors for malformed update JSON", async () => {
    const response = await detail.PATCH(new Request("http://local/api/syntheses/syn-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "{",
    }), {
      params: Promise.resolve({ id: "syn-1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errors: ["request body must be valid JSON"] });
    expect(updateSynthesis).not.toHaveBeenCalled();
  });

  it("returns validation errors from update", async () => {
    vi.mocked(updateSynthesis).mockResolvedValue({
      ok: false,
      code: "validation",
      errors: ["title is required"],
    });

    const response = await detail.PATCH(jsonRequest("http://local/api/syntheses/syn-1", "PATCH", {
      title: "",
      status: "draft",
    }), {
      params: Promise.resolve({ id: "syn-1" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ errors: ["title is required"] });
  });

  it("returns not found when an update affects no synthesis", async () => {
    vi.mocked(updateSynthesis).mockResolvedValue({ ok: false, code: "not_found" });

    const response = await detail.PATCH(jsonRequest("http://local/api/syntheses/missing", "PATCH", {
      title: "Missing",
      status: "draft",
    }), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Synthesis not found", code: "not_found" });
  });

  it("deletes an existing synthesis with an empty 204 response", async () => {
    vi.mocked(deleteSynthesis).mockResolvedValue(true);

    const response = await detail.DELETE(new Request("http://local/api/syntheses/syn-1", { method: "DELETE" }), {
      params: Promise.resolve({ id: "syn-1" }),
    });

    expect(response.status).toBe(204);
    await expect(response.text()).resolves.toBe("");
    expect(deleteSynthesis).toHaveBeenCalledWith("syn-1");
  });

  it("returns not found when deleting a missing synthesis", async () => {
    vi.mocked(deleteSynthesis).mockResolvedValue(false);

    const response = await detail.DELETE(new Request("http://local/api/syntheses/missing", { method: "DELETE" }), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Synthesis not found", code: "not_found" });
  });

  it("refreshes a relation through async vinext params", async () => {
    vi.mocked(refreshSynthesisReference).mockResolvedValue({ ok: true, synthesis });

    const response = await refresh.POST(new Request("http://local/api/syntheses/syn-1/references/link-1/refresh", {
      method: "POST",
    }), {
      params: Promise.resolve({ id: "syn-1", relationId: "link-1" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ synthesis });
    expect(refreshSynthesisReference).toHaveBeenCalledWith("syn-1", "link-1");
  });

  it("returns not found when the requested relation is missing", async () => {
    vi.mocked(refreshSynthesisReference).mockResolvedValue({ ok: false, code: "relation_not_found" });

    const response = await refresh.POST(new Request("http://local/api/syntheses/syn-1/references/missing/refresh", {
      method: "POST",
    }), {
      params: Promise.resolve({ id: "syn-1", relationId: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Synthesis reference not found",
      code: "relation_not_found",
    });
  });

  it("returns a conflict when the source reference is unavailable", async () => {
    vi.mocked(refreshSynthesisReference).mockResolvedValue({ ok: false, code: "reference_unavailable" });

    const response = await refresh.POST(new Request("http://local/api/syntheses/syn-1/references/link-1/refresh", {
      method: "POST",
    }), {
      params: Promise.resolve({ id: "syn-1", relationId: "link-1" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Current reference is unavailable",
      code: "reference_unavailable",
    });
  });
});

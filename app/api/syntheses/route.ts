import {
  createSynthesis,
  listSyntheses,
} from "../../../lib/synthesis-db";
import { SYNTHESIS_STATUSES, type SynthesisStatus } from "../../../lib/synthesis";

const missingTableMessage = "The syntheses table is unavailable. Run `npm run db:generate` and apply the generated D1 migration before using saved syntheses.";

function toOperationalError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table") || message.includes('"syntheses"')) {
    return { error: missingTableMessage, code: "migration_required" };
  }

  return { error: "Unexpected synthesis operation error", code: "operation_failed" };
}

function isSynthesisStatus(value: string): value is SynthesisStatus {
  return SYNTHESIS_STATUSES.includes(value as SynthesisStatus);
}

async function parseJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; errors: string[] }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, errors: ["request body must be valid JSON"] };
  }
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const unsupportedParameters = [...new Set(url.searchParams.keys())]
    .filter((parameter) => parameter !== "status" && parameter !== "sort");

  if (unsupportedParameters.length > 0) {
    return Response.json(
      { errors: unsupportedParameters.map((parameter) => `query parameter ${parameter} is not supported`) },
      { status: 400 },
    );
  }

  if (url.searchParams.getAll("status").length > 1) {
    return Response.json({ errors: ["status must be provided at most once"] }, { status: 400 });
  }

  if (url.searchParams.getAll("sort").length > 1) {
    return Response.json({ errors: ["sort must be provided at most once"] }, { status: 400 });
  }

  const status = url.searchParams.get("status");
  const sort = url.searchParams.get("sort");

  if (status !== null && !isSynthesisStatus(status)) {
    return Response.json({ errors: ["status is invalid"] }, { status: 400 });
  }

  if (sort !== null && sort !== "recent") {
    return Response.json({ errors: ["sort must be recent"] }, { status: 400 });
  }

  try {
    const syntheses = await listSyntheses(status ?? undefined);
    return Response.json({ syntheses });
  } catch (error) {
    return Response.json(toOperationalError(error), { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const parsed = await parseJson(request);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });

  try {
    const result = await createSynthesis(parsed.value as never);

    if (result.ok) return Response.json({ synthesis: result.synthesis }, { status: 201 });
    if (result.code === "validation") return Response.json({ errors: result.errors }, { status: 400 });

    return Response.json(
      { error: "Selected references were not found", code: "reference_not_found" },
      { status: 404 },
    );
  } catch (error) {
    return Response.json(toOperationalError(error), { status: 500 });
  }
}

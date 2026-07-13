import {
  deleteSynthesis,
  getSynthesis,
  updateSynthesis,
} from "../../../../lib/synthesis-db";

type SynthesisRouteContext = {
  params: Promise<{ id: string }>;
};

const missingTableMessage = "The syntheses table is unavailable. Run `npm run db:generate` and apply the generated D1 migration before using saved syntheses.";

function toOperationalError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table") || message.includes('"syntheses"')) {
    return { error: missingTableMessage, code: "migration_required" };
  }

  return { error: "Unexpected synthesis operation error", code: "operation_failed" };
}

function notFound() {
  return Response.json({ error: "Synthesis not found", code: "not_found" }, { status: 404 });
}

async function parseJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; errors: string[] }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false, errors: ["request body must be valid JSON"] };
  }
}

export async function GET(_request: Request, context: SynthesisRouteContext): Promise<Response> {
  try {
    const synthesis = await getSynthesis((await context.params).id);
    return synthesis ? Response.json({ synthesis }) : notFound();
  } catch (error) {
    return Response.json(toOperationalError(error), { status: 500 });
  }
}

export async function PATCH(request: Request, context: SynthesisRouteContext): Promise<Response> {
  const parsed = await parseJson(request);
  if (!parsed.ok) return Response.json({ errors: parsed.errors }, { status: 400 });

  try {
    const result = await updateSynthesis((await context.params).id, parsed.value as never);

    if (result.ok) return Response.json({ synthesis: result.synthesis });
    if (result.code === "validation") return Response.json({ errors: result.errors }, { status: 400 });

    return notFound();
  } catch (error) {
    return Response.json(toOperationalError(error), { status: 500 });
  }
}

export async function DELETE(_request: Request, context: SynthesisRouteContext): Promise<Response> {
  try {
    const deleted = await deleteSynthesis((await context.params).id);
    return deleted ? new Response(null, { status: 204 }) : notFound();
  } catch (error) {
    return Response.json(toOperationalError(error), { status: 500 });
  }
}

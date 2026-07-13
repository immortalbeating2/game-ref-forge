import { refreshSynthesisReference } from "../../../../../../../lib/synthesis-db";

type RefreshRouteContext = {
  params: Promise<{ id: string; relationId: string }>;
};

const missingTableMessage = "The syntheses table is unavailable. Run `npm run db:generate` and apply the generated D1 migration before using saved syntheses.";

function toOperationalError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("no such table") || message.includes('"syntheses"')) {
    return { error: missingTableMessage, code: "migration_required" };
  }

  return { error: "Unexpected synthesis operation error", code: "operation_failed" };
}

export async function POST(_request: Request, context: RefreshRouteContext): Promise<Response> {
  try {
    const { id, relationId } = await context.params;
    const result = await refreshSynthesisReference(id, relationId);

    if (result.ok) return Response.json({ synthesis: result.synthesis });
    if (result.code === "relation_not_found") {
      return Response.json(
        { error: "Synthesis reference not found", code: "relation_not_found" },
        { status: 404 },
      );
    }

    return Response.json(
      { error: "Current reference is unavailable", code: "reference_unavailable" },
      { status: 409 },
    );
  } catch (error) {
    return Response.json(toOperationalError(error), { status: 500 });
  }
}

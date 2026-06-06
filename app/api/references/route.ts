import { createReference, listReferences } from "../../../lib/reference-db";

function toRouteErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";

  if (message.includes("no such table") || message.includes('"references"')) {
    return "The references table is unavailable. Run `npm run db:generate` and apply the generated D1 migration before using saved references.";
  }

  return message;
}

export async function GET() {
  try {
    const references = await listReferences();
    return Response.json({ references });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const result = await createReference(await request.json());

    if (!result.ok) {
      return Response.json({ errors: result.errors }, { status: 400 });
    }

    return Response.json({ reference: result.reference }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: toRouteErrorMessage(error) },
      { status: 500 },
    );
  }
}


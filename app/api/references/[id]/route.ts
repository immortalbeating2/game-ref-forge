import { env } from "cloudflare:workers";
import { requireValidE2eToken } from "../../../../lib/e2e-auth";
import {
  deleteReference,
  updateReference,
} from "../../../../lib/reference-db";

type ReferenceRouteContext = {
  params: { id: string } | Promise<{ id: string }>;
};

async function getId(context: ReferenceRouteContext) {
  const params = await context.params;
  return params.id;
}

export async function PUT(request: Request, context: ReferenceRouteContext) {
  const e2eError = requireValidE2eToken(request, env.REF_FORGE_E2E_TOKEN);
  if (e2eError) {
    return e2eError;
  }

  try {
    const result = await updateReference(await getId(context), await request.json());

    if (!result.ok) {
      const status = result.errors.includes("reference not found") ? 404 : 400;
      return Response.json({ errors: result.errors }, { status });
    }

    return Response.json({ reference: result.reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: ReferenceRouteContext) {
  const e2eError = requireValidE2eToken(_request, env.REF_FORGE_E2E_TOKEN);
  if (e2eError) {
    return e2eError;
  }

  try {
    const deleted = await deleteReference(await getId(context));
    return Response.json({ deleted }, { status: deleted ? 200 : 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}


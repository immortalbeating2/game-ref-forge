export const E2E_TOKEN_HEADER = "x-ref-forge-e2e-token";

export type E2eTokenValidation =
  | { provided: false; authorized: false; reason: "missing-token" }
  | { provided: true; authorized: true; reason: null }
  | {
      provided: true;
      authorized: false;
      reason: "missing-secret" | "invalid-token";
    };

export function validateE2eToken(
  headers: Headers,
  configuredSecret: string | undefined,
): E2eTokenValidation {
  const providedToken = headers.get(E2E_TOKEN_HEADER)?.trim();

  if (!providedToken) {
    return { provided: false, authorized: false, reason: "missing-token" };
  }

  const secret = configuredSecret?.trim();
  if (!secret) {
    return { provided: true, authorized: false, reason: "missing-secret" };
  }

  if (providedToken !== secret) {
    return { provided: true, authorized: false, reason: "invalid-token" };
  }

  return { provided: true, authorized: true, reason: null };
}

export function e2eUnauthorizedResponse(reason: string) {
  return Response.json(
    { error: "e2e token is invalid", reason },
    { status: 401 },
  );
}

export function requireValidE2eToken(
  request: Request,
  configuredSecret: string | undefined,
) {
  const result = validateE2eToken(request.headers, configuredSecret);

  if (!result.provided || result.authorized) {
    return null;
  }

  return e2eUnauthorizedResponse(result.reason);
}

import { MAX_BACKUP_BYTES, type BackupValidationIssue } from "../../../lib/backup";

export const MAX_BACKUP_REQUEST_BYTES = MAX_BACKUP_BYTES + 131_072;

export type BackupRouteErrorCode =
  | "invalid_json"
  | "unsupported_format"
  | "unsupported_version"
  | "backup_too_large"
  | "validation_failed"
  | "database_unavailable"
  | "backup_operation_failed"
  | "backup_changed"
  | "preview_stale"
  | "overwrite_confirmation_required"
  | "restore_failed";

type RouteError = {
  code: BackupRouteErrorCode;
  path: string;
  message: string;
};

export type BoundedJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; code: "invalid_json" | "backup_too_large" };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actualKeys = Object.keys(value);
  return actualKeys.length === keys.length &&
    actualKeys.every((key) => keys.includes(key)) &&
    keys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

export async function readBoundedJson(request: Request): Promise<BoundedJsonResult> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, code: "invalid_json" };

  const bytes = new Uint8Array(MAX_BACKUP_REQUEST_BYTES);
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > MAX_BACKUP_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, code: "backup_too_large" };
      }
      bytes.set(value, total);
      total += value.byteLength;
    }

    return {
      ok: true,
      value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, total))),
    };
  } catch {
    return { ok: false, code: "invalid_json" };
  } finally {
    reader.releaseLock();
  }
}

export function invalidJsonResponse() {
  return errorResponse({
    code: "invalid_json",
    path: "",
    message: "request body must be valid JSON",
  }, 400);
}

export function oversizedRequestResponse() {
  return errorResponse({
    code: "backup_too_large",
    path: "",
    message: "backup request exceeds the 5 MB limit",
  }, 413);
}

export function errorResponse(error: RouteError, status: number) {
  return Response.json(error, { status });
}

export function validationIssuesResponse(issues: BackupValidationIssue[]) {
  const code = issues.some((issue) => issue.code === "backup_too_large")
    ? "backup_too_large"
    : issues[0]?.code ?? "validation_failed";
  return Response.json(
    { code, issues },
    { status: code === "backup_too_large" ? 413 : 400 },
  );
}

export function parsePreviewBody(value: unknown):
  | { ok: true; backup: unknown }
  | { ok: false; response: Response } {
  if (!isPlainObject(value) || !hasExactKeys(value, ["backup"])) {
    return {
      ok: false,
      response: errorResponse({
        code: "validation_failed",
        path: "",
        message: "request must be a closed object containing backup",
      }, 400),
    };
  }
  return { ok: true, backup: value.backup };
}

export function parseRestoreBody(value: unknown):
  | {
      ok: true;
      backup: unknown;
      backup_digest: string;
      state_digest: string;
      confirm_overwrite: boolean;
    }
  | { ok: false; response: Response } {
  const keys = ["backup", "backup_digest", "state_digest", "confirm_overwrite"];
  if (!isPlainObject(value) || !hasExactKeys(value, keys)) {
    return {
      ok: false,
      response: errorResponse({
        code: "validation_failed",
        path: "",
        message: "request must be a closed restore object",
      }, 400),
    };
  }
  if (typeof value.backup_digest !== "string") {
    return {
      ok: false,
      response: errorResponse({
        code: "validation_failed",
        path: "backup_digest",
        message: "backup_digest must be a string",
      }, 400),
    };
  }
  if (typeof value.state_digest !== "string") {
    return {
      ok: false,
      response: errorResponse({
        code: "validation_failed",
        path: "state_digest",
        message: "state_digest must be a string",
      }, 400),
    };
  }
  if (typeof value.confirm_overwrite !== "boolean") {
    return {
      ok: false,
      response: errorResponse({
        code: "validation_failed",
        path: "confirm_overwrite",
        message: "confirm_overwrite must be a boolean",
      }, 400),
    };
  }
  return {
    ok: true,
    backup: value.backup,
    backup_digest: value.backup_digest,
    state_digest: value.state_digest,
    confirm_overwrite: value.confirm_overwrite,
  };
}

export function operationalErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("no such table") || message.includes("binding") || message.includes("database is unavailable")) {
    return errorResponse({
      code: "database_unavailable",
      path: "",
      message: "backup database is unavailable",
    }, 503);
  }
  return errorResponse({
    code: "backup_operation_failed",
    path: "",
    message: "backup operation failed",
  }, 500);
}

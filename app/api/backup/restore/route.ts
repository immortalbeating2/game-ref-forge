import { parseRefForgeBackup } from "../../../../lib/backup";
import { restoreBackup } from "../../../../lib/backup-db";
import {
  errorResponse,
  invalidJsonResponse,
  operationalErrorResponse,
  oversizedRequestResponse,
  parseRestoreBody,
  readBoundedJson,
  validationIssuesResponse,
} from "../request";

export async function POST(request: Request): Promise<Response> {
  const json = await readBoundedJson(request);
  if (!json.ok) return json.code === "backup_too_large" ? oversizedRequestResponse() : invalidJsonResponse();

  const body = parseRestoreBody(json.value);
  if (!body.ok) return body.response;

  const parsed = parseRefForgeBackup(body.backup);
  if (!parsed.ok) return validationIssuesResponse(parsed.issues);

  try {
    const result = await restoreBackup({
      backup: parsed.backup,
      backup_digest: body.backup_digest,
      state_digest: body.state_digest,
      confirm_overwrite: body.confirm_overwrite,
    });
    if (result.ok) return Response.json({ restored: true, preview: result.preview });
    if (result.code === "backup_changed" || result.code === "preview_stale" || result.code === "overwrite_confirmation_required") {
      return errorResponse({ code: result.code, path: "", message: "backup restore conflict" }, 409);
    }
    if (result.code === "restore_failed") {
      return errorResponse({ code: "restore_failed", path: "", message: "backup restore failed" }, 500);
    }
    return errorResponse({ code: "validation_failed", path: "", message: "backup validation failed" }, 400);
  } catch (error) {
    return operationalErrorResponse(error);
  }
}

import { previewBackup } from "../../../../lib/backup-db";
import { parseRefForgeBackup } from "../../../../lib/backup";
import {
  invalidJsonResponse,
  operationalErrorResponse,
  oversizedRequestResponse,
  parsePreviewBody,
  readBoundedJson,
  validationIssuesResponse,
} from "../request";

export async function POST(request: Request): Promise<Response> {
  const json = await readBoundedJson(request);
  if (!json.ok) return json.code === "backup_too_large" ? oversizedRequestResponse() : invalidJsonResponse();

  const body = parsePreviewBody(json.value);
  if (!body.ok) return body.response;

  const parsed = parseRefForgeBackup(body.backup);
  if (!parsed.ok) return validationIssuesResponse(parsed.issues);

  try {
    return Response.json({ preview: await previewBackup(parsed.backup) });
  } catch (error) {
    return operationalErrorResponse(error);
  }
}

import { createFullBackup } from "../../../lib/backup-db";
import { createBackupFilename } from "../../../lib/backup";
import { operationalErrorResponse } from "./request";

export async function GET(): Promise<Response> {
  try {
    const backup = await createFullBackup();
    return Response.json(backup, {
      headers: {
        "cache-control": "no-store",
        "content-disposition": `attachment; filename="${createBackupFilename(backup.exported_at)}"`,
      },
    });
  } catch (error) {
    return operationalErrorResponse(error);
  }
}

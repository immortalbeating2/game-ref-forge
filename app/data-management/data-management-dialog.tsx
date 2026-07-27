"use client";

import { DatabaseBackup, Download, Upload, X } from "lucide-react";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
} from "react";

import {
  MAX_BACKUP_BYTES,
  canonicalBackupJson,
  createBackupFilename,
  parseRefForgeBackup,
  withBackupPreferences,
  type BackupDevicePreferences,
  type RefForgeBackupV1,
} from "../../lib/backup";
import type { BackupPreview } from "../../lib/backup-db";
import { backupErrorMessage, type Language, uiCopy } from "../../lib/localization";
import {
  getDialogKeyboardAction,
  tryAcquireOperationGuard,
} from "../synthesis/synthesis-workspace-state";
import {
  canSubmitRestore,
  createDataManagementState,
  dataManagementReducer,
  type DataManagementIssue,
} from "./data-management-state";

export type DataManagementDialogProps = {
  open: boolean;
  language: Language;
  devicePreferences: BackupDevicePreferences;
  hasUnsavedDraft: boolean;
  businessMutationBusy: boolean;
  onClose: () => void;
  onRestoreCommitted: (
    preferences: BackupDevicePreferences | null,
  ) => Promise<"applied" | "failed" | "not_requested">;
};

type BackupApiError = { code?: unknown };

function readErrorCode(value: unknown, fallback: string) {
  if (value && typeof value === "object" && "code" in value) {
    const code = (value as BackupApiError).code;
    if (typeof code === "string") return code;
  }
  return fallback;
}

function readIssues(value: unknown): DataManagementIssue[] {
  if (!value || typeof value !== "object" || !("issues" in value) || !Array.isArray(value.issues)) return [];
  return value.issues.flatMap((issue) => {
    if (!issue || typeof issue !== "object" || !("path" in issue) || !("message" in issue)) return [];
    return typeof issue.path === "string" && typeof issue.message === "string"
      ? [{ path: issue.path, message: issue.message }]
      : [];
  }).slice(0, 3);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isBackupPreview(value: unknown): value is BackupPreview {
  if (!value || typeof value !== "object") return false;
  const preview = value as Record<string, unknown>;
  const references = preview.references as Record<string, unknown> | undefined;
  const syntheses = preview.syntheses as Record<string, unknown> | undefined;
  const relations = preview.relations as Record<string, unknown> | undefined;
  return Boolean(
    references && syntheses && relations
    && isCount(references.create) && isCount(references.overwrite) && isCount(references.preserve)
    && isCount(syntheses.create) && isCount(syntheses.overwrite) && isCount(syntheses.preserve)
    && isCount(relations.restore) && isCount(relations.historical)
    && typeof preview.contains_preferences === "boolean"
    && typeof preview.backup_digest === "string"
    && typeof preview.state_digest === "string",
  );
}

function statusCopy(
  status: ReturnType<typeof createDataManagementState>["status"],
  errorCode: string | null,
  preferenceResult: ReturnType<typeof createDataManagementState>["preferenceResult"],
  language: Language,
) {
  const copy = uiCopy(language);
  if (errorCode) return backupErrorMessage(errorCode, language);
  if (status === "loading_backup") return copy.exportingBackup;
  if (status === "previewing") return copy.previewingBackup;
  if (status === "restoring") return copy.restoringBackup;
  if (status === "success") {
    return preferenceResult === "failed"
      ? `${copy.restoreSucceeded} ${copy.preferencesRestoreFailed}`
      : preferenceResult === "applied"
        ? `${copy.restoreSucceeded} ${copy.preferencesRestoreApplied}`
        : copy.restoreSucceeded;
  }
  return null;
}

export function DataManagementDialog({
  open,
  language,
  devicePreferences,
  hasUnsavedDraft,
  businessMutationBusy,
  onClose,
  onRestoreCommitted,
}: DataManagementDialogProps) {
  const copy = uiCopy(language);
  const [state, dispatch] = useReducer(dataManagementReducer, undefined, createDataManagementState);
  const [confirmDiscardDraft, setConfirmDiscardDraft] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const discardRestoreRef = useRef<HTMLButtonElement>(null);
  const restoreGuard = useRef(false);
  const titleId = useId();
  const statusId = useId();
  const backupTabId = useId();
  const restoreTabId = useId();
  const backupPanelId = useId();
  const restorePanelId = useId();
  const isRestoring = state.status === "restoring";
  const isBusy = isRestoring || businessMutationBusy;
  const message = statusCopy(state.status, state.errorCode, state.preferenceResult, language);

  useEffect(() => {
    if (!open) {
      dispatch({ type: "close" });
      return;
    }

    dispatch({ type: "open" });
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => titleRef.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      trigger?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!confirmDiscardDraft) return;
    const frame = window.requestAnimationFrame(() => discardRestoreRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [confirmDiscardDraft]);

  function handleClose() {
    if (isRestoring) return;
    setConfirmDiscardDraft(false);
    onClose();
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableSelector = "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const action = getDialogKeyboardAction(event.key, event.shiftKey, activeIndex, focusable.length);
    if (action?.kind === "cancel") {
      if (!isRestoring) {
        event.preventDefault();
        if (confirmDiscardDraft) setConfirmDiscardDraft(false);
        else handleClose();
      }
    } else if (action?.kind === "focus") {
      event.preventDefault();
      if (action.index < 0) dialog.focus();
      else focusable[action.index]?.focus();
    }
  }

  async function handleBackup() {
    if (isBusy) return;
    dispatch({ type: "backup_started" });
    try {
      const response = await fetch("/api/backup");
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readErrorCode(payload, "database_unavailable"));
      const parsed = parseRefForgeBackup(payload);
      if (!parsed.ok) throw new Error(parsed.issues[0]?.code ?? "validation_failed");
      const backup = withBackupPreferences(
        parsed.backup,
        state.includePreferences ? devicePreferences : null,
      );
      const objectUrl = URL.createObjectURL(new Blob([canonicalBackupJson(backup)], { type: "application/json" }));
      try {
        const download = document.createElement("a");
        download.href = objectUrl;
        download.download = createBackupFilename(backup.exported_at);
        document.body.append(download);
        download.click();
        download.remove();
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      dispatch({ type: "backup_finished" });
    } catch (error) {
      dispatch({ type: "backup_failed", errorCode: error instanceof Error ? error.message : "database_unavailable" });
    }
  }

  async function previewBackupFile(file: File, backup: RefForgeBackupV1) {
    dispatch({ type: "file_selected", file: { name: file.name, size: file.size }, backup });
    dispatch({ type: "preview_started" });
    try {
      const response = await fetch("/api/backup/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ backup }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        dispatch({
          type: "preview_failed",
          errorCode: readErrorCode(payload, "validation_failed"),
          issues: readIssues(payload),
        });
        return;
      }
      if (!payload || typeof payload !== "object" || !("preview" in payload) || !isBackupPreview(payload.preview)) {
        throw new Error("validation_failed");
      }
      dispatch({ type: "preview_succeeded", preview: payload.preview });
    } catch (error) {
      dispatch({ type: "preview_failed", errorCode: error instanceof Error ? error.message : "validation_failed" });
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file || isRestoring) return;
    if (file.size > MAX_BACKUP_BYTES) {
      dispatch({ type: "preview_failed", errorCode: "backup_too_large" });
      return;
    }
    try {
      const parsed = parseRefForgeBackup(JSON.parse(await file.text()));
      if (!parsed.ok) {
        dispatch({
          type: "preview_failed",
          errorCode: parsed.issues[0]?.code ?? "validation_failed",
          issues: parsed.issues.map(({ path, message }) => ({ path, message })),
        });
        return;
      }
      await previewBackupFile(file, parsed.backup);
    } catch {
      dispatch({ type: "preview_failed", errorCode: "invalid_json" });
    }
  }

  async function submitRestore() {
    if (!state.parsedBackup || !state.preview || !tryAcquireOperationGuard(restoreGuard)) return;
    dispatch({ type: "restore_started" });
    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          backup: state.parsedBackup,
          backup_digest: state.preview.backup_digest,
          state_digest: state.preview.state_digest,
          confirm_overwrite: state.overwriteConfirmed,
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readErrorCode(payload, "restore_failed"));
      const preferences = state.restorePreferences ? state.parsedBackup.preferences : null;
      let preferenceResult: "applied" | "failed" | "not_requested" = "not_requested";
      try {
        preferenceResult = await onRestoreCommitted(preferences);
      } catch {
        preferenceResult = "failed";
      }
      dispatch({ type: "restore_succeeded", preferenceResult });
      setConfirmDiscardDraft(false);
    } catch (error) {
      dispatch({ type: "restore_failed", errorCode: error instanceof Error ? error.message : "restore_failed" });
    } finally {
      restoreGuard.current = false;
    }
  }

  function handleRestoreRequest() {
    if (!canSubmitRestore(state) || isBusy) return;
    if (hasUnsavedDraft) {
      setConfirmDiscardDraft(true);
      return;
    }
    void submitRestore();
  }

  if (!open) return null;

  return (
    <div className="data-management-overlay">
      <div
        ref={dialogRef}
        className="data-management-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={statusId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
      >
        <header className="data-management-dialog__header">
          <div>
            <p className="data-management-dialog__eyebrow"><DatabaseBackup aria-hidden="true" size={18} /> {copy.dataManagement}</p>
            <h2 ref={titleRef} id={titleId} tabIndex={-1}>{copy.dataManagement}</h2>
          </div>
          <button type="button" className="ghost-button data-management-dialog__close" onClick={handleClose} disabled={isRestoring} aria-label={copy.closeDataManagement}>
            <X aria-hidden="true" size={18} />
          </button>
        </header>

        <div className="data-management-tabs" role="tablist" aria-label={copy.dataManagement}>
          <button id={backupTabId} type="button" role="tab" aria-selected={state.tab === "backup"} aria-controls={backupPanelId} onClick={() => dispatch({ type: "tab_changed", tab: "backup" })} disabled={isRestoring}>
            <Download aria-hidden="true" size={16} /> {copy.backupTab}
          </button>
          <button id={restoreTabId} type="button" role="tab" aria-selected={state.tab === "restore"} aria-controls={restorePanelId} onClick={() => dispatch({ type: "tab_changed", tab: "restore" })} disabled={isRestoring}>
            <Upload aria-hidden="true" size={16} /> {copy.restoreTab}
          </button>
        </div>

        <p id={statusId} className={`data-management-status${state.status === "error" ? " data-management-status--error" : ""}`} aria-live="polite">
          {message}
        </p>

        {state.issues.length > 0 ? (
          <section className="data-management-issues" aria-label={copy.backupIssues}>
            <h3>{copy.backupIssues}</h3>
            <ul>{state.issues.slice(0, 3).map((issue) => <li key={`${issue.path}:${issue.message}`}><strong>{issue.path}</strong> {issue.message}</li>)}</ul>
          </section>
        ) : null}

        {state.tab === "backup" ? (
          <section id={backupPanelId} role="tabpanel" aria-labelledby={backupTabId} className="data-management-content">
            <label className="data-management-check">
              <input type="checkbox" checked={state.includePreferences} disabled={isBusy} onChange={(event) => dispatch({ type: "include_preferences_changed", value: event.target.checked })} />
              <span>{copy.includeDevicePreferences}</span>
            </label>
            <p className="data-management-note">{copy.transparentJsonWarning}</p>
            <div className="data-management-actions">
              <button type="button" onClick={() => void handleBackup()} disabled={isBusy}>
                <Download aria-hidden="true" size={16} /> {state.status === "loading_backup" ? copy.exportingBackup : copy.fullBackup}
              </button>
            </div>
          </section>
        ) : (
          <section id={restorePanelId} role="tabpanel" aria-labelledby={restoreTabId} className="data-management-content">
            <label className="data-management-file-picker">
              <Upload aria-hidden="true" size={16} />
              <span>{state.selectedFile ? copy.changeBackupFile : copy.chooseBackupFile}</span>
              <input type="file" accept=".json,application/json" onChange={(event) => void handleFileChange(event)} disabled={isRestoring} />
            </label>

            {state.selectedFile ? <p className="data-management-file-name"><strong>{copy.backupFileDetails}</strong> {state.selectedFile.name} ({Math.ceil(state.selectedFile.size / 1024)} KB)</p> : null}

            {state.preview ? (
              <>
                <dl className="data-management-summary">
                  <div><dt>{copy.backupReferences}</dt><dd>{copy.backupCreate} {state.preview.references.create} · {copy.backupOverwrite} {state.preview.references.overwrite} · {copy.backupPreserve} {state.preview.references.preserve}</dd></div>
                  <div><dt>{copy.backupSyntheses}</dt><dd>{copy.backupCreate} {state.preview.syntheses.create} · {copy.backupOverwrite} {state.preview.syntheses.overwrite} · {copy.backupPreserve} {state.preview.syntheses.preserve}</dd></div>
                  <div><dt>{copy.backupRelations}</dt><dd>{state.preview.relations.restore}</dd></div>
                  <div><dt>{copy.backupHistoricalSnapshots}</dt><dd>{state.preview.relations.historical}</dd></div>
                  <div><dt>{copy.backupVersion}</dt><dd>v1</dd></div>
                </dl>

                {state.preview.contains_preferences ? (
                  <label className="data-management-check">
                    <input type="checkbox" checked={state.restorePreferences} disabled={isBusy} onChange={(event) => dispatch({ type: "restore_preferences_changed", value: event.target.checked })} />
                    <span>{copy.restoreDevicePreferences}</span>
                  </label>
                ) : null}

                {state.preview.references.overwrite + state.preview.syntheses.overwrite > 0 ? (
                  <label className="data-management-check data-management-check--warning">
                    <input type="checkbox" checked={state.overwriteConfirmed} disabled={isBusy} onChange={(event) => dispatch({ type: "overwrite_confirmation_changed", value: event.target.checked })} />
                    <span>{copy.confirmOverwrite}</span>
                  </label>
                ) : null}
              </>
            ) : null}

            <div className="data-management-actions">
              <button type="button" onClick={handleRestoreRequest} disabled={!canSubmitRestore(state) || isBusy}>
                <Upload aria-hidden="true" size={16} /> {state.status === "error" && state.preview ? copy.retryRestore : copy.restoreBackup}
              </button>
            </div>
          </section>
        )}

        {confirmDiscardDraft ? (
          <div className="data-management-discard" role="alertdialog" aria-modal="true" aria-labelledby={`${titleId}-discard`}>
            <h3 id={`${titleId}-discard`}>{copy.unsavedDraftRestoreTitle}</h3>
            <p>{copy.unsavedDraftRestoreBody}</p>
            <div>
              <button type="button" className="ghost-button" onClick={() => setConfirmDiscardDraft(false)}>{copy.cancel}</button>
              <button ref={discardRestoreRef} type="button" className="danger-button" onClick={() => void submitRestore()}>{copy.discardDraftAndRestore}</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

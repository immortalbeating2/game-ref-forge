"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import type { Language } from "../../lib/localization";
import { uiCopy } from "../../lib/localization";
import type { SynthesisDetail, SynthesisInput, SynthesisReferenceLink, SynthesisStatus, SynthesisSummary } from "../../lib/synthesis";
import { validateSynthesisInput } from "../../lib/synthesis";
import { createEmptySynthesisDraft, detailToSynthesisDraft, draftToSynthesisInput, isSynthesisDraftDirty, type SynthesisDraft } from "../../lib/synthesis-draft";
import { formatSynthesisMarkdown, safeSynthesisExportFilename } from "../../lib/synthesis-export";
import { SynthesisEditor } from "./synthesis-editor";
import { SynthesisList } from "./synthesis-list";

export type SynthesisWorkspaceProps = {
  language: Language;
  initialReferenceIds: string[];
  onInitialReferenceIdsConsumed: () => void;
  onBackToReferences: () => void;
};

type PendingNavigation =
  | { kind: "back" }
  | { kind: "filter"; status: SynthesisStatus | "all" }
  | { kind: "open"; id: string }
  | { kind: "archive"; id: string }
  | null;

type ApiFailure = { message: string };

async function getResponsePayload<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { error?: string; errors?: string[] } & T;
  if (!response.ok) {
    throw { message: payload.errors?.join(" ") || payload.error || `Request failed (${response.status})` } satisfies ApiFailure;
  }
  return payload;
}

function errorMessage(error: unknown) {
  return typeof error === "object" && error !== null && "message" in error && typeof error.message === "string"
    ? error.message
    : "Unexpected synthesis operation error";
}

function detailWithDraft(detail: SynthesisDetail, draft: SynthesisDraft): SynthesisDetail {
  return { ...detail, ...draftToSynthesisInput(draft) };
}

export function SynthesisWorkspace(props: SynthesisWorkspaceProps): React.JSX.Element {
  const { language, initialReferenceIds, onInitialReferenceIdsConsumed, onBackToReferences } = props;
  const copy = uiCopy(language);
  const [summaries, setSummaries] = useState<SynthesisSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<SynthesisStatus | "all">("all");
  const [activeDetail, setActiveDetail] = useState<SynthesisDetail | null>(null);
  const [draft, setDraft] = useState<SynthesisDraft>(createEmptySynthesisDraft);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SynthesisSummary | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const listAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const createReferenceIds = useRef<string[]>([]);
  const consumedInitialIds = useRef<string | null>(null);

  const isDraftDirty = useMemo(() => {
    if (activeDetail) return isSynthesisDraftDirty(draft, activeDetail);
    return JSON.stringify(draft) !== JSON.stringify(createEmptySynthesisDraft());
  }, [activeDetail, draft]);

  const fetchList = useCallback(async (status: SynthesisStatus | "all", signal?: AbortSignal) => {
    const query = new URLSearchParams({ sort: "recent" });
    if (status !== "all") query.set("status", status);
    return getResponsePayload<{ syntheses: SynthesisSummary[] }>(await fetch(`/api/syntheses?${query}`, { signal }));
  }, []);

  const reloadList = useCallback(async (status: SynthesisStatus | "all" = statusFilter) => {
    listAbort.current?.abort();
    const controller = new AbortController();
    listAbort.current = controller;
    setIsListLoading(true);
    try {
      const payload = await fetchList(status, controller.signal);
      setSummaries(payload.syntheses);
    } catch (requestError) {
      if ((requestError as Error).name !== "AbortError") setError(errorMessage(requestError));
    } finally {
      if (!controller.signal.aborted) setIsListLoading(false);
    }
  }, [fetchList, statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    detailAbort.current?.abort();
    const controller = new AbortController();
    detailAbort.current = controller;
    setIsDetailLoading(true);
    setError(null);
    try {
      const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${id}`, { signal: controller.signal }));
      setActiveDetail(payload.synthesis);
      setDraft(detailToSynthesisDraft(payload.synthesis));
      setMode("edit");
      createReferenceIds.current = [];
    } catch (requestError) {
      if ((requestError as Error).name !== "AbortError") setError(errorMessage(requestError));
    } finally {
      if (!controller.signal.aborted) setIsDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    listAbort.current?.abort();
    listAbort.current = controller;
    const readList = async () => {
      try {
        const payload = await fetchList(statusFilter, controller.signal);
        if (!controller.signal.aborted) setSummaries(payload.syntheses);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError(errorMessage(requestError));
      } finally {
        if (!controller.signal.aborted) setIsListLoading(false);
      }
    };
    void readList();
    return () => controller.abort();
  }, [fetchList, statusFilter]);

  useEffect(() => () => detailAbort.current?.abort(), []);

  useEffect(() => {
    const signature = initialReferenceIds.join("\u0000");
    if (initialReferenceIds.length < 2 || consumedInitialIds.current === signature) return;
    consumedInitialIds.current = signature;
    createReferenceIds.current = [...initialReferenceIds];
    setActiveDetail(null);
    setDraft(createEmptySynthesisDraft());
    setMode("create");
    setMessage(null);
    setError(null);
    onInitialReferenceIdsConsumed();
  }, [initialReferenceIds, onInitialReferenceIdsConsumed]);

  useEffect(() => {
    if (!isDraftDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [isDraftDirty]);

  const runNavigation = useCallback((next: Exclude<PendingNavigation, null>) => {
    setPendingNavigation(null);
    setMessage(null);
    if (next.kind === "back") {
      onBackToReferences();
    } else if (next.kind === "filter") {
      setStatusFilter(next.status);
      setIsListLoading(true);
    } else if (next.kind === "open") {
      void loadDetail(next.id);
    }
  }, [loadDetail, onBackToReferences]);

  const requestNavigation = (next: Exclude<PendingNavigation, null>) => {
    if (isDraftDirty) {
      setPendingNavigation(next);
      return;
    }
    runNavigation(next);
  };

  const save = async () => {
    const input = draftToSynthesisInput(draft);
    const validation = validateSynthesisInput(input);
    if (!validation.ok) {
      setError(validation.errors.join(" "));
      return;
    }
    if (mode === "create" && createReferenceIds.current.length < 2) {
      setError("Selected references are unavailable. Return to references and choose two to four records.");
      return;
    }
    setIsSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = mode === "create"
        ? await fetch("/api/syntheses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, reference_ids: createReferenceIds.current }) })
        : await fetch(`/api/syntheses/${activeDetail?.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(response);
      setActiveDetail(payload.synthesis);
      setDraft(detailToSynthesisDraft(payload.synthesis));
      setMode("edit");
      createReferenceIds.current = [];
      setMessage(copy.synthesisSaved);
      await reloadList(statusFilter);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const archive = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const detailPayload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${id}`));
      const input: SynthesisInput = { ...detailToSynthesisDraft(detailPayload.synthesis), status: "archived" };
      const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
      if (activeDetail?.id === id) {
        setActiveDetail(payload.synthesis);
        setDraft(detailToSynthesisDraft(payload.synthesis));
      }
      await reloadList(statusFilter);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsSaving(false);
    }
  };

  const refresh = async (link: SynthesisReferenceLink) => {
    if (!activeDetail || !link.available) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${activeDetail.id}/references/${link.id}/refresh`, { method: "POST" }));
      setActiveDetail(payload.synthesis);
      if (!isDraftDirty) setDraft(detailToSynthesisDraft(payload.synthesis));
      await reloadList(statusFilter);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setIsRefreshing(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setIsDeleting(true);
    setError(null);
    try {
      await getResponsePayload<unknown>(await fetch(`/api/syntheses/${pendingDelete.id}`, { method: "DELETE" }));
      if (activeDetail?.id === pendingDelete.id) {
        setActiveDetail(null);
        setDraft(createEmptySynthesisDraft());
        setMode("edit");
      }
      setPendingDelete(null);
      setMessage(copy.synthesisDeleted);
      await reloadList(statusFilter);
    } catch (requestError) {
      setError(errorMessage(requestError) || copy.synthesisDeleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportMarkdown = () => {
    if (!activeDetail) return;
    const exportDetail = detailWithDraft(activeDetail, draft);
    const blob = new Blob([formatSynthesisMarkdown(exportDetail, { unsaved: isDraftDirty })], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = safeSynthesisExportFilename(exportDetail.title);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="synthesis-workspace">
      <header className="synthesis-workspace-header">
        <button className="ghost-button" type="button" onClick={() => requestNavigation({ kind: "back" })}>{copy.referencesView}</button>
        {isDetailLoading ? <p role="status">{language === "zh" ? "正在加载..." : "Loading..."}</p> : null}
      </header>
      <SynthesisList
        language={language}
        summaries={summaries}
        statusFilter={statusFilter}
        isLoading={isListLoading}
        isMutating={isSaving || isDeleting}
        activeId={activeDetail?.id ?? null}
        onStatusFilterChange={(status) => requestNavigation({ kind: "filter", status })}
        onOpen={(id) => requestNavigation({ kind: "open", id })}
        onArchive={(id) => {
          if (isDraftDirty && activeDetail?.id === id) {
            setPendingNavigation({ kind: "archive", id });
            return;
          }
          void archive(id);
        }}
        onDelete={setPendingDelete}
      />
      <SynthesisEditor
        language={language}
        detail={activeDetail}
        draft={draft}
        mode={mode}
        isSaving={isSaving}
        isRefreshing={isRefreshing}
        isDeleting={isDeleting}
        error={error}
        message={message}
        onDraftChange={setDraft}
        onSave={save}
        onRefresh={refresh}
        onExport={exportMarkdown}
        onDelete={() => activeDetail && setPendingDelete({ id: activeDetail.id, title: activeDetail.title, target_asset: activeDetail.target_asset, status: activeDetail.status, updated_at: activeDetail.updated_at, reference_count: activeDetail.references.length })}
      />
      {pendingNavigation ? (
        <Confirmation title={copy.unsavedChanges} body={copy.unsavedChangesConfirmation} cancelLabel={copy.cancel} confirmLabel={language === "zh" ? "离开" : "Leave"} onCancel={() => setPendingNavigation(null)} onConfirm={() => {
          if (pendingNavigation.kind === "archive") {
            setPendingNavigation(null);
            void archive(pendingNavigation.id);
            return;
          }
          runNavigation(pendingNavigation);
        }} />
      ) : null}
      {pendingDelete ? (
        <Confirmation title={copy.deleteSynthesis} body={`${copy.deleteSynthesisConfirmation} “${pendingDelete.title}”`} cancelLabel={copy.cancel} confirmLabel={copy.deleteSynthesis} destructive onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} />
      ) : null}
    </section>
  );
}

function Confirmation({ title, body, cancelLabel, confirmLabel, destructive = false, onCancel, onConfirm }: { title: string; body: string; cancelLabel: string; confirmLabel: string; destructive?: boolean; onCancel: () => void; onConfirm: () => void }): React.JSX.Element {
  return <div className="synthesis-confirmation" role="alertdialog" aria-modal="true" aria-label={title}><div><h2>{title}</h2><p>{body}</p><div><button className="ghost-button" type="button" onClick={onCancel}>{cancelLabel}</button><button className={destructive ? "danger-button" : ""} type="button" onClick={onConfirm}>{confirmLabel}</button></div></div></div>;
}

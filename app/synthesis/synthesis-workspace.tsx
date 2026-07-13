"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import type { Language } from "../../lib/localization";
import { synthesisErrorMessage, uiCopy } from "../../lib/localization";
import type { SynthesisDetail, SynthesisInput, SynthesisReferenceLink, SynthesisStatus, SynthesisSummary } from "../../lib/synthesis";
import { validateSynthesisInput } from "../../lib/synthesis";
import { createEmptySynthesisDraft, detailToSynthesisDraft, draftToSynthesisInput, isSynthesisDraftDirty, type SynthesisDraft } from "../../lib/synthesis-draft";
import { formatSynthesisMarkdown, safeSynthesisExportFilename } from "../../lib/synthesis-export";
import { SynthesisEditor } from "./synthesis-editor";
import { SynthesisList } from "./synthesis-list";
import { SynthesisConfirmation } from "./synthesis-confirmation";
import {
  applyArchiveResult,
  applyRefreshResult,
  type ArchiveWorkspaceState,
  canCommitController,
  consumeExternalBackRequest,
  getInitialReferenceConsumption,
  runOwnedSynthesisMutation,
  recoverMissingCreateReferences,
  type SynthesisMutationKind,
  tryAcquireOperationGuard,
} from "./synthesis-workspace-state";

export type SynthesisWorkspaceProps = {
  language: Language;
  initialReferenceIds: string[];
  initialDraft: SynthesisDraft | null;
  externalBackRequestToken: number;
  onInitialReferenceIdsConsumed: () => void;
  onInitialDraftConsumed: () => void;
  onReselectReferences: (draft: SynthesisDraft) => void;
  onBackToReferences: () => void;
};

type PendingNavigation =
  | { kind: "back" }
  | { kind: "filter"; status: SynthesisStatus | "all" }
  | { kind: "open"; id: string }
  | { kind: "archive"; id: string }
  | null;

type ApiFailure = { code: string };

async function getResponsePayload<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({})) as { error?: string; errors?: string[]; code?: string } & T;
  if (!response.ok) {
    throw {
      code: payload.code ?? (response.status === 400 ? "validation" : response.status === 404 ? "not_found" : "operation_failed"),
    } satisfies ApiFailure;
  }
  return payload;
}

function failureCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code
    : "operation_failed";
}

function detailWithDraft(detail: SynthesisDetail, draft: SynthesisDraft): SynthesisDetail {
  return { ...detail, ...draftToSynthesisInput(draft) };
}

export function SynthesisWorkspace(props: SynthesisWorkspaceProps): React.JSX.Element {
  const {
    language,
    initialReferenceIds,
    initialDraft,
    externalBackRequestToken,
    onInitialReferenceIdsConsumed,
    onInitialDraftConsumed,
    onReselectReferences,
    onBackToReferences,
  } = props;
  const copy = uiCopy(language);
  const [summaries, setSummaries] = useState<SynthesisSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<SynthesisStatus | "all">("all");
  const [activeDetail, setActiveDetail] = useState<SynthesisDetail | null>(null);
  const [draft, setDraft] = useState<SynthesisDraft>(createEmptySynthesisDraft);
  const workspaceStateRef = useRef<ArchiveWorkspaceState>({ activeDetail: null, draft });
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [archivingIds, setArchivingIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshingSynthesisId, setRefreshingSynthesisId] = useState<string | null>(null);
  const [refreshingRelationId, setRefreshingRelationId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SynthesisSummary | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation>(null);
  const [createNeedsReselection, setCreateNeedsReselection] = useState(false);
  const listAbort = useRef<AbortController | null>(null);
  const detailAbort = useRef<AbortController | null>(null);
  const createReferenceIds = useRef<string[]>([]);
  const consumedInitialIds = useRef<string | null>(null);
  const handledExternalBackRequestToken = useRef(externalBackRequestToken);
  const deleteGuard = useRef(false);
  const mutationGuard = useRef(new Map<string, SynthesisMutationKind>());

  const commitWorkspaceState = useCallback((nextState: ArchiveWorkspaceState) => {
    workspaceStateRef.current = nextState;
    setActiveDetail(nextState.activeDetail);
    setDraft(nextState.draft);
  }, []);

  const updateDraft = useCallback((nextDraft: SynthesisDraft) => {
    workspaceStateRef.current = { ...workspaceStateRef.current, draft: nextDraft };
    setDraft(nextDraft);
  }, []);

  const isDraftDirty = useMemo(() => {
    if (activeDetail) return isSynthesisDraftDirty(draft, activeDetail);
    return JSON.stringify(draft) !== JSON.stringify(createEmptySynthesisDraft());
  }, [activeDetail, draft]);
  const isActiveArchiveBusy = activeDetail !== null && archivingIds.includes(activeDetail.id);
  const mutationBusyIds = useMemo(() => [
    savingId,
    ...archivingIds,
    refreshingSynthesisId,
    deletingId,
  ].filter((id): id is string => id !== null), [archivingIds, deletingId, refreshingSynthesisId, savingId]);

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
      if (canCommitController(listAbort.current, controller)) {
        setSummaries(payload.syntheses);
      }
    } catch (requestError) {
      if ((requestError as Error).name !== "AbortError" && canCommitController(listAbort.current, controller)) {
        setError(synthesisErrorMessage(failureCode(requestError), language));
      }
    } finally {
      if (canCommitController(listAbort.current, controller)) setIsListLoading(false);
    }
  }, [fetchList, language, statusFilter]);

  const loadDetail = useCallback(async (id: string) => {
    detailAbort.current?.abort();
    const controller = new AbortController();
    detailAbort.current = controller;
    setIsDetailLoading(true);
    setError(null);
    try {
      const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${id}`, { signal: controller.signal }));
      if (canCommitController(detailAbort.current, controller)) {
        commitWorkspaceState({
          activeDetail: payload.synthesis,
          draft: detailToSynthesisDraft(payload.synthesis),
        });
        setMode("edit");
        createReferenceIds.current = [];
      }
    } catch (requestError) {
      if ((requestError as Error).name !== "AbortError" && canCommitController(detailAbort.current, controller)) {
        setError(synthesisErrorMessage(failureCode(requestError), language));
      }
    } finally {
      if (canCommitController(detailAbort.current, controller)) setIsDetailLoading(false);
    }
  }, [commitWorkspaceState, language]);

  useEffect(() => {
    const controller = new AbortController();
    listAbort.current?.abort();
    listAbort.current = controller;
    const readList = async () => {
      try {
        const payload = await fetchList(statusFilter, controller.signal);
        if (canCommitController(listAbort.current, controller)) setSummaries(payload.syntheses);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError" && canCommitController(listAbort.current, controller)) {
          setError(synthesisErrorMessage(failureCode(requestError), language));
        }
      } finally {
        if (canCommitController(listAbort.current, controller)) setIsListLoading(false);
      }
    };
    void readList();
    return () => controller.abort();
  }, [fetchList, language, statusFilter]);

  useEffect(() => () => {
    listAbort.current?.abort();
    detailAbort.current?.abort();
  }, []);

  useEffect(() => {
    const consumption = getInitialReferenceConsumption(consumedInitialIds.current, initialReferenceIds);
    consumedInitialIds.current = consumption.nextSignature;
    if (!consumption.shouldConsume) return;
    createReferenceIds.current = [...initialReferenceIds];
    commitWorkspaceState({ activeDetail: null, draft: initialDraft ?? createEmptySynthesisDraft() });
    setMode("create");
    setCreateNeedsReselection(false);
    setMessage(null);
    setError(null);
    onInitialReferenceIdsConsumed();
    if (initialDraft) onInitialDraftConsumed();
  }, [commitWorkspaceState, initialDraft, initialReferenceIds, onInitialDraftConsumed, onInitialReferenceIdsConsumed]);

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

  const requestNavigation = useCallback((next: Exclude<PendingNavigation, null>) => {
    if (isDraftDirty) {
      setPendingNavigation(next);
      return;
    }
    runNavigation(next);
  }, [isDraftDirty, runNavigation]);

  useEffect(() => {
    const consumption = consumeExternalBackRequest(
      handledExternalBackRequestToken.current,
      externalBackRequestToken,
    );
    handledExternalBackRequestToken.current = consumption.nextHandledToken;

    if (consumption.shouldHandle) {
      requestNavigation({ kind: "back" });
    }
  }, [externalBackRequestToken, requestNavigation]);

  const save = async () => {
    const input = draftToSynthesisInput(draft);
    const validation = validateSynthesisInput(input);
    if (!validation.ok) {
      setError(synthesisErrorMessage("validation", language));
      return;
    }
    if (mode === "create" && createReferenceIds.current.length < 2) {
      setError(synthesisErrorMessage("reference_not_found", language));
      return;
    }
    const synthesisId = mode === "create" ? "__create__" : workspaceStateRef.current.activeDetail?.id;
    if (!synthesisId) return;
    await runOwnedSynthesisMutation(mutationGuard, synthesisId, "save", async () => {
      setIsSaving(true);
      setSavingId(synthesisId);
      setError(null);
      setMessage(null);
      try {
        const response = mode === "create"
          ? await fetch("/api/syntheses", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...input, reference_ids: createReferenceIds.current }) })
          : await fetch(`/api/syntheses/${synthesisId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
        const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(response);
        commitWorkspaceState({
          activeDetail: payload.synthesis,
          draft: detailToSynthesisDraft(payload.synthesis),
        });
        setMode("edit");
        setCreateNeedsReselection(false);
        createReferenceIds.current = [];
        setMessage(copy.synthesisSaved);
        await reloadList(statusFilter);
      } catch (requestError) {
        if (mode === "create" && (requestError as ApiFailure).code === "reference_not_found") {
          const recovery = recoverMissingCreateReferences(workspaceStateRef.current.draft);
          createReferenceIds.current = recovery.referenceIds;
          setCreateNeedsReselection(recovery.needsReselection);
        }
        setError(synthesisErrorMessage(failureCode(requestError), language));
      } finally {
        setSavingId(null);
        setIsSaving(false);
      }
    });
  };

  const archive = async (id: string) => {
    await runOwnedSynthesisMutation(mutationGuard, id, "archive", async () => {
      const requestDraftBaseline = workspaceStateRef.current.draft;
      setArchivingIds((current) => [...current, id]);
      setError(null);
      try {
        const detailPayload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${id}`));
        const input: SynthesisInput = { ...detailToSynthesisDraft(detailPayload.synthesis), status: "archived" };
        const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
        const currentWorkspaceState = workspaceStateRef.current;
        const nextWorkspaceState = applyArchiveResult(
          currentWorkspaceState,
          id,
          requestDraftBaseline,
          payload.synthesis,
        );
        if (nextWorkspaceState !== currentWorkspaceState) {
          commitWorkspaceState(nextWorkspaceState);
        }
        await reloadList(statusFilter);
      } catch (requestError) {
        setError(synthesisErrorMessage(failureCode(requestError), language));
      } finally {
        setArchivingIds((current) => current.filter((currentId) => currentId !== id));
      }
    });
  };

  const refresh = async (link: SynthesisReferenceLink) => {
    if (!activeDetail || !link.available) return;
    const requestSynthesisId = activeDetail.id;
    await runOwnedSynthesisMutation(mutationGuard, requestSynthesisId, "refresh", async () => {
      setIsRefreshing(true);
      setRefreshingSynthesisId(requestSynthesisId);
      setRefreshingRelationId(link.id);
      setError(null);
      try {
        const payload = await getResponsePayload<{ synthesis: SynthesisDetail }>(await fetch(`/api/syntheses/${requestSynthesisId}/references/${link.id}/refresh`, { method: "POST" }));
        const refreshResult = applyRefreshResult({
          activeDetail: workspaceStateRef.current.activeDetail,
          draft: workspaceStateRef.current.draft,
          isDraftDirty,
        }, requestSynthesisId, payload.synthesis);
        commitWorkspaceState({
          activeDetail: refreshResult.activeDetail,
          draft: refreshResult.draft,
        });
        await reloadList(statusFilter);
      } catch (requestError) {
        setError(synthesisErrorMessage(failureCode(requestError), language));
      } finally {
        setRefreshingSynthesisId(null);
        setRefreshingRelationId(null);
        setIsRefreshing(false);
      }
    });
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !tryAcquireOperationGuard(deleteGuard)) return;
    const deleteTarget = pendingDelete;
    const result = await runOwnedSynthesisMutation(mutationGuard, deleteTarget.id, "delete", async () => {
      setIsDeleting(true);
      setDeletingId(deleteTarget.id);
      setError(null);
      try {
        await getResponsePayload<unknown>(await fetch(`/api/syntheses/${deleteTarget.id}`, { method: "DELETE" }));
        if (activeDetail?.id === deleteTarget.id) {
          commitWorkspaceState({ activeDetail: null, draft: createEmptySynthesisDraft() });
          setMode("edit");
        }
        setPendingDelete(null);
        setMessage(copy.synthesisDeleted);
        await reloadList(statusFilter);
      } catch (requestError) {
        setError(synthesisErrorMessage(failureCode(requestError), language));
      } finally {
        setDeletingId(null);
        setIsDeleting(false);
      }
    });
    deleteGuard.current = false;
    if (!result.started) return;
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
        mutationBusyIds={mutationBusyIds}
        archivingIds={archivingIds}
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
        isArchiving={isActiveArchiveBusy}
        isRefreshing={isRefreshing && refreshingSynthesisId === activeDetail?.id}
        refreshingRelationId={
          isRefreshing && refreshingSynthesisId === activeDetail?.id
            ? refreshingRelationId
            : null
        }
        isDeleting={isDeleting}
        error={error}
        message={message}
        needsReferenceReselection={createNeedsReselection}
        onDraftChange={updateDraft}
        onSave={save}
        onRefresh={refresh}
        onExport={exportMarkdown}
        onDelete={() => activeDetail && setPendingDelete({ id: activeDetail.id, title: activeDetail.title, target_asset: activeDetail.target_asset, status: activeDetail.status, updated_at: activeDetail.updated_at, reference_count: activeDetail.references.length })}
        onReselectReferences={() => {
          const recovery = recoverMissingCreateReferences(workspaceStateRef.current.draft);
          createReferenceIds.current = recovery.referenceIds;
          onReselectReferences(recovery.draft);
        }}
      />
      {pendingNavigation ? (
        <SynthesisConfirmation title={copy.unsavedChanges} body={copy.unsavedChangesConfirmation} cancelLabel={copy.cancel} confirmLabel={language === "zh" ? "离开" : "Leave"} onCancel={() => setPendingNavigation(null)} onConfirm={() => {
          if (pendingNavigation.kind === "archive") {
            setPendingNavigation(null);
            void archive(pendingNavigation.id);
            return;
          }
          runNavigation(pendingNavigation);
        }} />
      ) : null}
      {pendingDelete ? (
        <SynthesisConfirmation title={copy.deleteSynthesis} body={`${copy.deleteSynthesisConfirmation} “${pendingDelete.title}”`} cancelLabel={copy.cancel} confirmLabel={copy.deleteSynthesis} destructive busy={isDeleting} onCancel={() => setPendingDelete(null)} onConfirm={() => void confirmDelete()} />
      ) : null}
    </section>
  );
}

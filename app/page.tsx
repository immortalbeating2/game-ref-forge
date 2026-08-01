"use client";

import { ArrowLeft, ArrowRight, PanelLeftClose, PanelRightClose } from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BackupDevicePreferences } from "../lib/backup";
import {
  ASSET_CATEGORIES,
  AssetCategory,
  LICENSE_STATUSES,
  LicenseStatus,
  MEDIA_TYPES,
  MediaType,
  PUBLIC_STATUSES,
  PublicStatus,
  QUALITY_STATUSES,
  QualityStatus,
  InspirationEntry,
  ReferenceRecord,
  validateReferenceInput,
} from "../lib/reference";
import {
  createEmptyReferenceDraft,
  draftToReferenceInput,
  isReferenceDraftDirty,
  recordToReferenceDraft,
  ReferenceDraft,
} from "../lib/reference-draft";
import {
  formatReferenceMarkdown,
  safeExportFilename,
} from "../lib/reference-export";
import {
  PINNED_REFERENCES_STORAGE_KEY,
  parsePinnedReferenceIds,
  serializePinnedReferenceIds,
  togglePinnedReferenceId,
} from "../lib/pinned-references";
import {
  REFERENCE_SORT_MODES,
  ReferenceSortMode,
  sortReferences,
} from "../lib/reference-sort";
import {
  evaluateReferenceQuality,
  filterReferencesByReviewQueue,
  REVIEW_QUEUE_MODES,
  ReviewQueueMode,
} from "../lib/reference-quality";
import type { ReferenceQualityIssue } from "../lib/reference-quality";
import {
  QUALITY_FIELD_TARGET_IDS,
  createQualityEditSession,
  getAdjacentQualityIssueIndex,
  getQualityFieldTargetId,
} from "../lib/reference-quality-navigation";
import type { QualityEditSession } from "../lib/reference-quality-navigation";
import {
  deleteConfirmationCopy,
  MetadataPreviewStatus,
  metadataPreviewMessage,
  seedFallbackMessage,
} from "../lib/interaction-state";
import {
  labelForAssetCategory,
  labelForLicenseStatus,
  labelForMediaType,
  labelForPublicStatus,
  labelForQualityStatus,
  Language,
  uiCopy,
} from "../lib/localization";
import { buildReferenceSearchText, getVisibleDetailReference } from "../lib/ui-state";
import {
  getComparisonStartDecision,
  getComparisonAvailability,
  reconcileComparisonSelectionSource,
  toggleSynthesisSelection,
  type ComparisonSelectionState,
  type ReferenceDataSource,
} from "../lib/synthesis-selection";
import {
  hasBlockingWorkspaceLayer,
  shouldFocusWorkspaceSearch,
} from "../lib/workspace-shortcuts";
import {
  WORKSPACE_LEFT_MAX,
  WORKSPACE_LEFT_MIN,
  WORKSPACE_RIGHT_MAX,
  WORKSPACE_RIGHT_MIN,
} from "../lib/workspace-layout";
import type { SynthesisDraft } from "../lib/synthesis-draft";
import { DataManagementDialog } from "./data-management/data-management-dialog";
import { SynthesisWorkspace } from "./synthesis/synthesis-workspace";
import { SynthesisConfirmation } from "./synthesis/synthesis-confirmation";
import { useWorkspaceLayout } from "./workspace/use-workspace-layout";
import { WorkspaceSeparator } from "./workspace/workspace-separator";
import { ReferenceToolbar } from "./workspace/reference-toolbar";
import { ReferenceCard } from "./workspace/reference-card";
import { ComparisonDock } from "./workspace/comparison-dock";
import { ReferenceDetail } from "./workspace/reference-detail";
import { useWorkspaceViewPreferences } from "./workspace/use-workspace-view-preferences";

type WorkspaceView = "references" | "syntheses";
type SynthesisWorkspaceStatus = { dirty: boolean; busy: boolean };

const seedReferences: ReferenceRecord[] = [
  {
    id: "seed-kenney-ui",
    title: "Kenney UI Pack",
    source_url: "https://kenney.nl/assets/ui-pack",
    canonical_url: "https://kenney.nl/assets/ui-pack",
    site_name: "Kenney",
    author: "Kenney",
    preview_url: null,
    media_type: "asset_pack",
    asset_category: "ui_hud",
    source_category: "Game UI assets",
    style_tags: ["clean", "modular"],
    use_tags: ["inventory", "buttons"],
    mechanic_tags: ["inventory", "interaction feedback"],
    mood_tags: ["clean", "friendly"],
    visual_language_tags: ["panel rhythm", "button state clarity"],
    license_status: "cc0_or_public_domain",
    attribution_text: "Kenney assets are commonly published with clear license notes on source pages.",
    public_status: "review",
    quality_status: "analyzed",
    rating: 4,
    reference_value_score: 4,
    transformability_score: 4,
    copyright_risk_score: 1,
    production_readiness_score: 4,
    inspiration_points: ["Button state clarity", "Consistent panel rhythm"],
    inspiration_entries: [
      {
        id: "seed-kenney-ui-entry-1",
        observation: "Button states use simple surfaces, strong borders, and consistent spacing.",
        principle: "Consistent state contrast keeps HUD actions readable under pressure.",
        transferable_idea: "Reuse spacing and state hierarchy without copying exact icon art.",
        original_application: "Apply the principle to a darker crafting interface with original forms.",
        avoid_copying: "Do not copy exact icons or downloadable files into this app.",
      },
    ],
    deconstruction_notes: "Simple surfaces, strong borders, and readable icon spacing make the pack useful for HUD readability studies.",
    transformation_ideas: "Use the same spacing principle for a darker crafting interface with original shapes and icons.",
    avoid_copying_notes: "Do not copy exact icons or downloadable files into this app.",
    related_original_asset: "Inventory HUD direction",
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:00:00.000Z",
  },
  {
    id: "seed-polyhaven-material",
    title: "Poly Haven Material Reference",
    source_url: "https://polyhaven.com/textures",
    canonical_url: "https://polyhaven.com/textures",
    site_name: "Poly Haven",
    author: "Poly Haven",
    preview_url: null,
    media_type: "image",
    asset_category: "material_texture",
    source_category: "CC0 textures",
    style_tags: ["realistic", "surface"],
    use_tags: ["wear pattern", "environment dressing"],
    mechanic_tags: ["exploration", "environment reading"],
    mood_tags: ["grounded", "aged"],
    visual_language_tags: ["wear distribution", "tileable density"],
    license_status: "cc0_or_public_domain",
    attribution_text: "Review individual source page before public use.",
    public_status: "review",
    quality_status: "analyzed",
    rating: 5,
    reference_value_score: 5,
    transformability_score: 4,
    copyright_risk_score: 1,
    production_readiness_score: 5,
    inspiration_points: ["Surface wear logic", "Tileable density"],
    inspiration_entries: [
      {
        id: "seed-polyhaven-material-entry-1",
        observation: "Wear concentrates near edges and high-contact areas.",
        principle: "Material age reads best when wear follows plausible use patterns.",
        transferable_idea: "Transfer the wear distribution logic to a stylized material.",
        original_application: "Translate wear concentration into an original dungeon floor material.",
        avoid_copying: "Check the source license before rehosting previews or textures.",
      },
    ],
    deconstruction_notes: "Material references are useful for studying roughness, dirt accumulation, and pattern scale.",
    transformation_ideas: "Translate wear concentration into a stylized dungeon floor material.",
    avoid_copying_notes: "Do not assume every linked preview can be rehosted without checking the specific source license.",
    related_original_asset: "Dungeon floor material",
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:00:00.000Z",
  },
];

function createBlankInspirationEntry() {
  return {
    id: "",
    observation: "",
    principle: "",
    transferable_idea: "",
    original_application: "",
    avoid_copying: "",
  };
}

function ensureInspirationEntryIds(entries: InspirationEntry[]) {
  return entries.map((entry) => ({
    ...entry,
    id: entry.id?.trim() || crypto.randomUUID(),
  }));
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("zh");
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("references");
  const {
    workspaceRef,
    preferences: workspacePreferences,
    metrics: workspaceMetrics,
    workspaceStyle,
    draggingSide,
    separatorHandlers,
    togglePanel,
    restorePanel,
    applyPreferences,
  } = useWorkspaceLayout(workspaceView);
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonSelectionState>({
    isActive: false,
    referenceIds: [],
  });
  const [pendingSynthesisReferenceIds, setPendingSynthesisReferenceIds] = useState<string[]>([]);
  const [pendingSynthesisDraft, setPendingSynthesisDraft] = useState<SynthesisDraft | null>(null);
  const [pendingComparisonStart, setPendingComparisonStart] = useState(false);
  const [externalBackRequestToken, setExternalBackRequestToken] = useState(0);
  const [references, setReferences] = useState<ReferenceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetCategory | "all">("all");
  const [publicStatus, setPublicStatus] = useState<PublicStatus | "all">("all");
  const [qualityStatus, setQualityStatus] = useState<QualityStatus | "all">("all");
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | "all">("all");
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueMode>("all");
  const [sortMode, setSortMode] = useState<ReferenceSortMode>("updated_desc");
  const {
    preferences: workspaceViewPreferences,
    setDensity: setWorkspaceDensity,
  } = useWorkspaceViewPreferences();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pinnedReferenceIds, setPinnedReferenceIds] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    return parsePinnedReferenceIds(window.localStorage.getItem(PINNED_REFERENCES_STORAGE_KEY));
  });
  const [draft, setDraft] = useState<ReferenceDraft>(createEmptyReferenceDraft);
  const [editDraft, setEditDraft] = useState<ReferenceDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [qualityEditSession, setQualityEditSession] =
    useState<QualityEditSession | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<MetadataPreviewStatus>("idle");
  const [isSavingReference, setIsSavingReference] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [referenceDataSource, setReferenceDataSource] =
    useState<ReferenceDataSource>("loading");
  const [isDataManagementOpen, setIsDataManagementOpen] = useState(false);
  const [synthesisWorkspaceStatus, setSynthesisWorkspaceStatus] =
    useState<SynthesisWorkspaceStatus>({ dirty: false, busy: false });
  const [restoreEpoch, setRestoreEpoch] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const copy = uiCopy(language);
  const isComparisonSelectionMode = comparisonSelection.isActive;
  const comparisonReferenceIds = comparisonSelection.referenceIds;
  const isUsingSeedReferences = referenceDataSource === "seed";

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (
        !shouldFocusWorkspaceSearch(event, hasBlockingWorkspaceLayer())
      ) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  function labelForReferenceSortMode(mode: ReferenceSortMode) {
    switch (mode) {
      case "reference_value_desc":
        return copy.sortReferenceValue;
      case "transformability_desc":
        return copy.sortTransformability;
      case "copyright_risk_asc":
        return copy.sortCopyrightRisk;
      case "production_readiness_desc":
        return copy.sortProductionReadiness;
      case "title_asc":
        return copy.sortTitle;
      case "updated_desc":
      default:
        return copy.sortUpdated;
    }
  }

  function labelForReviewQueue(mode: ReviewQueueMode) {
    switch (mode) {
      case "incomplete":
        return copy.queueIncomplete;
      case "pinned":
        return copy.queuePinned;
      case "high_value":
        return copy.queueHighValue;
      case "low_risk":
        return copy.queueLowRisk;
      case "production_ready":
        return copy.queueProductionReady;
      case "all":
      default:
        return copy.queueAll;
    }
  }

  function labelForQualityIssue(issue: ReferenceQualityIssue) {
    switch (issue.field) {
      case "site_name":
        return copy.qualityMissingSite;
      case "author":
        return copy.qualityMissingAuthor;
      case "license_status":
        return copy.qualityMissingLicense;
      case "attribution_text":
        return copy.qualityMissingAttribution;
      case "avoid_copying_notes":
        return copy.qualityMissingAvoidCopying;
      case "inspiration_points":
        return copy.qualityMissingInspirationPoints;
      case "inspiration_entries":
        return copy.qualityMissingInspirationEntries;
      case "deconstruction_notes":
        return copy.qualityMissingDeconstruction;
      case "transformation_ideas":
        return copy.qualityMissingTransformation;
      case "rating":
        return copy.qualityMissingRating;
      case "reference_value_score":
        return copy.qualityMissingReferenceValue;
      case "transformability_score":
        return copy.qualityMissingTransformability;
      case "copyright_risk_score":
        return copy.qualityMissingCopyrightRisk;
      case "production_readiness_score":
      default:
        return copy.qualityMissingProductionReadiness;
    }
  }

  function closeEditIfHiddenByView(nextView: {
    query?: string;
    assetCategory?: AssetCategory | "all";
    publicStatus?: PublicStatus | "all";
    qualityStatus?: QualityStatus | "all";
    licenseStatus?: LicenseStatus | "all";
    reviewQueue?: ReviewQueueMode;
  }) {
    if (!editingId || isSavingEdit) {
      return;
    }

    const editingReference = references.find((reference) => reference.id === editingId);
    if (!editingReference) {
      return;
    }

    const nextQuery = nextView.query ?? query;
    const nextAssetCategory = nextView.assetCategory ?? assetCategory;
    const nextPublicStatus = nextView.publicStatus ?? publicStatus;
    const nextQualityStatus = nextView.qualityStatus ?? qualityStatus;
    const nextLicenseStatus = nextView.licenseStatus ?? licenseStatus;
    const nextReviewQueue = nextView.reviewQueue ?? reviewQueue;
    const normalizedQuery = nextQuery.trim().toLowerCase();
    const searchable = buildReferenceSearchText(editingReference);
    const remainsInReviewQueue =
      filterReferencesByReviewQueue([editingReference], nextReviewQueue, pinnedReferenceIds).length > 0;

    const remainsVisible =
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (nextAssetCategory === "all" || editingReference.asset_category === nextAssetCategory) &&
      (nextPublicStatus === "all" || editingReference.public_status === nextPublicStatus) &&
      (nextQualityStatus === "all" || editingReference.quality_status === nextQualityStatus) &&
      (nextLicenseStatus === "all" || editingReference.license_status === nextLicenseStatus) &&
      remainsInReviewQueue;

    if (!remainsVisible) {
      setEditingId(null);
      setEditDraft(null);
      clearQualityEditSession();
      setMessage(copy.selectionHidden);
    }
  }

  const reloadReferenceLibrary = useCallback(async (preferredId?: string | null) => {
    const response = await fetch("/api/references");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Failed to load references");
    }

    const rows = payload.references as ReferenceRecord[];
    const nextSource: ReferenceDataSource = rows.length > 0 ? "persisted" : "seed";
    const visibleRows = rows.length > 0 ? rows : seedReferences;
    setReferenceDataSource(nextSource);
    setComparisonSelection((current) =>
      reconcileComparisonSelectionSource(current, nextSource),
    );
    setReferences(visibleRows);
    setSelectedId((current) => {
      const candidate = preferredId === undefined ? current : preferredId;
      return candidate && visibleRows.some((reference) => reference.id === candidate)
        ? candidate
        : visibleRows[0]?.id ?? null;
    });
    return rows;
  }, []);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void reloadReferenceLibrary(null).catch((error) => {
        if (cancelled) return;
        setReferenceDataSource("seed");
        setComparisonSelection((current) =>
          reconcileComparisonSelectionSource(current, "seed"),
        );
        setReferences(seedReferences);
        setSelectedId(seedReferences[0]?.id ?? null);
        setMessage(error instanceof Error ? error.message : null);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [reloadReferenceLibrary]);

  useEffect(() => {
    window.localStorage.setItem(
      PINNED_REFERENCES_STORAGE_KEY,
      serializePinnedReferenceIds(pinnedReferenceIds),
    );
  }, [pinnedReferenceIds]);

  const filteredReferences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return references.filter((reference) => {
      const searchable = buildReferenceSearchText(reference);

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (assetCategory === "all" || reference.asset_category === assetCategory) &&
        (publicStatus === "all" || reference.public_status === publicStatus) &&
        (qualityStatus === "all" || reference.quality_status === qualityStatus) &&
        (licenseStatus === "all" || reference.license_status === licenseStatus)
      );
    });
  }, [assetCategory, licenseStatus, publicStatus, qualityStatus, query, references]);

  const sortedReferences = useMemo(
    () =>
      sortReferences(
        filterReferencesByReviewQueue(filteredReferences, reviewQueue, pinnedReferenceIds),
        sortMode,
        pinnedReferenceIds,
      ),
    [filteredReferences, pinnedReferenceIds, reviewQueue, sortMode],
  );

  const selectedReference = getVisibleDetailReference(
    sortedReferences,
    references,
    selectedId,
  );
  const editedReference = editingId
    ? references.find((reference) => reference.id === editingId) ?? null
    : null;
  const hasUnsavedDraft =
    (isFormOpen && JSON.stringify(draft) !== JSON.stringify(createEmptyReferenceDraft())) ||
    Boolean(editDraft && editedReference && isReferenceDraftDirty(editDraft, editedReference)) ||
    synthesisWorkspaceStatus.dirty;
  const businessMutationBusy =
    isPreviewing ||
    isSavingReference ||
    isSavingEdit ||
    isDeleting ||
    synthesisWorkspaceStatus.busy;
  const isEditingSelected = Boolean(
    selectedReference && editingId === selectedReference.id && editDraft,
  );
  const activeQualityIssue = qualityEditSession
    ? qualityEditSession.issues[qualityEditSession.activeIndex] ?? null
    : null;

  useEffect(() => {
    if (!isEditingSelected || !activeQualityIssue) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      const targetId = getQualityFieldTargetId(activeQualityIssue.field);
      const target = targetId ? document.getElementById(targetId) : null;
      if (!(target instanceof HTMLElement)) {
        setMessage(copy.qualityTargetMissing);
        return;
      }

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center",
      });
      target.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeQualityIssue, copy.qualityTargetMissing, isEditingSelected]);

  function clearQualityEditSession() {
    setQualityEditSession(null);
  }

  function startEditing(reference: ReferenceRecord) {
    clearQualityEditSession();
    setEditingId(reference.id);
    setEditDraft(recordToReferenceDraft(reference));
    setMessage(copy.editingSelected);
  }

  function startQualityEditing(
    reference: ReferenceRecord,
    issue: ReferenceQualityIssue,
  ) {
    const session = createQualityEditSession(
      evaluateReferenceQuality(reference).issues,
      issue,
    );

    if (!session) {
      setMessage(copy.qualityTargetMissing);
      return;
    }

    setQualityEditSession(session);
    setEditingId(reference.id);
    setEditDraft(recordToReferenceDraft(reference));
    setMessage(copy.editingSelected);
  }

  function moveQualityIssue(direction: "previous" | "next") {
    setQualityEditSession((current) => {
      if (!current) {
        return current;
      }

      const activeIndex = getAdjacentQualityIssueIndex(
        current.activeIndex,
        current.issues.length,
        direction,
      );

      return activeIndex === null ? current : { ...current, activeIndex };
    });
  }

  function qualityTargetClass(field: ReferenceQualityIssue["field"]) {
    return activeQualityIssue?.field === field ? "quality-target-active" : undefined;
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
    clearQualityEditSession();
    setMessage(copy.editCanceled);
  }

  function updateDraftInspirationEntry(
    index: number,
    field: keyof ReturnType<typeof createBlankInspirationEntry>,
    value: string,
  ) {
    setDraft((current) => {
      const entries = [...current.inspiration_entries];
      entries[index] = { ...(entries[index] ?? createBlankInspirationEntry()), [field]: value };
      return { ...current, inspiration_entries: entries };
    });
  }

  function updateEditInspirationEntry(
    index: number,
    field: keyof ReturnType<typeof createBlankInspirationEntry>,
    value: string,
  ) {
    setEditDraft((current) => {
      if (!current) {
        return current;
      }

      const entries = [...current.inspiration_entries];
      entries[index] = { ...(entries[index] ?? createBlankInspirationEntry()), [field]: value };
      return { ...current, inspiration_entries: entries };
    });
  }

  function selectReference(id: string) {
    if (isSavingEdit) {
      setMessage(copy.finishSaving);
      return;
    }

    setSelectedId(id);
    setPendingDeleteId(null);
    if (editingId && editingId !== id) {
      setEditingId(null);
      setEditDraft(null);
      clearQualityEditSession();
      setMessage(copy.selectionChanged);
    }
  }

  function beginComparisonSelection() {
    setPendingComparisonStart(false);
    setIsFormOpen(false);
    setEditingId(null);
    setEditDraft(null);
    clearQualityEditSession();
    setPendingDeleteId(null);
    setSelectedId(null);
    setComparisonSelection({ isActive: true, referenceIds: [] });
    setMessage(null);
  }

  function startComparisonSelection() {
    const availability = getComparisonAvailability(
      referenceDataSource,
      comparisonReferenceIds,
    );
    const editingReference = editingId === null
      ? null
      : references.find((reference) => reference.id === editingId) ?? null;
    const decision = getComparisonStartDecision({
      canStartComparison: availability.canStartComparison,
      isSavingReference: isSavingEdit,
      hasDirtyReferenceEdit: Boolean(
        editingReference && editDraft && isReferenceDraftDirty(editDraft, editingReference),
      ),
    });
    if (decision === "blocked") {
      return;
    }
    if (decision === "confirm-discard") {
      setPendingComparisonStart(true);
      return;
    }

    beginComparisonSelection();
  }

  function cancelComparisonSelection() {
    setComparisonSelection({ isActive: false, referenceIds: [] });
    setMessage(null);
  }

  function toggleComparisonSelection(referenceId: string) {
    setComparisonSelection((current) =>
      current.isActive
        ? {
            ...current,
            referenceIds: toggleSynthesisSelection(current.referenceIds, referenceId),
          }
        : current,
    );
  }

  function enterSynthesisWorkspace() {
    const availability = getComparisonAvailability(
      referenceDataSource,
      comparisonReferenceIds,
    );
    if (!availability.canHandoff) {
      setComparisonSelection((current) =>
        reconcileComparisonSelectionSource(current, referenceDataSource),
      );
      return;
    }

    setPendingSynthesisReferenceIds(comparisonReferenceIds);
    setComparisonSelection({ isActive: false, referenceIds: [] });
    setWorkspaceView("syntheses");
  }

  function requestReferencesWorkspace() {
    if (workspaceView === "references") {
      return;
    }

    setExternalBackRequestToken((current) => current + 1);
  }

  function openSynthesisWorkspace() {
    cancelComparisonSelection();
    setWorkspaceView("syntheses");
  }

  async function reselectSynthesisReferences(nextDraft: SynthesisDraft) {
    setPendingSynthesisDraft(nextDraft);
    setPendingSynthesisReferenceIds([]);
    setWorkspaceView("references");
    setReferenceDataSource("loading");
    setComparisonSelection({ isActive: false, referenceIds: [] });

    try {
      const rows = await reloadReferenceLibrary(null);
      const nextSource: ReferenceDataSource = rows.length > 0 ? "persisted" : "seed";
      setComparisonSelection(
        nextSource === "persisted"
          ? { isActive: true, referenceIds: [] }
          : { isActive: false, referenceIds: [] },
      );
      setMessage(nextSource === "persisted" ? null : seedFallbackMessage(language));
    } catch {
      setReferenceDataSource("seed");
      setReferences(seedReferences);
      setSelectedId(seedReferences[0]?.id ?? null);
      setComparisonSelection({ isActive: false, referenceIds: [] });
      setMessage(copy.synthesisOperationFailed);
    }
  }

  async function previewMetadata() {
    if (!draft.source_url.trim()) {
      setPreviewStatus("failure");
      setMessage(copy.pasteSourceUrl);
      return;
    }

    setIsPreviewing(true);
    setPreviewStatus("loading");
    setMessage(null);

    try {
      const response = await fetch("/api/metadata/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_url: draft.source_url }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Metadata preview failed.");
      }

      const metadata = payload.metadata;
      setDraft((current) => ({
        ...current,
        title: metadata.title ?? current.title,
        canonical_url: metadata.canonical_url ?? current.canonical_url,
        site_name: metadata.site_name ?? current.site_name,
        preview_url: metadata.preview_url ?? current.preview_url,
      }));
      setPreviewStatus("success");
      setMessage(copy.metadataPreviewSuccess);
    } catch (error) {
      setPreviewStatus("failure");
      setMessage(error instanceof Error ? error.message : copy.metadataPreviewFailedFallback);
    } finally {
      setIsPreviewing(false);
    }
  }

  async function saveReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSavingReference) {
      return;
    }
    setIsSavingReference(true);
    setMessage(null);

    const input = draftToReferenceInput(draft);

    try {
      const response = await fetch("/api/references", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.errors?.join(", ") ?? payload.error ?? "Save failed.");
      }

      const reference = payload.reference as ReferenceRecord;
      setReferences((current) => [reference, ...current.filter((item) => !item.id.startsWith("seed-"))]);
      setReferenceDataSource("persisted");
      setComparisonSelection((current) =>
        reconcileComparisonSelectionSource(current, "persisted"),
      );
      setSelectedId(reference.id);
      setEditingId(null);
      setEditDraft(null);
      clearQualityEditSession();
      setDraft(createEmptyReferenceDraft());
      setIsFormOpen(false);
      setMessage(copy.savedPrivate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed);
    } finally {
      setIsSavingReference(false);
    }
  }

  async function saveReferenceEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedReference || !editDraft) {
      return;
    }

    if (!isReferenceDraftDirty(editDraft, selectedReference)) {
      setMessage(copy.noChanges);
      return;
    }

    const input = draftToReferenceInput(editDraft);
    const validation = validateReferenceInput(input);

    if (!validation.ok) {
      setMessage(validation.errors.join(", "));
      return;
    }

    setIsSavingEdit(true);
    setMessage(copy.savingChanges);

    try {
      let updatedReference: ReferenceRecord;

      if (selectedReference.id.startsWith("seed-")) {
        const now = new Date().toISOString();
        updatedReference = {
          ...selectedReference,
          title: input.title.trim(),
          source_url: input.source_url.trim(),
          canonical_url: input.canonical_url ?? null,
          site_name: input.site_name ?? null,
          author: input.author ?? null,
          preview_url: input.preview_url ?? null,
          media_type: input.media_type,
          asset_category: input.asset_category,
          source_category: input.source_category ?? null,
          style_tags: input.style_tags ?? [],
          use_tags: input.use_tags ?? [],
          mechanic_tags: input.mechanic_tags ?? [],
          mood_tags: input.mood_tags ?? [],
          visual_language_tags: input.visual_language_tags ?? [],
          license_status: input.license_status ?? "private_reference",
          attribution_text: input.attribution_text ?? null,
          public_status: input.public_status ?? "private",
          quality_status: input.quality_status ?? "captured",
          rating: input.rating ?? null,
          reference_value_score: input.reference_value_score ?? null,
          transformability_score: input.transformability_score ?? null,
          copyright_risk_score: input.copyright_risk_score ?? null,
          production_readiness_score: input.production_readiness_score ?? null,
          inspiration_points: input.inspiration_points ?? [],
          inspiration_entries: ensureInspirationEntryIds(input.inspiration_entries ?? []),
          deconstruction_notes: input.deconstruction_notes ?? null,
          transformation_ideas: input.transformation_ideas ?? null,
          avoid_copying_notes: input.avoid_copying_notes ?? null,
          related_original_asset: input.related_original_asset ?? null,
          updated_at: now,
        };
      } else {
        const response = await fetch(`/api/references/${selectedReference.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.errors?.join(", ") ?? payload.error ?? "Update failed.");
        }

        updatedReference = payload.reference as ReferenceRecord;
      }

      setReferences((current) =>
        current.map((item) => (item.id === selectedReference.id ? updatedReference : item)),
      );
      setSelectedId(updatedReference.id);
      setEditingId(null);
      setEditDraft(null);
      clearQualityEditSession();
      setMessage(
        selectedReference.id.startsWith("seed-")
          ? copy.starterUpdatedLocally
          : copy.changesSaved,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.updateFailed);
    } finally {
      setIsSavingEdit(false);
    }
  }

  function requestDelete(reference: ReferenceRecord) {
    setPendingDeleteId(reference.id);
    setMessage(null);
  }

  function cancelDelete() {
    setPendingDeleteId(null);
  }

  async function confirmDelete(reference: ReferenceRecord) {
    setIsDeleting(true);
    try {
      if (!reference.id.startsWith("seed-")) {
        const response = await fetch(`/api/references/${reference.id}`, { method: "DELETE" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to delete reference");
        }
      }

      const remainingReferences = references.filter((item) => item.id !== reference.id);
      if (referenceDataSource === "persisted" && remainingReferences.length === 0) {
        setReferences(seedReferences);
        setReferenceDataSource("seed");
        setComparisonSelection((current) =>
          reconcileComparisonSelectionSource(current, "seed"),
        );
        setSelectedId(seedReferences[0]?.id ?? null);
      } else {
        setReferences(remainingReferences);
        setSelectedId(null);
      }
      setPendingDeleteId(null);
      clearQualityEditSession();
      setMessage(copy.deleted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  }

  function togglePinnedReference(referenceId: string) {
    setPinnedReferenceIds((current) => togglePinnedReferenceId(current, referenceId));
  }

  const openDataManagement = useCallback(() => {
    setIsDataManagementOpen(true);
  }, []);

  async function handleRestoreCommitted(
    preferences: BackupDevicePreferences | null,
  ): Promise<"applied" | "failed" | "not_requested"> {
    const preferredSelectedId = selectedId;
    setIsFormOpen(false);
    setDraft(createEmptyReferenceDraft());
    setPreviewStatus("idle");
    setEditingId(null);
    setEditDraft(null);
    clearQualityEditSession();
    setPendingDeleteId(null);
    setPendingComparisonStart(false);
    setComparisonSelection({ isActive: false, referenceIds: [] });
    setPendingSynthesisReferenceIds([]);
    setPendingSynthesisDraft(null);
    setMessage(null);

    const persistedRows = await reloadReferenceLibrary(preferredSelectedId);
    setRestoreEpoch((current) => current + 1);

    if (!preferences) {
      return "not_requested";
    }

    const persistedReferenceIds = new Set(persistedRows.map((reference) => reference.id));
    const restoredPinnedIds = preferences.pinned_reference_ids.filter((id) =>
      persistedReferenceIds.has(id),
    );
    let previousPinned: string | null;
    try {
      previousPinned = window.localStorage.getItem(PINNED_REFERENCES_STORAGE_KEY);
      window.localStorage.setItem(
        PINNED_REFERENCES_STORAGE_KEY,
        serializePinnedReferenceIds(restoredPinnedIds),
      );
    } catch {
      return "failed";
    }

    if (!applyPreferences(preferences.workspace_layout)) {
      try {
        if (previousPinned === null) {
          window.localStorage.removeItem(PINNED_REFERENCES_STORAGE_KEY);
        } else {
          window.localStorage.setItem(PINNED_REFERENCES_STORAGE_KEY, previousPinned);
        }
      } catch {
        // The server restore remains successful even when device preference rollback is unavailable.
      }
      return "failed";
    }

    setPinnedReferenceIds(restoredPinnedIds);
    return "applied";
  }

  function downloadText(content: string, filename: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportSelectedMarkdown() {
    if (!selectedReference) {
      setMessage(copy.exportUnavailable);
      return;
    }

    downloadText(
      formatReferenceMarkdown(selectedReference),
      safeExportFilename(selectedReference.title, "md"),
      "text/markdown;charset=utf-8",
    );
  }

  const comparisonAvailability = getComparisonAvailability(
    referenceDataSource,
    comparisonReferenceIds,
  );
  const comparisonReferences = comparisonReferenceIds
    .map((id) => references.find((reference) => reference.id === id))
    .filter((reference): reference is ReferenceRecord => Boolean(reference));

  return (
    <main
      ref={workspaceRef}
      style={workspaceStyle}
      className={[
        "workspace",
        workspaceView === "references" ? "workspace--references" : "workspace--syntheses",
        workspacePreferences.leftCollapsed ? "workspace--left-collapsed" : "",
        workspaceView === "references" && workspacePreferences.rightCollapsed
          ? "workspace--right-collapsed"
          : "",
        `workspace--density-${workspaceViewPreferences.density}`,
        draggingSide ? `workspace--dragging-${draggingSide}` : "",
      ].filter(Boolean).join(" ")}
    >
      <aside className="sidebar research-rail" aria-label={copy.filtersLabel}>
        <div className="brand-block">
          <div className="brand-eyebrow-row">
            <p className="eyebrow">REFFORGE</p>
            <button
              type="button"
              className="workspace-collapse-button workspace-collapse-button--filters"
              aria-label={copy.collapseFiltersPanel}
              title={copy.collapseFiltersPanel}
              onClick={() => togglePanel("left")}
            >
              <PanelLeftClose aria-hidden="true" size={17} />
            </button>
          </div>
          <h1>灵感锻造台</h1>
          <p className="workspace-mode">{copy.workspaceMode}</p>
          <p>{copy.productDescription}</p>
          <label className="language-switcher">
            {copy.languageLabel}
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="zh">{copy.chinese}</option>
              <option value="en">{copy.english}</option>
            </select>
          </label>
          <div className="workspace-view-switch" role="group" aria-label={copy.synthesisWorkspace}>
            <button
              type="button"
              className={workspaceView === "references" ? "is-active" : undefined}
              aria-pressed={workspaceView === "references"}
              onClick={requestReferencesWorkspace}
            >
              {copy.referencesView}
            </button>
            <button
              type="button"
              className={workspaceView === "syntheses" ? "is-active" : undefined}
              aria-pressed={workspaceView === "syntheses"}
              onClick={openSynthesisWorkspace}
            >
              {copy.synthesesView}
            </button>
          </div>
        </div>

        {workspaceView === "references" ? (
          <>
        <div className="filter-heading">
          <p className="panel-kicker">{copy.researchControls}</p>
          <span>{copy.privateByDefault}</span>
        </div>

        <label>
          {copy.reviewQueue}
          <select
            value={reviewQueue}
            onChange={(event) => {
              const nextReviewQueue = event.target.value as ReviewQueueMode;
              closeEditIfHiddenByView({ reviewQueue: nextReviewQueue });
              setReviewQueue(nextReviewQueue);
            }}
          >
            {REVIEW_QUEUE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {labelForReviewQueue(mode)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {copy.assetCategory}
          <select
            value={assetCategory}
            onChange={(event) => {
              const nextAssetCategory = event.target.value as AssetCategory | "all";
              closeEditIfHiddenByView({ assetCategory: nextAssetCategory });
              setAssetCategory(nextAssetCategory);
            }}
          >
            <option value="all">{copy.allCategories}</option>
            {ASSET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {labelForAssetCategory(category, language)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {copy.publicStatus}
          <select
            value={publicStatus}
            onChange={(event) => {
              const nextPublicStatus = event.target.value as PublicStatus | "all";
              closeEditIfHiddenByView({ publicStatus: nextPublicStatus });
              setPublicStatus(nextPublicStatus);
            }}
          >
            <option value="all">{copy.allStatuses}</option>
            {PUBLIC_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelForPublicStatus(status, language)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {copy.qualityStatus}
          <select
            value={qualityStatus}
            onChange={(event) => {
              const nextQualityStatus = event.target.value as QualityStatus | "all";
              closeEditIfHiddenByView({ qualityStatus: nextQualityStatus });
              setQualityStatus(nextQualityStatus);
            }}
          >
            <option value="all">{copy.allQualityStatuses}</option>
            {QUALITY_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelForQualityStatus(status, language)}
              </option>
            ))}
          </select>
        </label>

        <label>
          {copy.licenseStatus}
          <select
            value={licenseStatus}
            onChange={(event) => {
              const nextLicenseStatus = event.target.value as LicenseStatus | "all";
              closeEditIfHiddenByView({ licenseStatus: nextLicenseStatus });
              setLicenseStatus(nextLicenseStatus);
            }}
          >
            <option value="all">{copy.allLicenses}</option>
            {LICENSE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelForLicenseStatus(status, language)}
              </option>
            ))}
          </select>
        </label>

        <button
          className="ghost-button"
          type="button"
          onClick={() => {
            setAssetCategory("all");
            setPublicStatus("all");
            setQualityStatus("all");
            setLicenseStatus("all");
            setReviewQueue("all");
            setQuery("");
          }}
        >
          {copy.clearFilters}
        </button>
          </>
        ) : null}
      </aside>

      <WorkspaceSeparator
        side="left"
        collapsed={workspacePreferences.leftCollapsed}
        expandLabel={copy.expandFiltersPanel}
        handlers={separatorHandlers.left}
        label={copy.resizeFiltersPanel}
        min={WORKSPACE_LEFT_MIN}
        max={WORKSPACE_LEFT_MAX}
        value={workspaceMetrics.leftWidth}
        resetLabel={copy.resetPanelWidth}
        onRestore={() => restorePanel("left")}
      />

      {workspaceView === "references" ? (
        <>
      <section className="gallery-pane reference-canvas">
        <ReferenceToolbar
          addDisabled={isComparisonSelectionMode}
          comparisonActive={isComparisonSelectionMode}
          comparisonDisabled={
            !comparisonAvailability.canStartComparison || isSavingEdit
          }
          copy={copy}
          dataManagementDisabled={businessMutationBusy}
          density={workspaceViewPreferences.density}
          onDensityChange={setWorkspaceDensity}
          onOpenDataManagement={openDataManagement}
          onQueryChange={(nextQuery) => {
            closeEditIfHiddenByView({ query: nextQuery });
            setQuery(nextQuery);
          }}
          onSortChange={setSortMode}
          onStartComparison={startComparisonSelection}
          onToggleAdd={() => setIsFormOpen((value) => !value)}
          query={query}
          resultCount={sortedReferences.length}
          searchInputRef={searchInputRef}
          sortMode={sortMode}
          sortOptions={REFERENCE_SORT_MODES.map((mode) => ({
            value: mode,
            label: labelForReferenceSortMode(mode),
          }))}
        />

        {message ? <p className="status-message">{message}</p> : null}

        {isFormOpen ? (
          <form className="reference-form" onSubmit={saveReference}>
            <div className="form-grid">
              <label>
                {copy.sourceUrl}
                <input
                  required
                  value={draft.source_url}
                  onChange={(event) => setDraft({ ...draft, source_url: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label>
                {copy.title}
                <input
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </label>
              <label>
                {copy.site}
                <input
                  value={draft.site_name ?? ""}
                  onChange={(event) => setDraft({ ...draft, site_name: event.target.value })}
                />
              </label>
              <label>
                {copy.author}
                <input
                  value={draft.author ?? ""}
                  onChange={(event) => setDraft({ ...draft, author: event.target.value })}
                />
              </label>
              <label>
                {copy.mediaType}
                <select
                  value={draft.media_type}
                  onChange={(event) => setDraft({ ...draft, media_type: event.target.value as MediaType })}
                >
                  {MEDIA_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {labelForMediaType(type, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.assetCategory}
                <select
                  value={draft.asset_category}
                  onChange={(event) => setDraft({ ...draft, asset_category: event.target.value as AssetCategory })}
                >
                  {ASSET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {labelForAssetCategory(category, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.licenseStatus}
                <select
                  value={draft.license_status}
                  onChange={(event) => setDraft({ ...draft, license_status: event.target.value as LicenseStatus })}
                >
                  {LICENSE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {labelForLicenseStatus(status, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.publicStatus}
                <select
                  value={draft.public_status}
                  onChange={(event) => setDraft({ ...draft, public_status: event.target.value as PublicStatus })}
                >
                  {PUBLIC_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {labelForPublicStatus(status, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.qualityStatus}
                <select
                  value={draft.quality_status}
                  onChange={(event) => setDraft({ ...draft, quality_status: event.target.value as QualityStatus })}
                >
                  {QUALITY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {labelForQualityStatus(status, language)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {copy.styleTags}
                <input
                  value={draft.style_tags_text}
                  onChange={(event) => setDraft({ ...draft, style_tags_text: event.target.value })}
                  placeholder={copy.styleTagsPlaceholder}
                />
              </label>
              <label>
                {copy.useTags}
                <input
                  value={draft.use_tags_text}
                  onChange={(event) => setDraft({ ...draft, use_tags_text: event.target.value })}
                  placeholder={copy.useTagsPlaceholder}
                />
              </label>
              <label>
                {copy.mechanicTags}
                <input
                  value={draft.mechanic_tags_text}
                  onChange={(event) => setDraft({ ...draft, mechanic_tags_text: event.target.value })}
                  placeholder={copy.mechanicTagsPlaceholder}
                />
              </label>
              <label>
                {copy.moodTags}
                <input
                  value={draft.mood_tags_text}
                  onChange={(event) => setDraft({ ...draft, mood_tags_text: event.target.value })}
                  placeholder={copy.moodTagsPlaceholder}
                />
              </label>
              <label>
                {copy.visualLanguageTags}
                <input
                  value={draft.visual_language_tags_text}
                  onChange={(event) => setDraft({ ...draft, visual_language_tags_text: event.target.value })}
                  placeholder={copy.visualLanguageTagsPlaceholder}
                />
              </label>
              <label>
                {copy.referenceValueScore}
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={draft.reference_value_score}
                  onChange={(event) => setDraft({ ...draft, reference_value_score: event.target.value })}
                />
              </label>
              <label>
                {copy.transformabilityScore}
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={draft.transformability_score}
                  onChange={(event) => setDraft({ ...draft, transformability_score: event.target.value })}
                />
              </label>
              <label>
                {copy.copyrightRiskScore}
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={draft.copyright_risk_score}
                  onChange={(event) => setDraft({ ...draft, copyright_risk_score: event.target.value })}
                />
              </label>
              <label>
                {copy.productionReadinessScore}
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={draft.production_readiness_score}
                  onChange={(event) => setDraft({ ...draft, production_readiness_score: event.target.value })}
                />
              </label>
            </div>
            <label>
              {copy.inspirationPoints}
              <textarea
                value={draft.inspiration_points_text}
                onChange={(event) => setDraft({ ...draft, inspiration_points_text: event.target.value })}
                placeholder={copy.inspirationPointsPlaceholder}
              />
            </label>
            <section className="inspiration-entry-editor">
              <div className="section-heading-row">
                <h3>{copy.structuredInspiration}</h3>
                <span className="entry-count">
                  {copy.inspirationEntryCount}: {draft.inspiration_entries.length}
                </span>
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      inspiration_entries: [...draft.inspiration_entries, createBlankInspirationEntry()],
                    })
                  }
                >
                  {copy.addInspirationEntry}
                </button>
              </div>
              {(draft.inspiration_entries.length > 0 ? draft.inspiration_entries : [createBlankInspirationEntry()]).map((entry, index) => (
                <div className="inspiration-entry-fields" key={entry.id || `draft-entry-${index}`}>
                  <label>
                    {copy.inspirationObservation}
                    <textarea
                      value={entry.observation}
                      onChange={(event) => updateDraftInspirationEntry(index, "observation", event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.inspirationPrinciple}
                    <textarea
                      value={entry.principle}
                      onChange={(event) => updateDraftInspirationEntry(index, "principle", event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.inspirationTransferableIdea}
                    <textarea
                      value={entry.transferable_idea}
                      onChange={(event) => updateDraftInspirationEntry(index, "transferable_idea", event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.inspirationOriginalApplication}
                    <textarea
                      value={entry.original_application}
                      onChange={(event) => updateDraftInspirationEntry(index, "original_application", event.target.value)}
                    />
                  </label>
                  <label>
                    {copy.inspirationAvoidCopying}
                    <textarea
                      value={entry.avoid_copying}
                      onChange={(event) => updateDraftInspirationEntry(index, "avoid_copying", event.target.value)}
                    />
                  </label>
                  {draft.inspiration_entries.length > 0 ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          inspiration_entries: draft.inspiration_entries.filter((_, entryIndex) => entryIndex !== index),
                        })
                      }
                    >
                      {copy.removeInspirationEntry}
                    </button>
                  ) : null}
                </div>
              ))}
            </section>
            <label>
              {copy.deconstructionNotes}
              <textarea
                value={draft.deconstruction_notes ?? ""}
                onChange={(event) => setDraft({ ...draft, deconstruction_notes: event.target.value })}
              />
            </label>
            <label>
              {copy.transformationIdeas}
              <textarea
                value={draft.transformation_ideas ?? ""}
                onChange={(event) => setDraft({ ...draft, transformation_ideas: event.target.value })}
              />
            </label>
            <label>
              {copy.avoidCopying}
              <textarea
                value={draft.avoid_copying_notes ?? ""}
                onChange={(event) => setDraft({ ...draft, avoid_copying_notes: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={previewMetadata} disabled={isPreviewing}>
                {isPreviewing ? copy.previewingMetadata : copy.previewMetadata}
              </button>
              <button type="submit" disabled={isSavingReference}>
                {isSavingReference ? copy.saving : copy.savePrivateReference}
              </button>
            </div>
            {metadataPreviewMessage(previewStatus) ? (
              <p className={`form-status form-status--${previewStatus}`}>
                {metadataPreviewMessage(previewStatus, language)}
              </p>
            ) : null}
          </form>
        ) : null}

        <div className="result-summary">
          <span>{copy.sourceAndSafety}</span>
          <span>{copy.scoreMatrix}</span>
          <span>{copy.tagAxes}</span>
        </div>

        {isUsingSeedReferences ? (
          <p className="seed-fallback-message">{seedFallbackMessage(language)}</p>
        ) : null}

        {sortedReferences.length === 0 ? (
          <div className="empty-results">
            <h2>{copy.noReferencesMatch}</h2>
            <p>{copy.noReferencesHint}</p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setAssetCategory("all");
                setPublicStatus("all");
                setQualityStatus("all");
                setLicenseStatus("all");
                setQuery("");
              }}
            >
              {copy.clearFilters}
            </button>
          </div>
        ) : null}

        <div className="reference-grid" aria-live="polite">
          {sortedReferences.map((reference) => {
            const isSelectedForComparison = comparisonReferenceIds.includes(reference.id);
            const isComparisonSelectionAtLimit =
              isComparisonSelectionMode &&
              comparisonReferenceIds.length >= 4 &&
              !isSelectedForComparison;
            const isCardDisabled = isSavingEdit || isComparisonSelectionAtLimit;

            return (
              <ReferenceCard
                copy={copy}
                density={workspaceViewPreferences.density}
                disabled={isCardDisabled}
                isComparisonMode={isComparisonSelectionMode}
                isComparisonSelected={isSelectedForComparison}
                isPinned={pinnedReferenceIds.includes(reference.id)}
                isSelected={
                  !isComparisonSelectionMode &&
                  reference.id === selectedReference?.id
                }
                key={reference.id}
                language={language}
                limitReached={isComparisonSelectionAtLimit}
                onActivate={() => {
                  if (isComparisonSelectionMode) {
                    toggleComparisonSelection(reference.id);
                    return;
                  }

                  selectReference(reference.id);
                }}
                onTogglePinned={() => togglePinnedReference(reference.id)}
                reference={reference}
              />
            );
          })}
        </div>
        {isComparisonSelectionMode ? (
          <ComparisonDock
            canHandoff={comparisonAvailability.canHandoff}
            copy={copy}
            language={language}
            onCancel={cancelComparisonSelection}
            onEnter={enterSynthesisWorkspace}
            onRemove={toggleComparisonSelection}
            references={comparisonReferences}
          />
        ) : null}
        {pendingComparisonStart ? (
          <SynthesisConfirmation
            title={copy.discardReferenceEditTitle}
            body={copy.discardReferenceEditConfirmation}
            cancelLabel={copy.cancel}
            confirmLabel={copy.discardReferenceEditAndCompare}
            onCancel={() => setPendingComparisonStart(false)}
            onConfirm={beginComparisonSelection}
          />
        ) : null}
      </section>

      <WorkspaceSeparator
        side="right"
        collapsed={workspacePreferences.rightCollapsed}
        expandLabel={copy.expandDetailsPanel}
        handlers={separatorHandlers.right}
        label={copy.resizeDetailsPanel}
        min={WORKSPACE_RIGHT_MIN}
        max={WORKSPACE_RIGHT_MAX}
        value={workspaceMetrics.rightWidth}
        resetLabel={copy.resetPanelWidth}
        onRestore={() => restorePanel("right")}
      />

      <aside className="detail-panel reference-inspector" aria-label={copy.selectedReference}>
        <button
          type="button"
          className="workspace-collapse-button workspace-collapse-button--details"
          aria-label={copy.collapseDetailsPanel}
          title={copy.collapseDetailsPanel}
          onClick={() => togglePanel("right")}
          >
            <PanelRightClose aria-hidden="true" size={17} />
        </button>
        {selectedReference ? (
          <>
            <div className="detail-heading">
              <p className="eyebrow">{copy.inspirationWorkbench}</p>
              <h2>{selectedReference.title}</h2>
              <p>{copy.sourceAndSafety} · {copy.scoreMatrix} · {copy.tagAxes}</p>
              {!isEditingSelected ? (
                <div className="detail-actions">
                  <a href={selectedReference.source_url} target="_blank" rel="noreferrer">
                    {copy.openSource}
                  </a>
                  <button className="ghost-button" type="button" onClick={() => startEditing(selectedReference)}>
                    {copy.edit}
                  </button>
                  <button className="ghost-button" type="button" onClick={exportSelectedMarkdown}>
                    {copy.exportMarkdown}
                  </button>
                </div>
              ) : null}
            </div>

            {isEditingSelected && editDraft ? (
              <form className="detail-edit-form" onSubmit={saveReferenceEdit}>
                {qualityEditSession && activeQualityIssue ? (
                  <section
                    className="quality-guided-navigation"
                    data-quality-guided-navigation
                    aria-label={copy.qualityGuidedEditing}
                  >
                    <div>
                      <p className="eyebrow">{copy.qualityGuidedEditing}</p>
                      <strong>{labelForQualityIssue(activeQualityIssue)}</strong>
                      <span>
                        {copy.qualityGuidedPosition} {qualityEditSession.activeIndex + 1} /{" "}
                        {qualityEditSession.issues.length}
                      </span>
                    </div>
                    <div className="quality-guided-actions">
                      <button
                        type="button"
                        className="ghost-button"
                        title={copy.previousQualityIssue}
                        aria-label={copy.previousQualityIssue}
                        disabled={isSavingEdit || qualityEditSession.activeIndex === 0}
                        onClick={() => moveQualityIssue("previous")}
                      >
                        <ArrowLeft aria-hidden="true" size={17} />
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        title={copy.nextQualityIssue}
                        aria-label={copy.nextQualityIssue}
                        disabled={
                          isSavingEdit ||
                          qualityEditSession.activeIndex === qualityEditSession.issues.length - 1
                        }
                        onClick={() => moveQualityIssue("next")}
                      >
                        <ArrowRight aria-hidden="true" size={17} />
                      </button>
                    </div>
                  </section>
                ) : null}
                <section>
                  <h3>{copy.source}</h3>
                  <label>
                    {copy.title}
                    <input
                      required
                      value={editDraft.title}
                      onChange={(event) => setEditDraft({ ...editDraft, title: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.sourceUrl}
                    <input
                      required
                      value={editDraft.source_url}
                      onChange={(event) => setEditDraft({ ...editDraft, source_url: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.canonicalUrl}
                    <input
                      value={editDraft.canonical_url}
                      onChange={(event) => setEditDraft({ ...editDraft, canonical_url: event.target.value })}
                    />
                  </label>
                  <label className={qualityTargetClass("site_name")}>
                    {copy.site}
                    <input
                      id={QUALITY_FIELD_TARGET_IDS.site_name}
                      value={editDraft.site_name}
                      onChange={(event) => setEditDraft({ ...editDraft, site_name: event.target.value })}
                    />
                  </label>
                  <label className={qualityTargetClass("author")}>
                    {copy.author}
                    <input
                      id={QUALITY_FIELD_TARGET_IDS.author}
                      value={editDraft.author}
                      onChange={(event) => setEditDraft({ ...editDraft, author: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.previewUrl}
                    <input
                      value={editDraft.preview_url}
                      onChange={(event) => setEditDraft({ ...editDraft, preview_url: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.sourceCategory}
                    <input
                      value={editDraft.source_category}
                      onChange={(event) => setEditDraft({ ...editDraft, source_category: event.target.value })}
                    />
                  </label>
                </section>

                <section>
                  <h3>{copy.classificationAndSafety}</h3>
                  <label>
                    {copy.mediaType}
                    <select
                      value={editDraft.media_type}
                      onChange={(event) => setEditDraft({ ...editDraft, media_type: event.target.value as MediaType })}
                    >
                      {MEDIA_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {labelForMediaType(type, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.assetCategory}
                    <select
                      value={editDraft.asset_category}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, asset_category: event.target.value as AssetCategory })
                      }
                    >
                      {ASSET_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {labelForAssetCategory(category, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={qualityTargetClass("license_status")}>
                    {copy.licenseStatus}
                    <select
                      id={QUALITY_FIELD_TARGET_IDS.license_status}
                      value={editDraft.license_status}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, license_status: event.target.value as LicenseStatus })
                      }
                    >
                      {LICENSE_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {labelForLicenseStatus(status, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.publicStatus}
                    <select
                      value={editDraft.public_status}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, public_status: event.target.value as PublicStatus })
                      }
                    >
                      {PUBLIC_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {labelForPublicStatus(status, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    {copy.qualityStatus}
                    <select
                      value={editDraft.quality_status}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, quality_status: event.target.value as QualityStatus })
                      }
                    >
                      {QUALITY_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {labelForQualityStatus(status, language)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={qualityTargetClass("attribution_text")}>
                    {copy.attributionText}
                    <textarea
                      id={QUALITY_FIELD_TARGET_IDS.attribution_text}
                      value={editDraft.attribution_text}
                      onChange={(event) => setEditDraft({ ...editDraft, attribution_text: event.target.value })}
                    />
                  </label>
                  <label className={qualityTargetClass("avoid_copying_notes")}>
                    {copy.avoidCopying}
                    <textarea
                      id={QUALITY_FIELD_TARGET_IDS.avoid_copying_notes}
                      value={editDraft.avoid_copying_notes}
                      onChange={(event) => setEditDraft({ ...editDraft, avoid_copying_notes: event.target.value })}
                    />
                  </label>
                </section>

                <section>
                  <h3>{copy.inspiration}</h3>
                  <label>
                    {copy.styleTags}
                    <input
                      value={editDraft.style_tags_text}
                      onChange={(event) => setEditDraft({ ...editDraft, style_tags_text: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.useTags}
                    <input
                      value={editDraft.use_tags_text}
                      onChange={(event) => setEditDraft({ ...editDraft, use_tags_text: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.mechanicTags}
                    <input
                      value={editDraft.mechanic_tags_text}
                      onChange={(event) => setEditDraft({ ...editDraft, mechanic_tags_text: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.moodTags}
                    <input
                      value={editDraft.mood_tags_text}
                      onChange={(event) => setEditDraft({ ...editDraft, mood_tags_text: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.visualLanguageTags}
                    <input
                      value={editDraft.visual_language_tags_text}
                      onChange={(event) => setEditDraft({ ...editDraft, visual_language_tags_text: event.target.value })}
                    />
                  </label>
                  <label className={qualityTargetClass("inspiration_points")}>
                    {copy.inspirationPoints}
                    <textarea
                      id={QUALITY_FIELD_TARGET_IDS.inspiration_points}
                      value={editDraft.inspiration_points_text}
                      onChange={(event) => setEditDraft({ ...editDraft, inspiration_points_text: event.target.value })}
                    />
                  </label>
                  <label className={qualityTargetClass("rating")}>
                    {copy.rating}
                    <input
                      id={QUALITY_FIELD_TARGET_IDS.rating}
                      type="number"
                      min="1"
                      max="5"
                      value={editDraft.rating}
                      onChange={(event) => setEditDraft({ ...editDraft, rating: event.target.value })}
                    />
                  </label>
                  <div className="score-grid">
                    <label className={qualityTargetClass("reference_value_score")}>
                      {copy.referenceValueScore}
                      <input
                        id={QUALITY_FIELD_TARGET_IDS.reference_value_score}
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.reference_value_score}
                        onChange={(event) => setEditDraft({ ...editDraft, reference_value_score: event.target.value })}
                      />
                    </label>
                    <label className={qualityTargetClass("transformability_score")}>
                      {copy.transformabilityScore}
                      <input
                        id={QUALITY_FIELD_TARGET_IDS.transformability_score}
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.transformability_score}
                        onChange={(event) => setEditDraft({ ...editDraft, transformability_score: event.target.value })}
                      />
                    </label>
                    <label className={qualityTargetClass("copyright_risk_score")}>
                      {copy.copyrightRiskScore}
                      <input
                        id={QUALITY_FIELD_TARGET_IDS.copyright_risk_score}
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.copyright_risk_score}
                        onChange={(event) => setEditDraft({ ...editDraft, copyright_risk_score: event.target.value })}
                      />
                    </label>
                    <label className={qualityTargetClass("production_readiness_score")}>
                      {copy.productionReadinessScore}
                      <input
                        id={QUALITY_FIELD_TARGET_IDS.production_readiness_score}
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.production_readiness_score}
                        onChange={(event) => setEditDraft({ ...editDraft, production_readiness_score: event.target.value })}
                      />
                    </label>
                  </div>
                  <div
                    className={[
                      "inspiration-entry-editor",
                      qualityTargetClass("inspiration_entries"),
                    ].filter(Boolean).join(" ")}
                  >
                    <div className="section-heading-row">
                      <h3>{copy.structuredInspiration}</h3>
                      <span className="entry-count">
                        {copy.inspirationEntryCount}: {editDraft.inspiration_entries.length}
                      </span>
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={() =>
                          setEditDraft({
                            ...editDraft,
                            inspiration_entries: [...editDraft.inspiration_entries, createBlankInspirationEntry()],
                          })
                        }
                      >
                        {copy.addInspirationEntry}
                      </button>
                    </div>
                    {(editDraft.inspiration_entries.length > 0 ? editDraft.inspiration_entries : [createBlankInspirationEntry()]).map((entry, index) => (
                      <div className="inspiration-entry-fields" key={entry.id || `edit-entry-${index}`}>
                        <label>
                          {copy.inspirationObservation}
                          <textarea
                            id={index === 0 ? QUALITY_FIELD_TARGET_IDS.inspiration_entries : undefined}
                            value={entry.observation}
                            onChange={(event) => updateEditInspirationEntry(index, "observation", event.target.value)}
                          />
                        </label>
                        <label>
                          {copy.inspirationPrinciple}
                          <textarea
                            value={entry.principle}
                            onChange={(event) => updateEditInspirationEntry(index, "principle", event.target.value)}
                          />
                        </label>
                        <label>
                          {copy.inspirationTransferableIdea}
                          <textarea
                            value={entry.transferable_idea}
                            onChange={(event) => updateEditInspirationEntry(index, "transferable_idea", event.target.value)}
                          />
                        </label>
                        <label>
                          {copy.inspirationOriginalApplication}
                          <textarea
                            value={entry.original_application}
                            onChange={(event) => updateEditInspirationEntry(index, "original_application", event.target.value)}
                          />
                        </label>
                        <label>
                          {copy.inspirationAvoidCopying}
                          <textarea
                            value={entry.avoid_copying}
                            onChange={(event) => updateEditInspirationEntry(index, "avoid_copying", event.target.value)}
                          />
                        </label>
                        {editDraft.inspiration_entries.length > 0 ? (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() =>
                              setEditDraft({
                                ...editDraft,
                                inspiration_entries: editDraft.inspiration_entries.filter((_, entryIndex) => entryIndex !== index),
                              })
                            }
                          >
                            {copy.removeInspirationEntry}
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                  <label className={qualityTargetClass("deconstruction_notes")}>
                    {copy.deconstructionNotes}
                    <textarea
                      id={QUALITY_FIELD_TARGET_IDS.deconstruction_notes}
                      value={editDraft.deconstruction_notes}
                      onChange={(event) => setEditDraft({ ...editDraft, deconstruction_notes: event.target.value })}
                    />
                  </label>
                  <label className={qualityTargetClass("transformation_ideas")}>
                    {copy.transformationIdeas}
                    <textarea
                      id={QUALITY_FIELD_TARGET_IDS.transformation_ideas}
                      value={editDraft.transformation_ideas}
                      onChange={(event) => setEditDraft({ ...editDraft, transformation_ideas: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.relatedOriginalAsset}
                    <input
                      value={editDraft.related_original_asset}
                      onChange={(event) => setEditDraft({ ...editDraft, related_original_asset: event.target.value })}
                    />
                  </label>
                </section>

                <div className="form-actions sticky-actions">
                  <button type="submit" disabled={isSavingEdit}>
                    {isSavingEdit ? copy.saving : copy.saveChanges}
                  </button>
                  <button className="ghost-button" type="button" onClick={cancelEditing} disabled={isSavingEdit}>
                    {copy.cancel}
                  </button>
                </div>
              </form>
            ) : (
              <ReferenceDetail
                copy={copy}
                deleteCopy={deleteConfirmationCopy(selectedReference.title, language)}
                isDeleting={isDeleting}
                language={language}
                onCancelDelete={cancelDelete}
                onConfirmDelete={() => confirmDelete(selectedReference)}
                onRequestDelete={() => requestDelete(selectedReference)}
                onStartQualityEditing={(issue) => startQualityEditing(selectedReference, issue)}
                pendingDelete={pendingDeleteId === selectedReference.id}
                reference={selectedReference}
              />
            )}
          </>
        ) : (
          <div className="empty-detail">
            <h2>{copy.noReferenceSelected}</h2>
            <p>{copy.noReferenceHint}</p>
          </div>
        )}
      </aside>
        </>
      ) : (
        <SynthesisWorkspace
          language={language}
          initialReferenceIds={pendingSynthesisReferenceIds}
          initialDraft={pendingSynthesisDraft}
          externalBackRequestToken={externalBackRequestToken}
          onInitialReferenceIdsConsumed={() => setPendingSynthesisReferenceIds([])}
          onInitialDraftConsumed={() => setPendingSynthesisDraft(null)}
          onReselectReferences={reselectSynthesisReferences}
          onBackToReferences={() => setWorkspaceView("references")}
          onOpenDataManagement={openDataManagement}
          onWorkspaceStatusChange={setSynthesisWorkspaceStatus}
          restoreEpoch={restoreEpoch}
        />
      )}
      <DataManagementDialog
        open={isDataManagementOpen}
        language={language}
        devicePreferences={{
          pinned_reference_ids: pinnedReferenceIds,
          workspace_layout: workspacePreferences,
        }}
        hasUnsavedDraft={hasUnsavedDraft}
        businessMutationBusy={businessMutationBusy}
        onClose={() => setIsDataManagementOpen(false)}
        onRestoreCommitted={handleRestoreCommitted}
      />
    </main>
  );
}


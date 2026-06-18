"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [references, setReferences] = useState<ReferenceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetCategory | "all">("all");
  const [publicStatus, setPublicStatus] = useState<PublicStatus | "all">("all");
  const [qualityStatus, setQualityStatus] = useState<QualityStatus | "all">("all");
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | "all">("all");
  const [draft, setDraft] = useState<ReferenceDraft>(createEmptyReferenceDraft);
  const [editDraft, setEditDraft] = useState<ReferenceDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<MetadataPreviewStatus>("idle");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUsingSeedReferences, setIsUsingSeedReferences] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const copy = uiCopy(language);

  function closeEditIfHiddenByView(nextView: {
    query?: string;
    assetCategory?: AssetCategory | "all";
    publicStatus?: PublicStatus | "all";
    qualityStatus?: QualityStatus | "all";
    licenseStatus?: LicenseStatus | "all";
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
    const normalizedQuery = nextQuery.trim().toLowerCase();
    const searchable = buildReferenceSearchText(editingReference);

    const remainsVisible =
      (!normalizedQuery || searchable.includes(normalizedQuery)) &&
      (nextAssetCategory === "all" || editingReference.asset_category === nextAssetCategory) &&
      (nextPublicStatus === "all" || editingReference.public_status === nextPublicStatus) &&
      (nextQualityStatus === "all" || editingReference.quality_status === nextQualityStatus) &&
      (nextLicenseStatus === "all" || editingReference.license_status === nextLicenseStatus);

    if (!remainsVisible) {
      setEditingId(null);
      setEditDraft(null);
      setMessage(copy.selectionHidden);
    }
  }

  useEffect(() => {
    async function loadReferences() {
      try {
        const response = await fetch("/api/references");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load references");
        }

        const rows = payload.references as ReferenceRecord[];
        setIsUsingSeedReferences(rows.length === 0);
        setReferences(rows.length > 0 ? rows : seedReferences);
        setSelectedId(rows[0]?.id ?? seedReferences[0]?.id ?? null);
      } catch (error) {
        setIsUsingSeedReferences(true);
        setReferences(seedReferences);
        setSelectedId(seedReferences[0]?.id ?? null);
        setMessage(error instanceof Error ? error.message : null);
      }
    }

    loadReferences();
  }, []);

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

  const selectedReference = getVisibleDetailReference(
    filteredReferences,
    references,
    selectedId,
  );
  const isEditingSelected = Boolean(
    selectedReference && editingId === selectedReference.id && editDraft,
  );

  function startEditing(reference: ReferenceRecord) {
    setEditingId(reference.id);
    setEditDraft(recordToReferenceDraft(reference));
    setMessage(copy.editingSelected);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(null);
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
      setMessage(copy.selectionChanged);
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
      setIsUsingSeedReferences(false);
      setSelectedId(reference.id);
      setEditingId(null);
      setEditDraft(null);
      setDraft(createEmptyReferenceDraft());
      setIsFormOpen(false);
      setMessage(copy.savedPrivate);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.saveFailed);
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

      setReferences((current) => current.filter((item) => item.id !== reference.id));
      setSelectedId(null);
      setPendingDeleteId(null);
      setMessage(copy.deleted);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <main className="workspace">
      <aside className="sidebar" aria-label={copy.filtersLabel}>
        <div className="brand-block">
          <p className="eyebrow">RefForge</p>
          <h1>灵感锻造台</h1>
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
        </div>

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
            setQuery("");
          }}
        >
          {copy.clearFilters}
        </button>
      </aside>

      <section className="gallery-pane">
        <header className="toolbar">
          <label className="search-label">
            {copy.search}
            <input
              value={query}
              onChange={(event) => {
                closeEditIfHiddenByView({ query: event.target.value });
                setQuery(event.target.value);
              }}
              placeholder={copy.searchPlaceholder}
            />
          </label>
          <button type="button" onClick={() => setIsFormOpen((value) => !value)}>
            {copy.addReference}
          </button>
        </header>

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
              <button type="submit">{copy.savePrivateReference}</button>
            </div>
            {metadataPreviewMessage(previewStatus) ? (
              <p className={`form-status form-status--${previewStatus}`}>
                {metadataPreviewMessage(previewStatus, language)}
              </p>
            ) : null}
          </form>
        ) : null}

        <div className="result-summary">
          <span>{filteredReferences.length} {copy.references}</span>
          <span>{copy.safetySummary}</span>
        </div>

        {isUsingSeedReferences ? (
          <p className="seed-fallback-message">{seedFallbackMessage(language)}</p>
        ) : null}

        {filteredReferences.length === 0 ? (
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
          {filteredReferences.map((reference) => (
            <button
              type="button"
              className={`reference-card ${reference.id === selectedReference?.id ? "selected" : ""}`}
              key={reference.id}
              onClick={() => selectReference(reference.id)}
              disabled={isSavingEdit}
              aria-pressed={reference.id === selectedReference?.id}
            >
              <div className={`thumbnail accent-${reference.asset_category}`}>
                {reference.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reference.preview_url} alt={reference.title} />
                ) : (
                  <span>{labelForAssetCategory(reference.asset_category, language)}</span>
                )}
              </div>
              <div className="card-body">
                <h2>{reference.title}</h2>
                <p>{reference.site_name ?? copy.unknownSource}</p>
                <div className="badge-row">
                  <span>{labelForAssetCategory(reference.asset_category, language)}</span>
                  <span>{labelForLicenseStatus(reference.license_status, language)}</span>
                  <span>{labelForPublicStatus(reference.public_status, language)}</span>
                  <span>{labelForQualityStatus(reference.quality_status, language)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="detail-panel" aria-label={copy.selectedReference}>
        {selectedReference ? (
          <>
            <div className="detail-heading">
              <p className="eyebrow">{copy.selectedReference}</p>
              <h2>{selectedReference.title}</h2>
              {!isEditingSelected ? (
                <div className="detail-actions">
                  <a href={selectedReference.source_url} target="_blank" rel="noreferrer">
                    {copy.openSource}
                  </a>
                  <button className="ghost-button" type="button" onClick={() => startEditing(selectedReference)}>
                    {copy.edit}
                  </button>
                </div>
              ) : null}
            </div>

            {isEditingSelected && editDraft ? (
              <form className="detail-edit-form" onSubmit={saveReferenceEdit}>
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
                  <label>
                    {copy.site}
                    <input
                      value={editDraft.site_name}
                      onChange={(event) => setEditDraft({ ...editDraft, site_name: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.author}
                    <input
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
                  <label>
                    {copy.licenseStatus}
                    <select
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
                  <label>
                    {copy.attributionText}
                    <textarea
                      value={editDraft.attribution_text}
                      onChange={(event) => setEditDraft({ ...editDraft, attribution_text: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.avoidCopying}
                    <textarea
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
                  <label>
                    {copy.inspirationPoints}
                    <textarea
                      value={editDraft.inspiration_points_text}
                      onChange={(event) => setEditDraft({ ...editDraft, inspiration_points_text: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.rating}
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={editDraft.rating}
                      onChange={(event) => setEditDraft({ ...editDraft, rating: event.target.value })}
                    />
                  </label>
                  <div className="score-grid">
                    <label>
                      {copy.referenceValueScore}
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.reference_value_score}
                        onChange={(event) => setEditDraft({ ...editDraft, reference_value_score: event.target.value })}
                      />
                    </label>
                    <label>
                      {copy.transformabilityScore}
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.transformability_score}
                        onChange={(event) => setEditDraft({ ...editDraft, transformability_score: event.target.value })}
                      />
                    </label>
                    <label>
                      {copy.copyrightRiskScore}
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.copyright_risk_score}
                        onChange={(event) => setEditDraft({ ...editDraft, copyright_risk_score: event.target.value })}
                      />
                    </label>
                    <label>
                      {copy.productionReadinessScore}
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editDraft.production_readiness_score}
                        onChange={(event) => setEditDraft({ ...editDraft, production_readiness_score: event.target.value })}
                      />
                    </label>
                  </div>
                  <div className="inspiration-entry-editor">
                    <div className="section-heading-row">
                      <h3>{copy.structuredInspiration}</h3>
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
                  <label>
                    {copy.deconstructionNotes}
                    <textarea
                      value={editDraft.deconstruction_notes}
                      onChange={(event) => setEditDraft({ ...editDraft, deconstruction_notes: event.target.value })}
                    />
                  </label>
                  <label>
                    {copy.transformationIdeas}
                    <textarea
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
              <>
                <section>
                  <h3>{copy.source}</h3>
                  <dl>
                    <div><dt>{copy.site}</dt><dd>{selectedReference.site_name ?? copy.unknown}</dd></div>
                    <div><dt>{copy.author}</dt><dd>{selectedReference.author ?? copy.unknown}</dd></div>
                    <div><dt>{copy.media}</dt><dd>{labelForMediaType(selectedReference.media_type, language)}</dd></div>
                  </dl>
                </section>

                <section>
                  <h3>{copy.classificationAndSafety}</h3>
                  <dl>
                    <div><dt>{copy.license}</dt><dd>{labelForLicenseStatus(selectedReference.license_status, language)}</dd></div>
                    <div><dt>{copy.public}</dt><dd>{labelForPublicStatus(selectedReference.public_status, language)}</dd></div>
                    <div><dt>{copy.qualityStatus}</dt><dd>{labelForQualityStatus(selectedReference.quality_status, language)}</dd></div>
                  </dl>
                  <p>{selectedReference.avoid_copying_notes ?? copy.defaultAvoidCopying}</p>
                </section>

                <section>
                  <h3>{copy.inspiration}</h3>
                  <div className="score-summary">
                    <span>{copy.rating}: {selectedReference.rating ?? "-"}</span>
                    <span>{copy.referenceValueScore}: {selectedReference.reference_value_score ?? "-"}</span>
                    <span>{copy.transformabilityScore}: {selectedReference.transformability_score ?? "-"}</span>
                    <span>{copy.copyrightRiskScore}: {selectedReference.copyright_risk_score ?? "-"}</span>
                    <span>{copy.productionReadinessScore}: {selectedReference.production_readiness_score ?? "-"}</span>
                  </div>
                  <div className="tag-groups">
                    <p><strong>{copy.styleTags}</strong> {selectedReference.style_tags.join(", ") || "-"}</p>
                    <p><strong>{copy.useTags}</strong> {selectedReference.use_tags.join(", ") || "-"}</p>
                    <p><strong>{copy.mechanicTags}</strong> {selectedReference.mechanic_tags.join(", ") || "-"}</p>
                    <p><strong>{copy.moodTags}</strong> {selectedReference.mood_tags.join(", ") || "-"}</p>
                    <p><strong>{copy.visualLanguageTags}</strong> {selectedReference.visual_language_tags.join(", ") || "-"}</p>
                  </div>
                  <ul>
                    {selectedReference.inspiration_points.length > 0 ? (
                      selectedReference.inspiration_points.map((point) => <li key={point}>{point}</li>)
                    ) : (
                      <li>{copy.defaultInspiration}</li>
                    )}
                  </ul>
                  <div className="structured-inspiration-list">
                    <h3>{copy.structuredInspiration}</h3>
                    {selectedReference.inspiration_entries.length > 0 ? (
                      selectedReference.inspiration_entries.map((entry) => (
                        <div className="structured-inspiration-item" key={entry.id}>
                          <p><strong>{copy.inspirationObservation}</strong> {entry.observation}</p>
                          <p><strong>{copy.inspirationPrinciple}</strong> {entry.principle}</p>
                          <p><strong>{copy.inspirationTransferableIdea}</strong> {entry.transferable_idea}</p>
                          <p><strong>{copy.inspirationOriginalApplication}</strong> {entry.original_application}</p>
                          <p><strong>{copy.inspirationAvoidCopying}</strong> {entry.avoid_copying}</p>
                        </div>
                      ))
                    ) : (
                      <p>{copy.emptyInspirationEntries}</p>
                    )}
                  </div>
                  <p>{selectedReference.deconstruction_notes}</p>
                  <p>{selectedReference.transformation_ideas}</p>
                </section>

                <button className="danger-button" type="button" onClick={() => requestDelete(selectedReference)}>
                  {copy.deleteReference}
                </button>
                {pendingDeleteId === selectedReference.id ? (
                  <div className="delete-confirmation" role="alertdialog" aria-labelledby="delete-confirmation-title">
                    <h3 id="delete-confirmation-title">{deleteConfirmationCopy(selectedReference.title, language).title}</h3>
                    <p>{deleteConfirmationCopy(selectedReference.title, language).body}</p>
                    <div className="confirmation-actions">
                      <button type="button" className="ghost-button" onClick={cancelDelete} disabled={isDeleting}>
                        {deleteConfirmationCopy(selectedReference.title, language).cancel}
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => confirmDelete(selectedReference)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? copy.deleting : deleteConfirmationCopy(selectedReference.title, language).confirm}
                      </button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <div className="empty-detail">
            <h2>{copy.noReferenceSelected}</h2>
            <p>{copy.noReferenceHint}</p>
          </div>
        )}
      </aside>
    </main>
  );
}


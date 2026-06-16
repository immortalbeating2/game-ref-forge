"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ASSET_CATEGORIES,
  AssetCategory,
  DEFAULT_REFERENCE_INPUT,
  LICENSE_STATUSES,
  LicenseStatus,
  MEDIA_TYPES,
  MediaType,
  PUBLIC_STATUSES,
  PublicStatus,
  ReferenceInput,
  ReferenceRecord,
} from "../lib/reference";
import { getVisibleDetailReference } from "../lib/ui-state";

const categoryLabels: Record<AssetCategory, string> = {
  character: "Character",
  environment: "Environment",
  prop: "Prop",
  ui_hud: "UI/HUD",
  vfx: "VFX",
  material_texture: "Material",
  animation: "Animation",
  audio: "Audio",
};

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
    license_status: "cc0_or_public_domain",
    attribution_text: "Kenney assets are commonly published with clear license notes on source pages.",
    public_status: "review",
    rating: 4,
    inspiration_points: ["Button state clarity", "Consistent panel rhythm"],
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
    license_status: "cc0_or_public_domain",
    attribution_text: "Review individual source page before public use.",
    public_status: "review",
    rating: 5,
    inspiration_points: ["Surface wear logic", "Tileable density"],
    deconstruction_notes: "Material references are useful for studying roughness, dirt accumulation, and pattern scale.",
    transformation_ideas: "Translate wear concentration into a stylized dungeon floor material.",
    avoid_copying_notes: "Do not assume every linked preview can be rehosted without checking the specific source license.",
    related_original_asset: "Dungeon floor material",
    created_at: "2026-06-07T00:00:00.000Z",
    updated_at: "2026-06-07T00:00:00.000Z",
  },
];

type Draft = ReferenceInput & {
  style_tags_text: string;
  use_tags_text: string;
  inspiration_points_text: string;
};

const emptyDraft: Draft = {
  ...DEFAULT_REFERENCE_INPUT,
  style_tags_text: "",
  use_tags_text: "",
  inspiration_points_text: "",
};

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default function Home() {
  const [references, setReferences] = useState<ReferenceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetCategory | "all">("all");
  const [publicStatus, setPublicStatus] = useState<PublicStatus | "all">("all");
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | "all">("all");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadReferences() {
      try {
        const response = await fetch("/api/references");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load references");
        }

        const rows = payload.references as ReferenceRecord[];
        setReferences(rows.length > 0 ? rows : seedReferences);
        setSelectedId(rows[0]?.id ?? seedReferences[0]?.id ?? null);
      } catch (error) {
        setReferences(seedReferences);
        setSelectedId(seedReferences[0]?.id ?? null);
        setMessage(error instanceof Error ? error.message : "Using starter examples until D1 is ready.");
      }
    }

    loadReferences();
  }, []);

  const filteredReferences = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return references.filter((reference) => {
      const searchable = [
        reference.title,
        reference.site_name,
        reference.author,
        reference.asset_category,
        reference.media_type,
        ...reference.style_tags,
        ...reference.use_tags,
        ...reference.inspiration_points,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!normalizedQuery || searchable.includes(normalizedQuery)) &&
        (assetCategory === "all" || reference.asset_category === assetCategory) &&
        (publicStatus === "all" || reference.public_status === publicStatus) &&
        (licenseStatus === "all" || reference.license_status === licenseStatus)
      );
    });
  }, [assetCategory, licenseStatus, publicStatus, query, references]);

  const selectedReference = getVisibleDetailReference(
    filteredReferences,
    references,
    selectedId,
  );

  async function previewMetadata() {
    if (!draft.source_url.trim()) {
      setMessage("Paste a source URL before previewing metadata.");
      return;
    }

    setIsPreviewing(true);
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
      setMessage("Metadata preview applied. Review source and safety fields before saving.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Preview failed; manual entry is still available.");
    } finally {
      setIsPreviewing(false);
    }
  }

  async function saveReference(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const input: ReferenceInput = {
      ...draft,
      style_tags: splitTags(draft.style_tags_text),
      use_tags: splitTags(draft.use_tags_text),
      inspiration_points: splitTags(draft.inspiration_points_text),
      rating: draft.rating ? Number(draft.rating) : null,
    };

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
      setSelectedId(reference.id);
      setDraft(emptyDraft);
      setIsFormOpen(false);
      setMessage("Reference saved privately by default.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed. Form contents were preserved.");
    }
  }

  async function removeReference(reference: ReferenceRecord) {
    if (!confirm(`Delete "${reference.title}"?`)) {
      return;
    }

    try {
      if (!reference.id.startsWith("seed-")) {
        await fetch(`/api/references/${reference.id}`, { method: "DELETE" });
      }

      setReferences((current) => current.filter((item) => item.id !== reference.id));
      setSelectedId(null);
      setMessage("Reference deleted.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed.");
    }
  }

  return (
    <main className="workspace">
      <aside className="sidebar" aria-label="Reference filters">
        <div className="brand-block">
          <p className="eyebrow">RefForge</p>
          <h1>灵感锻造台</h1>
          <p>Private research desk for turning game asset references into original creative principles.</p>
        </div>

        <label>
          Asset category
          <select value={assetCategory} onChange={(event) => setAssetCategory(event.target.value as AssetCategory | "all")}>
            <option value="all">All categories</option>
            {ASSET_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </label>

        <label>
          Public status
          <select value={publicStatus} onChange={(event) => setPublicStatus(event.target.value as PublicStatus | "all")}>
            <option value="all">All statuses</option>
            {PUBLIC_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          License status
          <select value={licenseStatus} onChange={(event) => setLicenseStatus(event.target.value as LicenseStatus | "all")}>
            <option value="all">All licenses</option>
            {LICENSE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
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
            setLicenseStatus("all");
            setQuery("");
          }}
        >
          Clear filters
        </button>
      </aside>

      <section className="gallery-pane">
        <header className="toolbar">
          <label className="search-label">
            Search
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, source, tag, note..."
            />
          </label>
          <button type="button" onClick={() => setIsFormOpen((value) => !value)}>
            + Add reference
          </button>
        </header>

        {message ? <p className="status-message">{message}</p> : null}

        {isFormOpen ? (
          <form className="reference-form" onSubmit={saveReference}>
            <div className="form-grid">
              <label>
                Source URL
                <input
                  required
                  value={draft.source_url}
                  onChange={(event) => setDraft({ ...draft, source_url: event.target.value })}
                  placeholder="https://..."
                />
              </label>
              <label>
                Title
                <input
                  required
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </label>
              <label>
                Site
                <input
                  value={draft.site_name ?? ""}
                  onChange={(event) => setDraft({ ...draft, site_name: event.target.value })}
                />
              </label>
              <label>
                Author
                <input
                  value={draft.author ?? ""}
                  onChange={(event) => setDraft({ ...draft, author: event.target.value })}
                />
              </label>
              <label>
                Media type
                <select
                  value={draft.media_type}
                  onChange={(event) => setDraft({ ...draft, media_type: event.target.value as MediaType })}
                >
                  {MEDIA_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {statusLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Asset category
                <select
                  value={draft.asset_category}
                  onChange={(event) => setDraft({ ...draft, asset_category: event.target.value as AssetCategory })}
                >
                  {ASSET_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                License status
                <select
                  value={draft.license_status}
                  onChange={(event) => setDraft({ ...draft, license_status: event.target.value as LicenseStatus })}
                >
                  {LICENSE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Public status
                <select
                  value={draft.public_status}
                  onChange={(event) => setDraft({ ...draft, public_status: event.target.value as PublicStatus })}
                >
                  {PUBLIC_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Style tags
                <input
                  value={draft.style_tags_text}
                  onChange={(event) => setDraft({ ...draft, style_tags_text: event.target.value })}
                  placeholder="pixel, cozy, sci-fi"
                />
              </label>
              <label>
                Use tags
                <input
                  value={draft.use_tags_text}
                  onChange={(event) => setDraft({ ...draft, use_tags_text: event.target.value })}
                  placeholder="combat feedback, inventory"
                />
              </label>
            </div>
            <label>
              Inspiration points
              <textarea
                value={draft.inspiration_points_text}
                onChange={(event) => setDraft({ ...draft, inspiration_points_text: event.target.value })}
                placeholder="Comma-separated useful ideas"
              />
            </label>
            <label>
              Deconstruction notes
              <textarea
                value={draft.deconstruction_notes ?? ""}
                onChange={(event) => setDraft({ ...draft, deconstruction_notes: event.target.value })}
              />
            </label>
            <label>
              Transformation ideas
              <textarea
                value={draft.transformation_ideas ?? ""}
                onChange={(event) => setDraft({ ...draft, transformation_ideas: event.target.value })}
              />
            </label>
            <label>
              Avoid copying
              <textarea
                value={draft.avoid_copying_notes ?? ""}
                onChange={(event) => setDraft({ ...draft, avoid_copying_notes: event.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="button" className="ghost-button" onClick={previewMetadata} disabled={isPreviewing}>
                {isPreviewing ? "Previewing..." : "Preview metadata"}
              </button>
              <button type="submit">Save private reference</button>
            </div>
          </form>
        ) : null}

        <div className="result-summary">
          <span>{filteredReferences.length} references</span>
          <span>Safety status stays visible before opening details</span>
        </div>

        {filteredReferences.length === 0 ? (
          <div className="empty-results">
            <h2>No references match these filters</h2>
            <p>Clear filters or add a new private reference to continue validation.</p>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setAssetCategory("all");
                setPublicStatus("all");
                setLicenseStatus("all");
                setQuery("");
              }}
            >
              Clear filters
            </button>
          </div>
        ) : null}

        <div className="reference-grid" aria-live="polite">
          {filteredReferences.map((reference) => (
            <button
              type="button"
              className={`reference-card ${reference.id === selectedReference?.id ? "selected" : ""}`}
              key={reference.id}
              onClick={() => setSelectedId(reference.id)}
            >
              <div className={`thumbnail accent-${reference.asset_category}`}>
                {reference.preview_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={reference.preview_url} alt={reference.title} />
                ) : (
                  <span>{categoryLabels[reference.asset_category]}</span>
                )}
              </div>
              <div className="card-body">
                <h2>{reference.title}</h2>
                <p>{reference.site_name ?? "Unknown source"}</p>
                <div className="badge-row">
                  <span>{categoryLabels[reference.asset_category]}</span>
                  <span>{statusLabel(reference.license_status)}</span>
                  <span>{statusLabel(reference.public_status)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="detail-panel" aria-label="Selected reference detail">
        {selectedReference ? (
          <>
            <div className="detail-heading">
              <p className="eyebrow">Selected reference</p>
              <h2>{selectedReference.title}</h2>
              <a href={selectedReference.source_url} target="_blank" rel="noreferrer">
                Open source
              </a>
            </div>

            <section>
              <h3>Source</h3>
              <dl>
                <div><dt>Site</dt><dd>{selectedReference.site_name ?? "Unknown"}</dd></div>
                <div><dt>Author</dt><dd>{selectedReference.author ?? "Unknown"}</dd></div>
                <div><dt>Media</dt><dd>{statusLabel(selectedReference.media_type)}</dd></div>
              </dl>
            </section>

            <section>
              <h3>Safety</h3>
              <dl>
                <div><dt>License</dt><dd>{statusLabel(selectedReference.license_status)}</dd></div>
                <div><dt>Public</dt><dd>{statusLabel(selectedReference.public_status)}</dd></div>
              </dl>
              <p>{selectedReference.avoid_copying_notes ?? "Record what exact expression should not be copied."}</p>
            </section>

            <section>
              <h3>Inspiration</h3>
              <ul>
                {selectedReference.inspiration_points.length > 0 ? (
                  selectedReference.inspiration_points.map((point) => <li key={point}>{point}</li>)
                ) : (
                  <li>Add concrete principles this reference teaches.</li>
                )}
              </ul>
              <p>{selectedReference.deconstruction_notes}</p>
              <p>{selectedReference.transformation_ideas}</p>
            </section>

            <button className="danger-button" type="button" onClick={() => removeReference(selectedReference)}>
              Delete reference
            </button>
          </>
        ) : (
          <div className="empty-detail">
            <h2>No reference selected</h2>
            <p>Add or select a reference to review source, safety, and inspiration fields.</p>
          </div>
        )}
      </aside>
    </main>
  );
}


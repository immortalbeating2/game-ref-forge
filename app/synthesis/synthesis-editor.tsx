"use client";

import type React from "react";

import type { Language } from "../../lib/localization";
import { labelForSynthesisStatus, uiCopy } from "../../lib/localization";
import type { SynthesisDetail, SynthesisReferenceLink } from "../../lib/synthesis";
import type { SynthesisDraft } from "../../lib/synthesis-draft";
import { SynthesisReferenceCard } from "./synthesis-reference-card";
import {
  isEditorMutationBusy as getIsEditorMutationBusy,
  isRefreshingRelation,
} from "./synthesis-workspace-state";

export type SynthesisEditorProps = {
  language: Language;
  detail: SynthesisDetail | null;
  draft: SynthesisDraft;
  mode: "create" | "edit";
  isSaving: boolean;
  isArchiving: boolean;
  isRefreshing: boolean;
  refreshingRelationId: string | null;
  isDeleting: boolean;
  error: string | null;
  message: string | null;
  needsReferenceReselection: boolean;
  onDraftChange: (draft: SynthesisDraft) => void;
  onSave: () => void;
  onRefresh: (link: SynthesisReferenceLink) => void;
  onExport: () => void;
  onDelete: () => void;
  onReselectReferences: () => void;
};

export function SynthesisEditor(_props: SynthesisEditorProps): React.JSX.Element {
  const {
    language,
    detail,
    draft,
    mode,
    isSaving,
    isArchiving,
    isRefreshing,
    refreshingRelationId,
    isDeleting,
    error,
    message,
    needsReferenceReselection,
    onDraftChange,
    onSave,
    onRefresh,
    onExport,
    onDelete,
    onReselectReferences,
  } = _props;
  const copy = uiCopy(language);
  const isEditorMutationBusy = getIsEditorMutationBusy({ isSaving, isArchiving, isRefreshing });
  const archivingMessage = language === "zh" ? "归档中..." : "Archiving...";
  const mutationMessage = isSaving
    ? copy.savingSynthesis
    : isArchiving
      ? archivingMessage
      : isRefreshing
        ? copy.refreshingSnapshot
        : null;
  const update = <K extends keyof SynthesisDraft>(field: K, value: SynthesisDraft[K]) => {
    onDraftChange({ ...draft, [field]: value });
  };
  const fields: Array<{ field: Exclude<keyof SynthesisDraft, "title" | "target_asset" | "status">; label: string }> = [
    { field: "original_direction", label: copy.originalDirection },
    { field: "shared_principles", label: copy.sharedPrinciples },
    { field: "key_differences", label: copy.keyDifferences },
    { field: "avoid_copying_notes", label: copy.synthesisAvoidCopying },
    { field: "design_constraints", label: copy.designConstraints },
    { field: "experiment_plan", label: copy.experimentPlan },
    { field: "next_actions", label: copy.nextActions },
    { field: "additional_notes", label: copy.additionalNotes },
  ];

  return (
    <section className="synthesis-editor" aria-label={copy.synthesisWorkspace}>
      <header className="synthesis-toolbar">
        <div>
          <p className="panel-kicker">{copy.synthesisWorkspace}</p>
          <h2>{mode === "create" ? copy.createSynthesis : draft.title || copy.synthesisTitle}</h2>
        </div>
        <div className="synthesis-toolbar-actions">
          <label>
            {copy.synthesisStatus}
            <select value={draft.status} onChange={(event) => update("status", event.target.value as SynthesisDraft["status"])} disabled={isEditorMutationBusy}>
              {(["draft", "actionable", "archived"] as const).map((status) => <option key={status} value={status}>{labelForSynthesisStatus(status, language)}</option>)}
            </select>
          </label>
          <details className="synthesis-secondary-actions">
            <summary>{copy.researchControls}</summary>
            <div>
              <button className="ghost-button" type="button" onClick={onExport} disabled={!detail || isEditorMutationBusy}>{copy.exportSynthesisMarkdown}</button>
              {mode === "edit" ? <button className="danger-button" type="button" onClick={onDelete} disabled={isDeleting || isEditorMutationBusy}>{copy.deleteSynthesis}</button> : null}
            </div>
          </details>
        </div>
      </header>

      {detail ? (
        <section className="synthesis-reference-strip" aria-label={copy.referenceDeck}>
          {detail.references.map((link) => <SynthesisReferenceCard key={link.id} language={language} link={link} isRefreshing={isRefreshingRelation(refreshingRelationId, link.id)} isRefreshDisabled={isEditorMutationBusy} onRefresh={onRefresh} />)}
        </section>
      ) : null}

      {message ? <p className="synthesis-message" role="status">{message}</p> : null}
      {error ? <p className="synthesis-error" role="alert">{error}</p> : null}
      {needsReferenceReselection ? (
        <button className="ghost-button" type="button" onClick={onReselectReferences} disabled={isEditorMutationBusy}>
          {copy.reselectSynthesisReferences}
        </button>
      ) : null}
      <form className="synthesis-form" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <section className="synthesis-form-section">
          <h3>{language === "zh" ? "方向" : "Direction"}</h3>
          <label>{copy.synthesisTitle}<input value={draft.title} maxLength={160} onChange={(event) => update("title", event.target.value)} disabled={isEditorMutationBusy} required /></label>
          <label>{copy.targetAsset}<input value={draft.target_asset} maxLength={240} onChange={(event) => update("target_asset", event.target.value)} disabled={isEditorMutationBusy} /></label>
          <label>{fields[0].label}<textarea value={draft.original_direction} maxLength={8000} onChange={(event) => update("original_direction", event.target.value)} disabled={isEditorMutationBusy} /></label>
        </section>
        <section className="synthesis-form-section">
          <h3>{language === "zh" ? "对比" : "Comparison"}</h3>
          {fields.slice(1, 3).map(({ field, label }) => <label key={field}>{label}<textarea value={draft[field]} maxLength={8000} onChange={(event) => update(field, event.target.value)} disabled={isEditorMutationBusy} /></label>)}
        </section>
        <section className="synthesis-form-section">
          <h3>{language === "zh" ? "边界" : "Boundaries"}</h3>
          {fields.slice(3, 5).map(({ field, label }) => <label key={field}>{label}<textarea value={draft[field]} maxLength={8000} onChange={(event) => update(field, event.target.value)} disabled={isEditorMutationBusy} /></label>)}
        </section>
        <section className="synthesis-form-section">
          <h3>{language === "zh" ? "执行" : "Execution"}</h3>
          {fields.slice(5, 7).map(({ field, label }) => <label key={field}>{label}<textarea value={draft[field]} maxLength={8000} onChange={(event) => update(field, event.target.value)} disabled={isEditorMutationBusy} /></label>)}
        </section>
        <section className="synthesis-form-section">
          <h3>{language === "zh" ? "记录" : "Notes"}</h3>
          <label>{fields[7].label}<textarea value={draft.additional_notes} maxLength={8000} onChange={(event) => update("additional_notes", event.target.value)} disabled={isEditorMutationBusy} /></label>
        </section>
        <div className="synthesis-save-bar">
          <span>{mutationMessage}</span>
          <button type="submit" disabled={isEditorMutationBusy}>{mutationMessage ?? copy.saveSynthesis}</button>
        </div>
      </form>
    </section>
  );
}

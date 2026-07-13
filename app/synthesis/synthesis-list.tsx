"use client";

import type React from "react";

import type { Language } from "../../lib/localization";
import { labelForSynthesisStatus, uiCopy } from "../../lib/localization";
import type { SynthesisStatus, SynthesisSummary } from "../../lib/synthesis";

export type SynthesisListProps = {
  language: Language;
  summaries: SynthesisSummary[];
  statusFilter: SynthesisStatus | "all";
  isLoading: boolean;
  isMutating: boolean;
  archivingId: string | null;
  activeId: string | null;
  onStatusFilterChange: (status: SynthesisStatus | "all") => void;
  onOpen: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (summary: SynthesisSummary) => void;
};

export function SynthesisList(_props: SynthesisListProps): React.JSX.Element {
  const {
    language,
    summaries,
    statusFilter,
    isLoading,
    isMutating,
    archivingId,
    activeId,
    onStatusFilterChange,
    onOpen,
    onArchive,
    onDelete,
  } = _props;
  const copy = uiCopy(language);
  const statuses: Array<SynthesisStatus | "all"> = ["all", "draft", "actionable", "archived"];

  return (
    <aside className="synthesis-list" aria-label={copy.syntheses}>
      <label>
        {copy.synthesisStatusFilter}
        <select value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as SynthesisStatus | "all")}>
          {statuses.map((status) => (
            <option value={status} key={status}>
              {status === "all" ? copy.allSynthesisStatuses : labelForSynthesisStatus(status, language)}
            </option>
          ))}
        </select>
      </label>

      {isLoading ? <p className="synthesis-list-message" role="status">{language === "zh" ? "正在加载..." : "Loading..."}</p> : null}
      {!isLoading && summaries.length === 0 ? <p className="synthesis-list-message">{copy.noSyntheses}</p> : null}

      <div className="synthesis-list-rows">
        {summaries.map((summary) => (
          <article className={`synthesis-list-row${summary.id === activeId ? " is-active" : ""}`} key={summary.id}>
            <button className="synthesis-list-open" type="button" onClick={() => onOpen(summary.id)} aria-pressed={summary.id === activeId}>
              <strong>{summary.title}</strong>
              <span>{summary.target_asset || copy.targetAsset}</span>
              <span><b className={`synthesis-status-chip is-${summary.status}`}>{labelForSynthesisStatus(summary.status, language)}</b> · {summary.reference_count}</span>
              <time dateTime={summary.updated_at}>{new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en-US", { dateStyle: "medium" }).format(new Date(summary.updated_at))}</time>
            </button>
            <div className="synthesis-row-actions">
              {summary.status !== "archived" ? (
                <button className="ghost-button" type="button" onClick={() => onArchive(summary.id)} disabled={isMutating}>{archivingId === summary.id ? `${labelForSynthesisStatus("archived", language)}...` : labelForSynthesisStatus("archived", language)}</button>
              ) : null}
              <button className="ghost-button synthesis-delete-trigger" type="button" onClick={() => onDelete(summary)} disabled={isMutating}>{copy.deleteSynthesis}</button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

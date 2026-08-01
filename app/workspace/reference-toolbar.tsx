"use client";

import {
  ArrowUpDown,
  DatabaseBackup,
  GitCompareArrows,
  Grid2X2,
  Grid3X3,
  Plus,
  Search,
} from "lucide-react";
import type { Ref } from "react";
import type { uiCopy } from "../../lib/localization";
import type { ReferenceSortMode } from "../../lib/reference-sort";
import type { WorkspaceDensity } from "../../lib/workspace-view-preferences";

type ToolbarCopy = ReturnType<typeof uiCopy>;

export type ReferenceToolbarProps = {
  addDisabled: boolean;
  comparisonActive: boolean;
  comparisonDisabled: boolean;
  copy: ToolbarCopy;
  dataManagementDisabled: boolean;
  density: WorkspaceDensity;
  onDensityChange: (density: WorkspaceDensity) => void;
  onOpenDataManagement: () => void;
  onQueryChange: (query: string) => void;
  onSortChange: (mode: ReferenceSortMode) => void;
  onStartComparison: () => void;
  onToggleAdd: () => void;
  query: string;
  resultCount: number;
  searchInputRef?: Ref<HTMLInputElement>;
  sortMode: ReferenceSortMode;
  sortOptions: Array<{ value: ReferenceSortMode; label: string }>;
};

export function ReferenceToolbar({
  addDisabled,
  comparisonActive,
  comparisonDisabled,
  copy,
  dataManagementDisabled,
  density,
  onDensityChange,
  onOpenDataManagement,
  onQueryChange,
  onSortChange,
  onStartComparison,
  onToggleAdd,
  query,
  resultCount,
  searchInputRef,
  sortMode,
  sortOptions,
}: ReferenceToolbarProps) {
  return (
    <header
      className="toolbar reference-command-rail"
      aria-label={copy.referenceDeck}
    >
      <div className="deck-heading">
        <p className="panel-kicker">{copy.referenceDeck}</p>
        <h2>
          {resultCount} {copy.references}
        </h2>
      </div>

      <div className="toolbar-actions">
        <label className="search-label">
          <span>
            <Search aria-hidden="true" size={15} />
            {copy.search}
            <kbd title={copy.searchShortcut}>/</kbd>
          </span>
          <input
            ref={searchInputRef}
            type="search"
            aria-label={copy.search}
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
          />
        </label>

        <div className="toolbar-secondary-cluster">
          <label className="sort-label">
            <span>
              <ArrowUpDown aria-hidden="true" size={15} />
              {copy.sortBy}
            </span>
            <select
              value={sortMode}
              onChange={(event) =>
                onSortChange(event.target.value as ReferenceSortMode)
              }
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div
            className="density-control"
            role="radiogroup"
            aria-label={copy.densityControl}
          >
            <span>{copy.density}</span>
            <button
              type="button"
              role="radio"
              aria-checked={density === "compact"}
              title={copy.compactDensity}
              onClick={() => onDensityChange("compact")}
            >
              <Grid3X3 aria-hidden="true" size={16} />
              <span>{copy.compactDensity}</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={density === "comfortable"}
              title={copy.comfortableDensity}
              onClick={() => onDensityChange("comfortable")}
            >
              <Grid2X2 aria-hidden="true" size={16} />
              <span>{copy.comfortableDensity}</span>
            </button>
          </div>
        </div>

        <div className="export-actions">
          <button
            className="ghost-button"
            type="button"
            onClick={onOpenDataManagement}
            disabled={dataManagementDisabled}
          >
            <DatabaseBackup aria-hidden="true" size={16} />
            {copy.dataManagement}
          </button>
          <button
            className="ghost-button"
            type="button"
            onClick={onStartComparison}
            disabled={comparisonDisabled || comparisonActive}
          >
            <GitCompareArrows aria-hidden="true" size={16} />
            {copy.startComparison}
          </button>
          <button
            type="button"
            aria-label={copy.addReference}
            onClick={onToggleAdd}
            disabled={addDisabled}
          >
            <Plus aria-hidden="true" size={17} />
            {copy.addReference.replace(/^\+\s*/, "")}
          </button>
        </div>
      </div>
    </header>
  );
}

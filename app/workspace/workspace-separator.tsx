"use client";

import { PanelLeftOpen, PanelRightOpen } from "lucide-react";
import type { WorkspacePanelSide } from "../../lib/workspace-layout";
import type { WorkspaceSeparatorHandlers } from "./use-workspace-layout";

export type WorkspaceSeparatorProps = {
  collapsed: boolean;
  expandLabel: string;
  handlers: WorkspaceSeparatorHandlers;
  label: string;
  max: number;
  min: number;
  onRestore: () => void;
  side: WorkspacePanelSide;
  value: number;
  resetLabel: string;
};

export function WorkspaceSeparator({
  collapsed,
  expandLabel,
  handlers,
  label,
  max,
  min,
  onRestore,
  side,
  value,
  resetLabel,
}: WorkspaceSeparatorProps) {
  if (collapsed) {
    return <button
      type="button"
      className={`workspace-separator workspace-separator--${side} workspace-separator--collapsed`}
      aria-label={expandLabel}
      title={expandLabel}
      onClick={onRestore}
    >
      {side === "left" ? (
        <PanelLeftOpen aria-hidden="true" size={18} />
      ) : (
        <PanelRightOpen aria-hidden="true" size={18} />
      )}
    </button>;
  }

  return <div
    role="separator"
    aria-orientation="vertical"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    aria-label={label}
    title={resetLabel}
    tabIndex={0}
    className={`workspace-separator workspace-separator--${side}`}
    onDoubleClick={handlers.onDoubleClick}
    onKeyDown={handlers.onKeyDown}
    onLostPointerCapture={handlers.onLostPointerCapture}
    onPointerCancel={handlers.onPointerCancel}
    onPointerDown={handlers.onPointerDown}
    onPointerMove={handlers.onPointerMove}
    onPointerUp={handlers.onPointerUp}
  />;
}

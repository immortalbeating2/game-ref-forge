"use client";

import { useEffect, useId, useRef } from "react";
import type React from "react";

import {
  getDialogKeyboardAction,
  getInitialDialogFocusIndex,
} from "./synthesis-workspace-state";

export function SynthesisConfirmation({
  title,
  body,
  cancelLabel,
  confirmLabel,
  destructive = false,
  busy = false,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef(onCancel);
  const busyRef = useRef(busy);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    cancelRef.current = onCancel;
    busyRef.current = busy;
  }, [busy, onCancel]);

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusableSelector = "button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    const initialFocusIndex = getInitialDialogFocusIndex(focusable.length);
    (initialFocusIndex >= 0 ? focusable[initialFocusIndex] : dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      const currentFocusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      const activeIndex = currentFocusable.indexOf(document.activeElement as HTMLElement);
      const action = getDialogKeyboardAction(
        event.key,
        event.shiftKey,
        activeIndex,
        currentFocusable.length,
      );
      if (action?.kind === "cancel") {
        if (!busyRef.current) {
          event.preventDefault();
          cancelRef.current();
        }
      } else if (action?.kind === "focus") {
        event.preventDefault();
        if (action.index < 0) dialog.focus();
        else currentFocusable[action.index]?.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => {
      dialog.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      className="synthesis-confirmation"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      tabIndex={-1}
    >
      <div>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{body}</p>
        <div>
          <button className="ghost-button" type="button" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button className={destructive ? "danger-button" : ""} type="button" onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type WorkspaceShortcutEvent = Pick<
  KeyboardEvent,
  "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey" | "target"
>;

function isEditableShortcutTarget(target: EventTarget | null) {
  return target instanceof HTMLElement &&
    (target.matches("input, textarea, select, [contenteditable='true']") ||
      target.isContentEditable);
}

export function hasBlockingWorkspaceLayer() {
  return Boolean(
    document.querySelector('[role="dialog"], [role="alertdialog"]'),
  );
}

export function shouldFocusWorkspaceSearch(
  event: WorkspaceShortcutEvent,
  blockingLayerOpen: boolean,
) {
  return event.key === "/" &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !blockingLayerOpen &&
    !isEditableShortcutTarget(event.target);
}

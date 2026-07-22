"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, RefObject } from "react";

import {
  DEFAULT_WORKSPACE_LAYOUT,
  WORKSPACE_LAYOUT_STORAGE_KEY,
  WORKSPACE_LEFT_DEFAULT,
  WORKSPACE_LEFT_MAX,
  WORKSPACE_LEFT_MIN,
  WORKSPACE_RIGHT_DEFAULT,
  WORKSPACE_RIGHT_MAX,
  WORKSPACE_RIGHT_MIN,
  getKeyboardWorkspaceWidth,
  parseWorkspaceLayoutPreferences,
  resizeWorkspacePanel,
  resolveWorkspaceLayout,
  serializeWorkspaceLayoutPreferences,
  type WorkspaceLayoutPreferences,
  type WorkspacePanelSide,
  type WorkspaceViewMode,
} from "../../lib/workspace-layout";

type ActiveDrag = {
  element: HTMLElement;
  pointerId: number;
  side: WorkspacePanelSide;
  startWidth: number;
  startX: number;
};

type WorkspaceStyle = CSSProperties & {
  "--workspace-left-handle-width": string;
  "--workspace-left-width": string;
  "--workspace-right-handle-width": string;
  "--workspace-right-width": string;
};

export type WorkspaceSeparatorHandlers = {
  onDoubleClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onLostPointerCapture: () => void;
  onPointerCancel: () => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
};

const panelBounds = {
  left: {
    defaultWidth: WORKSPACE_LEFT_DEFAULT,
    max: WORKSPACE_LEFT_MAX,
    min: WORKSPACE_LEFT_MIN,
  },
  right: {
    defaultWidth: WORKSPACE_RIGHT_DEFAULT,
    max: WORKSPACE_RIGHT_MAX,
    min: WORKSPACE_RIGHT_MIN,
  },
} as const;

function contentWidth(element: HTMLElement) {
  return element.clientWidth;
}

export function useWorkspaceLayout(view: WorkspaceViewMode) {
  const workspaceRef = useRef<HTMLElement | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const [preferences, setPreferences] = useState<WorkspaceLayoutPreferences>(DEFAULT_WORKSPACE_LAYOUT);
  const [containerWidth, setContainerWidth] = useState(0);
  const [draggingSide, setDraggingSide] = useState<WorkspacePanelSide | null>(null);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  const endDrag = useCallback(() => {
    const activeDrag = activeDragRef.current;
    if (activeDrag?.element.hasPointerCapture(activeDrag.pointerId)) {
      activeDrag.element.releasePointerCapture(activeDrag.pointerId);
    }
    activeDragRef.current = null;
    setDraggingSide(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        setPreferences(parseWorkspaceLayoutPreferences(window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY)));
      } catch {
        setPreferences(DEFAULT_WORKSPACE_LAYOUT);
      } finally {
        setHasLoadedPreferences(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedPreferences) {
      return;
    }

    try {
      window.localStorage.setItem(
        WORKSPACE_LAYOUT_STORAGE_KEY,
        serializeWorkspaceLayoutPreferences(preferences),
      );
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, [hasLoadedPreferences, preferences]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) {
      return;
    }

    const updateWidth = (width: number) => {
      const nextWidth = Number.isFinite(width) ? width : 0;
      setContainerWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
      if (nextWidth <= 1280) {
        endDrag();
      }
    };

    updateWidth(contentWidth(workspace));
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      updateWidth(entry ? entry.contentRect.width : contentWidth(workspace));
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, [endDrag]);

  useEffect(() => {
    window.addEventListener("blur", endDrag);
    return () => window.removeEventListener("blur", endDrag);
  }, [endDrag]);

  const metrics = useMemo(
    () => resolveWorkspaceLayout(preferences, containerWidth, view),
    [containerWidth, preferences, view],
  );

  const resizePanel = useCallback((side: WorkspacePanelSide, width: number) => {
    setPreferences((current) => resizeWorkspacePanel(current, side, width, containerWidth, view));
  }, [containerWidth, view]);

  const beginDrag = useCallback((side: WorkspacePanelSide, event: PointerEvent<HTMLElement>) => {
    const startWidth = side === "left" ? metrics.leftWidth : metrics.rightWidth;
    event.currentTarget.setPointerCapture(event.pointerId);
    activeDragRef.current = {
      element: event.currentTarget,
      pointerId: event.pointerId,
      side,
      startWidth,
      startX: event.clientX,
    };
    setDraggingSide(side);
  }, [metrics.leftWidth, metrics.rightWidth]);

  const moveDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    const activeDrag = activeDragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) {
      return;
    }

    const delta = event.clientX - activeDrag.startX;
    const requestedWidth = activeDrag.startWidth + (activeDrag.side === "right" ? -delta : delta);
    resizePanel(activeDrag.side, requestedWidth);
  }, [resizePanel]);

  const resetPanel = useCallback((side: WorkspacePanelSide) => {
    resizePanel(side, panelBounds[side].defaultWidth);
  }, [resizePanel]);

  const handleKeyboard = useCallback((side: WorkspacePanelSide, event: KeyboardEvent<HTMLElement>) => {
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const bounds = panelBounds[side];
    event.preventDefault();
    setPreferences((current) => {
      const currentMetrics = resolveWorkspaceLayout(current, containerWidth, view);
      const currentWidth = side === "left" ? currentMetrics.leftWidth : currentMetrics.rightWidth;
      const targetWidth = getKeyboardWorkspaceWidth(
        currentWidth,
        event.key,
        event.shiftKey,
        bounds.min,
        bounds.max,
        bounds.defaultWidth,
      );
      if (targetWidth === null) {
        return current;
      }

      return resizeWorkspacePanel(current, side, targetWidth, containerWidth, view);
    });
  }, [containerWidth, view]);

  const separatorHandlers = useMemo<Record<WorkspacePanelSide, WorkspaceSeparatorHandlers>>(() => ({
    left: {
      onDoubleClick: () => resetPanel("left"),
      onKeyDown: (event) => handleKeyboard("left", event),
      onLostPointerCapture: endDrag,
      onPointerCancel: endDrag,
      onPointerDown: (event) => beginDrag("left", event),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
    },
    right: {
      onDoubleClick: () => resetPanel("right"),
      onKeyDown: (event) => handleKeyboard("right", event),
      onLostPointerCapture: endDrag,
      onPointerCancel: endDrag,
      onPointerDown: (event) => beginDrag("right", event),
      onPointerMove: moveDrag,
      onPointerUp: endDrag,
    },
  }), [beginDrag, endDrag, handleKeyboard, moveDrag, resetPanel]);

  const togglePanel = useCallback((side: WorkspacePanelSide) => {
    setPreferences((current) => side === "left"
      ? { ...current, leftCollapsed: !current.leftCollapsed }
      : { ...current, rightCollapsed: !current.rightCollapsed });
  }, []);

  const restorePanel = useCallback((side: WorkspacePanelSide) => {
    setPreferences((current) => side === "left"
      ? { ...current, leftCollapsed: false }
      : { ...current, rightCollapsed: false });
  }, []);

  const workspaceStyle = useMemo<WorkspaceStyle>(() => ({
    "--workspace-left-handle-width": `${metrics.leftHandleWidth}px`,
    "--workspace-left-width": `${metrics.leftWidth}px`,
    "--workspace-right-handle-width": `${metrics.rightHandleWidth}px`,
    "--workspace-right-width": `${metrics.rightWidth}px`,
  }), [metrics]);

  return {
    workspaceRef: workspaceRef as RefObject<HTMLElement>,
    preferences,
    metrics,
    workspaceStyle,
    draggingSide,
    separatorHandlers,
    togglePanel,
    restorePanel,
  };
}

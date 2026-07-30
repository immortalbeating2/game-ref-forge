"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  DEFAULT_WORKSPACE_VIEW_PREFERENCES,
  parseWorkspaceViewPreferences,
  serializeWorkspaceViewPreferences,
  WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY,
  type WorkspaceDensity,
} from "../../lib/workspace-view-preferences";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY) {
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function getDensitySnapshot(): WorkspaceDensity {
  try {
    return parseWorkspaceViewPreferences(
      window.localStorage.getItem(WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY),
    ).density;
  } catch {
    return DEFAULT_WORKSPACE_VIEW_PREFERENCES.density;
  }
}

function getServerDensitySnapshot(): WorkspaceDensity {
  return DEFAULT_WORKSPACE_VIEW_PREFERENCES.density;
}

export function useWorkspaceViewPreferences() {
  const density = useSyncExternalStore(
    subscribe,
    getDensitySnapshot,
    getServerDensitySnapshot,
  );

  const setDensity = useCallback((density: WorkspaceDensity) => {
    const next = { version: 1 as const, density };

    try {
      window.localStorage.setItem(
        WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY,
        serializeWorkspaceViewPreferences(next),
      );
    } catch {
      // Storage restrictions leave the current persisted/default snapshot unchanged.
    }

    listeners.forEach((listener) => listener());
  }, []);

  return {
    preferences: { version: 1 as const, density },
    setDensity,
  };
}

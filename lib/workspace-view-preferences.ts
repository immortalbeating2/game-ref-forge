export type WorkspaceDensity = "compact" | "comfortable";

export type WorkspaceViewPreferences = {
  version: 1;
  density: WorkspaceDensity;
};

export const WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY =
  "ref-forge-workspace-view-v1";

export const DEFAULT_WORKSPACE_VIEW_PREFERENCES: WorkspaceViewPreferences = {
  version: 1,
  density: "compact",
};

export function parseWorkspaceViewPreferences(
  raw: string | null,
): WorkspaceViewPreferences {
  if (!raw) {
    return DEFAULT_WORKSPACE_VIEW_PREFERENCES;
  }

  try {
    const value = JSON.parse(raw) as Partial<WorkspaceViewPreferences> | null;

    if (
      value?.version === 1 &&
      (value.density === "compact" || value.density === "comfortable")
    ) {
      return {
        version: 1,
        density: value.density,
      };
    }
  } catch {
    return DEFAULT_WORKSPACE_VIEW_PREFERENCES;
  }

  return DEFAULT_WORKSPACE_VIEW_PREFERENCES;
}

export function serializeWorkspaceViewPreferences(
  value: WorkspaceViewPreferences,
) {
  return JSON.stringify(value);
}

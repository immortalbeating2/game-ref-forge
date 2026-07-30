// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useWorkspaceViewPreferences } from "../app/workspace/use-workspace-view-preferences";
import {
  WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY,
} from "../lib/workspace-view-preferences";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useWorkspaceViewPreferences", () => {
  it("hydrates the persisted density after mounting", async () => {
    window.localStorage.setItem(
      WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ version: 1, density: "comfortable" }),
    );

    const { result } = renderHook(() => useWorkspaceViewPreferences());

    await waitFor(() => {
      expect(result.current.preferences.density).toBe("comfortable");
    });
  });

  it("persists density changes through the hook", () => {
    const { result } = renderHook(() => useWorkspaceViewPreferences());

    act(() => result.current.setDensity("comfortable"));

    expect(result.current.preferences.density).toBe("comfortable");
    expect(
      JSON.parse(
        window.localStorage.getItem(
          WORKSPACE_VIEW_PREFERENCES_STORAGE_KEY,
        ) ?? "{}",
      ),
    ).toEqual({ version: 1, density: "comfortable" });
  });
});

import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_LAYOUT,
  WORKSPACE_LAYOUT_STORAGE_KEY,
  getKeyboardWorkspaceWidth,
  parseWorkspaceLayoutPreferences,
  resizeWorkspacePanel,
  resolveWorkspaceLayout,
  serializeWorkspaceLayoutPreferences,
} from "../lib/workspace-layout";

describe("workspace layout preferences", () => {
  it("uses the versioned default for missing or damaged storage", () => {
    expect(WORKSPACE_LAYOUT_STORAGE_KEY).toBe("ref-forge-workspace-layout-v1");
    expect(parseWorkspaceLayoutPreferences(null)).toEqual(DEFAULT_WORKSPACE_LAYOUT);
    expect(parseWorkspaceLayoutPreferences("{")).toEqual(DEFAULT_WORKSPACE_LAYOUT);
    expect(parseWorkspaceLayoutPreferences('{"version":2}')).toEqual(DEFAULT_WORKSPACE_LAYOUT);
  });

  it("normalizes valid persisted widths and booleans", () => {
    const parsed = parseWorkspaceLayoutPreferences(JSON.stringify({
      version: 1,
      leftWidth: 999,
      rightWidth: 100,
      leftCollapsed: true,
      rightCollapsed: false,
    }));
    expect(parsed).toEqual({
      version: 1,
      leftWidth: 360,
      rightWidth: 340,
      leftCollapsed: true,
      rightCollapsed: false,
    });
    expect(parseWorkspaceLayoutPreferences(serializeWorkspaceLayoutPreferences(parsed))).toEqual(parsed);
  });

  it("normalizes non-finite widths before serialization and preserves booleans", () => {
    const serialized = serializeWorkspaceLayoutPreferences({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: Number.NaN,
      rightWidth: Number.POSITIVE_INFINITY,
      leftCollapsed: true,
      rightCollapsed: true,
    });

    expect(parseWorkspaceLayoutPreferences(serialized)).toEqual({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftCollapsed: true,
      rightCollapsed: true,
    });
  });
});

describe("workspace layout constraints", () => {
  it("reserves the 560px center while resolving reference tracks", () => {
    expect(resolveWorkspaceLayout({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: 360,
      rightWidth: 640,
    }, 1400, "references")).toMatchObject({
      leftWidth: 360,
      rightWidth: 464,
      leftHandleWidth: 8,
      rightHandleWidth: 8,
      centerWidth: 560,
    });
  });

  it("uses recovery rails for collapsed panels and omits the synthesis right track", () => {
    expect(resolveWorkspaceLayout({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftCollapsed: true,
      rightCollapsed: true,
    }, 1600, "references")).toMatchObject({
      leftWidth: 0,
      rightWidth: 0,
      leftHandleWidth: 44,
      rightHandleWidth: 44,
    });
    expect(resolveWorkspaceLayout(DEFAULT_WORKSPACE_LAYOUT, 1600, "syntheses")).toMatchObject({
      leftWidth: 260,
      rightWidth: 0,
      rightHandleWidth: 0,
    });
  });

  it("clamps the dragged side without silently resizing the opposite panel", () => {
    expect(resizeWorkspacePanel(DEFAULT_WORKSPACE_LAYOUT, "left", 900, 1440, "references").leftWidth).toBe(360);
    expect(resizeWorkspacePanel(DEFAULT_WORKSPACE_LAYOUT, "right", 900, 1281, "references").rightWidth).toBe(445);
  });
});

describe("workspace layout keyboard values", () => {
  it("supports normal, shifted, edge, and reset targets", () => {
    expect(getKeyboardWorkspaceWidth(260, "ArrowRight", false, 220, 360, 260)).toBe(276);
    expect(getKeyboardWorkspaceWidth(260, "ArrowLeft", true, 220, 360, 260)).toBe(220);
    expect(getKeyboardWorkspaceWidth(260, "Home", false, 220, 360, 260)).toBe(220);
    expect(getKeyboardWorkspaceWidth(260, "End", false, 220, 360, 260)).toBe(360);
    expect(getKeyboardWorkspaceWidth(320, "reset", false, 220, 360, 260)).toBe(260);
    expect(getKeyboardWorkspaceWidth(260, "Enter", false, 220, 360, 260)).toBeNull();
  });
});

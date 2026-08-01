import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORKSPACE_LAYOUT,
  LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY,
  WORKSPACE_LEFT_DEFAULT,
  WORKSPACE_LAYOUT_STORAGE_KEY,
  WORKSPACE_RIGHT_DEFAULT,
  getKeyboardWorkspaceWidth,
  migrateWorkspaceLayoutPreferences,
  parseWorkspaceLayoutPreferences,
  resizeWorkspacePanel,
  resolveWorkspaceLayout,
  serializeWorkspaceLayoutPreferences,
} from "../lib/workspace-layout";

describe("workspace layout preferences", () => {
  it("uses the versioned default for missing or damaged storage", () => {
    expect(WORKSPACE_LAYOUT_STORAGE_KEY).toBe("ref-forge-workspace-layout-r15-v1");
    expect(LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY).toBe("ref-forge-workspace-layout-v1");
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
      leftWidth: 320,
      rightWidth: 336,
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
  it("uses protected-A defaults and keeps a 60 percent center at 1480px", () => {
    expect(WORKSPACE_LEFT_DEFAULT).toBe(220);
    expect(WORKSPACE_RIGHT_DEFAULT).toBe(352);
    expect(resolveWorkspaceLayout(DEFAULT_WORKSPACE_LAYOUT, 1480, "references")).toEqual({
      leftWidth: 220,
      rightWidth: 352,
      leftHandleWidth: 8,
      rightHandleWidth: 8,
      centerWidth: 892,
    });
  });

  it("reserves the 640px center while resolving reference tracks", () => {
    expect(resolveWorkspaceLayout({
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: 360,
      rightWidth: 640,
    }, 1400, "references")).toMatchObject({
      leftWidth: 320,
      rightWidth: 424,
      leftHandleWidth: 8,
      rightHandleWidth: 8,
      centerWidth: 640,
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
      leftWidth: 220,
      rightWidth: 0,
      rightHandleWidth: 0,
    });
  });

  it("clamps the dragged side without silently resizing the opposite panel", () => {
    expect(resizeWorkspacePanel(DEFAULT_WORKSPACE_LAYOUT, "left", 900, 1440, "references").leftWidth).toBe(320);
    expect(resizeWorkspacePanel(DEFAULT_WORKSPACE_LAYOUT, "right", 900, 1281, "references").rightWidth).toBe(405);
  });

  it("moves the constrained right track on the first keyboard step", () => {
    const preferences = {
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: 360,
      rightWidth: 640,
    };
    const current = resolveWorkspaceLayout(preferences, 1400, "references");
    const target = getKeyboardWorkspaceWidth(current.rightWidth, "ArrowLeft", false, 336, 520, 352);

    expect(current.rightWidth).toBe(424);
    expect(target).toBe(408);
    expect(resolveWorkspaceLayout(
      resizeWorkspacePanel(preferences, "right", target ?? current.rightWidth, 1400, "references"),
      1400,
      "references",
    )).toMatchObject({
      leftWidth: 320,
      rightWidth: 408,
      centerWidth: 656,
    });
  });

  it("persists the opposite visible track while resizing one reference panel", () => {
    const preferences = {
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: 360,
      rightWidth: 640,
    };
    const resized = resizeWorkspacePanel(preferences, "left", 220, 1400, "references");

    expect(resized).toMatchObject({
      leftWidth: 220,
      rightWidth: 424,
    });
    expect(resolveWorkspaceLayout(resized, 1400, "references")).toMatchObject({
      leftWidth: 220,
      rightWidth: 424,
    });
  });

  it("uses the opposite visible track to cap the requested reference panel", () => {
    const preferences = {
      ...DEFAULT_WORKSPACE_LAYOUT,
      leftWidth: 220,
      rightWidth: 640,
    };
    const resized = resizeWorkspacePanel(preferences, "left", 900, 1400, "references");

    expect(resolveWorkspaceLayout(preferences, 1400, "references")).toMatchObject({
      leftWidth: 220,
      rightWidth: 520,
    });
    expect(resized).toMatchObject({
      leftWidth: 224,
      rightWidth: 520,
    });
  });

  it("preserves the stored right preference while resizing syntheses", () => {
    const preferences = {
      ...DEFAULT_WORKSPACE_LAYOUT,
      rightWidth: 520,
    };

    expect(resizeWorkspacePanel(preferences, "left", 300, 1400, "syntheses")).toMatchObject({
      leftWidth: 300,
      rightWidth: 520,
    });
  });
});

describe("workspace layout keyboard values", () => {
  it("supports normal, shifted, edge, and reset targets", () => {
    expect(getKeyboardWorkspaceWidth(220, "ArrowRight", false, 208, 320, 220)).toBe(236);
    expect(getKeyboardWorkspaceWidth(220, "ArrowLeft", true, 208, 320, 220)).toBe(208);
    expect(getKeyboardWorkspaceWidth(220, "Home", false, 208, 320, 220)).toBe(208);
    expect(getKeyboardWorkspaceWidth(220, "End", false, 208, 320, 220)).toBe(320);
    expect(getKeyboardWorkspaceWidth(320, "reset", false, 208, 320, 220)).toBe(220);
    expect(getKeyboardWorkspaceWidth(220, "Enter", false, 208, 320, 220)).toBeNull();
  });
});

describe("workspace layout migration", () => {
  it("resets the exact Round 14 default but preserves collapse state", () => {
    expect(migrateWorkspaceLayoutPreferences(null, JSON.stringify({
      version: 1,
      leftWidth: 260,
      rightWidth: 420,
      leftCollapsed: true,
      rightCollapsed: false,
    }))).toEqual({
      version: 1,
      leftWidth: 220,
      rightWidth: 352,
      leftCollapsed: true,
      rightCollapsed: false,
    });
  });

  it("preserves a custom legacy layout and clamps it to protected-A bounds", () => {
    expect(migrateWorkspaceLayoutPreferences(null, JSON.stringify({
      version: 1,
      leftWidth: 300,
      rightWidth: 500,
      leftCollapsed: false,
      rightCollapsed: true,
    }))).toEqual({
      version: 1,
      leftWidth: 300,
      rightWidth: 500,
      leftCollapsed: false,
      rightCollapsed: true,
    });
  });
});

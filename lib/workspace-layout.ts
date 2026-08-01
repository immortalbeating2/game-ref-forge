export const LEGACY_WORKSPACE_LAYOUT_STORAGE_KEY = "ref-forge-workspace-layout-v1";
export const WORKSPACE_LAYOUT_STORAGE_KEY = "ref-forge-workspace-layout-r15-v1";
export const WORKSPACE_LAYOUT_VERSION = 1 as const;
export const WORKSPACE_LEFT_DEFAULT = 220;
export const WORKSPACE_LEFT_MIN = 208;
export const WORKSPACE_LEFT_MAX = 320;
export const WORKSPACE_RIGHT_DEFAULT = 352;
export const WORKSPACE_RIGHT_MIN = 336;
export const WORKSPACE_RIGHT_MAX = 520;
export const WORKSPACE_CENTER_MIN = 640;
export const WORKSPACE_SEPARATOR_WIDTH = 8;
export const WORKSPACE_RECOVERY_RAIL_WIDTH = 44;
export const WORKSPACE_KEYBOARD_STEP = 16;
export const WORKSPACE_KEYBOARD_LARGE_STEP = 40;

const LEGACY_LEFT_DEFAULT = 260;
const LEGACY_RIGHT_DEFAULT = 420;

export type WorkspacePanelSide = "left" | "right";
export type WorkspaceViewMode = "references" | "syntheses";
export type WorkspaceLayoutPreferences = {
  version: 1;
  leftWidth: number;
  rightWidth: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
};
export type WorkspaceLayoutMetrics = {
  leftWidth: number;
  rightWidth: number;
  leftHandleWidth: number;
  rightHandleWidth: number;
  centerWidth: number;
};

function createDefaultWorkspaceLayout(): WorkspaceLayoutPreferences {
  return {
    version: WORKSPACE_LAYOUT_VERSION,
    leftWidth: WORKSPACE_LEFT_DEFAULT,
    rightWidth: WORKSPACE_RIGHT_DEFAULT,
    leftCollapsed: false,
    rightCollapsed: false,
  };
}

export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayoutPreferences = createDefaultWorkspaceLayout();

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampLeftWidth(width: number) {
  return clamp(
    Number.isFinite(width) ? width : WORKSPACE_LEFT_DEFAULT,
    WORKSPACE_LEFT_MIN,
    WORKSPACE_LEFT_MAX,
  );
}

function clampRightWidth(width: number) {
  return clamp(
    Number.isFinite(width) ? width : WORKSPACE_RIGHT_DEFAULT,
    WORKSPACE_RIGHT_MIN,
    WORKSPACE_RIGHT_MAX,
  );
}

function normalizeWorkspaceLayout(value: WorkspaceLayoutPreferences): WorkspaceLayoutPreferences {
  return {
    version: WORKSPACE_LAYOUT_VERSION,
    leftWidth: clampLeftWidth(value.leftWidth),
    rightWidth: clampRightWidth(value.rightWidth),
    leftCollapsed: value.leftCollapsed,
    rightCollapsed: value.rightCollapsed,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function parseWorkspaceLayoutCandidate(raw: string | null): WorkspaceLayoutPreferences | null {
  if (raw === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(raw);
    if (
      !isPlainObject(value) ||
      value.version !== WORKSPACE_LAYOUT_VERSION ||
      typeof value.leftWidth !== "number" ||
      !Number.isFinite(value.leftWidth) ||
      typeof value.rightWidth !== "number" ||
      !Number.isFinite(value.rightWidth) ||
      typeof value.leftCollapsed !== "boolean" ||
      typeof value.rightCollapsed !== "boolean"
    ) {
      return null;
    }

    return value as WorkspaceLayoutPreferences;
  } catch {
    return null;
  }
}

export function parseWorkspaceLayoutPreferences(raw: string | null): WorkspaceLayoutPreferences {
  const candidate = parseWorkspaceLayoutCandidate(raw);
  return candidate ? normalizeWorkspaceLayout(candidate) : createDefaultWorkspaceLayout();
}

export function migrateWorkspaceLayoutPreferences(
  currentRaw: string | null,
  legacyRaw: string | null,
): WorkspaceLayoutPreferences {
  const current = parseWorkspaceLayoutCandidate(currentRaw);
  if (current) return normalizeWorkspaceLayout(current);

  const legacy = parseWorkspaceLayoutCandidate(legacyRaw);
  if (!legacy) return createDefaultWorkspaceLayout();

  const usedLegacyDefaults =
    legacy.leftWidth === LEGACY_LEFT_DEFAULT &&
    legacy.rightWidth === LEGACY_RIGHT_DEFAULT;

  return normalizeWorkspaceLayout({
    ...legacy,
    leftWidth: usedLegacyDefaults ? WORKSPACE_LEFT_DEFAULT : legacy.leftWidth,
    rightWidth: usedLegacyDefaults ? WORKSPACE_RIGHT_DEFAULT : legacy.rightWidth,
  });
}

export function serializeWorkspaceLayoutPreferences(value: WorkspaceLayoutPreferences): string {
  return JSON.stringify(normalizeWorkspaceLayout(value));
}

function getHandleWidth(collapsed: boolean) {
  return collapsed ? WORKSPACE_RECOVERY_RAIL_WIDTH : WORKSPACE_SEPARATOR_WIDTH;
}

export function resolveWorkspaceLayout(
  value: WorkspaceLayoutPreferences,
  containerWidth: number,
  view: WorkspaceViewMode,
): WorkspaceLayoutMetrics {
  const normalized = normalizeWorkspaceLayout(value);
  const leftHandleWidth = getHandleWidth(normalized.leftCollapsed);
  const rightHandleWidth = view === "syntheses"
    ? 0
    : getHandleWidth(normalized.rightCollapsed);
  let leftWidth = normalized.leftCollapsed ? 0 : normalized.leftWidth;
  let rightWidth = view === "syntheses" || normalized.rightCollapsed ? 0 : normalized.rightWidth;
  const availablePanelWidth = Math.max(
    0,
    (Number.isFinite(containerWidth) ? containerWidth : 0) -
      WORKSPACE_CENTER_MIN -
      leftHandleWidth -
      rightHandleWidth,
  );
  let excessWidth = leftWidth + rightWidth - availablePanelWidth;

  if (excessWidth > 0) {
    const rightReduction = Math.min(excessWidth, Math.max(0, rightWidth - WORKSPACE_RIGHT_MIN));
    rightWidth -= rightReduction;
    excessWidth -= rightReduction;
  }
  if (excessWidth > 0) {
    const leftReduction = Math.min(excessWidth, Math.max(0, leftWidth - WORKSPACE_LEFT_MIN));
    leftWidth -= leftReduction;
  }

  const centerWidth = Math.max(
    0,
    (Number.isFinite(containerWidth) ? containerWidth : 0) -
      leftWidth -
      rightWidth -
      leftHandleWidth -
      rightHandleWidth,
  );

  return {
    leftWidth,
    rightWidth,
    leftHandleWidth,
    rightHandleWidth,
    centerWidth,
  };
}

export function resizeWorkspacePanel(
  value: WorkspaceLayoutPreferences,
  side: WorkspacePanelSide,
  requestedWidth: number,
  containerWidth: number,
  view: WorkspaceViewMode,
): WorkspaceLayoutPreferences {
  const normalized = normalizeWorkspaceLayout(value);
  if (side === "right" && view === "syntheses") {
    return normalized;
  }

  const layout = resolveWorkspaceLayout(normalized, containerWidth, view);
  const currentLayout = view === "references"
    ? {
        ...normalized,
        ...(!normalized.leftCollapsed ? { leftWidth: layout.leftWidth } : {}),
        ...(!normalized.rightCollapsed ? { rightWidth: layout.rightWidth } : {}),
      }
    : normalized;
  const oppositeWidth = side === "left" ? layout.rightWidth : layout.leftWidth;
  const handleWidth = layout.leftHandleWidth + layout.rightHandleWidth;
  const dynamicMax = Math.max(
    0,
    (Number.isFinite(containerWidth) ? containerWidth : 0) -
      WORKSPACE_CENTER_MIN -
      handleWidth -
      oppositeWidth,
  );
  const maxWidth = Math.min(
    side === "left" ? WORKSPACE_LEFT_MAX : WORKSPACE_RIGHT_MAX,
    dynamicMax,
  );
  const width = Number.isFinite(requestedWidth)
    ? clamp(requestedWidth, side === "left" ? WORKSPACE_LEFT_MIN : WORKSPACE_RIGHT_MIN, maxWidth)
    : side === "left" ? layout.leftWidth : layout.rightWidth;

  return {
    ...currentLayout,
    ...(side === "left" ? { leftWidth: width } : { rightWidth: width }),
  };
}

export function getKeyboardWorkspaceWidth(
  current: number,
  key: string,
  shiftKey: boolean,
  min: number,
  max: number,
  defaultWidth: number,
): number | null {
  switch (key) {
    case "ArrowRight":
      return clamp(current + (shiftKey ? WORKSPACE_KEYBOARD_LARGE_STEP : WORKSPACE_KEYBOARD_STEP), min, max);
    case "ArrowLeft":
      return clamp(current - (shiftKey ? WORKSPACE_KEYBOARD_LARGE_STEP : WORKSPACE_KEYBOARD_STEP), min, max);
    case "Home":
      return min;
    case "End":
      return max;
    case "reset":
      return clamp(defaultWidth, min, max);
    default:
      return null;
  }
}

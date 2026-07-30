// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { shouldFocusWorkspaceSearch } from "../lib/workspace-shortcuts";

function makeKeyboardEvent(
  target: HTMLElement,
  overrides: Partial<KeyboardEventInit> = {},
) {
  return {
    key: "/",
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target,
    ...overrides,
  } as unknown as KeyboardEvent;
}

describe("shouldFocusWorkspaceSearch", () => {
  it("accepts the unmodified slash shortcut outside editable controls", () => {
    expect(
      shouldFocusWorkspaceSearch(makeKeyboardEvent(document.body), false),
    ).toBe(true);
  });

  it("blocks slash while a dialog or alertdialog owns the temporary layer", () => {
    const button = document.createElement("button");

    expect(shouldFocusWorkspaceSearch(makeKeyboardEvent(button), true)).toBe(
      false,
    );
  });

  it("blocks editable targets and modified shortcuts", () => {
    const input = document.createElement("input");

    expect(shouldFocusWorkspaceSearch(makeKeyboardEvent(input), false)).toBe(
      false,
    );
    expect(
      shouldFocusWorkspaceSearch(
        makeKeyboardEvent(document.body, { ctrlKey: true }),
        false,
      ),
    ).toBe(false);
  });
});

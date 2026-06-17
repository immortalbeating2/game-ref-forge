import { describe, expect, it } from "vitest";
import {
  deleteConfirmationCopy,
  metadataPreviewMessage,
  seedFallbackMessage,
} from "../lib/interaction-state";

describe("metadataPreviewMessage", () => {
  it("returns stable labels for preview states", () => {
    expect(metadataPreviewMessage("idle")).toBe(null);
    expect(metadataPreviewMessage("loading")).toBe("Previewing metadata...");
    expect(metadataPreviewMessage("success")).toBe(
      "Metadata preview ready. Review the fields before saving.",
    );
    expect(metadataPreviewMessage("failure")).toBe(
      "Metadata preview failed. You can still save this reference manually.",
    );
  });
});

describe("deleteConfirmationCopy", () => {
  it("names the reference being deleted", () => {
    expect(deleteConfirmationCopy("Kenney UI Pack")).toEqual({
      title: "Delete reference?",
      body: 'Delete "Kenney UI Pack" from this private research desk?',
      cancel: "Cancel",
      confirm: "Delete reference",
    });
  });
});

describe("seedFallbackMessage", () => {
  it("explains starter examples without implying D1 data", () => {
    expect(seedFallbackMessage()).toBe(
      "Showing starter examples. Add a private reference to begin using your own dataset.",
    );
  });
});

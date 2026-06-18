import { describe, expect, it } from "vitest";
import {
  deleteConfirmationCopy,
  metadataPreviewMessage,
  seedFallbackMessage,
} from "../lib/interaction-state";

describe("metadataPreviewMessage", () => {
  it("returns stable Chinese labels for preview states by default", () => {
    expect(metadataPreviewMessage("idle")).toBe(null);
    expect(metadataPreviewMessage("loading")).toBe("正在预览元数据...");
    expect(metadataPreviewMessage("success")).toBe(
      "元数据预览已就绪。保存前请检查字段。",
    );
    expect(metadataPreviewMessage("failure")).toBe(
      "元数据预览失败。你仍然可以手动保存这条参考。",
    );
  });

  it("keeps English labels available", () => {
    expect(metadataPreviewMessage("loading", "en")).toBe("Previewing metadata...");
    expect(metadataPreviewMessage("success")).toBe(
      "元数据预览已就绪。保存前请检查字段。",
    );
    expect(metadataPreviewMessage("success", "en")).toBe(
      "Metadata preview ready. Review the fields before saving.",
    );
    expect(metadataPreviewMessage("failure", "en")).toBe(
      "Metadata preview failed. You can still save this reference manually.",
    );
  });
});

describe("deleteConfirmationCopy", () => {
  it("names the reference being deleted in Chinese by default", () => {
    expect(deleteConfirmationCopy("Kenney UI Pack")).toEqual({
      title: "删除这条参考？",
      body: '要从这个私有研究台删除 "Kenney UI Pack" 吗？',
      cancel: "取消",
      confirm: "删除参考",
    });
  });

  it("keeps English delete confirmation available", () => {
    expect(deleteConfirmationCopy("Kenney UI Pack", "en")).toEqual({
      title: "Delete reference?",
      body: 'Delete "Kenney UI Pack" from this private research desk?',
      cancel: "Cancel",
      confirm: "Delete reference",
    });
  });
});

describe("seedFallbackMessage", () => {
  it("explains starter examples in Chinese by default", () => {
    expect(seedFallbackMessage()).toBe(
      "正在显示入门示例。添加一条私有参考后即可开始使用自己的数据集。",
    );
  });

  it("keeps English starter examples copy available", () => {
    expect(seedFallbackMessage("en")).toBe(
      "Showing starter examples. Add a private reference to begin using your own dataset.",
    );
  });
});

import { describe, expect, it } from "vitest";
import {
  labelForAssetCategory,
  labelForLicenseStatus,
  labelForMediaType,
  labelForPublicStatus,
  labelForQualityStatus,
  uiCopy,
} from "../lib/localization";

describe("localized enum labels", () => {
  it("uses Chinese labels by default", () => {
    expect(labelForAssetCategory("ui_hud")).toBe("界面/HUD");
    expect(labelForMediaType("asset_pack")).toBe("素材包");
    expect(labelForLicenseStatus("source_link_only")).toBe("仅保留来源链接");
    expect(labelForPublicStatus("public_link_only")).toBe("仅公开链接");
    expect(labelForQualityStatus("ready_for_use")).toBe("可用于创作");
  });

  it("keeps English labels available", () => {
    expect(labelForAssetCategory("material_texture", "en")).toBe("Material");
    expect(labelForMediaType("screenshot", "en")).toBe("screenshot");
    expect(labelForLicenseStatus("private_reference", "en")).toBe("private reference");
    expect(labelForPublicStatus("review", "en")).toBe("review");
    expect(labelForQualityStatus("needs_analysis", "en")).toBe("needs analysis");
  });
});

describe("uiCopy", () => {
  it("defaults to Chinese interface copy", () => {
    expect(uiCopy().addReference).toBe("+ 添加参考");
    expect(uiCopy().metadataPreviewSuccess).toBe("元数据预览已就绪。保存前请检查字段。");
    expect(uiCopy().referenceValueScore).toBe("参考价值");
    expect(uiCopy().mechanicTags).toBe("机制标签");
    expect(uiCopy().inspirationObservation).toBe("观察");
    expect(uiCopy().emptyInspirationEntries).toBe("还没有结构化灵感条目。");
  });

  it("returns English interface copy when requested", () => {
    expect(uiCopy("en").addReference).toBe("+ Add reference");
    expect(uiCopy("en").metadataPreviewSuccess).toBe(
      "Metadata preview ready. Review the fields before saving.",
    );
    expect(uiCopy("en").referenceValueScore).toBe("Reference value");
    expect(uiCopy("en").mechanicTags).toBe("Mechanic tags");
    expect(uiCopy("en").inspirationObservation).toBe("Observation");
    expect(uiCopy("en").emptyInspirationEntries).toBe("No structured inspiration entries yet.");
  });
});

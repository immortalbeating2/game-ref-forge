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
    expect(uiCopy().workspaceMode).toBe("灵感提炼工作台");
    expect(uiCopy().sourceAndSafety).toBe("来源与安全");
    expect(uiCopy().scoreMatrix).toBe("评分矩阵");
    expect(uiCopy().tagAxes).toBe("标签轴");
    expect(uiCopy().researchControls).toBe("研究控制");
    expect(uiCopy().sortBy).toBe("排序");
    expect(uiCopy().pinReference).toBe("置顶参考");
    expect(uiCopy().exportMarkdown).toBe("导出 Markdown");
    expect(uiCopy().exportJson).toBe("导出 JSON");
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
    expect(uiCopy("en").workspaceMode).toBe("Inspiration workbench");
    expect(uiCopy("en").sourceAndSafety).toBe("Source and safety");
    expect(uiCopy("en").scoreMatrix).toBe("Score matrix");
    expect(uiCopy("en").tagAxes).toBe("Tag axes");
    expect(uiCopy("en").researchControls).toBe("Research controls");
    expect(uiCopy("en").sortBy).toBe("Sort by");
    expect(uiCopy("en").pinReference).toBe("Pin reference");
    expect(uiCopy("en").exportMarkdown).toBe("Export Markdown");
    expect(uiCopy("en").exportJson).toBe("Export JSON");
  });
});

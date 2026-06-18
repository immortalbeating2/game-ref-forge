import { describe, expect, it } from "vitest";
import {
  labelForAssetCategory,
  labelForLicenseStatus,
  labelForMediaType,
  labelForPublicStatus,
  uiCopy,
} from "../lib/localization";

describe("localized enum labels", () => {
  it("uses Chinese labels by default", () => {
    expect(labelForAssetCategory("ui_hud")).toBe("界面/HUD");
    expect(labelForMediaType("asset_pack")).toBe("素材包");
    expect(labelForLicenseStatus("source_link_only")).toBe("仅保留来源链接");
    expect(labelForPublicStatus("public_link_only")).toBe("仅公开链接");
  });

  it("keeps English labels available", () => {
    expect(labelForAssetCategory("material_texture", "en")).toBe("Material");
    expect(labelForMediaType("screenshot", "en")).toBe("screenshot");
    expect(labelForLicenseStatus("private_reference", "en")).toBe("private reference");
    expect(labelForPublicStatus("review", "en")).toBe("review");
  });
});

describe("uiCopy", () => {
  it("defaults to Chinese interface copy", () => {
    expect(uiCopy().addReference).toBe("+ 添加参考");
    expect(uiCopy().metadataPreviewSuccess).toBe("元数据预览已就绪。保存前请检查字段。");
  });

  it("returns English interface copy when requested", () => {
    expect(uiCopy("en").addReference).toBe("+ Add reference");
    expect(uiCopy("en").metadataPreviewSuccess).toBe(
      "Metadata preview ready. Review the fields before saving.",
    );
  });
});

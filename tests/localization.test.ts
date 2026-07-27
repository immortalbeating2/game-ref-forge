import { describe, expect, it } from "vitest";
import {
  labelForAssetCategory,
  labelForLicenseStatus,
  labelForMediaType,
  labelForPublicStatus,
  labelForQualityStatus,
  labelForSynthesisStatus,
  backupErrorMessage,
  synthesisErrorMessage,
  uiCopy,
} from "../lib/localization";

const dataManagementCopyKeys = [
  "dataManagement",
  "closeDataManagement",
  "backupTab",
  "restoreTab",
  "fullBackup",
  "includeDevicePreferences",
  "transparentJsonWarning",
  "chooseBackupFile",
  "changeBackupFile",
  "backupFileDetails",
  "backupVersion",
  "previewBackup",
  "previewingBackup",
  "restoreBackup",
  "retryRestore",
  "restoreDevicePreferences",
  "confirmOverwrite",
  "unsavedDraftRestoreTitle",
  "unsavedDraftRestoreBody",
  "discardDraftAndRestore",
  "restoreSucceeded",
  "preferencesRestoreFailed",
  "backupIssues",
  "backupOperationFailed",
] as const;

const backupErrorCodes = [
  "invalid_json",
  "unsupported_format",
  "unsupported_version",
  "backup_too_large",
  "validation_failed",
  "backup_changed",
  "preview_stale",
  "overwrite_confirmation_required",
  "restore_failed",
  "database_unavailable",
  "backup_operation_failed",
] as const;

const synthesisCopyKeys = [
  "referencesView",
  "synthesesView",
  "startComparison",
  "cancelComparison",
  "enterSynthesis",
  "comparisonCount",
  "selectedForComparison",
  "discardReferenceEditTitle",
  "discardReferenceEditConfirmation",
  "discardReferenceEditAndCompare",
  "synthesisWorkspace",
  "syntheses",
  "createSynthesis",
  "noSyntheses",
  "synthesisTitle",
  "targetAsset",
  "sharedPrinciples",
  "keyDifferences",
  "originalDirection",
  "synthesisAvoidCopying",
  "designConstraints",
  "experimentPlan",
  "nextActions",
  "additionalNotes",
  "synthesisStatus",
  "synthesisStatusFilter",
  "allSynthesisStatuses",
  "staleReference",
  "unavailableReference",
  "refreshSnapshot",
  "refreshingSnapshot",
  "saveSynthesis",
  "savingSynthesis",
  "synthesisSaved",
  "synthesisSaveFailed",
  "reselectSynthesisReferences",
  "synthesisValidationFailed",
  "synthesisReferencesChanged",
  "synthesisRelationNotFound",
  "synthesisReferenceUnavailable",
  "synthesisNotFound",
  "synthesisMigrationRequired",
  "synthesisOperationFailed",
  "unsavedChanges",
  "unsavedChangesConfirmation",
  "deleteSynthesis",
  "deleteSynthesisConfirmation",
  "synthesisDeleted",
  "synthesisDeleteFailed",
  "exportSynthesisMarkdown",
  "synthesisExportWarning",
] as const;

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
  it.each(["zh", "en"] as const)("provides complete synthesis copy in %s", (language) => {
    for (const key of synthesisCopyKeys) {
      expect(uiCopy(language)[key], `${language}.${key}`).toBeTypeOf("string");
      expect(uiCopy(language)[key].trim(), `${language}.${key}`).not.toBe("");
    }
  });

  it("maps synthesis API and fallback failures to localized user copy", () => {
    const codes = [
      "validation",
      "reference_not_found",
      "relation_not_found",
      "reference_unavailable",
      "not_found",
      "migration_required",
      "operation_failed",
      undefined,
    ] as const;

    for (const code of codes) {
      expect(synthesisErrorMessage(code, "zh")).toMatch(/[\u4e00-\u9fff]/);
      expect(synthesisErrorMessage(code, "en")).toMatch(/[A-Za-z]/);
    }
  });

  it("labels synthesis statuses explicitly in both languages", () => {
    expect(labelForSynthesisStatus("draft")).toBe("草稿");
    expect(labelForSynthesisStatus("actionable")).toBe("可执行");
    expect(labelForSynthesisStatus("archived")).toBe("已归档");
    expect(labelForSynthesisStatus("draft", "en")).toBe("Draft");
    expect(labelForSynthesisStatus("actionable", "en")).toBe("Actionable");
    expect(labelForSynthesisStatus("archived", "en")).toBe("Archived");
  });

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
    expect(uiCopy().reviewQueue).toBe("整理队列");
    expect(uiCopy().queueIncomplete).toBe("待补全");
    expect(uiCopy().qualityChecklist).toBe("质量清单");
    expect(uiCopy().qualityGuidedEditing).toBe("补全导航");
    expect(uiCopy().qualityGuidedPosition).toBe("当前项");
    expect(uiCopy().previousQualityIssue).toBe("上一项");
    expect(uiCopy().nextQualityIssue).toBe("下一项");
    expect(uiCopy().completeQualityIssue).toBe("补全");
    expect(uiCopy().qualityTargetMissing).toBe("未找到对应编辑字段；草稿已保留。");
    expect(uiCopy().qualityComplete).toBe("资料完整");
    expect(uiCopy().resizeFiltersPanel).toBe("调整筛选面板宽度");
    expect(uiCopy().resizeDetailsPanel).toBe("调整详情面板宽度");
    expect(uiCopy().collapseFiltersPanel).toBe("收起筛选面板");
    expect(uiCopy().expandFiltersPanel).toBe("展开筛选面板");
    expect(uiCopy().collapseDetailsPanel).toBe("收起详情面板");
    expect(uiCopy().expandDetailsPanel).toBe("展开详情面板");
    expect(uiCopy().resetPanelWidth).toBe("双击恢复默认宽度");
    expect(uiCopy().dataManagement).toBe("数据管理");
    expect(uiCopy().backupIssues).toBe("校验问题");
    expect(backupErrorMessage("backup_operation_failed")).toBe("备份操作未完成，请稍后重试。");
    for (const key of dataManagementCopyKeys) expect(uiCopy()[key]).not.toHaveLength(0);
    for (const code of backupErrorCodes) expect(backupErrorMessage(code)).not.toHaveLength(0);
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
    expect(uiCopy("en").reviewQueue).toBe("Review queue");
    expect(uiCopy("en").queueIncomplete).toBe("Incomplete");
    expect(uiCopy("en").qualityChecklist).toBe("Quality checklist");
    expect(uiCopy("en").qualityGuidedEditing).toBe("Completion navigator");
    expect(uiCopy("en").qualityGuidedPosition).toBe("Current item");
    expect(uiCopy("en").previousQualityIssue).toBe("Previous item");
    expect(uiCopy("en").nextQualityIssue).toBe("Next item");
    expect(uiCopy("en").completeQualityIssue).toBe("Complete");
    expect(uiCopy("en").qualityTargetMissing).toBe(
      "The matching edit field was not found; your draft is preserved.",
    );
    expect(uiCopy("en").qualityComplete).toBe("Complete");
    expect(uiCopy("en").resizeFiltersPanel).toBe("Resize filters panel");
    expect(uiCopy("en").resizeDetailsPanel).toBe("Resize details panel");
    expect(uiCopy("en").collapseFiltersPanel).toBe("Collapse filters panel");
    expect(uiCopy("en").expandFiltersPanel).toBe("Expand filters panel");
    expect(uiCopy("en").collapseDetailsPanel).toBe("Collapse details panel");
    expect(uiCopy("en").expandDetailsPanel).toBe("Expand details panel");
    expect(uiCopy("en").resetPanelWidth).toBe("Double-click to reset width");
    expect(uiCopy("en").dataManagement).toBe("Data management");
    expect(uiCopy("en").backupIssues).toBe("Validation issues");
    expect(backupErrorMessage("backup_operation_failed", "en")).toBe("The backup operation did not complete. Try again shortly.");
    for (const key of dataManagementCopyKeys) expect(uiCopy("en")[key]).not.toHaveLength(0);
    for (const code of backupErrorCodes) expect(backupErrorMessage(code, "en")).not.toHaveLength(0);
  });
});

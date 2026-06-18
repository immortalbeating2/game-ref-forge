import { Language, uiCopy } from "./localization";

export type MetadataPreviewStatus = "idle" | "loading" | "success" | "failure";

export function metadataPreviewMessage(status: MetadataPreviewStatus, language: Language = "zh") {
  const copy = uiCopy(language);

  switch (status) {
    case "idle":
      return null;
    case "loading":
      return copy.metadataPreviewLoading;
    case "success":
      return copy.metadataPreviewSuccess;
    case "failure":
      return copy.metadataPreviewFailure;
  }
}

export function deleteConfirmationCopy(referenceTitle: string, language: Language = "zh") {
  if (language === "en") {
    return {
      title: "Delete reference?",
      body: `Delete "${referenceTitle}" from this private research desk?`,
      cancel: "Cancel",
      confirm: "Delete reference",
    };
  }

  return {
    title: "删除这条参考？",
    body: `要从这个私有研究台删除 "${referenceTitle}" 吗？`,
    cancel: "取消",
    confirm: "删除参考",
  };
}

export function seedFallbackMessage(language: Language = "zh") {
  return uiCopy(language).seedFallback;
}

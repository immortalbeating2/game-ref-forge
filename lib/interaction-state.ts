export type MetadataPreviewStatus = "idle" | "loading" | "success" | "failure";

export function metadataPreviewMessage(status: MetadataPreviewStatus) {
  switch (status) {
    case "idle":
      return null;
    case "loading":
      return "Previewing metadata...";
    case "success":
      return "Metadata preview ready. Review the fields before saving.";
    case "failure":
      return "Metadata preview failed. You can still save this reference manually.";
  }
}

export function deleteConfirmationCopy(referenceTitle: string) {
  return {
    title: "Delete reference?",
    body: `Delete "${referenceTitle}" from this private research desk?`,
    cancel: "Cancel",
    confirm: "Delete reference",
  };
}

export function seedFallbackMessage() {
  return "Showing starter examples. Add a private reference to begin using your own dataset.";
}

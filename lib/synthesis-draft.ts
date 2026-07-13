import type {
  SynthesisDetail,
  SynthesisInput,
  SynthesisStatus,
} from "./synthesis";

export type SynthesisDraft = {
  title: string;
  target_asset: string;
  shared_principles: string;
  key_differences: string;
  original_direction: string;
  avoid_copying_notes: string;
  design_constraints: string;
  experiment_plan: string;
  next_actions: string;
  additional_notes: string;
  status: SynthesisStatus;
};

function textValue(value: string | null | undefined) {
  return value ?? "";
}

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createEmptySynthesisDraft(): SynthesisDraft {
  return {
    title: "",
    target_asset: "",
    shared_principles: "",
    key_differences: "",
    original_direction: "",
    avoid_copying_notes: "",
    design_constraints: "",
    experiment_plan: "",
    next_actions: "",
    additional_notes: "",
    status: "draft",
  };
}

export function detailToSynthesisDraft(detail: SynthesisDetail): SynthesisDraft {
  return {
    title: detail.title,
    target_asset: textValue(detail.target_asset),
    shared_principles: textValue(detail.shared_principles),
    key_differences: textValue(detail.key_differences),
    original_direction: textValue(detail.original_direction),
    avoid_copying_notes: textValue(detail.avoid_copying_notes),
    design_constraints: textValue(detail.design_constraints),
    experiment_plan: textValue(detail.experiment_plan),
    next_actions: textValue(detail.next_actions),
    additional_notes: textValue(detail.additional_notes),
    status: detail.status,
  };
}

export function draftToSynthesisInput(draft: SynthesisDraft): SynthesisInput {
  return {
    title: draft.title.trim(),
    target_asset: nullableText(draft.target_asset),
    shared_principles: nullableText(draft.shared_principles),
    key_differences: nullableText(draft.key_differences),
    original_direction: nullableText(draft.original_direction),
    avoid_copying_notes: nullableText(draft.avoid_copying_notes),
    design_constraints: nullableText(draft.design_constraints),
    experiment_plan: nullableText(draft.experiment_plan),
    next_actions: nullableText(draft.next_actions),
    additional_notes: nullableText(draft.additional_notes),
    status: draft.status,
  };
}

function normalizeInput(input: SynthesisInput): SynthesisInput {
  return {
    title: input.title.trim(),
    target_asset: nullableText(input.target_asset ?? ""),
    shared_principles: nullableText(input.shared_principles ?? ""),
    key_differences: nullableText(input.key_differences ?? ""),
    original_direction: nullableText(input.original_direction ?? ""),
    avoid_copying_notes: nullableText(input.avoid_copying_notes ?? ""),
    design_constraints: nullableText(input.design_constraints ?? ""),
    experiment_plan: nullableText(input.experiment_plan ?? ""),
    next_actions: nullableText(input.next_actions ?? ""),
    additional_notes: nullableText(input.additional_notes ?? ""),
    status: input.status,
  };
}

export function isSynthesisDraftDirty(
  draft: SynthesisDraft,
  detail: SynthesisDetail,
) {
  const current = normalizeInput(draftToSynthesisInput(draft));
  const original = normalizeInput({
    title: detail.title,
    target_asset: detail.target_asset,
    shared_principles: detail.shared_principles,
    key_differences: detail.key_differences,
    original_direction: detail.original_direction,
    avoid_copying_notes: detail.avoid_copying_notes,
    design_constraints: detail.design_constraints,
    experiment_plan: detail.experiment_plan,
    next_actions: detail.next_actions,
    additional_notes: detail.additional_notes,
    status: detail.status,
  });

  return JSON.stringify(current) !== JSON.stringify(original);
}

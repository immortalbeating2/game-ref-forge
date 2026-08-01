import type { AssetCategory } from "./reference";

export const REFERENCE_ART_BY_CATEGORY: Record<AssetCategory, string> = {
  character: "/art/reference-character.svg",
  environment: "/art/reference-environment.svg",
  prop: "/art/reference-prop.svg",
  ui_hud: "/art/reference-ui-hud.svg",
  vfx: "/art/reference-vfx.svg",
  material_texture: "/art/reference-material-texture.svg",
  animation: "/art/reference-animation.svg",
  audio: "/art/reference-audio.svg",
};

export function referenceArtFor(category: AssetCategory | string) {
  return (
    REFERENCE_ART_BY_CATEGORY[category as AssetCategory] ??
    "/art/reference-generic.svg"
  );
}

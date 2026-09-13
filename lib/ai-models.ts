// ---------------------------------------------------------------------------
// Centralized AI model metadata & credit pricing.
// Used by the Studio pages (dashboard root & job detail) and the model dropdown.
// ---------------------------------------------------------------------------

export const AI_MODELS = [
  {
    id: "flux-2-pro",
    label: "Flux 2 Pro",
    badge: "Fast",
    description: "Sharp details, fast generation. Best for most icons.",
    costs: { "2K": 1, "4K": 2 },
  },
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    badge: "Hi-Res",
    description: "Premium detail via SeedVR upscale. Slower.",
    costs: { "2K": 3, "4K": 4 },
  },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];

export function getCreditCost(aiModel: AiModelId, quality: string): number {
  const model = AI_MODELS.find((m) => m.id === aiModel);
  if (!model) return 1;
  return model.costs[quality as "2K" | "4K"] ?? 1;
}

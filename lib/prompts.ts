// ---------------------------------------------------------------------------
// Position labels (human-readable, injected into style templates)
// ---------------------------------------------------------------------------

export const POSITION_PROMPTS: Record<string, string> = {
  isometric: "isometric 3D render, perfectly orthographic projection, uniform scale",
  front_facing: "straight-on front view, symmetrical composition, zero degree angle",
  back_facing: "straight-on back view, rear angle, symmetrical",
  side_facing: "pure side profile view, orthogonal side camera",
  three_quarter: "3/4 perspective angle, dynamic three-quarter view exposing front and side",
  top_down: "top-down flat-lay view, bird's eye perspective, perfectly straight from above",
  dimetric: "dimetric 3D render, angled perspective showing subtle depth",
};

// ---------------------------------------------------------------------------
// Master prompt templates — one unique template per style
// Placeholders: {subject}, {position}, {quality}
// Optional color instruction is appended via buildColorClause()
// ---------------------------------------------------------------------------

export type StyleKey = "plastic" | "clay" | "glass" | "plush" | "toy_block" | "metallic";

export const STYLE_MASTER_PROMPTS: Record<StyleKey, string> = {
  plastic:
    "A highly detailed 3D icon of {subject} in a smooth plastic material style, featuring soft reflections, subtle surface highlights and subtle shadow. {position}, clean composition. Rendered with soft, diffused studio lighting, minimal shadows, and a modern aesthetic. Isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  clay:
    "A stylized 3D icon of {subject} made of soft clay material, with slightly imperfect edges and handcrafted texture details. {position}, balanced composition. Rendered with soft lighting to enhance depth and tactile feel. Clean and minimal, isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  glass:
    "A premium 3D icon of {subject} made of translucent glass material, featuring realistic refraction, reflections, and light dispersion. {position}, elegant composition. Rendered with studio lighting to emphasize transparency and highlights. Isolated on a pure white background with a subtle shadow. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  plush:
    "A cute 3D icon of {subject} in a plush fabric style, with soft fibers, fuzzy texture, and rounded shapes. {position}, friendly and playful composition. Rendered with soft lighting and subtle shadow to enhance warmth and depth. Clean background, isolated on pure white. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  toy_block:
    "A playful 3D icon of {subject} in a toy building block style, featuring bold shapes, vibrant colors, and smooth surfaces. {position}, structured composition. Rendered in a clean modern 3D aesthetic with soft lighting and subtle shadow. Isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",

  metallic:
    "A high-end 3D icon of {subject} in a metallic chrome material style, featuring polished surfaces, sharp reflections, realistic highlights and subtle shadow. {position}, strong composition. Rendered with studio lighting to enhance contrast and material depth. Clean and minimal, isolated on a pure white background. {quality}, crystal clear image, rendered in 1:1 aspect ratio format.",
};

// ---------------------------------------------------------------------------
// Master prompt templates for IMAGE-TO-IMAGE (Reference Upload)
// Placeholders: {subject}, {position}, {quality}
// ---------------------------------------------------------------------------

export const STYLE_REF_PROMPTS: Record<StyleKey, string> = {
  plastic:
    "A highly detailed 3D designer toy figure of {subject}. Premium smooth matte plastic material style, reminiscent of collectible blind-box figures. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the core facial identity, specific clothing, and accessories from the reference image, translating them flawlessly into this cute 3D toy style. {position}. Soft diffused studio lighting. Clean composition. (If the user prompts for specific background items or props, include them seamlessly in the 3D style; otherwise, strictly isolate on a pure solid white background #FFFFFF). Remove any unwanted original background completely, zero artifacts. {quality}, crystal clear image.",

  clay:
    "A highly detailed 3D designer toy figure of {subject}. Soft crafted clay material style with slightly imperfect edges and handcrafted texture details. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the core facial identity, specific clothing, and accessories from the reference image, translating them flawlessly into this cute 3D toy style. {position}. Soft lighting to enhance tactile depth. Balanced composition. (If the user prompts for specific background items or props, include them seamlessly in the 3D style; otherwise, strictly isolate on a pure solid white background #FFFFFF). Remove any unwanted original background completely, zero artifacts. {quality}, crystal clear image.",

  glass:
    "A highly detailed 3D designer toy figure of {subject}. Premium translucent glass material style with realistic refraction, reflections, and light dispersion. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the core facial identity, specific clothing, and accessories from the reference image, translating them flawlessly into this cute 3D toy style. {position}. Bright studio lighting to enhance transparency. Elegant composition. (If the user prompts for specific background items or props, include them seamlessly in the 3D style; otherwise, strictly isolate on a pure solid white background #FFFFFF with a subtle shadow). Remove any unwanted original background completely, zero artifacts. {quality}, crystal clear image.",

  plush:
    "A highly detailed 3D designer toy figure of {subject}. Adorable plush fabric style featuring soft fibers, fuzzy texture, and rounded stuffed-toy shapes. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the core facial identity, specific clothing, and accessories from the reference image, translating them flawlessly into this cute 3D plush style. {position}. Soft ambient lighting with subtle shadow. Friendly and playful composition. (If the user prompts for specific background items or props, include them seamlessly in the 3D style; otherwise, strictly isolate on a pure solid white background #FFFFFF). Remove any unwanted original background completely, zero artifacts. {quality}, crystal clear image.",

  toy_block:
    "A highly detailed 3D designer toy figure of {subject}. Playful toy building block style featuring bold geometric shapes, vibrant colors, and smooth interlocking plastic surfaces. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the core facial identity, specific clothing, and accessories from the reference image, translating them flawlessly into this cute 3D block style. {position}. Bright soft lighting. Structured composition. (If the user prompts for specific background items or props, include them seamlessly in the 3D style; otherwise, strictly isolate on a pure solid white background #FFFFFF). Remove any unwanted original background completely, zero artifacts. {quality}, crystal clear image.",

  metallic:
    "A highly detailed 3D designer toy figure of {subject}. High-end metallic chrome material style featuring polished surfaces, sharp reflections, and realistic metallic highlights. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the core facial identity, specific clothing, and accessories from the reference image, translating them flawlessly into this cute 3D metallic style. {position}. Dramatic studio lighting to enhance reflections. Strong composition. (If the user prompts for specific background items or props, include them seamlessly in the 3D style; otherwise, strictly isolate on a pure solid white background #FFFFFF). Remove any unwanted original background completely, zero artifacts. {quality}, crystal clear image.",
};

// ---------------------------------------------------------------------------
// REFINE prompt templates for Image Refine with user instructions
// Flexibly transforming objects/forms but maintaining isolated icon style
// Placeholders: {subject}, {position}, {quality}
// ---------------------------------------------------------------------------

export const STYLE_REFINE_PROMPTS: Record<StyleKey, string> = {
  plastic:
    "Transform the reference image based on this request: '{subject}'. Render the final result as a highly detailed 3D designer toy figure in a premium smooth matte plastic material style, reminiscent of collectible blind-box figures. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the overall identity of the reference image while strictly applying the requested changes. {position}. Soft diffused studio lighting. Clean composition. (If the user request includes specific background items or props, include them seamlessly; otherwise, strictly isolate on a pure solid white background #FFFFFF). Zero background noise, no artifacts. {quality}.",

  clay:
    "Transform the reference image based on this request: '{subject}'. Render the final result as a highly detailed 3D designer toy figure in a soft crafted clay material style with slightly imperfect edges and handcrafted texture details. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the overall identity of the reference image while strictly applying the requested changes. {position}. Soft lighting to enhance tactile depth. Balanced composition. (If the user request includes specific background items or props, include them seamlessly; otherwise, strictly isolate on a pure solid white background #FFFFFF). Zero background noise, no artifacts. {quality}.",

  glass:
    "Transform the reference image based on this request: '{subject}'. Render the final result as a highly detailed 3D designer toy figure in a premium translucent glass material style, featuring realistic refraction, reflections, and light dispersion. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the overall identity of the reference image while strictly applying the requested changes. {position}. Bright studio lighting to enhance transparency. Elegant composition. (If the user request includes specific background items or props, include them seamlessly; otherwise, strictly isolate on a pure solid white background #FFFFFF with a subtle shadow). Zero background noise, no artifacts. {quality}.",

  plush:
    "Transform the reference image based on this request: '{subject}'. Render the final result as a highly detailed 3D designer toy figure in an adorable plush fabric style, featuring soft fibers, fuzzy texture, and rounded stuffed-toy shapes. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the overall identity of the reference image while strictly applying the requested changes. {position}. Soft ambient lighting with subtle shadow. Friendly and playful composition. (If the user request includes specific background items or props, include them seamlessly; otherwise, strictly isolate on a pure solid white background #FFFFFF). Zero background noise, no artifacts. {quality}.",

  toy_block:
    "Transform the reference image based on this request: '{subject}'. Render the final result as a highly detailed 3D designer toy figure in a playful toy building block style, featuring bold geometric shapes, vibrant colors, and smooth interlocking plastic surfaces. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the overall identity of the reference image while strictly applying the requested changes. {position}. Bright soft lighting. Structured composition. (If the user request includes specific background items or props, include them seamlessly; otherwise, strictly isolate on a pure solid white background #FFFFFF). Zero background noise, no artifacts. {quality}.",

  metallic:
    "Transform the reference image based on this request: '{subject}'. Render the final result as a highly detailed 3D designer toy figure in a high-end metallic chrome material style, featuring polished surfaces, sharp reflections, and realistic metallic highlights. Stylized cute proportions: slightly larger head-to-body ratio, soft rounded appealing features, subtly chubby but anatomically clean and structurally proportional (not distorted). Maintain the overall identity of the reference image while strictly applying the requested changes. {position}. Dramatic studio lighting to enhance reflections. Strong composition. (If the user request includes specific background items or props, include them seamlessly; otherwise, strictly isolate on a pure solid white background #FFFFFF). Zero background noise, no artifacts. {quality}.",
};

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

/**
 * Builds an optional color instruction appended to all prompts.
 * Returns an empty string when color is null/undefined.
 */
function buildColorClause(color: string | null | undefined): string {
  if (!color) return "";
  return ` The dominant color scheme must be ${color}, apply this color to the main material and surface of the subject.`;
}

function buildMultiplePeopleClause(keepMultiplePeople?: boolean): string {
  if (!keepMultiplePeople) return "";
  return " CRITICAL INSTRUCTION: The reference image features multiple people. You MUST preserve, include, and render ALL individuals present in the original image. Maintain the group dynamic and do not simplify to a single character. Group composition.";
}

export function buildEngineeredPrompt(
  userPrompt: string,
  style: StyleKey,
  position: string,
  quality: string,
  color?: string | null
): string {
  const positionLabel = POSITION_PROMPTS[position] ?? position;
  const template = STYLE_MASTER_PROMPTS[style];
  const base = template
    .replace("{subject}", userPrompt)
    .replace("{position}", positionLabel)
    .replace("{quality}", quality);
  return base + buildColorClause(color);
}

export function buildRefEngineeredPrompt(
  userPrompt: string | undefined | null,
  style: StyleKey,
  position: string,
  quality: string,
  color?: string | null,
  keepMultiplePeople?: boolean
): string {
  // Graceful fallback for empty inputs
  const rawSubject = userPrompt?.trim() || "";
  const finalSubject = rawSubject !== ""
    ? rawSubject
    : "the exact main subject from the provided reference image";

  // Re-map position parameter
  const positionLabel = POSITION_PROMPTS[position] ?? position;
  const template = STYLE_REF_PROMPTS[style];

  const base = template
    .replace("{subject}", finalSubject)
    .replace("{position}", positionLabel)
    .replace("{quality}", quality);
  return base + buildColorClause(color) + buildMultiplePeopleClause(keepMultiplePeople);
}

export function buildRefineEngineeredPrompt(
  userPrompt: string | undefined | null,
  style: StyleKey,
  position: string,
  quality: string,
  color?: string | null
): string {
  const finalSubject = userPrompt?.trim() || "Enhance details";
  const positionLabel = POSITION_PROMPTS[position] ?? position;
  const template = STYLE_REFINE_PROMPTS[style];

  const base = template
    .replace("{subject}", finalSubject)
    .replace("{position}", positionLabel)
    .replace("{quality}", quality);
  return base + buildColorClause(color);
}

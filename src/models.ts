import type { ModelDefinition } from "./types.js";

// Synced with the public aliases in upres.ai server/contract/models.ts.
// A job names one alias. Which backend serves it is ours to choose and can
// change without notice — that is how a failing vendor stops being your outage.
// Aliases with max scale 1 do not enlarge; the API stores scale 1 for them.

function scaleParam(maxScale: number): ModelDefinition["params"] {
  if (maxScale <= 1) return [];
  const options: number[] = [];
  for (let step = 2; step <= maxScale; step *= 2) options.push(step);
  return [
    {
      name: "scale",
      type: "integer",
      required: false,
      default: 4,
      options,
      description: "Scale multiplier. Ignored when the alias does not enlarge.",
    },
  ];
}

function model(
  id: string,
  name: string,
  description: string,
  category: ModelDefinition["category"],
  inputTypes: string[],
  maxScale: number,
): ModelDefinition {
  const fileParam =
    category.startsWith("video")
      ? { name: "video", type: "string" as const, required: true, description: "Video URL or file" }
      : category.startsWith("audio")
        ? { name: "audio", type: "string" as const, required: true, description: "Audio URL or file" }
        : { name: "image", type: "string" as const, required: true, description: "Image URL or file" };
  return {
    id,
    name,
    description,
    category,
    price: "One credit per stage that runs",
    inputTypes,
    params: [fileParam, ...scaleParam(maxScale)],
  };
}

export const MODELS: ModelDefinition[] = [
  model("flare", "Flare", "Everyday photos, 2x-4x. Fastest and cheapest. Does not invent detail.", "image-upscale", ["image/*"], 4),
  model("prism", "Prism", "Text, logos, screenshots and product shots. Keeps edges true, does not invent detail.", "image-upscale", ["image/*"], 4),
  model("lumen", "Lumen", "Maximum detail recovery for print, up to 8x. Slower and dearer than Flare.", "image-upscale", ["image/*"], 8),
  model("mirage", "Mirage", "Invents plausible new detail rather than recovering what was there. Good for art, wrong for documents.", "image-upscale", ["image/*"], 8),
  model("hush", "Hush", "Faithful denoise. Same size as the source, nothing invented.", "image-clean", ["image/*"], 1),
  model("keen", "Keen", "Deblur and sharpen. Same size as the source, does not invent texture.", "image-restore", ["image/*"], 1),
  model("visage", "Visage", "Restores faces and leaves the rest of the frame alone. Does not enlarge.", "image-restore", ["image/*"], 1),
  model("atelier", "Atelier", "Hush, then Visage if the photo looks like a portrait, then Lumen. A skipped face stage is free.", "image-studio", ["image/*"], 8),
  model("motion", "Motion", "Fast 4K finish for AI-generated video. Frame-consistent, does not invent faces.", "video-upscale", ["video/*"], 4),
  model("motion-x", "Motion X", "Cinema-grade video upscale. Noticeably slower and dearer per second than Motion.", "video-upscale", ["video/*"], 4),
  model("still", "Still", "Temporal video denoise. Resolution stays put.", "video-clean", ["video/*"], 1),
  model("cadence", "Cadence", "Frame interpolation. Does not enlarge the picture.", "video-restore", ["video/*"], 1),
  model("atelier-x", "Atelier X", "Still, then Motion X. Two credits.", "video-studio", ["video/*"], 4),
  model("voice", "Voice", "Speech denoise and bandwidth extension to 48 kHz. Not for music.", "audio-clean", ["audio/*"], 1),
];

export const IMAGE_MODELS = MODELS.filter((m) => m.category.startsWith("image"));
export const VIDEO_MODELS = MODELS.filter((m) => m.category.startsWith("video"));
export const AUDIO_MODELS = MODELS.filter((m) => m.category.startsWith("audio"));
export const DEFAULT_IMAGE_MODEL = "flare";
export const DEFAULT_VIDEO_MODEL = "motion";
export const DEFAULT_AUDIO_MODEL = "voice";

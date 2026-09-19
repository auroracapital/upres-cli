import type { ModelDefinition } from "./types.js";

// Synced with https://api.upres.ai/v1/openapi.json (spec v1.1.0).
// A job names one of six models. Which backend serves a model is ours to
// choose and can change without notice — that is how a failing vendor
// stops being your outage.
export const MODELS: ModelDefinition[] = [
  {
    id: "flare",
    name: "Flare",
    description: "Everyday photos, 2x-4x. Fastest and cheapest. Does not invent detail.",
    category: "image-upscale",
    price: "Included in plan quota",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or file" },
      { name: "scale", type: "integer", required: false, default: 4, options: [2, 4], description: "Scale multiplier" },
    ],
  },
  {
    id: "prism",
    name: "Prism",
    description: "Text, logos, screenshots and product shots. Keeps edges true, does not invent detail.",
    category: "image-upscale",
    price: "Included in plan quota",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or file" },
      { name: "scale", type: "integer", required: false, default: 4, options: [2, 4], description: "Scale multiplier" },
    ],
  },
  {
    id: "lumen",
    name: "Lumen",
    description: "Maximum detail recovery for print, up to 8x. Slower and dearer than Flare.",
    category: "image-upscale",
    price: "Included in plan quota",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or file" },
      { name: "scale", type: "integer", required: false, default: 4, options: [2, 4, 8], description: "Scale multiplier" },
    ],
  },
  {
    id: "mirage",
    name: "Mirage",
    description: "Invents plausible new detail rather than recovering what was there. Most dramatic, least faithful. Good for art, wrong for documents.",
    category: "image-enhance",
    price: "Included in plan quota",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or file" },
      { name: "scale", type: "integer", required: false, default: 4, options: [2, 4, 8], description: "Scale multiplier" },
    ],
  },
  {
    id: "motion",
    name: "Motion",
    description: "Fast 4K finish for AI-generated video (Sora, Kling, Runway). Frame-consistent, does not invent faces.",
    category: "video-upscale",
    price: "Counts against monthly video minutes",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL or file" },
      { name: "scale", type: "integer", required: false, default: 4, options: [2, 4], description: "Scale multiplier" },
    ],
  },
  {
    id: "motion-x",
    name: "Motion X",
    description: "Cinema-grade video upscale for film and commercials. Noticeably slower and dearer per second than Motion.",
    category: "video-upscale",
    price: "Counts against monthly video minutes",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL or file" },
      { name: "scale", type: "integer", required: false, default: 4, options: [2, 4], description: "Scale multiplier" },
    ],
  },
];

export const IMAGE_MODELS = MODELS.filter((m) => m.category !== "video-upscale");
export const VIDEO_MODELS = MODELS.filter((m) => m.category === "video-upscale");
export const DEFAULT_IMAGE_MODEL = "flare";
export const DEFAULT_VIDEO_MODEL = "motion";

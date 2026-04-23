import type { ModelDefinition } from "./types.js";

export const MODELS: ModelDefinition[] = [
  {
    id: "wavespeed-ai/real-esrgan",
    name: "Real-ESRGAN",
    description: "Fast image super-resolution with artifact removal. Best value.",
    category: "image-upscale",
    price: "$0.0024/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL" },
    ],
  },
  {
    id: "wavespeed-ai/image-upscaler",
    name: "Image Upscaler",
    description: "AI upscaler to 2K/4K/8K with detail preservation.",
    category: "image-upscale",
    price: "$0.01/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL" },
      { name: "target_resolution", type: "string", required: false, default: "4k", options: ["2k", "4k", "8k"], description: "Target output resolution" },
      { name: "output_format", type: "string", required: false, default: "jpeg", options: ["jpeg", "png", "webp"], description: "Output format" },
    ],
  },
  {
    id: "wavespeed-ai/ultimate-image-upscaler",
    name: "Ultimate Image Upscaler",
    description: "Most advanced AI enhancer. Reimagines fine detail at 2K/4K/8K.",
    category: "image-upscale",
    price: "$0.01/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL" },
      { name: "target_resolution", type: "string", required: false, default: "4k", options: ["2k", "4k", "8k"], description: "Target output resolution" },
      { name: "output_format", type: "string", required: false, default: "jpeg", options: ["jpeg", "png", "webp"], description: "Output format" },
    ],
  },
  {
    id: "wavespeed-ai/seedvr2/image",
    name: "SeedVR2 Image",
    description: "ByteDance SeedVR2 architecture for sharp, detailed upscaling.",
    category: "image-upscale",
    price: "$0.01/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL" },
      { name: "target_resolution", type: "string", required: false, default: "4k", options: ["2k", "4k", "8k"], description: "Target output resolution" },
      { name: "output_format", type: "string", required: false, default: "jpeg", options: ["jpeg", "png", "webp"], description: "Output format" },
    ],
  },
  {
    id: "bria/increase-resolution",
    name: "Bria Increase Resolution",
    description: "Preservation-first 2x/4x upscale. No content drift.",
    category: "image-upscale",
    price: "$0.04/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL. Max output 8192x8192" },
      { name: "desired_increase", type: "integer", required: false, default: 2, options: [2, 4], description: "Resolution multiplier" },
    ],
  },
  {
    id: "clarity-ai/crystal-upscaler",
    name: "Crystal Upscaler",
    description: "Upscale to target megapixels with creativity control.",
    category: "image-upscale",
    price: "Pay per use",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL" },
      { name: "target_megapixels", type: "number", required: false, default: 2, range: "1-200", description: "Target size in megapixels" },
      { name: "creativity", type: "number", required: false, default: 0, range: "0-10", description: "Quality improvement strength" },
    ],
  },
  {
    id: "recraft-ai/recraft-crisp-upscale",
    name: "Recraft Crisp Upscale",
    description: "Enhances textures and facial features. Ideal for portraits.",
    category: "image-enhance",
    price: "Pay per use",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or base64" },
    ],
  },
  {
    id: "recraft-ai/recraft-creative-upscale",
    name: "Recraft Creative Upscale",
    description: "Generative enhancement adding depth and polish to complex elements.",
    category: "image-enhance",
    price: "$0.25/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or base64" },
    ],
  },
  {
    id: "wavespeed-ai/phota/enhance",
    name: "Phota Enhance",
    description: "Batch enhancement up to 4 images per run with optional 4K output.",
    category: "image-enhance",
    price: "$0.09/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Image URL or base64 data URI" },
      { name: "num_images", type: "integer", required: false, default: 1, range: "1-4", description: "Enhanced variations to generate" },
      { name: "output_format", type: "string", required: false, default: "jpeg", options: ["jpeg", "png", "webp"], description: "Output format" },
    ],
  },
  {
    id: "wavespeed-ai/z-image-turbo/image-to-image",
    name: "Z-Image Turbo",
    description: "Fast enhance with strength control. Low strength = subtle upscale.",
    category: "image-enhance",
    price: "$0.01/image",
    inputTypes: ["image/*"],
    params: [
      { name: "image", type: "string", required: true, description: "Reference image URL" },
      { name: "prompt", type: "string", required: true, description: "Enhancement prompt", default: "enhance image quality, sharp details" },
      { name: "strength", type: "number", required: false, default: 0.2, range: "0.00-1.00", description: "0-0.3 subtle enhance, 0.3-0.6 moderate, 0.6+ creative" },
      { name: "size", type: "string", required: false, default: "1024*1024", description: "Output size (width*height)" },
      { name: "seed", type: "integer", required: false, default: -1, range: "-1-2147483647", description: "Random seed. -1 = random" },
      { name: "output_format", type: "string", required: false, default: "jpeg", options: ["jpeg", "png", "webp"], description: "Output format" },
    ],
  },
  {
    id: "wavespeed-ai/video-upscaler",
    name: "Video Upscaler",
    description: "Fast AI video upscaling to 720p-4K. Best value for video.",
    category: "video-upscale",
    price: "$0.005-0.02/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL. Max 10 minutes" },
      { name: "target_resolution", type: "string", required: false, default: "1080p", options: ["720p", "1080p", "2k", "4k"], description: "Target resolution" },
    ],
  },
  {
    id: "wavespeed-ai/video-upscaler-pro",
    name: "Video Upscaler Pro",
    description: "Motion-aware processing with artifact cleanup for pro results.",
    category: "video-upscale",
    price: "$0.03-0.05/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL. Max 10 minutes" },
      { name: "target_resolution", type: "string", required: false, default: "1080p", options: ["720p", "1080p", "2k", "4k"], description: "Target resolution" },
    ],
  },
  {
    id: "wavespeed-ai/ultimate-video-upscaler",
    name: "Ultimate Video Upscaler",
    description: "Deep learning detail reconstruction for highest quality 4K video.",
    category: "video-upscale",
    price: "$0.02-0.08/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL. Max 10 minutes" },
      { name: "target_resolution", type: "string", required: false, default: "1080p", options: ["720p", "1080p", "2k", "4k"], description: "Target resolution" },
    ],
  },
  {
    id: "wavespeed-ai/seedvr2/video",
    name: "SeedVR2 Video",
    description: "16B param ByteDance model. Highest fidelity with frame consistency.",
    category: "video-upscale",
    price: "$0.02-0.05/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL. Max 10 minutes" },
      { name: "target_resolution", type: "string", required: false, default: "1080p", options: ["720p", "1080p", "2k", "4k"], description: "Target resolution" },
    ],
  },
  {
    id: "bytedance/video-upscaler",
    name: "ByteDance Video Upscaler",
    description: "ByteDance super-resolution recovering fine detail to 4K.",
    category: "video-upscale",
    price: "$0.007-0.029/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL" },
      { name: "target_resolution", type: "string", required: false, default: "1080p", options: ["1080p", "2k", "4k"], description: "Target resolution" },
    ],
  },
  {
    id: "bria/fibo/video-upscaler",
    name: "Bria Video Upscaler",
    description: "Temporal consistency with multiple output codec options.",
    category: "video-upscale",
    price: "$0.14/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL" },
      { name: "target_resolution", type: "string", required: false, default: "2k", options: ["2k", "4k"], description: "Target resolution" },
      { name: "output_container_and_codec", type: "string", required: false, default: "mp4_h264", options: ["webm_vp9", "mp4_h264", "mp4_h265", "mov_h265", "mov_prores4s", "mkv_h264", "mkv_h265", "mkv_vp9", "gif"], description: "Output container and codec" },
    ],
  },
  {
    id: "runwayml/upscale-v1",
    name: "RunwayML Upscale",
    description: "Simple one-click video upscale to 4K by RunwayML.",
    category: "video-upscale",
    price: "$0.02/sec",
    inputTypes: ["video/*"],
    params: [
      { name: "video", type: "string", required: true, description: "Video URL. Max 10 minutes" },
    ],
  },
];

export const IMAGE_MODELS = MODELS.filter((m) => m.category !== "video-upscale");
export const VIDEO_MODELS = MODELS.filter((m) => m.category === "video-upscale");
export const DEFAULT_IMAGE_MODEL = "wavespeed-ai/image-upscaler";
export const DEFAULT_VIDEO_MODEL = "wavespeed-ai/video-upscaler";

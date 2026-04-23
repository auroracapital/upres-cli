// Auto-generated from https://api.upres.ai/v1/openapi.json

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type ModelCategory = "image-upscale" | "image-enhance" | "video-upscale";

export interface Job {
  id: string;
  status: JobStatus;
  model: string;
  scale: number;
  result_url: string | null;
  error: string | null;
  original_filename: string;
  created_at: string;
  updated_at: string;
}

export interface JobCreateRequest {
  image_url?: string;
  model?: string;
  scale?: number;
}

export interface JobListResponse {
  data: Job[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ApiError {
  error: string;
  quota?: number;
  used?: number;
}

export interface ModelParam {
  name: string;
  type: "string" | "number" | "integer" | "boolean";
  required: boolean;
  description: string;
  default?: string | number | boolean;
  options?: (string | number)[];
  range?: string;
}

export interface ModelDefinition {
  id: string;
  name: string;
  description: string;
  category: ModelCategory;
  price: string;
  inputTypes: string[];
  params: ModelParam[];
}

export interface UpresConfig {
  apiKey?: string;
  baseUrl?: string;
}

export interface UpscaleOptions {
  model?: string;
  scale?: number;
  resolution?: string;
  output?: string;
  wait?: boolean;
}

export interface BatchOptions extends UpscaleOptions {
  concurrency?: number;
}

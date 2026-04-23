import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Job, JobCreateRequest, JobListResponse, UpresConfig } from "./types.js";

const DEFAULT_BASE_URL = "https://api.upres.ai/v1";
const CONFIG_PATH = path.join(os.homedir(), ".config", "upres", "config.json");
const TUS_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
const LARGE_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB

function loadConfigFile(): Partial<UpresConfig> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch {
    // ignore
  }
  return {};
}

function resolveApiKey(override?: string): string {
  const key = override ?? process.env.UPRES_API_KEY ?? loadConfigFile().apiKey;
  if (!key) {
    console.error(
      "Error: No API key found.\n" +
        "  Set UPRES_API_KEY env var, pass --api-key, or save to ~/.config/upres/config.json\n" +
        "  Get a key at https://upres.ai/account/api-keys"
    );
    process.exit(1);
  }
  return key;
}

export class UpresClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: UpresConfig = {}) {
    this.apiKey = resolveApiKey(config.apiKey);
    this.baseUrl = config.baseUrl ?? process.env.UPRES_BASE_URL ?? DEFAULT_BASE_URL;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string; quota?: number; used?: number };
      if (res.status === 401) {
        console.error(`Error: Invalid API key. Get a new key at https://upres.ai/account/api-keys`);
        process.exit(1);
      }
      if (res.status === 402) {
        console.error(
          `Error: Monthly quota exceeded (used ${err.used ?? "?"}/${err.quota ?? "?"}).\n` +
            `  Upgrade to Business tier at https://upres.ai/pricing`
        );
        process.exit(1);
      }
      if (res.status === 429) {
        console.error(`Error: Rate limit exceeded (60 req/min). Wait a moment and retry.`);
        process.exit(1);
      }
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  /** Upload a file using TUS resumable protocol for files >50MB */
  private async tusUpload(filePath: string, filename: string): Promise<string> {
    const fileSize = fs.statSync(filePath).size;

    // Create TUS upload
    const createRes = await fetch(`${this.baseUrl.replace("/v1", "")}/api/tus`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Tus-Resumable": "1.0.0",
        "Upload-Length": String(fileSize),
        "Upload-Metadata": `filename ${Buffer.from(filename).toString("base64")}`,
        "Content-Length": "0",
      },
    });

    if (!createRes.ok) {
      throw new Error(`TUS create failed: HTTP ${createRes.status}`);
    }

    const uploadUrl = createRes.headers.get("Location");
    if (!uploadUrl) throw new Error("TUS server did not return upload URL");

    // Upload in chunks
    const stream = fs.createReadStream(filePath, { highWaterMark: TUS_CHUNK_SIZE });
    let offset = 0;

    for await (const chunk of stream) {
      const patchRes = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Tus-Resumable": "1.0.0",
          "Content-Type": "application/offset+octet-stream",
          "Upload-Offset": String(offset),
          "Content-Length": String((chunk as Buffer).length),
        },
        body: chunk as Buffer,
      });
      if (!patchRes.ok) throw new Error(`TUS patch failed at offset ${offset}: HTTP ${patchRes.status}`);
      offset += (chunk as Buffer).length;
    }

    // Extract upload ID from URL and return as accessible URL
    const uploadId = uploadUrl.split("/").pop();
    return `${this.baseUrl.replace("/v1", "")}/api/tus/${uploadId}`;
  }

  async createJobFromFile(filePath: string, options: { model?: string; scale?: number } = {}): Promise<Job> {
    const filename = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;

    if (fileSize > LARGE_FILE_THRESHOLD) {
      console.log(`File is ${(fileSize / 1024 / 1024).toFixed(1)}MB — using resumable TUS upload...`);
      const uploadedUrl = await this.tusUpload(filePath, filename);
      return this.createJobFromUrl(uploadedUrl, options);
    }

    const form = new FormData();
    const fileBlob = new Blob([fs.readFileSync(filePath)]);
    form.append("image", fileBlob, filename);
    if (options.model) form.append("model", options.model);
    if (options.scale) form.append("scale", String(options.scale));

    return this.request<Job>("POST", "/jobs", form);
  }

  async createJobFromUrl(imageUrl: string, options: { model?: string; scale?: number } = {}): Promise<Job> {
    const body: JobCreateRequest = {
      image_url: imageUrl,
      ...(options.model && { model: options.model }),
      ...(options.scale && { scale: options.scale }),
    };
    return this.request<Job>("POST", "/jobs", body);
  }

  async getJob(id: string): Promise<Job> {
    return this.request<Job>("GET", `/jobs/${id}`);
  }

  async listJobs(params: {
    status?: string;
    model?: string;
    limit?: number;
    cursor?: string;
    before?: string;
    after?: string;
  } = {}): Promise<JobListResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.model) qs.set("model", params.model);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.cursor) qs.set("cursor", params.cursor);
    if (params.before) qs.set("before", params.before);
    if (params.after) qs.set("after", params.after);
    const query = qs.toString() ? `?${qs}` : "";
    return this.request<JobListResponse>("GET", `/jobs${query}`);
  }

  async waitForJob(id: string, { pollInterval = 2000, timeout = 300000 } = {}): Promise<Job> {
    const start = Date.now();
    while (true) {
      const job = await this.getJob(id);
      if (job.status === "completed" || job.status === "failed") return job;
      if (Date.now() - start > timeout) throw new Error(`Timeout waiting for job ${id}`);
      await new Promise((r) => setTimeout(r, pollInterval));
    }
  }

  async downloadResult(job: Job, outputPath: string): Promise<void> {
    if (!job.result_url) throw new Error("Job has no result URL");
    const res = await fetch(job.result_url);
    if (!res.ok) throw new Error(`Failed to download result: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buf);
  }
}

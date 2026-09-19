#!/usr/bin/env node
/**
 * UpRes MCP stdio server. Speaks JSON-RPC over stdin/stdout so Claude,
 * Cursor, and Hermes can upscale without a browser.
 *
 *   UPRES_API_KEY=upres_... npx upres-cli mcp
 *   claude mcp add upres -- npx -y upres-cli mcp
 */
import { MODELS } from "./models.js";

const VERSION = "0.2.0";
const DEFAULT_BASE_URL = "https://api.upres.ai/v1";

type Json = Record<string, unknown>;

function apiKey(): string {
  return process.env.UPRES_API_KEY ?? "";
}

function baseUrl(): string {
  return process.env.UPRES_BASE_URL ?? DEFAULT_BASE_URL;
}

async function api<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
  const key = apiKey();
  if (!key) {
    throw new Error("UPRES_API_KEY is not set. Get a key at https://upres.ai/account/api-keys");
  }
  const res = await fetch(`${baseUrl()}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

const TOOLS = [
  {
    name: "upres_list_models",
    description:
      "List UpRes upscale models (flare, prism, lumen, mirage, motion, motion-x) with use cases.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "upres_get_credits",
    description: "Show recent job count for the authenticated UpRes API key as a quota proxy.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "upres_upscale_image",
    description: "Submit an image upscale job from a public URL. Models: flare, prism, lumen, mirage.",
    inputSchema: {
      type: "object",
      properties: {
        image_url: { type: "string", description: "Public HTTPS URL of the image" },
        model: {
          type: "string",
          enum: ["flare", "prism", "lumen", "mirage"],
          description: "Image model. Default flare.",
        },
        scale: { type: "integer", enum: [2, 4, 8], description: "Scale multiplier. Default 4." },
      },
      required: ["image_url"],
      additionalProperties: false,
    },
  },
  {
    name: "upres_upscale_video",
    description: "Submit a video upscale job from a public URL. Models: motion, motion-x.",
    inputSchema: {
      type: "object",
      properties: {
        video_url: { type: "string", description: "Public HTTPS URL of the video" },
        model: {
          type: "string",
          enum: ["motion", "motion-x"],
          description: "Video model. Default motion.",
        },
        scale: { type: "integer", enum: [2, 4], description: "Scale multiplier. Default 4." },
      },
      required: ["video_url"],
      additionalProperties: false,
    },
  },
  {
    name: "upres_get_job",
    description: "Get status and result_url of an UpRes job by id.",
    inputSchema: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "Job UUID returned by an upscale tool" },
      },
      required: ["job_id"],
      additionalProperties: false,
    },
  },
];

function ok(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function fail(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function text(obj: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] };
}

async function callTool(name: string, args: Json): Promise<unknown> {
  switch (name) {
    case "upres_list_models":
      return text(
        MODELS.map((m) => ({
          id: m.id,
          name: m.name,
          category: m.category,
          description: m.description,
        })),
      );
    case "upres_get_credits": {
      const jobs = await api<{ data: { status: string }[] }>("GET", "/jobs?limit=100");
      const data = jobs.data ?? [];
      return text({
        recent_jobs: data.length,
        completed: data.filter((j) => j.status === "completed").length,
        pricing: "https://upres.ai/pricing",
      });
    }
    case "upres_upscale_image": {
      const image_url = String(args.image_url ?? "");
      if (!image_url) throw new Error("image_url is required");
      const job = await api("POST", "/jobs", {
        image_url,
        model: args.model ?? "flare",
        scale: args.scale ?? 4,
      });
      return text(job);
    }
    case "upres_upscale_video": {
      const video_url = String(args.video_url ?? "");
      if (!video_url) throw new Error("video_url is required");
      const job = await api("POST", "/jobs", {
        image_url: video_url,
        model: args.model ?? "motion",
        scale: args.scale ?? 4,
      });
      return text(job);
    }
    case "upres_get_job": {
      const job_id = String(args.job_id ?? "");
      if (!job_id) throw new Error("job_id is required");
      const job = await api("GET", `/jobs/${job_id}`);
      return text(job);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function handle(msg: Json): Promise<Json | null> {
  const id = msg.id;
  const method = String(msg.method ?? "");
  if (msg.jsonrpc !== "2.0") return fail(id, -32600, "Invalid Request");

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "upres", version: VERSION },
    });
  }
  if (method === "notifications/initialized" || method === "initialized") return null;
  if (method === "ping") return ok(id, {});
  if (method === "tools/list") return ok(id, { tools: TOOLS });
  if (method === "tools/call") {
    const params = (msg.params ?? {}) as Json;
    const name = String(params.name ?? "");
    const args = (params.arguments ?? {}) as Json;
    try {
      return ok(id, await callTool(name, args));
    } catch (e) {
      return ok(id, {
        isError: true,
        content: [{ type: "text", text: (e as Error).message }],
      });
    }
  }
  if (id === undefined) return null;
  return fail(id, -32601, `Method not found: ${method}`);
}

export async function handleMessage(msg: Json): Promise<Json | null> {
  return handle(msg);
}

export function startStdio(): void {
  let buf = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", async (chunk: string) => {
    buf += chunk;
    while (true) {
      const nl = buf.indexOf("\n");
      if (nl < 0) break;
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      let msg: Json;
      try {
        msg = JSON.parse(line) as Json;
      } catch {
        continue;
      }
      const reply = await handle(msg);
      if (reply) process.stdout.write(JSON.stringify(reply) + "\n");
    }
  });
}

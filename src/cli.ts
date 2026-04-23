#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { UpresClient } from "./client.js";
import { MODELS, DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL } from "./models.js";

const VERSION = "0.1.0";

function parseArgs(argv: string[]): { command: string; args: string[]; flags: Record<string, string | boolean> } {
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};
  let i = 0;
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = true;
        i++;
      }
    } else {
      args.push(a);
      i++;
    }
  }
  return { command: args[0] ?? "", args: args.slice(1), flags };
}

function printHelp(): void {
  console.log(`
upres-cli v${VERSION} — AI image & video upscaling

USAGE
  upres <command> [options]

COMMANDS
  upscale <file|url>   Upscale a single image or video
  batch <dir>          Upscale all images in a directory
  models               List available models
  jobs                 List recent jobs
  account              Show quota and plan info
  version              Print version

OPTIONS
  --model <id>         Model ID (default: wavespeed-ai/image-upscaler)
  --scale <n>          Scale factor 2-8 (image only, default: 4)
  --resolution <res>   Target resolution: 2k, 4k, 8k, 720p, 1080p (default: 4k)
  --output <path>      Output file or directory
  --api-key <key>      API key (or set UPRES_API_KEY env var)
  --wait               Wait for job to complete (default: true)
  --no-wait            Return job ID immediately without polling
  --concurrency <n>    Parallel jobs for batch (default: 3)
  --limit <n>          Number of jobs to list (default: 20)
  --status <s>         Filter jobs by status
  --help               Show help

EXAMPLES
  upres upscale photo.jpg --model real-esrgan --scale 4
  upres upscale photo.jpg --model wavespeed-ai/image-upscaler --resolution 8k --output out.jpg
  upres batch ./photos/ --model wavespeed-ai/real-esrgan --output ./upscaled/
  upres models
  upres jobs --limit 10 --status completed
  upres account

API KEY
  1. Get a free key at https://upres.ai/account/api-keys
  2. Export: UPRES_API_KEY=upres_yourkey
  3. Or save: echo '{"apiKey":"upres_yourkey"}' > ~/.config/upres/config.json

PRICING
  Free: 5 ops/month
  Pro:  $19/month — 100 ops, HD output, no watermark
  Biz:  $49/month — unlimited + batch API + all models

  https://upres.ai/pricing
`);
}

function resolveModel(modelArg: string | undefined, filePath: string): string {
  if (modelArg) {
    // Allow short aliases like "real-esrgan"
    const found = MODELS.find(
      (m) => m.id === modelArg || m.id.endsWith(`/${modelArg}`) || m.name.toLowerCase() === modelArg.toLowerCase()
    );
    return found?.id ?? modelArg;
  }
  const ext = path.extname(filePath).toLowerCase();
  const videoExts = [".mp4", ".mov", ".avi", ".mkv", ".webm", ".gif"];
  return videoExts.includes(ext) ? DEFAULT_VIDEO_MODEL : DEFAULT_IMAGE_MODEL;
}

function resolveOutputPath(input: string, outputDir: string | undefined): string {
  const ext = path.extname(input);
  const base = path.basename(input, ext);
  const outExt = ext || ".jpg";
  if (outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    return path.join(outputDir, `${base}_upscaled${outExt}`);
  }
  const dir = path.dirname(input);
  return path.join(dir, `${base}_upscaled${outExt}`);
}

async function cmdUpscale(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const input = args[0];
  if (!input) {
    console.error("Usage: upres upscale <file|url> [options]");
    process.exit(1);
  }

  const client = new UpresClient({ apiKey: flags["api-key"] as string });
  const model = resolveModel(flags.model as string | undefined, input);
  const scale = flags.scale ? Number(flags.scale) : 4;
  const resolution = (flags.resolution as string) ?? "4k";
  const outputPath = flags.output as string | undefined;
  const noWait = flags["no-wait"] === true;

  const isUrl = input.startsWith("http://") || input.startsWith("https://");
  const isFile = !isUrl && fs.existsSync(input);

  if (!isUrl && !isFile) {
    console.error(`Error: File not found: ${input}`);
    process.exit(1);
  }

  process.stdout.write(`Submitting job... model=${model}\n`);

  let job = isFile
    ? await client.createJobFromFile(input, { model, scale })
    : await client.createJobFromUrl(input, { model, scale });

  console.log(`Job created: ${job.id} (status: ${job.status})`);

  if (noWait) {
    console.log(`Run "upres jobs" to check status.`);
    return;
  }

  process.stdout.write("Waiting for result");
  const interval = setInterval(() => process.stdout.write("."), 1500);
  try {
    job = await client.waitForJob(job.id);
  } finally {
    clearInterval(interval);
    process.stdout.write("\n");
  }

  if (job.status === "failed") {
    console.error(`Job failed: ${job.error ?? "Unknown error"}`);
    process.exit(1);
  }

  const out = outputPath ?? (isFile ? resolveOutputPath(input, undefined) : `output_${job.id.slice(0, 8)}.jpg`);
  process.stdout.write(`Downloading to ${out}...`);
  await client.downloadResult(job, out);
  console.log(" done.");
  console.log(`\nResult: ${out}`);
  console.log(`Original URL: ${job.result_url}`);
}

async function cmdBatch(args: string[], flags: Record<string, string | boolean>): Promise<void> {
  const dir = args[0];
  if (!dir || !fs.existsSync(dir)) {
    console.error("Usage: upres batch <directory> [options]");
    process.exit(1);
  }

  const imageExts = new Set([".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"]);
  const files = fs.readdirSync(dir)
    .filter((f) => imageExts.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f));

  if (files.length === 0) {
    console.error(`No images found in ${dir}`);
    process.exit(1);
  }

  const outputDir = (flags.output as string) ?? path.join(dir, "upscaled");
  const model = resolveModel(flags.model as string | undefined, files[0]);
  const scale = flags.scale ? Number(flags.scale) : 4;
  const concurrency = flags.concurrency ? Number(flags.concurrency) : 3;

  console.log(`Batch upscaling ${files.length} images with ${model} (concurrency: ${concurrency})`);

  const client = new UpresClient({ apiKey: flags["api-key"] as string });
  let done = 0;
  let failed = 0;

  async function processFile(filePath: string): Promise<void> {
    const filename = path.basename(filePath);
    try {
      const job = await client.createJobFromFile(filePath, { model, scale });
      const completed = await client.waitForJob(job.id);
      if (completed.status === "failed") {
        console.error(`  FAILED ${filename}: ${completed.error}`);
        failed++;
        return;
      }
      const outPath = resolveOutputPath(filePath, outputDir);
      await client.downloadResult(completed, outPath);
      done++;
      console.log(`  [${done}/${files.length}] ${filename} → ${path.basename(outPath)}`);
    } catch (e) {
      console.error(`  ERROR ${filename}: ${(e as Error).message}`);
      failed++;
    }
  }

  // Process in chunks of concurrency
  for (let i = 0; i < files.length; i += concurrency) {
    const chunk = files.slice(i, i + concurrency);
    await Promise.all(chunk.map(processFile));
  }

  console.log(`\nDone: ${done} succeeded, ${failed} failed. Output: ${outputDir}`);
}

function cmdModels(): void {
  const categories = ["image-upscale", "image-enhance", "video-upscale"] as const;
  for (const cat of categories) {
    const label = { "image-upscale": "Image Upscale", "image-enhance": "Image Enhance", "video-upscale": "Video Upscale" }[cat];
    console.log(`\n${label}`);
    console.log("─".repeat(60));
    for (const m of MODELS.filter((x) => x.category === cat)) {
      console.log(`  ${m.id.padEnd(44)} ${m.price}`);
      console.log(`  ${"".padEnd(44)} ${m.description}`);
    }
  }
  console.log("\n  Full model details: https://upres.ai/models");
}

async function cmdJobs(flags: Record<string, string | boolean>): Promise<void> {
  const client = new UpresClient({ apiKey: flags["api-key"] as string });
  const result = await client.listJobs({
    limit: flags.limit ? Number(flags.limit) : 20,
    status: flags.status as string | undefined,
  });

  if (result.data.length === 0) {
    console.log("No jobs found.");
    return;
  }

  console.log(`\n${"ID".padEnd(38)} ${"Status".padEnd(12)} ${"Model".padEnd(35)} Created`);
  console.log("─".repeat(110));
  for (const job of result.data) {
    const created = new Date(job.created_at).toLocaleString();
    console.log(
      `${job.id.padEnd(38)} ${job.status.padEnd(12)} ${job.model.padEnd(35)} ${created}`
    );
  }
  if (result.has_more) console.log(`\n  More results available (cursor: ${result.next_cursor})`);
}

async function cmdAccount(flags: Record<string, string | boolean>): Promise<void> {
  const client = new UpresClient({ apiKey: flags["api-key"] as string });
  try {
    // Account endpoint not in v1 spec — show recent job count as proxy
    const result = await client.listJobs({ limit: 100 });
    const total = result.data.length;
    const completed = result.data.filter((j) => j.status === "completed").length;
    console.log(`\nAccount info (based on recent jobs)`);
    console.log(`  Recent jobs:    ${total}`);
    console.log(`  Completed:      ${completed}`);
    console.log(`  API key env:    ${process.env.UPRES_API_KEY ? "set (UPRES_API_KEY)" : "not set"}`);
    console.log(`\n  Manage your plan: https://upres.ai/pricing`);
    console.log(`  API keys:         https://upres.ai/account/api-keys`);
  } catch (e) {
    console.error((e as Error).message);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { command, args, flags } = parseArgs(argv);

  if (flags.help || flags.h || !command) {
    printHelp();
    process.exit(0);
  }

  if (command === "version" || command === "--version" || command === "-v") {
    console.log(`upres-cli v${VERSION}`);
    process.exit(0);
  }

  switch (command) {
    case "upscale":
      await cmdUpscale(args, flags);
      break;
    case "batch":
      await cmdBatch(args, flags);
      break;
    case "models":
      cmdModels();
      break;
    case "jobs":
      await cmdJobs(flags);
      break;
    case "account":
      await cmdAccount(flags);
      break;
    default:
      console.error(`Unknown command: ${command}\nRun "upres --help" for usage.`);
      process.exit(1);
  }
}

main().catch((e) => {
  console.error(`Fatal error: ${(e as Error).message}`);
  process.exit(1);
});

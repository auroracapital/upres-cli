#!/usr/bin/env node
/**
 * Batch upscale all JPG/PNG files in a folder using the upres.ai API.
 *
 * Usage:
 *   UPRES_API_KEY=upres_yourkey node examples/batch-upscale-folder.js ./photos ./upscaled
 *
 * Requirements: Node.js 18+, UPRES_API_KEY env var set
 */

import fs from "node:fs";
import path from "node:path";
import { UpresClient } from "upres-cli";

const INPUT_DIR = process.argv[2] ?? "./photos";
const OUTPUT_DIR = process.argv[3] ?? "./upscaled";
const MODEL = process.env.UPRES_MODEL ?? "wavespeed-ai/image-upscaler";
const SCALE = Number(process.env.UPRES_SCALE ?? 4);
const CONCURRENCY = 3;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp", ".tiff"]);

async function main() {
  if (!process.env.UPRES_API_KEY) {
    console.error("Set UPRES_API_KEY env var first. Get a key at https://upres.ai/account/api-keys");
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(INPUT_DIR, f));

  if (files.length === 0) {
    console.error(`No images found in ${INPUT_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Upscaling ${files.length} images from ${INPUT_DIR} → ${OUTPUT_DIR}`);
  console.log(`Model: ${MODEL}  Scale: ${SCALE}x  Concurrency: ${CONCURRENCY}\n`);

  const client = new UpresClient();
  let done = 0;
  let failed = 0;
  const start = Date.now();

  async function processFile(filePath) {
    const filename = path.basename(filePath);
    const ext = path.extname(filename);
    const stem = path.basename(filename, ext);
    const outPath = path.join(OUTPUT_DIR, `${stem}_upscaled${ext}`);

    try {
      const job = await client.createJobFromFile(filePath, { model: MODEL, scale: SCALE });
      const completed = await client.waitForJob(job.id);

      if (completed.status === "failed") {
        console.error(`  FAILED  ${filename}: ${completed.error}`);
        failed++;
        return;
      }

      await client.downloadResult(completed, outPath);
      done++;
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`  [${done}/${files.length}] ${filename} → ${path.basename(outPath)} (${elapsed}s)`);
    } catch (err) {
      console.error(`  ERROR   ${filename}: ${err.message}`);
      failed++;
    }
  }

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const chunk = files.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(processFile));
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nDone in ${elapsed}s: ${done} succeeded, ${failed} failed`);
  console.log(`Results in: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

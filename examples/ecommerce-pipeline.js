#!/usr/bin/env node
/**
 * E-commerce product image pipeline.
 * Takes raw product shots → upscales to 4K → downloads ready-to-publish.
 *
 * Usage:
 *   UPRES_API_KEY=upres_yourkey node examples/ecommerce-pipeline.js ./raw-products ./publish-ready
 *
 * Requirements: Node.js 18+, UPRES_API_KEY env var
 */

import fs from "node:fs";
import path from "node:path";
import { UpresClient } from "upres-cli";

const INPUT_DIR = process.argv[2] ?? "./raw-products";
const OUTPUT_DIR = process.argv[3] ?? "./publish-ready";

// Best model for product photos — sharpens edges, preserves colors
const MODEL = "wavespeed-ai/ultimate-image-upscaler";
const SCALE = 4;
const CONCURRENCY = 5;

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const stats = { submitted: 0, completed: 0, failed: 0, skipped: 0 };

async function processProduct(client, filePath, outputDir) {
  const filename = path.basename(filePath);
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  const outPath = path.join(outputDir, `${stem}_4k${ext}`);

  // Skip if already processed
  if (fs.existsSync(outPath)) {
    stats.skipped++;
    return { ok: true, msg: `SKIP    ${filename} (already done)` };
  }

  stats.submitted++;
  const job = await client.createJobFromFile(filePath, { model: MODEL, scale: SCALE });
  const completed = await client.waitForJob(job.id, { timeout: 180_000 });

  if (completed.status === "failed") {
    stats.failed++;
    return { ok: false, msg: `FAILED  ${filename}: ${completed.error}` };
  }

  await client.downloadResult(completed, outPath);
  stats.completed++;
  return { ok: true, msg: `OK      ${filename} → ${path.basename(outPath)}` };
}

async function main() {
  if (!process.env.UPRES_API_KEY) {
    console.error("Set UPRES_API_KEY. Get one at https://upres.ai/account/api-keys");
    process.exit(1);
  }

  const files = fs.readdirSync(INPUT_DIR)
    .filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(INPUT_DIR, f));

  if (files.length === 0) {
    console.error(`No product images found in ${INPUT_DIR}`);
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`E-commerce pipeline: ${files.length} products`);
  console.log(`Model: ${MODEL}  Scale: ${SCALE}x  Parallel: ${CONCURRENCY}\n`);

  const client = new UpresClient();
  const start = Date.now();
  const total = files.length;
  let count = 0;

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const chunk = files.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map((f) => processProduct(client, f, OUTPUT_DIR))
    );
    for (const { ok, msg } of results) {
      count++;
      const prefix = `[${count}/${total}]`;
      if (ok) console.log(`  ${prefix} ${msg}`);
      else console.error(`  ${prefix} ${msg}`);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\nPipeline complete in ${elapsed}s`);
  console.log(`  Submitted: ${stats.submitted}`);
  console.log(`  Completed: ${stats.completed}`);
  console.log(`  Skipped:   ${stats.skipped}`);
  console.log(`  Failed:    ${stats.failed}`);
  console.log(`\nOutput: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error(`Pipeline error: ${err.message}`);
  process.exit(1);
});

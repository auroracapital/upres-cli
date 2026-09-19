#!/usr/bin/env node
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(path.join(root, "dist", "cli.js"))) process.exit(0);

const r = spawnSync("npx", ["--yes", "tsup"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);

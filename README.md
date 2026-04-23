# upres-cli

[![npm version](https://img.shields.io/npm/v/upres-cli?style=flat-square)](https://www.npmjs.com/package/upres-cli)
[![PyPI version](https://img.shields.io/pypi/v/upres-ai?style=flat-square)](https://pypi.org/project/upres-ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/auroracapital/upres-cli?style=flat-square)](https://github.com/auroracapital/upres-cli/stargazers)

Official CLI + SDK for **[upres.ai](https://upres.ai)** — AI image and video upscaling powered by Real-ESRGAN, SeedVR2, RunwayML, Bria, and more. One API, 17 state-of-the-art models, up to 8K output.

```
$ upres upscale photo.jpg --model wavespeed-ai/image-upscaler --resolution 4k
Submitting job... model=wavespeed-ai/image-upscaler
Job created: 550e8400-e29b-41d4-a716-446655440000 (status: pending)
Waiting for result.......
Downloading to photo_upscaled.jpg... done.

Result: photo_upscaled.jpg
```

---

## Why we built this

- **Topaz** is $200/yr, desktop-only, no API, no automation
- **Upscayl** is great for one-offs but can't handle bulk exports or CI pipelines
- **Every other SaaS upscaler** either watermarks your output, caps resolution at 2K, or charges per image with no monthly plan

upres.ai gives you a clean REST API, 17 models including the latest SeedVR2 and RunwayML, batch processing, and predictable pricing starting at $49/mo.

---

## Quickstart

### Node.js

```bash
npx upres-cli upscale photo.jpg
```

Or install globally:

```bash
npm install -g upres-cli
upres upscale photo.jpg --model wavespeed-ai/image-upscaler --resolution 8k --output photo_8k.jpg
```

### Python

```bash
pip install upres-ai
upres upscale photo.jpg --model wavespeed-ai/image-upscaler --resolution 4k
```

---

## Authentication

1. Sign up at [upres.ai](https://upres.ai) (free — 5 ops/month)
2. Go to [upres.ai/account/api-keys](https://upres.ai/account/api-keys)
3. Generate a key — it's shown once

```bash
export UPRES_API_KEY=upres_yourkey
```

Or save permanently:

```bash
mkdir -p ~/.config/upres
echo '{"apiKey":"upres_yourkey"}' > ~/.config/upres/config.json
```

Key resolution order: `--api-key` flag → `UPRES_API_KEY` env var → `~/.config/upres/config.json`

---

## Commands

```bash
# Upscale a single image (local file or URL)
upres upscale photo.jpg --model wavespeed-ai/image-upscaler --resolution 4k
upres upscale photo.jpg --model wavespeed-ai/real-esrgan --scale 4 --output out.jpg
upres upscale https://example.com/photo.jpg --resolution 8k

# Upscale video
upres upscale clip.mp4 --model wavespeed-ai/video-upscaler --resolution 4k

# Batch upscale a folder
upres batch ./photos/ --model wavespeed-ai/real-esrgan --output ./upscaled/ --concurrency 5

# List available models
upres models

# List recent jobs
upres jobs --limit 20 --status completed

# Account / quota info
upres account
```

---

## Node.js SDK

```typescript
import { UpresClient } from "upres-cli";

const client = new UpresClient(); // reads UPRES_API_KEY from env

// Upscale a local file
const job = await client.createJobFromFile("photo.jpg", {
  model: "wavespeed-ai/image-upscaler",
  scale: 4,
});

// Wait for completion
const completed = await client.waitForJob(job.id);

// Download result
await client.downloadResult(completed, "photo_4k.jpg");
console.log("Done:", completed.result_url);
```

Files over 50 MB are automatically uploaded via [TUS resumable protocol](https://tus.io/).

---

## Python SDK

```python
from upres import UpresClient

with UpresClient() as client:                        # reads UPRES_API_KEY from env
    job = client.create_job_from_file(
        "photo.jpg",
        model="wavespeed-ai/image-upscaler",
        scale=4,
    )
    completed = client.wait_for_job(job["id"])
    client.download_result(completed, "photo_4k.jpg")
    print("Done:", completed["result_url"])
```

The Python SDK uses `httpx` — async-ready, no heavy dependencies.

---

## Examples

| Example | What it does |
|---|---|
| [batch-upscale-folder.js](examples/batch-upscale-folder.js) | Upscale all images in a folder with configurable concurrency |
| [restore-photo-folder.py](examples/restore-photo-folder.py) | Restore old/scanned photos using Recraft Crisp Upscale |
| [ecommerce-pipeline.js](examples/ecommerce-pipeline.js) | Product image pipeline: raw shots → 4K → publish-ready |
| [lightroom-export-hook.md](examples/lightroom-export-hook.md) | Auto-upscale Lightroom exports via post-processing hook |
| [figma-plugin-stub.md](examples/figma-plugin-stub.md) | Figma plugin integration guide |

---

## Models

17 models across image upscale, image enhance, and video upscale.

| Category | Highlight |
|---|---|
| Image Upscale | Real-ESRGAN · SeedVR2 · Bria · Crystal · Ultimate |
| Image Enhance | Recraft Crisp/Creative · Phota · Z-Image Turbo |
| Video Upscale | SeedVR2 Video · RunwayML · ByteDance · Bria FiBO |

Full model list with params and pricing: [docs/models.md](docs/models.md) · [upres.ai/models](https://upres.ai/models)

---

## Pricing

| Plan | Price | Ops/mo | API | Watermark |
|---|---|---|---|---|
| **Free** | $0 | 5 | — | Yes |
| **Pro** | $19/mo | 100 | — | No |
| **Business** | $49/mo | Unlimited | **Yes** | No |

**Business tier unlocks the full API, batch processing, all 17 models, and no output watermark.**

[Compare plans →](https://upres.ai/pricing) · [vs. Topaz →](https://upres.ai/compare/topaz) · [vs. Upscayl →](https://upres.ai/compare/upscayl)

---

## Free tier for open-source projects

If you're building something open-source on top of the API, email [support@upres.ai](mailto:support@upres.ai) with your repo link. We offer 500 ops/month for qualifying OSS projects.

---

## Error handling

The SDK handles these errors automatically:

| Status | Behavior |
|---|---|
| `401` | Prints API key error + link to key management, exits |
| `402` | Prints quota exceeded + link to pricing, exits |
| `429` | Prints rate limit message (60 req/min), exits |
| `5xx` | Throws `UpresError` with message |

In Python: raises `AuthError`, `QuotaExceededError`, or `UpresError`.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Tests run with:

```bash
# Node
npm test

# Python
pip install -e ".[dev]"
pytest tests/test_client.py -v
```

---

## License

MIT — see [LICENSE](LICENSE)

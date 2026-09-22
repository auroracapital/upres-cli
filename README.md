# upres-cli

[![npm version](https://img.shields.io/npm/v/upres-cli?style=flat-square)](https://www.npmjs.com/package/upres-cli)
[![PyPI version](https://img.shields.io/pypi/v/upres-ai?style=flat-square)](https://pypi.org/project/upres-ai/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/auroracapital/upres-cli?style=flat-square)](https://github.com/auroracapital/upres-cli/stargazers)

Official CLI + SDK for **[upres.ai](https://upres.ai)** — image, video, and speech restoration. One API, 14 public aliases, up to 8K output.

```
$ upres upscale photo.jpg --model flare --scale 4
Submitting job... model=flare
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

upres.ai gives you a clean REST API, 14 public aliases, batch processing, and predictable pricing starting at $9/mo on the Creator launch deal.

---

## Quickstart

### Node.js

```bash
npx upres-cli upscale photo.jpg
```

Or install globally:

```bash
npm install -g upres-cli
upres upscale photo.jpg --model lumen --scale 8 --output photo_8k.jpg
```

### Python

```bash
pip install upres-ai
upres upscale photo.jpg --model flare --scale 4
```

---

## Authentication

1. Sign up at [upres.ai](https://upres.ai) (free — 3 upscales/month)
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
upres upscale photo.jpg --model flare --scale 4
upres upscale photo.jpg --model lumen --scale 8 --output out.jpg
upres upscale https://example.com/photo.jpg --model prism

# Upscale video (AI-generated video from Sora, Kling, Runway etc.)
upres upscale clip.mp4 --model motion --scale 4

# Batch upscale a folder
upres batch ./photos/ --model flare --output ./upscaled/ --concurrency 5

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
  model: "flare",
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
        model="flare",
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
| [restore-photo-folder.py](examples/restore-photo-folder.py) | Restore old/scanned photos with Lumen |
| [ecommerce-pipeline.js](examples/ecommerce-pipeline.js) | Product image pipeline: raw shots → 4K → publish-ready |
| [lightroom-export-hook.md](examples/lightroom-export-hook.md) | Auto-upscale Lightroom exports via post-processing hook |
| [figma-plugin-stub.md](examples/figma-plugin-stub.md) | Figma plugin integration guide |

---

## Models

14 public aliases across image, video, and speech. Each one tells you up front whether it invents detail or leaves your file alone. Aliases that do not enlarge ignore `--scale`.

| Alias | Kind | Best for |
|---|---|---|
| `flare` | Image | Everyday photos, fastest default |
| `prism` | Image | Text, logos, product shots — keeps edges true |
| `lumen` | Image | Maximum detail recovery for print, up to 8x |
| `mirage` | Image | Invents new detail — art and hero images |
| `hush` | Image | Faithful denoise, same size as the source |
| `keen` | Image | Deblur and sharpen, same size |
| `visage` | Image | Faces only, does not enlarge |
| `atelier` | Image | Hush, Visage if a portrait, then Lumen |
| `motion` | Video | Fast 4K finish for AI video |
| `motion-x` | Video | Cinema-grade, for film and commercials |
| `still` | Video | Temporal denoise, resolution stays put |
| `cadence` | Video | Frame interpolation, does not enlarge |
| `atelier-x` | Video | Still, then Motion X |
| `voice` | Speech | Speech denoise to 48 kHz. Not for music |

Full model catalogue: [upres.ai/models](https://upres.ai/models) · Live spec: [api.upres.ai/v1/openapi.json](https://api.upres.ai/v1/openapi.json)

---

## Pricing

| Plan | Price | Includes | API | Watermark |
|---|---|---|---|---|
| **Free** | $0 | 3 upscales/mo | — | Yes |
| **Creator** | $9/mo (launch deal, was $19) | 50 stills + 20 min 4K video/mo | — | No |
| **Studio** | $39/mo | 250 stills + 90 min 4K video/mo | **Yes** | No |

**Studio tier unlocks the full API, batch processing, and no output watermark.**

[Compare plans →](https://upres.ai/pricing) · [vs. Topaz →](https://upres.ai/topaz-alternative) · [vs. Upscayl →](https://upres.ai/compare/upscayl)

---

## MCP (Claude, Cursor, Hermes)

```bash
claude mcp add upres -- npx -y github:auroracapital/upres-cli mcp
```

Or in `claude_desktop_config.json` / Cursor:

```json
{
  "mcpServers": {
    "upres": {
      "command": "npx",
      "args": ["-y", "github:auroracapital/upres-cli", "mcp"],
      "env": { "UPRES_API_KEY": "upres_yourkey" }
    }
  }
}
```

Tools: `upres_list_models`, `upres_get_credits`, `upres_upscale_image`, `upres_upscale_video`, `upres_enhance_audio`, `upres_get_job`.

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

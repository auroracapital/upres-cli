# Lightroom → upres.ai Export Hook

Automatically upscale photos as they leave your Lightroom export pipeline.

## Setup

### 1. Install the CLI

```bash
npm install -g upres-cli
upres --version
```

Set your API key:

```bash
export UPRES_API_KEY=upres_yourkey
# or: echo '{"apiKey":"upres_yourkey"}' > ~/.config/upres/config.json
```

### 2. Create an export post-processing script

Save this as `~/Scripts/upres-lightroom-hook.sh`:

```bash
#!/bin/bash
# Post-process Lightroom exports through upres.ai
# $1 = path to exported file

INPUT="$1"
BASENAME=$(basename "$INPUT" .jpg)
DIR=$(dirname "$INPUT")
OUTPUT="${DIR}/${BASENAME}_4k.jpg"

echo "[upres] Upscaling $INPUT..."
upres upscale "$INPUT" \
  --model wavespeed-ai/image-upscaler \
  --resolution 4k \
  --output "$OUTPUT"

if [ $? -eq 0 ]; then
  echo "[upres] Done: $OUTPUT"
else
  echo "[upres] Failed" >&2
  exit 1
fi
```

Make it executable:

```bash
chmod +x ~/Scripts/upres-lightroom-hook.sh
```

### 3. Configure Lightroom

1. Open **Lightroom Classic**
2. Go to **File → Export**
3. In the export dialog, scroll to **Post-Processing**
4. Set **After Export** to **Open in Other Application**
5. Browse to `~/Scripts/upres-lightroom-hook.sh`
6. Save as a **User Preset** called "Export + Upscale 4K"

### 4. Using the preset

Export any selection with your new preset. Lightroom will export the JPEG, then immediately pass it to upres.ai for 4K upscaling. The upscaled version will appear alongside the original in the same folder.

## Batch export workflow

For collections of 50+ images, use the batch CLI instead:

```bash
upres batch ~/LightroomExports/Session-2024/ \
  --model wavespeed-ai/image-upscaler \
  --output ~/LightroomExports/Session-2024-4K/ \
  --concurrency 5
```

## Model recommendations

| Scenario | Model |
|---|---|
| General photography | `wavespeed-ai/image-upscaler` |
| Portrait / face detail | `recraft-ai/recraft-crisp-upscale` |
| Maximum quality | `wavespeed-ai/ultimate-image-upscaler` |
| Fastest / cheapest | `wavespeed-ai/real-esrgan` |

Full model list: `upres models` or https://upres.ai/models

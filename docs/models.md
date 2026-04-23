# Available Models

Full model reference for the upres.ai API. All models are accessible on the **Business tier** ($49/mo).

> **Live model list**: https://upres.ai/models

---

## Image Upscale

| Model ID | Name | Price | Best For |
|---|---|---|---|
| `wavespeed-ai/real-esrgan` | Real-ESRGAN | $0.0024/image | Fast general upscaling, artifact removal. Best value. |
| `wavespeed-ai/image-upscaler` | Image Upscaler | $0.01/image | 2K/4K/8K with strong detail preservation. **Recommended default.** |
| `wavespeed-ai/ultimate-image-upscaler` | Ultimate Image Upscaler | $0.01/image | Most advanced — reimagines fine detail at 2K/4K/8K. |
| `wavespeed-ai/seedvr2/image` | SeedVR2 Image | $0.01/image | ByteDance SeedVR2 architecture. Sharp, perceptually detailed. |
| `bria/increase-resolution` | Bria Increase Resolution | $0.04/image | Preservation-first 2x/4x. Zero content drift — ideal for archives. |
| `clarity-ai/crystal-upscaler` | Crystal Upscaler | Pay per use | Target megapixels with creativity control (0–10). |

### Image Upscale — params

```bash
# Real-ESRGAN (no extra params)
upres upscale photo.jpg --model wavespeed-ai/real-esrgan --scale 4

# Image Upscaler / Ultimate / SeedVR2 Image
upres upscale photo.jpg --model wavespeed-ai/image-upscaler --resolution 8k

# Bria (scale 2 or 4 only)
upres upscale photo.jpg --model bria/increase-resolution --scale 2
```

---

## Image Enhance

| Model ID | Name | Price | Best For |
|---|---|---|---|
| `recraft-ai/recraft-crisp-upscale` | Recraft Crisp Upscale | Pay per use | Textures, facial features, portraits. |
| `recraft-ai/recraft-creative-upscale` | Recraft Creative Upscale | $0.25/image | Generative enhancement — adds depth and polish to complex elements. |
| `wavespeed-ai/phota/enhance` | Phota Enhance | $0.09/image | Batch up to 4 variations per run. Optional 4K output. |
| `wavespeed-ai/z-image-turbo/image-to-image` | Z-Image Turbo | $0.01/image | Strength-controlled enhance. Subtle (0.0–0.3) to creative (0.6+). |

---

## Video Upscale

| Model ID | Name | Price | Best For |
|---|---|---|---|
| `wavespeed-ai/video-upscaler` | Video Upscaler | $0.005–0.02/sec | Fast 720p–4K. Best value for video. |
| `wavespeed-ai/video-upscaler-pro` | Video Upscaler Pro | $0.03–0.05/sec | Motion-aware, artifact cleanup. |
| `wavespeed-ai/ultimate-video-upscaler` | Ultimate Video Upscaler | $0.02–0.08/sec | Deep learning detail reconstruction — highest quality 4K video. |
| `wavespeed-ai/seedvr2/video` | SeedVR2 Video | $0.02–0.05/sec | 16B param ByteDance model. Highest fidelity + frame consistency. |
| `bytedance/video-upscaler` | ByteDance Video Upscaler | $0.007–0.029/sec | ByteDance fine-detail super-resolution to 4K. |
| `bria/fibo/video-upscaler` | Bria Video Upscaler | $0.14/sec | Temporal consistency. Multi-codec output (MP4, MOV, WebM, ProRes, GIF). |
| `runwayml/upscale-v1` | RunwayML Upscale | $0.02/sec | One-click 4K by RunwayML. |

### Video — supported resolutions

`720p`, `1080p`, `2k`, `4k` (model-dependent)

```bash
upres upscale clip.mp4 --model wavespeed-ai/video-upscaler --resolution 4k
upres upscale clip.mp4 --model wavespeed-ai/seedvr2/video --resolution 4k
```

---

## Model selection guide

| Use case | Recommended model |
|---|---|
| General photos | `wavespeed-ai/image-upscaler` |
| Portraits | `recraft-ai/recraft-crisp-upscale` |
| Archival / scanned | `bria/increase-resolution` |
| Max quality, slow | `wavespeed-ai/ultimate-image-upscaler` |
| Fastest / cheapest | `wavespeed-ai/real-esrgan` |
| Standard video | `wavespeed-ai/video-upscaler` |
| Pro video | `wavespeed-ai/seedvr2/video` |
| ProRes / multi-codec | `bria/fibo/video-upscaler` |

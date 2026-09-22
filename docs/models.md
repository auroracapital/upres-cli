# Models

Live spec: https://api.upres.ai/v1/openapi.json

A job names one of 14 public aliases. Which backend serves an alias is ours to choose and can change without notice.

| Alias | Kind | Best for |
|---|---|---|
| `flare` | Image | Everyday photos, 2×–4×. Fastest default. Does not invent detail. |
| `prism` | Image | Text, logos, screenshots, product shots. Keeps edges true. |
| `lumen` | Image | Maximum detail recovery for print, up to 8×. |
| `mirage` | Image | Invents plausible new detail. Good for art, wrong for documents. |
| `hush` | Image | Faithful denoise. Same size as the source. |
| `keen` | Image | Deblur and sharpen. Same size as the source. |
| `visage` | Image | Restores faces and leaves the rest of the frame alone. Does not enlarge. |
| `atelier` | Image | Hush, then Visage if the photo looks like a portrait, then Lumen. A skipped face stage is free. |
| `motion` | Video | Fast 4K finish for AI-generated video. |
| `motion-x` | Video | Cinema-grade. Slower and dearer per second than Motion. |
| `still` | Video | Temporal denoise. Resolution stays put. |
| `cadence` | Video | Frame interpolation. Does not enlarge the picture. |
| `atelier-x` | Video | Still, then Motion X. Two credits. |
| `voice` | Speech | Speech denoise and bandwidth extension to 48 kHz. Not for music. |

Aliases that do not enlarge (`hush`, `keen`, `visage`, `still`, `cadence`, `voice`) ignore `--scale`. The API stores scale 1 for them.

```bash
upres upscale photo.jpg --model flare --scale 4
upres upscale photo.jpg --model lumen --scale 8
upres upscale portrait.jpg --model atelier
upres upscale clip.mp4 --model motion
upres upscale interview.wav --model voice
```

Studio ($39/mo) unlocks the API. Creator ($9/mo launch deal) is for the web app.

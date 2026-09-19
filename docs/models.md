# Models

Live spec: https://api.upres.ai/v1/openapi.json (v1.1.0)

A job names one of six models. Which backend serves a model is ours to choose and can change without notice.

| Model | Kind | Best for |
|---|---|---|
| `flare` | Image | Everyday photos. Fastest default. Does not invent detail. |
| `prism` | Image | Text, logos, screenshots, product shots. Keeps edges true. |
| `lumen` | Image | Maximum detail recovery for print, up to 8x. |
| `mirage` | Image | Invents plausible new detail. Good for art, wrong for documents. |
| `motion` | Video | Fast 4K finish for Sora, Kling, Runway clips. |
| `motion-x` | Video | Cinema-grade. Slower and dearer per second than Motion. |

```bash
upres upscale photo.jpg --model flare --scale 4
upres upscale photo.jpg --model lumen --scale 8
upres upscale clip.mp4 --model motion
```

Studio ($39/mo) unlocks the API. Creator ($9/mo launch deal) is for the web app.

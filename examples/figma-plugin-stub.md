# Figma Plugin Integration Guide

Upscale design assets directly from Figma using the upres.ai API.

## What this enables

- Export a frame or component → upscale to 4K → re-import as a design asset
- Generate print-ready versions of UI mockups at 300 DPI
- Upscale low-res stock photos used in designs before client delivery

## Figma Plugin skeleton

Create a new Figma plugin via **Plugins → Development → New Plugin**. Use this starter:

### `code.ts` (plugin backend)

```typescript
// Figma plugin backend — sends selected frame as PNG to upres.ai
figma.showUI(__html__, { width: 380, height: 280 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "upscale") {
    const selection = figma.currentPage.selection;
    if (!selection.length) {
      figma.ui.postMessage({ type: "error", message: "Select a frame first." });
      return;
    }
    const node = selection[0];
    const bytes = await node.exportAsync({
      format: "PNG",
      constraint: { type: "SCALE", value: 2 },
    });
    figma.ui.postMessage({ type: "export-ready", bytes: Array.from(bytes) });
  }
};
```

### UI flow

The plugin UI should:
1. Collect API key and scale factor from the user
2. On submit, call the Figma backend to export the selected frame as PNG
3. POST the PNG to `https://api.upres.ai/v1/jobs` (multipart/form-data, `Authorization: Bearer <key>`)
4. Poll `GET /v1/jobs/{id}` every 2 seconds until `status === "completed"`
5. Present a download link for the `result_url`

Use `textContent` to display job IDs and status messages — never use `innerHTML` with API-sourced content.

### Authentication

```javascript
const res = await fetch("https://api.upres.ai/v1/jobs", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: formData,
});
```

### Polling example

```javascript
async function waitForJob(jobId, apiKey) {
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(`https://api.upres.ai/v1/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const job = await res.json();
    if (job.status === "completed") return job.result_url;
    if (job.status === "failed") throw new Error(job.error);
  }
  throw new Error("Timeout — check https://upres.ai/account/jobs");
}
```

## Getting an API key

1. Create a Business account at https://upres.ai/pricing ($49/mo)
2. Go to https://upres.ai/account/api-keys
3. Click **Generate new key** — copy it, it's shown once

## Resources

- Full API docs: https://upres.ai/docs
- All models: https://upres.ai/models
- Support: support@upres.ai

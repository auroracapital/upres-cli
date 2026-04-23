"""upres CLI — Python entry point.

Usage:
  upres upscale photo.jpg --model real-esrgan --scale 4
  upres batch ./photos/ --output ./upscaled/ --concurrency 3
  upres models
  upres jobs
  upres account
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Optional

from .client import UpresClient, AuthError, QuotaExceededError, UpresError

VERSION = "0.1.0"

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"}
VIDEO_EXTS = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".gif"}

MODELS_LIST = [
    ("wavespeed-ai/real-esrgan",            "Image Upscale",   "$0.0024/image", "Fast, best value"),
    ("wavespeed-ai/image-upscaler",         "Image Upscale",   "$0.01/image",   "2K/4K/8K with detail preservation"),
    ("wavespeed-ai/ultimate-image-upscaler","Image Upscale",   "$0.01/image",   "Most advanced, reimagines detail"),
    ("wavespeed-ai/seedvr2/image",          "Image Upscale",   "$0.01/image",   "ByteDance SeedVR2, sharp & detailed"),
    ("bria/increase-resolution",            "Image Upscale",   "$0.04/image",   "Preservation-first, no content drift"),
    ("clarity-ai/crystal-upscaler",         "Image Upscale",   "Pay per use",   "Target megapixels + creativity control"),
    ("recraft-ai/recraft-crisp-upscale",    "Image Enhance",   "Pay per use",   "Textures + portraits"),
    ("recraft-ai/recraft-creative-upscale", "Image Enhance",   "$0.25/image",   "Generative enhancement"),
    ("wavespeed-ai/phota/enhance",          "Image Enhance",   "$0.09/image",   "Batch up to 4 images"),
    ("wavespeed-ai/z-image-turbo/image-to-image","Image Enhance","$0.01/image", "Strength-controlled enhance"),
    ("wavespeed-ai/video-upscaler",         "Video Upscale",   "$0.005-0.02/s", "Fast 720p-4K, best value"),
    ("wavespeed-ai/video-upscaler-pro",     "Video Upscale",   "$0.03-0.05/s",  "Motion-aware, artifact cleanup"),
    ("wavespeed-ai/ultimate-video-upscaler","Video Upscale",   "$0.02-0.08/s",  "Highest quality 4K"),
    ("wavespeed-ai/seedvr2/video",          "Video Upscale",   "$0.02-0.05/s",  "16B param, frame-consistent"),
    ("bytedance/video-upscaler",            "Video Upscale",   "$0.007-0.029/s","ByteDance fine-detail 4K"),
    ("bria/fibo/video-upscaler",            "Video Upscale",   "$0.14/s",        "Temporal consistency, multi-codec"),
    ("runwayml/upscale-v1",                 "Video Upscale",   "$0.02/s",        "One-click 4K by RunwayML"),
]


def _resolve_model(model_arg: Optional[str], file_path: Optional[str]) -> str:
    if model_arg:
        for m_id, *_ in MODELS_LIST:
            if m_id == model_arg or m_id.endswith(f"/{model_arg}"):
                return m_id
        return model_arg
    if file_path:
        ext = Path(file_path).suffix.lower()
        if ext in VIDEO_EXTS:
            return "wavespeed-ai/video-upscaler"
    return "wavespeed-ai/image-upscaler"


def _resolve_output(input_path: str, output_arg: Optional[str]) -> str:
    p = Path(input_path)
    if output_arg:
        return output_arg
    return str(p.parent / f"{p.stem}_upscaled{p.suffix}")


def cmd_upscale(args: argparse.Namespace) -> None:
    input_path: str = args.input
    is_url = input_path.startswith("http://") or input_path.startswith("https://")
    is_file = not is_url and Path(input_path).exists()

    if not is_url and not is_file:
        print(f"Error: File not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    model = _resolve_model(args.model, input_path)
    scale: int = args.scale or 4

    client = UpresClient(api_key=args.api_key)
    print(f"Submitting job... model={model}")

    if is_file:
        job = client.create_job_from_file(input_path, model=model, scale=scale)
    else:
        job = client.create_job_from_url(input_path, model=model, scale=scale)

    print(f"Job created: {job['id']} (status: {job['status']})")

    if args.no_wait:
        print('Run "upres jobs" to check status.')
        return

    print("Waiting for result", end="", flush=True)
    job = client.wait_for_job(job["id"])
    print()

    if job["status"] == "failed":
        print(f"Job failed: {job.get('error', 'Unknown error')}", file=sys.stderr)
        sys.exit(1)

    out = args.output or _resolve_output(input_path, None) if is_file else f"output_{job['id'][:8]}.jpg"
    print(f"Downloading to {out}...", end="", flush=True)
    client.download_result(job, out)
    print(" done.")
    print(f"\nResult: {out}")
    print(f"Original URL: {job.get('result_url')}")


def cmd_batch(args: argparse.Namespace) -> None:
    import concurrent.futures

    directory = Path(args.directory)
    if not directory.is_dir():
        print(f"Error: Directory not found: {directory}", file=sys.stderr)
        sys.exit(1)

    files = [f for f in directory.iterdir() if f.suffix.lower() in IMAGE_EXTS]
    if not files:
        print(f"No images found in {directory}", file=sys.stderr)
        sys.exit(1)

    output_dir = Path(args.output) if args.output else directory / "upscaled"
    model = _resolve_model(args.model, str(files[0]))
    scale: int = args.scale or 4
    concurrency: int = args.concurrency or 3

    print(f"Batch upscaling {len(files)} images with {model} (concurrency: {concurrency})")

    client = UpresClient(api_key=args.api_key)
    done = 0
    failed = 0
    total = len(files)

    def process(f: Path) -> tuple[bool, str]:
        try:
            job = client.create_job_from_file(f, model=model, scale=scale)
            completed = client.wait_for_job(job["id"])
            if completed["status"] == "failed":
                return False, f"FAILED {f.name}: {completed.get('error')}"
            out = output_dir / f"{f.stem}_upscaled{f.suffix}"
            client.download_result(completed, out)
            return True, f"{f.name} → {out.name}"
        except Exception as e:
            return False, f"ERROR {f.name}: {e}"

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
        for i, (ok, msg) in enumerate(pool.map(process, files), 1):
            if ok:
                done += 1
                print(f"  [{i}/{total}] {msg}")
            else:
                failed += 1
                print(f"  [{i}/{total}] {msg}", file=sys.stderr)

    print(f"\nDone: {done} succeeded, {failed} failed. Output: {output_dir}")


def cmd_models() -> None:
    categories = ["Image Upscale", "Image Enhance", "Video Upscale"]
    for cat in categories:
        print(f"\n{cat}")
        print("─" * 70)
        for m_id, m_cat, price, desc in MODELS_LIST:
            if m_cat == cat:
                print(f"  {m_id:<46} {price:<16} {desc}")
    print("\n  Full details: https://upres.ai/models")


def cmd_jobs(args: argparse.Namespace) -> None:
    client = UpresClient(api_key=args.api_key)
    result = client.list_jobs(
        limit=args.limit or 20,
        status=args.status or None,
    )
    jobs = result.get("data", [])
    if not jobs:
        print("No jobs found.")
        return
    print(f"\n{'ID':<38} {'Status':<12} {'Model':<35} Created")
    print("─" * 100)
    for job in jobs:
        from datetime import datetime, timezone
        created = datetime.fromisoformat(job["created_at"].replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
        print(f"{job['id']:<38} {job['status']:<12} {job['model']:<35} {created}")
    if result.get("has_more"):
        print(f"\n  More results available (cursor: {result.get('next_cursor')})")


def cmd_account(args: argparse.Namespace) -> None:
    client = UpresClient(api_key=args.api_key)
    result = client.list_jobs(limit=100)
    jobs = result.get("data", [])
    completed = sum(1 for j in jobs if j["status"] == "completed")
    print("\nAccount info (based on recent jobs)")
    print(f"  Recent jobs:    {len(jobs)}")
    print(f"  Completed:      {completed}")
    print(f"  API key env:    {'set (UPRES_API_KEY)' if os.environ.get('UPRES_API_KEY') else 'not set'}")
    print("\n  Manage your plan: https://upres.ai/pricing")
    print("  API keys:         https://upres.ai/account/api-keys")


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="upres",
        description="upres-ai CLI — AI image & video upscaling",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"upres-ai {VERSION}")
    parser.add_argument("--api-key", help="API key (or set UPRES_API_KEY env var)")

    subparsers = parser.add_subparsers(dest="command")

    # upscale
    p_up = subparsers.add_parser("upscale", help="Upscale a single image or video")
    p_up.add_argument("input", help="Local file path or URL")
    p_up.add_argument("--model", help="Model ID (default: wavespeed-ai/image-upscaler)")
    p_up.add_argument("--scale", type=int, default=4, help="Scale factor 2-8 (default: 4)")
    p_up.add_argument("--resolution", default="4k", help="Target resolution (2k/4k/8k/1080p)")
    p_up.add_argument("--output", help="Output file path")
    p_up.add_argument("--no-wait", action="store_true", dest="no_wait", help="Return job ID immediately")

    # batch
    p_batch = subparsers.add_parser("batch", help="Upscale all images in a directory")
    p_batch.add_argument("directory", help="Directory containing images")
    p_batch.add_argument("--model", help="Model ID")
    p_batch.add_argument("--scale", type=int, default=4)
    p_batch.add_argument("--output", help="Output directory")
    p_batch.add_argument("--concurrency", type=int, default=3, help="Parallel jobs (default: 3)")

    # models
    subparsers.add_parser("models", help="List available models")

    # jobs
    p_jobs = subparsers.add_parser("jobs", help="List recent jobs")
    p_jobs.add_argument("--limit", type=int, default=20)
    p_jobs.add_argument("--status", help="Filter by status (pending/processing/completed/failed)")

    # account
    subparsers.add_parser("account", help="Show quota and plan info")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(0)

    try:
        if args.command == "upscale":
            cmd_upscale(args)
        elif args.command == "batch":
            cmd_batch(args)
        elif args.command == "models":
            cmd_models()
        elif args.command == "jobs":
            cmd_jobs(args)
        elif args.command == "account":
            cmd_account(args)
    except AuthError as e:
        print(f"Auth error: {e}", file=sys.stderr)
        sys.exit(1)
    except QuotaExceededError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
    except UpresError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

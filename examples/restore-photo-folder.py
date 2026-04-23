#!/usr/bin/env python3
"""
Restore and enhance a folder of photos using Recraft Crisp Upscale.
Great for old/scanned photos, portraits, and archival work.

Usage:
  UPRES_API_KEY=upres_yourkey python examples/restore-photo-folder.py ./old-photos ./restored

Requirements: pip install upres-ai
"""

import os
import sys
import time
from pathlib import Path

try:
    from upres import UpresClient
    from upres.client import AuthError, QuotaExceededError, UpresError
except ImportError:
    print("Install the SDK first: pip install upres-ai")
    sys.exit(1)

INPUT_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("./old-photos")
OUTPUT_DIR = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("./restored")
MODEL = os.environ.get("UPRES_MODEL", "recraft-ai/recraft-crisp-upscale")
CONCURRENCY = 3

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif"}


def main() -> None:
    if not os.environ.get("UPRES_API_KEY"):
        print("Set UPRES_API_KEY env var first. Get a key at https://upres.ai/account/api-keys")
        sys.exit(1)

    if not INPUT_DIR.is_dir():
        print(f"Directory not found: {INPUT_DIR}")
        sys.exit(1)

    files = [f for f in INPUT_DIR.iterdir() if f.suffix.lower() in IMAGE_EXTS]
    if not files:
        print(f"No images found in {INPUT_DIR}")
        sys.exit(1)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Restoring {len(files)} photos from {INPUT_DIR} → {OUTPUT_DIR}")
    print(f"Model: {MODEL}  Concurrency: {CONCURRENCY}\n")

    client = UpresClient()
    done = 0
    failed = 0
    start = time.monotonic()

    import concurrent.futures

    def process(f: Path) -> tuple[bool, str]:
        try:
            job = client.create_job_from_file(f, model=MODEL, scale=2)
            completed = client.wait_for_job(job["id"])
            if completed["status"] == "failed":
                return False, f"FAILED  {f.name}: {completed.get('error')}"
            out = OUTPUT_DIR / f"{f.stem}_restored{f.suffix}"
            client.download_result(completed, out)
            return True, f"{f.name} → {out.name}"
        except (AuthError, QuotaExceededError) as e:
            print(f"\nFatal: {e}")
            sys.exit(1)
        except Exception as e:
            return False, f"ERROR   {f.name}: {e}"

    total = len(files)
    with concurrent.futures.ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        for i, (ok, msg) in enumerate(pool.map(process, files), 1):
            if ok:
                done += 1
                elapsed = time.monotonic() - start
                print(f"  [{i}/{total}] {msg} ({elapsed:.1f}s)")
            else:
                failed += 1
                print(f"  [{i}/{total}] {msg}", file=sys.stderr)

    elapsed = time.monotonic() - start
    print(f"\nDone in {elapsed:.1f}s: {done} restored, {failed} failed")
    print(f"Results in: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()

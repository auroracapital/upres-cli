"""upres.ai Python SDK — wraps the v1 REST API."""

from __future__ import annotations

import json
import os
import time
from pathlib import Path
from typing import Any, Iterator, Optional

import httpx

__all__ = ["UpresClient", "UpresError", "QuotaExceededError", "AuthError"]

DEFAULT_BASE_URL = "https://api.upres.ai/v1"
LARGE_FILE_THRESHOLD = 50 * 1024 * 1024  # 50 MB
TUS_CHUNK_SIZE = 5 * 1024 * 1024  # 5 MB chunks
CONFIG_PATH = Path.home() / ".config" / "upres" / "config.json"


class UpresError(Exception):
    pass


class AuthError(UpresError):
    pass


class QuotaExceededError(UpresError):
    def __init__(self, used: Optional[int] = None, quota: Optional[int] = None) -> None:
        self.used = used
        self.quota = quota
        super().__init__(f"Monthly quota exceeded ({used}/{quota}). Upgrade at https://upres.ai/pricing")


def _load_config_file() -> dict[str, str]:
    try:
        if CONFIG_PATH.exists():
            return json.loads(CONFIG_PATH.read_text())
    except Exception:
        pass
    return {}


def _resolve_api_key(override: Optional[str] = None) -> str:
    key = override or os.environ.get("UPRES_API_KEY") or _load_config_file().get("apiKey")
    if not key:
        raise AuthError(
            "No API key found. Set UPRES_API_KEY, pass api_key=, or save to ~/.config/upres/config.json\n"
            "Get a key at https://upres.ai/account/api-keys"
        )
    return key


class UpresClient:
    """Synchronous client for the upres.ai v1 API.

    Args:
        api_key: API key. Falls back to UPRES_API_KEY env var or ~/.config/upres/config.json.
        base_url: Override the default API base URL.
        timeout: Request timeout in seconds (default 120).

    Example::

        from upres import UpresClient

        client = UpresClient()
        job = client.create_job_from_file("photo.jpg", model="wavespeed-ai/real-esrgan")
        completed = client.wait_for_job(job["id"])
        client.download_result(completed, "photo_upscaled.jpg")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: str = DEFAULT_BASE_URL,
        timeout: float = 120.0,
    ) -> None:
        self._api_key = _resolve_api_key(api_key)
        self._base_url = base_url.rstrip("/")
        self._client = httpx.Client(
            base_url=self._base_url,
            headers={"Authorization": f"Bearer {self._api_key}"},
            timeout=timeout,
        )

    def _check_response(self, response: httpx.Response) -> Any:
        if response.is_success:
            if response.status_code == 204:
                return None
            return response.json()
        try:
            err = response.json()
        except Exception:
            err = {"error": f"HTTP {response.status_code}"}

        if response.status_code == 401:
            raise AuthError("Invalid API key. Get a new key at https://upres.ai/account/api-keys")
        if response.status_code == 402:
            raise QuotaExceededError(err.get("used"), err.get("quota"))
        if response.status_code == 429:
            raise UpresError("Rate limit exceeded (60 req/min). Wait a moment and retry.")
        raise UpresError(err.get("error", f"HTTP {response.status_code}"))

    def create_job_from_url(
        self,
        image_url: str,
        *,
        model: str = "wavespeed-ai/image-upscaler",
        scale: int = 4,
    ) -> dict[str, Any]:
        """Submit an upscale job using a publicly accessible image URL."""
        body: dict[str, Any] = {"image_url": image_url, "model": model, "scale": scale}
        return self._check_response(self._client.post("/jobs", json=body))

    def create_job_from_file(
        self,
        file_path: str | Path,
        *,
        model: str = "wavespeed-ai/image-upscaler",
        scale: int = 4,
    ) -> dict[str, Any]:
        """Submit an upscale job by uploading a local file.

        Files larger than 50 MB are automatically uploaded via TUS resumable protocol.
        """
        p = Path(file_path)
        file_size = p.stat().st_size

        if file_size > LARGE_FILE_THRESHOLD:
            upload_url = self._tus_upload(p)
            return self.create_job_from_url(upload_url, model=model, scale=scale)

        with p.open("rb") as f:
            files = {"image": (p.name, f, self._mime_type(p))}
            data = {"model": model, "scale": str(scale)}
            return self._check_response(
                self._client.post("/jobs", files=files, data=data)
            )

    def _tus_upload(self, path: Path) -> str:
        """Upload a large file using TUS resumable protocol."""
        file_size = path.stat().st_size
        tus_base = self._base_url.replace("/v1", "") + "/api/tus"

        import base64
        create_res = httpx.post(
            tus_base,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Tus-Resumable": "1.0.0",
                "Upload-Length": str(file_size),
                "Upload-Metadata": f"filename {base64.b64encode(path.name.encode()).decode()}",
                "Content-Length": "0",
            },
            timeout=30,
        )
        if not create_res.is_success:
            raise UpresError(f"TUS create failed: HTTP {create_res.status_code}")

        upload_url = create_res.headers.get("Location")
        if not upload_url:
            raise UpresError("TUS server did not return upload URL")

        offset = 0
        with path.open("rb") as f:
            while chunk := f.read(TUS_CHUNK_SIZE):
                patch_res = httpx.patch(
                    upload_url,
                    headers={
                        "Authorization": f"Bearer {self._api_key}",
                        "Tus-Resumable": "1.0.0",
                        "Content-Type": "application/offset+octet-stream",
                        "Upload-Offset": str(offset),
                        "Content-Length": str(len(chunk)),
                    },
                    content=chunk,
                    timeout=120,
                )
                if not patch_res.is_success:
                    raise UpresError(f"TUS patch failed at offset {offset}: HTTP {patch_res.status_code}")
                offset += len(chunk)

        upload_id = upload_url.rstrip("/").split("/")[-1]
        return f"{self._base_url.replace('/v1', '')}/api/tus/{upload_id}"

    def get_job(self, job_id: str) -> dict[str, Any]:
        """Retrieve a job by ID."""
        return self._check_response(self._client.get(f"/jobs/{job_id}"))

    def list_jobs(
        self,
        *,
        status: Optional[str] = None,
        model: Optional[str] = None,
        limit: int = 20,
        cursor: Optional[str] = None,
        before: Optional[str] = None,
        after: Optional[str] = None,
    ) -> dict[str, Any]:
        """List recent jobs with optional filters."""
        params: dict[str, Any] = {"limit": limit}
        if status:
            params["status"] = status
        if model:
            params["model"] = model
        if cursor:
            params["cursor"] = cursor
        if before:
            params["before"] = before
        if after:
            params["after"] = after
        return self._check_response(self._client.get("/jobs", params=params))

    def wait_for_job(
        self,
        job_id: str,
        *,
        poll_interval: float = 2.0,
        timeout: float = 300.0,
    ) -> dict[str, Any]:
        """Poll until a job reaches completed or failed state."""
        start = time.monotonic()
        while True:
            job = self.get_job(job_id)
            if job["status"] in ("completed", "failed"):
                return job
            if time.monotonic() - start > timeout:
                raise UpresError(f"Timeout waiting for job {job_id}")
            time.sleep(poll_interval)

    def download_result(self, job: dict[str, Any], output_path: str | Path) -> Path:
        """Download the upscaled result to a local file."""
        result_url = job.get("result_url")
        if not result_url:
            raise UpresError("Job has no result URL")
        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        with httpx.stream("GET", result_url, timeout=120) as r:
            r.raise_for_status()
            with out.open("wb") as f:
                for chunk in r.iter_bytes(chunk_size=8192):
                    f.write(chunk)
        return out

    def _mime_type(self, path: Path) -> str:
        ext = path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".webp": "image/webp",
            ".tiff": "image/tiff", ".tif": "image/tiff",
        }
        return mime_map.get(ext, "application/octet-stream")

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "UpresClient":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

"""Unit tests for the Python SDK — all HTTP calls are mocked with respx."""

import pytest
import httpx
import respx
import json
from pathlib import Path
import tempfile

from python.upres.client import UpresClient, AuthError, QuotaExceededError, UpresError

MOCK_JOB = {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "model": "wavespeed-ai/real-esrgan",
    "scale": 4,
    "result_url": "https://cdn.upres.ai/results/abc123.png",
    "error": None,
    "original_filename": "photo.jpg",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:10Z",
}

LIST_RESPONSE = {
    "data": [MOCK_JOB],
    "has_more": False,
    "next_cursor": None,
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("UPRES_API_KEY", "upres_test_key")
    return UpresClient()


@respx.mock
def test_create_job_from_url(client):
    respx.post("https://api.upres.ai/v1/jobs").mock(
        return_value=httpx.Response(201, json=MOCK_JOB)
    )
    job = client.create_job_from_url(
        "https://example.com/photo.jpg",
        model="wavespeed-ai/real-esrgan",
        scale=4,
    )
    assert job["id"] == MOCK_JOB["id"]
    assert job["status"] == "completed"


@respx.mock
def test_get_job(client):
    job_id = MOCK_JOB["id"]
    respx.get(f"https://api.upres.ai/v1/jobs/{job_id}").mock(
        return_value=httpx.Response(200, json=MOCK_JOB)
    )
    job = client.get_job(job_id)
    assert job["status"] == "completed"


@respx.mock
def test_list_jobs_passes_params(client):
    route = respx.get("https://api.upres.ai/v1/jobs").mock(
        return_value=httpx.Response(200, json=LIST_RESPONSE)
    )
    result = client.list_jobs(status="completed", limit=5)
    assert len(result["data"]) == 1
    assert "status=completed" in str(route.calls[0].request.url)
    assert "limit=5" in str(route.calls[0].request.url)


@respx.mock
def test_wait_for_job_polls_until_done(client):
    job_id = MOCK_JOB["id"]
    pending = {**MOCK_JOB, "status": "pending"}
    route = respx.get(f"https://api.upres.ai/v1/jobs/{job_id}")
    route.side_effect = [
        httpx.Response(200, json=pending),
        httpx.Response(200, json=pending),
        httpx.Response(200, json=MOCK_JOB),
    ]
    job = client.wait_for_job(job_id, poll_interval=0)
    assert job["status"] == "completed"
    assert route.call_count == 3


@respx.mock
def test_create_job_from_file(client, tmp_path):
    img = tmp_path / "photo.jpg"
    img.write_bytes(b"fake-jpeg-content")
    respx.post("https://api.upres.ai/v1/jobs").mock(
        return_value=httpx.Response(201, json=MOCK_JOB)
    )
    job = client.create_job_from_file(img, model="wavespeed-ai/real-esrgan", scale=4)
    assert job["id"] == MOCK_JOB["id"]


@respx.mock
def test_401_raises_auth_error(client):
    respx.get(f"https://api.upres.ai/v1/jobs/{MOCK_JOB['id']}").mock(
        return_value=httpx.Response(401, json={"error": "Invalid API key."})
    )
    with pytest.raises(AuthError):
        client.get_job(MOCK_JOB["id"])


@respx.mock
def test_402_raises_quota_error(client):
    respx.post("https://api.upres.ai/v1/jobs").mock(
        return_value=httpx.Response(402, json={"error": "Quota exceeded.", "quota": 5, "used": 5})
    )
    with pytest.raises(QuotaExceededError) as exc:
        client.create_job_from_url("https://example.com/x.jpg")
    assert exc.value.used == 5
    assert exc.value.quota == 5


@respx.mock
def test_download_result(client, tmp_path):
    img_bytes = b"fake-png-data-1234"
    respx.get("https://cdn.upres.ai/results/abc123.png").mock(
        return_value=httpx.Response(200, content=img_bytes)
    )
    out = tmp_path / "out.png"
    client.download_result(MOCK_JOB, out)
    assert out.read_bytes() == img_bytes


@respx.mock
def test_429_raises_rate_limit_error(client):
    respx.get(f"https://api.upres.ai/v1/jobs/{MOCK_JOB['id']}").mock(
        return_value=httpx.Response(429, json={"error": "Rate limit exceeded."})
    )
    with pytest.raises(UpresError, match="Rate limit"):
        client.get_job(MOCK_JOB["id"])

/**
 * Unit tests for UpresClient — all HTTP calls are mocked.
 */

import { jest } from "@jest/globals";

// Mock global fetch before importing client
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { UpresClient } from "../src/client.js";

function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: new Headers(),
  } as unknown as Response;
}

const MOCK_JOB = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  status: "completed",
  model: "wavespeed-ai/real-esrgan",
  scale: 4,
  result_url: "https://cdn.upres.ai/results/abc123.png",
  error: null,
  original_filename: "photo.jpg",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:10Z",
};

describe("UpresClient", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    process.env.UPRES_API_KEY = "upres_test_key";
  });

  afterEach(() => {
    delete process.env.UPRES_API_KEY;
  });

  test("createJobFromUrl sends correct request", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(MOCK_JOB, 201));

    const client = new UpresClient();
    const job = await client.createJobFromUrl("https://example.com/photo.jpg", {
      model: "wavespeed-ai/real-esrgan",
      scale: 4,
    });

    expect(job.id).toBe(MOCK_JOB.id);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.upres.ai/v1/jobs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer upres_test_key",
        }),
      })
    );
  });

  test("getJob returns job by ID", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse(MOCK_JOB));

    const client = new UpresClient();
    const job = await client.getJob("550e8400-e29b-41d4-a716-446655440000");

    expect(job.status).toBe("completed");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.upres.ai/v1/jobs/550e8400-e29b-41d4-a716-446655440000",
      expect.objectContaining({ method: "GET" })
    );
  });

  test("listJobs passes query params correctly", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ data: [MOCK_JOB], has_more: false, next_cursor: null })
    );

    const client = new UpresClient();
    const result = await client.listJobs({ status: "completed", limit: 5 });

    expect(result.data).toHaveLength(1);
    const url = (mockFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("status=completed");
    expect(url).toContain("limit=5");
  });

  test("waitForJob polls until completed", async () => {
    const pendingJob = { ...MOCK_JOB, status: "pending" };
    mockFetch
      .mockResolvedValueOnce(mockResponse(pendingJob))
      .mockResolvedValueOnce(mockResponse(pendingJob))
      .mockResolvedValueOnce(mockResponse(MOCK_JOB));

    const client = new UpresClient();
    const job = await client.waitForJob(MOCK_JOB.id, { pollInterval: 0 });

    expect(job.status).toBe("completed");
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  test("401 response exits with auth error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: "Invalid or revoked API key." }, 401)
    );

    const client = new UpresClient();
    const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    await expect(client.getJob("any-id")).rejects.toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  test("402 response exits with quota error", async () => {
    mockFetch.mockResolvedValueOnce(
      mockResponse({ error: "Quota exceeded.", quota: 5, used: 5 }, 402)
    );

    const client = new UpresClient();
    const mockExit = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    await expect(client.createJobFromUrl("https://example.com/x.jpg")).rejects.toThrow();
    expect(mockExit).toHaveBeenCalledWith(1);
    mockExit.mockRestore();
  });

  test("downloadResult writes file to disk", async () => {
    const testBuffer = Buffer.from("fake-image-data");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      arrayBuffer: async () => testBuffer.buffer,
      headers: new Headers(),
    } as unknown as Response);

    const client = new UpresClient();
    const tmpPath = `/tmp/upres-test-${Date.now()}.jpg`;
    await client.downloadResult(MOCK_JOB, tmpPath);

    const { readFileSync } = await import("node:fs");
    const written = readFileSync(tmpPath);
    expect(written).toEqual(testBuffer);
  });
});

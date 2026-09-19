import { handleMessage } from "../src/mcp.ts";

describe("upres MCP stdio protocol", () => {
  test("initialize returns serverInfo and tools capability", async () => {
    const res = (await handleMessage({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {},
    })) as { result: { serverInfo: { name: string }; capabilities: { tools: object } } };
    expect(res.result.serverInfo.name).toBe("upres");
    expect(res.result.capabilities.tools).toEqual({});
  });

  test("tools/list exposes the five upscale tools", async () => {
    const res = (await handleMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    })) as { result: { tools: { name: string }[] } };
    const names = res.result.tools.map((t) => t.name).sort();
    expect(names).toEqual([
      "upres_get_credits",
      "upres_get_job",
      "upres_list_models",
      "upres_upscale_image",
      "upres_upscale_video",
    ]);
  });

  test("upres_list_models works without an API key", async () => {
    const res = (await handleMessage({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "upres_list_models", arguments: {} },
    })) as { result: { content: { text: string }[] } };
    const text = JSON.parse(res.result.content[0].text) as { id: string }[];
    expect(text.map((m) => m.id)).toEqual([
      "flare",
      "prism",
      "lumen",
      "mirage",
      "motion",
      "motion-x",
    ]);
  });

  test("upres_upscale_image without url returns an error payload", async () => {
    const res = (await handleMessage({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "upres_upscale_image", arguments: {} },
    })) as { result: { isError: boolean; content: { text: string }[] } };
    expect(res.result.isError).toBe(true);
    expect(res.result.content[0].text).toMatch(/image_url/);
  });

  test("unknown method is json-rpc -32601", async () => {
    const res = (await handleMessage({
      jsonrpc: "2.0",
      id: 5,
      method: "nope",
    })) as { error: { code: number } };
    expect(res.error.code).toBe(-32601);
  });
});

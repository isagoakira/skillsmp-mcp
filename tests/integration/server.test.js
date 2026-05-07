/**
 * Integration tests for the MCP server.
 *
 * These tests spawn the actual server process and communicate via stdio
 * using the JSON-RPC MCP protocol. They require the `npx skills` CLI
 * to be available (network access).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startServer, stopServer, waitForReady } from "../helpers/test-server.js";

describe("MCP Server — integration", () => {
  let server;
  let sendRequest;

  beforeAll(async () => {
    const env = startServer();
    server = env.server;
    sendRequest = env.sendRequest;
    await waitForReady(server, sendRequest);
  }, 30000);

  afterAll(() => {
    stopServer(server);
  });

  describe("tools/list", () => {
    it("should return all 6 tools", async () => {
      const response = await sendRequest("tools/list");
      expect(response.result).toBeDefined();
      expect(response.result.tools).toBeInstanceOf(Array);
      expect(response.result.tools.length).toBe(6);
    });

    it("should include all expected tool names", async () => {
      const response = await sendRequest("tools/list");
      const names = response.result.tools.map((t) => t.name).sort();
      expect(names).toEqual([
        "install_skill",
        "list_installed_skills",
        "list_package_skills",
        "remove_skill",
        "search_skills",
        "update_skills",
      ]);
    });

    it("each tool should have name, description, and inputSchema", async () => {
      const { result } = await sendRequest("tools/list");
      for (const tool of result.tools) {
        expect(tool.name).toBeTypeOf("string");
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.description).toBeTypeOf("string");
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.inputSchema).toBeTypeOf("object");
      }
    });
  });

  describe("tools/call — search_skills", () => {
    it("should return results for a valid query", async () => {
      const response = await sendRequest("tools/call", {
        name: "search_skills",
        arguments: { query: "react" },
      });
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
      expect(response.result.content[0].type).toBe("text");
      expect(response.result.content[0].text.length).toBeGreaterThan(0);
    }, 30000);

    it("should return error when query is empty", async () => {
      const response = await sendRequest("tools/call", {
        name: "search_skills",
        arguments: { query: "" },
      });
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain("Error");
    });
  });

  describe("tools/call — list_installed_skills", () => {
    it("should return a list (possibly empty)", async () => {
      const response = await sendRequest("tools/call", {
        name: "list_installed_skills",
        arguments: {},
      });
      expect(response.result).toBeDefined();
      expect(response.result.content).toBeInstanceOf(Array);
    }, 30000);
  });

  describe("tools/call — unknown tool", () => {
    it("should return an error for unknown tool", async () => {
      const response = await sendRequest("tools/call", {
        name: "nonexistent_tool",
        arguments: {},
      });
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe(-32601); // MethodNotFound
    });
  });

  describe("tools/call — list_package_skills", () => {
    it("should return error when package is missing", async () => {
      const response = await sendRequest("tools/call", {
        name: "list_package_skills",
        arguments: {},
      });
      expect(response.result).toBeDefined();
      expect(response.result.content[0].text).toContain("Error");
    });
  });
});

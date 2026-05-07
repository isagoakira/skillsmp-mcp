/**
 * Test helper — launch and interact with the MCP server via stdio.
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SERVER_PATH = resolve(__dirname, "../../index.js");

/**
 * Start the MCP server and return the child process + a send helper.
 */
export function startServer() {
  const server = spawn("node", [SERVER_PATH], {
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env },
  });

  // Log stderr for debugging
  server.stderr.on("data", (d) => process.stderr.write(`[server] ${d}`));

  /**
   * Send a JSON-RPC request and wait for a response.
   * @param {string} method
   * @param {object} params
   * @param {number} [timeoutMs=15000]
   * @returns {Promise<object>}
   */
  function sendRequest(method, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: "2.0",
        id: String(Date.now()) + String(Math.random()).slice(2),
        method,
        params,
      };

      const timer = setTimeout(() => {
        server.stdout.removeListener("data", onData);
        reject(new Error(`Response timeout after ${timeoutMs}ms for ${method}`));
      }, timeoutMs);

      let buffer = "";

      function onData(chunk) {
        buffer += chunk.toString();
        try {
          const result = JSON.parse(buffer);
          clearTimeout(timer);
          server.stdout.removeListener("data", onData);
          resolve(result);
        } catch {
          // incomplete JSON — wait for more data
        }
      }

      server.stdout.on("data", onData);
      server.stdin.write(JSON.stringify(request) + "\n");
    });
  }

  return { server, sendRequest };
}

/**
 * Stop the MCP server.
 */
export function stopServer(serverProcess) {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill("SIGTERM");
  }
}

/**
 * Wait for a server to be ready (retry tools/list).
 */
export async function waitForReady(serverProcess, sendRequest, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await sendRequest("tools/list", {}, 3000);
      if (res.result) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("Server did not become ready in time");
}

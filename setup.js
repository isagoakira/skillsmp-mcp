#!/usr/bin/env node

/**
 * skillsmp-mcp — Plug-and-Play Setup
 *
 * One-command setup that registers the MCP server with Claude Code.
 *
 * Usage:
 *   node setup.js             # Interactive (asks global vs local)
 *   node setup.js --local     # Install to project .claude/mcp.json
 *   node setup.js --global    # Install to ~/.claude/mcp.json
 *   node setup.js --all       # Install to both
 *   node setup.js --test      # Test connection only
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

// ── Self-location ──────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname);

// ── Helpers ────────────────────────────────────────────────────────────────

function readJSON(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

function writeJSON(path, data) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function mergeMCPConfig(existingPath, serverName, serverConfig) {
  let existing = readJSON(existingPath) || {};
  if (!existing.mcpServers) existing.mcpServers = {};
  existing.mcpServers[serverName] = serverConfig;
  writeJSON(existingPath, existing);
}

function ask(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim().toLowerCase());
    })
  );
}

function header(text) {
  console.log(`\n\x1b[36m═══ ${text} ═══\x1b[0m\n`);
}

function ok(text) {
  console.log(`  \x1b[32m✓\x1b[0m  ${text}`);
}

function info(text) {
  console.log(`  \x1b[34mℹ\x1b[0m  ${text}`);
}

function warn(text) {
  console.log(`  \x1b[33m⚠\x1b[0m  ${text}`);
}

// ── MCP server config ──────────────────────────────────────────────────────

function localServerConfig() {
  return {
    command: "node",
    args: ["index.js"],
    env: {},
    disabled: false,
    autoApprove: [
      "search_skills",
      "list_installed_skills",
      "list_package_skills",
    ],
  };
}

function globalServerConfig() {
  return {
    command: "node",
    args: [resolve(PROJECT_ROOT, "index.js")],
    env: {},
    disabled: false,
    autoApprove: [
      "search_skills",
      "list_installed_skills",
      "list_package_skills",
    ],
  };
}

// ── Installation ───────────────────────────────────────────────────────────

const SERVER_NAME = "skillsmp";

function installLocal() {
  const mcpPath = resolve(PROJECT_ROOT, ".claude", "mcp.json");
  mergeMCPConfig(mcpPath, SERVER_NAME, localServerConfig());
  ok(`Project MCP config: ${mcpPath}`);
  ok(`  → Works in project directory (relative path: index.js)`);
}

function installGlobal() {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const globalMcp = resolve(homeDir, ".claude", "mcp.json");
  mergeMCPConfig(globalMcp, SERVER_NAME, globalServerConfig());
  ok(`Global MCP config: ${globalMcp}`);
  ok(`  → Works from any directory (absolute path)`);
}

// ── Testing ────────────────────────────────────────────────────────────────

async function testConnection() {
  header("Testing MCP Server Connection");

  try {
    const serverPath = resolve(PROJECT_ROOT, "index.js");
    const input = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }) + "\n";

    // Spawn server, pipe JSON-RPC request, capture response with timeout
    const result = spawnSync("node", [serverPath], {
      input,
      encoding: "utf-8",
      timeout: 10000,
      maxBuffer: 1024 * 1024,
    });

    if (result.error) {
      throw result.error;
    }

    const parsed = JSON.parse(result.stdout);
    const toolNames = parsed?.result?.tools?.map((t) => t.name) || [];
    ok(`Server responded with ${toolNames.length} tools:`);
    toolNames.forEach((name) => console.log(`    • ${name}`));
    return true;
  } catch (err) {
    warn(`Connection test failed: ${err.message}`);
    return false;
  }
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const flags = {
    local: args.includes("--local"),
    global: args.includes("--global"),
    all: args.includes("--all"),
    test: args.includes("--test"),
    help: args.includes("--help") || args.includes("-h"),
  };

  console.log(`
  ╔══════════════════════════════════════╗
  ║   skillsmp-mcp  —  Plug & Play Setup ║
  ╚══════════════════════════════════════╝
  `);

  if (flags.help) {
    console.log(`  Usage: node setup.js [options]

  Options:
    --local    Install to project .claude/mcp.json (portable, git-friendly)
    --global   Install to ~/.claude/mcp.json (available everywhere)
    --all      Install to both local and global
    --test     Test MCP server connection only
    -h, --help  Show this help
    `);
    return;
  }

  if (flags.test) {
    await testConnection();
    return;
  }

  // ── Install phase ──────────────────────────────────────────────────────

  header("Installing MCP Server");

  let doLocal = flags.local || flags.all || (!flags.global && !flags.all);
  let doGlobal = flags.global || flags.all;

  if (!flags.local && !flags.global && !flags.all) {
    // Interactive mode
    console.log("  Choose installation scope:\n");
    console.log("    1)  Project only     — works in this project directory");
    console.log("    2)  Global only      — works everywhere");
    console.log("    3)  Both             — (recommended)");
    console.log("    4)  Test connection  — verify without installing\n");

    const answer = await ask("  Your choice [1/2/3/4]: ");

    if (answer === "2") {
      doGlobal = true;
      doLocal = false;
    } else if (answer === "3") {
      doGlobal = true;
      doLocal = true;
    } else if (answer === "4") {
      await testConnection();
      return;
    } else {
      doLocal = true;
      doGlobal = false;
    }
  }

  if (doLocal) {
    info("Installing to project scope...");
    installLocal();
  }

  if (doGlobal) {
    info("Installing to global scope...");
    installGlobal();
  }

  // ── Verify installation ─────────────────────────────────────────────────

  header("Verification");

  if (doLocal) {
    const mcpPath = resolve(PROJECT_ROOT, ".claude", "mcp.json");
    const cfg = readJSON(mcpPath);
    if (cfg?.mcpServers?.[SERVER_NAME]) {
      ok(`Project config valid at .claude/mcp.json`);
    } else {
      warn(`Project config not found at .claude/mcp.json`);
    }
  }

  if (doGlobal) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const globalMcp = resolve(homeDir, ".claude", "mcp.json");
    const cfg = readJSON(globalMcp);
    if (cfg?.mcpServers?.[SERVER_NAME]) {
      ok(`Global config valid at ~/.claude/mcp.json`);
    } else {
      warn(`Global config not found at ~/.claude/mcp.json`);
    }
  }

  // ── Test ────────────────────────────────────────────────────────────────

  console.log("");
  const success = await testConnection();

  // ── Summary ─────────────────────────────────────────────────────────────

  header("Summary");

  if (success) {
    ok(`skillsmp-mcp is ready to use!`);
    if (doLocal) {
      info(`Project:  Claude Code will auto-discover in this project`);
    }
    if (doGlobal) {
      info(`Global:   Available in all Claude Code sessions`);
    }
    console.log(`
  Next steps:
    1) Restart Claude Code
    2) The "skillsmp" MCP server will be available
    3) Call tools like:
       • search_skills(query: "react testing")
       • list_installed_skills(global: true)
       • install_skill(package: "vercel-labs/agent-skills", global: true)
    `);
  } else {
    warn(`Installation complete, but connection test failed.`);
    info(`Try restarting Claude Code and check if the server works.`);
    info(`Debug: run "node ${resolve(PROJECT_ROOT, "setup.js")} --test"`);
  }
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});

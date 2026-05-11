#!/usr/bin/env node

/**
 * skillsmp-mcp — MCP server for searching and installing skills
 * from the SkillsMP marketplace via the `npx skills` CLI.
 *
 * Tools:
 *   - search_skills          Search marketplace by keyword
 *   - install_skill          Install a skill package
 *   - list_installed_skills  List globally/project installed skills
 *   - remove_skill           Remove one or more installed skills
 *   - update_skills          Update all / specific skills
 *   - list_package_skills    List available skills in a repo without installing
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const IS_WINDOWS = platform() === "win32";

// ---------------------------------------------------------------------------
// Startup health check
// ---------------------------------------------------------------------------

function checkDependencies() {
  try {
    const result = spawnSync("npx", ["skills", "--version"], {
      encoding: "utf-8",
      timeout: 15_000,
      shell: IS_WINDOWS,
    });
    if (result.error || result.status !== 0) {
      console.error(
        "ERROR: 'npx skills' CLI is not available.\n" +
        "  Install it with: npm install -g skillsmp-cli\n" +
        "  Or via npx: npx skills --help\n" +
        "  The skillsmp-mcp server requires this CLI to function."
      );
      process.exit(1);
    }
    console.error(`skillsmp-mcp using: npx skills ${(result.stdout || "").trim()}`);
  } catch (err) {
    console.error("ERROR: Failed to check 'npx skills' dependency:", err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run `npx skills …` and return { stdout, stderr, exitCode }.
 * Uses spawnSync with an argument array to avoid shell injection.
 */
function runSkills(args, options = {}) {
  try {
    const result = spawnSync("npx", ["skills", ...args], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60_000,
      shell: IS_WINDOWS,
      ...options,
    });
    return {
      stdout: result.stdout?.trim() ?? "",
      stderr: result.stderr?.trim() ?? "",
      exitCode: result.status ?? 1,
    };
  } catch (err) {
    return { stdout: "", stderr: err.message, exitCode: 1 };
  }
}

/**
 * Build a successful text result for the LLM.
 */
function textResult(message) {
  return {
    content: [{ type: "text", text: message }],
  };
}

/**
 * Build an error result with isError flag per MCP protocol.
 */
function errorResult(message) {
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${message}` }],
  };
}

// ---------------------------------------------------------------------------
// Tool annotations — follow MCP best practices
// ---------------------------------------------------------------------------

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const MUTATES = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "search_skills",
    description:
      "Search for skills on the SkillsMP marketplace by keyword. " +
      "Returns a list of matching skill packages with descriptions. " +
      "Use this to discover available skills before installing.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Search keywords (e.g. 'react testing', 'pr review', 'code review'). " +
            "Supports partial and fuzzy matching against skill names and descriptions.",
        },
      },
      required: ["query"],
    },
    outputSchema: {
      type: "object",
      properties: {
        results: { type: "array" },
        total: { type: "number" },
      },
    },
    annotations: READ_ONLY,
  },
  {
    name: "install_skill",
    description:
      "Install a skill package from the SkillsMP marketplace. " +
      "Supports global (user-level) and project-level installation. " +
      "Can target specific agents, specific skills within a package, " +
      "or install all skills from a package at once.",
    inputSchema: {
      type: "object",
      properties: {
        package: {
          type: "string",
          description:
            "Package identifier, e.g. 'vercel-labs/agent-skills' or " +
            "'vercel-labs/agent-skills@pr-review'. " +
            "You can use GitHub repo shorthand (owner/repo) or full URLs.",
        },
        global: {
          type: "boolean",
          description: "Install globally (user-level). Default: false (project-level)",
          default: false,
        },
        skill: {
          type: "string",
          description:
            "Specific skill name(s) inside the package to install. " +
            "Use '*' for all skills in the package. " +
            "Default: installs the whole package's default skill set.",
        },
        agent: {
          type: "string",
          description:
            "Target agent(s) to install the skill for. " +
            "Use '*' for all agents. " +
            "Default: auto-detects the current agent.",
        },
        all: {
          type: "boolean",
          description:
            "Shorthand for --skill '*' --agent '*' -y. " +
            "Installs every skill from the package to every agent without prompts.",
          default: false,
        },
        yes: {
          type: "boolean",
          description: "Skip all confirmation prompts. Default: false",
          default: false,
        },
        copy: {
          type: "boolean",
          description:
            "Copy files instead of symlinking to agent directories. " +
            "Use this if you want the skills to be independent of the source. Default: false",
          default: false,
        },
      },
      required: ["package"],
    },
    annotations: MUTATES,
  },
  {
    name: "list_installed_skills",
    description:
      "List all installed skill packages (global or project-level). " +
      "Returns formatted JSON with skill names, versions, agents, and paths. " +
      "Optionally filter by agent name.",
    inputSchema: {
      type: "object",
      properties: {
        global: {
          type: "boolean",
          description:
            "List global (user-level) installed skills. " +
            "Default: false (lists project-level skills)",
          default: false,
        },
        agent: {
          type: "string",
          description:
            "Filter results by agent name (e.g. 'claude-code', 'cursor'). " +
            "Returns only skills installed for that agent.",
        },
      },
    },
    outputSchema: {
      type: "object",
      properties: {
        skills: { type: "array" },
      },
    },
    annotations: READ_ONLY,
  },
  {
    name: "remove_skill",
    description:
      "Remove one or more installed skills. " +
      "Supports global/project scope, agent targeting, and batch removal. " +
      "Use 'all: true' to remove every installed skill.",
    inputSchema: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: { type: "string" },
          description:
            "Skill name(s) to remove (e.g. ['pr-review', 'commit']). " +
            "Leave empty and use 'all: true' to remove all skills.",
        },
        global: {
          type: "boolean",
          description: "Remove from global (user-level) scope. Default: false",
          default: false,
        },
        agent: {
          type: "string",
          description:
            "Remove skills installed for a specific agent. " +
            "Use '*' for all agents.",
        },
        all: {
          type: "boolean",
          description: "Remove ALL installed skills. Use with caution. Default: false",
          default: false,
        },
        yes: {
          type: "boolean",
          description: "Skip confirmation prompts. Default: false",
          default: false,
        },
      },
    },
    annotations: MUTATES,
  },
  {
    name: "update_skills",
    description:
      "Update installed skills to their latest versions. " +
      "Can update all skills at once or specific named skills. " +
      "Auto-detects scope (project vs global) when not specified.",
    inputSchema: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific skill names to update (e.g. ['pr-review', 'commit']). " +
            "Leave empty to update all installed skills.",
        },
        global: {
          type: "boolean",
          description:
            "Update global (user-level) skills only. Default: auto-detect",
          default: false,
        },
        project: {
          type: "boolean",
          description:
            "Update project-level skills only. Default: auto-detect",
          default: false,
        },
        yes: {
          type: "boolean",
          description:
            "Skip scope prompt and auto-detect the scope. Default: false",
          default: false,
        },
      },
    },
    annotations: MUTATES,
  },
  {
    name: "list_package_skills",
    description:
      "List available skills inside a repository package without installing them. " +
      "Use this to preview what's available in a package before deciding to install. " +
      "Returns skill names and descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        package: {
          type: "string",
          description:
            "Package identifier, e.g. 'vercel-labs/agent-skills' or " +
            "'github:owner/repo'. The GitHub repository to inspect.",
        },
      },
      required: ["package"],
    },
    outputSchema: {
      type: "object",
      properties: {
        skills: { type: "array" },
        package: { type: "string" },
      },
    },
    annotations: READ_ONLY,
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function handleSearchSkills(args) {
  const query = args.query ?? "";
  if (!query.trim()) {
    return errorResult("'query' parameter is required. Please provide search keywords (e.g. 'react testing', 'pr review').");
  }
  const { stdout, stderr, exitCode } = runSkills(["find", query]);
  if (exitCode !== 0 && !stdout) {
    return errorResult(
      `Search failed (exit ${exitCode}): ${stderr || "Unknown error. Verify that 'npx skills' is installed with: npm install -g skillsmp-cli"}`
    );
  }
  const results = stdout || "No results found.";
  return textResult(results);
}

function handleInstallSkill(args) {
  const pkg = args.package;
  if (!pkg) {
    return errorResult("'package' parameter is required. Provide a package identifier like 'vercel-labs/agent-skills'.");
  }

  const cliArgs = ["add", pkg];
  if (args.global) cliArgs.push("-g");
  if (args.yes) cliArgs.push("-y");
  if (args.all) cliArgs.push("--all");
  if (args.copy) cliArgs.push("--copy");
  if (args.skill) {
    cliArgs.push("-s", args.skill);
  }
  if (args.agent) {
    cliArgs.push("-a", args.agent);
  }

  const { stdout, stderr, exitCode } = runSkills(cliArgs);
  if (exitCode !== 0) {
    return errorResult(
      `Install failed (exit ${exitCode}): ${stderr || stdout || "Unknown error. Check that the package name is correct and try again."}`
    );
  }
  return textResult(stdout || `Skill "${pkg}" installed successfully.`);
}

function handleListInstalledSkills(args) {
  const cliArgs = ["list", "--json"];
  if (args.global) cliArgs.push("-g");
  if (args.agent) cliArgs.push("-a", args.agent);

  const { stdout, stderr, exitCode } = runSkills(cliArgs);
  if (exitCode !== 0) {
    return errorResult(
      `List failed (exit ${exitCode}): ${stderr || stdout || "No skills are currently installed."}`
    );
  }

  // Pretty-print JSON when possible
  try {
    const data = JSON.parse(stdout);
    return textResult(JSON.stringify(data, null, 2));
  } catch {
    return textResult(stdout || "No installed skills found.");
  }
}

function handleRemoveSkill(args) {
  const cliArgs = ["remove"];
  if (args.skills?.length) cliArgs.push(...args.skills);
  if (args.global) cliArgs.push("-g");
  if (args.yes) cliArgs.push("-y");
  if (args.all) cliArgs.push("--all");
  if (args.agent) cliArgs.push("-a", args.agent);

  const { stdout, stderr, exitCode } = runSkills(cliArgs);
  if (exitCode !== 0) {
    return errorResult(
      `Remove failed (exit ${exitCode}): ${stderr || stdout || "Check the skill names and try again."}`
    );
  }
  return textResult(stdout || "Skill(s) removed successfully.");
}

function handleUpdateSkills(args) {
  const cliArgs = ["update"];
  if (args.skills?.length) cliArgs.push(...args.skills);
  if (args.global) cliArgs.push("-g");
  if (args.project) cliArgs.push("-p");
  if (args.yes) cliArgs.push("-y");

  const { stdout, stderr, exitCode } = runSkills(cliArgs);
  if (exitCode !== 0) {
    return errorResult(
      `Update failed (exit ${exitCode}): ${stderr || stdout || "Check that skills are installed and try again."}`
    );
  }
  return textResult(stdout || "Skills updated successfully.");
}

function handleListPackageSkills(args) {
  const pkg = args.package;
  if (!pkg) {
    return errorResult("'package' parameter is required. Provide a package identifier like 'vercel-labs/agent-skills'.");
  }

  const { stdout, stderr, exitCode } = runSkills(["add", pkg, "-l"]);
  if (exitCode !== 0) {
    return errorResult(
      `List failed (exit ${exitCode}): ${stderr || stdout || "Check that the package exists and try again."}`
    );
  }
  return textResult(stdout || "No skills found in this package.");
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new Server(
  {
    name: "skillsmp-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ListTools — includes annotations for MCP best practices
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ annotations, outputSchema, ...rest }) => ({
    ...rest,
    annotations,
    outputSchema,
  })),
}));

// CallTool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "search_skills":
      return handleSearchSkills(args ?? {});

    case "install_skill":
      return handleInstallSkill(args ?? {});

    case "list_installed_skills":
      return handleListInstalledSkills(args ?? {});

    case "remove_skill":
      return handleRemoveSkill(args ?? {});

    case "update_skills":
      return handleUpdateSkills(args ?? {});

    case "list_package_skills":
      return handleListPackageSkills(args ?? {});

    default:
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${name}`
      );
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  // Verify dependencies before starting
  checkDependencies();

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("skillsmp-mcp MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

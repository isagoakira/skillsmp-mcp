# skillsmp-mcp

**Plug-and-play MCP server for searching and installing skills from the [SkillsMP marketplace](https://skillsmp.com) — 700K+ open-source AI skills.**

skillsmp-mcp bridges Claude Code (or any MCP-compatible host) with the SkillsMP marketplace, allowing AI agents to discover, install, manage, and update skills without leaving the chat interface.

---

## Features

- **Search marketplace** — Find skills by keyword across 700K+ open-source skill packages.
- **Install skills** — Install skill packages globally or per-project with fine-grained options (specific skills, target agents, copy vs symlink).
- **List installed skills** — View all installed skills at the global or project level, optionally filtered by agent.
- **Remove skills** — Uninstall one or more skills by name or remove all at once.
- **Update skills** — Update all installed skills or specific ones to the latest version.
- **Preview package contents** — List available skills inside a repository without installing.
- **One-command setup** — Built-in `setup.js` registers the server with Claude Code in seconds.
- **Auto-approve ready** — Read-only tools pre-configured for auto-approval.
- **MCP best practices** — Tool annotations (`readOnlyHint`, `destructiveHint`), proper error responses (`isError: true`), startup dependency checks.

---

## Prerequisites

- **Node.js >= 18.0.0** (required by the `@modelcontextprotocol/sdk`)
- **`npx skills` CLI** (automatically detected at startup; install with `npm install -g skillsmp-cli`)

---

## Installation

### Option 1: Global npm install (recommended)

```bash
npm install -g skillsmp-mcp
```

Then configure your MCP host to run `skillsmp-mcp`.

### Option 2: Run via npx (no install)

```bash
npx skillsmp-mcp
```

### Option 3: Local setup from source

```bash
git clone https://github.com/isagoakira/skillsmp-mcp.git
cd skillsmp-mcp
npm install

# Interactive setup (prompts for scope)
node setup.js

# Or choose a scope directly:
node setup.js --local    # Project-level only
node setup.js --global   # User-level global
node setup.js --all      # Both
```

After running `setup.js`, restart Claude Code. The MCP server will be registered under the name `skillsmp`.

---

## Quick Start

Once the server is running, call any of the six tools from your MCP host:

### Search Skills

Search the marketplace for available skills:

```json
{
  "query": "react testing"
}
```

**Result:** A list of matching skill packages with descriptions from the marketplace.

### Install a Skill

Install a skill package globally to all agents:

```json
{
  "package": "vercel-labs/agent-skills",
  "global": true,
  "skill": "*",
  "agent": "*",
  "yes": true
}
```

**Result:** Installs all skills from the specified package globally, targeting all agents.

### List Installed Skills

```json
{
  "global": true
}
```

**Result:** JSON list of all globally installed skill packages.

### Remove a Skill

```json
{
  "skills": ["pr-review"],
  "global": true,
  "yes": true
}
```

**Result:** Removes the specified skill(s).

### Update Skills

```json
{
  "yes": true
}
```

**Result:** Updates all installed skills to their latest versions.

### Preview Package Contents

Inspect a package without installing:

```json
{
  "package": "vercel-labs/agent-skills"
}
```

**Result:** Lists available skills inside the package.

---

## Tools

| Tool | Description | Modifies State |
|------|-------------|:---:|
| `search_skills` | Search marketplace by keyword | No |
| `install_skill` | Install a skill package | Yes |
| `list_installed_skills` | List installed skills (global or project) | No |
| `remove_skill` | Remove one or more installed skills | Yes |
| `update_skills` | Update skills to latest versions | Yes |
| `list_package_skills` | List skills in a repo without installing | No |

All tools follow MCP best practices with:
- **Tool annotations** — `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
- **Proper error handling** — Errors returned with `isError: true` flag
- **Actionable error messages** — Clear guidance on fixing issues

---

## Configuration

### Auto-Approve

The setup script pre-configures **read-only** tools for auto-approval:

| Tool | Reason |
|------|--------|
| `search_skills` | Read-only marketplace search |
| `list_installed_skills` | Read-only listing |
| `list_package_skills` | Read-only package inspection |

Tools that modify state (`install_skill`, `remove_skill`, `update_skills`) require explicit user confirmation. You can add them to `autoApprove` in `mcp.json` if desired:

```json
{
  "mcpServers": {
    "skillsmp": {
      "command": "node",
      "args": ["path/to/index.js"],
      "env": {},
      "disabled": false,
      "autoApprove": [
        "search_skills",
        "list_installed_skills",
        "list_package_skills"
      ]
    }
  }
}
```

### MCP Config Locations

- **Project level:** `.claude/mcp.json` (inside your project root)
- **Global level:** `~/.claude/mcp.json` (home directory)

---

## Project Structure

```
skillsmp-mcp/
├── index.js              # MCP server: tool definitions, handlers, stdio transport
├── setup.js              # One-command setup script for Claude Code registration
├── package.json          # NPM package metadata
├── CLAUDE.md             # Claude Code project documentation
├── evaluation.xml        # MCP evaluation suite (10 read-only questions)
├── LICENSE               # MIT license
├── README.md             # This file
├── CHANGELOG.md          # Version history
├── CONTRIBUTING.md       # Contribution guidelines
├── CODE_OF_CONDUCT.md    # Code of conduct
├── SECURITY.md           # Security policy
├── .claude/
│   └── mcp.json          # MCP server registration (auto-discovered)
├── .github/
│   ├── workflows/
│   │   ├── ci.yml        # CI: lint + test (Node 18/20/22) + coverage
│   │   └── publish.yml   # npm publish on release
│   ├── ISSUE_TEMPLATE/   # Bug report & feature request templates
│   └── PULL_REQUEST_TEMPLATE.md
└── tests/
    ├── helpers/
    │   └── test-server.js      # Server spawn/request helpers
    ├── integration/
    │   └── server.test.js      # Live MCP protocol tests (8 tests)
    └── unit/
        └── setup.test.js       # Config & security verification (8 tests)
```

---

## Tech Stack

- **Runtime:** Node.js >= 18
- **Framework:** [Model Context Protocol SDK](https://github.com/modelcontextprotocol/typescript-sdk) (`@modelcontextprotocol/sdk` v1.x)
- **Transport:** stdio (standard input/output)
- **Underlying CLI:** `npx skills` (SkillsMP CLI)
- **Testing:** [Vitest](https://vitest.dev/) v4 (unit + integration + coverage)

---

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test            # 16 tests (8 unit + 8 integration)
npm run test:watch  # Watch mode
npm run test:coverage

# Test server connection
node setup.js --test
```

### Code Quality

- **Security:** Uses `spawnSync` with argument arrays (no shell injection)
- **Linting:** ESLint + Prettier configured
- **Startup check:** Verifies `npx skills` CLI availability on boot

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on the development workflow, code style, and pull request process.

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

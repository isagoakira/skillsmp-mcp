# skillsmp-mcp — MCP Server for SkillsMP Marketplace

## Overview

A plug-and-play MCP server that bridges Claude Code with the SkillsMP marketplace (700K+ open-source skills). Allows AI agents to discover, install, manage, and update skills without leaving the chat interface.

## Quick Start

```bash
node setup.js          # Interactive setup
node setup.js --local  # Project-level registration
node setup.js --global # Global registration
node setup.js --test   # Test connection only
```

After setup, restart Claude Code. The server auto-registers via `.claude/mcp.json`.

## Tools

All tools follow the `{action}_{resource}` naming pattern:

| Tool | Description | Destructive? |
|------|-------------|-------------|
| `search_skills` | Search marketplace by keyword | No (read-only) |
| `install_skill` | Install a skill package (requires `package` param) | Yes |
| `list_installed_skills` | List installed skills (global or project) | No (read-only) |
| `remove_skill` | Remove installed skills | Yes |
| `update_skills` | Update skills to latest versions | Yes |
| `list_package_skills` | List skills in a repo without installing | No (read-only) |

## Architecture

- **Runtime**: Node.js >= 18, stdio transport
- **Framework**: `@modelcontextprotocol/sdk` v1.x (`Server` + `setRequestHandler`)
- **Self-contained**: No external CLI dependency — all skill management logic is inline
- **Registry**: Searches npm registry API (`fetch`), resolves GitHub repos via GitHub API
- **Storage**: `~/.skillsmp/` (global) or `.skillsmp/` (project) with JSON manifest
- **Error handling**: Returns `{ isError: true, content: [...] }` per MCP protocol

## Code Structure

- `index.js` — MCP server entry point: tool definitions, handlers, tool annotations
- `setup.js` — Registration script: writes `.claude/mcp.json` (local/global/both)
- `src/registry.js` — npm registry search, package info, GitHub API integration
- `src/installer.js` — Skill install/remove/update lifecycle, manifest management
- `src/state.js` — Storage paths and manifest read/write helpers
- `tests/` — Unit and integration tests via Vitest
  - `tests/unit/setup.test.js` — Source-level config verification
  - `tests/integration/server.test.js` — Live server testing via stdio JSON-RPC
  - `tests/helpers/test-server.js` — Server spawn/request helpers

## Conventions

- Tool names use `snake_case`: `search_skills`, `install_skill`
- Error responses use `isError: true` flag (not thrown exceptions for tool-level errors)
- Tool annotations follow MCP best practices (`readOnlyHint`, `destructiveHint`, etc.)
- Network tools are async; filesystem tools are synchronous

## Testing

```bash
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
npm run test:integration   # Setup + integration test
```

## Publishing

```bash
npm publish                # Publish to npm registry
```

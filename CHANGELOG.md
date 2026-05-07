# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-05-07

### Added

- **MCP Server** — Full Model Context Protocol server over stdio transport.
- **Tool: `search_skills`** — Search the SkillsMP marketplace by keyword. Returns matching skill packages with descriptions.
- **Tool: `install_skill`** — Install a skill package from the marketplace. Supports global/project scope, specific skills, target agents, symlink or copy mode, and batch installation via `--all`.
- **Tool: `list_installed_skills`** — List all installed skill packages at the global or project level. Optionally filter by agent. Returns formatted JSON output.
- **Tool: `remove_skill`** — Remove one or more installed skills. Supports global scope, agent targeting, and batch removal via `--all`.
- **Tool: `update_skills`** — Update installed skills to their latest versions. Supports global-only or project-only scoping.
- **Tool: `list_package_skills`** — List available skills inside a repository without installing them.
- **Setup Script** (`setup.js`) — Interactive and non-interactive installation to Claude Code configuration:
  - `--local` — Register as a project-level MCP server.
  - `--global` — Register as a user-level (global) MCP server.
  - `--all` — Register in both scopes.
  - `--test` — Test server connection without installing.
- **Auto-approve configuration** — Read-only tools (`search_skills`, `list_installed_skills`, `list_package_skills`) pre-marked for auto-approval.
- **Error handling** — Graceful error reporting for missing arguments, failed commands, and unexpected tool names.
- **Documentation** — README, LICENSE, CHANGELOG, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, and GitHub issue/PR templates.

[1.0.0]: https://github.com/skillsmp/skillsmp-mcp/releases/tag/v1.0.0

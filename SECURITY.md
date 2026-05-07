# Security Policy

## Supported Versions

The following versions of skillsmp-mcp are currently supported with security updates:

| Version | Supported          |
|---------|--------------------|
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

Always use the latest version to ensure you have all security fixes.

---

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue in skillsmp-mcp, please report it by opening a [GitHub Issue](https://github.com/skillsmp/skillsmp-mcp/issues).

When reporting, please include:

- **Description** of the vulnerability and its impact.
- **Steps to reproduce** the issue.
- **Affected versions**.
- **Potential mitigations**, if known.

Do not publicly disclose the vulnerability until we have had a chance to investigate and respond.

---

## Response Timeline

You can expect the following from the maintainers:

- **Acknowledgement** within 3 business days of your report.
- **Initial assessment** and confirmation of the vulnerability within 7 business days.
- **Fix timeline** communicated once the assessment is complete (typically within 14 days for moderate severity issues).

---

## Security-Relevant Configuration

### Auto-Approve Tools

The setup script pre-configures auto-approval for read-only tools only:

- `search_skills`
- `list_installed_skills`
- `list_package_skills`

Tools that modify state (`install_skill`, `remove_skill`, `update_skills`) require explicit user confirmation. This is a security measure to prevent unintended modifications to your skill environment.

You should review the `autoApprove` array in your `mcp.json` configuration before adding write tools to it.

### Local vs. Global Scope

- **Project-level installation** restricts the MCP server to a specific project directory.
- **Global installation** makes the server available across all sessions.

Choose the scope appropriate to your trust model. If you are working in a shared environment, prefer project-level installation.

---

## Dependencies

This project depends on external packages (see `package.json`). We recommend:

- Running `npm audit` regularly to check for known vulnerabilities in dependencies.
- Keeping `@modelcontextprotocol/sdk` updated to the latest version.
- Using `npm update` to apply minor and patch-level dependency updates.

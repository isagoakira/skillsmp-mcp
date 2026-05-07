# Contributing to skillsmp-mcp

Thank you for your interest in contributing to skillsmp-mcp! We welcome contributions of all kinds: bug fixes, feature additions, documentation improvements, and issue reporting.

---

## Table of Contents

- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Code of Conduct](#code-of-conduct)

---

## Development Setup

1. **Fork the repository** on GitHub.

2. **Clone your fork:**

   ```bash
   git clone https://github.com/<your-username>/skillsmp-mcp.git
   cd skillsmp-mcp
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Run the server in development mode:**

   ```bash
   node index.js
   ```

   The server listens on stdio. You can test it with the inspector:

   ```bash
   npx @modelcontextprotocol/inspector node index.js
   ```

   Or run the built-in connection test:

   ```bash
   node setup.js --test
   ```

---

## Code Style

This project uses:

- **ESLint** — for static analysis and consistent code patterns.
- **Prettier** — for automatic code formatting.

Before submitting a pull request, ensure your code passes linting:

```bash
# Lint your changes
npx eslint .

# Format your changes
npx prettier --write .
```

**Rules to follow:**

- ES module syntax (`import`/`export`) -- the project uses `"type": "module"` in `package.json`.
- `const` and `let` over `var`.
- Meaningful variable and function names.
- JSDoc comments for all exported functions and non-trivial internal functions.
- Error messages should be clear and actionable.

---

## Commit Guidelines

- Use clear, concise commit messages in English.
- Prefix the subject with a category when applicable: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Reference related issues in the commit body (e.g., `Closes #123`).

---

## Pull Request Process

1. **Create a feature branch** from `main`:

   ```bash
   git checkout -b feat/my-feature
   ```

2. **Make your changes** and commit them following the commit guidelines above.

3. **Keep your branch up to date:**

   ```bash
   git remote add upstream https://github.com/skillsmp/skillsmp-mcp.git
   git fetch upstream
   git rebase upstream/main
   ```

4. **Run the tests and lint checks:**

   ```bash
   node setup.js --test
   npx eslint .
   ```

5. **Push your branch** and open a pull request:

   ```bash
   git push origin feat/my-feature
   ```

6. In your PR description, include:
   - **Summary** of the changes.
   - **Motivation** -- why this change is needed.
   - **Test plan** -- how the change was verified.
   - **Related issues** -- if applicable.

7. A maintainer will review your PR. Address any feedback by pushing additional commits to the same branch.

---

## Issue Reporting

We use [GitHub Issues](https://github.com/skillsmp/skillsmp-mcp/issues) for tracking bugs and feature requests.

When reporting a bug, please include:

- A clear, descriptive title.
- Steps to reproduce the issue.
- Expected vs. actual behavior.
- Environment details (OS, Node.js version, MCP host version).
- Any relevant logs or error output.

For feature requests, please explain the use case and the problem it solves.

---

## Code of Conduct

Please note that this project is governed by the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Unacceptable behavior may be reported by opening an issue.

---

Thank you for helping make skillsmp-mcp better!

/**
 * Unit tests for setup.js configuration and index.js structure.
 *
 * These tests verify structural elements without executing scripts with side effects.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SETUP_PATH = resolve(__dirname, "../../setup.js");
const INDEX_PATH = resolve(__dirname, "../../index.js");

describe("setup.js — configuration verification", () => {
  let source;
  beforeAll(() => {
    source = readFileSync(SETUP_PATH, "utf-8");
  });

  it('should define SERVER_NAME as "skillsmp"', () => {
    expect(source).toContain('SERVER_NAME = "skillsmp"');
  });

  it("should define autoApprove for read-only tools", () => {
    expect(source).toContain("search_skills");
    expect(source).toContain("list_installed_skills");
    expect(source).toContain("list_package_skills");
  });

  it("should support --local, --global, --all, --test flags", () => {
    expect(source).toContain("--local");
    expect(source).toContain("--global");
    expect(source).toContain("--all");
    expect(source).toContain("--test");
  });

  it("should use let for doLocal and doGlobal (not const)", () => {
    const localMatch = source.match(/(let|const)\s+doLocal/);
    const globalMatch = source.match(/(let|const)\s+doGlobal/);
    expect(localMatch?.[1]).toBe("let");
    expect(globalMatch?.[1]).toBe("let");
  });

  it("should handle cross-platform HOME/USERPROFILE", () => {
    expect(source).toContain("USERPROFILE");
    expect(source).toContain("HOME");
  });
});

describe("index.js — structure verification", () => {
  let source;
  beforeAll(() => {
    source = readFileSync(INDEX_PATH, "utf-8");
  });

  it("should import from self-contained src/ modules", () => {
    expect(source).toContain("./src/registry.js");
    expect(source).toContain("./src/installer.js");
  });

  it("should not import from non-existent CLI", () => {
    expect(source).not.toContain("npx skills");
    expect(source).not.toContain("skillsmp-cli");
  });

  it("should define all 6 MCP tools", () => {
    const toolNames = [
      "search_skills",
      "install_skill",
      "list_installed_skills",
      "remove_skill",
      "update_skills",
      "list_package_skills",
    ];
    for (const name of toolNames) {
      expect(source).toContain(name);
    }
  });

  it("should have async tool handlers for network operations", () => {
    expect(source).toContain("async function handleSearchSkills");
    expect(source).toContain("async function handleInstallSkill");
    expect(source).toContain("async function handleUpdateSkills");
    expect(source).toContain("async function handleListPackageSkills");
  });
});

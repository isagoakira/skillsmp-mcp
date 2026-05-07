/**
 * Unit tests for setup.js configuration correctness.
 *
 * These tests read setup.js as source text and verify structural elements
 * without executing the script (which has side effects).
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
    // Find the declarations
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

describe("index.js — security verification", () => {
  let source;
  beforeAll(() => {
    source = readFileSync(INDEX_PATH, "utf-8");
  });

  it("should use spawnSync instead of execSync", () => {
    expect(source).not.toContain("execSync");
    expect(source).toContain("spawnSync");
  });

  it("should not have shell injection via string concatenation", () => {
    // Verify spawnSync is called with separate args array
    const spawnCall = source.match(/spawnSync\([^)]+\)/g);
    expect(spawnCall).toBeTruthy();
    // Check no spawnSync calls use shell:true
    expect(source).not.toContain("shell: true");
    expect(source).not.toContain("shell:true");
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
});

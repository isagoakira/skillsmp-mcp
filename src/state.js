/**
 * Manifest & storage path management for skillsmp-mcp.
 *
 * Storage layout:
 *   ~/.skillsmp/           (global)
 *   <cwd>/.skillsmp/       (project)
 *     ├── installed.json
 *     └── packages/
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";

const MANIFEST_FILE = "installed.json";
const PACKAGES_DIR = "packages";

export function getStorageDir(global = false) {
  const base = global ? resolve(homedir(), ".skillsmp") : resolve(process.cwd(), ".skillsmp");
  return base;
}

export function readManifest(global = false) {
  const dir = getStorageDir(global);
  const path = resolve(dir, MANIFEST_FILE);
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return { skills: {} };
  }
}

export function writeManifest(manifest, global = false) {
  const dir = getStorageDir(global);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(resolve(dir, MANIFEST_FILE), JSON.stringify(manifest, null, 2) + "\n", "utf-8");
}

export function getPackagesDir(global = false) {
  const dir = resolve(getStorageDir(global), PACKAGES_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function ensureDir(dir) {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

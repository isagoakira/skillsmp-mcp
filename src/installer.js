/**
 * Skill installation & lifecycle management for skillsmp-mcp.
 *
 * Handles download, install, remove, update of skill packages from
 * npm registry and GitHub repositories.
 */

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { getPackagesDir, readManifest, writeManifest, ensureDir } from "./state.js";
import { getPackageInfo } from "./registry.js";

const IS_WINDOWS = platform() === "win32";

function isGitHubShorthand(pkg) {
  return /^[\w.-]+\/[\w.-]+/.test(pkg) && !pkg.startsWith("@");
}

function parsePackageRef(pkg) {
  const atIndex = pkg.lastIndexOf("@");
  if (atIndex > 0 && !pkg.includes("/")) {
    return { name: pkg.slice(0, atIndex), version: pkg.slice(atIndex + 1) };
  }
  if (atIndex > 0 && pkg.includes("/") && pkg.indexOf("/") < atIndex) {
    return { name: pkg.slice(0, atIndex), version: pkg.slice(atIndex + 1) };
  }
  return { name: pkg, version: null };
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf-8",
    timeout: 120_000,
    shell: IS_WINDOWS,
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || result.stdout?.trim() || `Exit code ${result.status}`);
  }
  return result.stdout?.trim() || "";
}

// ── Install ──────────────────────────────────────────────────────────────────

export async function install(pkg, opts = {}) {
  const { name, version } = parsePackageRef(pkg);
  const scope = opts.global;
  const packagesDir = getPackagesDir(scope);

  let info;
  try {
    info = await getPackageInfo(name);
  } catch (err) {
    throw new Error(`Cannot install "${name}": ${err.message}`);
  }

  const pkgDir = resolve(packagesDir, name.replace("/", "-"));

  if (isGitHubShorthand(name)) {
    // GitHub repo — clone with git
    const [owner, repo] = name.split("/");
    const ref = version || "HEAD";
    const gitUrl = `https://github.com/${owner}/${repo}.git`;

    if (existsSync(pkgDir)) {
      rmSync(pkgDir, { recursive: true, force: true });
    }

    run("git", ["clone", "--depth", "1", gitUrl, pkgDir], {
      timeout: 180_000,
    });

    if (version) {
      try {
        run("git", ["-C", pkgDir, "checkout", version], { timeout: 30_000 });
      } catch {
        // version might be a tag/branch that doesn't exist at depth=1
      }
    }
  } else {
    // npm package — use npm pack + extract
    const tmpDir = resolve(packagesDir, ".tmp");
    ensureDir(tmpDir);

    const packSpec = version ? `${name}@${version}` : name;

    let tarball;
    try {
      tarball = run("npm", ["pack", packSpec, "--pack-destination", tmpDir], {
        timeout: 120_000,
        cwd: tmpDir,
      });
    } catch {
      throw new Error(
        `Failed to download npm package "${packSpec}". Verify the package exists and try again.`
      );
    }
    const tarballFile = tarball.split("\n").pop().trim();
    const tarballPath = resolve(tmpDir, tarballFile);

    if (existsSync(pkgDir)) {
      rmSync(pkgDir, { recursive: true, force: true });
    }
    ensureDir(pkgDir);

    // Extract with tar
    if (IS_WINDOWS) {
      try {
        run("tar", ["-xf", tarballPath, "-C", pkgDir, "--strip-components=1"]);
      } catch {
        // fallback: try without strip-components
        run("tar", ["-xf", tarballPath, "-C", pkgDir]);
      }
    } else {
      try {
        run("tar", ["-xzf", tarballPath, "-C", pkgDir, "--strip-components=1"]);
      } catch {
        run("tar", ["-xzf", tarballPath, "-C", pkgDir]);
      }
    }

    // Cleanup temp
    try { rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }

  // Record in manifest
  const pkgVersion = version || "latest";
  const manifest = readManifest(scope);
  const skillName = opts.skill || name;

  // Detect skills in the installed package
  const installedSkills = detectSkills(pkgDir);
  const skillNames = skillName === "*" ? installedSkills : [skillName];

  for (const sn of skillNames) {
    manifest.skills[sn] = {
      package: name,
      version: pkgVersion,
      installedAt: new Date().toISOString(),
      scope: opts.global ? "global" : "project",
    };
  }

  writeManifest(manifest, scope);

  const skillList = skillNames.map((s) => `\`${s}\``).join(", ");
  return `Installed ${skillList} from "${name}" (${pkgVersion}) [${opts.global ? "global" : "project"}].\n\nPackage info: ${info.description || "No description"}`;
}

// ── Remove ───────────────────────────────────────────────────────────────────

export function remove(skillNames = [], opts = {}) {
  const scope = opts.global;
  const manifest = readManifest(scope);
  const packagesDir = getPackagesDir(scope);

  if (opts.all) {
    const removed = Object.keys(manifest.skills);
    for (const sn of removed) {
      const pkgDir = resolve(packagesDir, manifest.skills[sn].package.replace("/", "-"));
      try { rmSync(pkgDir, { recursive: true, force: true }); } catch {}
      delete manifest.skills[sn];
    }
    writeManifest(manifest, scope);
    return `Removed all skills (${removed.length} total): ${removed.map((s) => `\`${s}\``).join(", ") || "none"}`;
  }

  const removed = [];
  for (const sn of skillNames) {
    if (manifest.skills[sn]) {
      const pkgDir = resolve(packagesDir, manifest.skills[sn].package.replace("/", "-"));
      try { rmSync(pkgDir, { recursive: true, force: true }); } catch {}
      delete manifest.skills[sn];
      removed.push(sn);
    }
  }

  if (removed.length === 0) {
    return `No matching skills found: ${skillNames.join(", ")}. Check the skill names with \`list_installed_skills\`.`;
  }

  writeManifest(manifest, scope);
  return `Removed: ${removed.map((s) => `\`${s}\``).join(", ")} [${scope ? "global" : "project"}].`;
}

// ── Update ───────────────────────────────────────────────────────────────────

export async function update(skillNames = [], opts = {}) {
  const scope = opts.global || opts.project ? (opts.global ? true : false) : null;
  const manifest = readManifest(scope ?? false);
  const globalManifest = readManifest(true);

  // Auto-detect scope when not specified
  const allSkills = { ...globalManifest.skills, ...manifest.skills };
  const targets = skillNames.length > 0
    ? skillNames.filter((s) => allSkills[s])
    : Object.keys(allSkills);

  if (targets.length === 0) {
    return "No skills to update. Install some skills first with `install_skill`.";
  }

  const results = [];
  for (const sn of targets) {
    const entry = allSkills[sn];
    if (!entry) {
      results.push(`\`${sn}\`: not found, skipped`);
      continue;
    }
    const useGlobal = Boolean(globalManifest.skills[sn]);
    try {
      await install(entry.package, {
        global: useGlobal,
        skill: sn,
      });
      results.push(`\`${sn}\`: updated to latest`);
    } catch (err) {
      results.push(`\`${sn}\`: update failed — ${err.message}`);
    }
  }

  return `## Update Results\n\n${results.map((r) => `- ${r}`).join("\n")}`;
}

// ── List Installed ───────────────────────────────────────────────────────────

export function listInstalled(opts = {}) {
  const scope = opts.global;
  const manifest = readManifest(scope);
  const skills = manifest.skills;

  if (Object.keys(skills).length === 0) {
    return JSON.stringify({ skills: [], message: "No skills installed." }, null, 2);
  }

  const list = Object.entries(skills).map(([name, meta]) => ({
    name,
    package: meta.package,
    version: meta.version,
    installedAt: meta.installedAt,
    scope: meta.scope || (scope ? "global" : "project"),
  }));

  if (opts.agent) {
    // Filter by agent — skills are agent-agnostic, so return all that match
    // In future, could filter by agent-specific manifest
  }

  return JSON.stringify({ skills: list }, null, 2);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectSkills(dir) {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir);
  return entries.filter((e) => {
    try {
      const full = resolve(dir, e);
      return statSync(full).isDirectory() && !e.startsWith(".") && e !== "node_modules";
    } catch {
      return false;
    }
  });
}

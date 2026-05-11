/**
 * npm/GitHub registry client for skillsmp-mcp.
 *
 * Searches the npm registry for skill packages (keyword: skillsmp, agent-skill, etc.)
 * and resolves package metadata from npm or GitHub.
 */

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";
const NPM_REGISTRY = "https://registry.npmjs.org";
const GITHUB_API = "https://api.github.com/repos";

const SKILL_KEYWORDS = ["skillsmp", "agent-skill", "claude-skill", "mcp-skill"];

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

async function fetchJSON(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeout || 15000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...opts.headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Search ──────────────────────────────────────────────────────────────────

export async function search(query) {
  const keywordFilter = SKILL_KEYWORDS.map((k) => `keywords:${k}`).join("+");
  const url = `${NPM_SEARCH}?text=${encodeURIComponent(query)}+${keywordFilter}&size=20`;

  let data;
  try {
    data = await fetchJSON(url);
  } catch {
    throw new Error(
      "Search failed: unable to reach npm registry. Check your network connection and try again."
    );
  }

  const objects = data?.objects || [];
  if (objects.length === 0) {
    return "No matching skill packages found. Try a different search term.";
  }

  const lines = [`## SkillsMP Search Results\n**Query:** "${query}"  \n**Found:** ${objects.length} package(s)\n`];

  for (const obj of objects) {
    const p = obj.package;
    const name = p.name;
    const desc = (p.description || "").slice(0, 160);
    const version = p.version;
    const npmUrl = p.links?.npm || `https://www.npmjs.com/package/${name}`;
    const keywords = (p.keywords || []).filter((k) =>
      SKILL_KEYWORDS.includes(k)
    );

    lines.push(`### ${name}`);
    lines.push(`**Version:** ${version}  `);
    lines.push(`**Description:** ${desc}  `);
    if (keywords.length) {
      lines.push(`**Tags:** ${keywords.join(", ")}  `);
    }
    lines.push(`**npm:** ${npmUrl}  `);
    lines.push("---\n");
  }

  return lines.join("\n");
}

// ── Package Info ─────────────────────────────────────────────────────────────

export async function getPackageInfo(pkg) {
  const { name } = parsePackageRef(pkg);

  if (isGitHubShorthand(name)) {
    const [owner, repo] = name.split("/");
    try {
      const data = await fetchJSON(`${GITHUB_API}/${owner}/${repo}`, {
        headers: { "User-Agent": "skillsmp-mcp" },
      });
      return {
        name,
        description: data.description || "",
        url: data.html_url,
        stars: data.stargazers_count,
        source: "github",
      };
    } catch (err) {
      throw new Error(`Failed to fetch GitHub repo info for ${name}: ${err.message}`);
    }
  }

  // npm package
  try {
    const data = await fetchJSON(`${NPM_REGISTRY}/${encodeURIComponent(name)}`);
    return {
      name,
      description: data.description || "",
      version: data["dist-tags"]?.latest,
      url: `https://www.npmjs.com/package/${name}`,
      keywords: data.keywords || [],
      source: "npm",
    };
  } catch (err) {
    throw new Error(`Failed to fetch package info for ${name}: ${err.message}`);
  }
}

// ── List Package Skills ──────────────────────────────────────────────────────

export async function listPackageSkills(pkg) {
  const { name } = parsePackageRef(pkg);

  if (isGitHubShorthand(name)) {
    const [owner, repo] = name.split("/");
    try {
      const contents = await fetchJSON(
        `${GITHUB_API}/${owner}/${repo}/contents`,
        { headers: { "User-Agent": "skillsmp-mcp" } }
      );

      // Look for skills directory or CLAUDE.md files
      const skillDirs = (contents || []).filter(
        (f) => f.type === "dir" && f.name !== ".git" && f.name !== ".github"
      );
      const skillFiles = (contents || []).filter(
        (f) => f.type === "file" && /\.(md|txt)$/i.test(f.name)
      );

      if (skillDirs.length === 0 && skillFiles.length === 0) {
        return `No skills found in package "${name}".`;
      }

      const lines = [`## Skills in ${name}\n**Source:** ${`https://github.com/${owner}/${repo}`}\n`];
      lines.push("### Available skills:\n");

      for (const dir of skillDirs) {
        lines.push(`- **\`${dir.name}\`**`);
      }
      for (const file of skillFiles) {
        const skillName = file.name.replace(/\.(md|txt)$/i, "");
        lines.push(`- **\`${skillName}\`** (${file.name})`);
      }

      lines.push(`\n---\n**Total:** ${skillDirs.length + skillFiles.length} skill(s)`);
      return lines.join("\n");
    } catch (err) {
      throw new Error(
        `Failed to list skills for ${name}: ${err.message}. GitHub API may be rate-limited — try again later.`
      );
    }
  }

  // npm package
  try {
    const data = await fetchJSON(`${NPM_REGISTRY}/${encodeURIComponent(name)}/latest`);
    const skillNames = data.skills || (data.keywords ? data.keywords.filter(
      (k) => !SKILL_KEYWORDS.includes(k) && !["skill", "mcp", "agent"].includes(k)
    ) : []);

    if (skillNames.length === 0) {
      return `No individual skills listed in package "${name}". The package may be a single skill.`;
    }

    const lines = [`## Skills in ${name}\n`];
    for (const s of skillNames) {
      lines.push(`- **\`${s}\`**`);
    }
    lines.push(`\n---\n**Total:** ${skillNames.length} skill(s)`);
    return lines.join("\n");
  } catch (err) {
    throw new Error(`Failed to list skills for npm package ${name}: ${err.message}`);
  }
}

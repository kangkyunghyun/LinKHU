const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_FILE = path.join(PROJECT_ROOT, "src", "manifest.json");
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function runGit(args) {
  return execFileSync("git", args, {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function validateRelease(inputVersion) {
  const errors = [];
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  const manifestVersion = manifest.version;

  if (!VERSION_PATTERN.test(inputVersion || "")) {
    errors.push(`Invalid release version: ${inputVersion || "(empty)"}`);
    return errors;
  }

  if (manifestVersion !== inputVersion) {
    errors.push(
      `Input version ${inputVersion} does not match manifest version ${manifestVersion}.`,
    );
  }

  const tag = `v${inputVersion}`;
  let tagCommit;
  try {
    tagCommit = runGit(["rev-list", "-n", "1", tag]);
  } catch {
    errors.push(`Release tag does not exist: ${tag}`);
    return errors;
  }

  const headCommit = runGit(["rev-parse", "HEAD"]);
  if (tagCommit !== headCommit) {
    errors.push(
      `Release tag ${tag} points to ${tagCommit.slice(0, 7)}, ` +
        `but the checked out commit is ${headCommit.slice(0, 7)}.`,
    );
  }

  const releaseNotesFile = path.join(PROJECT_ROOT, "release-notes", `${tag}.md`);
  if (!fs.existsSync(releaseNotesFile)) {
    errors.push(`Release notes file does not exist: release-notes/${tag}.md`);
  }

  return errors;
}

function main() {
  const inputVersion = process.argv[2];
  const errors = validateRelease(inputVersion);

  if (errors.length > 0) {
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Release v${inputVersion} matches the manifest, tag, commit, and notes.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  validateRelease,
};

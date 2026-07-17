const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_FILE = path.join(PROJECT_ROOT, "src", "manifest.json");
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

function runGit(args) {
  try {
    return execFileSync("git", args, {
      cwd: PROJECT_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        "Git command not found. Please ensure Git is installed and in your PATH.",
      );
    }

    const gitError = new Error(`Git command failed: git ${args.join(" ")}`);
    gitError.status = error.status;
    gitError.stderr = error.stderr;
    throw gitError;
  }
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
  } catch (error) {
    if (error.status === 128) {
      errors.push(`Release tag does not exist: ${tag}`);
    } else {
      errors.push(`Git execution error: ${error.message}`);
    }
    return errors;
  }

  let headCommit;
  try {
    headCommit = runGit(["rev-parse", "HEAD"]);
  } catch (error) {
    errors.push(`Failed to retrieve HEAD commit: ${error.message}`);
    return errors;
  }

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

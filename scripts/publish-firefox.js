const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_FILE = path.join(PROJECT_ROOT, "src", "manifest.json");
const DEFAULT_API_BASE_URL = "https://addons.mozilla.org/api/v5";
const DEFAULT_LICENSE = "MIT";
const DEFAULT_POLL_INTERVAL_MS = 10000;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
}

function readManifestVersion() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  if (!manifest.version) {
    throw new Error("src/manifest.json must include a version.");
  }
  return manifest.version;
}

function getPackageFile() {
  const manifestVersion = readManifestVersion();
  const packageFile =
    process.env.FIREFOX_PACKAGE_FILE ||
    path.join(PROJECT_ROOT, "dist", `linkhu-v${manifestVersion}.zip`);

  if (!fs.existsSync(packageFile)) {
    throw new Error(`Firefox package file does not exist: ${packageFile}`);
  }

  return packageFile;
}

function getReleaseNotesFile() {
  const manifestVersion = readManifestVersion();
  const releaseNotesFile =
    process.env.FIREFOX_RELEASE_NOTES_FILE ||
    path.join(PROJECT_ROOT, "release-notes", `v${manifestVersion}.md`);

  if (!fs.existsSync(releaseNotesFile)) {
    throw new Error(`Firefox release notes file does not exist: ${releaseNotesFile}`);
  }

  return releaseNotesFile;
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createJwt(issuer, secret) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const payload = {
    iss: issuer,
    jti: crypto.randomUUID(),
    iat: issuedAt,
    exp: issuedAt + 60,
  };
  const unsignedToken = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(payload),
  )}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(unsignedToken)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${unsignedToken}.${signature}`;
}

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestJson(label, url, options, credentials) {
  const token = createJwt(credentials.issuer, credentials.secret);
  const headers = {
    Authorization: `JWT ${token}`,
    ...options.headers,
  };
  const response = await fetch(url, {
    ...options,
    headers,
  });
  const body = await readResponseBody(response);

  if (!response.ok) {
    const message = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`${label} failed (${response.status}): ${message}`);
  }

  return body;
}

async function uploadPackage(apiBaseUrl, credentials, packageFile) {
  const packageData = await fs.promises.readFile(packageFile);
  const formData = new FormData();

  formData.append(
    "upload",
    new Blob([packageData], { type: "application/zip" }),
    path.basename(packageFile),
  );
  formData.append("channel", "listed");

  return requestJson(
    "Firefox package upload",
    `${apiBaseUrl}/addons/upload/`,
    {
      method: "POST",
      body: formData,
    },
    credentials,
  );
}

async function fetchUploadStatus(apiBaseUrl, credentials, uploadUuid) {
  return requestJson(
    "Firefox upload status fetch",
    `${apiBaseUrl}/addons/upload/${uploadUuid}/`,
    {
      method: "GET",
    },
    credentials,
  );
}

function formatUploadValidation(uploadStatus) {
  return JSON.stringify(uploadStatus.validation || uploadStatus, null, 2);
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForValidUpload(apiBaseUrl, credentials, uploadUuid) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < DEFAULT_POLL_TIMEOUT_MS) {
    const uploadStatus = await fetchUploadStatus(apiBaseUrl, credentials, uploadUuid);
    console.log(`Firefox upload status: ${JSON.stringify(uploadStatus, null, 2)}`);

    if (uploadStatus.processed && uploadStatus.valid) {
      return uploadStatus;
    }

    if (uploadStatus.processed && uploadStatus.valid === false) {
      throw new Error(
        `Firefox upload validation failed: ${formatUploadValidation(uploadStatus)}`,
      );
    }

    await wait(DEFAULT_POLL_INTERVAL_MS);
  }

  throw new Error(`Firefox upload validation timed out for ${uploadUuid}.`);
}

async function createVersion(
  apiBaseUrl,
  credentials,
  addonId,
  uploadUuid,
  releaseNotes,
  license,
) {
  return requestJson(
    "Firefox version create",
    `${apiBaseUrl}/addons/addon/${encodeURIComponent(addonId)}/versions/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        upload: uploadUuid,
        license,
        release_notes: {
          "en-US": releaseNotes,
        },
      }),
    },
    credentials,
  );
}

async function main() {
  try {
    const apiBaseUrl = process.env.FIREFOX_API_BASE_URL || DEFAULT_API_BASE_URL;
    const addonId = getRequiredEnv("FIREFOX_ADDON_ID");
    const packageFile = getPackageFile();
    const releaseNotesFile = getReleaseNotesFile();
    const license = process.env.FIREFOX_LICENSE || DEFAULT_LICENSE;
    const relativePackageFile = path.relative(PROJECT_ROOT, packageFile);
    const relativeReleaseNotesFile = path.relative(PROJECT_ROOT, releaseNotesFile);

    if (process.env.FIREFOX_DRY_RUN === "true") {
      console.log(
        `Firefox dry run: ${relativePackageFile} would be uploaded to ${addonId} ` +
          `with ${relativeReleaseNotesFile} and ${license} license.`,
      );
      return;
    }

    const credentials = {
      issuer: getRequiredEnv("FIREFOX_JWT_ISSUER"),
      secret: getRequiredEnv("FIREFOX_JWT_SECRET"),
    };
    const releaseNotes = await fs.promises.readFile(releaseNotesFile, "utf8");
    const uploadResponse = await uploadPackage(apiBaseUrl, credentials, packageFile);
    console.log(`Firefox upload response: ${JSON.stringify(uploadResponse, null, 2)}`);

    if (!uploadResponse.uuid) {
      throw new Error("Firefox upload response did not include uuid.");
    }

    await waitForValidUpload(apiBaseUrl, credentials, uploadResponse.uuid);

    const versionResponse = await createVersion(
      apiBaseUrl,
      credentials,
      addonId,
      uploadResponse.uuid,
      releaseNotes,
      license,
    );
    console.log(`Firefox version response: ${JSON.stringify(versionResponse, null, 2)}`);
  } catch (error) {
    console.error(`Firefox publish failed: ${error.message}`);
    process.exitCode = 1;
  }
}

main();

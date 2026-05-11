const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_FILE = path.join(PROJECT_ROOT, "src", "manifest.json");

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

async function readResponseBody(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function requestJson(label, url, options) {
  const response = await fetch(url, options);
  const body = await readResponseBody(response);

  if (!response.ok) {
    const message = typeof body === "string" ? body : JSON.stringify(body);
    throw new Error(`${label} failed (${response.status}): ${message}`);
  }

  return body;
}

function getPackageFile() {
  const manifestVersion = readManifestVersion();
  const packageFile =
    process.env.CHROME_PACKAGE_FILE ||
    path.join(PROJECT_ROOT, "dist", `linkhu-v${manifestVersion}.zip`);

  if (!fs.existsSync(packageFile)) {
    throw new Error(`Chrome package file does not exist: ${packageFile}`);
  }

  return packageFile;
}

async function getAccessToken(clientId, clientSecret, refreshToken) {
  const tokenResponse = await requestJson(
    "Chrome access token request",
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    },
  );

  if (!tokenResponse.access_token) {
    throw new Error("Chrome access token response did not include access_token.");
  }

  return tokenResponse.access_token;
}

async function uploadPackage(accessToken, publisherId, extensionId, packageFile) {
  const packageData = await fs.promises.readFile(packageFile);
  const url =
    `https://chromewebstore.googleapis.com/upload/v2/publishers/` +
    `${publisherId}/items/${extensionId}:upload`;

  return requestJson("Chrome package upload", url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/zip",
    },
    body: packageData,
  });
}

async function publishPackage(accessToken, publisherId, extensionId) {
  const url =
    `https://chromewebstore.googleapis.com/v2/publishers/` +
    `${publisherId}/items/${extensionId}:publish`;

  return requestJson("Chrome package publish", url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function fetchStatus(accessToken, publisherId, extensionId) {
  const url =
    `https://chromewebstore.googleapis.com/v2/publishers/` +
    `${publisherId}/items/${extensionId}:fetchStatus`;

  return requestJson("Chrome item status fetch", url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function main() {
  try {
    const packageFile = getPackageFile();
    const publisherId = getRequiredEnv("CHROME_PUBLISHER_ID");
    const extensionId = getRequiredEnv("CHROME_EXTENSION_ID");
    const relativePackageFile = path.relative(PROJECT_ROOT, packageFile);

    if (process.env.CHROME_DRY_RUN === "true") {
      console.log(
        `Chrome dry run: ${relativePackageFile} would be uploaded to ${extensionId}.`,
      );
      return;
    }

    const accessToken = await getAccessToken(
      getRequiredEnv("CHROME_CLIENT_ID"),
      getRequiredEnv("CHROME_CLIENT_SECRET"),
      getRequiredEnv("CHROME_REFRESH_TOKEN"),
    );

    const uploadResponse = await uploadPackage(
      accessToken,
      publisherId,
      extensionId,
      packageFile,
    );
    console.log(`Chrome upload response: ${JSON.stringify(uploadResponse, null, 2)}`);

    const publishResponse = await publishPackage(accessToken, publisherId, extensionId);
    console.log(`Chrome publish response: ${JSON.stringify(publishResponse, null, 2)}`);

    const statusResponse = await fetchStatus(accessToken, publisherId, extensionId);
    console.log(`Chrome item status: ${JSON.stringify(statusResponse, null, 2)}`);
  } catch (error) {
    console.error(`Chrome publish failed: ${error.message}`);
    process.exitCode = 1;
  }
}

main();

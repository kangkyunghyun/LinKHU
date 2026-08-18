// scripts/ 전용 공용 유틸. 확장 소스(src/)에는 포함되지 않는다.
const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const MANIFEST_FILE = path.join(PROJECT_ROOT, "src", "manifest.json");

// zlib.crc32는 Node 22.2+에만 있어 쓰지 않는다.
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function getCrc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  if (!manifest.version) {
    throw new Error("src/manifest.json must include a version.");
  }
  return manifest;
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
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

// 스토어 배포 스크립트가 업로드할 ZIP 경로. envName 환경 변수로 재정의할 수 있다.
function getPackageFile(label, envName) {
  const packageFile =
    process.env[envName] ||
    path.join(PROJECT_ROOT, "dist", `linkhu-v${readManifest().version}.zip`);

  if (!fs.existsSync(packageFile)) {
    throw new Error(`${label} package file does not exist: ${packageFile}`);
  }

  return packageFile;
}

module.exports = {
  PROJECT_ROOT,
  getCrc32,
  getPackageFile,
  getRequiredEnv,
  readManifest,
  readResponseBody,
};

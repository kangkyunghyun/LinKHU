const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const DIST_ROOT = path.join(PROJECT_ROOT, "dist");
const MANIFEST_FILE = path.join(SRC_ROOT, "manifest.json");

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

// ZIP의 최소 표현 시각(1980-01-01 00:00:00)을 사용해 체크아웃 시각과 무관한
// 재현 가능한 패키지를 생성한다.
const REPRODUCIBLE_DOS_DATE = (1 << 5) | 1;
const REPRODUCIBLE_DOS_TIME = 0;

function createUInt16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function createUInt32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function readManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, "utf8"));
  if (!manifest.version) {
    throw new Error("src/manifest.json must include a version.");
  }
  return manifest;
}

function collectFiles(directory, baseDirectory = directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];

  entries.forEach((entry) => {
    if (entry.name.startsWith(".")) return;

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(absolutePath, baseDirectory));
      return;
    }

    if (entry.isFile()) {
      files.push({
        absolutePath,
        archivePath: path.relative(baseDirectory, absolutePath).split(path.sep).join("/"),
      });
    }
  });

  return files.sort((a, b) => a.archivePath.localeCompare(b.archivePath));
}

function createZip(files, outputFile) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const data = fs.readFileSync(file.absolutePath);
    const fileName = Buffer.from(file.archivePath);
    const crc32 = getCrc32(data);

    const localHeader = Buffer.concat([
      createUInt32(0x04034b50),
      createUInt16(10),
      createUInt16(0),
      createUInt16(0),
      createUInt16(REPRODUCIBLE_DOS_TIME),
      createUInt16(REPRODUCIBLE_DOS_DATE),
      createUInt32(crc32),
      createUInt32(data.length),
      createUInt32(data.length),
      createUInt16(fileName.length),
      createUInt16(0),
      fileName,
    ]);

    const centralHeader = Buffer.concat([
      createUInt32(0x02014b50),
      createUInt16(20),
      createUInt16(10),
      createUInt16(0),
      createUInt16(0),
      createUInt16(REPRODUCIBLE_DOS_TIME),
      createUInt16(REPRODUCIBLE_DOS_DATE),
      createUInt32(crc32),
      createUInt32(data.length),
      createUInt32(data.length),
      createUInt16(fileName.length),
      createUInt16(0),
      createUInt16(0),
      createUInt16(0),
      createUInt16(0),
      createUInt32(0),
      createUInt32(offset),
      fileName,
    ]);

    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const endOfCentralDirectory = Buffer.concat([
    createUInt32(0x06054b50),
    createUInt16(0),
    createUInt16(0),
    createUInt16(files.length),
    createUInt16(files.length),
    createUInt32(centralDirectory.length),
    createUInt32(offset),
    createUInt16(0),
  ]);

  localParts.push(centralDirectory, endOfCentralDirectory);
  fs.writeFileSync(outputFile, Buffer.concat(localParts));
}

function main() {
  try {
    const manifest = readManifest();
    const files = collectFiles(SRC_ROOT);
    const outputFile = path.join(DIST_ROOT, `linkhu-v${manifest.version}.zip`);

    fs.mkdirSync(DIST_ROOT, { recursive: true });
    createZip(files, outputFile);

    console.log(`Packaged ${files.length} files into ${path.relative(PROJECT_ROOT, outputFile)}.`);
  } catch (error) {
    console.error(`Packaging failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  collectFiles,
  createZip,
};

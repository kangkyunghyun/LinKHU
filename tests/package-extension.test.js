const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { collectFiles, createZip } = require("../scripts/package-extension");

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

test("package output is reproducible across source timestamp changes", (t) => {
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "linkhu-package-"));
  t.after(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

  const sourceDirectory = path.join(temporaryDirectory, "src");
  const firstZip = path.join(temporaryDirectory, "first.zip");
  const secondZip = path.join(temporaryDirectory, "second.zip");
  fs.mkdirSync(sourceDirectory);

  const sourceFile = path.join(sourceDirectory, "example.txt");
  fs.writeFileSync(sourceFile, "same contents");
  createZip(collectFiles(sourceDirectory), firstZip);

  const changedTime = new Date("2026-07-17T12:34:56Z");
  fs.utimesSync(sourceFile, changedTime, changedTime);
  createZip(collectFiles(sourceDirectory), secondZip);

  assert.equal(sha256(firstZip), sha256(secondZip));
});

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { stripInternalSection } = require("../scripts/publish-firefox");

const RELEASE_NOTES_ROOT = path.join(__dirname, "..", "release-notes");

function readReleaseNotes(fileName) {
  return fs.readFileSync(path.join(RELEASE_NOTES_ROOT, fileName), "utf8");
}

test("AMO로 보내는 릴리스 노트에서 Internal 섹션이 빠진다", () => {
  const stripped = stripInternalSection(readReleaseNotes("v2.7.0.md"));

  assert.ok(!stripped.includes("### Internal"));
  assert.ok(!stripped.includes("폭 가드 추가"));
  assert.ok(!stripped.includes("en dash"));
  assert.ok(!stripped.includes("스토어 스크린샷"));

  // 사용자에게 보이는 두 섹션은 그대로 남는다.
  assert.ok(stripped.includes("### Features"));
  assert.ok(stripped.includes("설정 페이지 목록에서 각 서비스를 새 탭으로 열어볼 수 있습니다"));
  assert.ok(stripped.includes("### Fixes"));
  assert.ok(stripped.includes("`환경학및환경공학과`를 `환경학 및 환경공학과`로 정정했습니다"));
});

test("Internal 섹션이 없는 릴리스 노트는 그대로 통과한다", () => {
  // v2.3.1은 Features 하나뿐인 실제 릴리스 노트다.
  const original = readReleaseNotes("v2.3.1.md");

  assert.ok(!original.includes("### Internal"));
  assert.equal(stripInternalSection(original), original);
});

test("Internal이 마지막 섹션이 아니어도 그 뒤 섹션이 살아남는다", () => {
  const notes = [
    "### Features",
    "",
    "- 새 기능",
    "",
    "### Internal",
    "",
    "- 내부 변경",
    "",
    "### Fixes",
    "",
    "- 고친 것",
    "",
  ].join("\n");

  assert.equal(
    stripInternalSection(notes),
    ["### Features", "", "- 새 기능", "", "### Fixes", "", "- 고친 것", ""].join("\n"),
  );
});

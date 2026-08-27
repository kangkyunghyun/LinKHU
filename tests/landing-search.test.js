const test = require("node:test");
const assert = require("node:assert/strict");

const {
  getDefaultServices,
  normalizeSearchText,
  searchServices,
} = require("../docs/landing");

const SERVICES = [
  { id: "info21", name: "인포21", category: "학사·포털", url: "https://portal.khu.ac.kr" },
  { id: "ecampus", name: "e-Campus", category: "학사·포털", url: "https://e-campus.khu.ac.kr" },
  { id: "sugang", name: "수강신청", category: "학사·포털", url: "https://sugang.khu.ac.kr" },
  { id: "software", name: "소프트웨어융합대학", category: "단과대", url: "https://software.khu.ac.kr" },
  { id: "swcon", name: "소프트웨어융합학과", category: "학과", url: "https://com.khu.ac.kr/swcon" },
  { id: "cs", name: "컴퓨터공학부", category: "학과", url: "https://ce.khu.ac.kr" },
];

test("landing search normalizes spaces and letter case", () => {
  assert.equal(normalizeSearchText("  e Campus "), "ecampus");
  assert.equal(searchServices(SERVICES, "E campus")[0].id, "ecampus");
});

test("landing search matches names, ids, and categories", () => {
  assert.deepEqual(
    searchServices(SERVICES, "소프트웨어").map((service) => service.id),
    ["software", "swcon"],
  );
  assert.equal(searchServices(SERVICES, "cs")[0].name, "컴퓨터공학부");
  assert.deepEqual(
    searchServices(SERVICES, "단과대").map((service) => service.id),
    ["software"],
  );
});

test("landing search respects the result limit", () => {
  assert.equal(searchServices(SERVICES, "학과", 2).length, 2);
});

test("landing search returns the configured default services", () => {
  assert.deepEqual(
    getDefaultServices(SERVICES).map((service) => service.id),
    ["info21", "ecampus", "sugang"],
  );
});

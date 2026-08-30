const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const LinKHUShared = require("../src/shared");

test("shared normalize removes spaces and letter case", () => {
  assert.equal(LinKHUShared.normalize("  e Campus "), "ecampus");
  assert.equal(LinKHUShared.normalize("소프트웨어 융합대학"), "소프트웨어융합대학");
  assert.equal(LinKHUShared.normalize(null), "");
});

test("shared rankSites orders by name prefix, name, id, then category", () => {
  const sites = [
    { id: "swcon", name: "소프트웨어융합학과", category: "학과" },
    { id: "software", name: "소프트웨어 융합대학", category: "단과대" },
    { id: "cs", name: "컴퓨터공학부", category: "학과" },
  ];

  assert.deepEqual(
    LinKHUShared.rankSites(sites, "소프트웨어").map((site) => site.id),
    ["swcon", "software"],
  );
  assert.deepEqual(
    LinKHUShared.rankSites(sites, "cs").map((site) => site.id),
    ["cs"],
  );
  assert.deepEqual(
    LinKHUShared.rankSites(sites, "학과").map((site) => site.id),
    ["swcon", "cs"],
  );
  assert.deepEqual(LinKHUShared.rankSites(sites, "  "), []);
});

test("shared rankSites matches landing search order", () => {
  const { searchServices } = require("../docs/landing");
  const services = [
    { id: "info21", name: "인포21", category: "학사·포털" },
    { id: "ecampus", name: "e-Campus", category: "학사·포털" },
    { id: "sugang", name: "수강신청", category: "학사·포털" },
    { id: "software", name: "소프트웨어융합대학", category: "단과대" },
    { id: "swcon", name: "소프트웨어융합학과", category: "학과" },
    { id: "cs", name: "컴퓨터공학부", category: "학과" },
  ];

  ["소프트웨어", "E campus", "cs", "학과", "학사"].forEach((query) => {
    assert.deepEqual(
      LinKHUShared.rankSites(services, query)
        .slice(0, 5)
        .map((service) => service.id),
      searchServices(services, query).map((service) => service.id),
      `query "${query}" should rank identically on popup and landing`,
    );
  });
});

test("shared getDefaultOrder picks the fixed default list, not a whole category", () => {
  const sites = [
    { id: "info21", name: "인포21", category: "학사·포털" },
    { id: "notice", name: "공지사항", category: "학사·포털" },
    // 같은 카테고리인데 기본 목록에는 없다. 카테고리가 곧 기본 목록이던 규칙은 없어졌다.
    { id: "mail", name: "웹메일", category: "학사·포털" },
    { id: "swcon", name: "소프트웨어융합학과", category: "학과" },
  ];

  assert.deepEqual(LinKHUShared.getDefaultOrder(sites), ["notice", "info21"]);
});

test("shared getDefaultOrder sorts by name with ko-KR rules", () => {
  const sites = [
    { id: "ecampus", name: "e-Campus", category: "학사·포털" },
    { id: "info21", name: "인포21", category: "학사·포털" },
    { id: "chatkhu", name: "ChatKHU", category: "학사·포털" },
    { id: "notice", name: "공지사항", category: "학사·포털" },
  ];

  // 설정 페이지 왼쪽 목록과 같은 기준이다. 영문 이름 위치도 localeCompare가 정한다.
  assert.deepEqual(LinKHUShared.getDefaultOrder(sites), [
    "notice",
    "info21",
    "chatkhu",
    "ecampus",
  ]);
});

test("shared getDefaultOrder drops ids that no longer exist in the data", () => {
  const sites = [{ id: "info21", name: "인포21", category: "학사·포털" }];

  assert.deepEqual(LinKHUShared.getDefaultOrder(sites), ["info21"]);
});

test("the shipped default list is the ten agreed services", () => {
  const data = fs.readFileSync(path.join(__dirname, "..", "src", "data.js"), "utf8");
  const context = { module: {} };
  vm.createContext(context);
  vm.runInContext(`${data}\nthis.sites = MASTER_SITE_LIST;`, context);

  const defaultOrder = LinKHUShared.getDefaultOrder(context.sites);
  const nameById = new Map(context.sites.map((site) => [site.id, site.name]));

  // vm 컨텍스트가 만든 배열은 다른 realm이라 Array.from으로 이쪽 realm 배열로 옮긴다.
  assert.deepEqual(Array.from(defaultOrder, (id) => nameById.get(id)), [
    "공지사항",
    "도서관",
    "수강신청",
    "에브리타임",
    "인포21",
    "장학처",
    "정보처",
    "현장실습",
    "ChatKHU",
    "e-Campus",
  ]);
});

test("iconSrc는 다크에서만 dark 경로로 바꾼다", () => {
  assert.equal(
    LinKHUShared.iconSrc("images/common/portal.png", "light"),
    "images/common/portal.png",
  );
  assert.equal(
    LinKHUShared.iconSrc("images/common/portal.png", "dark"),
    "images/dark/common/portal.png",
  );
});

test("cardDisplayName은 표에 적힌 지점에만 줄바꿈을 넣는다", () => {
  assert.equal(
    LinKHUShared.cardDisplayName({ id: "swedu", name: "SW중심대학사업단" }),
    "SW중심대학​사업단",
  );
  assert.equal(
    LinKHUShared.cardDisplayName({ id: "cominv", name: "국제통상금융투자학부" }),
    "국제통상​금융투자학부",
  );

  // 표에 없는 이름은 그대로다. 짧은 이름도, 폭 초과로 일부러 뺀 이름도 마찬가지다.
  assert.equal(LinKHUShared.cardDisplayName({ id: "info21", name: "인포21" }), "인포21");
  LinKHUShared.WIDE_CARD_NAMES.forEach((id) => {
    assert.equal(LinKHUShared.CARD_LINE_BREAKS[id], undefined);
  });
  assert.equal(
    LinKHUShared.cardDisplayName({ id: "display", name: "미래정보디스플레이학부" }),
    "미래정보디스플레이학부",
  );
});

test("cardDisplayName은 표의 첫 줄이 이름의 접두사가 아니면 원본을 돌려준다", () => {
  // 표가 이름 변경을 따라가지 못한 경우다. 조용히 깨진 이름을 만들지 않는다.
  // 이 어긋남 자체는 scripts/validate-data.js가 실패시킨다.
  assert.equal(
    LinKHUShared.cardDisplayName({ id: "swedu", name: "SW 중심대학 사업단" }),
    "SW 중심대학 사업단",
  );
});

test("줄바꿈 표의 첫 줄은 모두 실제 이름의 접두사다", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "src", "data.js"), "utf8");
  const context = {};
  vm.createContext(context);
  vm.runInContext(`${source}\nthis.sites = MASTER_SITE_LIST;`, context);

  const nameById = new Map(Array.from(context.sites, (site) => [site.id, site.name]));

  Object.entries(LinKHUShared.CARD_LINE_BREAKS).forEach(([id, firstLine]) => {
    const name = nameById.get(id);
    assert.ok(name, `${id}: 줄바꿈 표에 있지만 data.js에 없는 id다`);
    assert.ok(
      name.startsWith(firstLine),
      `${id}: 첫 줄 "${firstLine}"이 "${name}"의 접두사가 아니다`,
    );
  });
});

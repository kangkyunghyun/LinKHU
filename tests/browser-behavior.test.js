const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.listeners = new Map();
    this.className = "";
    this.dataset = {};
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type, event = {}) {
    this.listeners.get(type)?.({
      preventDefault() {},
      ...event,
    });
  }
}

function loadScript(relativePaths, additions, overrides = {}) {
  const paths = Array.isArray(relativePaths) ? relativePaths : [relativePaths];
  const source = paths
    .map((relativePath) =>
      fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8"),
    )
    .join("\n");
  const context = {
    console,
    setInterval,
    clearInterval,
    setTimeout,
    document: {
      addEventListener() {},
      createElement: (tagName) => new FakeElement(tagName),
    },
    window: {
      close() {},
    },
    ...overrides,
  };

  vm.createContext(context);
  vm.runInContext(`${source}\n${additions}`, context, {
    filename: paths[paths.length - 1],
  });
  return context;
}

test("popup removes duplicate site ids while preserving order", () => {
  const context = loadScript(
    ["src/theme.js", "src/shared.js", "src/popup.js"],
    "this.AppForTest = App;",
    { chrome: {} },
  );
  const sites = [
    { id: "first" },
    { id: "second" },
    { id: "first" },
  ];

  assert.deepEqual(
    Array.from(context.AppForTest.getUniqueSites(sites), (site) => site.id),
    ["first", "second"],
  );
});

test("popup opens normal, modifier, and middle clicks with expected focus", () => {
  const createdTabs = [];
  let closeCount = 0;
  const context = loadScript(
    ["src/theme.js", "src/shared.js", "src/popup.js"],
    "this.AppForTest = App;",
    {
    chrome: {
      tabs: {
        create(options) {
          createdTabs.push(options);
        },
      },
    },
    window: {
      close() {
        closeCount += 1;
      },
    },
  });
  const card = context.AppForTest.createCardItem({
    id: "info21",
    name: "인포21",
    url: "https://portal.khu.ac.kr",
    imgSrc: "images/common/portal.png",
    category: "공통",
  });

  card.dispatch("click");
  card.dispatch("click", { ctrlKey: true });
  card.dispatch("auxclick", { button: 1 });

  assert.deepEqual(JSON.parse(JSON.stringify(createdTabs)), [
    { url: "https://portal.khu.ac.kr", active: true },
    { url: "https://portal.khu.ac.kr", active: false },
    { url: "https://portal.khu.ac.kr", active: false },
  ]);
  assert.equal(closeCount, 1);
});

test("options list narrows by category and search together", () => {
  const { SiteFilterForTest } = loadScript(
    "src/options.js",
    "this.SiteFilterForTest = SiteFilter;",
    { chrome: {} },
  );
  const sites = [
    { id: "info21", name: "인포21", category: "공통" },
    { id: "sugang", name: "수강신청", category: "공통" },
    { id: "software", name: "소프트웨어융합대학", category: "단과대" },
    { id: "swcon", name: "소프트웨어융합학과", category: "학과" },
  ];
  const searchTextById = new Map(
    sites.map((site) => [site.id, `${site.name}${site.id}${site.category}`]),
  );
  const visible = (selected, query, activeIds = []) =>
    SiteFilterForTest.visibleSites(sites, {
      activeIds: new Set(activeIds),
      selectedCategories: new Set(selected),
      query,
      searchTextById,
    }).map((site) => site.id);

  // 고른 카테고리가 없으면 전체가 보인다.
  assert.deepEqual(visible([], ""), ["info21", "sugang", "software", "swcon"]);
  assert.deepEqual(visible(["학과"], ""), ["swcon"]);
  assert.deepEqual(visible(["공통", "학과"], ""), ["info21", "sugang", "swcon"]);

  // 검색과 AND로 걸린다. 필터로 뺀 카테고리는 검색어가 맞아도 나오지 않는다.
  assert.deepEqual(visible([], "소프트웨어"), ["software", "swcon"]);
  assert.deepEqual(visible(["학과"], "소프트웨어"), ["swcon"]);
  assert.deepEqual(visible(["공통"], "소프트웨어"), []);

  // 이미 오른쪽에 담긴 항목은 어느 조합에서도 왼쪽에 다시 나오지 않는다.
  assert.deepEqual(visible(["공통"], "", ["info21"]), ["sugang"]);
});

test("options splits the common category into display sections", () => {
  const { SiteGroupingForTest } = loadScript(
    ["src/data.js", "src/options.js"],
    "this.SiteGroupingForTest = SiteGrouping;",
    { chrome: {} },
  );
  const site = (id) => ({ id, name: id, category: "공통" });

  const sections = SiteGroupingForTest.split(
    // 학사·포털 2건, 교육·역량 1건, 그리고 어느 그룹에도 없는 id 1건
    [site("info21"), site("sugang"), site("oia"), site("아직-없는-서비스")],
    "공통",
  );

  assert.deepEqual(
    // Array.from은 vm 컨텍스트가 만든 배열을 이쪽 realm 배열로 옮긴다(deepEqual이 realm을 본다).
    Array.from(sections, (section) => [
      section.label,
      Array.from(section.sites, (item) => item.id),
    ]),
    [
      ["학사·포털", ["info21", "sugang"]],
      ["교육·역량", ["oia"]],
      // 매핑에 없는 id는 사라지지 않고 기타로 모인다. 서비스를 추가하며 매핑을 잊어도 안전하다.
      ["기타", ["아직-없는-서비스"]],
    ],
  );
});

test("options leaves colleges and departments as a single section", () => {
  const { SiteGroupingForTest } = loadScript(
    ["src/data.js", "src/options.js"],
    "this.SiteGroupingForTest = SiteGrouping;",
    { chrome: {} },
  );
  const sites = [{ id: "hc", name: "후마니타스 칼리지", category: "단과대" }];

  const sections = SiteGroupingForTest.split(sites, "단과대");

  assert.equal(sections.length, 1);
  assert.equal(sections[0].label, null);
  assert.deepEqual(Array.from(sections[0].sites, (item) => item.id), ["hc"]);
});

test("every common service belongs to exactly one display group", () => {
  const context = loadScript("src/data.js", "this.sites = MASTER_SITE_LIST; this.groups = COMMON_SITE_GROUPS;", {});
  const mapped = context.groups.flatMap((group) => Array.from(group.ids));

  assert.equal(mapped.length, new Set(mapped).size, "그룹 매핑에 중복 id가 있다");
  const unmapped = Array.from(context.sites)
    .filter((site) => site.category === "공통" && !mapped.includes(site.id))
    .map((site) => site.id);
  // 매핑을 빠뜨려도 화면은 "기타"로 버티지만, 배포 전에 알아차리는 편이 낫다.
  assert.deepEqual(unmapped, []);
});

test("options treats a filter-only view as narrowed so the empty message can show", () => {
  const { SiteFilterForTest } = loadScript(
    "src/options.js",
    "this.SiteFilterForTest = SiteFilter;",
    { chrome: {} },
  );

  assert.equal(SiteFilterForTest.isNarrowed("", new Set()), false);
  assert.equal(SiteFilterForTest.isNarrowed("", new Set(["학과"])), true);
  assert.equal(SiteFilterForTest.isNarrowed("검색어", new Set()), true);
});

test("version comparison handles different segment lengths", () => {
  const VersionManager = require("../src/version");

  assert.equal(VersionManager.compareVersions("2.3.2", "2.3.3"), -1);
  assert.equal(VersionManager.compareVersions("2.3.2", "2.3.2.0"), 0);
  assert.equal(VersionManager.compareVersions("3.0.0", "2.9.9"), 1);
});

test("settings storage reports success and runtime errors", () => {
  let runtimeError = null;
  let savedOrder;
  const chrome = {
    runtime: {
      get lastError() {
        return runtimeError;
      },
    },
    storage: {
      local: {
        set(value, callback) {
          savedOrder = value.userOrder;
          callback();
        },
      },
    },
  };
  const context = loadScript(
    "src/options.js",
    "this.OptionsStorageForTest = OptionsStorage;",
    { chrome },
  );

  let receivedError = "not called";
  context.OptionsStorageForTest.saveUserOrder(["khu", "info21"], (error) => {
    receivedError = error;
  });
  assert.deepEqual(savedOrder, ["khu", "info21"]);
  assert.equal(receivedError, null);

  runtimeError = { message: "quota exceeded" };
  context.OptionsStorageForTest.saveUserOrder(["khu"], (error) => {
    receivedError = error;
  });
  assert.equal(receivedError.message, "quota exceeded");
});

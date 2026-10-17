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
    category: "학사·포털",
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

test("popup keeps 사업단 together on the SW중심대학 card", () => {
  const context = loadScript(
    ["src/theme.js", "src/shared.js", "src/popup.js"],
    "this.AppForTest = App;",
    { chrome: {} },
  );

  assert.equal(
    context.AppForTest.getCardDisplayName({
      id: "swedu",
      name: "SW중심대학사업단",
    }),
    "SW중심대학\u200B사업단",
  );
  assert.equal(
    context.AppForTest.getCardDisplayName({ id: "info21", name: "인포21" }),
    "인포21",
  );
});

test("options list narrows by category and search together", () => {
  const { SiteFilterForTest } = loadScript(
    "src/options.js",
    "this.SiteFilterForTest = SiteFilter;",
    { chrome: {} },
  );
  const sites = [
    { id: "info21", name: "인포21", category: "학사·포털" },
    { id: "sugang", name: "수강신청", category: "학사·포털" },
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
  assert.deepEqual(visible(["학사·포털", "학과"], ""), ["info21", "sugang", "swcon"]);

  // 검색과 AND로 걸린다. 필터로 뺀 카테고리는 검색어가 맞아도 나오지 않는다.
  assert.deepEqual(visible([], "소프트웨어"), ["software", "swcon"]);
  assert.deepEqual(visible(["학과"], "소프트웨어"), ["swcon"]);
  assert.deepEqual(visible(["학사·포털"], "소프트웨어"), []);

  // 이미 오른쪽에 담긴 항목은 어느 조합에서도 왼쪽에 다시 나오지 않는다.
  assert.deepEqual(visible(["학사·포털"], "", ["info21"]), ["sugang"]);
});

test("the category list and the validator agree on allowed values", () => {
  const { ALLOWED_CATEGORIES } = require("../scripts/validate-data");
  const context = loadScript("src/data.js", "this.categories = SITE_CATEGORIES;", {});

  // data.js는 브라우저 전역 스크립트라 검증기가 require할 수 없어 목록이 두 벌이다.
  // 한쪽만 고치면 데이터는 통과하는데 화면에 영역이 안 생기거나 그 반대가 된다.
  assert.deepEqual(Array.from(context.categories).sort(), [...ALLOWED_CATEGORIES].sort());
});

test("every service uses one of the declared categories", () => {
  const context = loadScript(
    "src/data.js",
    "this.sites = MASTER_SITE_LIST; this.categories = SITE_CATEGORIES;",
    {},
  );
  const declared = new Set(Array.from(context.categories));

  const unknown = Array.from(context.sites)
    .filter((site) => !declared.has(site.category))
    .map((site) => `${site.id}=${site.category}`);

  assert.deepEqual(unknown, []);
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

// 버전 안내는 부가 기능이다. 조회가 느리거나 캐시가 깨져도 현재 버전은 보여야 하고,
// 캐시 쓰기만 실패하면 방금 받은 버전으로 비교해야 한다(스펙 7-1-3, 이슈 #237).
function withVersionGlobals({ storage, fetchImpl }, run) {
  const VersionManager = require("../src/version");
  const elements = {
    "current-version": { textContent: "" },
    "update-message": {
      textContent: "",
      children: [],
      replaceChildren(...nodes) {
        this.children = nodes;
      },
    },
  };
  const saved = { chrome: global.chrome, document: global.document, fetch: global.fetch };
  global.chrome = {
    runtime: { getManifest: () => ({ version: "2.9.0", update_url: "https://clients2.google.com/service/update2/crx" }) },
    storage: { local: storage },
  };
  global.document = {
    getElementById: (id) => elements[id],
    createElement: () => ({ textContent: "", className: "", title: "", href: "", target: "" }),
  };
  global.fetch = fetchImpl;
  return Promise.resolve()
    .then(() => run(VersionManager, elements))
    .finally(() => Object.assign(global, saved));
}

const latestRelease = () =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ tag_name: "v9.0.0" }) });

test("the current version shows before the latest-version lookup settles", () =>
  withVersionGlobals(
    {
      storage: { get: () => new Promise(() => {}), set: () => Promise.resolve() },
      fetchImpl: () => new Promise(() => {}),
    },
    (VersionManager, elements) => {
      VersionManager.displayVersionInfo("current-version", "update-message");
      assert.equal(elements["current-version"].textContent, "v2.9.0");
    },
  ));

test("a failing cache read still shows the current version and checks for updates", () =>
  withVersionGlobals(
    {
      storage: { get: () => Promise.reject(new Error("storage down")), set: () => Promise.resolve() },
      fetchImpl: latestRelease,
    },
    async (VersionManager, elements) => {
      await VersionManager.displayVersionInfo("current-version", "update-message");
      assert.equal(elements["current-version"].textContent, "v2.9.0");
      assert.equal(elements["update-message"].children[0]?.textContent, "새 업데이트");
    },
  ));

test("a failing cache write still compares with the version just fetched", () =>
  withVersionGlobals(
    {
      storage: { get: () => Promise.resolve({}), set: () => Promise.reject(new Error("quota")) },
      fetchImpl: latestRelease,
    },
    async (VersionManager, elements) => {
      await VersionManager.displayVersionInfo("current-version", "update-message");
      assert.equal(elements["update-message"].children[0]?.textContent, "새 업데이트");
    },
  ));

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
    ["src/shared.js", "src/popup.js"],
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
    ["src/shared.js", "src/popup.js"],
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

test("version comparison handles different segment lengths", () => {
  const context = loadScript(
    "src/popup.js",
    "this.VersionManagerForTest = VersionManager;",
    { chrome: {} },
  );

  assert.equal(context.VersionManagerForTest.compareVersions("2.3.2", "2.3.3"), -1);
  assert.equal(context.VersionManagerForTest.compareVersions("2.3.2", "2.3.2.0"), 0);
  assert.equal(context.VersionManagerForTest.compareVersions("3.0.0", "2.9.9"), 1);
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

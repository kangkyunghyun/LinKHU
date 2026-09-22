const test = require("node:test");
const assert = require("node:assert/strict");

const LandingTheme = require("../landing/theme");

function createToggleButton() {
  return {
    attributes: {},
    listeners: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    click() {
      this.listeners.click?.();
    },
    label() {
      return this.attributes["aria-label"];
    },
  };
}

function createStatusElement() {
  const classes = new Set();
  return {
    textContent: "",
    classList: {
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      },
    },
    // 평소에는 sr-only라 시각적으로 숨는다. 수정자 클래스가 붙을 때만 보인다.
    isVisible() {
      return classes.has("theme-status-visible");
    },
  };
}

// 라이트 경로만 들고 있는 아이콘. 실제 src는 테마가 정한다.
function createIcon(iconSrc) {
  return {
    dataset: { iconSrc },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    src() {
      return this.attributes.src;
    },
  };
}

function createRoot() {
  return {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

function createDocument({ toggles = [], statuses = [], icons = [] } = {}) {
  return {
    querySelectorAll(selector) {
      if (selector === "[data-theme-toggle]") return toggles;
      if (selector === "[data-theme-status]") return statuses;
      if (selector === "img[data-icon-src]") return icons;
      return [];
    },
  };
}

// 브라우저 로컬 저장소 스텁. 확장과 달리 읽기·쓰기가 동기다.
function createStorage({ stored = {}, failWrite = false } = {}) {
  return {
    saved: { ...stored },
    failWrite,
    getItem(key) {
      return key in this.saved ? this.saved[key] : null;
    },
    setItem(key, value) {
      if (this.failWrite) throw new Error("QuotaExceededError");
      this.saved[key] = value;
    },
  };
}

function createMediaQuery(matches = false) {
  const listeners = [];
  return {
    matches,
    addEventListener(type, listener) {
      if (type === "change") listeners.push(listener);
    },
    // OS 테마가 바뀐 상황을 재현한다.
    emit(next) {
      this.matches = next;
      listeners.forEach((listener) => listener({ matches: next }));
    },
  };
}

// 싱글턴이므로 테스트마다 의존과 상태를 새로 꽂는다.
function setup({ stored = {}, failWrite = false, prefersDark = false } = {}) {
  const toggle = createToggleButton();
  const status = createStatusElement();
  const icons = [createIcon("images/common/portal.png")];
  const root = createRoot();
  const storage = createStorage({ stored, failWrite });
  const media = createMediaQuery(prefersDark);
  const documentObject = createDocument({
    toggles: [toggle],
    statuses: [status],
    icons,
  });

  LandingTheme.deps = {
    storage: () => storage,
    root: () => root,
    document: () => documentObject,
    matchMedia: () => media,
  };
  LandingTheme.currentMode = LandingTheme.DEFAULT_MODE;
  LandingTheme.committedMode = LandingTheme.DEFAULT_MODE;
  LandingTheme.lastAppliedTheme = null;
  LandingTheme.themeSubscribers = new Set();

  return { toggle, status, icons, root, storage, media };
}

test("landing theme normalizes unknown modes to system", () => {
  assert.equal(LandingTheme.normalizeMode("dark"), "dark");
  assert.equal(LandingTheme.normalizeMode("solarized"), "system");
  assert.equal(LandingTheme.normalizeMode(undefined), "system");
  assert.equal(LandingTheme.normalizeMode(null), "system");
});

test("landing theme resolves system through the OS setting only", () => {
  assert.equal(LandingTheme.resolveTheme("system", true), "dark");
  assert.equal(LandingTheme.resolveTheme("system", false), "light");
  // 명시적 선택은 OS 설정을 무시한다.
  assert.equal(LandingTheme.resolveTheme("light", true), "light");
  assert.equal(LandingTheme.resolveTheme("dark", false), "dark");
});

test("landing theme toggle cycles system to light to dark and back", () => {
  const { toggle, storage } = setup();
  LandingTheme.init();
  LandingTheme.initToggle();

  assert.equal(toggle.label(), "테마: 시스템 설정. 누르면 라이트");

  toggle.click();
  assert.equal(LandingTheme.currentMode, "light");
  assert.equal(toggle.label(), "테마: 라이트. 누르면 다크");

  toggle.click();
  assert.equal(LandingTheme.currentMode, "dark");

  toggle.click();
  assert.equal(LandingTheme.currentMode, "system");
  assert.equal(storage.saved.themeMode, "system");
});

test("landing theme restores the stored mode on load", () => {
  const { root } = setup({ stored: { themeMode: "dark" }, prefersDark: false });
  LandingTheme.init();

  assert.equal(LandingTheme.currentMode, "dark");
  assert.equal(root.attributes["data-theme"], "dark");
  assert.equal(root.attributes["data-theme-mode"], "dark");
});

test("landing theme falls back to system when the stored value is damaged", () => {
  const { root } = setup({ stored: { themeMode: "neon" }, prefersDark: true });
  LandingTheme.init();

  assert.equal(LandingTheme.currentMode, "system");
  assert.equal(root.attributes["data-theme"], "dark");
  assert.equal(root.attributes["data-theme-mode"], "system");
});

test("landing theme derives the dark icon path from the light one", () => {
  assert.equal(LandingTheme.iconSrc("images/common/portal.png", "light"), "images/common/portal.png");
  assert.equal(LandingTheme.iconSrc("images/common/portal.png", "dark"), "images/dark/common/portal.png");
  assert.equal(
    LandingTheme.assetSrc("images/common/portal.png", "dark"),
    "assets/images/dark/common/portal.png",
  );
});

test("landing theme icons follow the chosen mode, not the OS setting", () => {
  // OS는 다크인데 사용자가 라이트를 골랐다. 아이콘도 라이트 벌이어야 한다.
  const { icons, toggle } = setup({ stored: { themeMode: "light" }, prefersDark: true });
  LandingTheme.init();
  LandingTheme.initToggle();

  assert.equal(icons[0].src(), "assets/images/common/portal.png");

  toggle.click(); // light -> dark
  assert.equal(icons[0].src(), "assets/images/dark/common/portal.png");
});

test("landing theme follows the OS only while the mode is system", () => {
  const { media, root } = setup({ prefersDark: false });
  LandingTheme.init();

  media.emit(true);
  assert.equal(root.attributes["data-theme"], "dark");

  LandingTheme.setMode("light");
  media.emit(false);
  media.emit(true);
  // 고정한 뒤에는 OS가 어떻게 바뀌어도 따라가지 않는다.
  assert.equal(root.attributes["data-theme"], "light");
});

test("landing theme rolls back to the last saved mode when writing fails", () => {
  const { toggle, status, root, icons } = setup({
    stored: { themeMode: "dark" },
    failWrite: true,
    prefersDark: false,
  });
  LandingTheme.init();
  LandingTheme.initToggle();

  toggle.click(); // dark -> system 을 시도하지만 저장이 실패한다

  assert.equal(LandingTheme.currentMode, "dark");
  assert.equal(root.attributes["data-theme"], "dark");
  assert.equal(icons[0].src(), "assets/images/dark/common/portal.png");
  assert.equal(status.textContent, LandingTheme.SAVE_FAILED_MESSAGE);
  assert.ok(status.isVisible());
});

test("landing theme keeps the status line hidden when saving succeeds", () => {
  const { toggle, status } = setup();
  LandingTheme.init();
  LandingTheme.initToggle();

  toggle.click();

  assert.equal(status.textContent, "테마: 라이트");
  assert.ok(!status.isVisible());
});

test("landing theme still paints when the storage is blocked", () => {
  const { root } = setup();
  LandingTheme.deps.storage = () => null;

  LandingTheme.init();
  assert.equal(LandingTheme.currentMode, "system");
  assert.equal(root.attributes["data-theme"], "light");
});

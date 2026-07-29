const test = require("node:test");
const assert = require("node:assert/strict");

const ThemeManager = require("../src/theme");

function createRoot() {
  return {
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

// 각 테스트가 자기 의존만 보도록 매번 초기 상태로 되돌린다.
function useThemeManager({ storage = null, lastError = null, prefersDark = false } = {}) {
  const root = createRoot();
  const listeners = [];

  ThemeManager.currentMode = ThemeManager.DEFAULT_MODE;
  ThemeManager.deps = {
    storage: () => storage,
    lastError: () => lastError,
    root: () => root,
    matchMedia: () => ({
      matches: prefersDark,
      addEventListener(type, listener) {
        listeners.push(listener);
      },
    }),
  };

  return { root, listeners, theme: () => root.attributes["data-theme"] };
}

test("theme mode normalizes unknown, missing, and non-string values to system", () => {
  useThemeManager();

  assert.equal(ThemeManager.normalizeMode("system"), "system");
  assert.equal(ThemeManager.normalizeMode("light"), "light");
  assert.equal(ThemeManager.normalizeMode("dark"), "dark");

  assert.equal(ThemeManager.normalizeMode(undefined), "system");
  assert.equal(ThemeManager.normalizeMode(null), "system");
  assert.equal(ThemeManager.normalizeMode(""), "system");
  assert.equal(ThemeManager.normalizeMode("DARK"), "system");
  assert.equal(ThemeManager.normalizeMode("sepia"), "system");
  assert.equal(ThemeManager.normalizeMode(1), "system");
  assert.equal(ThemeManager.normalizeMode({ mode: "dark" }), "system");
});

test("theme resolution follows the system only when the mode is system", () => {
  useThemeManager();

  assert.equal(ThemeManager.resolveTheme("system", true), "dark");
  assert.equal(ThemeManager.resolveTheme("system", false), "light");

  // 명시적 선택은 시스템 설정보다 우선한다.
  assert.equal(ThemeManager.resolveTheme("light", true), "light");
  assert.equal(ThemeManager.resolveTheme("dark", false), "dark");

  // 손상된 값은 system으로 폴백하므로 시스템 설정을 따른다.
  assert.equal(ThemeManager.resolveTheme("sepia", true), "dark");
});

test("stored mode is read on init and a missing value falls back to system", () => {
  const dark = useThemeManager({
    storage: {
      get(keys, callback) {
        callback({});
      },
    },
    prefersDark: true,
  });

  ThemeManager.init();
  assert.equal(ThemeManager.currentMode, "system");
  assert.equal(dark.theme(), "dark");

  const light = useThemeManager({
    storage: {
      get(keys, callback) {
        assert.deepEqual(keys, ["themeMode"]);
        callback({ themeMode: "light" });
      },
    },
    prefersDark: true,
  });

  ThemeManager.init();
  assert.equal(ThemeManager.currentMode, "light");
  assert.equal(light.theme(), "light");
});

test("theme is painted from the system before the stored mode arrives", () => {
  const pending = [];
  const context = useThemeManager({
    storage: {
      get(keys, callback) {
        pending.push(callback);
      },
    },
    prefersDark: true,
  });

  ThemeManager.init();
  // 저장소 콜백이 도착하기 전에도 시스템 설정으로 이미 칠해져 있어야 한다.
  assert.equal(context.theme(), "dark");

  pending.forEach((callback) => callback({ themeMode: "light" }));
  assert.equal(context.theme(), "light");
});

test("system theme changes repaint only while the mode is system", () => {
  let prefersDark = false;
  const root = createRoot();
  const listeners = [];

  ThemeManager.currentMode = "system";
  ThemeManager.deps = {
    storage: () => null,
    lastError: () => null,
    root: () => root,
    matchMedia: () => ({
      get matches() {
        return prefersDark;
      },
      addEventListener(type, listener) {
        listeners.push(listener);
      },
    }),
  };

  ThemeManager.init();
  assert.equal(root.attributes["data-theme"], "light");

  prefersDark = true;
  listeners.forEach((listener) => listener());
  assert.equal(root.attributes["data-theme"], "dark");

  // 명시적으로 라이트를 고르면 시스템 변경을 따라가지 않는다.
  ThemeManager.currentMode = "light";
  ThemeManager.refresh();
  listeners.forEach((listener) => listener());
  assert.equal(root.attributes["data-theme"], "light");
});

test("selecting a mode saves it and keeps the applied theme", () => {
  let saved;
  const context = useThemeManager({
    storage: {
      get(keys, callback) {
        callback({});
      },
      set(value, callback) {
        saved = value;
        callback();
      },
    },
  });

  let received = "not called";
  ThemeManager.setMode("dark", (error, mode) => {
    received = { error, mode };
  });

  assert.deepEqual(saved, { themeMode: "dark" });
  assert.equal(received.error, null);
  assert.equal(received.mode, "dark");
  assert.equal(ThemeManager.currentMode, "dark");
  assert.equal(context.theme(), "dark");
});

test("a failed save rolls the theme and the reported mode back", () => {
  const context = useThemeManager({
    storage: {
      get(keys, callback) {
        callback({ themeMode: "light" });
      },
      set(value, callback) {
        callback();
      },
    },
    lastError: { message: "quota exceeded" },
  });

  ThemeManager.currentMode = "light";
  ThemeManager.refresh();
  assert.equal(context.theme(), "light");

  let received = "not called";
  ThemeManager.setMode("dark", (error, mode) => {
    received = { error, mode };
  });

  assert.equal(received.error.message, "quota exceeded");
  // 화면, 보고된 모드, 내부 상태가 모두 직전 값으로 돌아가야 한다.
  assert.equal(received.mode, "light");
  assert.equal(ThemeManager.currentMode, "light");
  assert.equal(context.theme(), "light");
});

test("theme handling survives a missing storage API", () => {
  const context = useThemeManager({ storage: null, prefersDark: true });

  let readMode = "not called";
  ThemeManager.readMode((mode) => {
    readMode = mode;
  });
  assert.equal(readMode, "system");

  let received = "not called";
  ThemeManager.setMode("dark", (error, mode) => {
    received = { error, mode };
  });

  assert.ok(received.error instanceof Error);
  assert.equal(received.mode, "system");
  // 저장은 못 했어도 화면은 시스템 설정 기준으로 정상 동작해야 한다.
  assert.equal(context.theme(), "dark");
});

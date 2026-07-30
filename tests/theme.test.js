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

// 콜백을 즉시 부르지 않고 모아두었다가 원하는 순서로 발화시킨다.
// 저장소 콜백이 요청 순서와 다르게 도착하는 상황을 재현하려면 이게 필요하다.
function createDeferredStorage(stored = {}) {
  const reads = [];
  const writes = [];

  return {
    reads,
    writes,
    saved: stored,
    get(keys, callback) {
      // 읽기를 건 시점의 값을 돌려준다. 이후에 쓰기가 끼어들어도
      // 이미 출발한 읽기는 옛 값을 들고 온다 — 경쟁 상태의 핵심이다.
      const snapshot = { ...this.saved };
      reads.push(() => callback(snapshot));
    },
    set(value, callback) {
      writes.push((error) => {
        if (!error) Object.assign(this.saved, value);
        callback();
      });
    },
  };
}

// 각 테스트가 자기 의존만 보도록 매번 초기 상태로 되돌린다.
function useThemeManager({ storage = null, lastError = null, prefersDark = false } = {}) {
  const root = createRoot();
  const listeners = [];
  const state = { lastError };

  ThemeManager.currentMode = ThemeManager.DEFAULT_MODE;
  ThemeManager.requestId = 0;
  ThemeManager.resolved = false;
  ThemeManager.onResolved = null;
  ThemeManager.deps = {
    storage: () => storage,
    lastError: () => state.lastError,
    root: () => root,
    matchMedia: () => ({
      matches: prefersDark,
      addEventListener(type, listener) {
        listeners.push(listener);
      },
    }),
  };

  return { root, listeners, state, theme: () => root.attributes["data-theme"] };
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

test("a late stored mode does not override a selection made while it was in flight", () => {
  const storage = createDeferredStorage({ themeMode: "light" });
  const context = useThemeManager({ storage, prefersDark: false });

  let resolvedMode = "not called";
  ThemeManager.init();
  ThemeManager.whenResolved((mode) => {
    resolvedMode = mode;
  });

  // 저장값(light)이 아직 도착하지 않은 사이에 사용자가 dark를 고른다.
  ThemeManager.setMode("dark");
  storage.writes.shift()(null);
  assert.equal(context.theme(), "dark");

  // 이제서야 옛 저장값이 도착한다. 사용자의 명시적 선택을 덮으면 안 된다.
  storage.reads.shift()();

  assert.equal(ThemeManager.currentMode, "dark");
  assert.equal(context.theme(), "dark");
  assert.equal(storage.saved.themeMode, "dark");
  // 해석 완료 통지는 오되, 값은 사용자가 고른 최신 모드여야 한다.
  assert.equal(resolvedMode, "dark");
});

test("a late failed save does not roll back a newer save that succeeded", () => {
  const storage = createDeferredStorage({});
  const context = useThemeManager({ storage, prefersDark: false });

  ThemeManager.init();
  storage.reads.shift()();
  assert.equal(ThemeManager.currentMode, "system");

  const calls = [];
  ThemeManager.setMode("light", (error, mode) => calls.push(["A", error, mode]));
  ThemeManager.setMode("dark", (error, mode) => calls.push(["B", error, mode]));

  // 나중 요청 B가 먼저 성공하고, 앞선 요청 A의 실패가 뒤늦게 도착한다.
  const writeA = storage.writes.shift();
  const writeB = storage.writes.shift();

  context.state.lastError = null;
  writeB(null);

  context.state.lastError = { message: "quota exceeded" };
  writeA({ message: "quota exceeded" });
  context.state.lastError = null;

  // A는 낡은 요청이므로 조용히 무시되어야 한다.
  assert.deepEqual(
    calls.map(([label]) => label),
    ["B"],
  );
  // 화면, 내부 상태, 저장소가 모두 dark로 일치해야 한다.
  assert.equal(ThemeManager.currentMode, "dark");
  assert.equal(context.theme(), "dark");
  assert.equal(storage.saved.themeMode, "dark");
});

test("the newest save still rolls back when it is the one that fails", () => {
  const storage = createDeferredStorage({});
  const context = useThemeManager({ storage, prefersDark: false });

  ThemeManager.init();
  storage.reads.shift()();

  ThemeManager.setMode("light", () => {});
  storage.writes.shift()(null);
  assert.equal(context.theme(), "light");

  let received = "not called";
  ThemeManager.setMode("dark", (error, mode) => {
    received = { error, mode };
  });

  context.state.lastError = { message: "quota exceeded" };
  storage.writes.shift()({ message: "quota exceeded" });
  context.state.lastError = null;

  // 최신 요청이 실패했으므로 직전에 적용됐던 light로 되돌아간다.
  assert.equal(received.error.message, "quota exceeded");
  assert.equal(received.mode, "light");
  assert.equal(ThemeManager.currentMode, "light");
  assert.equal(context.theme(), "light");
  assert.equal(storage.saved.themeMode, "light");
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

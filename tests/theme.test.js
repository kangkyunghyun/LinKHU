const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const LinKHUTheme = require("../src/theme");
const PROJECT_ROOT = path.resolve(__dirname, "..");

function loadThemePage({ storedPreference, prefersDark = false } = {}) {
  const source = fs.readFileSync(
    path.join(PROJECT_ROOT, "src", "theme.js"),
    "utf8",
  );
  const root = { dataset: {}, style: {} };
  const savedValues = [];
  let mediaChangeListener = null;
  let storageChangeListener = null;
  let runtimeError = null;

  const mediaQuery = {
    matches: prefersDark,
    addEventListener(type, listener) {
      if (type === "change") mediaChangeListener = listener;
    },
  };
  const chrome = {
    runtime: {
      get lastError() {
        return runtimeError;
      },
    },
    storage: {
      local: {
        get(keys, callback) {
          callback({ themePreference: storedPreference });
        },
        set(value, callback) {
          savedValues.push(value);
          callback();
        },
      },
      onChanged: {
        addListener(listener) {
          storageChangeListener = listener;
        },
      },
    },
  };
  const context = {
    chrome,
    document: { documentElement: root },
    window: { matchMedia: () => mediaQuery },
  };

  vm.createContext(context);
  vm.runInContext(`${source}\nthis.ThemeForTest = LinKHUTheme;`, context, {
    filename: "src/theme.js",
  });

  return {
    root,
    savedValues,
    theme: context.ThemeForTest,
    changeMedia(prefersDarkValue) {
      mediaQuery.matches = prefersDarkValue;
      mediaChangeListener({ matches: prefersDarkValue });
    },
    changeStorage(value) {
      storageChangeListener(
        { themePreference: { newValue: value } },
        "local",
      );
    },
    setRuntimeError(error) {
      runtimeError = error;
    },
  };
}

test("theme preference accepts system, light, and dark only", () => {
  assert.equal(LinKHUTheme.normalizePreference("system"), "system");
  assert.equal(LinKHUTheme.normalizePreference("light"), "light");
  assert.equal(LinKHUTheme.normalizePreference("dark"), "dark");
  assert.equal(LinKHUTheme.normalizePreference("sepia"), "system");
  assert.equal(LinKHUTheme.normalizePreference(undefined), "system");
});

test("explicit themes override the system theme", () => {
  assert.equal(LinKHUTheme.resolveTheme("system", true), "dark");
  assert.equal(LinKHUTheme.resolveTheme("system", false), "light");
  assert.equal(LinKHUTheme.resolveTheme("light", true), "light");
  assert.equal(LinKHUTheme.resolveTheme("dark", false), "dark");
});

test("theme page applies the stored preference before becoming visible", () => {
  const darkSystemPage = loadThemePage({
    storedPreference: "system",
    prefersDark: true,
  });
  assert.equal(darkSystemPage.root.dataset.themePreference, "system");
  assert.equal(darkSystemPage.root.dataset.theme, "dark");
  assert.equal(darkSystemPage.root.dataset.themeReady, "true");
  assert.equal(darkSystemPage.root.style.colorScheme, "dark");

  const explicitLightPage = loadThemePage({
    storedPreference: "light",
    prefersDark: true,
  });
  assert.equal(explicitLightPage.root.dataset.themePreference, "light");
  assert.equal(explicitLightPage.root.dataset.theme, "light");
});

test("system changes and storage changes update an open page", () => {
  const page = loadThemePage({
    storedPreference: "system",
    prefersDark: false,
  });

  page.changeMedia(true);
  assert.equal(page.root.dataset.theme, "dark");

  page.changeStorage("light");
  assert.equal(page.root.dataset.themePreference, "light");
  assert.equal(page.root.dataset.theme, "light");

  page.changeMedia(true);
  assert.equal(page.root.dataset.theme, "light");
});

test("saving a theme persists and applies the normalized preference", () => {
  const page = loadThemePage({ storedPreference: "system" });
  let receivedError = "not called";

  page.theme.savePreference("dark", (error) => {
    receivedError = error;
  });

  assert.equal(receivedError, null);
  assert.deepEqual(JSON.parse(JSON.stringify(page.savedValues)), [
    { themePreference: "dark" },
  ]);
  assert.equal(page.root.dataset.theme, "dark");

  page.setRuntimeError({ message: "quota exceeded" });
  page.theme.savePreference("light", (error) => {
    receivedError = error;
  });
  assert.equal(receivedError.message, "quota exceeded");
  assert.equal(page.root.dataset.theme, "dark");
});

test("popup and options load theme initialization before their styles", () => {
  ["popup.html", "options.html"].forEach((fileName) => {
    const html = fs.readFileSync(path.join(PROJECT_ROOT, "src", fileName), "utf8");
    const pageStylesheet = fileName.replace(".html", ".css");
    assert.ok(html.indexOf('src="theme.js"') < html.indexOf('href="theme.css"'));
    assert.ok(
      html.indexOf('href="theme.css"') <
        html.indexOf(`href="${pageStylesheet}"`),
    );
  });
});

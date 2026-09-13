const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

function popup({ shortcut = "", dismissed, error = false, throws = false } = {}) {
  const nodes = new Map();
  for (const id of ["shortcut-notice", "shortcut-notice-settings", "shortcut-notice-dismiss", "theme-status"]) {
    const classes = new Set();
    nodes.set(id, {
      hidden: id === "shortcut-notice",
      textContent: "",
      listeners: {},
      classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name) },
      addEventListener(type, fn) { this.listeners[type] = fn; },
      click() { this.listeners.click?.(); },
    });
  }
  const saved = { shortcutNoticeDismissed: dismissed };
  const writes = [];
  const tabs = [];
  let reads = 0;
  const runtime = { getURL: (file) => `chrome-extension://test/${file}` };
  const context = {
    document: { getElementById: (id) => nodes.get(id), addEventListener() {} },
    chrome: {
      runtime,
      tabs: { create: (value) => tabs.push(value) },
      commands: { getAll: (callback) => callback([{ name: "_execute_action", shortcut }]) },
      storage: { local: {
        get(keys, callback) { reads++; callback(saved); },
        set(value, callback) {
          if (throws) throw new Error("storage unavailable");
          writes.push(() => {
            if (error) runtime.lastError = { message: "quota exceeded" };
            else Object.assign(saved, value);
            callback();
            delete runtime.lastError;
          });
        },
      } },
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, "src/popup.js"), "utf8") + "\ninitShortcutNotice();", context);
  return { nodes, saved, writes, tabs, reads, setError(value) { error = value; } };
}

test("registered shortcut hides popup notice before reading dismissal preference", () => {
  const app = popup({ shortcut: "Ctrl+Shift+L" });
  assert.equal(app.nodes.get("shortcut-notice").hidden, true);
  assert.equal(app.reads, 0);
});

test("unregistered shortcut shows popup notice", () => {
  assert.equal(popup().nodes.get("shortcut-notice").hidden, false);
});

test("dismissal immediately hides notice and persists true", () => {
  const app = popup();
  app.nodes.get("shortcut-notice-dismiss").click();
  assert.equal(app.nodes.get("shortcut-notice").hidden, true);
  assert.equal(app.writes.length, 1);
  app.writes[0]();
  assert.equal(app.saved.shortcutNoticeDismissed, true);
  assert.equal(popup({ dismissed: app.saved.shortcutNoticeDismissed }).nodes.get("shortcut-notice").hidden, true);
});

test("only boolean true suppresses the unregistered notice", () => {
  assert.equal(popup({ dismissed: true }).nodes.get("shortcut-notice").hidden, true);
  assert.equal(popup({ dismissed: "true" }).nodes.get("shortcut-notice").hidden, false);
});

test("failed save restores notice and visibly announces the failure", () => {
  const app = popup({ error: true });
  app.nodes.get("shortcut-notice-dismiss").click();
  app.writes[0]();
  assert.equal(app.nodes.get("shortcut-notice").hidden, false);
  assert.notEqual(app.saved.shortcutNoticeDismissed, true);
  assert.match(app.nodes.get("theme-status").textContent, /저장하지 못했습니다/);
  assert.equal(app.nodes.get("theme-status").classList.contains("theme-status-visible"), true);
});

test("successful retry clears the dismissal failure status", () => {
  const app = popup({ error: true });
  app.nodes.get("shortcut-notice-dismiss").click();
  app.writes[0]();
  app.setError(false);
  app.nodes.get("shortcut-notice-dismiss").click();
  app.writes[1]();
  assert.equal(app.saved.shortcutNoticeDismissed, true);
  assert.equal(app.nodes.get("shortcut-notice").hidden, true);
  assert.equal(app.nodes.get("theme-status").textContent, "");
  assert.equal(app.nodes.get("theme-status").classList.contains("theme-status-visible"), false);
});

test("synchronous storage failure also restores notice", () => {
  const app = popup({ throws: true });
  app.nodes.get("shortcut-notice-dismiss").click();
  assert.equal(app.nodes.get("shortcut-notice").hidden, false);
  assert.match(app.nodes.get("theme-status").textContent, /저장하지 못했습니다/);
});

test("settings button opens the guide fragment in a new tab", () => {
  const app = popup();
  app.nodes.get("shortcut-notice-settings").click();
  assert.equal(app.tabs.length, 1);
  assert.equal(app.tabs[0].url, "chrome-extension://test/options.html#shortcut-guide");
});

test("options guide is expanded and includes Aside using the existing shortcut button", () => {
  const html = fs.readFileSync(path.join(root, "src/options.html"), "utf8");
  assert.match(html, /<section id="shortcut-guide"[^>]*hidden>/);
  assert.doesNotMatch(html, /<details\b|<summary\b/);
  assert.match(html, /class="shortcut-link" data-shortcut-url="aside:\/\/extensions\/shortcuts"/);
  assert.match(html, /&lt;브라우저 이름&gt;:\/\/extensions\/shortcuts/);
  const popupHtml = fs.readFileSync(path.join(root, "src/popup.html"), "utf8");
  assert.match(popupHtml, /id="shortcut-notice"[^>]*hidden/);
  assert.match(popupHtml, /id="theme-status"[^>]*role="status"/);
});

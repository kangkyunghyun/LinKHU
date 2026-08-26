const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { PC_INSTALL_URL, isMobileUserAgent } = require("../docs/landing");

const DOCS_ROOT = path.join(__dirname, "..", "docs");
const QR_TARGET_URL = `${PC_INSTALL_URL}?utm_source=qr`;

test("mobile detection covers extension-less browsers only", () => {
  [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Mozilla/5.0 (Linux; Android 14; SM-S911N) AppleWebKit/537.36 Chrome/120",
  ].forEach((userAgent) => assert.equal(isMobileUserAgent(userAgent), true, userAgent));

  [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120",
    "",
    undefined,
  ].forEach((userAgent) => assert.equal(isMobileUserAgent(userAgent), false, String(userAgent)));
});

test("mobile install guide markup and QR asset stay in sync", () => {
  const markup = fs.readFileSync(path.join(DOCS_ROOT, "index.html"), "utf8");

  assert.ok(markup.includes(PC_INSTALL_URL), "안내 UI가 복사 대상 주소를 보여줘야 한다");
  assert.ok(markup.includes("assets/pc-install-qr.png"), "QR 이미지를 참조해야 한다");
  assert.ok(
    fs.existsSync(path.join(DOCS_ROOT, "assets", "pc-install-qr.png")),
    "QR 이미지 파일이 있어야 한다",
  );
  // QR 이미지를 다시 만들 때 쓸 대상 주소. landing.js 주석과 함께 유지한다.
  assert.equal(QR_TARGET_URL, "https://kangkyunghyun.github.io/LinKHU/?utm_source=qr");
});

// docs/landing.js는 브라우저 전역에서 스스로 초기화한다. 검색·피드백 요소는 없는 문서를
// 만들어 두 모듈이 일찍 빠져나가게 하고, 모바일 안내 요소만 붙여 실제 배선을 확인한다.
class StubElement {
  constructor() {
    this.hidden = true;
    this.textContent = "";
    this.attributes = {};
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  click() {
    return this.listeners.get("click")?.();
  }
}

function runLandingScript({ userAgent, gtag, clipboard }) {
  const elements = {
    "#mobile-install-guide": new StubElement(),
    "#mobile-install-copy": new StubElement(),
    "#mobile-install-qr-toggle": new StubElement(),
    "#mobile-install-qr": new StubElement(),
    "#mobile-install-status": new StubElement(),
  };
  const context = {
    console,
    window: {
      document: {
        querySelector: (selector) => elements[selector] || null,
        querySelectorAll: () => [],
        addEventListener() {},
      },
      fetch: () => new Promise(() => {}),
      navigator: { userAgent, clipboard },
      gtag,
    },
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(DOCS_ROOT, "landing.js"), "utf8"),
    context,
    { filename: "docs/landing.js" },
  );
  return elements;
}

const MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15";
const DESKTOP_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120";

test("the guide stays hidden on desktop and appears on mobile", () => {
  assert.equal(runLandingScript({ userAgent: DESKTOP_UA })["#mobile-install-guide"].hidden, true);
  assert.equal(runLandingScript({ userAgent: MOBILE_UA })["#mobile-install-guide"].hidden, false);
});

test("copying the link writes the PC address and reports the result", async () => {
  const copied = [];
  const elements = runLandingScript({
    userAgent: MOBILE_UA,
    clipboard: { writeText: (text) => (copied.push(text), Promise.resolve()) },
  });

  await elements["#mobile-install-copy"].click();

  assert.deepEqual(copied, [PC_INSTALL_URL]);
  assert.match(elements["#mobile-install-status"].textContent, /복사했습니다/);
});

test("a browser without the clipboard API gets a manual copy hint", async () => {
  const elements = runLandingScript({ userAgent: MOBILE_UA });

  await elements["#mobile-install-copy"].click();

  assert.match(elements["#mobile-install-status"].textContent, /길게 눌러/);
});

test("the QR toggle reveals and hides the code", () => {
  const elements = runLandingScript({ userAgent: MOBILE_UA });
  const toggle = elements["#mobile-install-qr-toggle"];
  const qr = elements["#mobile-install-qr"];

  toggle.click();
  assert.equal(qr.hidden, false);
  assert.equal(toggle.attributes["aria-expanded"], "true");

  toggle.click();
  assert.equal(qr.hidden, true);
  assert.equal(toggle.attributes["aria-expanded"], "false");
});

test("guide actions report to GA4 only when gtag is loaded", async () => {
  const events = [];
  const elements = runLandingScript({
    userAgent: MOBILE_UA,
    gtag: (type, name) => events.push([type, name]),
    clipboard: { writeText: () => Promise.resolve() },
  });

  await elements["#mobile-install-copy"].click();
  elements["#mobile-install-qr-toggle"].click();
  elements["#mobile-install-qr-toggle"].click();

  assert.deepEqual(events, [
    ["event", "copy_pc_install_link"],
    // QR은 펼칠 때만 보낸다. 접는 동작은 이벤트가 아니다.
    ["event", "view_qr_code"],
  ]);

  // gtag가 아직 로드되지 않은 문서에서도 클릭이 예외 없이 끝나야 한다.
  const withoutGtag = runLandingScript({ userAgent: MOBILE_UA });
  await withoutGtag["#mobile-install-copy"].click();
  withoutGtag["#mobile-install-qr-toggle"].click();
});

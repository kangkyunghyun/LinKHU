const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const { parseReleaseBody, stripInternalSection } = require("../docs/landing");
const {
  stripInternalSection: stripInPublishScript,
} = require("../scripts/publish-firefox");

const PROJECT_ROOT = path.join(__dirname, "..");

test("랜딩 릴리스 노트에서 Internal 섹션이 빠진다", () => {
  const body = [
    "### Features",
    "",
    "- 새 기능",
    "",
    "### Internal",
    "",
    "- 토큰으로 통합",
    "",
    "### Fixes",
    "",
    "- 고친 것",
    "",
  ].join("\n");

  const blocks = parseReleaseBody(body);

  assert.deepEqual(blocks, [
    { type: "heading", text: "Features" },
    { type: "list", items: ["새 기능"] },
    { type: "heading", text: "Fixes" },
    { type: "list", items: ["고친 것"] },
  ]);
  assert.ok(!JSON.stringify(blocks).includes("Internal"));
  assert.ok(!JSON.stringify(blocks).includes("토큰으로 통합"));
});

test("Internal이 없는 릴리스 노트는 그대로 나온다", () => {
  const body = "### Features\n\n- 공통 서비스 아이콘 추가\n";

  assert.equal(stripInternalSection(body), body);
  assert.deepEqual(parseReleaseBody(body), [
    { type: "heading", text: "Features" },
    { type: "list", items: ["공통 서비스 아이콘 추가"] },
  ]);
});

// 같은 규칙이 두 벌이라 갈라질 수 있다. 검색 랭킹을 확장·랜딩 양쪽에서 검사하는 것과
// 같은 방식으로, 실제 릴리스 노트 전부에 두 구현을 돌려 결과가 같은지 고정한다.
test("랜딩과 Firefox 배포 스크립트의 Internal 제거 규칙이 같다", () => {
  const notesDirectory = path.join(PROJECT_ROOT, "release-notes");
  const noteFiles = fs.readdirSync(notesDirectory).filter((name) => name.endsWith(".md"));

  assert.ok(noteFiles.length > 0, "릴리스 노트가 있어야 한다");
  noteFiles.forEach((name) => {
    const body = fs.readFileSync(path.join(notesDirectory, name), "utf8");
    assert.equal(stripInternalSection(body), stripInPublishScript(body), name);
  });
});

// 릴리스 본문은 GitHub API 응답이라 신뢰 경계 밖이다. innerHTML을 쓰면 마크업이 그대로
// 실행되므로, 그 접근 자체를 막는 가짜 DOM으로 배선을 확인한다.
class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.attributes = {};
    this.className = "";
    this.hidden = false;
    this.open = false;
    this._text = "";
  }

  set innerHTML(value) {
    throw new Error(`innerHTML을 쓰면 안 된다: ${value}`);
  }

  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }

  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map((child) => child.textContent).join("");
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  addEventListener() {}

  append(...nodes) {
    this.children.push(...nodes);
  }

  replaceChildren(...nodes) {
    this.children = nodes;
  }

  find(tagName) {
    return this.children.flatMap((child) =>
      child.find ? [...(child.tagName === tagName ? [child] : []), ...child.find(tagName)] : [],
    );
  }
}

class FakeTextNode {
  constructor(text) {
    this.tagName = "#text";
    this.textContent = String(text);
  }

  find() {
    return [];
  }
}

function runLandingScript({ releases, fetchReleases }) {
  const elements = {
    "#releases": new FakeElement("section"),
    "#release-list": new FakeElement("div"),
  };
  const stored = new Map();
  const context = {
    console,
    window: {
      document: {
        querySelector: (selector) => elements[selector] || null,
        querySelectorAll: () => [],
        addEventListener() {},
        createElement: (tagName) => new FakeElement(tagName),
        createTextNode: (text) => new FakeTextNode(text),
      },
      fetch: (url) => {
        if (!String(url).includes("api.github.com")) return new Promise(() => {});
        if (fetchReleases) return fetchReleases();
        return Promise.resolve({ ok: true, json: () => Promise.resolve(releases) });
      },
      navigator: {},
      sessionStorage: {
        getItem: (key) => stored.get(key) ?? null,
        setItem: (key, value) => stored.set(key, value),
      },
    },
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(path.join(PROJECT_ROOT, "docs", "landing.js"), "utf8"),
    context,
    { filename: "docs/landing.js" },
  );
  // 초기화가 fetch 체인을 돌 때까지 기다린다.
  return new Promise((resolve) => setImmediate(() => resolve(elements)));
}

test("릴리스가 많아도 최근 다섯 개만 그린다", async () => {
  const elements = await runLandingScript({
    releases: Array.from({ length: 12 }, (_, index) => ({
      tag_name: `v1.0.${11 - index}`,
      published_at: "2026-09-01T00:00:00Z",
      draft: false,
      body: "### Features\n\n- 무언가\n",
    })),
  });

  const list = elements["#release-list"];

  // 접어도 열여덟 줄이면 소개 흐름을 끊는다. 잘린 나머지는 섹션 아래
  // "GitHub에서 전체 릴리스 보기"가 받는다.
  assert.equal(list.children.length, 5);
  assert.match(list.textContent, /v1\.0\.11/, "가장 최근 것이 남아야 한다");
  assert.ok(
    !list.textContent.includes("v1.0.6"),
    "여섯 번째부터는 그리지 않는다",
  );
});

test("릴리스를 받으면 섹션이 드러나고 Internal 항목은 화면에 없다", async () => {
  const elements = await runLandingScript({
    releases: [
      {
        tag_name: "v2.8.0",
        published_at: "2026-09-01T00:00:00Z",
        draft: false,
        body: "### Features\n\n- 경희사이버대 추가\n\n### Internal\n\n- 토큰으로 통합\n",
      },
    ],
  });

  const section = elements["#releases"];
  const list = elements["#release-list"];

  assert.equal(section.hidden, false);
  assert.equal(list.children.length, 1);
  assert.equal(list.children[0].open, true, "최신 릴리스는 펼쳐져 있어야 한다");
  assert.match(list.textContent, /v2\.8\.0/);
  assert.match(list.textContent, /경희사이버대 추가/);
  assert.ok(!list.textContent.includes("Internal"));
  assert.ok(!list.textContent.includes("토큰으로 통합"));
});

test("fetch가 실패하면 섹션이 감춰지고 예외가 새지 않는다", async () => {
  const elements = await runLandingScript({
    fetchReleases: () => Promise.reject(new Error("network down")),
  });

  assert.equal(elements["#releases"].hidden, true);
  assert.equal(elements["#release-list"].children.length, 0);
});

test("HTTP 오류 응답도 같은 폴백으로 처리한다", async () => {
  const elements = await runLandingScript({
    fetchReleases: () => Promise.resolve({ ok: false, status: 403 }),
  });

  assert.equal(elements["#releases"].hidden, true);
});

test("릴리스 본문의 마크업은 글자로 남고 실행되지 않는다", async () => {
  const elements = await runLandingScript({
    releases: [
      {
        tag_name: "v9.9.9",
        published_at: "2026-09-01T00:00:00Z",
        draft: false,
        body: "### Features\n\n- <img src=x onerror=alert(1)> 와 <script>alert(2)</script>\n",
      },
    ],
  });

  const list = elements["#release-list"];

  // 가짜 DOM은 innerHTML 대입을 던지므로, 여기 왔다는 것 자체가 텍스트로 붙었다는 뜻이다.
  assert.ok(list.textContent.includes("<script>alert(2)</script>"));
  assert.equal(list.find("script").length, 0);
  assert.equal(list.find("img").length, 0);
});

test("본문의 백틱은 code 요소가 되고 짝이 없으면 글자로 남는다", async () => {
  const elements = await runLandingScript({
    releases: [
      {
        tag_name: "v9.9.8",
        published_at: "2026-09-01T00:00:00Z",
        draft: false,
        body: "### Fixes\n\n- 학과 이름 `환경학 및 환경공학과`를 고쳤습니다\n- 짝 없는 ` 백틱\n",
      },
    ],
  });

  const codes = elements["#release-list"].find("code");

  assert.deepEqual(
    codes.map((code) => code.textContent),
    ["환경학 및 환경공학과"],
  );
  assert.match(elements["#release-list"].textContent, /짝 없는 ` 백틱/);
});

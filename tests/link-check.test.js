const assert = require("node:assert/strict");
const test = require("node:test");
const { classifyResult, createReport, checkSites } = require("../scripts/check-links");

for (const status of [404, 410, 500, 502, 503, 599]) {
  test(`HTTP ${status}는 접속 실패다`, () => {
    assert.equal(classifyResult({ status }), `HTTP ${status}`);
  });
}

for (const status of [200, 204, 301, 302, 401, 403, 400, 405, 429]) {
  test(`HTTP ${status}는 접속 실패로 알리지 않는다`, () => {
    assert.equal(classifyResult({ status }), null);
  });
}

test("연결 오류는 원인을 남기고 시간 초과는 따로 표시한다", () => {
  assert.equal(classifyResult({ error: { message: "fetch failed", cause: { code: "ENOTFOUND" } } }), "연결 실패: ENOTFOUND");
  for (const name of ["TimeoutError", "AbortError"]) {
    assert.equal(classifyResult({ error: { name } }), "시간 초과 (20초)");
  }
});

test("보고서는 실패 항목만 담고 표 안의 특수문자를 이스케이프한다", () => {
  const results = [
    { id: "ok", name: "로그인 페이지", url: "https://example.org/login", reason: null },
    { id: "bad", name: "이름|<태그>\n다음", url: "https://example.org/?a=1&b=2", reason: "HTTP 404" },
  ];
  const report = createReport(results);
  assert.ok(report.startsWith("해외 러너에서는"));
  assert.match(report, /검사 2곳, 정상 1곳, 실패 1곳/);
  assert.match(report, /\| bad \| 이름&#124;&lt;태그&gt; 다음 \| https:\/\/example.org\/\?a=1&amp;b=2 \| HTTP 404 \|/);
  assert.ok(!report.includes("로그인 페이지"));
  assert.equal(results[1].name, "이름|<태그>\n다음");
});

test("정상 보고서와 빈 목록은 실패 표를 만들지 않는다", () => {
  assert.match(createReport([{ reason: null }]), /검사 1곳, 정상 1곳, 실패 0곳/);
  assert.match(createReport([]), /검사 0곳, 정상 0곳, 실패 0곳/);
  assert.ok(!createReport([]).includes("| id |"));
});

test("실패 주소만 5초 뒤 한 번 재시도하고 최종 결과로 판정한다", async () => {
  const calls = {};
  const waits = [];
  const sites = ["ok", "recovered", "failed"].map((id) => ({ id }));
  const results = await checkSites(sites, {
    request: async (site) => {
      calls[site.id] = (calls[site.id] || 0) + 1;
      return { ...site, reason: site.id === "failed" || (site.id === "recovered" && calls[site.id] === 1) ? "HTTP 500" : null };
    },
    wait: async (ms) => waits.push(ms),
  });
  assert.deepEqual(calls, { ok: 1, recovered: 2, failed: 2 });
  assert.deepEqual(waits, [5000, 5000]);
  assert.deepEqual(results.map(({ reason }) => reason), [null, null, "HTTP 500"]);
});

test("동시 요청은 8개 이하이고 보고서 순서는 원본과 같다", async () => {
  let active = 0;
  let maximum = 0;
  const sites = Array.from({ length: 20 }, (_, id) => ({ id }));
  const results = await checkSites(sites, {
    request: async (site) => {
      maximum = Math.max(maximum, ++active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return { ...site, reason: null };
    },
  });
  assert.equal(maximum, 8);
  assert.deepEqual(results.map(({ id }) => id), sites.map(({ id }) => id));
});

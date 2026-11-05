const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { classifyResult, createReport, checkSites, updateState, loadState, failureDays } = require("../scripts/check-links");

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

test("중간 인증서가 빠진 서버는 브라우저가 열므로 접속 실패로 알리지 않는다", () => {
  const error = { message: "fetch failed", cause: { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" } };
  assert.equal(classifyResult({ error }), null);
  assert.equal(classifyResult({ error: { message: "fetch failed", cause: { code: "CERT_HAS_EXPIRED" } } }), "연결 실패: CERT_HAS_EXPIRED");
});

test("보고서는 실패 항목만 담고 표 안의 특수문자를 이스케이프한다", () => {
  const results = [
    { id: "ok", name: "로그인 페이지", url: "https://example.org/login", reason: null },
    { id: "bad", name: "이름|<태그>\n다음", url: "https://example.org/?a=1&b=2", reason: "HTTP 404" },
  ];
  const report = createReport(results, updateState(results, {}, "2026-11-04"));
  assert.ok(report.startsWith("해외 러너에서는"));
  assert.match(report, /검사 2곳, 정상 1곳, 실패 1곳/);
  assert.match(report, /\| bad \| 이름&#124;&lt;태그&gt; 다음 \| https:\/\/example.org\/\?a=1&amp;b=2 \| HTTP 404 \| 2026-11-04 \| 1일 \|/);
  assert.ok(!report.includes("로그인 페이지"));
  assert.equal(results[1].name, "이름|<태그>\n다음");
});

test("정상 보고서와 빈 목록은 실패 표를 만들지 않는다", () => {
  assert.match(createReport([{ reason: null }], { review: [], observing: [] }), /검사 1곳, 정상 1곳, 실패 0곳/);
  assert.match(createReport([], { review: [], observing: [] }), /검사 0곳, 정상 0곳, 실패 0곳/);
  assert.ok(!createReport([], { review: [], observing: [] }).includes("| id |"));
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


test("첫 실패는 관찰 중으로 기록하고 입력 상태를 바꾸지 않는다", () => {
  const previous = { recovered: "2026-11-01" };
  const result = updateState([{ id: "new", reason: "HTTP 500" }], previous, "2026-11-04");
  assert.deepEqual(result.state, { new: "2026-11-04" });
  assert.equal(result.review.length, 0);
  assert.equal(result.observing[0].firstFailed, "2026-11-04");
  assert.equal(result.observing[0].days, 1);
  assert.deepEqual(previous, { recovered: "2026-11-01" });
});

test("다음 UTC 날짜에도 실패하면 최초 발견일을 유지하고 지속 2일로 분류한다", () => {
  const result = updateState([{ id: "bad", reason: "HTTP 404" }], { bad: "2026-11-03" }, "2026-11-04");
  assert.deepEqual(result.state, { bad: "2026-11-03" });
  assert.equal(result.review[0].days, 2);
  assert.equal(result.observing.length, 0);
  const report = createReport([{ id: "bad", reason: "HTTP 404" }], result);
  assert.match(report, /수정 검토 대상 1곳, 관찰 중 0곳/);
  assert.match(report, /날짜는 UTC 기준/);
  assert.match(report, /최초 발견일 \| 지속 일수/);
  assert.match(report, /2026-11-03 \| 2일/);
});

test("같은 UTC 날짜에 두 번 실패해도 관찰 중이고 다음 날부터 수정 검토 대상이다", () => {
  const results = [{ id: "bad", reason: "HTTP 500" }];
  const first = updateState(results, {}, "2026-11-04");
  const second = updateState(results, first.state, "2026-11-04");
  assert.equal(second.review.length, 0);
  assert.equal(second.observing.length, 1);
  assert.equal(second.observing[0].days, 1);
  assert.equal(second.observing[0].firstFailed, "2026-11-04");
  const third = updateState(results, second.state, "2026-11-04");
  assert.equal(third.review.length, 0);
  assert.equal(third.observing.length, 1);
  const nextDay = updateState(results, third.state, "2026-11-05");
  assert.equal(nextDay.review.length, 1);
  assert.equal(nextDay.review[0].days, 2);
  assert.equal(nextDay.review[0].firstFailed, "2026-11-04");
  assert.equal(nextDay.observing.length, 0);
});

test("복구와 삭제된 서비스는 상태에서 빠지고 다시 실패하면 새로 관찰한다", () => {
  const recovered = updateState([{ id: "ok", reason: null }], { ok: "2026-11-02", removed: "2026-11-01" }, "2026-11-04");
  assert.deepEqual(recovered.state, {});
  const failedAgain = updateState([{ id: "ok", reason: "HTTP 500" }], recovered.state, "2026-11-05");
  assert.equal(failedAgain.review.length, 0);
  assert.equal(failedAgain.observing[0].firstFailed, "2026-11-05");
  assert.equal(failedAgain.observing[0].days, 1);
});

test("UTC 지속 일수는 첫날과 월말, 연말, 윤년 경계를 포함한다", () => {
  assert.equal(failureDays("2026-11-04", "2026-11-04"), 1);
  assert.equal(failureDays("2026-11-03", "2026-11-04"), 2);
  assert.equal(failureDays("2026-10-31", "2026-11-02"), 3);
  assert.equal(failureDays("2025-12-31", "2026-01-01"), 2);
  assert.equal(failureDays("2024-02-28", "2024-03-01"), 3);
});

test("상태 파일이 없거나 깨졌으면 빈 상태로 시작한다", (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "linkcheck-state-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, "state.json");
  assert.deepEqual(loadState(file), {});
  assert.deepEqual(loadState(), {});
  for (const content of ["broken", "null", "[]", '"text"', '{"bad":42}', '{"bad":"2026-02-30"}']) {
    fs.writeFileSync(file, content);
    assert.deepEqual(loadState(file), {});
  }
  fs.writeFileSync(file, '{"bad":"2026-11-03"}');
  assert.deepEqual(loadState(file), { bad: "2026-11-03" });
});

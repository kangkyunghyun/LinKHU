const fs = require("node:fs");
const { setTimeout: delay } = require("node:timers/promises");
const { loadSiteList } = require("./validate-data");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// HTTP 오류 전부를 장애로 보지 않는다. 로그인과 봇 차단 응답은 점검 대상에서 뺀다.
function classifyResult({ status, error }) {
  if (error) {
    // 중간 인증서를 보내지 않는 서버. 브라우저는 중간 인증서를 스스로 받아 열고 Node만 실패한다.
    if ((error.cause?.code || error.code) === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") return null;
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return "시간 초과 (20초)";
    }
    return `연결 실패: ${error.cause?.code || error.code || error.message}`;
  }
  if (status === 404 || status === 410 || (status >= 500 && status <= 599)) {
    return `HTTP ${status}`;
  }
  return null;
}

function escapeCell(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/\|/g, "&#124;").replace(/[\r\n]+/g, " ");
}

function failureDays(firstFailed, today) {
  return Math.floor((Date.parse(today) - Date.parse(firstFailed)) / 86_400_000) + 1;
}

function updateState(results, previousState, today) {
  const state = Object.fromEntries(results.filter(({ reason }) => reason).map(({ id }) => [
    id, Object.hasOwn(previousState, id) ? previousState[id] : today,
  ]));
  const review = [];
  const observing = [];
  results.filter(({ reason }) => reason).forEach((result) => {
    const entry = { ...result, firstFailed: state[result.id], days: failureDays(state[result.id], today) };
    (entry.days >= 2 ? review : observing).push(entry);
  });
  return { state, review, observing };
}

function loadState(file) {
  if (!file) return {};
  try {
    const state = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!state || Array.isArray(state) || typeof state !== "object" ||
      !Object.values(state).every((date) => typeof date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(date) &&
        Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date)) {
      return {};
    }
    return state;
  } catch {
    return {};
  }
}

function createReport(results, { review, observing }) {
  const failures = review.length + observing.length;
  const lines = [
    "해외 러너에서는 교내망 전용 또는 해외 접속 차단 사이트가 오탐될 수 있습니다. 주소 교체 전에 직접 확인해주세요.",
    "", "## 지원 서비스 접속 검사", "",
    `검사 ${results.length}곳, 정상 ${results.length - failures}곳, 실패 ${failures}곳`,
    `수정 검토 대상 ${review.length}곳, 관찰 중 ${observing.length}곳`,
    "", "실패 목록은 점검 후보이며 주소 교체는 사람이 판단합니다.", "",
  ];
  for (const [heading, entries] of [
    ["수정 검토 대상(하루 넘게 실패)", review],
    ["관찰 중(오늘 처음 실패)", observing],
  ]) {
    lines.push(`### ${heading}`, "", "날짜는 UTC 기준", "");
    if (entries.length) {
      lines.push("| id | 이름 | 주소 | 사유 | 최초 발견일 | 지속 일수 |", "| --- | --- | --- | --- | --- | --- |");
      entries.forEach(({ id, name, url, reason, firstFailed, days }) => {
        lines.push(`| ${[id, name, url, reason, firstFailed, `${days}일`].map(escapeCell).join(" | ")} |`);
      });
    } else {
      lines.push("없음");
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

async function requestSite(site) {
  try {
    const response = await fetch(site.url, {
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
      headers: { "User-Agent": USER_AGENT },
    });
    // 상태 코드만 사용한다. 본문 다운로드를 중단해 연결 자원을 반환한다.
    const reason = classifyResult({ status: response.status });
    await response.body?.cancel();
    return { ...site, reason };
  } catch (error) {
    return { ...site, reason: classifyResult({ error }) };
  }
}

async function checkSites(sites, { request = requestSite, wait = delay } = {}) {
  const results = new Array(sites.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, sites.length) }, async () => {
    while (next < sites.length) {
      const index = next++;
      let result = await request(sites[index]);
      if (result.reason) {
        await wait(5_000);
        result = await request(sites[index]);
      }
      results[index] = result;
    }
  }));
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    if (!["--report", "--state"].includes(flag) || !args[index + 1] ||
      args[index + 1].startsWith("--") || Object.hasOwn(options, flag)) {
      throw new Error("사용법: node scripts/check-links.js [--report <파일>] [--state <파일>]");
    }
    options[flag] = args[index + 1];
  }
  const previousState = loadState(options["--state"]);
  const today = new Date().toISOString().slice(0, 10);
  const results = await checkSites(loadSiteList());
  const assessment = updateState(results, previousState, today);
  const report = createReport(results, assessment);
  if (options["--report"]) fs.writeFileSync(options["--report"], report);
  if (options["--state"]) fs.writeFileSync(options["--state"], `${JSON.stringify(assessment.state, null, 2)}\n`);
  console.log(report);
  process.exitCode = assessment.review.length ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`접속 검사 실행 오류: ${error.message}`);
    process.exitCode = 2;
  });
}

module.exports = { classifyResult, createReport, checkSites, updateState, loadState, failureDays };

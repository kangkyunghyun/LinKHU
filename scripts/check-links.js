const fs = require("node:fs");
const { setTimeout: delay } = require("node:timers/promises");
const { loadSiteList } = require("./validate-data");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

// HTTP 오류 전부를 장애로 보지 않는다. 로그인과 봇 차단 응답은 점검 대상에서 뺀다.
function classifyResult({ status, error }) {
  if (error) {
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

function createReport(results) {
  const failures = results.filter((result) => result.reason);
  const lines = [
    "해외 러너에서는 교내망 전용 또는 해외 접속 차단 사이트가 오탐될 수 있습니다. 주소 교체 전에 직접 확인해주세요.",
    "", "## 지원 서비스 접속 검사", "",
    `검사 ${results.length}곳, 정상 ${results.length - failures.length}곳, 실패 ${failures.length}곳`,
    "", "실패 목록은 점검 후보이며 주소 교체는 사람이 판단합니다.", "",
  ];
  if (failures.length) {
    lines.push("| id | 이름 | 주소 | 사유 |", "| --- | --- | --- | --- |");
    failures.forEach(({ id, name, url, reason }) => {
      lines.push(`| ${[id, name, url, reason].map(escapeCell).join(" | ")} |`);
    });
  } else {
    lines.push("모든 지원 서비스가 정상 응답했습니다.");
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
  if (args.length && (args.length !== 2 || args[0] !== "--report" || !args[1])) {
    throw new Error("사용법: node scripts/check-links.js [--report <파일>]");
  }
  const results = await checkSites(loadSiteList());
  const report = createReport(results);
  if (args.length) fs.writeFileSync(args[1], report);
  console.log(report);
  process.exitCode = results.some((result) => result.reason) ? 1 : 0;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`접속 검사 실행 오류: ${error.message}`);
    process.exitCode = 2;
  });
}

module.exports = { classifyResult, createReport, checkSites };

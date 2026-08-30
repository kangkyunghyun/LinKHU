// 팝업(popup.js)과 설정(options.js)이 함께 쓰는 검색/설정 유틸.
// 랜딩 페이지(docs/landing.js)는 파일을 공유할 수 없으므로,
// 검색 정규화 규칙을 바꿀 때는 docs/landing.js와 동작을 맞춘다.
const LinKHUShared = {
  normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("ko-KR")
      .replace(/\s+/g, "");
  },

  // 점수가 낮을수록 상위 노출. 랜딩 페이지(docs/landing.js)의 scoreService와
  // 같은 규칙을 유지해야 팝업과 랜딩의 검색 결과 순서가 일치한다.
  scoreSite(site, normalizedQuery) {
    const name = this.normalize(site.name);
    const id = this.normalize(site.id);
    const category = this.normalize(site.category);

    if (name.startsWith(normalizedQuery)) return 0;
    if (name.includes(normalizedQuery)) return 1;
    if (id.startsWith(normalizedQuery)) return 2;
    if (id.includes(normalizedQuery)) return 3;
    if (category.includes(normalizedQuery)) return 4;
    return Number.POSITIVE_INFINITY;
  },

  rankSites(sites, query) {
    const normalizedQuery = this.normalize(query);
    if (!normalizedQuery) return [];

    return sites
      .map((site, index) => ({
        site,
        index,
        score: this.scoreSite(site, normalizedQuery),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((left, right) => left.score - right.score || left.index - right.index)
      .map(({ site }) => site);
  },

  // data.js의 imgSrc는 라이트 경로 하나만 갖는다. 다크 경로는 규칙으로 만든다.
  // 두 벌을 데이터에 중복해 적으면 추가할 때마다 어긋날 자리가 하나 늘어난다.
  iconSrc(imgSrc, theme) {
    if (theme !== "dark") return imgSrc;
    return String(imgSrc).replace(/^images\//, "images/dark/");
  },

  // 팝업 카드 이름의 줄바꿈 지점. id → 첫 줄 문자열이다.
  // 카드 한 줄에 들어가는 것은 한글 6자다(폭 근거는 스펙 §3-2-7). 공백이 없는 긴 이름은
  // word-break: keep-all이 꺾을 자리를 못 찾아 overflow-wrap: anywhere로 넘어가고,
  // 그러면 글자 사이 아무 데서나 꺾인다("글로벌교육지 / 원팀"). 어디서 꺾을지를 여기 적는다.
  // 데이터가 아니라 카드 폭에 딸린 표현 문제라 src/data.js가 아니라 여기에 둔다.
  CARD_LINE_BREAKS: {
    swedu: "SW중심대학",
    isss: "글로벌교육",
    healthsc: "건강센터",
    health: "건강센터",
    counsell: "심리상담",
    counsel: "심리상담",
    abeek: "공학교육",
    eip: "대학혁신",
    cce: "글로벌미래",
    crhs: "인류사회",
    cominv: "국제통상",
    swcon: "소프트웨어",
    dc: "디지털",
    khusc: "지구사회",
    khctl: "교수학습",
    khao: "우주과학",
    rule: "규정관리",
    iga: "국제지역",
  },

  // 두 줄(6자 × 2)에 아예 들어가지 않는 이름이다. 의미 단위로 꺾으면 둘째 줄이
  // 말줄임돼 오히려 글자가 사라지므로 꺾지 않고 현재 동작(글자는 모두 보임)을 유지한다.
  // 모르고 빠진 것이 아님을 남기려고 명시한다. scripts/validate-data.js가 이 목록을 읽는다.
  WIDE_CARD_NAMES: ["display", "deptofenglish", "globaleng"],

  // 표에 있으면 첫 줄 뒤에 ZWSP를 넣어 그 지점에서 꺾이게 한다.
  // 표의 첫 줄이 실제 이름의 접두사가 아니면 표가 잘못된 것이므로 원본을 그대로 돌려
  // 조용히 깨진 이름을 만들지 않는다. 그 어긋남은 scripts/validate-data.js가 실패시킨다.
  cardDisplayName(site) {
    const firstLine = this.CARD_LINE_BREAKS[site.id];
    if (!firstLine || !String(site.name).startsWith(firstLine)) return site.name;
    return `${firstLine}\u200B${String(site.name).slice(firstLine.length)}`;
  },

  // 설정을 저장한 적 없는 사용자에게 처음 보여줄 목록이다.
  // 예전에는 카테고리 하나(`공통`)가 곧 기본 목록이었지만, 그 카테고리가 커지면서
  // 처음 설치한 사용자가 대부분을 직접 빼야 하는 상태가 됐다. 그래서 기본 목록을
  // 카테고리와 분리해 여기서 명시한다. 데이터(src/data.js)는 5필드 스키마를
  // 유지해야 하므로(스펙 §4-1) 항목별 표시가 아니라 코드 상수로 둔다.
  DEFAULT_SITE_IDS: [
    "info21",
    "ecampus",
    "everytime",
    "notice",
    "library",
    "scholarship",
    "intern",
    "sugang",
    "chatkhu",
    "ois",
  ],

  // 설정 페이지 왼쪽 목록과 같은 기준으로 정렬해 두 화면의 순서 감각을 맞춘다.
  // siteList에 없는 id는 조용히 빠진다. 서비스가 삭제돼도 깨진 항목을 만들지 않는다.
  getDefaultOrder(siteList) {
    return siteList
      .filter((site) => this.DEFAULT_SITE_IDS.includes(site.id))
      .sort((left, right) => left.name.localeCompare(right.name, "ko-KR"))
      .map((site) => site.id);
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = LinKHUShared;
}

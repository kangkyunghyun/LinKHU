// 팝업(popup.js)과 설정(options.js)이 함께 쓰는 검색/설정 유틸.
// 랜딩 페이지(docs/landing.js)는 파일을 공유할 수 없으므로,
// 검색 정규화 규칙을 바꿀 때는 docs/landing.js와 동작을 맞춘다.
const LinKHUShared = {
  normalize(value) {
    return String(value || "")
      .toLocaleLowerCase("ko-KR")
      .replace(/\s+/g, "");
  },

  matchesSearch(site, normalizedQuery) {
    return [site.name, site.id, site.category].some((value) =>
      this.normalize(value).includes(normalizedQuery),
    );
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

  getDefaultOrder(siteList) {
    return siteList
      .filter((site) => site.category === "공통")
      .map((site) => site.id);
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = LinKHUShared;
}

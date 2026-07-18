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

  getDefaultOrder(siteList) {
    return siteList
      .filter((site) => site.category === "공통")
      .map((site) => site.id);
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = LinKHUShared;
}

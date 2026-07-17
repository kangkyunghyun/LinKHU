(function initializeLandingSearchModule(globalScope) {
  const DEFAULT_SERVICE_IDS = ["info21", "ecampus", "sugang"];
  const RESULT_LIMIT = 5;

  function normalizeSearchText(value) {
    return String(value || "")
      .trim()
      .toLocaleLowerCase("ko-KR")
      .replace(/\s+/g, "");
  }

  function scoreService(service, normalizedQuery) {
    const normalizedName = normalizeSearchText(service.name);
    const normalizedId = normalizeSearchText(service.id);
    const normalizedCategory = normalizeSearchText(service.category);

    if (normalizedName.startsWith(normalizedQuery)) return 0;
    if (normalizedName.includes(normalizedQuery)) return 1;
    if (normalizedId.startsWith(normalizedQuery)) return 2;
    if (normalizedId.includes(normalizedQuery)) return 3;
    if (normalizedCategory.includes(normalizedQuery)) return 4;
    return Number.POSITIVE_INFINITY;
  }

  function searchServices(services, query, limit = RESULT_LIMIT) {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return [];

    return services
      .map((service, index) => ({
        service,
        index,
        score: scoreService(service, normalizedQuery),
      }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((left, right) => left.score - right.score || left.index - right.index)
      .slice(0, limit)
      .map(({ service }) => service);
  }

  function getDefaultServices(services) {
    return DEFAULT_SERVICE_IDS.map((id) =>
      services.find((service) => service.id === id),
    ).filter(Boolean);
  }

  function createResultItem(documentObject, service) {
    const item = documentObject.createElement("li");
    const link = documentObject.createElement("a");
    const mark = documentObject.createElement("span");
    const copy = documentObject.createElement("span");
    const name = documentObject.createElement("strong");
    const metadata = documentObject.createElement("small");

    link.className = "search-result";
    link.href = service.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${service.name}, ${service.category}, 새 창에서 열기`);

    mark.className = "result-mark";
    mark.textContent = [...service.name][0] || "L";
    mark.setAttribute("aria-hidden", "true");

    name.textContent = service.name;
    metadata.textContent = `${service.category} · ${service.id}`;
    copy.append(name, metadata);

    link.insertAdjacentHTML(
      "beforeend",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    );
    link.prepend(mark, copy);
    item.append(link);

    return item;
  }

  function initializeLandingSearch(documentObject, fetchFunction) {
    const demo = documentObject.querySelector("#landing-search-demo");
    const form = documentObject.querySelector("#landing-search-form");
    const input = documentObject.querySelector("#landing-service-search");
    const status = documentObject.querySelector("#landing-search-status");
    const results = documentObject.querySelector("#landing-search-results");

    if (!demo || !form || !input || !status || !results) return;

    let services = [];

    function renderServices(matchedServices, message) {
      results.replaceChildren();
      status.textContent = message;

      if (matchedServices.length === 0) {
        const emptyItem = documentObject.createElement("li");
        emptyItem.className = "search-empty";
        emptyItem.textContent = "검색 결과가 없습니다. 다른 이름이나 카테고리로 찾아보세요.";
        results.append(emptyItem);
        return;
      }

      results.append(
        ...matchedServices.map((service) =>
          createResultItem(documentObject, service),
        ),
      );
    }

    function renderForQuery() {
      const query = input.value;
      if (!normalizeSearchText(query)) {
        const defaultServices = getDefaultServices(services);
        renderServices(defaultServices, `자주 찾는 서비스 ${defaultServices.length}개`);
        return;
      }

      const matchedServices = searchServices(services, query);
      renderServices(
        matchedServices,
        matchedServices.length > 0
          ? `“${query.trim()}” 검색 결과 ${matchedServices.length}개`
          : `“${query.trim()}” 검색 결과 없음`,
      );
    }

    function getResultLinks() {
      return [...results.querySelectorAll(".search-result")];
    }

    input.addEventListener("input", renderForQuery);
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        const [firstResult] = getResultLinks();
        if (firstResult) {
          event.preventDefault();
          firstResult.focus();
        }
      } else if (event.key === "Escape") {
        input.value = "";
        renderForQuery();
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const [firstResult] = getResultLinks();
      if (firstResult) firstResult.click();
    });

    results.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;

      const resultLinks = getResultLinks();
      const currentIndex = resultLinks.indexOf(documentObject.activeElement);

      event.preventDefault();
      if (event.key === "Escape") {
        input.focus();
        return;
      }

      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex =
        (currentIndex + direction + resultLinks.length) % resultLinks.length;
      resultLinks[nextIndex]?.focus();
    });

    documentObject.addEventListener("keydown", (event) => {
      const activeElement = documentObject.activeElement;
      const isTyping =
        activeElement instanceof globalScope.HTMLInputElement ||
        activeElement instanceof globalScope.HTMLTextAreaElement ||
        activeElement?.isContentEditable;

      if (event.key === "/" && !isTyping && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        input.focus();
      }
    });

    fetchFunction("assets/services.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((loadedServices) => {
        services = Array.isArray(loadedServices) ? loadedServices : [];
        demo.setAttribute("aria-busy", "false");
        renderForQuery();
      })
      .catch(() => {
        demo.setAttribute("aria-busy", "false");
        status.textContent = "서비스 목록을 불러오지 못했습니다.";
        results.replaceChildren();
        const error = documentObject.createElement("li");
        error.className = "search-error";
        error.textContent = "페이지를 새로고침한 뒤 다시 시도해주세요.";
        results.append(error);
      });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      getDefaultServices,
      normalizeSearchText,
      scoreService,
      searchServices,
    };
  }

  if (globalScope.document && globalScope.fetch) {
    initializeLandingSearch(globalScope.document, globalScope.fetch.bind(globalScope));
  }
})(typeof window !== "undefined" ? window : globalThis);

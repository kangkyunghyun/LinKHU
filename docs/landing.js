(function initializeLandingSearchModule(globalScope) {
  const DEFAULT_SERVICE_IDS = ["info21", "ecampus", "sugang"];
  const RESULT_LIMIT = 5;

  // 확장(src/feedback.js)과 같은 Google Form을 사용한다. 값을 바꿀 때는 함께 갱신한다.
  const FEEDBACK_CONFIG = {
    formUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSei30Rr122YHmLlixTDEaWtUPY_pM-EQ20kBMLvyu-52Q6IZQ/formResponse",
    messageEntry: "entry.1096769292",
    emailEntry: "entry.491031779",
  };

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
    mark.setAttribute("aria-hidden", "true");

    function showFallbackMark() {
      mark.classList.remove("has-icon");
      mark.textContent = [...service.name][0] || "L";
    }

    if (service.imgSrc) {
      // 랜딩은 확장과 달리 저장된 테마 모드가 없고 prefers-color-scheme만 따른다.
      // picture/source에 맡기면 브라우저가 그리기 전에 고르므로 깜빡임이 없고
      // OS 설정이 바뀌어도 별도 구독 없이 따라간다.
      const picture = documentObject.createElement("picture");
      const darkSource = documentObject.createElement("source");
      const icon = documentObject.createElement("img");

      darkSource.media = "(prefers-color-scheme: dark)";
      darkSource.srcset = `assets/${service.imgSrc.replace(/^images\//, "images/dark/")}`;
      icon.src = `assets/${service.imgSrc}`;
      icon.alt = "";
      icon.loading = "lazy";
      icon.addEventListener("error", showFallbackMark);

      picture.append(darkSource, icon);
      mark.classList.add("has-icon");
      mark.append(picture);
    } else {
      showFallbackMark();
    }

    name.textContent = service.name;
    metadata.textContent = `${service.category} · ${service.id}`;
    copy.append(name, metadata);

    link.insertAdjacentHTML(
      "beforeend",
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><g transform="scale(1.33333)"><polyline points="6.5 2.75 12.75 9 6.5 15.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"></polyline></g></svg>',
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

  function createFeedbackSubmission(message, email, config = FEEDBACK_CONFIG) {
    const body = new URLSearchParams({ [config.messageEntry]: message });
    if (email && config.emailEntry) {
      body.set(config.emailEntry, email);
    }
    return { url: config.formUrl, body };
  }

  function initializeLandingFeedback(documentObject, fetchFunction) {
    const toggles = documentObject.querySelectorAll("[data-feedback-open]");
    const panel = documentObject.querySelector("#landing-feedback-panel");
    const closeBtn = documentObject.querySelector("#landing-feedback-close");
    const messageInput = documentObject.querySelector("#landing-feedback-message");
    const emailInput = documentObject.querySelector("#landing-feedback-email");
    const sendBtn = documentObject.querySelector("#landing-feedback-send");
    const status = documentObject.querySelector("#landing-feedback-status");

    if (!toggles.length || !panel || !messageInput || !emailInput || !sendBtn || !status) {
      return;
    }

    toggles.forEach((toggle) => {
      toggle.addEventListener("click", () => {
        panel.showModal();
        messageInput.focus();
      });
    });

    closeBtn?.addEventListener("click", () => panel.close());

    sendBtn.addEventListener("click", async () => {
      const message = messageInput.value.trim();
      if (!message) {
        status.textContent = "문의 내용을 입력해주세요.";
        return;
      }

      const email = emailInput.value.trim();
      if (email && !email.includes("@")) {
        status.textContent = "이메일 주소를 확인해주세요.";
        return;
      }

      sendBtn.disabled = true;
      status.textContent = "전송 중...";

      try {
        // Google Forms는 CORS 응답 헤더를 주지 않으므로 no-cors로 보내고,
        // 네트워크 오류가 없으면 전송된 것으로 간주한다.
        const { url, body } = createFeedbackSubmission(message, email);
        await fetchFunction(url, { method: "POST", mode: "no-cors", body });
        messageInput.value = "";
        status.textContent = "전송했습니다. 소중한 의견 감사합니다!";
      } catch (error) {
        status.textContent = "전송에 실패했습니다. GitHub 이슈로 남겨주세요.";
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      createFeedbackSubmission,
      getDefaultServices,
      normalizeSearchText,
      scoreService,
      searchServices,
    };
  }

  if (globalScope.document && globalScope.fetch) {
    initializeLandingSearch(globalScope.document, globalScope.fetch.bind(globalScope));
    initializeLandingFeedback(globalScope.document, globalScope.fetch.bind(globalScope));
  }
})(typeof window !== "undefined" ? window : globalThis);

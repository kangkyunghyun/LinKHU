(function initializeLandingSearchModule(globalScope) {
  const DEFAULT_SERVICE_IDS = ["info21", "ecampus", "sugang"];
  const RESULT_LIMIT = 5;

  // 모바일에서 PC로 옮길 주소. QR 이미지(assets/pc-install-qr.png)는
  // utm_source=qr을 붙인 같은 주소를 가리킨다.
  const PC_INSTALL_URL = "https://kangkyunghyun.github.io/LinKHU/";

  // 확장(src/feedback.js)과 같은 Google Form을 사용한다. 값을 바꿀 때는 함께 갱신한다.
  const FEEDBACK_CONFIG = {
    formUrl:
      "https://docs.google.com/forms/d/e/1FAIpQLSei30Rr122YHmLlixTDEaWtUPY_pM-EQ20kBMLvyu-52Q6IZQ/formResponse",
    messageEntry: "entry.1096769292",
    emailEntry: "entry.491031779",
  };

  // src/shared.js의 normalize와 같은 규칙을 유지한다.
  function normalizeSearchText(value) {
    return String(value || "")
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

  const RELEASES_API_URL =
    "https://api.github.com/repos/kangkyunghyun/LinKHU/releases";
  // 탭 세션마다 한 번만 부른다. 자세한 이유는 스펙 3-3-18.
  const RELEASES_CACHE_KEY = "linkhu-releases";
  // 최신 하나만 펼쳐 둔다. 나머지는 제목 줄만 보이고 눌러서 편다.
  const RELEASES_OPEN_COUNT = 1;
  // 최근 다섯 개만 그린다. 접어도 열여덟 줄이면 소개 흐름을 끊는다.
  // 잘린 나머지는 섹션 아래 "GitHub에서 전체 릴리스 보기"가 받는다.
  const RELEASES_SHOW_COUNT = 5;

  // scripts/publish-firefox.js의 stripInternalSection과 같은 규칙이다. Node 스크립트와
  // 브라우저라 파일을 공유할 수 없어 두 벌로 둔다(검색 랭킹과 같은 이유, 스펙 3-1).
  // 한쪽을 고치면 다른 쪽도 고친다 — tests/landing-releases.test.js가 실제
  // release-notes/*.md로 두 구현의 결과가 같은지 검사한다.
  function stripInternalSection(releaseNotes) {
    const kept = [];
    let skipping = false;

    String(releaseNotes)
      .split("\n")
      .forEach((line) => {
        // 다음 헤딩을 만나면 다시 살린다. Internal이 마지막 섹션이 아닐 수도 있다.
        if (line.startsWith("### ")) skipping = line.trim() === "### Internal";
        if (!skipping) kept.push(line);
      });

    return `${kept.join("\n").trimEnd()}\n`;
  }

  // 릴리스 노트가 쓰는 문법은 셋뿐이다 — "### 제목", "- 불릿", "`코드`".
  // 마크다운 파서를 넣지 않는 이유는 스펙 3-3-1(의존성 없음)이다. 그래서 이 셋만
  // 블록으로 나누고, 그 밖의 줄은 문단으로 그대로 보여준다. 문법이 늘면 여기를 고친다.
  function parseReleaseBody(body) {
    const blocks = [];

    stripInternalSection(body)
      .split("\n")
      .forEach((rawLine) => {
        const line = rawLine.trim();
        if (!line) return;

        if (line.startsWith("### ")) {
          blocks.push({ type: "heading", text: line.slice(4).trim() });
          return;
        }

        if (line.startsWith("- ")) {
          const item = line.slice(2).trim();
          const last = blocks[blocks.length - 1];
          if (last && last.type === "list") last.items.push(item);
          else blocks.push({ type: "list", items: [item] });
          return;
        }

        blocks.push({ type: "paragraph", text: line });
      });

    return blocks;
  }

  // 본문은 GitHub API 응답이라 신뢰 경계 밖이다. innerHTML을 쓰지 않고 텍스트 노드로만
  // 붙여, 릴리스 본문에 마크업이 들어와도 글자로 보이게 한다.
  function appendInlineText(documentObject, parent, text) {
    const pieces = String(text).split("`");

    pieces.forEach((piece, index) => {
      // 홀수 자리가 백틱 사이다. 다만 마지막 조각이면 닫는 백틱이 없었다는 뜻이라
      // 코드로 보지 않고 백틱까지 글자로 되돌린다.
      const isCode = index % 2 === 1 && index < pieces.length - 1;

      if (isCode) {
        const code = documentObject.createElement("code");
        code.textContent = piece;
        parent.append(code);
        return;
      }

      const plain = index % 2 === 1 ? `\`${piece}` : piece;
      if (plain) parent.append(documentObject.createTextNode(plain));
    });
  }

  function createReleaseBody(documentObject, body) {
    const wrapper = documentObject.createElement("div");
    wrapper.className = "release-body";

    parseReleaseBody(body).forEach((block) => {
      if (block.type === "heading") {
        const heading = documentObject.createElement("h4");
        heading.textContent = block.text;
        wrapper.append(heading);
        return;
      }

      if (block.type === "list") {
        const list = documentObject.createElement("ul");
        block.items.forEach((item) => {
          const listItem = documentObject.createElement("li");
          appendInlineText(documentObject, listItem, item);
          list.append(listItem);
        });
        wrapper.append(list);
        return;
      }

      const paragraph = documentObject.createElement("p");
      appendInlineText(documentObject, paragraph, block.text);
      wrapper.append(paragraph);
    });

    return wrapper;
  }

  function formatReleaseDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
  }

  function createReleaseItem(documentObject, release, isOpen) {
    const item = documentObject.createElement("details");
    item.className = "release-item";
    if (isOpen) item.open = true;

    const summary = documentObject.createElement("summary");
    const name = documentObject.createElement("span");
    name.className = "release-name";
    name.textContent = release.tag_name || release.name || "";
    summary.append(name);

    const publishedAt = formatReleaseDate(release.published_at);
    if (publishedAt) {
      const date = documentObject.createElement("span");
      date.className = "release-date";
      date.textContent = publishedAt;
      summary.append(date);
    }

    item.append(summary, createReleaseBody(documentObject, release.body || ""));
    return item;
  }

  function readCachedReleases(storage) {
    try {
      const cached = storage?.getItem(RELEASES_CACHE_KEY);
      const parsed = cached ? JSON.parse(cached) : null;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      // 시크릿 모드나 저장소 차단 환경에서는 접근 자체가 던진다. 캐시가 없는 것으로 본다.
      return null;
    }
  }

  function writeCachedReleases(storage, releases) {
    try {
      storage?.setItem(RELEASES_CACHE_KEY, JSON.stringify(releases));
    } catch {
      // 캐시는 있으면 좋은 것이지 없으면 안 되는 것이 아니다.
    }
  }

  // 실패하면 섹션을 통째로 감춘다. 빈 상자를 남기면 "불러오는 중"인지 "없는 것"인지
  // 알 수 없다. 푸터의 GitHub 릴리스 링크가 대체 경로다.
  function initializeLandingReleases(documentObject, fetchFunction, storage) {
    const section = documentObject.querySelector("#releases");
    const list = documentObject.querySelector("#release-list");
    if (!section || !list) return Promise.resolve();

    function render(releases) {
      const published = releases.filter((release) => !release.draft);
      if (published.length === 0) throw new Error("released nothing");

      list.replaceChildren(
        ...published
          .slice(0, RELEASES_SHOW_COUNT)
          .map((release, index) =>
            createReleaseItem(documentObject, release, index < RELEASES_OPEN_COUNT),
          ),
      );
      section.hidden = false;
      section.setAttribute("aria-busy", "false");
    }

    const cached = readCachedReleases(storage);
    if (cached) {
      try {
        render(cached);
        return Promise.resolve();
      } catch {
        // 캐시가 깨졌으면 그냥 다시 받는다.
      }
    }

    return fetchFunction(RELEASES_API_URL, {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((releases) => {
        if (!Array.isArray(releases)) throw new Error("unexpected payload");
        render(releases);
        writeCachedReleases(storage, releases);
      })
      .catch(() => {
        section.hidden = true;
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

  // 확장을 설치할 수 없는 환경만 걸러낸다. 태블릿(iPad)도 확장 설치가 안 되므로 포함한다.
  function isMobileUserAgent(userAgent, maxTouchPoints = 0) {
    const value = String(userAgent || "");
    if (/Android|iPhone|iPad|iPod|Windows Phone/i.test(value)) return true;
    // iPadOS 13+ 사파리는 데스크톱과 같은 Macintosh UA를 보낸다.
    // 화면 크기로는 갈리지 않고 터치 지원 여부로만 구분된다.
    return /Macintosh/i.test(value) && Number(maxTouchPoints) > 1;
  }

  // index.html의 gtag는 async 로드라 아직 없을 수 있고, 로컬에서 열면 아예 없다.
  function sendLandingEvent(globalObject, eventName) {
    if (typeof globalObject.gtag === "function") globalObject.gtag("event", eventName);
  }

  function initializeMobileInstallGuide(documentObject, globalObject) {
    const guide = documentObject.querySelector("#mobile-install-guide");
    const copyButton = documentObject.querySelector("#mobile-install-copy");
    const qrToggle = documentObject.querySelector("#mobile-install-qr-toggle");
    const qr = documentObject.querySelector("#mobile-install-qr");
    const status = documentObject.querySelector("#mobile-install-status");

    if (!guide || !copyButton || !qrToggle || !qr || !status) return;
    const navigator = globalObject.navigator || {};
    if (!isMobileUserAgent(navigator.userAgent, navigator.maxTouchPoints)) return;

    guide.hidden = false;

    copyButton.addEventListener("click", async () => {
      // 클릭 자체가 PC 설치 의사이므로 복사 성공 여부와 무관하게 보낸다.
      sendLandingEvent(globalObject, "copy_pc_install_link");

      try {
        // 인앱 브라우저에는 Clipboard API가 없을 수 있다. 그때는 화면의 주소를 직접 복사하게 안내한다.
        await navigator.clipboard.writeText(PC_INSTALL_URL);
        status.textContent = "링크를 복사했습니다. PC 브라우저에 붙여넣으세요.";
      } catch (error) {
        status.textContent = "복사하지 못했습니다. 위 주소를 길게 눌러 복사해주세요.";
      }
    });

    qrToggle.addEventListener("click", () => {
      const willShow = qr.hidden;
      qr.hidden = !willShow;
      qrToggle.setAttribute("aria-expanded", String(willShow));
      qrToggle.textContent = willShow ? "QR 코드 숨기기" : "QR 코드 보기";
      if (willShow) sendLandingEvent(globalObject, "view_qr_code");
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      PC_INSTALL_URL,
      createFeedbackSubmission,
      getDefaultServices,
      isMobileUserAgent,
      normalizeSearchText,
      parseReleaseBody,
      scoreService,
      searchServices,
      stripInternalSection,
    };
  }

  if (globalScope.document && globalScope.fetch) {
    initializeLandingSearch(globalScope.document, globalScope.fetch.bind(globalScope));
    initializeLandingFeedback(globalScope.document, globalScope.fetch.bind(globalScope));
    initializeMobileInstallGuide(globalScope.document, globalScope);
    initializeLandingReleases(
      globalScope.document,
      globalScope.fetch.bind(globalScope),
      globalScope.sessionStorage,
    );
  }
})(typeof window !== "undefined" ? window : globalThis);

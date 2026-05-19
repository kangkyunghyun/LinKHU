/**
 * LinKHU - popup.js
 * 화면에 버튼을 그리고, 클릭 시 페이지를 이동시키는 로직
 */

const App = {
  searchQuery: "",
  currentItems: [],
  renderToken: 0,

  normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  },

  matchesSearch(item, query) {
    return [item.name, item.id, item.category]
      .some((value) => this.normalize(value).includes(query));
  },

  getUniqueSites(sites) {
    const seenIds = new Set();
    return sites.filter((site) => {
      if (seenIds.has(site.id)) return false;
      seenIds.add(site.id);
      return true;
    });
  },

  openInCurrentTab(item) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab?.id) {
        chrome.tabs.update(currentTab.id, { url: item.url });
      } else {
        chrome.tabs.create({ url: item.url, active: true });
      }
      window.close();
    });
  },

  // 1. [함수] 사이트 버튼(카드) 하나하나를 만드는 공장
  createCardItem(item) {
    const el = document.createElement("a");
    el.className = "grid-item"; // CSS 적용을 위한 클래스명
    el.href = item.url;

    // 이미지(로고) 생성
    const img = document.createElement("img");
    img.src = item.imgSrc;
    img.alt = item.name;
    img.draggable = false; // 이미지 자체 드래그 방지, a 태그의 링크 드래그 유도

    // 이미지 로드 실패 시: 엑스박스 대신 기본 아이콘 보여주기
    img.onerror = () => {
      img.src = "icons/icon48.png";
    };

    // 사이트 이름 생성
    const span = document.createElement("span");
    span.textContent = item.name;

    // 상자안에 이미지와 이름 넣기
    el.appendChild(img);
    el.appendChild(span);

    // 클릭 이벤트 처리
    el.addEventListener("click", (e) => {
      e.preventDefault(); // a 태그 기본 이동 방지
      const isBackground = e.ctrlKey || e.metaKey;
      chrome.tabs.create({ url: item.url, active: !isBackground });
      if (!isBackground) window.close();
    });

    // 휠클릭 이벤트 처리
    el.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        // [휠클릭] 새 탭을 백그라운드에서 열기
        e.preventDefault();
        chrome.tabs.create({ url: item.url, active: false });
      }
    });
    return el;
  },

  // 2. [함수] 저장된 데이터를 가져와서 화면에 쫙 뿌려주는 역할
  render() {
    const gridContainer = document.getElementById("grid-container");
    const emptyMessage = document.getElementById("empty-message");
    const renderToken = ++this.renderToken;
    gridContainer.innerHTML = ""; // 기존 내용 초기화

    // 성능 최적화용 가상 보관함 (한꺼번에 그리기 위해 사용)
    const fragment = document.createDocumentFragment();

    // 사용자가 설정한 순서 가져오기
    chrome.storage.local.get(["userOrder"], (result) => {
      if (renderToken !== this.renderToken) return;

      // 저장된 순서가 없으면 '공통' 카테고리 사이트들을 기본값으로 사용
      const order =
        result.userOrder ||
        MASTER_SITE_LIST.filter((s) => s.category === "공통").map((s) => s.id);

      const configuredSites = order
        .map((id) => MASTER_SITE_LIST.find((s) => s.id === id))
        .filter(Boolean);

      const query = this.normalize(this.searchQuery);
      const sourceSites = query ? MASTER_SITE_LIST : configuredSites;
      const displaySites = this.getUniqueSites(
        sourceSites.filter((site) => !query || this.matchesSearch(site, query)),
      );
      this.currentItems = displaySites;

      // 순서대로 사이트 데이터를 찾아 버튼 생성
      displaySites.forEach((siteData) => {
        const card = this.createCardItem(siteData);
        fragment.appendChild(card); // 가상 보관함에 차곡차곡 담기
      });

      if (emptyMessage) {
        emptyMessage.hidden = displaySites.length > 0;
      }

      // 보관함에 담긴 버튼들을 한 번에 실제 화면에 붙이기
      gridContainer.appendChild(fragment);
    });
  },
};

// [버전 관리] 확장 프로그램 버전 및 최신 릴리스 버전 확인 로직
const VersionManager = {
  // 현재 설치된 확장 프로그램의 버전을 가져옵니다.
  async getCurrentVersion() {
    const manifest = chrome.runtime.getManifest();
    return manifest.version;
  },

  // GitHub API를 사용하여 최신 릴리스 버전을 가져옵니다.
  // API Rate Limit를 고려하여 storage에 12시간 동안 캐싱합니다.
  async getLatestGithubReleaseVersion() {
    const CACHE_KEY = "latestReleaseVersion";
    const CACHE_TIME_KEY = "latestReleaseVersionTime";
    const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12시간

    const result = await chrome.storage.local.get([CACHE_KEY, CACHE_TIME_KEY]);
    const now = Date.now();
    const cachedVersion = result[CACHE_KEY];
    const cachedTime = result[CACHE_TIME_KEY];

    if (cachedVersion && cachedTime && (now - cachedTime < CACHE_DURATION_MS)) {
      return cachedVersion;
    }

    const repoOwner = "kangkyunghyun"; // GitHub 사용자 이름
    const repoName = "LinKHU";         // GitHub 저장소 이름
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error (${response.status}): ${errorText}`);
        return cachedVersion || null; // 에러 시 기존 캐시 반환
      }
      const data = await response.json();
      const version = data.tag_name ? data.tag_name.replace(/^v/, '') : null;
      
      if (version) {
        await chrome.storage.local.set({
          [CACHE_KEY]: version,
          [CACHE_TIME_KEY]: now
        });
      }
      return version;
    } catch (error) {
      console.error("최신 GitHub 릴리스 버전을 가져오는 중 오류 발생:", error);
      return cachedVersion || null;
    }
  },

  // 두 버전을 비교합니다. (예: "1.0.0" vs "1.1.0")
  // v1이 더 낮으면 -1, 같으면 0, v1이 더 높으면 1을 반환합니다.
  compareVersions(v1, v2) {
    const parts1 = (v1 || '0.0.0').split('.').map(Number);
    const parts2 = (v2 || '0.0.0').split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  },

  // 설치 환경(브라우저, 개발자모드 여부)에 따라 적절한 업데이트 링크를 반환합니다.
  async getUpdateLink() {
    let link = "https://github.com/kangkyunghyun/LinKHU/releases/latest";
    try {
      // 개발자 모드(unpacked) 여부 확인: 스토어 업데이트 URL이 없으면 개발 모드로 간주
      const isDevMode = !chrome.runtime.getManifest().update_url;

      // 개발자 모드(수동 설치)가 아니면 브라우저별 스토어 링크 제공
      if (!isDevMode) {
        const ua = navigator.userAgent;
        if (ua.includes("Whale")) {
          link = "https://store.whale.naver.com/detail/njhgalaophlilmhapklabocladclmhoc";
        } else if (ua.includes("Firefox")) {
          link = "https://addons.mozilla.org/ko/firefox/addon/linkhu";
        } else {
          // 크롬, 엣지 등 그 외 Chromium 기반
          link = "https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp";
        }
      }
    } catch (e) {
      console.warn("설치 정보 확인 실패, 기본 링크 사용:", e);
    }
    return link;
  },

  // 팝업/옵션 페이지에 버전 정보를 표시하고 업데이트 필요 여부를 알립니다.
  async displayVersionInfo(currentVersionElId, updateMessageElId) {
    const [currentVersion, latestVersion] = await Promise.all([
      this.getCurrentVersion(),
      this.getLatestGithubReleaseVersion()
    ]);

    const currentVersionEl = document.getElementById(currentVersionElId);
    const updateMessageEl = document.getElementById(updateMessageElId);

    if (currentVersionEl) {
      currentVersionEl.textContent = `v${currentVersion}`;
    }

    if (updateMessageEl && latestVersion) {
      if (this.compareVersions(currentVersion, latestVersion) < 0) {
        const storeLink = await this.getUpdateLink();
        
        const updateLink = document.createElement('a');
        updateLink.href = storeLink;
        updateLink.target = '_blank';
        updateLink.style.cssText = 'color: #ff6b6b; text-decoration: none; font-size: 12px; margin-left: 8px;';
        updateLink.textContent = `(업데이트 가능: v${latestVersion})`;
        updateMessageEl.replaceChildren(updateLink);
      } else {
        updateMessageEl.textContent = '';
      }
    }
  }
};

// 3. [시작] HTML 문서 로드가 끝나면 바로 실행되는 부분
document.addEventListener("DOMContentLoaded", () => {
  // 초기 화면 렌더링
  App.render();

  // 버전 정보 표시
  VersionManager.displayVersionInfo("current-version", "update-message");

  // 톱니바퀴 버튼 클릭 시 '설정' 페이지 열기
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  const searchInput = document.getElementById("service-search");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      App.searchQuery = e.target.value.trim();
      App.render();
    });

    searchInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" || e.isComposing || e.repeat) return;
      const firstItem = App.currentItems[0];
      if (!firstItem) return;

      e.preventDefault();
      App.openInCurrentTab(firstItem);
    });
  }

  // 1~9 숫자 키보드 입력 시 해당하는 순서의 버튼(새 탭 열기) 클릭 이벤트 실행
  document.addEventListener("keydown", (e) => {
    // 입력 중이거나 보조 키(Ctrl, Alt, Cmd 등)가 눌린 경우, 또는 키 반복 입력인 경우 무시
    if (
      e.target.tagName === "INPUT" ||
      e.target.tagName === "TEXTAREA" ||
      e.target.isContentEditable ||
      e.ctrlKey ||
      e.altKey ||
      e.metaKey ||
      e.repeat
    ) {
      return;
    }

    if (e.key === "/") {
      e.preventDefault();
      searchInput?.focus();
      return;
    }

    if (e.key >= "1" && e.key <= "9") {
      const index = parseInt(e.key, 10) - 1; // 1~9를 인덱스 0~8로 변환
      const items = document.querySelectorAll(".grid-item");
      if (items[index]) items[index].click();
    }
  });
});

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

  createCardItem(item) {
    const el = document.createElement("a");
    el.className = "grid-item";
    el.href = item.url;

    const img = document.createElement("img");
    img.src = item.imgSrc;
    img.alt = item.name;
    img.draggable = false;

    img.onerror = () => {
      img.src = "icons/icon48.png";
    };

    const span = document.createElement("span");
    span.textContent = item.name;

    el.appendChild(img);
    el.appendChild(span);

    el.addEventListener("click", (e) => {
      e.preventDefault();
      const isBackground = e.ctrlKey || e.metaKey;
      chrome.tabs.create({ url: item.url, active: !isBackground });
      if (!isBackground) window.close();
    });

    el.addEventListener("auxclick", (e) => {
      if (e.button === 1) {
        e.preventDefault();
        chrome.tabs.create({ url: item.url, active: false });
      }
    });
    return el;
  },

  render() {
    const gridContainer = document.getElementById("grid-container");
    const emptyMessage = document.getElementById("empty-message");
    const renderToken = ++this.renderToken;
    gridContainer.innerHTML = "";

    const fragment = document.createDocumentFragment();

    chrome.storage.local.get(["userOrder"], (result) => {
      if (renderToken !== this.renderToken) return;

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

      displaySites.forEach((siteData) => {
        const card = this.createCardItem(siteData);
        fragment.appendChild(card);
      });

      if (emptyMessage) {
        emptyMessage.hidden = displaySites.length > 0;
      }

      gridContainer.appendChild(fragment);
    });
  },
};

const VersionManager = {
  async getCurrentVersion() {
    const manifest = chrome.runtime.getManifest();
    return manifest.version;
  },

  // GitHub API rate limit 때문에 최신 릴리스 버전은 12시간 캐싱한다.
  async getLatestGithubReleaseVersion() {
    const CACHE_KEY = "latestReleaseVersion";
    const CACHE_TIME_KEY = "latestReleaseVersionTime";
    const CACHE_DURATION_MS = 12 * 60 * 60 * 1000;

    const result = await chrome.storage.local.get([CACHE_KEY, CACHE_TIME_KEY]);
    const now = Date.now();
    const cachedVersion = result[CACHE_KEY];
    const cachedTime = result[CACHE_TIME_KEY];

    if (cachedVersion && cachedTime && (now - cachedTime < CACHE_DURATION_MS)) {
      return cachedVersion;
    }

    const repoOwner = "kangkyunghyun";
    const repoName = "LinKHU";
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GitHub API error (${response.status}): ${errorText}`);
        return cachedVersion || null;
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

  async getUpdateLink() {
    let link = "https://github.com/kangkyunghyun/LinKHU/releases/latest";
    try {
      // 스토어 update_url이 없으면 unpacked 개발 모드로 보고 GitHub 릴리스로 안내한다.
      const isDevMode = !chrome.runtime.getManifest().update_url;

      if (!isDevMode) {
        const ua = navigator.userAgent;
        if (ua.includes("Whale")) {
          link = "https://store.whale.naver.com/detail/njhgalaophlilmhapklabocladclmhoc";
        } else if (ua.includes("Firefox")) {
          link = "https://addons.mozilla.org/ko/firefox/addon/linkhu";
        } else {
          link = "https://chromewebstore.google.com/detail/ihidkmjkpfphgljieecfcikljaopcldp";
        }
      }
    } catch (e) {
      console.warn("설치 정보 확인 실패, 기본 링크 사용:", e);
    }
    return link;
  },

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

document.addEventListener("DOMContentLoaded", () => {
  App.render();

  VersionManager.displayVersionInfo("current-version", "update-message");

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

  document.addEventListener("keydown", (e) => {
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
      const index = parseInt(e.key, 10) - 1;
      const items = document.querySelectorAll(".grid-item");
      if (items[index]) items[index].click();
    }
  });
});

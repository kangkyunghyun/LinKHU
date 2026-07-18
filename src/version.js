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
        updateLink.className = 'update-link';
        updateLink.textContent = `(업데이트 가능: v${latestVersion})`;
        updateMessageEl.replaceChildren(updateLink);
      } else {
        updateMessageEl.textContent = '';
      }
    }
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = VersionManager;
}

// 랜딩 테마 모드 해석·저장·적용. 확장의 src/theme.js와 같은 UX를 쓴다.
//
// 사용자가 고르는 값(mode)은 system/light/dark 세 가지이고,
// 화면에 실제로 칠해지는 값(theme)은 light/dark 두 가지다.
// system은 prefers-color-scheme으로 해석해 theme으로 바꾼다.
//
// 확장과 다른 점은 저장소뿐이다. 랜딩은 확장 저장소를 읽을 수 없어 브라우저의
// 도메인별 영구 저장소를 쓰며, 읽기·쓰기가 동기라 확장의 경쟁 상태 가드가 필요 없다.
// 저장된 값을 첫 페인트 전에 이미 알 수 있어 "먼저 시스템 설정으로 칠하고
// 나중에 보정"하는 단계도 없다.
//
// 첫 페인트 전에 표식을 붙여야 하므로 이 파일은 <head>에서 동기 로드한다.
// 규칙의 원본은 docs/spec/4-3-THEME.md다.
(function (globalScope) {
  "use strict";

  const THEME_STORAGE_KEY = "themeMode";
  const THEME_MODES = ["system", "light", "dark"];
  const DEFAULT_THEME_MODE = "system";
  const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";
  const THEME_SAVE_FAILED_MESSAGE =
    "테마를 저장하지 못했습니다. 이전 설정으로 되돌렸습니다.";
  const STATUS_VISIBLE_CLASS = "theme-status-visible";
  const MODE_NAMES = {
    system: "시스템 설정",
    light: "라이트",
    dark: "다크",
  };

  const LandingTheme = {
    STORAGE_KEY: THEME_STORAGE_KEY,
    MODES: THEME_MODES,
    DEFAULT_MODE: DEFAULT_THEME_MODE,
    SAVE_FAILED_MESSAGE: THEME_SAVE_FAILED_MESSAGE,
    STATUS_VISIBLE_CLASS,
    MODE_NAMES,

    // 화면에 적용된 모드와, 저장이 확인된 모드. 롤백은 항상 후자로 돌아간다.
    currentMode: DEFAULT_THEME_MODE,
    committedMode: DEFAULT_THEME_MODE,

    // 칠해진 테마(light/dark)가 바뀔 때 알린다. 서비스 아이콘이 이걸 듣는다.
    themeSubscribers: new Set(),
    lastAppliedTheme: null,

    // 외부 의존을 한곳에서 읽어 테스트에서 교체할 수 있게 한다.
    deps: {
      // 저장소 차단 설정에서는 접근 자체가 던진다.
      storage() {
        try {
          return globalScope.localStorage || null;
        } catch (error) {
          return null;
        }
      },
      root() {
        return typeof document !== "undefined" ? document.documentElement : null;
      },
      document() {
        return typeof document !== "undefined" ? document : null;
      },
      matchMedia(query) {
        return globalScope.matchMedia ? globalScope.matchMedia(query) : null;
      },
    },

    // 저장된 값이 없거나 손상됐어도 화면은 떠야 하므로 항상 유효한 모드를 돌려준다.
    normalizeMode(value) {
      return THEME_MODES.includes(value) ? value : DEFAULT_THEME_MODE;
    },

    resolveTheme(mode, prefersDark) {
      const normalized = this.normalizeMode(mode);
      if (normalized === "system") return prefersDark ? "dark" : "light";
      return normalized;
    },

    prefersDark() {
      return Boolean(this.deps.matchMedia(DARK_MEDIA_QUERY)?.matches);
    },

    resolvedTheme() {
      return this.resolveTheme(this.currentMode, this.prefersDark());
    },

    // 라이트 경로에서 다크 경로를 유도한다. 확장의 LinKHUShared.iconSrc와 같은 규칙이다.
    iconSrc(imgSrc, theme) {
      if (theme !== "dark") return imgSrc;
      return String(imgSrc).replace(/^images\//, "images/dark/");
    },

    // 랜딩 자산은 assets/ 아래에 있다.
    assetSrc(imgSrc, theme = this.resolvedTheme()) {
      return `assets/${this.iconSrc(imgSrc, theme)}`;
    },

    nextToggleMode() {
      const index = THEME_MODES.indexOf(this.normalizeMode(this.currentMode));
      return THEME_MODES[(index + 1) % THEME_MODES.length];
    },

    // 순환은 다음에 무엇이 될지가 버튼에 드러나지 않는다.
    // 그래서 현재 모드와 다음 모드를 함께 알린다.
    toggleLabel(mode = this.currentMode) {
      const current = this.normalizeMode(mode);
      const index = THEME_MODES.indexOf(current);
      const next = THEME_MODES[(index + 1) % THEME_MODES.length];
      return `테마: ${MODE_NAMES[current]}. 누르면 ${MODE_NAMES[next]}`;
    },

    modeAnnouncement(mode = this.currentMode) {
      return `테마: ${MODE_NAMES[this.normalizeMode(mode)]}`;
    },

    subscribeThemeChange(callback) {
      this.themeSubscribers.add(callback);
      return () => this.themeSubscribers.delete(callback);
    },

    applyTheme(theme, root = this.deps.root()) {
      if (!root) return;
      root.setAttribute("data-theme", theme);
      // 아이콘은 칠해진 테마가 아니라 고른 모드를 보여주므로 따로 노출한다.
      root.setAttribute("data-theme-mode", this.normalizeMode(this.currentMode));
    },

    // 이미 그려진 서비스 아이콘은 표식만 바꿔서는 따라오지 않는다.
    // 라이트 경로를 data-icon-src에 남겨두고 여기서 현재 테마 경로로 갈아끼운다.
    refreshIcons(theme = this.resolvedTheme()) {
      const doc = this.deps.document();
      if (!doc) return;

      doc.querySelectorAll("img[data-icon-src]").forEach((icon) => {
        const next = this.assetSrc(icon.dataset.iconSrc, theme);
        if (!icon.getAttribute("src") || icon.getAttribute("src") !== next) {
          icon.setAttribute("src", next);
        }
      });
    },

    refresh() {
      const theme = this.resolvedTheme();
      this.applyTheme(theme);
      this.renderToggle();
      this.refreshIcons(theme);

      if (theme !== this.lastAppliedTheme) {
        this.lastAppliedTheme = theme;
        this.themeSubscribers.forEach((callback) => callback(theme));
      }
    },

    // 아이콘 교체는 CSS가 data-theme-mode로 처리한다. 여기서는 레이블만 맞춘다.
    renderToggle() {
      const doc = this.deps.document();
      if (!doc) return;

      const label = this.toggleLabel();
      doc.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        button.setAttribute("aria-label", label);
        button.setAttribute("title", label);
      });
    },

    // 평소에는 시각적으로 숨긴다. 모드 변경은 화면 전체 색이 바뀌는 강한
    // 피드백이 이미 있어 텍스트가 중복이다. 스크린 리더에는 계속 읽혀야 하므로
    // 요소를 없애지 않는다.
    reportStatus(message, isError = false) {
      const doc = this.deps.document();
      if (!doc) return;

      doc.querySelectorAll("[data-theme-status]").forEach((element) => {
        element.textContent = message;
        element.classList?.toggle(STATUS_VISIBLE_CLASS, Boolean(isError));
      });
    },

    readMode() {
      const storage = this.deps.storage();
      if (!storage) return DEFAULT_THEME_MODE;

      try {
        return this.normalizeMode(storage.getItem(THEME_STORAGE_KEY));
      } catch (error) {
        return DEFAULT_THEME_MODE;
      }
    },

    // 성공하면 null, 실패하면 오류를 돌려준다. 확장의 콜백 규약과 모양을 맞춘다.
    writeMode(mode) {
      const storage = this.deps.storage();
      if (!storage) return new Error("Theme storage is unavailable.");

      try {
        storage.setItem(THEME_STORAGE_KEY, mode);
        return null;
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error));
      }
    },

    // 즉시 반영형이라 저장 버튼이 없다. 대신 저장에 실패하면 화면을 되돌려야
    // 다음 방문에서 조용히 이전 테마로 돌아가는 일이 생기지 않는다.
    setMode(mode) {
      const nextMode = this.normalizeMode(mode);

      this.currentMode = nextMode;
      this.refresh();

      const error = this.writeMode(nextMode);
      if (error) {
        // 저장이 확인된 값으로 되돌린다. currentMode는 저장된 적 없을 수 있다.
        this.currentMode = this.committedMode;
        this.refresh();
      } else {
        this.committedMode = nextMode;
      }

      this.reportStatus(
        error ? THEME_SAVE_FAILED_MESSAGE : this.modeAnnouncement(),
        Boolean(error),
      );
      return error;
    },

    toggleTheme() {
      return this.setMode(this.nextToggleMode());
    },

    watchSystemTheme() {
      const query = this.deps.matchMedia(DARK_MEDIA_QUERY);
      if (!query?.addEventListener) return;

      query.addEventListener("change", () => {
        // 명시적으로 고른 라이트/다크는 시스템 설정보다 우선한다.
        if (this.currentMode === "system") this.refresh();
      });
    },

    initToggle() {
      const doc = this.deps.document();
      if (!doc) return;

      doc.querySelectorAll("[data-theme-toggle]").forEach((button) => {
        button.addEventListener("click", () => this.toggleTheme());
      });
      this.renderToggle();
    },

    init() {
      const mode = this.readMode();
      this.committedMode = mode;
      this.currentMode = mode;
      this.refresh();
      this.watchSystemTheme();
    },
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = LandingTheme;
  }

  globalScope.LandingTheme = LandingTheme;

  if (typeof document !== "undefined" && document.documentElement) {
    LandingTheme.init();
    // 토글 버튼과 서비스 아이콘은 <body>가 파싱된 뒤에야 존재한다.
    document.addEventListener("DOMContentLoaded", () => {
      LandingTheme.initToggle();
      LandingTheme.refreshIcons();
    });
  }
})(typeof window !== "undefined" ? window : globalThis);

// 테마 모드 해석·저장·적용. 팝업과 설정 페이지가 함께 쓴다.
//
// 사용자가 고르는 값(mode)은 system/light/dark 세 가지이고,
// 화면에 실제로 칠해지는 값(theme)은 light/dark 두 가지다.
// system은 prefers-color-scheme으로 해석해 theme으로 바꾼다.
//
// 첫 페인트 전에 표식을 붙여야 하므로 이 파일은 <head>에서 동기 로드한다.
// 저장소 읽기는 비동기라 늦게 도착하므로, 우선 시스템 설정으로 칠하고
// 저장된 모드가 오면 그때 보정한다. 기본값이 system이라 보정이 필요한 경우는
// light/dark를 명시적으로 고른 사용자뿐이다.
//
// 규칙의 원본은 spec/3-2-DESIGN-UI-RULES.md의 3-2-5다.
const THEME_STORAGE_KEY = "themeMode";
const THEME_MODES = ["system", "light", "dark"];
const DEFAULT_THEME_MODE = "system";
const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const ThemeManager = {
  STORAGE_KEY: THEME_STORAGE_KEY,
  MODES: THEME_MODES,
  DEFAULT_MODE: DEFAULT_THEME_MODE,

  currentMode: DEFAULT_THEME_MODE,

  // 외부 의존을 한곳에서 읽어 테스트에서 교체할 수 있게 한다.
  deps: {
    storage() {
      return typeof chrome !== "undefined" ? chrome.storage?.local : null;
    },
    lastError() {
      return typeof chrome !== "undefined" ? chrome.runtime?.lastError : null;
    },
    root() {
      return typeof document !== "undefined" ? document.documentElement : null;
    },
    matchMedia(query) {
      return typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(query)
        : null;
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

  applyTheme(theme, root = this.deps.root()) {
    if (!root) return;
    root.setAttribute("data-theme", theme);
  },

  // 현재 모드를 화면에 다시 칠한다. 모드가 바뀌었을 때와 시스템 테마가 바뀌었을 때 모두 쓴다.
  refresh() {
    this.applyTheme(this.resolveTheme(this.currentMode, this.prefersDark()));
  },

  readMode(callback) {
    const storage = this.deps.storage();
    if (!storage?.get) {
      callback(DEFAULT_THEME_MODE);
      return;
    }

    storage.get([THEME_STORAGE_KEY], (result) => {
      callback(this.normalizeMode(result?.[THEME_STORAGE_KEY]));
    });
  },

  writeMode(mode, callback) {
    const storage = this.deps.storage();
    if (!storage?.set) {
      callback(new Error("Theme storage is unavailable."));
      return;
    }

    storage.set({ [THEME_STORAGE_KEY]: mode }, () => {
      callback(this.deps.lastError() || null);
    });
  },

  // 즉시 반영형이라 저장 버튼이 없다. 대신 저장에 실패하면 화면을 되돌려야
  // 다음 실행에서 조용히 이전 테마로 돌아가는 일이 생기지 않는다.
  // 되돌릴 기준값은 적용 직전의 모드이므로 저장을 시도하기 전에 기억해 둔다.
  setMode(mode, callback) {
    const previousMode = this.currentMode;
    const nextMode = this.normalizeMode(mode);

    this.currentMode = nextMode;
    this.refresh();

    this.writeMode(nextMode, (error) => {
      if (error) {
        this.currentMode = previousMode;
        this.refresh();
      }
      callback?.(error, this.currentMode);
    });
  },

  watchSystemTheme() {
    const query = this.deps.matchMedia(DARK_MEDIA_QUERY);
    if (!query?.addEventListener) return;

    query.addEventListener("change", () => {
      // 명시적으로 고른 라이트/다크는 시스템 설정보다 우선한다.
      if (this.currentMode === "system") this.refresh();
    });
  },

  init() {
    this.refresh();
    this.watchSystemTheme();
    this.readMode((mode) => {
      this.currentMode = mode;
      this.refresh();
    });
  },
};

if (typeof document !== "undefined" && document.documentElement) {
  ThemeManager.init();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeManager;
}

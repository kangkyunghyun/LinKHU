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

  // 저장소 콜백은 요청한 순서대로 도착하지 않는다. 늦게 도착한 낡은 결과가
  // 최신 상태를 덮어쓰지 않도록 요청마다 번호를 붙이고, 콜백에서 자기가
  // 아직 최신인지 확인한다. 낡았으면 조용히 버린다.
  requestId: 0,

  // 저장된 모드 해석이 끝났는지와, 끝났을 때 알려줄 대상.
  // 소비자는 설정 페이지의 테마 컨트롤 하나뿐이라 슬롯 하나로 충분하다.
  resolved: false,
  onResolved: null,

  // 모드가 바뀔 때마다 알린다. 토글로 바꿔도 설정 페이지 라디오가 따라오게 하는 통로다.
  onModeChange: null,

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
    document() {
      return typeof document !== "undefined" ? document : null;
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

  // 지금 화면에 실제로 칠해진 테마.
  resolvedTheme() {
    return this.resolveTheme(this.currentMode, this.prefersDark());
  },

  // 토글이 저장할 모드. 칠해진 테마의 반대이며 항상 명시적 선택이다.
  nextToggleMode() {
    return this.resolvedTheme() === "dark" ? "light" : "dark";
  },

  // 아이콘만 있는 버튼이라 스크린 리더가 읽을 텍스트가 반드시 필요하다.
  // 현재 상태가 아니라 "누르면 될 동작"을 알린다.
  toggleLabel(resolvedTheme) {
    return resolvedTheme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환";
  },

  // 토글도 라디오와 같은 저장 경로(setMode)를 지난다. 경쟁 상태 가드도 그대로 적용된다.
  toggleTheme(callback) {
    this.setMode(this.nextToggleMode(), callback);
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
    this.applyTheme(this.resolvedTheme());
    this.renderToggle();
  },

  // 아이콘 교체는 CSS가 data-theme으로 처리한다. 여기서는 레이블만 맞춘다.
  renderToggle() {
    const doc = this.deps.document();
    if (!doc) return;

    doc.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", this.toggleLabel(this.resolvedTheme()));
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
    const requestId = ++this.requestId;

    this.currentMode = nextMode;
    this.refresh();

    this.writeMode(nextMode, (error) => {
      // 이 요청 뒤에 다른 선택이 있었으면 이 결과는 낡았다.
      // 롤백하면 이미 성공한 최신 선택을 되돌리게 되므로 그냥 버린다.
      if (requestId !== this.requestId) return;

      if (error) {
        this.currentMode = previousMode;
        this.refresh();
      }
      this.onModeChange?.(this.currentMode);
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

  // 저장된 모드 해석이 끝났을 때 알려준다. 이미 끝났으면 즉시 부른다.
  // 저장소를 읽는 경로를 여기 하나로 두어, 화면마다 따로 읽다가 서로를
  // 덮어쓰는 일이 없게 한다.
  whenResolved(callback) {
    if (this.resolved) {
      callback(this.currentMode);
      return;
    }
    this.onResolved = callback;
  },

  init() {
    const requestId = this.requestId;

    this.refresh();
    this.watchSystemTheme();
    this.readMode((mode) => {
      // 저장값이 도착하기 전에 사용자가 직접 고른 게 있으면 그 선택이 우선한다.
      if (requestId === this.requestId) {
        this.currentMode = mode;
        this.refresh();
      }

      this.resolved = true;
      this.onResolved?.(this.currentMode);
      this.onResolved = null;
    });
  },
};

if (typeof document !== "undefined" && document.documentElement) {
  ThemeManager.init();
  // 토글 버튼은 <body>가 파싱된 뒤에야 존재한다.
  document.addEventListener("DOMContentLoaded", () => ThemeManager.initToggle());
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = ThemeManager;
}

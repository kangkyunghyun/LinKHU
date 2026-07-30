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
const THEME_SAVE_FAILED_MESSAGE =
  "테마를 저장하지 못했습니다. 이전 설정으로 되돌렸습니다.";
const STATUS_VISIBLE_CLASS = "theme-status-visible";
const MODE_NAMES = {
  system: "시스템 설정",
  light: "라이트",
  dark: "다크",
};

const ThemeManager = {
  STORAGE_KEY: THEME_STORAGE_KEY,
  MODES: THEME_MODES,
  DEFAULT_MODE: DEFAULT_THEME_MODE,

  SAVE_FAILED_MESSAGE: THEME_SAVE_FAILED_MESSAGE,
  STATUS_VISIBLE_CLASS,
  MODE_NAMES,

  // 낙관적으로 화면에 적용된 모드.
  currentMode: DEFAULT_THEME_MODE,

  // 저장이 확인된 모드. 롤백은 항상 이 값으로 돌아간다.
  // currentMode를 기준으로 되돌리면 저장된 적 없는 중간값으로 갈 수 있다(스펙 3-2-5-2).
  committedMode: DEFAULT_THEME_MODE,

  // 진행 중인 쓰기 수. 내 요청이 떠 있는 동안에는 외부 변경으로 덮지 않는다.
  pendingWrites: 0,

  // 저장소 콜백은 요청한 순서대로 도착하지 않는다. 늦게 도착한 낡은 결과가
  // 최신 상태를 덮어쓰지 않도록 요청마다 번호를 붙이고, 콜백에서 자기가
  // 아직 최신인지 확인한다. 낡았으면 조용히 버린다.
  requestId: 0,

  // 저장된 모드 해석이 끝났는지와, 끝났을 때 알려줄 대상.
  resolved: false,
  onResolved: null,

  // 모드가 바뀔 때 알릴 구독자들. 팝업의 상태 안내와 설정의 라디오·안내가
  // 동시에 듣는다. 단일 슬롯이면 나중 등록이 앞 등록을 조용히 덮는다.
  modeSubscribers: new Set(),

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
    storageChanged() {
      return typeof chrome !== "undefined" ? chrome.storage?.onChanged : null;
    },
    matchMedia(query) {
      return typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia(query)
        : null;
    },
  },

  // 해지 함수를 돌려준다. 구독자가 여럿이므로 서로를 덮지 않는다.
  subscribeModeChange(callback) {
    this.modeSubscribers.add(callback);
    return () => this.modeSubscribers.delete(callback);
  },

  notifyModeChange() {
    this.modeSubscribers.forEach((callback) => callback(this.currentMode));
  },

  // 저장된 값이 없거나 손상됐어도 화면은 떠야 하므로 항상 유효한 모드를 돌려준다.
  normalizeMode(value) {
    return THEME_MODES.includes(value) ? value : DEFAULT_THEME_MODE;
  },

  // 지금 화면에 실제로 칠해진 테마.
  resolvedTheme() {
    return this.resolveTheme(this.currentMode, this.prefersDark());
  },

  // 순환 토글이 다음에 저장할 모드. system도 저장 가능한 선택이다.
  // 세 모드를 모두 거치므로 별도의 3단계 선택 없이 system에 도달할 수 있다.
  nextToggleMode() {
    const order = THEME_MODES;
    const index = order.indexOf(this.normalizeMode(this.currentMode));
    return order[(index + 1) % order.length];
  },

  // 순환은 다음에 무엇이 될지가 버튼에 드러나지 않는다.
  // 그래서 현재 모드와 다음 모드를 함께 알린다.
  toggleLabel(mode = this.currentMode) {
    const current = this.normalizeMode(mode);
    const index = THEME_MODES.indexOf(current);
    const next = THEME_MODES[(index + 1) % THEME_MODES.length];
    return `테마: ${MODE_NAMES[current]}. 누르면 ${MODE_NAMES[next]}`;
  },

  // 모드 변경을 라이브 영역으로 알릴 때 쓰는 문구.
  modeAnnouncement(mode = this.currentMode) {
    return `테마: ${MODE_NAMES[this.normalizeMode(mode)]}`;
  },

  // 토글도 같은 저장 경로(setMode)를 지난다. 경쟁 상태 가드와 롤백도 그대로 적용된다.
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
    // 아이콘은 칠해진 테마가 아니라 고른 모드를 보여주므로 따로 노출한다.
    root.setAttribute("data-theme-mode", this.normalizeMode(this.currentMode));
  },

  // 현재 모드를 화면에 다시 칠한다. 모드가 바뀌었을 때와 시스템 테마가 바뀌었을 때 모두 쓴다.
  refresh() {
    this.applyTheme(this.resolvedTheme());
    this.renderToggle();
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

  // 저장 실패는 화면마다 알려야 한다. 토글만 있는 팝업에도 안내 자리가 있다.
  //
  // 평소에는 시각적으로 숨긴다. 모드 변경은 아이콘과 화면 전체 색이 바뀌는
  // 강한 피드백이 이미 있어 텍스트가 중복이고, 좁은 팝업에서 격자를 밀어낸다.
  // 스크린 리더에는 계속 읽혀야 하므로 요소를 없애지 않고 sr-only로 둔다.
  reportStatus(message, isError = false) {
    const doc = this.deps.document();
    if (!doc) return;

    doc.querySelectorAll("[data-theme-status]").forEach((element) => {
      element.textContent = message;
      element.classList?.toggle(STATUS_VISIBLE_CLASS, Boolean(isError));
    });
  },

  initToggle() {
    const doc = this.deps.document();
    if (!doc) return;

    doc.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        this.toggleTheme((error) => {
          // 성공하면 오류 표시를 걷어내고 다시 숨긴다.
          this.reportStatus(
            error ? THEME_SAVE_FAILED_MESSAGE : this.modeAnnouncement(),
            Boolean(error),
          );
        });
      });
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
  setMode(mode, callback) {
    const nextMode = this.normalizeMode(mode);
    const requestId = ++this.requestId;

    this.pendingWrites += 1;
    this.currentMode = nextMode;
    this.refresh();
    // 저장을 기다리지 않고 먼저 알린다. 기다리면 그사이 토글과 라디오가 어긋난다.
    this.notifyModeChange();

    this.writeMode(nextMode, (error) => {
      this.pendingWrites -= 1;

      // 이 요청 뒤에 다른 선택이 있었으면 이 결과는 낡았다.
      // 롤백하면 이미 성공한 최신 선택을 되돌리게 되므로 그냥 버린다.
      if (requestId !== this.requestId) return;

      if (error) {
        // 저장이 확인된 값으로 되돌린다. currentMode는 저장된 적 없을 수 있다.
        this.currentMode = this.committedMode;
        this.refresh();
        this.notifyModeChange();
      } else {
        this.committedMode = nextMode;
      }

      callback?.(error, this.currentMode);
    });
  },

  // 다른 문서가 테마를 바꾸면 열려 있는 이 화면도 따라간다.
  // 설정 탭을 열어둔 채 팝업에서 바꾸는 경우가 실제로 생긴다.
  handleExternalChange(rawValue) {
    // 내 요청이 떠 있으면 그 결과가 최종이다. 외부 값으로 덮으면 방금 고른 값이 되돌아간다.
    if (this.pendingWrites > 0) return;

    const mode = this.normalizeMode(rawValue);
    if (mode === this.currentMode && mode === this.committedMode) return;

    this.committedMode = mode;
    this.currentMode = mode;
    this.refresh();
    this.notifyModeChange();
  },

  watchStorage() {
    const onChanged = this.deps.storageChanged();
    if (!onChanged?.addListener) return;

    onChanged.addListener((changes, areaName) => {
      if (areaName && areaName !== "local") return;
      const change = changes?.[THEME_STORAGE_KEY];
      if (!change) return;
      this.handleExternalChange(change.newValue);
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
    this.watchStorage();
    this.readMode((mode) => {
      // 읽기로 확인된 값은 저장소의 실제 내용이므로 롤백 기준이 된다.
      this.committedMode = mode;

      // 저장값이 도착하기 전에 사용자가 직접 고른 게 있으면 그 선택이 우선한다.
      if (requestId === this.requestId) {
        this.currentMode = mode;
        this.refresh();
        this.notifyModeChange();
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

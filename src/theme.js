const LinKHUTheme = {
  STORAGE_KEY: "themePreference",
  DEFAULT_PREFERENCE: "system",
  PREFERENCES: Object.freeze(["system", "light", "dark"]),
  currentPreference: "system",
  currentTheme: "light",
  listeners: new Set(),
  mediaQuery: null,
  initialized: false,

  normalizePreference(value) {
    return this.PREFERENCES.includes(value) ? value : this.DEFAULT_PREFERENCE;
  },

  resolveTheme(preference, prefersDark = false) {
    const normalizedPreference = this.normalizePreference(preference);
    if (normalizedPreference === "system") {
      return prefersDark ? "dark" : "light";
    }
    return normalizedPreference;
  },

  getMediaQuery() {
    if (this.mediaQuery) return this.mediaQuery;

    if (typeof window !== "undefined" && window.matchMedia) {
      this.mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    } else {
      this.mediaQuery = { matches: false };
    }
    return this.mediaQuery;
  },

  applyPreference(preference, prefersDark = this.getMediaQuery().matches) {
    const normalizedPreference = this.normalizePreference(preference);
    const resolvedTheme = this.resolveTheme(normalizedPreference, prefersDark);

    this.currentPreference = normalizedPreference;
    this.currentTheme = resolvedTheme;

    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.themePreference = normalizedPreference;
      root.dataset.theme = resolvedTheme;
      root.style.colorScheme = resolvedTheme;
    }

    const state = {
      preference: normalizedPreference,
      theme: resolvedTheme,
    };
    this.listeners.forEach((listener) => listener(state));
    return state;
  },

  subscribe(listener) {
    this.listeners.add(listener);
    listener({
      preference: this.currentPreference,
      theme: this.currentTheme,
    });
    return () => this.listeners.delete(listener);
  },

  getStorageArea() {
    if (typeof chrome === "undefined") return null;
    return chrome.storage?.local || null;
  },

  getRuntimeError() {
    if (typeof chrome === "undefined") return null;
    return chrome.runtime?.lastError || null;
  },

  loadPreference(callback) {
    const storageArea = this.getStorageArea();
    if (!storageArea) {
      callback(this.DEFAULT_PREFERENCE, null);
      return;
    }

    try {
      storageArea.get([this.STORAGE_KEY], (result) => {
        const error = this.getRuntimeError();
        const preference = error
          ? this.DEFAULT_PREFERENCE
          : this.normalizePreference(result?.[this.STORAGE_KEY]);
        callback(preference, error);
      });
    } catch (error) {
      callback(this.DEFAULT_PREFERENCE, error);
    }
  },

  savePreference(preference, callback = () => {}) {
    const normalizedPreference = this.normalizePreference(preference);
    const storageArea = this.getStorageArea();
    if (!storageArea) {
      callback(new Error("테마 설정 저장소를 사용할 수 없습니다."), normalizedPreference);
      return;
    }

    try {
      storageArea.set({ [this.STORAGE_KEY]: normalizedPreference }, () => {
        const error = this.getRuntimeError();
        if (!error) this.applyPreference(normalizedPreference);
        callback(error, normalizedPreference);
      });
    } catch (error) {
      callback(error, normalizedPreference);
    }
  },

  markReady() {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.themeReady = "true";
    }
  },

  init() {
    if (this.initialized || typeof document === "undefined") return;
    this.initialized = true;

    document.documentElement.dataset.themeReady = "false";
    const mediaQuery = this.getMediaQuery();
    this.applyPreference(this.DEFAULT_PREFERENCE, mediaQuery.matches);

    const handleSystemThemeChange = (event) => {
      if (this.currentPreference === "system") {
        this.applyPreference("system", event.matches);
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemThemeChange);
    }

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local" || !changes[this.STORAGE_KEY]) return;
        this.applyPreference(changes[this.STORAGE_KEY].newValue);
      });
    }

    this.loadPreference((preference) => {
      this.applyPreference(preference);
      this.markReady();
    });
  },
};

if (typeof document !== "undefined") {
  LinKHUTheme.init();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = LinKHUTheme;
}

const ThemeSettings = {
  descriptions: {
    system: "운영체제의 테마 설정을 따릅니다.",
    light: "라이트 테마를 적용했습니다.",
    dark: "다크 테마를 적용했습니다.",
  },
  inputs: [],
  setting: null,
  status: null,
  saving: false,
  pendingPreference: null,
  lastConfirmedPreference: "system",
  saveRequestId: 0,

  render(preference) {
    this.inputs.forEach((input) => {
      input.checked = input.value === preference;
    });
  },

  setBusy(busy) {
    this.setting?.setAttribute("aria-busy", String(busy));
  },

  setStatus(message, state = "") {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.state = state;
  },

  init() {
    this.inputs = Array.from(
      document.querySelectorAll('input[name="theme"]'),
    );
    this.setting = document.querySelector(".theme-setting");
    this.status = document.getElementById("theme-status");
    if (!this.inputs.length || typeof LinKHUTheme === "undefined") return;

    LinKHUTheme.subscribe(({ preference }) => {
      if (this.saving && this.pendingPreference) {
        if (preference !== this.pendingPreference) {
          LinKHUTheme.applyPreference(this.pendingPreference);
        }
        this.render(this.pendingPreference);
        return;
      }

      this.lastConfirmedPreference = preference;
      this.render(preference);
      this.setStatus(this.descriptions[preference]);
    });

    this.inputs.forEach((input) => {
      input.addEventListener("change", () => {
        if (!input.checked) return;

        const requestedPreference = input.value;
        const requestId = ++this.saveRequestId;
        this.saving = true;
        this.pendingPreference = requestedPreference;
        this.setBusy(true);
        this.render(requestedPreference);
        LinKHUTheme.applyPreference(requestedPreference);
        this.setStatus("테마 설정을 저장하는 중입니다.");

        LinKHUTheme.savePreference(requestedPreference, (error, savedPreference) => {
          if (!error) {
            this.lastConfirmedPreference = savedPreference;
          }

          if (requestId !== this.saveRequestId) {
            if (this.pendingPreference) {
              LinKHUTheme.applyPreference(this.pendingPreference);
              this.render(this.pendingPreference);
            }
            return;
          }

          this.saving = false;
          this.pendingPreference = null;
          this.setBusy(false);

          if (error) {
            LinKHUTheme.applyPreference(this.lastConfirmedPreference);
            this.render(this.lastConfirmedPreference);
            this.setStatus(
              "테마를 저장하지 못했습니다. 잠시 후 다시 시도해주세요.",
              "error",
            );
            return;
          }

          this.render(savedPreference);
          this.setStatus(this.descriptions[savedPreference]);
        });
      });
    });
  },
};

const OptionsStorage = {
  saveUserOrder(userOrder, callback) {
    chrome.storage.local.set({ userOrder }, () => {
      callback(chrome.runtime.lastError || null);
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const activeList = document.getElementById("active-list");
  const saveBtn = document.getElementById("save-btn");
  const leftColumn = document.querySelector(".column:first-child");
  const searchInput = document.getElementById("site-search");
  const searchEmptyMessage = document.getElementById("search-empty-message");

  const categoryZones = {
    공통: document.getElementById("zone-공통"),
    단과대: document.getElementById("zone-단과대"),
    학과: document.getElementById("zone-학과"),
  };

  function compareSiteNames(nameA, nameB) {
    return nameA.localeCompare(nameB, "ko-KR");
  }

  function initShortcutGuide() {
    const shortcutGuide = document.getElementById("shortcut-guide");
    if (shortcutGuide && chrome.commands?.getAll) {
      chrome.commands.getAll((commands) => {
        const actionCommand = commands.find(
          (command) => command.name === "_execute_action",
        );
        shortcutGuide.hidden = Boolean(actionCommand?.shortcut);
      });
    }

    document.querySelectorAll(".shortcut-link").forEach((button) => {
      button.addEventListener("click", () => {
        const url = button.dataset.shortcutUrl;
        if (!url) return;

        chrome.tabs.create({ url }, () => {
          if (!chrome.runtime.lastError) return;

          navigator.clipboard.writeText(url)
            .then(() => {
              alert(`${url} 주소를 복사했습니다. 주소창에 붙여넣어 이동해주세요.`);
            })
            .catch(() => {
              alert(`${url} 주소를 직접 복사하여 주소창에 붙여넣어 이동해주세요.`);
            });
        });
      });
    });
  }

  const listItemById = new Map();

  function createListItem(site) {
    if (listItemById.has(site.id)) {
      return listItemById.get(site.id);
    }

    const el = document.createElement("div");
    el.className = "list-item";
    el.draggable = true;
    el.dataset.id = site.id;
    el.dataset.name = site.name;
    el.dataset.category = site.category;

    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";
    dragHandle.textContent = "≡";

    const icon = document.createElement("img");
    icon.src = site.imgSrc;
    icon.alt = "";
    icon.draggable = false;

    const siteName = document.createElement("span");
    siteName.className = "site-name";
    siteName.textContent = site.name.replace(/\s+/g, "");

    el.append(dragHandle, icon, siteName);

    DragController.addDragEvents(el);
    listItemById.set(site.id, el);
    return el;
  }

  // 검색 입력과 왼쪽 카테고리 목록 렌더링을 담당한다.
  const SearchPanel = {
    siteSearchTextById: new Map(
      MASTER_SITE_LIST.map((site) => [
        site.id,
        LinKHUShared.normalize(`${site.name}${site.id}${site.category}`),
      ]),
    ),

    matchesSearch(site, query) {
      return this.siteSearchTextById.get(site.id).includes(query);
    },

    getActiveIds() {
      return new Set(
        Array.from(activeList.querySelectorAll(".list-item")).map(
          (item) => item.dataset.id,
        ),
      );
    },

    update() {
      const query = LinKHUShared.normalize(searchInput?.value);
      const activeIds = this.getActiveIds();
      let visibleCount = 0;

      const filteredSites = MASTER_SITE_LIST.filter((site) => {
        if (activeIds.has(site.id)) return false;
        return !query || this.matchesSearch(site, query);
      }).sort((a, b) => compareSiteNames(a.name, b.name));

      Object.entries(categoryZones).forEach(([category, zone]) => {
        const group = zone.closest(".category-group");
        const matchingSites = filteredSites.filter(
          (site) => site.category === category,
        );

        zone.replaceChildren(...matchingSites.map((site) => createListItem(site)));

        visibleCount += matchingSites.length;
        if (group) group.hidden = Boolean(query && matchingSites.length === 0);
      });

      if (searchEmptyMessage) {
        searchEmptyMessage.hidden = !query || visibleCount > 0;
      }
    },

    sortZone(zone) {
      const items = Array.from(zone.querySelectorAll(".list-item"));
      items.sort((a, b) =>
        compareSiteNames(
          a.querySelector(".site-name").textContent,
          b.querySelector(".site-name").textContent,
        ),
      );
      items.forEach((item) => zone.appendChild(item));
    },

    init() {
      if (searchInput) {
        searchInput.addEventListener("input", () => this.update());
      }
    },
  };

  // 드래그 앤 드롭 이동과 스크롤 영역 자동 스크롤을 담당한다.
  const DragController = {
    SCROLL_SPEED: 8,
    SCROLL_SENSITIVITY: 40,
    draggedItem: null,
    scrollInterval: null,
    // 0: 정지, -1: 위, 1: 아래
    scrollDirection: 0,
    currentScrollArea: null,
    scrollAreaRect: null,

    addDragEvents(item) {
      const controller = this;

      item.addEventListener("dragstart", function () {
        controller.draggedItem = this;
        setTimeout(() => this.classList.add("dragging"), 0);
      });

      item.addEventListener("dragend", function () {
        this.classList.remove("dragging");
        controller.draggedItem = null;
        controller.stopAutoScroll();
        controller.currentScrollArea = null;
        controller.scrollAreaRect = null;
        SearchPanel.update();
      });
    },

    stopAutoScroll() {
      clearInterval(this.scrollInterval);
      this.scrollInterval = null;
      this.scrollDirection = 0;
    },

    handleAutoScroll(event) {
      const area = event.target.closest(".scroll-area");
      // 스크롤 영역 밖으로 잠깐 벗어나도 직전 영역 기준으로 자동 스크롤을 이어간다.
      if (area && area !== this.currentScrollArea) {
        this.currentScrollArea = area;
        // dragover 반복 호출 중 레이아웃 계산을 줄이기 위해 영역이 바뀔 때만 갱신한다.
        this.scrollAreaRect = area.getBoundingClientRect();
      }

      if (!this.currentScrollArea || !this.scrollAreaRect) return;

      let newDirection = 0;

      if (event.clientY < this.scrollAreaRect.top + this.SCROLL_SENSITIVITY) {
        newDirection = -1;
      } else if (
        event.clientY > this.scrollAreaRect.bottom - this.SCROLL_SENSITIVITY
      ) {
        newDirection = 1;
      }

      if (this.scrollDirection !== newDirection) {
        this.stopAutoScroll();
        this.scrollDirection = newDirection;

        if (newDirection !== 0) {
          this.scrollInterval = setInterval(() => {
            this.currentScrollArea.scrollTop +=
              this.scrollDirection * this.SCROLL_SPEED;
          }, 16);
        }
      }
    },

    getDragAfterElement(container, y) {
      const draggableElements = [
        ...container.querySelectorAll(".list-item:not(.dragging)"),
      ];

      return draggableElements.reduce(
        (closest, child) => {
          const box = child.getBoundingClientRect();
          const offset = y - box.top - box.height / 2;
          if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
          } else {
            return closest;
          }
        },
        { offset: Number.NEGATIVE_INFINITY },
      ).element;
    },

    init() {
      document.addEventListener("dragover", (e) => {
        if (!this.draggedItem) return;
        this.handleAutoScroll(e);
      });

      activeList.addEventListener("dragover", (e) => {
        e.preventDefault();
        const currentDrag = document.querySelector(".dragging");
        if (!currentDrag) return;

        const afterElement = this.getDragAfterElement(activeList, e.clientY);
        if (afterElement == null) {
          activeList.appendChild(currentDrag);
        } else {
          activeList.insertBefore(currentDrag, afterElement);
        }
      });

      leftColumn.addEventListener("dragover", (e) => {
        e.preventDefault();
        const currentDrag = document.querySelector(".dragging");
        if (!currentDrag) return;

        const targetZone = categoryZones[currentDrag.dataset.category];

        if (currentDrag.parentNode !== targetZone) {
          targetZone.appendChild(currentDrag);
          SearchPanel.sortZone(targetZone);
        }
      });
    },
  };

  function initSearchShortcut() {
    document.addEventListener("keydown", (e) => {
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.tagName === "SELECT" ||
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
      }
    });
  }

  function initSaveButton() {
    saveBtn.addEventListener("click", () => {
      const activeItems = activeList.querySelectorAll(".list-item");
      const newOrder = Array.from(activeItems).map((item) => item.dataset.id);

      OptionsStorage.saveUserOrder(newOrder, (error) => {
        if (error) {
          console.error("설정 저장 실패:", error);
          alert("설정을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.");
          return;
        }

        alert("성공적으로 저장되었습니다.");
      });
    });
  }

  function loadActiveList() {
    chrome.storage.local.get(["userOrder"], (result) => {
      const activeOrder =
        result.userOrder || LinKHUShared.getDefaultOrder(MASTER_SITE_LIST);

      MASTER_SITE_LIST.filter((site) => activeOrder.includes(site.id)).forEach(
        (site) => {
          activeList.appendChild(createListItem(site));
        },
      );

      activeOrder.forEach((id) => {
        const item = activeList.querySelector(`[data-id="${id}"]`);
        if (item) activeList.appendChild(item);
      });

      SearchPanel.update();
    });
  }

  ThemeSettings.init();
  initShortcutGuide();
  SearchPanel.init();
  DragController.init();
  initSearchShortcut();
  initSaveButton();
  loadActiveList();
});

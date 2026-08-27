// 드래그 손잡이 아이콘(Reicon reorder, MIT). 목록 항목마다 새로 만들므로 상수로 둔다.
const REORDER_ICON_PATHS =
  '<path fill-rule="evenodd" clip-rule="evenodd" d="M19.75 10C19.75 10.4142 19.4142 10.75 19 10.75L5 10.75C4.58579 10.75 4.25 10.4142 4.25 10C4.25 9.58579 4.58579 9.25 5 9.25L19 9.25C19.4142 9.25 19.75 9.58579 19.75 10Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.75 14C19.75 14.4142 19.4142 14.75 19 14.75L5 14.75C4.58579 14.75 4.25 14.4142 4.25 14C4.25 13.5858 4.58579 13.25 5 13.25L19 13.25C19.4142 13.25 19.75 13.5858 19.75 14Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.75 6C19.75 6.41421 19.4142 6.75 19 6.75L5 6.75C4.58579 6.75 4.25 6.41421 4.25 6C4.25 5.58579 4.58579 5.25 5 5.25L19 5.25C19.4142 5.25 19.75 5.58579 19.75 6Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.75 18C19.75 18.4142 19.4142 18.75 19 18.75L5 18.75C4.58579 18.75 4.25 18.4142 4.25 18C4.25 17.5858 4.58579 17.25 5 17.25L19 17.25C19.4142 17.25 19.75 17.5858 19.75 18Z" fill="currentColor"/>';

// 왼쪽 "사용 가능한 사이트" 목록에 무엇을 보일지만 정한다.
// 오른쪽 '내 바로가기'(#active-list)는 여기를 거치지 않는다. 저장 순서는 그 DOM에서 읽으므로,
// 필터로 왼쪽에서 감춘 항목이 저장 데이터에서 사라지는 일은 구조상 생기지 않는다.
const SiteFilter = {
  // 고른 카테고리가 하나도 없으면 필터를 걸지 않은 것으로 본다(= 전체 표시).
  matchesCategory(site, selectedCategories) {
    return selectedCategories.size === 0 || selectedCategories.has(site.category);
  },

  // 카테고리 필터와 검색어는 AND로 걸린다. 필터로 뺀 카테고리는 검색 결과에도 나오지 않는다.
  visibleSites(sites, { activeIds, selectedCategories, query, searchTextById }) {
    return sites.filter((site) => {
      if (activeIds.has(site.id)) return false;
      if (!this.matchesCategory(site, selectedCategories)) return false;
      return !query || searchTextById.get(site.id).includes(query);
    });
  },

  // 검색어나 카테고리 중 하나라도 걸려 있으면 "좁혀 보는 중"이다.
  // 이때만 결과 0건인 카테고리 그룹을 숨기고 빈 상태 문구를 띄운다.
  isNarrowed(query, selectedCategories) {
    return Boolean(query) || selectedCategories.size > 0;
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

  // 카테고리가 8개로 늘면서 존과 칩을 마크업에 박아두면 목록과 화면이 갈라진다.
  // SITE_CATEGORIES(src/data.js) 하나만 보고 둘 다 만든다.
  function buildCategoryZones(container) {
    const zones = {};
    if (!container) return zones;

    SITE_CATEGORIES.forEach((category) => {
      const group = document.createElement("div");
      group.className = "category-group";

      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = category;

      const zone = document.createElement("div");
      zone.className = "drop-zone";
      zone.id = `zone-${category}`;
      zone.dataset.category = category;

      group.append(title, zone);
      container.append(group);
      zones[category] = zone;
    });

    return zones;
  }

  function buildFilterChips(container) {
    if (!container) return [];

    return SITE_CATEGORIES.map((category) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "filter-chip";
      chip.dataset.categoryFilter = category;
      chip.setAttribute("aria-pressed", "false");
      chip.textContent = category;
      container.append(chip);
      return chip;
    });
  }

  const categoryZones = buildCategoryZones(
    document.getElementById("category-zones"),
  );
  const filterButtons = buildFilterChips(
    document.getElementById("category-filters"),
  );

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

  const siteById = new Map(MASTER_SITE_LIST.map((site) => [site.id, site]));
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
    dragHandle.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      REORDER_ICON_PATHS +
      "</svg>";

    const icon = document.createElement("img");
    // 첫 렌더부터 올바른 경로를 쓴다(팝업과 같은 이유).
    icon.dataset.iconSrc = site.imgSrc;
    icon.src = LinKHUShared.iconSrc(site.imgSrc, ThemeManager.resolvedTheme());
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

  // 검색 입력, 카테고리 필터, 왼쪽 카테고리 목록 렌더링을 담당한다.
  const SearchPanel = {
    siteSearchTextById: new Map(
      MASTER_SITE_LIST.map((site) => [
        site.id,
        LinKHUShared.normalize(`${site.name}${site.id}${site.category}`),
      ]),
    ),

    // 세션 안에서만 쓰는 UI 상태다. 저장하지 않는다.
    selectedCategories: new Set(),

    getActiveIds() {
      return new Set(
        Array.from(activeList.querySelectorAll(".list-item")).map(
          (item) => item.dataset.id,
        ),
      );
    },

    renderZone(zone, sites) {
      const sorted = [...sites].sort((a, b) => compareSiteNames(a.name, b.name));
      zone.replaceChildren(...sorted.map((site) => createListItem(site)));
    },

    update() {
      const query = LinKHUShared.normalize(searchInput?.value);
      const isNarrowed = SiteFilter.isNarrowed(query, this.selectedCategories);
      let visibleCount = 0;

      const filteredSites = SiteFilter.visibleSites(MASTER_SITE_LIST, {
        activeIds: this.getActiveIds(),
        selectedCategories: this.selectedCategories,
        query,
        searchTextById: this.siteSearchTextById,
      });

      Object.entries(categoryZones).forEach(([category, zone]) => {
        const group = zone.closest(".category-group");
        const matchingSites = filteredSites.filter(
          (site) => site.category === category,
        );

        this.renderZone(zone, matchingSites);

        visibleCount += matchingSites.length;
        if (group) group.hidden = isNarrowed && matchingSites.length === 0;
      });

      if (searchEmptyMessage) {
        searchEmptyMessage.hidden = !isNarrowed || visibleCount > 0;
      }
    },

    // 드래그로 되돌아온 항목을 제자리에 꽂는다. update()를 부르지 않는 이유는
    // 드래그 도중 항목이 DOM에서 빠지면 dragend가 뜨지 않아 자동 스크롤이 멈추지 않기 때문이다.
    // 여기서는 존에 이미 들어 있는 항목만 다시 배치하므로 끌고 있는 항목이 사라지지 않는다.
    sortZone(zone) {
      const sites = Array.from(zone.querySelectorAll(".list-item"))
        .map((item) => siteById.get(item.dataset.id))
        .filter(Boolean);
      this.renderZone(zone, sites);
    },

    toggleCategory(button) {
      const category = button.dataset.categoryFilter;
      if (this.selectedCategories.has(category)) {
        this.selectedCategories.delete(category);
      } else {
        this.selectedCategories.add(category);
      }

      button.setAttribute(
        "aria-pressed",
        String(this.selectedCategories.has(category)),
      );
      this.update();
    },

    init() {
      if (searchInput) {
        searchInput.addEventListener("input", () => this.update());
      }

      filterButtons.forEach((button) => {
        button.addEventListener("click", () => this.toggleCategory(button));
      });
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
        // 이 항목을 실제로 받는 곳만 강조한다. 왼쪽은 제 카테고리 영역만 받는다.
        [activeList, categoryZones[this.dataset.category]].forEach((zone) => {
          zone?.classList.add("drop-target");
        });
        setTimeout(() => this.classList.add("dragging"), 0);
      });

      item.addEventListener("dragend", function () {
        this.classList.remove("dragging");
        document.querySelectorAll(".drop-target").forEach((zone) => {
          zone.classList.remove("drop-target");
        });
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

  // 테마가 바뀌면 이미 만들어진 항목의 아이콘 경로만 바꾼다.
  ThemeManager.subscribeThemeChange((theme) => {
    document.querySelectorAll("img[data-icon-src]").forEach((icon) => {
      icon.src = LinKHUShared.iconSrc(icon.dataset.iconSrc, theme);
    });
  });

  initShortcutGuide();
  SearchPanel.init();
  DragController.init();
  initSearchShortcut();
  initSaveButton();
  loadActiveList();
});

document.addEventListener("DOMContentLoaded", () => {
  const activeList = document.getElementById("active-list");
  const saveBtn = document.getElementById("save-btn");
  const leftColumn = document.querySelector(".column:first-child");
  const shortcutGuide = document.getElementById("shortcut-guide");
  const searchInput = document.getElementById("site-search");
  const searchEmptyMessage = document.getElementById("search-empty-message");

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

  const categoryZones = {
    공통: document.getElementById("zone-공통"),
    단과대: document.getElementById("zone-단과대"),
    학과: document.getElementById("zone-학과"),
  };

  function normalize(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "");
  }

  const siteSearchTextById = new Map(
    MASTER_SITE_LIST.map((site) => [
      site.id,
      normalize(`${site.name}${site.id}${site.category}`),
    ]),
  );
  const listItemById = new Map();

  function matchesSearch(site, query) {
    return siteSearchTextById.get(site.id).includes(query);
  }

  function getActiveIds() {
    return new Set(
      Array.from(activeList.querySelectorAll(".list-item")).map(
        (item) => item.dataset.id,
      ),
    );
  }

  function updateSearchResults() {
    const query = normalize(searchInput?.value);
    const activeIds = getActiveIds();
    let visibleCount = 0;

    const filteredSites = MASTER_SITE_LIST.filter((site) => {
      if (activeIds.has(site.id)) return false;
      return !query || matchesSearch(site, query);
    }).sort((a, b) => a.name.localeCompare(b.name, "ko-KR"));

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
  }

  function sortZoneAlphabetically(zone) {
    const items = Array.from(zone.querySelectorAll(".list-item"));
    items.sort((a, b) => {
      const nameA = a.querySelector(".site-name").textContent;
      const nameB = b.querySelector(".site-name").textContent;
      return nameA.localeCompare(nameB, "ko-KR");
    });
    items.forEach((item) => zone.appendChild(item));
  }

  chrome.storage.local.get(["userOrder"], (result) => {
    const activeOrder =
      result.userOrder ||
      MASTER_SITE_LIST.filter((s) => s.category === "공통").map((s) => s.id);

    MASTER_SITE_LIST.filter((site) => activeOrder.includes(site.id)).forEach(
      (site) => {
        const el = createListItem(site);
        activeList.appendChild(el);
      },
    );

    activeOrder.forEach((id) => {
      const item = activeList.querySelector(`[data-id="${id}"]`);
      if (item) activeList.appendChild(item);
    });

    updateSearchResults();
  });

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

    addDragEvents(el);
    listItemById.set(site.id, el);
    return el;
  }

  if (searchInput) {
    searchInput.addEventListener("input", updateSearchResults);
  }

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

  saveBtn.addEventListener("click", () => {
    const activeItems = activeList.querySelectorAll(".list-item");
    const newOrder = Array.from(activeItems).map((item) => item.dataset.id);

    chrome.storage.local.set({ userOrder: newOrder }, () => {
      alert("성공적으로 저장되었습니다.");
    });
  });

  let draggedItem = null;
  let scrollInterval = null;
  let scrollDirection = 0;

  function addDragEvents(item) {
    item.addEventListener("dragstart", function () {
      draggedItem = this;
      setTimeout(() => this.classList.add("dragging"), 0);
    });

    item.addEventListener("dragend", function () {
      this.classList.remove("dragging");
      draggedItem = null;
      clearInterval(scrollInterval);
      scrollInterval = null;
      scrollDirection = 0;
      currentScrollArea = null;
      scrollAreaRect = null;
      updateSearchResults();
    });
  }

  const SCROLL_SPEED = 8;
  const SCROLL_SENSITIVITY = 40;
  let currentScrollArea = null;
  let scrollAreaRect = null;

  document.addEventListener("dragover", (e) => {
    if (!draggedItem) return;

    const area = e.target.closest(".scroll-area");
    if (area && area !== currentScrollArea) {
      currentScrollArea = area;
      scrollAreaRect = area.getBoundingClientRect();
    }
    
    if (!currentScrollArea || !scrollAreaRect) return;

    let newDirection = 0;
    
    if (e.clientY < scrollAreaRect.top + SCROLL_SENSITIVITY) {
      newDirection = -1;
    } else if (e.clientY > scrollAreaRect.bottom - SCROLL_SENSITIVITY) {
      newDirection = 1;
    }

    if (scrollDirection !== newDirection) {
      clearInterval(scrollInterval);
      scrollInterval = null;
      scrollDirection = newDirection;

      if (scrollDirection !== 0) {
        scrollInterval = setInterval(() => {
          currentScrollArea.scrollTop += scrollDirection * SCROLL_SPEED;
        }, 16);
      }
    }
  });

  activeList.addEventListener("dragover", function (e) {
    e.preventDefault();
    const currentDrag = document.querySelector(".dragging");
    if (!currentDrag) return;

    const afterElement = getDragAfterElement(activeList, e.clientY);
    if (afterElement == null) {
      activeList.appendChild(currentDrag);
    } else {
      activeList.insertBefore(currentDrag, afterElement);
    }
  });

  leftColumn.addEventListener("dragover", function (e) {
    e.preventDefault();
    const currentDrag = document.querySelector(".dragging");
    if (!currentDrag) return;

    const targetZone = categoryZones[currentDrag.dataset.category];

    if (currentDrag.parentNode !== targetZone) {
      targetZone.appendChild(currentDrag);
      sortZoneAlphabetically(targetZone);
    }
  });

  function getDragAfterElement(container, y) {
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
  }
});

const App = {
  searchQuery: "",
  currentItems: [],
  renderToken: 0,

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

    const iconTile = document.createElement("span");
    iconTile.className = "grid-item-icon";
    iconTile.appendChild(img);

    const span = document.createElement("span");
    span.className = "site-name";
    span.textContent = item.name;

    el.appendChild(iconTile);
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

      const order = result.userOrder || LinKHUShared.getDefaultOrder(MASTER_SITE_LIST);

      const configuredSites = order
        .map((id) => MASTER_SITE_LIST.find((s) => s.id === id))
        .filter(Boolean);

      const query = LinKHUShared.normalize(this.searchQuery);
      const displaySites = this.getUniqueSites(
        query
          ? LinKHUShared.rankSites(MASTER_SITE_LIST, this.searchQuery)
          : configuredSites,
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

document.addEventListener("DOMContentLoaded", () => {
  App.render();

  VersionManager.displayVersionInfo("current-version", "update-message");

  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // 팝업 안에서 링크를 그대로 열면 팝업 화면이 이동하므로 새 탭으로 연다.
  const homepageLink = document.getElementById("homepage-link");
  if (homepageLink) {
    homepageLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: homepageLink.href, active: true });
      window.close();
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

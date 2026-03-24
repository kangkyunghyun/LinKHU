const App = {
  createCardItem(item, isWide) {
    const el = document.createElement("div");
    el.className = "grid-item";
    if (isWide) el.classList.add("wide");

    const img = document.createElement("img");
    img.src = item.imgSrc;
    img.alt = item.name;
    img.onerror = () => {
      img.src = "icons/icon48.png";
    };

    const span = document.createElement("span");
    span.textContent = item.name;

    el.appendChild(img);
    el.appendChild(span);

    el.addEventListener("mouseup", (e) => {
      if (e.button === 0) chrome.tabs.create({ url: item.url, active: true });
      else if (e.button === 1) {
        e.preventDefault();
        chrome.tabs.create({ url: item.url, active: false });
      }
    });
    return el;
  },

  render() {
    const gridContainer = document.getElementById("grid-container");
    gridContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();

    // 1. 저장된 설정 불러오기
    chrome.storage.local.get(["userOrder", "hiddenSites"], (result) => {
      // 저장된 순서가 없으면 기본 순서 사용
      const order = result.userOrder || MASTER_SITE_LIST.map((site) => site.id);
      const hidden = result.hiddenSites || [];

      // 2. 순서대로 돌면서 숨겨지지 않은 것만 그리기
      let displayIndex = 0;
      order.forEach((id) => {
        if (!hidden.includes(id)) {
          const siteData = MASTER_SITE_LIST.find((s) => s.id === id);
          if (siteData) {
            // 첫 번째 항목은 인포21처럼 wide 스타일 적용
            const isWide = displayIndex === 0;
            const card = this.createCardItem(siteData, isWide);
            fragment.appendChild(card);
            displayIndex++;
          }
        }
      });
      gridContainer.appendChild(fragment);
    });
  },
};

document.addEventListener("DOMContentLoaded", () => {
  App.render();

  // 톱니바퀴 클릭 시 옵션 페이지 열기
  document.getElementById("settings-btn").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });
});

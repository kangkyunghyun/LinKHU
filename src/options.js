document.addEventListener("DOMContentLoaded", () => {
  // 1. 필요한 HTML 요소들 미리 찾아두기
  const activeList = document.getElementById("active-list");
  const saveBtn = document.getElementById("save-btn");
  const leftColumn = document.querySelector(".column:first-child"); // 왼쪽 후보 영역
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

  // 왼쪽 카테고리별 구역(Drop Zone) 매핑
  const categoryZones = {
    공통: document.getElementById("zone-공통"),
    단과대: document.getElementById("zone-단과대"),
    학과: document.getElementById("zone-학과"),
  };

  // 🔠 [함수] 리스트를 가나다순으로 자동 정렬
  function sortZoneAlphabetically(zone) {
    const items = Array.from(zone.querySelectorAll(".list-item"));
    items.sort((a, b) => {
      const nameA = a.querySelector(".site-name").textContent;
      const nameB = b.querySelector(".site-name").textContent;
      return nameA.localeCompare(nameB, "ko-KR"); // 한국어 기준 비교
    });
    // 정렬된 순서대로 다시 화면에 붙여넣기
    items.forEach((item) => zone.appendChild(item));
  }

  // 2. 초기 데이터 로딩: 저장된 설정 불러와서 배치하기
  chrome.storage.local.get(["userOrder"], (result) => {
    // 저장된 데이터가 없으면 '공통' 사이트들만 기본값으로 설정
    const activeOrder =
      result.userOrder ||
      MASTER_SITE_LIST.filter((s) => s.category === "공통").map((s) => s.id);

    MASTER_SITE_LIST.forEach((site) => {
      const el = createListItem(site);

      if (activeOrder.includes(site.id)) {
        activeList.appendChild(el); // 오른쪽(내 바로가기)으로 배치
      } else {
        if (categoryZones[site.category]) {
          categoryZones[site.category].appendChild(el); // 원래 카테고리 칸으로 배치
        }
      }
    });

    // 왼쪽 구역들은 배치가 끝나면 바로 가나다 정렬 실행
    Object.values(categoryZones).forEach((zone) =>
      sortZoneAlphabetically(zone),
    );

    // 오른쪽은 사용자가 저장했던 '그 순서' 그대로 다시 재배치
    activeOrder.forEach((id) => {
      const item = activeList.querySelector(`[data-id="${id}"]`);
      if (item) activeList.appendChild(item);
    });
  });

  // 3. [함수] 사이트 리스트 아이템 HTML 생성
  function createListItem(site) {
    const el = document.createElement("div");
    el.className = "list-item";
    el.draggable = true; // 드래그 가능하게 설정
    el.dataset.id = site.id;
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

    addDragEvents(el); // 아이템에 드래그 기능 심어주기
    return el;
  }

  // 4. 저장 버튼: 현재 오른쪽 리스트의 순서를 따서 저장
  saveBtn.addEventListener("click", () => {
    const activeItems = activeList.querySelectorAll(".list-item");
    const newOrder = Array.from(activeItems).map((item) => item.dataset.id);

    chrome.storage.local.set({ userOrder: newOrder }, () => {
      alert("성공적으로 저장되었습니다.");
    });
  });

  // 5. 드래그 앤 드롭 핵심 로직
  let draggedItem = null;
  let scrollInterval = null;
  let scrollDirection = 0; // 0: 정지, -1: 위, 1: 아래

  function addDragEvents(item) {
    item.addEventListener("dragstart", function () {
      draggedItem = this; // 드래그 시작한 아이템 기억
      setTimeout(() => this.classList.add("dragging"), 0); // 시각 효과
    });

    item.addEventListener("dragend", function () {
      this.classList.remove("dragging");
      draggedItem = null;
      clearInterval(scrollInterval);
      scrollInterval = null;
      scrollDirection = 0;
      currentScrollArea = null;
      scrollAreaRect = null;
    });
  }

  // 자동 스크롤 로직 추가
  const SCROLL_SPEED = 8;
  const SCROLL_SENSITIVITY = 40;
  let currentScrollArea = null;
  let scrollAreaRect = null;

  document.addEventListener("dragover", (e) => {
    if (!draggedItem) return;

    const area = e.target.closest(".scroll-area");
    // 의도적 처리: 마우스가 스크롤 영역 밖을 벗어나도 직전 영역을 기억하여 스크롤 동작 유지
    if (area && area !== currentScrollArea) {
      currentScrollArea = area;
      scrollAreaRect = area.getBoundingClientRect(); // 레이아웃 계산(리플로우) 최소화를 위해 캐싱
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

  // [오른쪽 영역] 아이템 순서 바꾸기 로직
  activeList.addEventListener("dragover", function (e) {
    e.preventDefault();
    const currentDrag = document.querySelector(".dragging");
    if (!currentDrag) return;

    // 마우스 위치(e.clientY)를 계산해서 어느 아이템 사이에 끼워넣을지 결정
    const afterElement = getDragAfterElement(activeList, e.clientY);
    if (afterElement == null) {
      activeList.appendChild(currentDrag);
    } else {
      activeList.insertBefore(currentDrag, afterElement);
    }
  });

  // [왼쪽 영역] 스마트 복귀 로직
  leftColumn.addEventListener("dragover", function (e) {
    e.preventDefault();
    const currentDrag = document.querySelector(".dragging");
    if (!currentDrag) return;

    // 아이템의 데이터에 적힌 '원래 카테고리 구역'을 찾아가도록 함
    const targetZone = categoryZones[currentDrag.dataset.category];

    if (currentDrag.parentNode !== targetZone) {
      targetZone.appendChild(currentDrag); // 자기 방으로 복귀
      sortZoneAlphabetically(targetZone); // 복귀 즉시 가나다 정렬
    }
  });

  // 드래그 시 마우스가 어느 아이템 위에 있는지 계산하는 수학적 함수
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

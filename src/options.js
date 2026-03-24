document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("sortable-list");
  const saveBtn = document.getElementById("save-btn");

  // 1. 기존 설정 불러와서 리스트 그리기
  chrome.storage.local.get(["userOrder", "hiddenSites"], (result) => {
    const order = result.userOrder || MASTER_SITE_LIST.map((s) => s.id);
    const hidden = result.hiddenSites || [];

    order.forEach((id) => {
      const site = MASTER_SITE_LIST.find((s) => s.id === id);
      if (site) {
        const li = document.createElement("li");
        li.className = "list-item";
        li.draggable = true; // 드래그 기능 활성화
        li.dataset.id = site.id;

        const isChecked = hidden.includes(site.id) ? "" : "checked";

        li.innerHTML = `
          <div class="drag-handle">≡</div>
          <img src="${site.imgSrc}" alt="icon">
          <span class="site-name">${site.name}</span>
          <label class="toggle-wrap">
            <input type="checkbox" class="visibility-toggle" ${isChecked}>
            표시
          </label>
        `;
        listContainer.appendChild(li);
        addDragEvents(li);
      }
    });
  });

  // 2. 저장 버튼 클릭 시
  saveBtn.addEventListener("click", () => {
    const items = document.querySelectorAll(".list-item");
    const newOrder = [];
    const newHidden = [];

    items.forEach((item) => {
      const id = item.dataset.id;
      const isVisible = item.querySelector(".visibility-toggle").checked;
      newOrder.push(id);
      if (!isVisible) newHidden.push(id);
    });

    // 스토리지에 저장
    chrome.storage.local.set(
      { userOrder: newOrder, hiddenSites: newHidden },
      () => {
        alert("설정이 성공적으로 저장되었습니다!");
      },
    );
  });

  // 3. 드래그 앤 드롭 기능 구현 (HTML5 Drag & Drop API)
  let draggedItem = null;

  function addDragEvents(item) {
    item.addEventListener("dragstart", function () {
      draggedItem = this;
      setTimeout(() => this.classList.add("dragging"), 0);
    });

    item.addEventListener("dragend", function () {
      this.classList.remove("dragging");
      draggedItem = null;
    });

    listContainer.addEventListener("dragover", function (e) {
      e.preventDefault(); // 드롭 허용
      const afterElement = getDragAfterElement(listContainer, e.clientY);
      const currentDrag = document.querySelector(".dragging");
      if (afterElement == null) {
        listContainer.appendChild(currentDrag);
      } else {
        listContainer.insertBefore(currentDrag, afterElement);
      }
    });
  }

  // 마우스 위치를 계산해서 어느 요소 사이에 넣을지 결정하는 함수
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

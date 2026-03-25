/**
 * LinKHU - popup.js
 * 화면에 버튼을 그리고, 클릭 시 페이지를 이동시키는 로직
 */

const App = {
  // 1. [함수] 사이트 버튼(카드) 하나하나를 만드는 공장
  createCardItem(item) {
    const el = document.createElement("div");
    el.className = "grid-item"; // CSS 적용을 위한 클래스명

    // 이미지(로고) 생성
    const img = document.createElement("img");
    img.src = item.imgSrc;
    img.alt = item.name;

    // 이미지 로드 실패 시: 엑스박스 대신 기본 아이콘 보여주기
    img.onerror = () => {
      img.src = "icons/icon48.png";
    };

    // 사이트 이름 생성
    const span = document.createElement("span");
    span.textContent = item.name;

    // 상자안에 이미지와 이름 넣기
    el.appendChild(img);
    el.appendChild(span);

    // 클릭 이벤트 처리
    el.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        // [좌클릭] 현재 탭을 해당 사이트로 이동
        chrome.tabs.update({ url: item.url });
        window.close(); // 이동 후 팝업창 닫기 (깔끔함!)
      } else if (e.button === 1) {
        // [휠클릭] 새 탭을 백그라운드에서 열기
        e.preventDefault();
        chrome.tabs.create({ url: item.url, active: false });
      }
    });
    return el;
  },

  // 2. [함수] 저장된 데이터를 가져와서 화면에 쫙 뿌려주는 역할
  render() {
    const gridContainer = document.getElementById("grid-container");
    gridContainer.innerHTML = ""; // 기존 내용 초기화

    // 성능 최적화용 가상 보관함 (한꺼번에 그리기 위해 사용)
    const fragment = document.createDocumentFragment();

    // 사용자가 설정한 순서 가져오기
    chrome.storage.local.get(["userOrder"], (result) => {
      // 저장된 순서가 없으면 '공통' 카테고리 사이트들을 기본값으로 사용
      const order =
        result.userOrder ||
        MASTER_SITE_LIST.filter((s) => s.category === "공통").map((s) => s.id);

      // 순서대로 사이트 데이터를 찾아 버튼 생성
      order.forEach((id) => {
        const siteData = MASTER_SITE_LIST.find((s) => s.id === id);
        if (siteData) {
          const card = this.createCardItem(siteData);
          fragment.appendChild(card); // 가상 보관함에 차곡차곡 담기
        }
      });

      // 보관함에 담긴 버튼들을 한 번에 실제 화면에 붙이기
      gridContainer.appendChild(fragment);
    });
  },
};

// 3. [시작] HTML 문서 로드가 끝나면 바로 실행되는 부분
document.addEventListener("DOMContentLoaded", () => {
  // 초기 화면 렌더링
  App.render();

  // 톱니바퀴 버튼 클릭 시 '설정' 페이지 열기
  const settingsBtn = document.getElementById("settings-btn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      chrome.runtime.openOptionsPage();
    });
  }
});

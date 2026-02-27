/**
 * LinKHU - popup.js
 * 데이터 정의 및 DOM 조작 로직
 */

// 1. DATA: 사이트 정보 목록 (상수 관리)
const SITE_LIST = [
  {
    name: "경희대학교 포털",
    url: "https://portal.khu.ac.kr",
    imgSrc: "images/portal.png",
  },
  {
    name: "e-Campus",
    url: "https://e-campus.khu.ac.kr",
    imgSrc: "images/ecampus.png",
  },
  {
    name: "에브리타임",
    url: "https://everytime.kr",
    imgSrc: "images/everytime.png",
  },
  {
    name: "공지사항",
    url: "https://www.khu.ac.kr/kor/user/bbs/BMSR00040/list.do?menuNo=200316",
    imgSrc: "images/notice.png",
  },
  {
    name: "장학처",
    url: "https://janghak.khu.ac.kr/janghak/user/main/view.do",
    imgSrc: "images/scholarship.png",
  },
  { name: "웹메일", url: "https://mail.khu.ac.kr", imgSrc: "images/mail.png" },
  {
    name: "현장실습",
    url: "https://intern.khu.ac.kr",
    imgSrc: "images/intern.png",
  },
  {
    name: "도서관",
    url: "https://lib.khu.ac.kr",
    imgSrc: "images/library.png",
  },
  {
    name: "수강신청",
    url: "https://sugang.khu.ac.kr",
    imgSrc: "images/sugang.png",
  },
  {
    name: "ChatKHU",
    url: "https://chat.khu.ac.kr/",
    imgSrc: "images/chatkhu.png",
  },
];

// 2. LOGIC: UI 생성 및 기능 함수들
const App = {
  // 개별 카드 아이템(HTML 요소)을 만드는 함수
  createCardItem(item, index) {
    const el = document.createElement("div");
    el.className = "grid-item";

    if (index === 0) {
      el.classList.add("wide");
    }

    // 이미지 세팅
    const img = document.createElement("img");
    img.src = item.imgSrc;
    img.alt = item.name;
    // 이미지 로드 실패 시 기본 아이콘 처리
    img.onerror = () => {
      img.src = "icons/icon48.png";
    };

    // 텍스트 세팅
    const span = document.createElement("span");
    span.textContent = item.name;

    // 조립
    el.appendChild(img);
    el.appendChild(span);

    // 클릭 이벤트
    el.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        // 좌클릭: 새 탭 열고 바로 이동
        chrome.tabs.create({ url: item.url, active: true });
      } else if (e.button === 1) {
        // 휠클릭: 새 탭 열되 현재 창 유지
        e.preventDefault();
        chrome.tabs.create({ url: item.url, active: false });
      }
    });

    return el;
  },

  // 전체 리스트를 화면에 그리는 함수
  render() {
    const gridContainer = document.getElementById("grid-container");

    // 기존 내용 초기화
    gridContainer.innerHTML = "";

    // DocumentFragment를 사용해 렌더링 성능 최적화
    const fragment = document.createDocumentFragment();

    SITE_LIST.forEach((item, index) => {
      const card = this.createCardItem(item, index);
      fragment.appendChild(card);
    });

    gridContainer.appendChild(fragment);
  },
};

// 3. INIT: 실행 진입점
document.addEventListener("DOMContentLoaded", () => {
  App.render();
});

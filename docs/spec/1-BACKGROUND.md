# 1. 배경

LinKHU가 무엇인지, 어떤 문제를 어떻게 푸는지, 제품 범위가 어디까지인지 고정한다. 기술 스택과 디렉터리 구조도 함께 다룬다.

```text
§1-1   제품 정의         한 줄 정의와 배포 형태
§1-2   문제와 가치       해결하려는 불편과 그 대가
§1-3   범위             하는 것과 하지 않는 것
§1-4   기술 스택         런타임, 매니페스트, 대상 브라우저, 개발 도구
§1-5   저장소 구조       디렉터리별 책임
§1-6   공통 용어         문서 전체가 공유하는 어휘
```

## 1-1 제품 정의

LinKHU는 경희대학교 구성원이 자주 쓰는 교내 웹서비스로 한 번의 클릭으로 이동하도록 돕는 **브라우저 확장 프로그램**이다.

브라우저 툴바 아이콘을 누르면 팝업이 열리고, 사용자가 미리 골라 둔 바로가기가 격자로 표시된다. 설정 페이지에서 어떤 서비스를 담을지와 순서를 직접 정한다.

배포 형태는 세 가지다.

- Chrome Web Store
- Firefox Add-ons
- Naver Whale Store

GitHub Pages에는 소개용 랜딩 페이지도 있다. 랜딩은 확장 프로그램의 부속물이지 독립된 서비스가 아니다.

## 1-2 문제와 가치

경희대학교의 학사·학습·생활 서비스는 여러 도메인에 흩어져 있다. 인포21, e-Campus, 수강신청, 단과대·학과 홈페이지의 주소가 모두 다르다. 학과 홈페이지는 학생이 직접 검색해야 할 때가 많다.

LinKHU가 만드는 가치는 두 가지다.

1. **탐색 비용 제거** — 즐겨찾기를 직접 정리하거나 매번 검색하지 않아도, 학과까지 포함한 목록에서 골라 담아 쓴다. 2026-09-01 기준 167개 서비스를 담고 있다 (주제 카테고리 72, 단과대 26, 학과 69).
2. **개인화** — 전공과 학년에 따라 필요한 서비스가 다르므로, 전체 목록을 그대로 노출하지 않고 사용자가 고른 것만 팝업에 보여준다.

## 1-3 범위

### 하는 것

| 하는 것 | 어디서 |
| --- | --- |
| 교내 웹서비스 바로가기 목록 제공과 개인별 선택·정렬 | 팝업, 설정 |
| 이름·id·카테고리로 검색 | 팝업, 설정, 랜딩 |
| 브라우저 단축키로 팝업 열기 | 팝업 |
| 새 버전 안내 (GitHub 최신 릴리스와 현재 버전 비교) | 팝업 |
| 문의 보내기 | 팝업, 설정, 랜딩 |
| 지원 서비스 목록 소개 | 랜딩 |

### 하지 않는 것

| 하지 않는 것 | 무슨 뜻인가 | 왜 |
| --- | --- | --- |
| 로그인·인증 대행 | 사용자를 대신해 로그인하지 않는다 | 각 서비스의 인증은 해당 사이트에서 이뤄진다 |
| 교내 데이터 크롤링·중계 | 공지·성적·식단 같은 콘텐츠를 가져오지 않는다 | 이동만 시킨다 |
| 사용자 행동 수집 | 분석 SDK, 텔레메트리, 원격 로그가 없다 | 최소 권한 |
| 계정 기반 동기화 | 설정은 브라우저 로컬 저장소에만 남는다 | 서버가 없다 |
| 경희대학교 공식 서비스 지위 | 공식 산출물이 아니다 | 공식 색상을 쓰되 대학을 사칭하지 않는다 |

**이 표를 넘어서는 기능은 제품 정체성의 문제다**. 특히 "하지 않는 것"을 하려면 권한이 늘거나 서버가 생긴다. 시작하기 전에 DECISIONS에 결정을 남긴다.

## 1-4 기술 스택

### 런타임

빌드 단계가 없는 **정적 HTML/CSS/JavaScript**다. 번들러, 트랜스파일러, 프레임워크를 쓰지 않는다. `src/`의 파일이 그대로 확장 프로그램에 들어간다. 각 스크립트는 전역 객체를 노출하고 HTML의 `<script>` 순서로 결합한다.

Node.js는 실행 런타임이 아니라 **개발 도구**로만 쓴다. 검증·생성·패키징 스크립트가 `scripts/`에 있고, 테스트는 Node 내장 러너를 쓴다.

런타임과 개발 도구 모두 **의존성이 없다.**

### 매니페스트와 권한

Manifest V3를 쓴다. 요청 권한은 다음이 전부다.

| 항목 | 값 | 용도 |
| --- | --- | --- |
| `permissions` | `storage` | 사용자가 고른 바로가기 순서와 버전 캐시 저장 |
| `host_permissions` | `https://api.github.com/repos/kangkyunghyun/LinKHU/releases/latest` | 최신 릴리스 버전 조회 |

`tabs` 권한은 요청하지 않는다. 탭 열기에 쓰는 `chrome.tabs.create` / `chrome.tabs.update`는 별도 권한 없이 동작한다.

팝업을 여는 단축키는 매니페스트에 **제안값으로** 등록한다.

| 항목 | 값 |
| --- | --- |
| 기본 조합 | `Ctrl+Shift+L` (macOS `Command+Shift+L`) |
| 성격 | **제안일 뿐 등록이 보장되지 않는다** |

다른 프로그램이 이미 쓰는 조합이면 등록되지 않고, 확장이 그 조합을 빼앗을 수도 없다.

### 대상 브라우저

| 브라우저 | 비고 |
| --- | --- |
| Chrome | Chrome Web Store 배포 |
| Firefox | `browser_specific_settings.gecko`로 `strict_min_version` 140.0 지정, `data_collection_permissions.required`를 `["none"]`으로 선언 |
| Whale | Chromium 기반, Chrome용 패키지를 사용 |

### 개발 도구

| 명령 | 역할 |
| --- | --- |
| `npm test` | `node --test`로 `tests/` 실행 |
| `npm run validate:data` | `src/data.js` 스키마·무결성 검증 |
| `npm run generate:landing-data` | 랜딩 검색 데이터와 아이콘 생성 |
| `npm run validate:landing-data` | 위 산출물이 최신인지 확인 (`--check`) |
| `npm run validate:release` | 태그와 매니페스트 버전 대조 |
| `npm run package` | `dist/linkhu-v{version}.zip` 생성 |
| `npm run build` | 위 검증을 묶어 실행 (test → validate:data → validate:dark-icons → validate:landing-data → package) |

CI는 Node.js 22를 쓴다.

## 1-5 저장소 구조

```text
src/            확장 프로그램 소스. 이 폴더 전체가 패키징 대상이다.
  manifest.json     MV3 매니페스트
  popup.html/css/js 팝업 화면
  options.html/css/js 설정 화면
  theme.css         디자인 토큰 (색상 SSOT)
  theme.js          테마 모드 해석·저장·적용
  data.js           지원 서비스 목록 (단일 소스)
  shared.js         팝업·설정 공용 검색/정렬 유틸
  version.js        현재 버전 표시와 업데이트 안내
  feedback.js       문의 폼 전송
  icons/            확장 아이콘 (16/48/128)
  images/           서비스 아이콘 (common/colleges/departments)

landing/        GitHub Pages로 서빙되는 랜딩
  index.html, landing.css, landing.js   랜딩 페이지
  assets/services.json                  data.js에서 생성된 랜딩 검색 데이터
  assets/images/                        src/images/에서 복사된 서비스 아이콘

assets/icons/   아이콘 SVG 원본
docs/           프로젝트 문서
  spec/         이 스펙 문서 + DECISIONS.md
  copy/         스토어·커뮤니티 문구
  releases/     버전별 릴리스 노트

scripts/        검증·생성·패키징 스크립트 (Node.js)
tests/          node --test 대상 테스트
```

`dist/`는 패키징 산출물이며 버전 관리 대상이 아니다.

## 1-6 공통 용어

| 용어 | 뜻 |
| --- | --- |
| **서비스(Service)** | LinKHU가 바로가기를 제공하는 교내 웹사이트 하나. 지원 서비스 목록의 항목 하나다. |
| **카테고리(Category)** | 서비스 분류. `학사·포털`, `생활·복지`, `장학·진로·창업`, `교육·역량`, `캠퍼스·문화`, `대학·행정`, `단과대`, `학과` 여덟 가지만 허용한다. |
| **내 바로가기** | 사용자가 팝업에 표시하려고 직접 고르고 정렬한 서비스들. |
| **기본 목록** | 사용자가 아직 아무것도 고르지 않았을 때 쓰는 열 개. 카테고리와 별개의 개념이다. |
| **팝업(Popup)** | 툴바 아이콘을 눌렀을 때 열리는 `popup.html` 화면. |
| **설정 페이지(Options)** | `options.html`. 탭으로 열린다(`open_in_tab: true`). |
| **랜딩(Landing)** | GitHub Pages로 서빙되는 `landing/index.html` 소개 페이지. |
| **디자인 토큰(Design Token)** | `src/theme.css`의 `:root` CSS 변수. 색상 값의 단일 소스다. |

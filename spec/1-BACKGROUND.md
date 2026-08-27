# 1. 배경

이 문서는 LinKHU가 무엇이고, 어떤 문제를 어떤 방식으로 푸는지, 그리고 어디까지가 이 제품의 범위인지를 고정한다. 뒤따르는 모든 문서는 여기서 정의한 범위와 용어를 전제로 한다.

기술 스택과 디렉터리 구조도 여기에 둔다. 구현 세부는 [3-1 아키텍처](3-1-DESIGN-SOFTWARE-ARCHITECTURE.md)에서 다루고, 이 문서는 "무엇 위에 서 있는가"까지만 기술한다.

```text
§1-1   제품 정의         한 줄 정의와 배포 형태
§1-2   문제와 가치       해결하려는 불편과 그 대가
§1-3   범위             하는 것과 하지 않는 것
§1-4   기술 스택         런타임, 매니페스트, 대상 브라우저, 개발 도구
§1-5   저장소 구조       디렉터리별 책임
§1-6   공통 용어         문서 전체가 공유하는 어휘
§1-7   검토 중인 범위 확장  아직 확정되지 않은 방향
```

## 1-1 제품 정의

LinKHU는 경희대학교 구성원이 자주 쓰는 교내 웹서비스로 한 번의 클릭으로 이동하게 해주는 **브라우저 확장 프로그램**이다.

브라우저 툴바 아이콘을 누르면 팝업이 열리고, 사용자가 미리 골라 둔 바로가기가 격자로 표시된다. 설정 페이지에서 어떤 서비스를 담을지와 순서를 직접 정한다.

배포 형태는 세 가지다.

- Chrome Web Store
- Firefox Add-ons
- Naver Whale Store

여기에 더해 GitHub Pages로 제공하는 소개용 랜딩 페이지가 있다. 랜딩은 확장 프로그램의 부속물이며, 그 자체가 서비스는 아니다.

## 1-2 문제와 가치

경희대학교의 학사·학습·생활 서비스는 여러 도메인에 흩어져 있다. 인포21, e-Campus, 수강신청, 단과대·학과 홈페이지가 각각 다른 주소를 쓰고, 학과 홈페이지는 학생이 검색으로 찾아가야 하는 경우가 많다.

LinKHU가 만드는 가치는 두 가지다.

1. **탐색 비용 제거** — 즐겨찾기를 직접 정리하거나 매번 검색하지 않아도, 학과까지 포함한 목록에서 골라 담아 쓴다. 2026-07-30 기준 117개 서비스를 담고 있다 (주제 카테고리 23, 단과대 26, 학과 68).
2. **개인화** — 전공과 학년에 따라 필요한 서비스가 다르므로, 전체 목록을 그대로 노출하지 않고 사용자가 고른 것만 팝업에 보여준다.

## 1-3 범위

### 하는 것

- 교내 웹서비스 바로가기 목록 제공과 개인별 선택·정렬
- 팝업 검색 (이름, id, 카테고리)
- 브라우저 단축키로 팝업 열기
- 새 버전 안내 (GitHub 최신 릴리스와 현재 버전 비교)
- 확장과 랜딩에서 문의 보내기
- 지원 서비스 목록을 소개하는 랜딩 페이지

### 하지 않는 것

- **로그인·인증 대행** — LinKHU는 사용자를 대신해 로그인하지 않는다. 각 서비스의 인증은 해당 사이트에서 이뤄진다.
- **교내 서비스 데이터 크롤링·중계** — 공지, 성적, 식단 같은 콘텐츠를 가져오지 않는다. 이동만 시킨다.
- **사용자 행동 수집** — 분석 SDK, 텔레메트리, 원격 로그가 없다. 근거는 [3-3 결정 기록](3-3-DESIGN-DECISIONS.md)을 참고한다.
- **계정 기반 동기화** — 설정은 브라우저 로컬 저장소에만 남는다. 서버가 없다.
- **경희대학교 공식 서비스 지위** — LinKHU는 공식 산출물이 아니다. 공식 색상을 쓰되([3-2 UI 규칙](3-2-DESIGN-UI-RULES.md)), 대학을 사칭하지 않는다.

## 1-4 기술 스택

### 런타임

빌드 단계가 없는 **정적 HTML/CSS/JavaScript**다. 번들러, 트랜스파일러, 프레임워크를 쓰지 않는다. `src/`의 파일이 그대로 확장 프로그램에 들어간다. 각 스크립트는 전역 객체(`MASTER_SITE_LIST`, `LinKHUShared`, `VersionManager`, `Feedback`)를 노출하고 HTML의 `<script>` 순서로 결합한다.

Node.js는 실행 런타임이 아니라 **개발 도구**로만 쓴다. 검증·생성·패키징 스크립트가 `scripts/`에 있고, 테스트는 Node 내장 테스트 러너(`node --test`)를 쓴다. 런타임 의존성과 개발 의존성 모두 없다 — `package.json`에 `dependencies`가 없다.

### 매니페스트와 권한

Manifest V3를 쓴다. 요청 권한은 다음이 전부다.

| 항목 | 값 | 용도 |
| --- | --- | --- |
| `permissions` | `storage` | 사용자가 고른 바로가기 순서와 버전 캐시 저장 |
| `host_permissions` | `https://api.github.com/repos/kangkyunghyun/LinKHU/releases/latest` | 최신 릴리스 버전 조회 |

`tabs` 권한은 요청하지 않는다. 탭 열기에 쓰는 `chrome.tabs.create` / `chrome.tabs.update`는 별도 권한 없이 동작한다.

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
| `npm run build` | 위 검증을 묶어 실행 (test → validate:data → validate:landing-data → package) |

CI는 Node.js 22를 쓴다.

## 1-5 저장소 구조

```text
src/            확장 프로그램 소스. 이 폴더 전체가 패키징 대상이다.
  manifest.json     MV3 매니페스트
  popup.html/css/js 팝업 화면
  options.html/css/js 설정 화면
  theme.css         디자인 토큰 (색상 SSOT)
  theme.js          테마 모드 해석·저장·적용
  data.js           MASTER_SITE_LIST — 지원 서비스 단일 소스
  shared.js         팝업·설정 공용 검색/정렬 유틸
  version.js        현재 버전 표시와 업데이트 안내
  feedback.js       문의 폼 전송
  icons/            확장 아이콘 (16/48/128)
  images/           서비스 아이콘 (common/colleges/departments)

docs/           GitHub Pages로 서빙되는 랜딩 + 운영 문서
  index.html, landing.css, landing.js   랜딩 페이지
  assets/services.json                  data.js에서 생성된 랜딩 검색 데이터
  assets/images/                        src/images/에서 복사된 서비스 아이콘
  *.md                                  릴리스·배포·아이콘 운영 문서

scripts/        검증·생성·패키징 스크립트 (Node.js)
tests/          node --test 대상 테스트
release-notes/  버전별 릴리스 노트
spec/           이 스펙 문서
```

`dist/`는 패키징 산출물이며 버전 관리 대상이 아니다.

## 1-6 공통 용어

| 용어 | 뜻 |
| --- | --- |
| **서비스(Service)** | LinKHU가 바로가기를 제공하는 교내 웹사이트 하나. `MASTER_SITE_LIST`의 항목 하나에 대응한다. |
| **`MASTER_SITE_LIST`** | `src/data.js`에 정의된 지원 서비스 전체 배열. 서비스 정보의 단일 소스다. |
| **카테고리(Category)** | 서비스 분류. `학사·포털`, `생활·복지`, `장학·진로·창업`, `교육·역량`, `캠퍼스·문화`, `대학·행정`, `단과대`, `학과` 여덟 가지만 허용한다. 목록의 단일 소스는 `src/data.js`의 `SITE_CATEGORIES`다. |
| **내 바로가기(userOrder)** | 사용자가 팝업에 표시하려고 고른 서비스 id 배열. `chrome.storage.local`의 `userOrder` 키에 저장한다. |
| **기본 목록(default list)** | `userOrder`가 없을 때 쓰는 서비스 목록. `LinKHUShared.DEFAULT_SITE_IDS`에 적힌 10개를 이름 가나다순으로 사용한다. 카테고리와 별개의 개념이다. |
| **팝업(Popup)** | 툴바 아이콘을 눌렀을 때 열리는 `popup.html` 화면. |
| **설정 페이지(Options)** | `options.html`. 탭으로 열린다(`open_in_tab: true`). |
| **랜딩(Landing)** | GitHub Pages로 서빙되는 `docs/index.html` 소개 페이지. |
| **디자인 토큰(Design Token)** | `src/theme.css`의 `:root` CSS 변수. 색상 값의 단일 소스다. [3-2](3-2-DESIGN-UI-RULES.md) 참고. |

## 1-7 검토 중인 범위 확장

**상태: 구상 단계.** 확정된 계획이 아니며 코드가 없다. 여기 적는 이유는 §1-3의 범위와 어떤 관계인지를 미리 정해두기 위해서다.

### 팝업 하단 배너

교내 동아리나 재학생이 만든 서비스를 팝업 하단에 소개하는 기능이 구상 중이다. LinKHU가 학생 사용자에게 닿는 경로라는 점을 활용하는 방향이다.

확정 전까지 지켜야 할 것은 다음이다.

- **외부 공지·홍보에서 이 기능을 예정된 것으로 말하지 않는다** (MUST). 구현되지 않은 기능을 알리면 약속이 되고, 무산되면 신뢰를 잃는다. 릴리스 공지 규칙은 [7-DEPLOYMENT](7-DEPLOYMENT.md)에 있다.
- 착수한다면 §1-3의 "하지 않는 것"과 충돌하는지 먼저 판단한다 (MUST). 특히 노출·클릭 집계가 필요해지는 순간 [3-3의 최소 권한 결정](3-3-DESIGN-DECISIONS.md)과 정면으로 부딪힌다. 집계 없이 운영할 수 있는 형태인지가 착수 조건이다.
- 팝업은 320px 폭의 도구 화면이다. 배너가 바로가기 조작을 밀어내면 안 된다 ([3-2](3-2-DESIGN-UI-RULES.md)).

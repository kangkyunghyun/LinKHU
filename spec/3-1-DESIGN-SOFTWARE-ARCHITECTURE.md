# 3-1. 소프트웨어 아키텍처

이 문서는 LinKHU가 어떤 조각으로 나뉘고 그 조각들이 어떻게 연결되는지를 기술한다. 빌드 단계가 없기 때문에 "모듈 그래프"가 아니라 **HTML의 스크립트 로드 순서와 전역 객체**가 결합 방식이다. 이 특성을 모르면 파일을 옮기거나 `import`를 도입하려다 화면을 깨뜨린다.

핵심 흐름은 하나다. `src/data.js`가 서비스 정보의 단일 소스이고, 랜딩이 쓰는 데이터는 여기서 **생성된 파생물**이다. 손으로 고치는 순간 두 곳이 어긋난다.

```text
§3-1-1   3개 화면            popup, options, landing의 경계
§3-1-2   스크립트 결합 방식     전역 객체와 로드 순서
§3-1-3   공용 유틸            shared.js가 보장하는 것
§3-1-4   저장소              chrome.storage.local 사용 규칙
§3-1-5   데이터 파생 흐름      data.js에서 랜딩까지
§3-1-6   외부 통신           GitHub API와 Google Forms
```

## 3-1-1 3개 화면

| 화면 | 진입점 | 실행 환경 | 역할 |
| --- | --- | --- | --- |
| 팝업 | `src/popup.html` | 확장 팝업 | 내 바로가기 표시, 검색, 이동 |
| 설정 | `src/options.html` | 탭 (`open_in_tab: true`) | 내 바로가기 선택과 정렬 |
| 랜딩 | `docs/index.html` | GitHub Pages | 제품 소개, 지원 서비스 검색 |

팝업과 설정은 확장 컨텍스트에서 실행되므로 `chrome.*` API를 쓴다. 랜딩은 **일반 웹페이지**이므로 `chrome.*`를 쓸 수 없고 확장의 파일도 참조할 수 없다.

이 경계가 아키텍처의 가장 중요한 제약이다. 확장과 랜딩은 코드를 공유할 수 없고, **같은 규칙을 각자 구현한 뒤 테스트로 일치를 강제**한다. 백그라운드 스크립트나 서비스 워커는 없다. 모든 로직이 화면 스크립트 안에 있다.

## 3-1-2 스크립트 결합 방식

번들러가 없으므로 각 스크립트는 전역 객체를 노출하고, HTML이 순서대로 로드해 결합한다.

```text
popup.html    data.js → shared.js → version.js → feedback.js → popup.js
options.html  data.js → shared.js → feedback.js → options.js
```

| 파일 | 노출하는 전역 | 책임 |
| --- | --- | --- |
| `data.js` | `MASTER_SITE_LIST` | 지원 서비스 배열 |
| `shared.js` | `LinKHUShared` | 검색 정규화·점수·정렬, 기본 순서 |
| `version.js` | `VersionManager` | 현재 버전 표시, 최신 릴리스 비교, 스토어 링크 |
| `feedback.js` | `Feedback` + `initFeedbackForm` | 문의 폼 전송과 화면 와이어링 |
| `popup.js` / `options.js` | (없음) | 각 화면의 진입점 |

**의존 대상은 반드시 자신보다 먼저 로드되어야 한다** (MUST). `popup.js`는 `MASTER_SITE_LIST`와 `LinKHUShared`가 이미 정의되어 있다고 가정하고 실행된다.

`shared.js`, `version.js`, `feedback.js`, `docs/landing.js`는 끝에 `module.exports` 가드를 둔다. 브라우저에서는 무시되고 Node 테스트에서는 `require`로 불러올 수 있게 하기 위한 장치다 (MUST). 새 공용 모듈을 추가할 때도 같은 패턴을 따른다.

문의 폼은 팝업과 설정이 **같은 요소 id를 쓴다**. `feedback.js`가 `DOMContentLoaded`에서 한 번 와이어링하므로, 각 화면이 따로 구현하지 않는다.

## 3-1-3 공용 유틸

`LinKHUShared`(`src/shared.js`)는 팝업과 설정이 함께 쓰는 검색·정렬 규칙을 담는다.

| 함수 | 보장하는 것 |
| --- | --- |
| `normalize(value)` | `ko-KR` 기준 소문자화 + 모든 공백 제거 |
| `matchesSearch(site, q)` | 이름·id·카테고리 중 하나라도 포함하면 참 |
| `scoreSite(site, q)` | 0~4 점수. 낮을수록 상위. 해당 없으면 `Infinity` |
| `rankSites(sites, q)` | 점수 오름차순, 동점이면 원본 배열 순서 유지 |
| `getDefaultOrder(list)` | `공통` 카테고리 서비스의 id 배열 |

`rankSites`는 동점 처리에 원본 인덱스를 쓴다 (MUST). 정렬이 안정적이지 않으면 같은 검색어에 결과 순서가 달라진다.

랜딩의 `docs/landing.js`는 같은 규칙을 `normalizeSearchText`, `scoreService`, `searchServices`로 따로 구현한다. **검색 규칙을 바꿀 때는 양쪽을 함께 바꿔야 한다** (MUST). 두 구현의 결과 일치는 테스트로 고정되어 있다 ([5-TESTING](5-TESTING.md) 참고).

## 3-1-4 저장소

`chrome.storage.local`만 쓴다. `sync`는 쓰지 않는다.

| 키 | 값 | 쓰는 곳 |
| --- | --- | --- |
| `userOrder` | 서비스 id 배열 | 설정에서 저장, 팝업·설정에서 읽음 |
| `latestReleaseVersion` | 최신 릴리스 버전 문자열 | `version.js` |
| `latestReleaseVersionTime` | 위 값의 조회 시각(ms) | `version.js` |

규칙은 다음과 같다.

- 저장은 **설정 페이지의 저장 버튼**에서만 일어난다 (MUST). 드래그 도중에 저장하지 않는다. 되돌릴 수 있는 조작과 확정을 분리하기 위해서다.
- 저장 실패는 `chrome.runtime.lastError`로 확인하고 사용자에게 알린다 (MUST).
- 읽을 때 값이 없으면 `getDefaultOrder(MASTER_SITE_LIST)`로 폴백한다 (MUST). 저장소가 비어 있다고 빈 화면을 보여주지 않는다.
- `userOrder`에 들어 있지만 `MASTER_SITE_LIST`에 없는 id는 렌더링 단계에서 걸러낸다 (MUST). 서비스가 삭제된 뒤에도 기존 사용자 설정이 깨지지 않아야 한다.

팝업 렌더링은 `chrome.storage.local.get` 콜백 안에서 이뤄지는 비동기 흐름이다. 검색어를 빠르게 입력하면 이전 요청의 콜백이 나중에 도착할 수 있으므로, 렌더 토큰으로 최신 요청만 반영한다 (MUST).

## 3-1-5 데이터 파생 흐름

```text
src/data.js  (MASTER_SITE_LIST — 단일 소스)
      │
      ├── src/popup.js, src/options.js        직접 참조 (전역)
      │
      └── npm run generate:landing-data
              ├── docs/assets/services.json    id·name·url·category·imgSrc 직렬화
              └── docs/assets/images/**        src/images/의 사용 중인 아이콘 복사
                        │
                        └── docs/landing.js    fetch("assets/services.json")
```

- `docs/assets/services.json`과 `docs/assets/images/`는 **생성물이다. 직접 수정하지 않는다** (MUST).
- 생성 스크립트는 사용 중인 아이콘만 복사하고, 더 이상 쓰이지 않는 복사본은 삭제한다.
- `npm run validate:landing-data`(`--check`)가 산출물이 최신인지 검사하며, `npm run build`에 포함되어 있다. 데이터를 바꾸고 생성을 잊으면 CI가 막는다.

랜딩은 검색어가 없을 때 `DEFAULT_SERVICE_IDS`(`info21`, `ecampus`, `sugang`) 세 개를 보여주고, 검색 결과는 최대 5개로 제한한다. 이 값들은 랜딩 전용 표시 규칙이며 확장 팝업과 무관하다.

## 3-1-6 외부 통신

LinKHU가 네트워크를 쓰는 곳은 두 군데뿐이다.

| 대상 | 목적 | 실패 시 |
| --- | --- | --- |
| `https://api.github.com/repos/kangkyunghyun/LinKHU/releases/latest` | 최신 릴리스 버전 조회 | 캐시된 값 사용, 없으면 안내 미표시 |
| Google Forms `formResponse` | 문의 전송 | 사용자에게 실패 문구 표시 |

- GitHub 조회는 12시간 캐싱한다 (MUST). rate limit에 걸리면 모든 사용자의 버전 안내가 동시에 실패한다.
- 문의 전송은 Google Forms가 CORS 응답 헤더를 주지 않으므로 `mode: "no-cors"`로 보낸다. 응답 본문을 읽을 수 없으므로 **네트워크 오류가 없으면 전송된 것으로 간주한다**. 이 한계를 전제로 성공 문구를 정한다.
- 두 통신 모두 실패가 화면 사용을 막지 않아야 한다 (MUST).

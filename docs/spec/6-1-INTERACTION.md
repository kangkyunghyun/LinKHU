# 6-1. 인터랙션

이 문서는 화면이 **입력을 받아 화면을 다시 그리기까지 어떤 단계를 밟는지**를 고정한다. 설계([4-x](4-3-SOFTWARE-ARCHITECTURE.md))가 조각과 상태를 정했다면, 여기는 그 조각들이 실제로 어떤 순서로 불리는지를 적는다. 구현을 고칠 때 순서를 건너뛰거나 바꾸면 깨지는 지점이 여기 있다.

사용자가 **무엇을 기대하는지**는 [2-1](2-1-USER-STORIES.md)이 원본이다. 여기서 반복하지 않고, 그 기대를 만드는 **실행 순서**만 적는다.

```text
§6-1-1   팝업 렌더          진입에서 카드까지
§6-1-2   검색 입력 처리       입력에서 재렌더까지
§6-1-3   이동 처리           세 입력의 분기
§6-1-4   설정 저장           드래그에서 저장까지
§6-1-5   테마 적용           첫 페인트 전에 끝낸다
§6-1-6   단축키 안내          두 번의 비동기 확인
```

## 6-1-1 팝업 렌더

```text
DOMContentLoaded
   ↓
renderToken = ++state.renderToken        토큰 발급
   ↓
chrome.storage.local.get(["userOrder"])
   ↓
if (renderToken !== state.renderToken) return    낡은 콜백 폐기
   ↓
userOrder ?? getDefaultOrder(MASTER_SITE_LIST)   없으면 기본 목록
   ↓
id → 서비스 해석, 없는 id 제외, 중복 id 1회만
   ↓
카드 조립 (cardDisplayName으로 줄바꿈 삽입)
   ↓
grid-container 교체
```

- **토큰 발급이 `get` 호출보다 먼저다** (MUST). 순서가 뒤집히면 같은 토큰을 두 요청이 나눠 갖는다.
- **콜백 진입부에서 토큰을 확인하고 즉시 반환한다** (MUST). 이 가드가 없으면 검색어를 빠르게 칠 때 늦게 도착한 이전 결과가 최신 화면을 덮는다. 배경은 [4-4-5](4-4-STATE.md)에 있다.
- 없는 id 제외와 중복 제거는 **렌더 단계에서** 한다 (MUST). 저장소의 값을 고쳐 쓰지 않는다 — 사용자가 하지 않은 쓰기가 일어나면 안 된다.

## 6-1-2 검색 입력 처리

```text
input 이벤트
   ↓
검색어가 비었나? → 예: userOrder 기준으로 §6-1-1 재실행
   ↓ 아니오
LinKHUShared.normalize(검색어)                 소문자화 + 공백 제거
   ↓
LinKHUShared.rankSites(MASTER_SITE_LIST, q)    전체가 대상
   ↓
0건이면 empty-message 노출, 아니면 격자 교체
```

- **검색 대상은 `userOrder`가 아니라 전체다** (MUST). 근거는 [3-3](3-INFORMATION-ARCHITECTURE.md)에 있다.
- `Enter`는 첫 결과를 **현재 탭**에서 연다. 한글 입력 조합 중(`isComposing`)에는 동작하지 않아야 한다 (MUST). 조합 확정용 `Enter`가 링크를 열어버리면 글자를 지우고 다시 쳐야 한다.
- `/` 키는 검색창으로 포커스를 옮긴다. 입력 요소 안이거나 조합 키가 눌린 상태면 동작하지 않는다 (MUST).
- 숫자 `1`~`9`는 해당 자리 카드를 연다. 입력 요소에 포커스가 있거나 `Ctrl`/`Alt`/`Cmd`가 함께 눌렸거나 키가 눌린 채 반복 중이면 동작하지 않는다 (MUST). 검색어에 숫자를 칠 수 없게 되면 안 된다.

## 6-1-3 이동 처리

카드는 `<a href>`로 만들되 **기본 동작을 막고 확장 API로 연다** (MUST). 팝업 안에서 링크가 그대로 열리면 팝업 화면 자체가 이동해버린다.

| 이벤트 | 조건 | 호출 | 팝업 |
| --- | --- | --- | --- |
| `click` | 수식 키 없음 | `chrome.tabs.create({ active: true })` | 닫힌다 |
| `click` | `Ctrl`/`Cmd`/`Shift` | `chrome.tabs.create({ active: false })` | 유지 |
| `auxclick` | 휠(가운데) | `chrome.tabs.create({ active: false })` | 유지 |

- `auxclick`을 쓴다 (MUST). 휠 클릭은 `click`으로 오지 않는다.
- `href`는 비워두지 않는다. 값이 있어야 hover에서 주소가 보이고 접근성 트리에 링크로 잡힌다.
- 검색 결과에서 `Enter`로 여는 경우만 **현재 탭**을 쓴다(`chrome.tabs.update`). 그 외 경로는 전부 새 탭이다.

## 6-1-4 설정 저장

```text
드래그                              DOM 순서만 바꾼다. 저장하지 않는다
   ↓
저장 버튼 클릭
   ↓
오른쪽 '내 바로가기' 열에서 id 순서를 읽는다     ← 왼쪽 목록/필터는 보지 않는다
   ↓
chrome.storage.local.set({ userOrder })
   ↓
chrome.runtime.lastError 확인
   ↓
성공 알림 / 실패 알림
```

- **저장은 버튼에서만 일어난다** (MUST). 드래그 도중 저장하면 되돌릴 수 있는 조작과 확정이 섞인다.
- **순서는 오른쪽 열의 DOM에서 읽는다** (MUST). 검색어나 카테고리 필터는 왼쪽 목록의 표시에만 영향을 주므로, 필터가 걸린 상태로 저장해도 결과가 같아야 한다.
- 링크에서 시작한 드래그는 취소한다 (MUST). 링크를 끌었을 뿐인데 항목이 딸려가면 안 된다.
- 드래그 중 스크롤 영역 위·아래 가장자리 40px 안으로 포인터가 들어오면 자동 스크롤한다 (MUST). 이 보조가 없으면 학과 69개 목록에서 상단으로 항목을 옮길 수 없다.
- 실패를 조용히 넘기지 않는다 (MUST). 사용자는 저장되었다고 믿고 페이지를 떠난다.

## 6-1-5 테마 적용

```text
<head>에서 theme.js 동기 로드         ← 첫 페인트 전
   ↓
저장된 themeMode 해석 (없으면 system)
   ↓
문서 루트에 테마 표식 적용
   ↓
(이후) 본문 스크립트 로드, 구독 등록
```

- **표식은 첫 페인트 전에 붙어야 한다** (MUST). 본문 뒤로 미루면 라이트로 한 번 그린 뒤 다크로 바뀌는 깜빡임이 보인다. 그래서 `theme.js`만 `<head>` 동기 로드다 ([4-3-2](4-3-SOFTWARE-ARCHITECTURE.md)).
- 구독은 **해지 가능한 다중 구독**이다 (MUST). 팝업의 상태 안내와 설정의 라디오·안내가 모두 구독자이므로, 단일 슬롯이면 나중 등록이 앞 등록을 조용히 덮는다 ([DECISIONS 5-2](DECISIONS.md#d-5-2)).
- 저장 실패 시 화면과 컨트롤을 직전 값으로 되돌린다 (MUST) ([4-4-4](4-4-STATE.md)).

## 6-1-6 단축키 안내

비동기 확인이 **두 번 연달아** 일어난다. 순서를 바꾸면 등록된 사용자에게도 저장소를 읽는 일이 생긴다.

```text
chrome.commands.getAll                      ① 등록 여부
   ↓ 미등록일 때만
chrome.storage.local.get(["shortcutNoticeDismissed"])   ② 닫은 적 있나
   ↓ true가 아닐 때만
헤더 아래 안내 표시
```

- `chrome.commands?.getAll`이 없는 환경이면 **아무것도 하지 않고 반환한다** (MUST). 안내가 없는 것이 잘못된 안내보다 낫다.
- 닫기는 즉시 숨기고 `true`를 저장한다. 저장 실패 시 안내를 되돌리고 `#theme-status`로 알린다 (MUST).
- `설정에서 지정`은 `options.html#shortcut-guide`를 새 탭으로 연다. 브라우저 목록은 설정에만 둔다.
- 근거는 [DECISIONS 3-4](DECISIONS.md#d-3-4)에 있다.

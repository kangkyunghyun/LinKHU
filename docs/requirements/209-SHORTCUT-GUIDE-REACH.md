# 209. 단축키 미등록 안내를 팝업까지 올린다

```text
§209-1   배경
§209-2   만들 것
§209-3   완료 조건
§209-4   관련
```

## 209-1 배경

Aside에서 기존 제안 단축키가 비밀번호 자동입력과 충돌해 등록되지 않았고, 설정 페이지에만 접혀 있는 안내가 사용자에게 닿지 않았다. 브라우저별 이름만 나열한 안내도 지원 범위를 오해하게 했다.

## 209-2 만들 것

- 설정 안내를 접히지 않는 블록으로 바꾸되 미등록 판정과 내부 주소 열기·실패 시 복사 흐름은 유지한다.
- Chrome·Whale·Aside의 내부 주소와 Chromium 주소 규칙, Firefox 관리 경로 및 충돌 원인을 안내한다.
- 미등록이면 팝업 헤더 아래 한 줄 안내, 설정에서 지정 버튼, 닫기 버튼을 표시한다. 등록 여부를 먼저 판정한다.
- 설정 버튼은 options.html#shortcut-guide를 연다. 닫으면 shortcutNoticeDismissed=true를 저장하며 이후 팝업에서 숨긴다.
- 저장 실패 시 배너를 되돌리고 theme-status 상태 줄에 실패를 알린다.
- ADR 3-4와 관련 스펙을 갱신하고 ADR 3-3과 기본 제안키는 보존한다.

## 209-3 완료 조건

- 등록·미등록·닫기 저장·기존 숨김·저장 실패 복구·설정 이동을 자동 테스트로 확인한다.
- 설정 안내가 details가 아니고 Aside 주소를 포함한다.
- npm run build, git diff --check 통과.
- src/의 Aside 주소 검색 1곳 이상, options.html의 details 검색 0개.
- 브라우저 수동 확인은 수행하지 않고 가짜 DOM·chrome API 테스트로 대체했음을 PR에 기록한다.

## 209-4 관련

- 이슈: [#209](https://github.com/kangkyunghyun/LinKHU/issues/209)
- ADR: [3-3](../adr/3-3-SHORTCUT-GUIDANCE-NOT-ENFORCED.md), [3-4](../adr/3-4-SHORTCUT-GUIDE-IN-POPUP.md).
- 설계: 없음. 기존 판정·저장 실패 패턴을 따른다.

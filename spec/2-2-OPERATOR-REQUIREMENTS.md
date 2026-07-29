# 2-2. 운영자 요구사항

이 문서는 메인테이너가 LinKHU를 유지하기 위해 반복적으로 해야 하는 일과, 그 일이 만족해야 할 조건을 정리한다. 사용자에게 보이지 않지만 제품 수명을 결정하는 요구사항이다.

절차 자체는 [`AGENTS.md`](../AGENTS.md)와 [`docs/`](../docs)의 운영 문서가 원본이다. 이 문서는 "무엇이 보장되어야 하는가"를 말하고, "어떤 순서로 실행하는가"는 링크로 넘긴다.

```text
§2-2-1   서비스 데이터 갱신     학교 사이트 변경에 대응
§2-2-2   릴리스               버전 올리고 배포 가능한 상태 만들기
§2-2-3   스토어 배포           3개 스토어 심사 대응
§2-2-4   문의 대응             사용자 의견 수집과 처리
§2-2-5   기여 관리             외부 PR 심사 기준
```

## 2-2-1 서비스 데이터 갱신

교내 웹서비스는 메인테이너의 통제 밖에서 바뀐다. 주소가 바뀌거나, 서비스가 사라지거나, 학과가 신설·통폐합된다. 데이터 갱신은 LinKHU에서 가장 자주 발생하는 운영 작업이다.

- 서비스 정보의 단일 소스는 `src/data.js`의 `MASTER_SITE_LIST`다 (MUST). 다른 곳에 서비스 목록을 복제하지 않는다.
- 데이터를 바꾼 뒤에는 `npm run generate:landing-data`로 랜딩 산출물을 갱신해야 한다 (MUST). 갱신하지 않으면 `npm run build`가 실패한다.
- `npm run validate:data` 결과를 PR 본문에 남긴다 (MUST).
- 필드 규칙과 검증 항목은 [4-DATA](4-DATA.md)에 있다.
- 서비스 아이콘을 추가·변경할 때는 [아이콘 스타일 가이드](../docs/icon-style-guide.md)를 따른다.
- 한 PR에서 너무 많은 아이콘을 한꺼번에 바꾸지 않는다 (SHOULD).

`http://` 주소는 검증에서 오류가 아니라 **경고**로 뜬다. 학교 사이트 중 HTTPS를 지원하지 않는 곳이 남아 있기 때문이다. 경고가 뜨면 HTTPS 지원 여부를 확인하고, 지원하면 바꾸고 아니면 그대로 둔다 (SHOULD).

## 2-2-2 릴리스

- 릴리스 준비 PR에서 `src/manifest.json`의 `version`을 올리고, 같은 PR에 `release-notes/v{version}.md`를 작성한다 (MUST).
- 릴리스 노트는 내부 리팩터링이 아니라 **사용자에게 보이는 변경** 중심으로 쓴다 (MUST).
- 준비 PR이 머지된 뒤 같은 버전 태그를 push한다. 태그 push가 GitHub Release 생성과 ZIP 첨부를 자동으로 처리한다.
- 태그와 매니페스트 버전이 어긋나면 릴리스 워크플로가 실패해야 한다 (MUST). `npm run validate:release`가 이 대조를 담당한다.
- 릴리스 노트 파일이 없으면 릴리스 워크플로가 실패해야 한다 (MUST).

전체 절차는 [Release Process](../docs/release-process.md)를 따른다.

## 2-2-3 스토어 배포

LinKHU는 세 스토어에 배포되며, 각 스토어의 심사 주기와 요구사항이 다르다. 태그 push로 만들어지는 GitHub Release는 배포의 **끝이 아니라 시작**이다.

- 공통 절차는 [Store Release Checklist](../docs/store-release-checklist.md)를 따른다.
- 스토어 설명 원본은 [Store Listing](../docs/store-listing.md)에서 관리하고, 버전마다 업데이트 섹션을 교체한다.
- Chrome Web Store와 Firefox Add-ons는 수동 실행(`workflow_dispatch`) 워크플로로 제출한다. 두 워크플로 모두 실수 방지를 위해 확인 문자열 입력을 요구한다 (MUST). 상세는 [Chrome](../docs/chrome-web-store-automation.md), [Firefox](../docs/firefox-addons-automation.md) 문서를 참고한다.
- Whale Store는 공개 배포 API가 확인되기 전까지 수동 배포를 유지한다. [Whale 절차](../docs/whale-store-automation.md)를 따른다.
- 매니페스트를 바꾼 릴리스는 Chrome·Firefox·Whale 세 곳의 호환성과 권한 범위를 확인한다 (MUST). Firefox는 `strict_min_version`과 데이터 수집 선언이 있어 특히 영향을 받는다.

권한을 새로 추가하는 변경은 세 스토어 모두에서 재심사 사유가 되고 기존 사용자에게 권한 승인 요구가 뜬다. 권한 추가는 [3-3 결정 기록](3-3-DESIGN-DECISIONS.md)의 최소 권한 원칙에 따라 별도 판단 대상이다 (MUST).

## 2-2-4 문의 대응

사용자 의견 경로는 두 가지다.

1. **문의하기 폼** — 팝업·설정·랜딩에 있다. GitHub 계정이 없는 사용자를 위한 경로이며, Google Forms로 수집된다. 연결 설정은 [문의 채널 설정 가이드](../docs/feedback-setup.md)를 따른다.
2. **GitHub Issue** — 개발자와 기여자를 위한 경로다.

- 문의 폼이 설정되지 않은 상태에서도 화면이 깨지지 않아야 한다 (MUST). 설정 여부를 확인해 안내 문구로 처리한다.
- 확장과 랜딩의 문의 전송은 같은 폼·같은 필드를 써야 한다 (MUST). 두 경로가 갈라지면 수집 결과가 나뉜다. 이 일치는 테스트로 고정되어 있다 ([5-TESTING](5-TESTING.md) 참고).

## 2-2-5 기여 관리

LinKHU는 공개 저장소이며 외부 기여를 받는다.

- 모든 변경은 이슈 → 브랜치 → PR 순서를 따른다 ([`AGENTS.md`](../AGENTS.md) 작업 시작 순서).
- PR은 저장소의 PR 템플릿을 사용하고, 검증 결과를 재현 가능하게 적는다 (MUST).
- 기능이 동작하더라도 **제품의 디자인 방향과 어긋나는 PR은 반려할 수 있다** (MAY). 이 판단의 기준은 [3-2 UI 규칙](3-2-DESIGN-UI-RULES.md)이고, 실제 적용 사례는 [3-3 결정 기록](3-3-DESIGN-DECISIONS.md)에 있다.
- 방향이 맞지 않아 반려할 때는 이유와 향후 계획을 남긴다 (SHOULD). 기여자가 무엇이 문제였는지 알 수 있어야 한다.

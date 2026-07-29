# 7. 배포

LinKHU는 네 곳으로 나간다. 세 개 스토어와 GitHub Pages 랜딩이다. 각 경로의 트리거와 자동화 범위가 다르므로, 무엇이 자동이고 무엇이 수동인지 아는 것이 중요하다.

이 문서는 **경로와 경계**만 정한다. 실행 절차는 [`docs/`](../docs)의 운영 문서가 원본이며 여기서 반복하지 않는다.

```text
§7-1   배포 경로 개요      네 경로와 트리거
§7-2   CI 검증            PR과 main에서 도는 검증
§7-3   릴리스             태그 push와 자동화 범위
§7-4   스토어 배포         세 스토어의 자동화 경계
§7-5   랜딩 배포           Pages 자동 배포
§7-6   원본 문서 목록      상세 절차 링크
```

## 7-1 배포 경로 개요

| 경로 | 트리거 | 자동화 |
| --- | --- | --- |
| 검증 | PR, `main` push | 전자동 |
| GitHub Release | `v*.*.*` 태그 push | 전자동 (릴리스 생성 + ZIP 첨부) |
| Chrome Web Store | 수동 실행 | 워크플로 (확인 문자열 필요) |
| Firefox Add-ons | 수동 실행 | 워크플로 (확인 문자열 필요) |
| Whale Store | 수동 | 없음 |
| 랜딩 | `docs/**` 변경이 `main`에 들어올 때 | 전자동 |

## 7-2 CI 검증

PR과 `main` push에서 `npm run build`가 실행된다. 즉 테스트, 데이터 검증, 랜딩 산출물 최신 확인, 패키징이 모두 돈다. 패키징 결과는 아티팩트로 업로드된다.

- 로컬에서 검증을 잊어도 PR에서 걸린다.
- CI는 Node.js 22를 쓴다. 로컬 개발도 같은 계열을 쓴다 (SHOULD).
- CI가 실패하는 PR은 병합하지 않는다 (MUST).

## 7-3 릴리스

릴리스는 **준비 PR**과 **태그 push** 두 단계다.

### 준비 PR

- `src/manifest.json`의 `version`을 올린다 (MUST).
- 같은 PR에 `release-notes/v{version}.md`를 작성한다 (MUST).
- 릴리스 노트는 사용자에게 보이는 변경 중심으로 쓴다 (MUST).

### 태그 push

준비 PR이 머지된 뒤 같은 버전 태그를 push한다. `v*.*.*` 패턴의 태그가 릴리스 워크플로를 발동시킨다.

워크플로는 다음을 검사한 뒤 릴리스를 만든다.

1. 태그가 매니페스트 버전과 일치하는가
2. `npm run build`가 통과하는가
3. `release-notes/v{version}.md`가 존재하는가

**태그 push가 자동화하는 것은 GitHub Release 생성과 ZIP 첨부까지다** (MUST 인지). 스토어 배포는 여기서 일어나지 않는다. 태그를 밀었다고 사용자에게 배포된 것이 아니다.

## 7-4 스토어 배포

### Chrome Web Store / Firefox Add-ons

수동 실행(`workflow_dispatch`) 워크플로로 제출한다. 두 워크플로 모두 버전과 함께 **확인 문자열 입력을 요구한다** (MUST). 실수로 제출이 발동하는 것을 막기 위한 장치이며, 제거하지 않는다.

워크플로는 제출 전에 `npm run build`로 패키지를 다시 만든다. 태그 시점의 아티팩트를 재사용하지 않는다.

### Whale Store

공개 배포 API가 확인되지 않아 **수동 배포를 유지한다**. 자동화 워크플로가 없다.

### 공통

- 세 스토어 모두 심사가 있고 주기가 다르다. 같은 버전이 스토어마다 다른 시점에 공개된다.
- 스토어 설명은 [Store Listing](../docs/store-listing.md)에서 원본을 관리하고, 버전마다 업데이트 섹션을 교체한다 (MUST).
- 권한을 추가한 릴리스는 재심사 대상이며 기존 사용자에게 권한 승인 요구가 뜬다. 권한 변경은 배포 문제가 아니라 제품 결정으로 다룬다 ([3-3](3-3-DESIGN-DECISIONS.md)).

## 7-5 랜딩 배포

`docs/**`가 `main`에 들어오면 GitHub Pages 배포가 자동으로 돈다. `docs` 폴더 전체가 그대로 업로드된다.

- 별도 빌드 단계가 없다. `docs/`의 파일이 곧 배포물이다.
- `docs/assets/services.json`과 `docs/assets/images/`는 생성물이지만 **저장소에 커밋된 상태로 배포된다** (MUST). 생성 스크립트는 CI 배포 단계에서 돌지 않는다. 데이터를 바꾸고 생성을 잊으면 랜딩이 낡은 목록을 보여준다 — 이를 막는 것이 `validate:landing-data`다.
- 랜딩만 바뀌는 변경도 확장 버전을 올릴 필요가 없다. 두 배포 경로는 독립적이다.

## 7-6 원본 문서 목록

| 문서 | 내용 |
| --- | --- |
| [Release Process](../docs/release-process.md) | 릴리스 준비부터 스토어까지 전체 절차 |
| [Store Release Checklist](../docs/store-release-checklist.md) | 스토어 배포 공통 체크리스트 |
| [Store Listing](../docs/store-listing.md) | 스토어 설명 원본 |
| [Chrome Web Store 자동 배포](../docs/chrome-web-store-automation.md) | Chrome 워크플로 사용법 |
| [Firefox Add-ons 자동 배포](../docs/firefox-addons-automation.md) | Firefox 워크플로 사용법 |
| [Whale Store 배포](../docs/whale-store-automation.md) | Whale 수동 절차 |
| [문의 채널 설정](../docs/feedback-setup.md) | Google Form 연결 |

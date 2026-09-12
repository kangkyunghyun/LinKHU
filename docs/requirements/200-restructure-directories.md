# 200. 디렉터리 구조를 정리한다

## 배경

최상위 `design/`(아이콘 SVG 원본)이 #198로 생긴 `docs/design/`(설계 문서)과 이름이 겹친다. `docs/` 바로 아래에 운영 문서 11개가 네 계층 폴더와 섞여 있고, 릴리스 노트는 `docs/` 밖 최상위에 따로 있다. `.vscode/`가 gitignore에 없어 계속 untracked로 뜬다.

## 만들 것

- `design/icons/` → `assets/icons/`. 최상위 `design/` 삭제.
- 운영 절차 문서 8개 → `docs/guides/`. 스토어·커뮤니티 문구 2개 → `docs/copy/`.
- `release-notes/` → `docs/releases/`. 스크립트·워크플로 경로 갱신.
- `supported-services.md`와 `docs/README.md`는 제자리. 외부 blob URL이 가리킨다.
- 모든 문서·스킬·코드 주석·README 트리의 경로 갱신. ADR 본문과 옛 릴리스 노트 본문은 고치지 않는다.
- `.gitignore`에 `.vscode/` 추가.

## 완료 조건

- `npm run build` 통과
- 옛 경로(`design/icons`, `release-notes/`, `docs/<운영문서>.md`)를 참조하는 곳 0개. 예외: `docs/adr/`, `docs/releases/`, `docs/requirements/`, `docs/design/` (당시 기록)
- `git diff --check` 통과
- 다음 태그 push에서 `release.yml`·`publish-firefox.yml`이 `docs/releases/v*.md`를 읽는다 (머지 후 확인)

## 관련

- 이슈: [#200](https://github.com/kangkyunghyun/LinKHU/issues/200)
- ADR: 없음. 구조 결정은 [../adr/0019-four-layer-docs.md](../adr/0019-four-layer-docs.md)의 연장이다.
- 설계: 없음. 경로 치환뿐이라 자명하다.

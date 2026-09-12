# 198. 문서를 requirements·adr·design·spec 4계층으로 개편하고 랜딩을 docs에서 분리한다

## 배경

여러 기능을 병행하다 보면 무엇을 왜 결정했는지 잊는다. 결정이 `spec/3-3` 한 파일에 쌓이고 제자리에서 계속 고쳐져 "그때 왜 그랬는지"가 git log를 뒤져야 나온다. 요구사항은 GitHub 이슈에만 있어 에이전트가 매번 네트워크로 읽어와야 한다.

`docs/`는 GitHub Pages 랜딩과 운영 문서가 섞여 있어 문서 폴더로 쓰기 어렵다.

## 만들 것

- 랜딩(`index.html`, `landing.css`, `landing.js`, `assets/`)을 `docs/`에서 `landing/`으로 옮기고 Pages 워크플로·생성 스크립트·테스트·README 경로를 맞춘다.
- `spec/`을 `docs/spec/`으로 옮긴다. 현재 구조와 동작을 적고 코드와 함께 갱신한다.
- `spec/3-3-DESIGN-DECISIONS.md`의 결정 18건을 `docs/adr/NNNN-*.md`로 한 건씩 분리한다. 작성 후 수정하지 않고, 바뀌면 새 ADR로 대체한다.
- `docs/requirements/`를 만든다. 기능과 완료 조건을 이슈 생성 전에 파일로 쓰고, 구현이 끝나면 수정하지 않는다.
- `docs/design/`을 만든다. 요구사항과 ADR을 바탕으로 한 구현 방법을 적고, 구현이 끝나면 수정하지 않는다.
- `AGENTS.md`·`CLAUDE.md`·`docs/spec/README.md`에 4계층의 역할과 수명 규칙을 반영한다.

## 완료 조건

- `npm run build` 통과 (테스트, 데이터 검증, 랜딩 데이터 검증, 패키징)
- 저장소에서 `docs/landing`, `docs/index.html`, `../spec/`, `3-3-DESIGN-DECISIONS` 문자열을 참조하는 곳 0개 (release-notes와 ADR 출처 표기 제외)
- Pages 워크플로가 `landing/`을 업로드한다
- `git diff --check` 통과

## 관련

- ADR: [../adr/0019-four-layer-docs.md](../adr/0019-four-layer-docs.md)
- 설계: [../design/198-four-layer-docs.md](../design/198-four-layer-docs.md)
- 이슈: [#198](https://github.com/kangkyunghyun/LinKHU/issues/198)

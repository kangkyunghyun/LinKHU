# 198. 문서 4계층 개편과 랜딩 분리

요구사항: [../requirements/198-FOUR-LAYER-DOCS.md](../requirements/198-FOUR-LAYER-DOCS.md)
ADR: [../adr/6-1-FOUR-LAYER-DOCS.md](../adr/6-1-FOUR-LAYER-DOCS.md)

```text
§198-1   바꾸는 파일
§198-2   순서
§198-3   하지 않는 것
§198-4   검증
```

## 198-1 바꾸는 파일

| 파일 | 무엇을 |
|---|---|
| `docs/{index.html,landing.css,landing.js,assets/}` → `landing/` | `git mv`. 랜딩 내부의 상대 경로(`assets/`)는 그대로라 파일 내용은 주석만 바뀐다 |
| `.github/workflows/pages.yml` | 트리거 `paths`와 업로드 `path`를 `landing`으로 |
| `scripts/generate-landing-data.js` | `ASSETS_ROOT`를 `landing/assets`로 |
| `tests/landing-*.test.js`, `tests/shared.test.js` | `require("../landing/landing")`, 파일 경로 |
| `README.md`, `README.en.md` | 스토어 배지·스크린샷 경로, 폴더 트리 |
| `spec/` → `docs/spec/` | `git mv`. 내부 링크 `../docs/x.md` → `../x.md`, `../AGENTS.md` → `../../AGENTS.md` |
| `docs/spec/3-3-DESIGN-DECISIONS.md` → `docs/adr/0001~0018` | `## 3-3-N` 절 단위로 분리. 본문은 그대로 두고 상태·작성일(첫 커밋)·이슈·출처 표를 앞에 붙인다 |
| 스펙·가이드·스킬의 `[3-3](3-3-DESIGN-DECISIONS.md)` 링크 | 가리키는 결정이 특정되면 해당 ADR 파일로, 아니면 `adr/README.md`로 |
| `docs/README.md`, `docs/requirements/README.md`, `docs/design/README.md`, `docs/adr/README.md` | 새로 만든다. 계층의 역할, 수명 규칙, 양식 |
| `AGENTS.md`, `CLAUDE.md` | 작업 시작 순서에 요구사항 파일 단계 추가, 경로 갱신 |

## 198-2 순서

1. 랜딩 이동과 코드·테스트·워크플로 경로 수정 → `npm test`, `npm run validate:landing-data` 통과 확인 → 커밋
2. 스펙 이동과 링크 수정 → 커밋
3. ADR 분리와 링크 재지정, 색인 작성
4. 요구사항·설계 폴더와 이 문서, ADR 6-1
5. AGENTS.md·CLAUDE.md·README 규칙 갱신
6. 검증 후 PR

순서를 이렇게 둔 이유는 1이 유일하게 코드가 움직이는 단계라 테스트로 바로 확인하고 격리해 두기 위해서다. 나머지는 문서만 움직인다.

## 198-3 하지 않는 것

- ADR 본문의 `docs/` 경로를 `landing/`으로 바꾸지 않는다. ADR은 당시 기록이고, 색인에 한 줄로 안내한다.
- 운영 문서(`release-process.md` 등)를 하위 폴더로 옮기지 않는다. 네 계층에 속하지 않고 링크가 많아 이동 이득이 없다.
- 요구사항을 과거 이슈까지 소급해 만들지 않는다. 이 이슈부터 시작한다.

## 198-4 검증

- `npm run build`
- `grep -rn "docs/landing\|docs/index\|docs/assets\|3-3-DESIGN" --include=*.md --include=*.js --include=*.yml --include=*.html --include=*.css . | grep -v release-notes | grep -v "docs/adr/"` → 0줄
- `git diff --check`

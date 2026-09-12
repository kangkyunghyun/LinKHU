# ADR — 설계 결정 기록

LinKHU가 "왜 이렇게 되어 있는가"를 남긴다. 코드를 읽으면 무엇을 했는지는 알 수 있지만, 무엇을 **하지 않기로 했는지**는 알 수 없다. 그 부분이 여기 있다. 기록의 목적은 같은 논쟁을 반복하지 않는 것이다.

## 규칙

- **쓴 뒤 고치지 않는다** (MUST). 결정이 바뀌면 새 번호로 ADR을 추가하고, 옛 ADR의 `상태`만 `NNNN으로 대체됨`으로 바꾼다. 본문은 그대로 둔다. 당시 배경이 남아 있어야 "왜 그때는 그랬는지"를 나중에 읽을 수 있다.
- 설계 방향을 바꾸는 판단(무엇을 채택했고 무엇을 거부했는지)은 구현 PR과 같은 PR에서 ADR로 남긴다 (MUST).
- 각 ADR은 **배경 / 대안 / 결정 / 영향**으로 적는다. 대안에는 거부한 것도 이유와 함께 적는다.
- 현재 동작은 [스펙](../spec/README.md)이 원본이다. ADR은 결정 시점의 기록이라 스펙과 어긋날 수 있으며, 그때는 스펙이 현재다.
- 파일명은 `NNNN-slug.md`, 번호는 마지막 번호 + 1이다.

## 새 ADR 양식

```markdown
# ADR NNNN: 제목

| 항목 | 값 |
|---|---|
| 상태 | 채택 |
| 작성일 | YYYY-MM-DD |
| 이슈 | [#N](https://github.com/kangkyunghyun/LinKHU/issues/N) |
| 요구사항 | [../requirements/N-slug.md](../requirements/N-slug.md) |

**배경**

**대안**

**결정**

**영향**
```

## 목록

0001~0018은 2026-09-13에 옛 `spec/3-3-DESIGN-DECISIONS.md`에서 한 건씩 분리한 것이다. 그 문서를 가리키던 `§3-3-N`은 `ADR 000N`이다. 본문 안의 `docs/` 경로는 당시 랜딩 폴더를 뜻하며 지금은 `landing/`이다.

| 번호 | 결정 | 작성일 |
|---|---|---|
| [0001](0001-buildless-static.md) | 빌드리스 정적 구성 | 2026-07-30 |
| [0002](0002-manifest-v3-single-source.md) | Manifest V3 단일 소스 크로스브라우저 | 2026-07-30 |
| [0003](0003-least-privilege.md) | 최소 권한 | 2026-07-30 |
| [0004](0004-github-pages-landing.md) | GitHub Pages 랜딩 | 2026-07-30 |
| [0005](0005-reject-pr-98-landing-design-language.md) | PR #98 반려 — 랜딩 디자인 언어의 확장 이식 거부 | 2026-07-30 |
| [0006](0006-no-es-modules.md) | ES 모듈로 전환하지 않음 | 2026-07-30 |
| [0007](0007-google-forms-feedback.md) | 문의 채널로 Google Forms 선택 | 2026-07-30 |
| [0008](0008-explicit-imgsrc.md) | imgSrc 명시 경로 유지 | 2026-07-30 |
| [0009](0009-unified-search-ranking.md) | 검색 랭킹을 확장과 랜딩에서 통일 | 2026-07-30 |
| [0010](0010-department-data-policy.md) | 학과 데이터 통합 정책 | 2026-07-30 |
| [0011](0011-semver.md) | 버저닝은 semver | 2026-07-30 |
| [0012](0012-update-notice-link-branch.md) | 업데이트 안내 링크 분기 | 2026-07-30 |
| [0013](0013-release-integrity.md) | 릴리스 무결성 장치 | 2026-07-30 |
| [0014](0014-shortcut-guidance-not-enforced.md) | 단축키는 강제하지 않고 안내한다 | 2026-07-30 |
| [0015](0015-primary-color-text-vs-fill.md) | 주색을 텍스트용과 채움용으로 분리 | 2026-07-30 |
| [0016](0016-icons-two-theme-sets.md) | 서비스 아이콘을 테마별 두 벌로 나눔 | 2026-07-30 |
| [0017](0017-icon-palette-three-colors.md) | 아이콘 팔레트를 세 가지로 고정하고 전량 정합 | 2026-07-30 |
| [0018](0018-landing-release-notes-runtime-api.md) | 랜딩 릴리스 노트를 런타임에 GitHub API로 받음 | 2026-09-01 |
| [0019](0019-four-layer-docs.md) | 문서를 requirements·adr·design·spec 4계층으로 나누고 옛 문서는 고치지 않는다 | 2026-09-13 |

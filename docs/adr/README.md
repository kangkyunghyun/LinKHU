# ADR — 설계 결정 기록

LinKHU가 "왜 이렇게 되어 있는가"를 남긴다. 코드를 읽으면 무엇을 했는지는 알 수 있지만, 무엇을 **하지 않기로 했는지**는 알 수 없다. 그 부분이 여기 있다. 기록의 목적은 같은 논쟁을 반복하지 않는 것이다.

## 읽는 순서

1 구성과 기술, 2 데이터와 제품, 3 릴리스와 플랫폼, 4 디자인, 5 랜딩과 기여, 6 문서와 작업 방식으로 묶는다.

```text
1-1   BUILDLESS-STATIC                       빌드리스 정적 구성
1-2   MANIFEST-V3-SINGLE-SOURCE              Manifest V3 단일 소스 크로스브라우저
1-3   LEAST-PRIVILEGE                        최소 권한
1-4   NO-ES-MODULES                          ES 모듈로 전환하지 않음
1-5   GOOGLE-FORMS-FEEDBACK                  문의 채널로 Google Forms 선택

2-1   EXPLICIT-IMGSRC                        imgSrc 명시 경로 유지
2-2   UNIFIED-SEARCH-RANKING                 검색 랭킹을 확장과 랜딩에서 통일
2-3   DEPARTMENT-DATA-POLICY                 학과 데이터 통합 정책
2-4   SEMVER                                 버저닝은 semver

3-1   UPDATE-NOTICE-LINK-BRANCH              업데이트 안내 링크 분기
3-2   RELEASE-INTEGRITY                      릴리스 무결성 장치
3-3   SHORTCUT-GUIDANCE-NOT-ENFORCED         단축키는 강제하지 않고 안내한다
3-4   SHORTCUT-GUIDE-IN-POPUP                단축키 안내를 팝업까지 올리고 주소를 규칙으로 안내한다

4-1   PRIMARY-COLOR-TEXT-VS-FILL             주색을 텍스트용과 채움용으로 분리
4-2   ICONS-TWO-THEME-SETS                   서비스 아이콘을 테마별 두 벌로 나눔
4-3   ICON-PALETTE-THREE-COLORS              아이콘 팔레트를 세 가지로 고정하고 전량 정합

5-1   GITHUB-PAGES-LANDING                   GitHub Pages 랜딩
5-2   REJECT-PR-98-LANDING-DESIGN-LANGUAGE   PR #98 반려 — 랜딩 디자인 언어의 확장 이식 거부
5-3   LANDING-RELEASE-NOTES-RUNTIME-API      랜딩 릴리스 노트를 런타임에 GitHub API로 받음

6-1   FOUR-LAYER-DOCS                        문서를 requirements·adr·design·spec 4계층으로 나누고 옛 문서는 고치지 않는다
```

## 문서와 책임

0001~0018은 2026-09-13에 옛 `spec/3-3-DESIGN-DECISIONS.md`에서 한 건씩 분리한 것이다. 옛 문서 절과 일련번호는 아래 옛 번호 대응표로 찾는다. 본문 안의 `docs/` 경로는 당시 랜딩 폴더를 뜻하며 지금은 `landing/`이다.

`release-notes/`는 지금 `docs/releases/`, 운영 문서는 `docs/guides/`·`docs/copy/`다.

| 문서 | 책임 |
| --- | --- |
| [1-1](1-1-BUILDLESS-STATIC.md) | 빌드리스 정적 구성 (작성일: 2026-07-30) |
| [1-2](1-2-MANIFEST-V3-SINGLE-SOURCE.md) | Manifest V3 단일 소스 크로스브라우저 (작성일: 2026-07-30) |
| [1-3](1-3-LEAST-PRIVILEGE.md) | 최소 권한 (작성일: 2026-07-30) |
| [5-1](5-1-GITHUB-PAGES-LANDING.md) | GitHub Pages 랜딩 (작성일: 2026-07-30) |
| [5-2](5-2-REJECT-PR-98-LANDING-DESIGN-LANGUAGE.md) | PR #98 반려 — 랜딩 디자인 언어의 확장 이식 거부 (작성일: 2026-07-30) |
| [1-4](1-4-NO-ES-MODULES.md) | ES 모듈로 전환하지 않음 (작성일: 2026-07-30) |
| [1-5](1-5-GOOGLE-FORMS-FEEDBACK.md) | 문의 채널로 Google Forms 선택 (작성일: 2026-07-30) |
| [2-1](2-1-EXPLICIT-IMGSRC.md) | imgSrc 명시 경로 유지 (작성일: 2026-07-30) |
| [2-2](2-2-UNIFIED-SEARCH-RANKING.md) | 검색 랭킹을 확장과 랜딩에서 통일 (작성일: 2026-07-30) |
| [2-3](2-3-DEPARTMENT-DATA-POLICY.md) | 학과 데이터 통합 정책 (작성일: 2026-07-30) |
| [2-4](2-4-SEMVER.md) | 버저닝은 semver (작성일: 2026-07-30) |
| [3-1](3-1-UPDATE-NOTICE-LINK-BRANCH.md) | 업데이트 안내 링크 분기 (작성일: 2026-07-30) |
| [3-2](3-2-RELEASE-INTEGRITY.md) | 릴리스 무결성 장치 (작성일: 2026-07-30) |
| [3-3](3-3-SHORTCUT-GUIDANCE-NOT-ENFORCED.md) | 단축키는 강제하지 않고 안내한다 (작성일: 2026-07-30) |
| [3-4](3-4-SHORTCUT-GUIDE-IN-POPUP.md) | 단축키 안내 노출 지점과 주소 규칙 (작성일: 2026-09-13) |
| [4-1](4-1-PRIMARY-COLOR-TEXT-VS-FILL.md) | 주색을 텍스트용과 채움용으로 분리 (작성일: 2026-07-30) |
| [4-2](4-2-ICONS-TWO-THEME-SETS.md) | 서비스 아이콘을 테마별 두 벌로 나눔 (작성일: 2026-07-30) |
| [4-3](4-3-ICON-PALETTE-THREE-COLORS.md) | 아이콘 팔레트를 세 가지로 고정하고 전량 정합 (작성일: 2026-07-30) |
| [5-3](5-3-LANDING-RELEASE-NOTES-RUNTIME-API.md) | 랜딩 릴리스 노트를 런타임에 GitHub API로 받음 (작성일: 2026-09-01) |
| [6-1](6-1-FOUR-LAYER-DOCS.md) | 문서를 requirements·adr·design·spec 4계층으로 나누고 옛 문서는 고치지 않는다 (작성일: 2026-09-13) |

## 변경 원칙

1. **쓴 뒤 고치지 않는다** (MUST). 결정이 바뀌면 새 번호로 ADR을 추가하고, 옛 ADR의 `상태`만 `N-M으로 대체됨`으로 바꾼다. 본문은 그대로 둔다. 당시 배경이 남아 있어야 "왜 그때는 그랬는지"를 나중에 읽을 수 있다.
2. 설계 방향을 바꾸는 판단(무엇을 채택했고 무엇을 거부했는지)은 구현 PR과 같은 PR에서 ADR로 남긴다 (MUST).
3. 각 ADR은 **배경 / 대안 / 결정 / 영향**으로 적는다. 대안에는 거부한 것도 이유와 함께 적는다.
4. 현재 동작은 [스펙](../spec/README.md)이 원본이다. ADR은 결정 시점의 기록이라 스펙과 어긋날 수 있으며, 그때는 스펙이 현재다.
5. 파일명은 `N-M-UPPER-KEBAB.md`, N은 주제 계층이고 M은 같은 계층의 마지막 번호 + 1이다.

## 옛 번호 대응표

| 옛 번호 | 새 번호 |
| --- | --- |
| 0001 | [1-1](1-1-BUILDLESS-STATIC.md) |
| 0002 | [1-2](1-2-MANIFEST-V3-SINGLE-SOURCE.md) |
| 0003 | [1-3](1-3-LEAST-PRIVILEGE.md) |
| 0004 | [5-1](5-1-GITHUB-PAGES-LANDING.md) |
| 0005 | [5-2](5-2-REJECT-PR-98-LANDING-DESIGN-LANGUAGE.md) |
| 0006 | [1-4](1-4-NO-ES-MODULES.md) |
| 0007 | [1-5](1-5-GOOGLE-FORMS-FEEDBACK.md) |
| 0008 | [2-1](2-1-EXPLICIT-IMGSRC.md) |
| 0009 | [2-2](2-2-UNIFIED-SEARCH-RANKING.md) |
| 0010 | [2-3](2-3-DEPARTMENT-DATA-POLICY.md) |
| 0011 | [2-4](2-4-SEMVER.md) |
| 0012 | [3-1](3-1-UPDATE-NOTICE-LINK-BRANCH.md) |
| 0013 | [3-2](3-2-RELEASE-INTEGRITY.md) |
| 0014 | [3-3](3-3-SHORTCUT-GUIDANCE-NOT-ENFORCED.md) |
| 0015 | [4-1](4-1-PRIMARY-COLOR-TEXT-VS-FILL.md) |
| 0016 | [4-2](4-2-ICONS-TWO-THEME-SETS.md) |
| 0017 | [4-3](4-3-ICON-PALETTE-THREE-COLORS.md) |
| 0018 | [5-3](5-3-LANDING-RELEASE-NOTES-RUNTIME-API.md) |
| 0019 | [6-1](6-1-FOUR-LAYER-DOCS.md) |

## 새 ADR 양식

````markdown
# N-M. 제목

| 항목 | 값 |
|---|---|
| 상태 | 채택 |
| 작성일 | YYYY-MM-DD |
| 이슈 | [#N](https://github.com/kangkyunghyun/LinKHU/issues/N) |
| 요구사항 | [../requirements/N-UPPER-KEBAB.md](../requirements/N-UPPER-KEBAB.md) |

```text
§N-M-1   배경
§N-M-2   대안
§N-M-3   결정
§N-M-4   영향
```

## N-M-1 배경

## N-M-2 대안

## N-M-3 결정

## N-M-4 영향
````

# Release Process

LinKHU 릴리스와 스토어 배포 절차입니다.

## 0. 버전을 어디까지 올릴지 정한다

**릴리스 노트에 `### Features` 섹션이 있으면 minor, `### Fixes`만 있으면 patch다.**

무엇이 바뀌었는지를 먼저 릴리스 노트로 적고, 그 결과가 버전을 정한다. "얼마나 많이 바꿨나"로 재지 않는다.

| 릴리스 | 릴리스 노트 섹션 | 버전 |
| --- | --- | --- |
| v2.4.0 | Features / Internal | minor |
| v2.5.0 | Features / Fixes / Internal | minor |
| v2.6.0 | Features / Fixes / Internal | minor |
| v2.7.0 | Features / Fixes / Internal | minor |
| v2.7.1 | **Fixes** / Internal | **patch** |
| v2.8.0 | Features / Internal | minor |

**v2.4.0 이전에는 지켜지지 않았다.** `v2.3.2`는 검색 기능 셋을 `### Features`에 담고도 patch로 나갔다. 그 커밋만 보고 "규칙이 없다"고 판단하지 않는다 — 릴리스 절차가 문서로 정리되기 전의 느슨한 시기이고, **기준은 v2.4.0부터 적용된다.**

**`### Internal`만 있으면 patch다.** 사용자가 화면에서 겪는 변화가 없다는 뜻이다.

**데이터만 늘어난 경우(서비스 추가)도 Features다** — 따라서 minor다. 코드가 한 줄도 안 바뀌어도 **사용자가 새로 갈 수 있는 곳이 생긴 것**이므로 릴리스 노트의 Features에 적히고, 그러면 위 기준이 minor로 정한다. v2.8.0이 그 경우다(경희사이버대 두 곳 추가).

메이저는 이 기준의 대상이 아니다. 저장 데이터나 사용자 목록이 깨지는 변경일 때만 올린다 — 지금까지 그런 릴리스는 없었다.

## 1. 릴리스 준비 PR

- `src/manifest.json`의 `version`을 올린다.
- `release-notes/v{version}.md`를 기존 형식에 맞춰 작성한다. (사용자 노출 변경 중심)
- PR을 `main`에 머지한다.

### 스토어·커뮤니티 문구 PR도 여기서 머지한다

**태그를 밀기 전에 `docs/store-listing.md`와 `docs/community-post.md` 갱신을 끝내 머지한다** (MUST).
문구 작성 기준은 `.claude/skills/release-copy/SKILL.md`에 있다. 준비 PR에 함께 담아도 되고 별도 PR로 나눠도 되지만,
**둘 다 태그 push보다 앞에 온다.**

이유는 두 가지가 겹쳐서다.

- `scripts/validate-release.js`가 **태그가 체크아웃된 커밋을 가리키는지** 검사한다.
- `publish-chrome.yml`·`publish-firefox.yml`은 **`main`에서만** 실행된다.

즉 **태그가 `main`의 tip일 때만 스토어 배포가 통과한다.** 태그를 민 뒤에 다른 PR을 머지하면 `main`이 태그보다 앞서고,
3번의 스토어 배포가 이 오류로 막힌다.

```text
- Release tag v2.7.0 points to 6d3677a, but the checked out commit is 3f3fe84.
```

이미 어긋났다면 태그를 `main` tip으로 옮겨 해결할 수 있지만, **이미 공개된 태그를 force-push하게 된다.**
GitHub Release가 가리키는 커밋도 함께 바뀌므로, 순서를 지켜 애초에 이 상황을 만들지 않는 편이 낫다.

## 2. 태그 push → GitHub Release 자동 생성

```bash
git switch main
git pull --ff-only
VERSION=$(node -p "require('./src/manifest.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"
```

릴리스 워크플로우가 `npm run build`로 패키징한 `linkhu-v{version}.zip`을 첨부하고,
`release-notes/v{version}.md` 내용을 릴리스 노트로 사용한다.

## 3. 스토어 배포

문구 원본 두 개는 **1번에서 이미 머지되어 있어야 한다.** 여기서는 붙여넣기만 한다.

- 공통 절차: [Store Release Checklist](./store-release-checklist.md)
- 스토어 설명 원본: [Store Listing](./store-listing.md) — 버전마다 업데이트 섹션을 교체한다. (교체는 1번에서)
- 커뮤니티 홍보 글 원본: [Community Post](./community-post.md) — 커뮤니티에 올릴 때 사용한다.
- 두 문구 작성 기준: `.claude/skills/release-copy/SKILL.md`
- Chrome Web Store: [자동 배포 워크플로우](./chrome-web-store-automation.md)
- Firefox Add-ons: [자동 배포 워크플로우](./firefox-addons-automation.md)
- Whale Store: [수동 절차](./whale-store-automation.md)

## 관련 운영 문서

- [문의 채널 설정 가이드](./feedback-setup.md) — 팝업/설정/랜딩 문의 기능의 Google Form 연결
- [아이콘 스타일 가이드](./icon-style-guide.md) — 서비스 아이콘 추가/변경 시

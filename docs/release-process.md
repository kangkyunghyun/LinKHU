# Release Process

LinKHU 릴리스와 스토어 배포 절차입니다.

## 1. 릴리스 준비 PR

- `src/manifest.json`의 `version`을 올린다.
- `release-notes/v{version}.md`를 기존 형식에 맞춰 작성한다. (사용자 노출 변경 중심)
- PR을 `main`에 머지한다.

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

- 공통 절차: [Store Release Checklist](./store-release-checklist.md)
- 스토어 설명 원본: [Store Listing](./store-listing.md) — 버전마다 업데이트 섹션을 교체한다.
- 커뮤니티 홍보 글 원본: [Community Post](./community-post.md) — 커뮤니티에 올릴 때 사용한다.
- 두 문구 작성 기준: `.claude/skills/release-copy/SKILL.md`
- Chrome Web Store: [자동 배포 워크플로우](./chrome-web-store-automation.md)
- Firefox Add-ons: [자동 배포 워크플로우](./firefox-addons-automation.md)
- Whale Store: [수동 절차](./whale-store-automation.md)

## 관련 운영 문서

- [문의 채널 설정 가이드](./feedback-setup.md) — 팝업/설정/랜딩 문의 기능의 Google Form 연결
- [아이콘 스타일 가이드](./icon-style-guide.md) — 서비스 아이콘 추가/변경 시

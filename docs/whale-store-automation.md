# Whale Store Automation Research

Whale Store 배포는 현재 공개 배포 API가 확인되지 않아 수동 절차를 기본 경로로 유지한다.

## 조사 결과

- Whale 개발자센터는 확장앱 구현 API와 배포 절차를 제공하지만, Chrome Web Store API나 AMO API처럼 ZIP 업로드와 리뷰 요청을 자동화하는 공개 API 문서를 제공하지 않는다.
- Whale 개발자센터의 업데이트 문서는 개발자 페이지에서 확장앱 관리 화면으로 이동한 뒤 패키지 업로드, 새로운 기능 작성, 리뷰 요청 버튼을 진행하는 수동 절차를 안내한다.
- Whale Help Center의 확장앱 등록 안내도 Whale Store 로그인, 개발자 등록, 새 확장앱 추가, 패키지 업로드, 필수 정보 입력, 제출 순서로 설명한다.
- 현재 기준으로 GitHub Actions에서 안전하게 사용할 수 있는 공식 인증 방식, API endpoint, CLI는 확인되지 않았다.

## 운영 판단

Whale Store 배포는 자동화하지 않고 [Store Release Checklist](./store-release-checklist.md)의 수동 절차를 따른다.

비공식 브라우저 자동 조작, 세션 쿠키 재사용, 개발자 페이지 내부 요청 역공학은 기본 운영 경로로 채택하지 않는다. 이 방식은 로그인 세션과 UI 변경에 취약하고, 계정 보안 및 약관 리스크를 만들 수 있다.

## 재검토 기준

다음 중 하나가 확인되면 Whale Store 자동화를 다시 검토한다.

- Whale 개발자센터 또는 Help Center에 공식 배포 API 문서가 공개된다.
- Whale Store 개발자 페이지에서 API key, OAuth, service account 같은 자동화용 인증 수단을 제공한다.
- Naver Whale 팀이 공식 CLI 또는 GitHub Actions 연동 방법을 문서화한다.

## 수동 배포 요약

1. [Whale Store 개발자 센터](https://store.whale.naver.com/developers)에 접속하여 로그인한다.
2. LinKHU 확장앱 관리 화면으로 이동한다.
3. GitHub Release asset의 `linkhu-v{version}.zip`을 업로드한다.
4. 새로운 기능 또는 버전 설명에 `release-notes/v{version}.md` 내용을 반영한다.
5. 필수 정보, 권한, 스토어 설명, 스크린샷 변경 필요 여부를 확인한다.
6. 리뷰를 요청하고 심사 상태를 기록한다.

## 참고 문서

- [Whale Store Add my extensions](https://help.whale.naver.com/en/desktop/store/)
- [Whale Developer Center Distribution](https://whale.dev/distribution/)
- [Whale Developer Center Update](https://whale.dev/distribution/update/)
- [Whale Browser Extension API](https://developers.whale.naver.com/api/)

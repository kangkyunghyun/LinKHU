# Store Release Checklist

LinKHU 스토어 배포는 GitHub Release에 첨부된 ZIP 파일을 기준으로 진행한다.

## 참고 문서

- Chrome Web Store: [Publish in the Chrome Web Store](https://developer.chrome.com/webstore/publish)
- Chrome Web Store: [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare/)
- Firefox Add-ons: [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- Firefox Add-ons: [Signing and distributing your add-on](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- Whale Store: [Add my extensions](https://help.whale.naver.com/en/desktop/store/)

## 전제 조건

- GitHub Release가 생성되어 있다.
- Release tag와 `src/manifest.json`의 `version`이 일치한다.
- Release asset에 `linkhu-v{version}.zip`이 첨부되어 있다.
- Release notes가 `release-notes/v{version}.md` 내용과 일치한다.
- Chrome, Firefox, Whale 스토어 관리자 계정에 접근할 수 있다.

## 공통 배포 전 확인

- GitHub Release 페이지에서 `linkhu-v{version}.zip`을 다운로드한다.
- ZIP 파일명이 Release tag와 일치하는지 확인한다.
- ZIP 파일을 압축 해제해 `manifest.json`이 최상위에 있는지 확인한다.
- 압축 해제한 `manifest.json`의 `version`이 Release tag와 일치하는지 확인한다.
- Release notes에서 사용자에게 보여줄 변경 사항을 확인한다.
- 권한 변경이 있는지 `manifest.json`의 `permissions`, `host_permissions`, `browser_specific_settings`를 확인한다.
- 스토어 설명, 스크린샷, 개인정보 처리 관련 답변을 수정해야 하는지 확인한다.

## Chrome Web Store

- [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)에 접속한다.
- LinKHU 아이템을 선택한다.
- 새 패키지로 `linkhu-v{version}.zip`을 업로드한다.
- 업로드 후 표시되는 manifest 정보와 버전을 확인한다.
- 권한 변경, 개인정보 처리, 심사용 안내가 필요한지 확인한다.
- Store Listing, Privacy, Distribution 정보 변경 필요 여부를 확인한다.
- 제출 전 미리보기와 경고 메시지를 확인한다.
- `Submit for Review`로 제출한다.
- 제출 후 심사 상태와 게시 상태를 기록한다.

## Firefox Add-ons

- [Add-ons Developer Hub](https://addons.mozilla.org/developers/)에 접속한다.
- 기존 LinKHU add-on 관리 페이지로 이동한다.
- 새 버전으로 `linkhu-v{version}.zip`을 업로드한다.
- AMO validator 결과를 확인하고, error가 있으면 제출하지 않는다.
- warning이 있으면 보안, 개인정보, 호환성 관련 경고인지 확인한다.
- 릴리스 노트에는 `release-notes/v{version}.md` 내용을 사용한다.
- source code package 제출이 필요한지 확인한다.
- `Submit Version`으로 제출한다.
- 제출 후 서명, 심사, 게시 상태를 기록한다.

## Naver Whale Store

- [Whale Store](https://store.whale.naver.com/)에 로그인한다.
- My extensions 또는 개발자 관리 화면에서 LinKHU 항목으로 이동한다.
- 새 패키지로 `linkhu-v{version}.zip`을 업로드한다.
- 필수 정보, 권한, 심사용 설명을 확인한다.
- 스토어 설명, 스크린샷, 카테고리 변경 필요 여부를 확인한다.
- 제출 전 경고 메시지를 확인한다.
- 심사를 제출한다.
- 제출 후 심사 상태와 게시 상태를 기록한다.

## 배포 후 확인

- Chrome Web Store에서 표시되는 버전이 Release tag와 일치하는지 확인한다.
- Firefox Add-ons에서 표시되는 버전이 Release tag와 일치하는지 확인한다.
- Whale Store에서 표시되는 버전이 Release tag와 일치하는지 확인한다.
- 각 스토어에서 새 설치 또는 업데이트가 가능한지 확인한다.
- README의 Chrome, Firefox 사용자/버전 배지가 최신 상태로 갱신되는지 확인한다.
- GitHub Release, 스토어 버전, `src/manifest.json` 버전이 모두 일치하는지 확인한다.

## 자동화 후보

- Chrome Web Store API 기반 패키지 업로드 및 게시
- Firefox Add-ons API 기반 패키지 업로드 및 게시
- Whale Store 자동화 가능성 조사
- 스토어 배포 완료 상태를 기록하는 릴리스 체크 이슈 템플릿

# Store Release Checklist

LinKHU 스토어 배포는 GitHub Release에 첨부된 ZIP 파일을 기준으로 진행한다.

## 참고 문서

- Chrome Web Store: [Publish in the Chrome Web Store](https://developer.chrome.com/webstore/publish)
- Chrome Web Store: [Prepare your extension](https://developer.chrome.com/docs/webstore/prepare/)
- Firefox Add-ons: [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- Firefox Add-ons: [Signing and distributing your add-on](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- Whale Store: [Add my extensions](https://help.whale.naver.com/en/desktop/store/)
- Whale Store: [Automation Research](./whale-store-automation.md)

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
- [Store Listing](./store-listing.md)의 업데이트 섹션을 새 버전 기준으로 갱신하고, 각 스토어 설명에 반영한다.
- 권한 변경이 있는지 `manifest.json`의 `permissions`, `host_permissions`, `browser_specific_settings`를 확인한다.
- 스토어 설명, 스크린샷, 개인정보 처리 관련 답변을 수정해야 하는지 확인한다. 스크린샷을 다시 찍을 때는 [Screenshot Guide](./screenshot-guide.md)를 따른다.

## Chrome Web Store

기본 배포 경로는 [Chrome Web Store Automation](./chrome-web-store-automation.md)의 `Publish Chrome Web Store` 워크플로우다. 워크플로우 실행 후 대시보드에서 심사 제출 상태를 확인하며, 아래 수동 절차는 자동 배포 실패 또는 긴급 fallback이 필요할 때 사용한다.

- **워크플로우가 실패하면 어느 단계에서 멈췄는지 먼저 본다.** `Verify release input`이면 입력값 문제, `Publish to Chrome Web Store`에서 `invalid_grant`면 토큰 문제다. OAuth 동의 화면은 프로덕션으로 전환되어 토큰이 주기적으로 만료되지는 않지만, 폐기되거나 클라이언트를 교체하면 재발급이 필요하다. 절차는 [토큰 만료 대응](./chrome-web-store-automation.md#토큰-만료-대응)에 있다.

- [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole)에 접속한다.
- LinKHU 아이템을 선택한다.
- 새 패키지로 `linkhu-v{version}.zip`을 업로드한다.
- 업로드 후 표시되는 manifest 정보와 버전을 확인한다.
- 권한 변경, 개인정보 처리, 심사용 안내가 필요한지 확인한다.
- Store Listing(What's new 포함), Privacy, Distribution 정보 변경 필요 여부를 확인한다.
- 제출 전 미리보기와 경고 메시지를 확인한다.
- `Submit for Review`로 제출한다.
- 제출 후 심사 상태와 게시 상태를 기록한다.

## Firefox Add-ons

기본 배포 경로는 [Firefox Add-ons Automation](./firefox-addons-automation.md)의 `Publish Firefox Add-ons` 워크플로우다. 워크플로우 실행 후 Add-ons Developer Hub에서 validator 결과와 제출 상태를 확인하며, 아래 수동 절차는 자동 배포 실패 또는 긴급 fallback이 필요할 때 사용한다.

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

공개 배포 API가 확인되지 않아 기본 배포 경로는 수동 절차다. 자동화 가능성 조사 결과 및 판단 근거는 [Whale Store Automation Research](./whale-store-automation.md)에서 확인할 수 있다.

- [Whale Store 개발자 센터](https://store.whale.naver.com/developers)에 접속하여 로그인한다.
- My extensions 또는 개발자 관리 화면에서 LinKHU 항목으로 이동한다.
- 새 패키지로 `linkhu-v{version}.zip`을 업로드한다.
- 필수 정보, 권한, 심사용 설명 및 버전 설명(`release-notes/v{version}.md` 내용 활용)을 확인한다.
- 스토어 설명, 스크린샷, 카테고리 변경 필요 여부를 확인한다. 스크린샷 촬영 기준은 [Screenshot Guide](./screenshot-guide.md)에 있다.
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

- 스토어 배포 완료 상태를 기록하는 릴리스 체크 이슈 템플릿

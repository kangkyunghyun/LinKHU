# Chrome Web Store Automation

Chrome Web Store 배포는 GitHub Actions의 `Publish Chrome Web Store` 워크플로우에서 수동으로 실행한다.

## 동작 범위

- `main` 브랜치에서만 실행한다.
- 입력한 버전과 `src/manifest.json`의 `version`이 일치해야 한다.
- `npm run build`로 `dist/linkhu-v{version}.zip`을 생성한다.
- Chrome Web Store API로 ZIP 패키지를 업로드한다.
- Chrome Web Store API로 publish 요청을 보내 심사에 제출한다.

## 필요한 GitHub Actions secrets

- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `CHROME_PUBLISHER_ID`

Chrome Web Store extension ID는 워크플로우에 `ihidkmjkpfphgljieecfcikljaopcldp`로 고정되어 있다.

## 실행 방법

1. GitHub 저장소의 Actions 탭으로 이동한다.
2. `Publish Chrome Web Store` 워크플로우를 선택한다.
3. `Run workflow`를 누른다.
4. Branch는 `main`을 선택한다.
5. `version`에 배포할 manifest 버전을 입력한다.
6. `confirm_publish`에 `publish-chrome`을 입력한다.
7. 실행 후 Chrome Web Store Developer Dashboard에서 심사 상태를 확인한다.

## 실행 후 확인

- Actions 로그에서 upload, publish, fetchStatus 응답을 확인한다.
- Chrome Web Store Developer Dashboard에서 새 버전이 심사 제출 상태인지 확인한다.
- 심사 중 추가 조치가 필요한 경고나 메일이 있는지 확인한다.

## 사전 확인

- GitHub Release에 같은 버전의 ZIP asset이 생성되어 있는지 확인한다.
- `release-notes/v{version}.md` 내용이 Chrome Web Store의 What's new에 반영되어 있는지 확인한다.
- Store Listing, Privacy, Distribution 정보 변경이 필요한지 확인한다.
- 권한 변경이 있는 경우 심사용 안내가 필요한지 확인한다.

## 참고 문서

- [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using_webstore_api)
- [Chrome Web Store API reference](https://developer.chrome.com/docs/webstore/api/reference/rest)

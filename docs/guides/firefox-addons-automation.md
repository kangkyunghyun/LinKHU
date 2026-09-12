# Firefox Add-ons Automation

Firefox Add-ons 배포는 GitHub Actions의 `Publish Firefox Add-ons` 워크플로우에서 수동으로 실행한다.

## 동작 범위

- `main` 브랜치에서만 실행한다.
- 입력한 버전, `src/manifest.json`의 `version`, 현재 커밋의 태그가 일치해야 한다.
- `release-notes/v{version}.md`가 존재해야 한다.
- `npm run build`로 `dist/linkhu-v{version}.zip`을 생성한다.
- Firefox Add-ons API로 ZIP 패키지를 listed channel에 업로드한다.
- AMO validator 처리가 끝날 때까지 upload status를 확인한다.
- 검증이 통과하면 기존 LinKHU add-on에 새 버전을 생성한다.
- `release-notes/v{version}.md` 내용을 `ko` locale의 AMO release notes로 사용한다.
- 버전 license는 `MIT`로 제출한다.

## 필요한 GitHub Actions secrets

- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`

Firefox Add-ons add-on ID는 워크플로우에 `linkhu`로 고정되어 있다.
Firefox Add-ons release notes locale은 워크플로우에 `ko`로 고정되어 있다.
Firefox Add-ons license는 워크플로우에 `MIT`로 고정되어 있다.

## Secret 발급 위치

1. [AMO API credentials](https://addons.mozilla.org/en-US/developers/addon/api/key/) 페이지에 접속한다.
2. LinKHU를 관리하는 Firefox Add-ons 계정으로 로그인한다.
3. API key와 API secret을 생성하거나 기존 값을 확인한다.
4. API key는 `FIREFOX_JWT_ISSUER`, API secret은 `FIREFOX_JWT_SECRET`으로 GitHub Actions secrets에 등록한다.

## 실행 방법

1. GitHub 저장소의 Actions 탭으로 이동한다.
2. `Publish Firefox Add-ons` 워크플로우를 선택한다.
3. `Run workflow`를 누른다.
4. Branch는 `main`을 선택한다.
5. `version`에 배포할 manifest 버전을 입력한다.
6. `confirm_publish`에 `publish-firefox`를 입력한다.
7. 실행 후 Add-ons Developer Hub에서 제출 상태를 확인한다.

## 실행 후 확인

- Actions 로그에서 upload, upload status, version create 응답을 확인한다.
- Add-ons Developer Hub에서 새 버전의 validator 결과와 제출 상태를 확인한다.
- 심사 중 추가 조치가 필요한 경고나 메일이 있는지 확인한다.

## 사전 확인

- GitHub Release에 같은 버전의 ZIP asset이 생성되어 있는지 확인한다.
- `release-notes/v{version}.md` 내용이 AMO release notes에 사용해도 되는지 확인한다.
- source code package 제출이 필요한 변경인지 확인한다.
- 권한 변경이 있는 경우 심사용 안내가 필요한지 확인한다.

## 참고 문서

- [AMO External API](https://mozilla.github.io/addons-server/topics/api/)
- [AMO API authentication](https://mozilla.github.io/addons-server/topics/api/v4_frozen/auth.html)
- [AMO add-on upload and version API](https://mozilla.github.io/addons-server/topics/api/addons)
- [AMO license choices](https://mozilla.github.io/addons-server/topics/api/licenses.html)

# 7-6. 스토어 제출

태그 push로 만들어지는 GitHub Release는 배포의 **끝이 아니라 시작이다**. 여기서 세 스토어에 실제로 올린다.

세 스토어 모두 심사가 있고 주기가 다르다. **같은 버전이 스토어마다 다른 시점에 공개된다.**

```text
§7-6-1   전제 조건          제출을 시작할 수 있는 상태
§7-6-2   공통 원칙          자동 배포가 무엇을 올리나
§7-6-3   Chrome Web Store   워크플로와 자격 증명
§7-6-4   Chrome 실패 대응    토큰 만료와 심사 중 업로드
§7-6-5   Firefox Add-ons     워크플로와 자격 증명
§7-6-6   Whale Store         수동 절차
§7-6-7   배포 후 확인        세 스토어의 버전 일치
```

## 7-6-1 전제 조건

| 확인할 것 | 기준 |
| --- | --- |
| GitHub Release | 생성되어 있다 |
| 태그와 매니페스트 | `src/manifest.json`의 `version`과 일치한다 |
| Release asset | `linkhu-v{version}.zip`이 첨부되어 있다 |
| Release notes | `docs/releases/v{version}.md` 내용과 일치한다 |
| 스토어 계정 | Chrome·Firefox·Whale 관리자 계정에 접근할 수 있다 |
| 문구 | [Store Listing](../copy/1-1-STORE-LISTING.md)의 업데이트 섹션이 새 버전으로 갱신되어 머지되어 있다 |

제출 전 **권한과 등록 정보 변경 여부**를 확인한다.

- `manifest.json`의 `permissions`, `host_permissions`, `browser_specific_settings`가 바뀌었는가. 권한을 추가한 릴리스는 세 스토어 모두 재심사 대상이며 기존 사용자에게 권한 승인 요구가 뜬다. 권한 변경은 배포 문제가 아니라 제품 결정으로 다룬다.
- 스토어 설명, 스크린샷, 개인정보 처리 답변을 고쳐야 하는가.

## 7-6-2 공통 원칙

Chrome과 Firefox는 **수동 실행(`workflow_dispatch`) 워크플로**로 제출한다. 두 워크플로 모두 버전과 함께 **확인 문자열 입력을 요구한다**. 실수로 제출이 발동하는 것을 막는 장치이며 제거하지 않는다.

실행 순서는 둘 다 같다.

1. 확인 문자열을 검사한다.
2. `npm run validate:release`로 입력 버전을 검증한다 — 버전 형식, 매니페스트 버전 일치, 해당 태그 존재, 릴리스 노트 파일 존재.
3. `npm run build`로 **패키지를 그 자리에서 다시 만든다.**
4. 방금 빌드한 `dist/`의 ZIP을 스토어에 올린다.

즉 **자동 배포는 Release에 첨부된 ZIP을 내려받아 쓰지 않고, 태그 시점의 소스로 다시 빌드한다.** 패키징이 재현 가능하므로 같은 태그에서 나온 ZIP은 릴리스 첨부물과 바이트 단위로 같아야 한다. Whale 수동 배포만 첨부된 ZIP을 직접 내려받아 쓴다.

**자동 배포 자격 증명은 만료된다**. 배포 워크플로가 인증 실패로 떨어지는 것은 코드 문제가 아니라 자격 증명 갱신 시점이 된 것일 수 있다. 이 실패는 릴리스 당일에 발견되기 쉬우므로, 오래 배포하지 않았다면 **릴리스 전에 배포 경로를 미리 점검한다**.

자격 증명 파일과 값은 **저장소에 커밋하지 않는다**. 저장소 비밀값으로만 관리하고, 로컬에 내려받은 파일은 버전 관리에서 제외한다.

## 7-6-3 Chrome Web Store

| 항목 | 값 |
| --- | --- |
| 워크플로 | `Publish Chrome Web Store` |
| 실행 브랜치 | `main`에서만 |
| 확인 문자열 | `confirm_publish`에 `publish-chrome` |
| extension ID | `ihidkmjkpfphgljieecfcikljaopcldp` (워크플로에 고정) |

필요한 저장소 비밀값은 넷이다 — `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN`, `CHROME_PUBLISHER_ID`.

워크플로는 ZIP을 업로드한 뒤 publish 요청까지 보내 심사에 제출한다. 실행 후 Actions 로그에서 upload·publish·fetchStatus 응답을 확인하고, Developer Dashboard에서 새 버전이 심사 제출 상태인지 본다.

```bash
gh workflow run publish-chrome.yml --ref main \
  -f version={version} -f confirm_publish=publish-chrome
```

## 7-6-4 Chrome 실패 대응

**어느 단계에서 멈췄는지를 먼저 본다**.

| 멈춘 단계 | 응답 | 무엇인가 |
| --- | --- | --- |
| `Verify release input` | `confirm_publish must be publish-chrome.` | 입력값 문제 |
| `Publish to Chrome Web Store` | `invalid_grant` | 토큰 문제 |
| `Publish to Chrome Web Store` | `NOT_UPDATEABLE` | 이미 심사 중 |

### 토큰 문제 — `invalid_grant`

```text
Chrome access token request failed (400): {"error":"invalid_grant","error_description":"Token has been expired or revoked."}
```

OAuth 동의 화면이 **테스트** 상태면 refresh token이 7일 후 만료된다. **LinKHU는 프로덕션 상태이므로 주기적으로 만료되지 않는다.** 아래는 토큰이 폐기되었거나 클라이언트를 교체하는 예외 상황용이다.

**게시 상태는 경고 표시로 판별할 수 없다**. `https://www.googleapis.com/auth/chromewebstore`는 Google이 민감한 스코프로 분류하므로, 프로덕션으로 전환했더라도 검증을 받지 않았으면 "확인되지 않은 앱" 경고가 계속 나온다. 개인용 앱은 검증이 필요 없고 **고급 → 안전하지 않은 페이지로 이동**으로 진행하면 된다. 판별은 Google Cloud Console의 OAuth 동의 화면 → 게시 상태 항목으로만 한다.

재발급 절차다.

1. OAuth 클라이언트가 **웹 애플리케이션** 유형인지 확인한다. 승인된 리디렉션 URI에 `https://developers.google.com/oauthplayground`가 있어야 한다.
2. `https://accounts.google.com/o/oauth2/auth`에 다음 쿼리를 붙여 동의 URL을 만든다.

   | 파라미터 | 값 |
   | --- | --- |
   | `response_type` | `code` |
   | `client_id` | `{CHROME_CLIENT_ID}` |
   | `redirect_uri` | `https://developers.google.com/oauthplayground` |
   | `scope` | `https://www.googleapis.com/auth/chromewebstore` |
   | `access_type` | `offline` |
   | `prompt` | `consent` |

   **`access_type=offline`과 `prompt=consent`가 없으면 refresh token이 발급되지 않는다.**

3. 브라우저에서 열어 동의한다. 리디렉션된 주소창에 `code`가 온다.
4. 코드를 토큰으로 교환한다.

   ```bash
   curl -s -X POST https://oauth2.googleapis.com/token \
     -d code={AUTH_CODE} \
     -d client_id={CHROME_CLIENT_ID} \
     -d client_secret={CHROME_CLIENT_SECRET} \
     -d redirect_uri=https://developers.google.com/oauthplayground \
     -d grant_type=authorization_code
   ```

5. 응답의 `refresh_token`을 `gh secret set CHROME_REFRESH_TOKEN`으로 저장한다.
6. 워크플로를 재실행한다.

**스코프는 `chromewebstore` 하나만 발급한다**. 배포에 필요한 권한이 그것뿐이다. `gcloud auth application-default login`을 이 용도로 쓰지 않는다 — `cloud-platform` 스코프를 강제해 토큰 권한이 필요 이상으로 넓어진다.

**자리표시자(`{...}`)에 실제 값을 적어 커밋하지 않는다**. 이 저장소는 공개다.

### 심사 중 — `NOT_UPDATEABLE`

```text
400: {"error":{"code":400,"message":"You may not edit or publish an item that is in review.","status":"FAILED_PRECONDITION","details":[{"reason":"NOT_UPDATEABLE"}]}}
```

Chrome Web Store는 **심사 중인 아이템에 새 패키지를 올리거나 publish 요청을 보내는 것을 막는다.**

**우리 쪽에서 고칠 것이 없다**. 토큰, 비밀값, 입력값은 모두 정상이다.

| 하지 말 것 | 할 것 |
| --- | --- |
| **토큰을 재발급하지 않는다**. 인증 문제가 아니므로 재발급해도 같은 응답이 온다 | Developer Dashboard에서 이전 제출의 심사 상태를 확인한다 |
| 심사를 앞당기려 하지 않는다. 소요 시간은 Google이 정한다 | 심사가 끝난 뒤 같은 입력으로 재실행한다 |

## 7-6-5 Firefox Add-ons

| 항목 | 값 |
| --- | --- |
| 워크플로 | `Publish Firefox Add-ons` |
| 실행 브랜치 | `main`에서만 |
| 확인 문자열 | `confirm_publish`에 `publish-firefox` |
| add-on ID / locale / license | `linkhu` / `ko` / `MIT` (워크플로에 고정) |

저장소 비밀값은 둘이고 [AMO API credentials](https://addons.mozilla.org/en-US/developers/addon/api/key/)에서 발급한다.

| 비밀값 | 무엇 |
| --- | --- |
| `FIREFOX_JWT_ISSUER` | API key |
| `FIREFOX_JWT_SECRET` | API secret |

워크플로는 ZIP을 listed channel에 올리고 **AMO validator가 끝날 때까지 기다린 뒤** 새 버전을 만든다. 릴리스 노트 파일 내용이 `ko` locale 노트가 된다.

실행 후 Actions 로그에서 upload·upload status·version create 응답을 보고, Developer Hub에서 validator 결과와 제출 상태를 확인한다. **source code package 제출이 필요한 변경인지**도 함께 본다.

## 7-6-6 Whale Store

공개 배포 API가 확인되지 않아 **수동 배포를 유지한다.** 자동화 워크플로가 없다.

릴리스 ZIP을 직접 업로드하고 스토어 설명을 붙여넣는 방식이므로, 다른 두 스토어와 달리 **사람이 빠뜨리면 그대로 누락된다**.

1. [Whale Store 개발자 센터](https://store.whale.naver.com/developers)에 로그인한다.
2. My extensions에서 LinKHU 항목으로 이동한다.
3. 새 패키지로 `linkhu-v{version}.zip`을 업로드한다.
4. 필수 정보, 권한, 버전 설명(`docs/releases/v{version}.md` 활용)을 확인한다.
5. 스토어 설명·스크린샷·카테고리 변경이 필요한지 확인한다.
6. 제출 전 경고 메시지를 확인하고 심사를 제출한다.

## 7-6-7 배포 후 확인

| 확인할 것 | 기준 |
| --- | --- |
| 세 스토어에 표시되는 버전 | Release tag와 일치한다 |
| 새 설치·업데이트 | 각 스토어에서 가능하다 |
| README 배지 | Chrome·Firefox 사용자/버전 배지가 갱신된다 |
| 버전 일치 | GitHub Release, 스토어 버전, `src/manifest.json`이 모두 같다 |

## 참고 문서

| 스토어 | 문서 |
| --- | --- |
| Chrome | [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using_webstore_api) · [API reference](https://developer.chrome.com/docs/webstore/api/reference/rest) · [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server) |
| Firefox | [AMO External API](https://mozilla.github.io/addons-server/topics/api/) · [authentication](https://mozilla.github.io/addons-server/topics/api/v4_frozen/auth.html) · [upload and version API](https://mozilla.github.io/addons-server/topics/api/addons) |
| Whale | [Add my extensions](https://help.whale.naver.com/en/desktop/store/) · [Developer Center Distribution](https://whale.dev/distribution/) |

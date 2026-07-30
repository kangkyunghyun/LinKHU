# Chrome Web Store Automation

Chrome Web Store 배포는 GitHub Actions의 `Publish Chrome Web Store` 워크플로우에서 수동으로 실행한다.

## 동작 범위

- `main` 브랜치에서만 실행한다.
- 입력한 버전, `src/manifest.json`의 `version`, 현재 커밋의 태그가 일치해야 한다.
- `release-notes/v{version}.md`가 존재해야 한다.
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

## 토큰 만료 대응

### 증상

`Publish to Chrome Web Store` 단계에서 다음 오류가 나면 refresh token이 만료되었거나 폐기된 것이다.

```text
Chrome access token request failed (400): {"error":"invalid_grant","error_description":"Token has been expired or revoked."}
```

- 입력값 오류는 증상이 다르다. `confirm_publish`가 `publish-chrome`이 아니면 그 앞 `Verify release input` 단계에서 `confirm_publish must be publish-chrome.`로 걸린다.
- 즉 **어느 단계에서 멈췄는지를 먼저 본다.** `Verify release input`이면 입력값 문제이고, `Publish to Chrome Web Store`면 토큰 문제다.

### 원인

Google Cloud OAuth 동의 화면의 게시 상태가 **테스트(Testing)**이면 발급된 refresh token이 **7일 후 만료**된다. 프로덕션 상태면 만료되지 않는다.

### 현재 상태 — 프로덕션으로 전환 완료 (2026-07-30)

**OAuth 동의 화면은 프로덕션 상태다.** 따라서 refresh token은 더 이상 7일마다 만료되지 않는다.

- 본인 계정만 사용하는 앱이므로 Google 심사 대상이 아니다.
- 만료 때문에 토큰을 주기적으로 재발급할 필요는 없어졌다. 아래 절차는 예외 상황용이다.

### ⚠️ 게시 상태는 경고 표시로 판별할 수 없다

동의 화면에서 **"확인되지 않은 앱"(unverified app) 경고가 뜬다고 테스트 상태인 것이 아니다.**

`https://www.googleapis.com/auth/chromewebstore`는 Google이 **민감한 스코프**로 분류한다. 프로덕션으로 전환했더라도 Google 검증(verification)을 받지 않았으면 이 경고가 계속 나온다.

- **게시 상태 판별은 Google Cloud Console의 OAuth 동의 화면 → 게시 상태 항목으로만 한다** (MUST).
- 개인용 앱은 검증을 받지 않아도 된다. 경고 화면에서 **고급 → 안전하지 않은 페이지로 이동**으로 진행하면 되고, 이 경고는 무해하다.

### 토큰을 다시 발급해야 할 때

프로덕션 전환으로 만료는 해소되었지만, **토큰이 폐기되었거나 OAuth 클라이언트를 교체하는 경우**에는 여전히 재발급이 필요하다.

1. OAuth 클라이언트가 **웹 애플리케이션** 유형인지 확인한다. 승인된 리디렉션 URI에 `https://developers.google.com/oauthplayground`가 있어야 한다.
2. 동의 URL을 만든다. `https://accounts.google.com/o/oauth2/auth`에 다음 쿼리를 붙인다.

   | 파라미터 | 값 |
   | --- | --- |
   | `response_type` | `code` |
   | `client_id` | `{CHROME_CLIENT_ID}` |
   | `redirect_uri` | `https://developers.google.com/oauthplayground` |
   | `scope` | `https://www.googleapis.com/auth/chromewebstore` |
   | `access_type` | `offline` |
   | `prompt` | `consent` |

   **`access_type=offline`과 `prompt=consent`가 없으면 refresh token이 발급되지 않는다.**

3. 브라우저에서 그 URL을 열어 동의한다. 리디렉션된 주소창에 `code` 파라미터가 온다.
4. 받은 코드를 토큰으로 교환한다.

   ```bash
   curl -s -X POST https://oauth2.googleapis.com/token \
     -d code={AUTH_CODE} \
     -d client_id={CHROME_CLIENT_ID} \
     -d client_secret={CHROME_CLIENT_SECRET} \
     -d redirect_uri=https://developers.google.com/oauthplayground \
     -d grant_type=authorization_code
   ```

5. 응답의 `refresh_token`을 secret에 저장한다.

   ```bash
   gh secret set CHROME_REFRESH_TOKEN
   ```

6. 워크플로를 재실행한다.

   ```bash
   gh workflow run publish-chrome.yml --ref main \
     -f version={version} -f confirm_publish=publish-chrome
   ```

**자리표시자(`{...}`)에 실제 값을 적어 커밋하지 않는다** (MUST). 이 저장소는 공개다.

### 스코프는 `chromewebstore` 하나만 발급한다

발급된 토큰의 스코프는 `https://www.googleapis.com/auth/chromewebstore` 하나여야 한다. 배포에 필요한 권한이 그것뿐이다.

**`gcloud auth application-default login`을 이 용도로 쓰지 않는다** (MUST). 이 명령은 `cloud-platform` 스코프를 강제하므로 토큰 권한이 필요 이상으로 넓어진다. 위 동의 URL 방식으로 `scope`를 직접 지정해 발급한다.

### 실행 기록

**v2.5.0 (2026-07-30)** — 두 단계에서 연속으로 막혔다.

| 순서 | 단계 | 결과 |
| --- | --- | --- |
| 1 | `Verify release input` | 실패 — 입력값 오타 |
| 2 | `Publish to Chrome Web Store` | 실패 — refresh token 만료 (`invalid_grant`) |
| 3 | 토큰 재발급 후 재실행 | **성공 — `PENDING_REVIEW`** |

같은 배포에서 서로 다른 두 오류를 순서대로 겪었다. 위 [증상](#증상) 절의 단계 구분이 여기서 나왔다.

재발급한 토큰의 스코프는 `chromewebstore` 하나뿐이었다. 같은 날 OAuth 동의 화면을 프로덕션으로 전환해 만료 문제를 없앴다.

## 참고 문서

- [Use the Chrome Web Store API](https://developer.chrome.com/docs/webstore/using_webstore_api)
- [Chrome Web Store API reference](https://developer.chrome.com/docs/webstore/api/reference/rest)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)

# 7-6 스토어 제출

이 문서는 GitHub Release를 만든 뒤 세 스토어에 실제로 올리는 전제 조건과 절차, 자동 제출의 자격 증명, Chrome 제출 실패 대응, 배포 후 확인을 정한다.

릴리스 생성과 태그 순서는 릴리스에, 스토어마다 다른 심사와 권한 판단은 운영자 요구사항에, 스크린샷 규격은 스크린샷에 있다. ([7-5 릴리스](7-5-RELEASE.md), [2-2-5 스토어 배포](2-2-OPERATOR-REQUIREMENTS.md#2-2-5-스토어-배포), [4-7 스크린샷](4-7-SCREENSHOT.md))

<br>

### 7-6-1 전제 조건

| 확인할 것 | 기준 |
| --- | --- |
| GitHub Release | 만들어져 있다 |
| 태그와 매니페스트 | `src/manifest.json`의 `version`과 같다 |
| 릴리스 첨부 파일 | `linkhu-v{version}.zip`이 붙어 있다 |
| 릴리스 노트 | `docs/releases/v{version}.md` 내용과 같다 |
| 스토어 계정 | Chrome, Firefox, Whale 관리자 계정에 접근할 수 있다 |
| 문구 | [스토어 등록 정보](../copy/1-1-STORE-LISTING.md)의 업데이트 절이 새 버전으로 머지되어 있다 |
| 권한 변경 | 매니페스트의 `permissions`, `host_permissions`, `browser_specific_settings`가 바뀌었는지 확인했다 |
| 등록 정보 변경 | 스토어 설명, 스크린샷, 개인정보 처리 답변을 고쳐야 하는지 확인했다 |

<br>

### 7-6-2 자동 제출의 공통 동작

Chrome과 Firefox는 수동 실행 워크플로로 제출한다. 두 워크플로 모두 버전과 함께 확인 문자열 입력을 요구한다. 실수로 제출이 시작되는 것을 막는 장치이며 없애지 않는다.

| 순서 | 단계 | 확인 |
| --- | --- | --- |
| 1 | 실행 브랜치와 확인 문자열 검사 | `main`에서 실행했고 확인 문자열이 맞음 |
| 2 | `npm run validate:release`로 입력 버전 검증 | 버전 형식, 매니페스트 버전 일치, 태그 존재, 태그가 체크아웃된 커밋을 가리킴, 릴리스 노트 존재 |
| 3 | `npm run build`로 패키지를 그 자리에서 다시 만듦 | 빌드 통과 |
| 4 | 방금 만든 `dist/`의 ZIP을 스토어에 올림 | 스토어 응답 |

자동 제출은 Release의 ZIP을 내려받지 않고 태그 커밋의 소스로 다시 빌드한다. 패키징이 재현 가능하므로 같은 태그에서 만든 ZIP은 릴리스 첨부 파일과 바이트 단위로 같다. Whale 수동 배포만 첨부된 ZIP을 직접 내려받아 쓴다.

| 규칙 | 이유 |
| --- | --- |
| 오래 배포하지 않았다면 릴리스 전에 배포 경로를 점검한다 | 자동 제출 자격 증명은 만료되거나 폐기될 수 있다. 인증 실패는 코드가 아니라 자격 증명 문제일 수 있고, 릴리스 당일에 발견하기 쉽다 |
| 자격 증명 파일과 값은 저장소에 커밋하지 않는다 | 저장소 비밀값으로만 관리하고, 로컬에 내려받은 파일은 버전 관리에서 뺀다 |

<br>

### 7-6-3 Chrome Web Store

| 항목 | 값 |
| --- | --- |
| 워크플로 | `Publish Chrome Web Store` |
| 실행 브랜치 | `main`에서만 |
| 확인 문자열 | `confirm_publish`에 `publish-chrome` |
| extension ID | `ihidkmjkpfphgljieecfcikljaopcldp` (워크플로에 고정) |

| 저장소 비밀값 | 발급처 |
| --- | --- |
| `CHROME_CLIENT_ID` | Google Cloud Console의 OAuth 클라이언트 |
| `CHROME_CLIENT_SECRET` | Google Cloud Console의 OAuth 클라이언트 |
| `CHROME_REFRESH_TOKEN` | 아래 재발급 절차. `chromewebstore` 스코프 |
| `CHROME_PUBLISHER_ID` | Chrome Web Store Developer Dashboard |

워크플로는 ZIP을 올린 뒤 publish 요청까지 보내 심사에 제출한다. 스토어 설명은 바꾸지 않는다. 실행 후 Actions 로그에서 upload, publish, fetchStatus 응답을 확인하고, Developer Dashboard에서 새 버전이 심사 제출 상태인지 본다. 스토어 설명의 업데이트 절은 Developer Dashboard에 직접 붙여 넣는다.

```bash
gh workflow run publish-chrome.yml --ref main \
  -f version={version} -f confirm_publish=publish-chrome
```

<br>

### 7-6-4 Chrome 실패 대응

먼저 어느 단계에서 멈췄는지 본다.

| 멈춘 단계 | 응답 | 원인 |
| --- | --- | --- |
| `Verify release input` | `Chrome publish workflow must be run from main.` | `main`이 아닌 브랜치에서 실행 |
| `Verify release input` | `confirm_publish must be publish-chrome.` | 확인 문자열 오류 |
| `Verify release input` | `Release tag ... points to ..., but the checked out commit is ...` | 태그가 `main`의 최신 커밋이 아님 |
| `Publish to Chrome Web Store` | `invalid_grant` | refresh token 문제 |
| `Publish to Chrome Web Store` | `NOT_UPDATEABLE` | 이전 제출이 심사 중 |

스토어 API 오류는 로그에 `Chrome publish failed: {단계} failed ({상태 코드}): {응답 본문}` 형식으로 남는다. 단계는 `Chrome access token request`, `Chrome package upload`, `Chrome package publish` 등이다.

<br>

**1. refresh token 문제, `invalid_grant`**

```text
Chrome access token request failed (400): {"error":"invalid_grant","error_description":"Token has been expired or revoked."}
```

OAuth 동의 화면이 테스트 상태면 refresh token이 7일 뒤 만료되고, 프로덕션 상태면 주기적으로 만료되지 않는다. `invalid_grant`가 나면 먼저 Google Cloud Console에서 게시 상태를 확인한다. 토큰이 폐기됐거나 클라이언트를 바꾸면 아래 순서로 다시 발급한다.

게시 상태는 경고 표시로 판별할 수 없다. Google은 `https://www.googleapis.com/auth/chromewebstore`를 민감한 스코프로 분류하므로, 프로덕션으로 전환해도 검증을 받지 않으면 "확인되지 않은 앱" 경고가 계속 나온다. 개인용 앱은 검증이 필요 없으며 **고급 → 안전하지 않은 페이지로 이동**으로 진행한다. 게시 상태는 Google Cloud Console의 OAuth 동의 화면에 있는 게시 상태 항목에서만 판별한다.

| 순서 | 할 일 | 확인 |
| --- | --- | --- |
| 1 | OAuth 클라이언트 유형을 확인한다 | **웹 애플리케이션** 유형이고 승인된 리디렉션 URI에 `https://developers.google.com/oauthplayground`가 있음 |
| 2 | `https://accounts.google.com/o/oauth2/auth`에 아래 쿼리를 붙여 동의 URL을 만든다 | `access_type=offline`과 `prompt=consent`가 없으면 refresh token이 발급되지 않음 |
| 3 | 브라우저에서 열어 동의한다 | 리디렉션된 주소창에 `code`가 옴 |
| 4 | 아래 명령으로 코드를 토큰으로 바꾼다. 요청 형식은 Google의 [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server) 문서에 있다 | 응답에 `refresh_token`이 있음 |
| 5 | `gh secret set CHROME_REFRESH_TOKEN`으로 저장한다 | |
| 6 | 워크플로를 다시 실행한다 | |

| 쿼리 | 값 |
| --- | --- |
| `response_type` | `code` |
| `client_id` | `{CHROME_CLIENT_ID}` |
| `redirect_uri` | `https://developers.google.com/oauthplayground` |
| `scope` | `https://www.googleapis.com/auth/chromewebstore` |
| `access_type` | `offline` |
| `prompt` | `consent` |

```bash
curl -s -X POST https://oauth2.googleapis.com/token \
  -d code={AUTH_CODE} \
  -d client_id={CHROME_CLIENT_ID} \
  -d client_secret={CHROME_CLIENT_SECRET} \
  -d redirect_uri=https://developers.google.com/oauthplayground \
  -d grant_type=authorization_code
```

| 규칙 | 이유 |
| --- | --- |
| 스코프는 `chromewebstore` 하나만 발급한다 | 제출에 필요한 권한이 그것뿐이다 |
| `gcloud auth application-default login`을 이 용도로 쓰지 않는다 | `cloud-platform` 스코프를 강제해 토큰 권한이 필요 이상으로 넓어진다 |
| 자리표시자(`{...}`)에 실제 값을 적어 커밋하지 않는다 | 이 저장소는 공개다 |

<br>

**2. 심사 중, `NOT_UPDATEABLE`**

```text
Chrome publish failed: Chrome package upload failed (400): {"error":{"code":400,"message":"You may not edit or publish an item that is in review.","status":"FAILED_PRECONDITION","details":[{"reason":"NOT_UPDATEABLE"}]}}
```

publish 단계에서 막히면 `Chrome package upload` 대신 `Chrome package publish`가 찍힌다.

Chrome Web Store는 심사 중인 아이템에 새 패키지를 올리거나 publish 요청을 보내는 것을 막는다. 토큰, 비밀값, 입력값은 모두 정상이라 저장소 쪽에서 고칠 것이 없다.

| 하지 않는 것 | 하는 것 |
| --- | --- |
| 토큰을 다시 발급하지 않는다. 인증 문제가 아니라 다시 발급해도 같은 응답이 온다 | Developer Dashboard에서 이전 제출의 심사 상태를 확인한다 |
| 심사를 앞당기려 하지 않는다. 소요 시간은 Google이 정한다 | 심사가 끝난 뒤 같은 입력으로 다시 실행한다 |

<br>

### 7-6-5 Firefox Add-ons

| 항목 | 값 |
| --- | --- |
| 워크플로 | `Publish Firefox Add-ons` |
| 실행 브랜치 | `main`에서만 |
| 확인 문자열 | `confirm_publish`에 `publish-firefox` |
| AMO 경로 식별자(slug) | `linkhu` (워크플로에 고정). 매니페스트의 add-on ID(`browser_specific_settings.gecko.id`)와 다른 값이다 |
| locale | `ko` (워크플로에 고정) |
| license | `MIT` (워크플로에 고정) |

| 저장소 비밀값 | 발급처 |
| --- | --- |
| `FIREFOX_JWT_ISSUER` | AMO API credentials의 API key |
| `FIREFOX_JWT_SECRET` | AMO API credentials의 API secret |

두 비밀값은 [AMO API credentials](https://addons.mozilla.org/en-US/developers/addon/api/key/) 화면에서 발급한다.

워크플로는 ZIP을 listed channel에 올리고 AMO 검사 결과를 10초 간격으로 최대 10분 기다린 뒤 새 버전을 만든다. 릴리스 노트 파일에서 `### Internal` 절을 뺀 내용이 `ko` locale의 버전 노트가 된다. 스토어 설명은 바꾸지 않는다. 실행 후 Actions 로그에서 upload, upload status, version create 응답을 보고, Developer Hub에서 검사 결과와 제출 상태를 확인한다. 소스 코드 패키지 제출이 필요한 변경인지도 함께 본다. 스토어 설명의 업데이트 절은 Developer Hub에 직접 붙여 넣는다. 업로드와 버전 API의 형식은 [AMO External API](https://mozilla.github.io/addons-server/topics/api/addons) 문서에 있다.

| 멈춘 단계 | 응답 | 원인 |
| --- | --- | --- |
| `Verify release input` | `Firefox publish workflow must be run from main.` | `main`이 아닌 브랜치에서 실행 |
| `Verify release input` | `confirm_publish must be publish-firefox.` | 확인 문자열 오류 |
| `Publish to Firefox Add-ons` | `Firefox upload validation failed: {검사 결과}` | AMO 검사 실패. 업로드는 남고 버전은 만들어지지 않음 |
| `Publish to Firefox Add-ons` | `Firefox upload validation timed out for {업로드 id}.` | 10분 안에 검사가 끝나지 않음. 업로드는 남고 버전은 만들어지지 않음 |

<br>

### 7-6-6 Whale Store

Whale Store는 수동으로 배포하고 자동화 워크플로가 없다. 패키지 업로드까지 사람이 하므로 빠뜨리면 그대로 누락된다.

| 순서 | 할 일 |
| --- | --- |
| 1 | [Whale Store 개발자 센터](https://store.whale.naver.com/developers)에 로그인한다. 등록 절차는 [Developer Center Distribution](https://whale.dev/distribution/) 문서에 있다 |
| 2 | My extensions에서 LinKHU 항목으로 간다 |
| 3 | 새 패키지로 `linkhu-v{version}.zip`을 올린다 |
| 4 | 필수 정보, 권한, 버전 설명(`docs/releases/v{version}.md`)을 확인한다 |
| 5 | 스토어 설명, 스크린샷, 카테고리 변경이 필요한지 확인한다 |
| 6 | 제출 전 경고 메시지를 확인하고 심사를 제출한다 |

<br>

### 7-6-7 배포 후 확인

| 확인할 것 | 기준 |
| --- | --- |
| 세 스토어에 보이는 버전 | 릴리스 태그와 같다 |
| 새 설치와 업데이트 | 각 스토어에서 된다 |
| README 배지 | Chrome과 Firefox의 사용자 수와 버전 배지가 갱신된다 |
| 버전 일치 | GitHub Release, 스토어 버전, `src/manifest.json`이 모두 같다 |

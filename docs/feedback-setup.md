# 문의 채널(Google Forms) 설정 가이드

팝업/설정 페이지의 "문의하기"는 Google Forms의 `formResponse` 엔드포인트로 백그라운드 전송하는 방식입니다. 확장 소스에 비밀값이 들어가지 않아 공개 저장소에 안전하고, 폼의 이메일 알림을 켜면 응답이 올 때마다 Gmail로 바로 알림을 받을 수 있습니다.

## 1. Google Form 만들기

1. [Google Forms](https://forms.google.com)에서 새 폼을 만듭니다. 제목 예: `LinKHU 문의`.
2. 질문을 1개 추가합니다.
   - 유형: **장문형**
   - 질문: `문의 내용`
   - 필수 여부: 필수
3. 설정 탭에서 "이메일 주소 수집"은 **사용 안 함**으로 둡니다. (수집하면 확장에서 보내는 익명 전송이 필수 필드 누락으로 저장되지 않습니다.)

## 2. 이메일 알림 켜기

1. 폼의 **응답** 탭 → ⋮ 메뉴 → **새 응답에 대한 이메일 알림 받기**를 켭니다.
2. 이후 문의가 들어올 때마다 폼 소유자 계정의 Gmail로 알림이 옵니다. 휴대폰 Gmail 앱 알림을 켜두면 푸시로도 받을 수 있습니다.

## 3. 전송 주소와 entry ID 확인

1. 폼 편집 화면에서 ⋮ 메뉴 → **미리 채워진 링크 받기**를 선택합니다.
2. 문의 내용 칸에 아무 값이나 입력하고 **링크 받기 → 링크 복사**를 누릅니다.
3. 복사한 URL에서 두 값을 확인합니다.
   - `https://docs.google.com/forms/d/e/<긴 ID>/viewform?usp=pp_url&entry.123456789=...`
   - **formUrl**: `viewform` 앞부분을 그대로 쓰되 `viewform`을 `formResponse`로 바꾼 값
     - 예: `https://docs.google.com/forms/d/e/<긴 ID>/formResponse`
   - **messageEntry**: 쿼리의 `entry.123456789` 부분

## 4. 확장에 연결

`src/feedback.js`의 `FEEDBACK_CONFIG`에 두 값을 채웁니다.

```js
const FEEDBACK_CONFIG = {
  formUrl: "https://docs.google.com/forms/d/e/<긴 ID>/formResponse",
  messageEntry: "entry.123456789",
};
```

설정 전까지 문의 버튼을 누르면 "문의 채널이 아직 준비되지 않았습니다" 안내가 표시됩니다.

## 5. 동작 확인

1. 확장을 다시 로드한 뒤 팝업 → 문의하기 → 테스트 문의를 전송합니다.
2. 폼의 **응답** 탭에 내용이 도착했는지, 알림 메일이 왔는지 확인합니다.

## 참고: 왜 no-cors 전송인가

Google Forms는 CORS 응답 헤더를 제공하지 않아 응답 본문을 읽을 수 없습니다. 그래서 `fetch(..., { mode: "no-cors" })`로 보내고 네트워크 오류가 없으면 전송 성공으로 간주합니다. entry ID를 잘못 넣으면 오류 없이 응답만 저장되지 않으므로, 설정 후 반드시 5번의 테스트 전송으로 확인하세요.

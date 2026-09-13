# 1-2. Manifest V3 단일 소스 크로스브라우저

| 항목 | 값 |
|---|---|
| 상태 | 채택 |
| 작성일 | 2026-07-30 |
| 이슈 | - |
| 출처 | 옛 `spec/3-3-DESIGN-DECISIONS.md` §3-3-2 (2026-09-13 분리), 2026-09-13 계층 번호로 재배치 |

```text
§1-2-1   배경
§1-2-2   대안
§1-2-3   결정
§1-2-4   영향
```

## 1-2-1 배경

Chrome, Firefox, Whale 세 스토어에 배포한다. Chrome과 Whale은 Chromium 기반이라 사실상 같지만, Firefox는 확장 API 구현과 심사 요구사항이 다르다.

## 1-2-2 대안

1. 브라우저별로 매니페스트와 소스를 분기 — 각 플랫폼에 최적화
2. 단일 MV3 매니페스트 + Firefox 전용 필드 — 지금 구성
3. Firefox 지원 포기 — 유지 비용 최소

## 1-2-3 결정

2번을 택했다. 매니페스트 하나를 유지하고, Firefox에만 필요한 설정은 `browser_specific_settings.gecko`에 담는다. Firefox가 무시하지 못하는 값(`strict_min_version` 140.0, `data_collection_permissions.required: ["none"]`)을 여기에 선언한다.

## 1-2-4 영향

- 패키지가 하나다. 같은 ZIP을 세 스토어에 제출한다. 브라우저별 빌드 분기가 없다.
- 대가로 가장 제약이 강한 브라우저에 맞춰야 한다. Firefox가 지원하지 않는 API는 Chrome 전용이라도 쓰지 않는다.
- 매니페스트를 바꾸면 세 브라우저 호환성을 모두 확인해야 한다 ([2-2](../spec/2-2-OPERATOR-REQUIREMENTS.md)).
- `data_collection_permissions`를 `none`으로 선언했으므로, 사용자 데이터를 수집하는 기능을 추가하면 이 선언과 Firefox 심사 답변을 함께 바꿔야 한다.

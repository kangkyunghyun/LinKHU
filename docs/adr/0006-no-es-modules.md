# ADR 0006: ES 모듈로 전환하지 않음

| 항목 | 값 |
|---|---|
| 상태 | 채택 |
| 작성일 | 2026-07-30 |
| 이슈 | - |
| 출처 | 옛 `spec/3-3-DESIGN-DECISIONS.md` §3-3-6 (2026-09-13 분리) |

**배경**

`src/`의 스크립트는 모두 classic script다. 전역 객체를 노출하고 HTML의 `<script>` 순서로 결합한다([3-1](../spec/3-1-DESIGN-SOFTWARE-ARCHITECTURE.md)). 현대적인 방식은 ES 모듈(`import`/`export`)이다.

**대안**

1. `src/`를 ES 모듈로 전환하고 HTML에서 `type="module"`로 로드
2. classic script 유지 — 지금 구성

**결정**

2번을 유지한다. 새 공용 모듈(`shared.js`)을 추가할 때도 classic script로 만들고 `data.js` 다음 순서로 로드하도록 했다.

이유는 **검증 도구가 이 구조에 묶여 있기 때문**이다. `scripts/validate-data.js`와 테스트 하네스는 `src/`의 파일을 Node의 `vm`으로 평가해 전역을 꺼내 쓴다. ES 모듈로 바꾸면 이 로딩 방식이 통째로 성립하지 않아 검증 스크립트와 테스트를 함께 재작성해야 한다. 얻는 것(모듈 스코프, 명시적 의존)에 비해 치르는 비용이 크다.

**영향**

- 스크립트 로드 순서가 곧 의존 관계다. 순서를 바꾸면 깨진다. 이 제약은 [3-1](../spec/3-1-DESIGN-SOFTWARE-ARCHITECTURE.md)에 명시되어 있다.
- 전역 이름이 충돌하지 않도록 각 파일이 객체 하나만 노출한다.
- Node 테스트에서 쓰려면 `module.exports` 가드가 필요하다.
- 이 결정을 뒤집으려면 검증 스크립트와 테스트 하네스의 재작성 계획이 함께 나와야 한다 (MUST).

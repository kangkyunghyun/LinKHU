# LinKHU 문서

기억하지 말고 기록한다. 논의와 결정을 문서로 남겨, 다음 작업에서 에이전트가 스펙과 당시 ADR을 찾아오면 그 맥락 위에서 다음 결정을 할 수 있게 한다.

## 네 계층

| 폴더 | 담는 것 | 언제 쓰는가 | 구현이 끝나면 |
|---|---|---|---|
| [`requirements/`](requirements/README.md) | 만들 기능과 완료 조건 | 이슈를 만들기 전에 | **수정하지 않는다** |
| [`adr/`](adr/README.md) | 검토한 선택지와 결정 이유 | 설계 방향을 정하거나 바꿀 때 | **수정하지 않는다** |
| [`design/`](design/README.md) | 요구사항과 ADR을 바탕으로 한 구현 방법 | 구현 방법이 자명하지 않을 때 | **수정하지 않는다** |
| [`spec/`](spec/README.md) | 현재 구조와 동작 | 코드를 바꿀 때마다 | **코드와 함께 계속 갱신한다** |

앞의 셋은 **그 시점의 기록**이다. 이후 변경은 새 문서로 남긴다. 현재 동작을 설명하는 것은 `spec/`뿐이며, 스펙과 옛 문서가 어긋나면 스펙이 현재다.

## 흐름

```text
requirements/N-slug.md   무엇을, 어디까지          ─┐
adr/NNNN-slug.md         왜 이 방식인가 (필요할 때)  ├─ 이슈 #N, 브랜치 type/N-slug
design/N-slug.md         어떻게 (자명하지 않을 때)   ─┘
        ↓ 구현
spec/*.md                이제 이렇게 동작한다        ── 코드와 같은 PR
```

작업 절차(이슈·브랜치·커밋·PR)는 [`AGENTS.md`](../AGENTS.md)가 원본이다.

## 운영 문서

네 계층에 속하지 않는 절차 문서는 이 폴더 바로 아래에 둔다.

| 문서 | 용도 |
|---|---|
| [release-process.md](release-process.md) | 릴리스 준비부터 스토어 배포까지 |
| [store-release-checklist.md](store-release-checklist.md) | 스토어별 제출 절차 |
| [store-listing.md](store-listing.md) | 스토어 설명 원본 |
| [community-post.md](community-post.md) | 커뮤니티 홍보글 원본 |
| [chrome-web-store-automation.md](chrome-web-store-automation.md) | Chrome 자동 배포 |
| [firefox-addons-automation.md](firefox-addons-automation.md) | Firefox 자동 배포 |
| [whale-store-automation.md](whale-store-automation.md) | Whale 수동 배포 |
| [feedback-setup.md](feedback-setup.md) | 문의 채널(Google Form) 연결 |
| [icon-style-guide.md](icon-style-guide.md) | 서비스 아이콘 도안 규칙 |
| [screenshot-guide.md](screenshot-guide.md) | 스크린샷 촬영 기준 |
| [supported-services.md](supported-services.md) | 지원 서비스 목록 (생성물) |

GitHub Pages 랜딩은 [`landing/`](../landing)에 있다. 이 폴더는 사이트로 배포되지 않는다.

# LinKHU 문서

LinKHU의 요구사항·결정·설계·현재 동작과 운영 문서를 기록한다.

기억하지 말고 기록한다. 논의와 결정을 문서로 남겨, 다음 작업에서 에이전트가 스펙과 당시 ADR을 찾아오면 그 맥락 위에서 다음 결정을 할 수 있게 한다.

## 문서 상태

| 폴더 | 담는 것 | 언제 쓰는가 | 구현이 끝나면 |
|---|---|---|---|
| [`requirements/`](requirements/README.md) | 만들 기능과 완료 조건 | 이슈를 만들기 전에 | **수정하지 않는다** |
| [`adr/`](adr/README.md) | 검토한 선택지와 결정 이유 | 설계 방향을 정하거나 바꿀 때 | **수정하지 않는다** |
| [`design/`](design/README.md) | 요구사항과 ADR을 바탕으로 한 구현 방법 | 구현 방법이 자명하지 않을 때 | **수정하지 않는다** |
| [`spec/`](spec/README.md) | 현재 구조와 동작 | 코드를 바꿀 때마다 | **코드와 함께 계속 갱신한다** |

앞의 셋은 **그 시점의 기록**이다. 이후 변경은 새 문서로 남긴다. 현재 동작을 설명하는 것은 `spec/`뿐이며, 스펙과 옛 문서가 어긋나면 스펙이 현재다.

## 읽는 순서

```text
requirements/N-slug.md   무엇을, 어디까지          ─┐
adr/NNNN-slug.md         왜 이 방식인가 (필요할 때)  ├─ 이슈 #N, 브랜치 type/N-slug
design/N-slug.md         어떻게 (자명하지 않을 때)   ─┘
        ↓ 구현
spec/*.md                이제 이렇게 동작한다        ── 코드와 같은 PR
```

작업 절차(이슈·브랜치·커밋·PR)는 [`AGENTS.md`](../AGENTS.md)가 원본이다.

## 문서와 책임

네 계층에 속하지 않는 절차 문서는 `guides/`, 스토어·커뮤니티 문구는 `copy/`, 버전별 릴리스 노트는 `releases/`에 둔다.

| 문서 | 책임 |
|---|---|
| [요구사항](requirements/README.md) | 만들 기능과 완료 조건 |
| [ADR](adr/README.md) | 검토한 선택지와 결정 이유 |
| [설계](design/README.md) | 요구사항·ADR을 바탕으로 한 구현 방법 |
| [스펙](spec/README.md) | 현재 구조와 동작 |
| [운영 가이드](guides/README.md) | 운영 절차의 읽는 순서와 책임 |
| [배포 문구](copy/README.md) | 스토어·커뮤니티 문구의 읽는 순서와 책임 |
| [1-RELEASE-PROCESS.md](guides/1-RELEASE-PROCESS.md) | 릴리스 준비부터 스토어 배포까지 |
| [2-STORE-RELEASE-CHECKLIST.md](guides/2-STORE-RELEASE-CHECKLIST.md) | 스토어별 제출 절차 |
| [1-STORE-LISTING.md](copy/1-STORE-LISTING.md) | 스토어 설명 원본 |
| [2-COMMUNITY-POST.md](copy/2-COMMUNITY-POST.md) | 커뮤니티 홍보글 원본 |
| [3-CHROME-WEB-STORE.md](guides/3-CHROME-WEB-STORE.md) | Chrome 자동 배포 |
| [4-FIREFOX-ADDONS.md](guides/4-FIREFOX-ADDONS.md) | Firefox 자동 배포 |
| [5-WHALE-STORE.md](guides/5-WHALE-STORE.md) | Whale 수동 배포 |
| [6-FEEDBACK-SETUP.md](guides/6-FEEDBACK-SETUP.md) | 문의 채널(Google Form) 연결 |
| [7-ICON-STYLE-GUIDE.md](guides/7-ICON-STYLE-GUIDE.md) | 서비스 아이콘 도안 규칙 |
| [8-SCREENSHOT-GUIDE.md](guides/8-SCREENSHOT-GUIDE.md) | 스크린샷 촬영 기준 |
| [supported-services.md](supported-services.md) | 지원 서비스 목록 (생성물) |

GitHub Pages 랜딩은 [`landing/`](../landing)에 있다. 이 폴더는 사이트로 배포되지 않는다.

## 변경 원칙

1. 요구사항·ADR·설계는 그 시점의 기록이므로 구현이 끝나면 수정하지 않는다 (MUST). 이후 변경은 새 문서로 남긴다.
2. 스펙은 코드와 함께 계속 갱신한다 (MUST). 스펙과 옛 문서가 어긋나면 스펙이 현재다.
3. 작업 절차는 [AGENTS.md](../AGENTS.md)를 따른다 (MUST). 이 문서에서 반복하지 않는다.

# 요구사항

만들 기능과 완료 조건을 **이슈를 만들기 전에** 파일로 남긴다. 이 파일이 원본이고 GitHub 이슈는 사본이다. 에이전트가 네트워크 없이도 저장소 안에서 요구사항을 읽을 수 있어야 한다.

## 읽는 순서

```text
198   FOUR-LAYER-DOCS           문서를 requirements·adr·design·spec 4계층으로 개편하고 랜딩을 docs에서 분리한다

200   RESTRUCTURE-DIRECTORIES   디렉터리 구조를 정리한다

202   DOCS-STYLE                운영 문서와 문구 문서를 스펙 문서 형식으로 통일한다

205   GUIDE-LAYER-NUMBERING     가이드·문구 문서 번호를 스펙과 같은 계층 번호로 바꾼다

207   ADR-LAYER-NUMBERING       ADR·요구사항·설계 번호를 스펙과 같은 계층 번호로 바꾼다
```

## 문서와 책임

| 문서 | 책임 |
| --- | --- |
| `N-UPPER-KEBAB.md` | 만들 기능과 완료 조건의 원본, GitHub 이슈의 바탕 |
| [198-FOUR-LAYER-DOCS.md](198-FOUR-LAYER-DOCS.md) | 문서를 requirements·adr·design·spec 4계층으로 개편하고 랜딩을 docs에서 분리한다 |
| [200-RESTRUCTURE-DIRECTORIES.md](200-RESTRUCTURE-DIRECTORIES.md) | 디렉터리 구조를 정리한다 |
| [202-DOCS-STYLE.md](202-DOCS-STYLE.md) | 운영 문서와 문구 문서를 스펙 문서 형식으로 통일한다 |
| [205-GUIDE-LAYER-NUMBERING.md](205-GUIDE-LAYER-NUMBERING.md) | 가이드·문구 문서 번호를 스펙과 같은 계층 번호로 바꾼다 |
| [207-ADR-LAYER-NUMBERING.md](207-ADR-LAYER-NUMBERING.md) | ADR·요구사항·설계 번호를 스펙과 같은 계층 번호로 바꾼다 |
| [ADR](../adr/README.md) | 결정의 배경과 대안 |
| [설계](../design/README.md) | 구현 방법 |
| [스펙](../spec/README.md) | 구현된 현재 구조와 동작 |

## 변경 원칙

1. 파일명은 `N-UPPER-KEBAB.md`. `N`은 이슈 번호, `UPPER-KEBAB`은 브랜치 슬러그를 대문자로 표기한 것이다. 이슈 번호는 이슈를 만든 직후 확정되므로, 파일을 먼저 쓰고 `gh issue create --body-file`로 이슈를 만든 뒤 파일명을 번호로 바꾼다.
2. **구현이 끝나면 수정하지 않는다** (MUST). 요구가 바뀌면 새 파일을 만들고 옛 파일 서두에 `N-UPPER-KEBAB.md로 대체됨`을 적는다.
3. 완료 조건은 명령이나 화면 확인으로 재현 가능하게 적는다 (MUST). `git diff --check` 통과, 중복 id 0개, 팝업에서 새 항목 표시처럼.
4. 사소한 변경(오탈자, 한 줄 문구)은 이슈 본문으로 충분하다. 파일은 완료 조건이 두 개 이상이거나 다른 문서를 함께 바꿀 때 쓴다.

## 양식

````markdown
# N. 제목

```text
§N-1   배경
§N-2   만들 것
§N-3   완료 조건
§N-4   관련
```

## N-1 배경
왜 필요한가. 지금 무엇이 불편한가.

## N-2 만들 것
- 항목

## N-3 완료 조건
- 명령 또는 확인 방법

## N-4 관련
- ADR: ../adr/N-M-UPPER-KEBAB.md (있으면)
- 설계: ../design/N-UPPER-KEBAB.md (있으면)
````

# 202. 운영 문서와 문구 문서를 스펙 문서 형식으로 통일한다

```text
§202-1   배경
§202-2   만들 것
§202-3   완료 조건
§202-4   관련
```

## 202-1 배경

`docs/spec/`은 `# 202. 제목`, 서두, §섹션 맵, `## N-N` 절, MUST/SHOULD/MAY, `~다` 체로 형식이 잡혀 있다. `docs/guides/`와 `docs/copy/`는 영문 제목, 번호 없는 절, `~입니다`와 `~다`가 섞인 문체라 한 저장소의 문서로 읽히지 않는다. 계층 README도 뼈대가 제각각이다.

## 202-2 만들 것

- `docs/guides/` 8개, `docs/copy/` 2개를 `N-UPPER-KEBAB.md`로 이름 바꾸고 스펙 문서 형식으로 다시 쓴다. 내용은 옮기기만 하고 지어내지 않는다.
- 게시·제출 문구를 담은 코드 블록은 한 글자도 바꾸지 않는다.
- `docs/guides/README.md`, `docs/copy/README.md`를 만들고, `docs/README.md`와 세 계층 README를 `docs/spec/README.md` 뼈대로 맞춘다.
- 옛 파일명을 가리키는 링크·주석·스킬을 전부 갱신한다. ADR·릴리스 노트·이전 요구사항·설계 본문은 고치지 않는다.

## 202-3 완료 조건

- 옛 파일명 참조 0곳 (불변 문서 제외)
- `docs/guides/`, `docs/copy/`, 계층 README에서 코드 블록 밖 `~입니다/~합니다` 0줄
- 번호 문서 전부에 §섹션 맵과 `## N-N` 절이 있다
- `docs/` 아래 상대 링크 깨짐 0개 (양식 자리표시자 제외)
- `npm run build`, `git diff --check` 통과

## 202-4 관련

- 이슈: [#202](https://github.com/kangkyunghyun/LinKHU/issues/202)
- ADR: 없음. 형식 기준은 [../spec/README.md](../spec/README.md)가 이미 정한다.
- 설계: 없음.

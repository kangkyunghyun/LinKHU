# 7-5. 릴리스

버전을 정하고, 준비 PR을 머지하고, 태그를 밀어 GitHub Release를 만드는 데까지다. **스토어 제출은 여기서 끝나지 않는다** — §7-6이 이어받는다.

```text
§7-5-1   버전 자리          릴리스 노트가 버전을 정한다
§7-5-2   준비 PR            무엇을 머지하고 어떤 순서로
§7-5-3   태그 push          명령과 워크플로가 보는 것
§7-5-4   릴리스 후 공지      커뮤니티에 알릴 때
```

## 7-5-1 버전 자리

**릴리스 노트가 버전을 정한다** (MUST). "얼마나 많이 바꿨나"로 재지 않는다. 무엇이 바뀌었는지를 먼저 노트로 적고, 그 결과가 자리를 정한다.

| 릴리스 노트에 있는 섹션 | 버전 |
| --- | --- |
| `### Features`가 있다 | **minor** |
| `### Fixes`만 있다 | **patch** |
| `### Internal`만 있다 | **patch** — 사용자가 화면에서 겪는 변화가 없다 |

**데이터만 늘어난 경우(서비스 추가)도 Features다.** 코드가 한 줄도 안 바뀌어도 사용자가 새로 갈 수 있는 곳이 생긴 것이므로 노트의 Features에 적히고, 그러면 위 기준이 minor로 정한다.

메이저는 이 기준의 대상이 아니다 (MUST). 저장 데이터나 사용자 목록이 깨지는 변경일 때만 올린다 — 지금까지 그런 릴리스는 없었다.

적용 이력이다. **기준은 v2.4.0부터다** — 그 전에는 지켜지지 않았고, `v2.3.2`는 검색 기능 셋을 `### Features`에 담고도 patch로 나갔다. 그 커밋만 보고 "규칙이 없다"고 판단하지 않는다.

| 릴리스 | 노트 섹션 | 버전 |
| --- | --- | --- |
| v2.4.0 | Features / Internal | minor |
| v2.5.0 | Features / Fixes / Internal | minor |
| v2.6.0 | Features / Fixes / Internal | minor |
| v2.7.0 | Features / Fixes / Internal | minor |
| v2.7.1 | **Fixes** / Internal | **patch** |
| v2.8.0 | Features / Internal | minor |

버전 자리 방침의 근거는 DECISIONS 2-4에 있다.

## 7-5-2 준비 PR

| 하는 일 | 강도 |
| --- | --- |
| `src/manifest.json`의 `version`을 올린다 | MUST |
| `docs/releases/v{version}.md`를 기존 형식으로 작성한다 (사용자 노출 변경 중심) | MUST |
| `docs/copy/1-1-STORE-LISTING.md`의 업데이트 섹션을 교체한다 | MUST |
| `docs/copy/1-2-COMMUNITY-POST.md`에 계속 알릴 기능이 있으면 녹인다 | SHOULD |
| 위를 전부 `main`에 머지한다 | MUST |

문구 작성 기준은 `.claude/skills/release-copy/SKILL.md`에 있다. 준비 PR에 함께 담아도 되고 별도 PR로 나눠도 되지만 **둘 다 태그 push보다 앞에 온다** (MUST).

### 태그가 `main`의 tip이어야 한다

두 가지가 겹쳐서 생기는 제약이다.

| 무엇이 | 무엇을 요구하나 |
| --- | --- |
| `scripts/validate-release.js` | 태그가 **체크아웃된 커밋을 가리키는지** 검사한다 |
| `publish-chrome.yml` · `publish-firefox.yml` | **`main`에서만** 실행된다 |

즉 **태그가 `main`의 tip일 때만 스토어 배포가 통과한다.** 태그를 민 뒤에 다른 PR을 머지하면 `main`이 태그보다 앞서고, §7-6의 스토어 배포가 이 오류로 막힌다.

```text
Release tag v2.7.0 points to 6d3677a, but the checked out commit is 3f3fe84.
```

이미 어긋났다면 태그를 `main` tip으로 옮겨 해결할 수 있지만, **이미 공개된 태그를 force-push하게 된다.** GitHub Release가 가리키는 커밋도 함께 바뀌므로, 순서를 지켜 애초에 이 상황을 만들지 않는 편이 낫다 (SHOULD).

## 7-5-3 태그 push

```bash
git switch main
git pull --ff-only
VERSION=$(node -p "require('./src/manifest.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"
```

`v*.*.*` 패턴의 태그가 릴리스 워크플로를 발동시킨다. 워크플로는 세 가지를 검사한 뒤 릴리스를 만든다. 세 검사 모두 워크플로 자체의 단계로 수행되며, `npm run validate:release`는 여기서 쓰이지 않는다 (§7-6-2 참고).

| 검사 | 막는 실수 |
| --- | --- |
| 태그가 매니페스트 버전과 일치하는가 | 버전을 올리지 않고 태그만 미는 것 |
| `npm run build`가 통과하는가 | 깨진 데이터·산출물이 나가는 것 |
| `docs/releases/v{version}.md`가 존재하는가 | 노트 없이 릴리스가 나가는 것 |

통과하면 `linkhu-v{version}.zip`을 첨부하고 `docs/releases/v{version}.md` 내용을 릴리스 노트로 쓴다.

**태그 push가 자동화하는 것은 GitHub Release 생성과 ZIP 첨부까지다** (MUST 인지). 스토어 배포는 여기서 일어나지 않는다. **태그를 밀었다고 사용자에게 배포된 것이 아니다.**

## 7-5-4 릴리스 후 공지

스토어 반영이 끝나면 학내 커뮤니티에 업데이트를 알린다. 스토어 목록 페이지만으로는 기존 사용자가 새 버전을 인지하지 못한다.

| 규칙 | 왜 | 강도 |
| --- | --- | --- |
| 공지 문구는 [Store Listing](../copy/1-1-STORE-LISTING.md)의 해당 버전 업데이트 섹션을 재사용한다 | 같은 내용을 따로 쓰지 않는다 | SHOULD |
| 랜딩 페이지 링크를 함께 넣는다 | 설치 전에 확인할 경로를 준다 | SHOULD |
| **아직 코드가 없는 기능을 공지에 넣지 않는다** | 구상 중인 계획은 약속이 되고, 지키지 못하면 신뢰를 잃는다 | MUST |

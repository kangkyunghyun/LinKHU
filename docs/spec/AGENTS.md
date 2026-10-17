# AGENTS.md

LinKHU 스펙 세트를 읽고 고칠 때 필요한 문서와 코드 위치, 작성 규칙, 점검 방법을 안내한다. 확장 프로그램, 랜딩, 데이터, 릴리스와 스토어 운영을 다룬다.

명세 본문과 설정값은 이 문서에 복사하지 않는다. 스펙이 기준이라는 원칙, 번호 층위, 주제별 원본, 문서와 코드가 어긋날 때의 처리는 [README](README.md)에 있다.

<br>

### 1. 문서의 역할과 읽는 순서

| 문서 | 정하는 것 | 상태 |
| --- | --- | --- |
| [1-BACKGROUND](1-BACKGROUND.md) | 도메인, 서비스 배경, 문제와 가치, 이용 흐름과 주체, 하지 않는 것, 용어 | 작성 완료 |
| [2-1-USER-STORIES](2-1-USER-STORIES.md) | 사용자와 쓰임별 기대 | 작성 완료 |
| [2-2-OPERATOR-REQUIREMENTS](2-2-OPERATOR-REQUIREMENTS.md) | 운영 주체, 핵심 기준 요약, 데이터 갱신, 릴리스, 스토어, 문의, 기여 | 작성 완료 |
| [3-INFORMATION-ARCHITECTURE](3-INFORMATION-ARCHITECTURE.md) | 서비스 단위, 카테고리와 서비스 수, 화면별 범위, 기본 목록, 검색 대상과 순위 | 작성 완료 |
| [4-1-LAYOUT](4-1-LAYOUT.md) | 팝업, 설정, 랜딩의 영역 순서와 문구, 치수, 설정 목록 격자, 카드 폭 계산과 줄바꿈 표, 랜딩 화면 폭 구간 | 작성 완료 |
| [4-2-UI-SYSTEM](4-2-UI-SYSTEM.md) | 공식 색상, 토큰의 값과 쓰는 자리, 확장과 랜딩이 맞추는 값, 확장 우선 원칙, UI 아이콘 | 작성 완료 |
| [4-3-THEME](4-3-THEME.md) | 세 모드, 저장과 되돌리기, 선택 UI, 색 토큰 값, 대비 기준, 랜딩 다크 팔레트 | 작성 완료 |
| [4-4-SOFTWARE-ARCHITECTURE](4-4-SOFTWARE-ARCHITECTURE.md) | 개요와 외부 시스템, 배경과 목표, 품질 속성, 실행 기반과 권한, 모듈 구조, 의존 방향 | 작성 완료 |
| [4-5-STATE](4-5-STATE.md) | 저장 키, 사용자 설정과 내부 캐시, 즉시 반영형 설정, 비동기 결과의 순서 | 작성 완료 |
| [4-6-SERVICE-ICON](4-6-SERVICE-ICON.md) | 서비스 아이콘 팔레트, 두 벌 체계, 생성기와 검증, 추가 절차 | 작성 완료 |
| [4-7-SCREENSHOT](4-7-SCREENSHOT.md) | 스크린샷 세 장의 규격과 촬영 방식, 포털 촬영 시 개인정보 처리 | 작성 완료 |
| [5-CONTRACT](5-CONTRACT.md) | 연동 대상과 방식, 랜딩 산출물, GitHub 릴리스 API, Google Forms, Google Analytics, 공통 원칙 | 작성 완료 |
| [6-1-INTERACTION](6-1-INTERACTION.md) | 렌더, 키 입력, 이동, 설정 저장과 드래그, 테마 적용, 단축키 안내, 문의 전송, 설정 필터, 랜딩 검색과 업데이트 구역, 휴대폰 설치 안내, 버전 안내의 처리 순서 | 작성 완료 |
| [6-2-DATA](6-2-DATA.md) | 지원 서비스 목록 스키마와 필드 규칙, 검증과 생성, 변경 절차 | 작성 완료 |
| [7-1-ERROR-HANDLING](7-1-ERROR-HANDLING.md) | 데이터, 저장소, 네트워크, 자산 실패의 동작과 문구 | 작성 완료 |
| [7-2-TEST-CASES](7-2-TEST-CASES.md) | 자동 테스트의 상황과 기대 결과, 수동 검증 항목, 검증 환경, 특별 검증 | 작성 완료 |
| [7-4-DEPLOYMENT](7-4-DEPLOYMENT.md) | 배포 단위와 대상 브라우저, 배포 경로, 배포 조건, 비밀 정보, 랜딩 적용과 복구, 배포 후 확인 | 작성 완료 |
| [7-5-RELEASE](7-5-RELEASE.md) | 버전 자리, 준비 PR과 태그 순서, 릴리스 워크플로 검사, 릴리스 후 공지 | 작성 완료 |
| [7-6-STORE](7-6-STORE.md) | 세 스토어 제출 절차, 자격 증명, Chrome 실패 대응, 배포 후 확인 | 작성 완료 |
| [DECISIONS](DECISIONS.md) | 무엇을 정했고 어떤 방향을 왜 거부했는지. 결정 하나를 표 하나로, 날짜순으로 덧붙이고 옛 결정은 상태만 바꿈 | 작성 완료 |

- 처음에는 1부터 5까지 차례로 읽어 배경, 요구사항, 설계, 계약을 확인한다. 6은 구현 규약, 7은 오류, 검증, 배포를 다룬다.
- 앞 번호의 결정이 뒤 번호의 기준이다. 구현에 맞추려고 앞 번호를 임의로 바꾸지 않는다.
- 7-3은 결번이다. 이유는 README의 번호 층위 절에 있다.

<br>

### 2. 작업별 참조

| 하려는 일 | 먼저 볼 곳 | 함께 볼 곳 |
| --- | --- | --- |
| 서비스 추가, 주소 변경, 삭제 | [6-2 데이터](6-2-DATA.md) | [3-2 카테고리](3-INFORMATION-ARCHITECTURE.md#3-2-카테고리)의 서비스 수, [6-2-7 손으로 적은 서비스 수](6-2-DATA.md#6-2-7-손으로-적은-서비스-수), [7-2-3 수동 검증 항목](7-2-TEST-CASES.md#7-2-3-수동-검증-항목) |
| 카테고리 추가나 변경 | [3-2 카테고리](3-INFORMATION-ARCHITECTURE.md#3-2-카테고리) | [6-2-2 필드 규칙](6-2-DATA.md#6-2-2-필드-규칙), [4-1-3 설정 페이지 목록](4-1-LAYOUT.md#4-1-3-설정-페이지-목록) |
| 서비스 아이콘 추가나 변경 | [4-6 서비스 아이콘](4-6-SERVICE-ICON.md) | `.claude/skills/service-icon/SKILL.md`, [6-2-5 변경 절차](6-2-DATA.md#6-2-5-변경-절차) |
| 팝업 화면이나 동작 변경 | [4-1-1 팝업 영역](4-1-LAYOUT.md#4-1-1-팝업-영역), [6-1 인터랙션](6-1-INTERACTION.md) | [2-1 사용자 스토리](2-1-USER-STORIES.md), [7-1 오류 처리](7-1-ERROR-HANDLING.md) |
| 설정 페이지 변경 | [4-1-2 설정 영역](4-1-LAYOUT.md#4-1-2-설정-영역), [6-1-4 설정 저장](6-1-INTERACTION.md#6-1-4-설정-저장) | [2-1-2 기대](2-1-USER-STORIES.md#2-1-2-기대)의 내 바로가기 구성, [6-1-8 설정 검색과 필터](6-1-INTERACTION.md#6-1-8-설정-검색과-필터) |
| 색, 여백, 반경, 글자 크기 변경 | [4-2-2 디자인 토큰 규칙](4-2-UI-SYSTEM.md#4-2-2-디자인-토큰-규칙) | [4-3-4 구현 방식과 토큰 계약](4-3-THEME.md#4-3-4-구현-방식과-토큰-계약), [4-3-5 대비 기준](4-3-THEME.md#4-3-5-대비-기준) |
| 테마 동작 변경 | [4-3 테마](4-3-THEME.md) | [4-5-4 비동기 결과의 순서](4-5-STATE.md#4-5-4-비동기-결과의-순서), [6-1-5 테마 적용](6-1-INTERACTION.md#6-1-5-테마-적용) |
| 검색 규칙 변경 | [3-5 검색이 다루는 범위](3-INFORMATION-ARCHITECTURE.md#3-5-검색이-다루는-범위) | [4-4-6 의존 방향](4-4-SOFTWARE-ARCHITECTURE.md#4-4-6-의존-방향)의 확장과 랜딩이 같아야 하는 규칙 |
| 문의 폼 변경 | [5-4 Google Forms](5-CONTRACT.md#5-4-google-forms) | [6-1-7 문의 유형 선택과 전송](6-1-INTERACTION.md#6-1-7-문의-유형-선택과-전송), [7-1-4 네트워크 실패](7-1-ERROR-HANDLING.md#7-1-4-네트워크-실패), [7-2-5 특별 검증 절차](7-2-TEST-CASES.md#7-2-5-특별-검증-절차) |
| 바깥 호출이나 분석 이벤트 추가 | [5 계약](5-CONTRACT.md) | [1-5 하지 않는 것](1-BACKGROUND.md#1-5-하지-않는-것), [5-6 공통 원칙](5-CONTRACT.md#5-6-공통-원칙) |
| 저장 키 추가 | [4-5 상태](4-5-STATE.md) | [7-1-3 저장소 실패](7-1-ERROR-HANDLING.md#7-1-3-저장소-실패) |
| 권한이나 매니페스트 변경 | [4-4-4 실행 기반](4-4-SOFTWARE-ARCHITECTURE.md#4-4-4-실행-기반) | [1-5 하지 않는 것](1-BACKGROUND.md#1-5-하지-않는-것), [2-2-5 스토어 배포](2-2-OPERATOR-REQUIREMENTS.md#2-2-5-스토어-배포) |
| 릴리스 준비 | [7-5 릴리스](7-5-RELEASE.md) | `.claude/skills/release-copy/SKILL.md`, [7-6 스토어 제출](7-6-STORE.md) |
| 스크린샷 다시 찍기 | [4-7 스크린샷](4-7-SCREENSHOT.md) | [7-6-6 Whale Store](7-6-STORE.md#7-6-6-whale-store) |
| 다른 설계 방향을 놓고 고름 | [DECISIONS](DECISIONS.md)의 기록 규칙 | |

<br>

### 3. 명세와 코드의 대응

코드를 바꾸면 짝지어진 문서를 같은 PR에서 갱신한다. 문서 갱신을 후속 PR로 미루지 않는다. 숨김 파일을 뺀 `src/` 전체가 확장 패키지가 되고, `dist/`는 패키징 산출물이라 버전 관리 대상이 아니다.

| 구성 요소 | 구현 위치 | 사용 범위 |
| --- | --- | --- |
| 매니페스트 | [src/manifest.json](../../src/manifest.json) | 4-4-4 실행 기반, 7-4-1 대상 브라우저, 7-6-1 전제 조건 |
| 지원 서비스 목록 | [src/data.js](../../src/data.js) | 3-2 카테고리, 6-2 데이터 |
| 공용 규칙 | [src/shared.js](../../src/shared.js) | 3-4 기본 목록, 3-5 검색, 4-4-5 모듈 구조, 4-1-4 팝업 카드 이름 |
| 팝업 | [src/popup.html](../../src/popup.html), [popup.css](../../src/popup.css), [popup.js](../../src/popup.js) | 4-1-1 팝업 영역, 6-1-1~6-1-3, 6-1-6 단축키 안내 |
| 설정 | [src/options.html](../../src/options.html), [options.css](../../src/options.css), [options.js](../../src/options.js) | 4-1-2, 4-1-3 설정, 6-1-4 설정 저장, 6-1-6 단축키 안내 |
| 테마와 토큰 | [src/theme.js](../../src/theme.js), [theme.css](../../src/theme.css) | 4-2-2 디자인 토큰 규칙, 4-3 테마, 6-1-5 테마 적용 |
| 버전 안내 | [src/version.js](../../src/version.js) | 4-5-1 저장 키 목록, 5-3 GitHub 릴리스 API, 6-1-12 버전 안내 |
| 문의 | [src/feedback.js](../../src/feedback.js) | 5-4 Google Forms, 6-1-7 문의 유형 선택과 전송, 7-1-4 네트워크 실패 |
| 확장 아이콘과 서비스 아이콘 | [src/icons/](../../src/icons/), [src/images/](../../src/images/), SVG 원본 [assets/icons/](../../assets/icons/) | 4-6 서비스 아이콘 |
| 랜딩 | [landing/](../../landing/). 산출물은 `assets/services.json`, `assets/images/` | 3-3 화면별 범위, 4-1-5 랜딩, 4-3 테마, 5 계약, 6-1-9~6-1-11 랜딩 동작 |
| 스크린샷 | [landing/assets/screenshots/](../../landing/assets/screenshots/) | 4-7 스크린샷 |
| 데이터 검증 | [scripts/validate-data.js](../../scripts/validate-data.js) | 6-2-4 검증 파이프라인, 4-1-4 팝업 카드 이름 |
| 랜딩 산출물 생성 | [scripts/generate-landing-data.js](../../scripts/generate-landing-data.js) | 5-2 랜딩 파생 산출물, 6-2-4 검증 파이프라인 |
| 다크 아이콘 생성 | [scripts/generate-dark-icons.js](../../scripts/generate-dark-icons.js) | 4-6-4 생성기와 검증 |
| 패키징과 제출 | [scripts/package-extension.js](../../scripts/package-extension.js), [validate-release.js](../../scripts/validate-release.js), [publish-chrome.js](../../scripts/publish-chrome.js), [publish-firefox.js](../../scripts/publish-firefox.js) | 7-4-1 배포 단위, 7-5 릴리스, 7-6 스토어 제출 |
| 테스트 | [tests/](../../tests/) | 7-2 테스트 케이스 |
| 워크플로와 템플릿 | [.github/](../../.github/) | 7-4 배포, 7-5-3 태그 push, 7-6 스토어 제출 |
| 작업 가이드 | [.claude/skills/](../../.claude/skills/). 서비스 아이콘과 릴리스 문구 | 4-6 서비스 아이콘, 7-5 릴리스 |
| 문서 | [docs/](../README.md). 지원 서비스 목록 사본, 스토어와 커뮤니티 문구, 릴리스 노트 | 6-2-7 손으로 적은 서비스 수, 7-5 릴리스 |

<br>

### 4. 작성 규칙

스펙을 고치는 사람과 에이전트가 같은 기준으로 쓴다.

**1. 무엇을 쓰나**

| 규칙 | 내용 |
| --- | --- |
| 현재 정한 것만 | 미정, 검토 중, 후속 과제는 이슈에 남긴다. 빈 틀이나 "미정" 문장도 두지 않는다 |
| 이력은 쓰지 않음 | 이전 동작, 바뀐 날짜, 기준일, 정정 경위, 이슈 번호로 설명하는 경위는 DECISIONS나 PR로 보낸다. 버전 문자열이 든 외부 식별자는 그대로 둔다 |
| 같은 사실은 한 곳 | README의 주제별 원본 자리에만 쓴다. 서비스 수처럼 계산되는 숫자는 3-2에만 둔다 |
| 설계도로 쓴다 | 이 세트만 보고 구현해도 지금과 같은 결과가 나오게 동작, 값, 조건, 분기, 실패, 화면 문구를 쓴다. 코드 설명서나 코드 사본이 아니다 |
| 이름을 쓰지 않음 | 폴더, 파일, 변수, 함수, 클래스, CSS 토큰, 명령 이름 대신 역할로 부른다. 원문으로 쓰는 것은 코드 밖이 깨지는 이름뿐이다. 저장 키, 서비스 식별자 값, 외부 주소와 외부 식별자, 분석 이벤트, 릴리스 노트 절 제목, 운영자가 입력하거나 로그에서 보는 문자열 |
| 확인한 값만 | 코드와 설정에서 확인한 값만 쓴다. 형식을 채우려고 쓰지 않고, 정한 게 적으면 짧게 쓴다 |
| 당연한 것과 안 하는 것 | 이름이 곧 설명인 비고는 비운다. "~하지 않는다"는 보안, 개인정보, 권한, 범위처럼 필요한 확정 제외일 때만 쓴다 |

<br>

**2. 문서 형식**

| 규칙 | 내용 |
| --- | --- |
| 도입 | 첫 문단은 "이 문서는 ~을 정한다." 한 문장. 둘째 문단은 "X는 Y에 있다." 뒤 괄호 링크 모음. 1-BACKGROUND는 둘째 문단이 없다. 첫 절 앞에는 도입과 문서 전체 규칙만 둔다 |
| 본문 | 줄글을 최소로 줄이고 표와 그림으로 쓴다. 책임만 넘기는 문장("~를 따른다"), 링크 나열, 안내와 요약 문장을 두지 않는다. 표나 그림의 내용을 글로 다시 쓰지 않는다 |
| 제목 | 번호는 파일 번호를 포함해 세 묶음까지(`4-1-4`). 그 아래는 `**1. 소제목**` |
| 간격 | 절과 굵은 소제목 앞에 빈 줄과 `<br>`. 바로 위가 제목이면 빈 줄만 |
| 표 | 규칙, 조건과 처리, 단계는 표로 쓴다. 키 열은 한 칸에 하나. 설명 셀은 짧게 쓰고 독립된 조건은 `<br>`로 나눈다. 머리글과 모든 행의 열 수가 같다 |
| 그림 | 처리 순서는 Mermaid 그림이 맡고 번호 목록으로 다시 쓰지 않는다. 라벨은 Markdown Strings로 쓰고 `<br/>` 같은 HTML 태그를 넣지 않는다. 갈림은 마름모로 그리고 가지에 결과를 적는다 |

<br>

**3. 문장**

- '한다'체로 쓰고 주체, 조건, 동작을 분명히 쓴다. 한 문장에 내용 하나만 담는다.
- em dash, 원문자, 구획선을 쓰지 않는다. 본문의 가운뎃점은 쉼표나 와/과로 바꾼다. 카테고리 이름 같은 고유명사와 식별자는 원문 그대로 둔다.
- "이를", "이 값은" 같은 대명사 대신 가리키는 이름을 쓴다.
- "정본", "SSOT", "단일 진실 공급원"은 "원본"으로, "와이어링", "배선"은 "연결"로, "뜻"은 "의미"로 쓴다. "박다", "담보하다", "동봉하다", "수렴하다", "승격하다"는 "넣다", "보장하다", "함께 싣다", "맞춰진다", "옮기다"로 바꾼다.

<br>

### 5. 명령

스펙은 명령 대신 아래 "스펙에서 부르는 이름"을 쓴다.

| 스펙에서 부르는 이름 | 명령 | 역할 |
| --- | --- | --- |
| 자동 테스트 | `npm test` | `node --test`로 `tests/`의 `*.test.js` 실행 |
| 데이터 검증 | `npm run validate:data` | `src/data.js` 스키마와 무결성 검증 |
| 다크 아이콘 생성 | `npm run generate:dark-icons` | 라이트 아이콘 배경 제거(원본을 고쳐 씀), 다크 벌 생성, 짝 없는 다크 아이콘 삭제 |
| 다크 아이콘 짝 검증 | `npm run validate:dark-icons` | 라이트와 다크 아이콘 짝 검증 |
| 랜딩 산출물 생성 | `npm run generate:landing-data` | `landing/assets/services.json`과 `landing/assets/images/` 생성, 쓰이지 않는 사본 삭제 |
| 랜딩 산출물 검사 | `npm run validate:landing-data` | 랜딩 산출물이 최신인지 확인 |
| 릴리스 입력 검증 | `npm run validate:release -- <버전>` | 입력 버전의 형식, 매니페스트 버전, 태그 존재, 태그가 HEAD를 가리키는지, 릴리스 노트 파일 확인 |
| 패키징 | `npm run package` | `dist/linkhu-v{version}.zip` 생성 |
| 빌드 | `npm run build` | 위 검증 전부와 패키징. 순서는 [6-2-4](6-2-DATA.md#6-2-4-검증-파이프라인) |

**1. 태그 push**

```bash
git switch main
git pull --ff-only
VERSION=$(node -p "require('./src/manifest.json').version")
git tag "v$VERSION"
git push origin "v$VERSION"
```

**2. Chrome 제출 실행**

```bash
gh workflow run publish-chrome.yml --ref main \
  -f version={version} -f confirm_publish=publish-chrome
```

**3. 공개 폼 점검**

[7-2-5](7-2-TEST-CASES.md#7-2-5-특별-검증-절차)의 표와 출력을 대조한다.

```bash
FORM=https://docs.google.com/forms/d/e/<폼 ID>/viewform
curl -sL "$FORM" -o /tmp/form.html

python3 - /tmp/form.html <<'PYEOF'
import re, sys, json
html = open(sys.argv[1], encoding="utf-8").read()
data = json.loads(re.search(r'FB_PUBLIC_LOAD_DATA_ = (.*?);</script>', html, re.S).group(1))
for question in data[1][1]:
    for entry in (question[4] or []):
        print(f'"{question[1]}"  entry.{entry[0]}  필수={"O" if entry[2] else "X"}')
PYEOF
```

<br>

### 6. 점검

스펙을 고친 PR은 아래를 돌린 뒤 올린다. 검색 결과는 후보이며 문맥으로 판정하고 일괄 삭제하지 않는다.

```bash
cd docs/spec

# 미래와 이력 문장
grep -nE '미정|추후|나중에|향후|예정|그때|이전에는|이전 스펙|정정|선행 작업|[0-9]{4}-[0-9]{2}-[0-9]{2} 기준' [1-7]*.md

# 책임 전가와 지양 표현, em dash
grep -nE '따른다|에서 다룬다|정본|SSOT|단일 진실|와이어링|뜻' [1-7]*.md
grep -n '—' *.md

# 링크와 앵커
python3 - <<'PY'
import re, pathlib
def slug(t):
    t = re.sub(r'[^\w\s-]', '', t.strip().lower())
    return re.sub(r'\s', '-', t)
heads = {p.name: {slug(h) for h in re.findall(r'^#+ (.+)$', p.read_text(), re.M)} for p in pathlib.Path('.').glob('*.md')}
for p in pathlib.Path('.').glob('*.md'):
    for target, anchor in re.findall(r'\]\(([\w.-]+\.md)?#([^)]+)\)', p.read_text()):
        name = target or p.name
        if name in heads and anchor not in heads[name]:
            print(f'{p.name}: {name}#{anchor}')
PY

# Mermaid 렌더
python3 - <<'PY'
import re, subprocess, pathlib
for p in sorted(pathlib.Path('.').glob('*.md')):
    for i, block in enumerate(re.findall(r'```mermaid\n(.*?)```', p.read_text(), re.S)):
        src = pathlib.Path(f'/tmp/{p.stem}-{i}.mmd'); src.write_text(block)
        r = subprocess.run(['npx', '-y', '@mermaid-js/mermaid-cli', '-i', str(src), '-o', f'/tmp/{p.stem}-{i}.svg'], capture_output=True)
        print(p.name, i, 'OK' if r.returncode == 0 else r.stderr.decode()[-200:])
PY

cd ../..
git diff --check
npm test
```

| 손으로 볼 것 | 통과 기준 |
| --- | --- |
| 이 문서가 맡은 역할만 있는가 | 위 1장의 "정하는 것"에 맞음 |
| 같은 사실이 다른 문서에도 있는가 | 원본 한 곳에만 있고 다른 문서는 상단 상세 위치 문장으로 연결함 |
| 코드 없이 구현할 수 있는가 | 동작, 변환, 분기, 실패가 있고 함수와 파일 구조를 옮겨 적지 않음 |
| 값의 근거를 확인했는가 | 숫자와 문구를 코드와 설정에서 직접 확인함 |
| 그림을 렌더해 봤는가 | 바꾼 그림을 열어 겹침, 교차, 글자 잘림이 없음 |
| 코드와 다른 곳을 어느 쪽에 맞췄는가 | README의 어긋남 처리 표대로 판단함 |
| 이름이나 절 번호를 바꿨는가 | 같은 대상을 가리키는 표, 그림, 링크와 앵커, 이 문서, 코드 주석의 스펙 번호를 모두 고침 |
| 상태 열이 실제와 같은가 | 1장의 문서 상태가 현재와 같음 |

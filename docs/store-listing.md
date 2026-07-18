# Store Listing

Chrome Web Store, Firefox Add-ons, Whale Store에 사용하는 스토어 설명 원본입니다.
릴리스마다 `[vX.Y.Z 업데이트]` 섹션을 새 릴리스 노트(`release-notes/vX.Y.Z.md`)의
사용자 노출 변경 중심으로 교체한 뒤, 각 스토어 대시보드에 붙여넣습니다.

## 한국어

```text
[v2.4.0 업데이트]
- 문의하기 추가: 팝업과 설정 페이지에서 바로 문의를 보낼 수 있습니다. (답변용 이메일 선택 입력 지원)
- LinKHU 홈페이지 바로가기 추가
- 검색 결과 정렬 개선: 이름이 일치하는 서비스가 먼저 표시되고, Enter로 첫 번째 결과를 바로 열 수 있습니다.

[주요 기능]
- 경희대학교 자주 찾는 사이트 바로가기 제공
- 커스텀 기능: 원하는 사이트만 담고, 드래그 앤 드롭으로 순서를 변경할 수 있습니다.

[편의 기능]
- 단축키[Ctrl(Cmd) + Shift + L]로 확장 프로그램을 실행할 수 있습니다.
- 서비스 검색: [/] 키로 검색창에 바로 이동하고, Enter로 첫 번째 결과를 열 수 있습니다.
- 확장 프로그램이 실행된 상태에서 숫자키[1~9]를 통한 빠른이동이 가능합니다.

[지원 사이트]
교내 서비스, 단과대, 학과 사이트를 지원합니다. 설정 창에서 커스텀할 수 있습니다.
자세한 리스트는 다음 링크를 참고해주세요.
https://github.com/kangkyunghyun/LinKHU/blob/main/docs/supported-services.md

[문의 및 기여]
사이트 추가나 개선 의견은 확장 프로그램의 [문의하기]에서 바로 보낼 수 있습니다.
Github Issue와 Pull Request를 통한 기여도 환영합니다.
홈페이지: https://kangkyunghyun.github.io/LinKHU/

도움이 되었다면 스토어 리뷰와 Github Stars 부탁드립니다. Stars는 개발자를 춤추게 합니다.
https://github.com/kangkyunghyun/LinKHU
```

## 갱신 절차

1. 릴리스 노트를 참고해 `[vX.Y.Z 업데이트]` 섹션을 교체한다.
2. 새 기능이 편의 기능/주요 기능으로 승격될 항목인지 확인한다.
   (업데이트 섹션은 다음 릴리스에서 사라지므로, 유지할 기능은 아래 섹션으로 옮긴다)
3. Chrome / Firefox / Whale 대시보드의 설명(What's new 포함)에 붙여넣는다.

#!/bin/bash
# 지원 서비스 접속 검사를 돌리고 link-check 이슈를 갱신한다(스펙 7-4-7).
# 해외 망에서는 교내 사이트 일부가 접속을 막으므로 국내에 늘 켜 둔 macOS 서버에서 돈다.
#
# 서버 설정
#   1. Node.js 22와 GitHub CLI(gh)를 설치한다
#   2. 이 저장소를 ~/Library/Application Support/linkhu-link-check/LinKHU 에 받는다
#   3. 이 저장소의 Issues 읽기·쓰기만 가진 fine-grained 토큰을 같은 폴더의 token 파일에 권한 600으로 둔다
#   4. bash scripts/link-check-daily.sh install 로 매일 04:17 실행을 등록한다
#   수동 실행: launchctl kickstart "gui/$(id -u)/com.local.linkhu-link-check"
#   로그: ~/Library/Logs/linkhu-link-check.log
set -eo pipefail

dir="$HOME/Library/Application Support/linkhu-link-check"
label=com.local.linkhu-link-check
log="$HOME/Library/Logs/linkhu-link-check.log"
cd "$(dirname "$0")/.."

case "${1:-}" in
  install)
    plist="$HOME/Library/LaunchAgents/$label.plist"
    cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>$PWD/scripts/link-check-daily.sh</string><string>daily</string></array>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>/opt/homebrew/bin:/usr/bin:/bin</string></dict>
  <key>StartCalendarInterval</key>
  <dict><key>Hour</key><integer>4</integer><key>Minute</key><integer>17</integer></dict>
  <key>StandardOutPath</key><string>$log</string>
  <key>StandardErrorPath</key><string>$log</string>
</dict>
</plist>
EOF
    launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$plist"
    exit 0 ;;
  daily)
    echo "== $(date '+%F %T')"
    git pull -q --ff-only || echo "main을 받지 못해 받아 둔 코드로 검사합니다" >&2
    exec /bin/bash scripts/link-check-daily.sh ;; # 방금 받은 스크립트로 검사
esac

GH_TOKEN=$(cat "$dir/token")
export GH_TOKEN GH_REPO=kangkyunghyun/LinKHU
report="$dir/report.md"
rm -f "$report"

set +e
node scripts/check-links.js --report "$report" --state "$dir/state.json" > /dev/null
status=$?
set -e
if [[ $status -gt 1 || ! -s $report ]]; then
  echo "접속 검사 실행 자체가 실패했습니다." >&2
  exit 1
fi
grep -E '^(검사|수정 검토 대상) ' "$report"

gh label create link-check --force --color D93F0B --description '지원 서비스 자동 접속 검사'
issues=$(gh issue list --label link-check --state open --limit 1000 --json number --jq '.[].number')
first=$(head -n 1 <<< "$issues")
if [[ $status == 1 ]]; then
  count=$(sed -n 's/^수정 검토 대상 \([0-9]*\)곳, 관찰 중 .*$/\1/p' "$report")
  [[ $count =~ ^[1-9][0-9]*$ ]] || { echo "보고서에서 수정 검토 대상 수를 읽지 못했습니다." >&2; exit 1; }
  title="[BUG] 지원 서비스 접속 실패 ${count}곳"
  if [[ -z $issues ]]; then
    gh issue create --label link-check --title "$title" --body-file "$report"
  else
    gh issue edit "$first" --title "$title" --body-file "$report"
    for issue in $(tail -n +2 <<< "$issues"); do
      gh issue close "$issue" --comment "접속 검사 결과를 #${first} 이슈로 통합합니다."
    done
  fi
else
  for issue in $issues; do
    gh issue close "$issue" --comment '하루 넘게 실패한 수정 검토 대상이 없어 자동 접속 검사 이슈를 닫습니다. 오늘 처음 실패한 서비스는 관찰을 계속합니다.'
  done
fi

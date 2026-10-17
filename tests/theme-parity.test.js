const assert = require("node:assert/strict");
const test = require("node:test");

const ThemeManager = require("../src/theme");
const LinKHUShared = require("../src/shared");
const LandingTheme = require("../landing/theme");

// 테마 규칙은 확장(src/theme.js, src/shared.js)과 랜딩(landing/theme.js)에 두 벌이다.
// 쪽마다 따로 테스트하면 한쪽만 바뀌어도 잡히지 않으므로 같은 입력에 같은 결과를 내는지
// 직접 비교한다(스펙 4-4-6, 이슈 #242).
const MODE_INPUTS = ["system", "light", "dark", "sepia", "", undefined, null, 42];

test("확장과 랜딩이 같은 모드 목록과 저장 실패 문구를 쓴다", () => {
  assert.deepEqual(LandingTheme.MODES, ThemeManager.MODES);
  assert.equal(LandingTheme.DEFAULT_MODE, ThemeManager.DEFAULT_MODE);
  assert.equal(LandingTheme.STORAGE_KEY, ThemeManager.STORAGE_KEY);
  assert.equal(LandingTheme.SAVE_FAILED_MESSAGE, ThemeManager.SAVE_FAILED_MESSAGE);
  assert.deepEqual(LandingTheme.MODE_NAMES, ThemeManager.MODE_NAMES);
});

test("확장과 랜딩이 같은 모드를 같은 테마로 해석한다", () => {
  MODE_INPUTS.forEach((mode) => {
    assert.equal(LandingTheme.normalizeMode(mode), ThemeManager.normalizeMode(mode), String(mode));
    [true, false].forEach((prefersDark) => {
      assert.equal(
        LandingTheme.resolveTheme(mode, prefersDark),
        ThemeManager.resolveTheme(mode, prefersDark),
        `${mode} / prefersDark=${prefersDark}`,
      );
    });
  });
});

test("확장과 랜딩의 순환 순서, 토글 레이블, 알림 문구가 같다", () => {
  MODE_INPUTS.forEach((mode) => {
    LandingTheme.currentMode = mode;
    assert.equal(LandingTheme.nextToggleMode(), ThemeManager.nextToggleMode(mode), String(mode));
    assert.equal(LandingTheme.toggleLabel(mode), ThemeManager.toggleLabel(mode), String(mode));
    assert.equal(LandingTheme.modeAnnouncement(mode), ThemeManager.modeAnnouncement(mode), String(mode));
  });
  LandingTheme.currentMode = LandingTheme.DEFAULT_MODE;
});

test("확장과 랜딩이 같은 라이트 경로에서 같은 다크 경로를 만든다", () => {
  const paths = [
    "images/common/portal.png",
    "images/colleges/engineering.png",
    "images/departments/cse.png",
    "images/dark/common/portal.png",
    "other/images/common/portal.png",
  ];
  paths.forEach((imgSrc) => {
    ["light", "dark", undefined].forEach((theme) => {
      assert.equal(LandingTheme.iconSrc(imgSrc, theme), LinKHUShared.iconSrc(imgSrc, theme), `${imgSrc} / ${theme}`);
    });
  });
});

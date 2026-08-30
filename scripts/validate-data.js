const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const DATA_FILE = path.join(SRC_ROOT, "data.js");
const SHARED_FILE = path.join(SRC_ROOT, "shared.js");
// 스펙 §4-2의 계약값이다. src/data.js의 SITE_CATEGORIES와 같은 목록을 유지한다.
// (data.js는 브라우저 전역 스크립트라 여기서 require할 수 없어 두 벌로 둔다.)
const ALLOWED_CATEGORIES = new Set([
  "학사·포털",
  "생활·복지",
  "장학·진로·창업",
  "교육·역량",
  "캠퍼스·문화",
  "대학·행정",
  "단과대",
  "학과",
]);
const REQUIRED_FIELDS = ["id", "name", "url", "imgSrc", "category"];
const VALID_ID_PATTERN = /^[a-z0-9-]+$/;
const VALID_IMAGE_EXTENSION_PATTERN = /\.(png|jpe?g|svg)$/i;
const IMAGE_DIRECTORIES = ["images/common", "images/colleges", "images/departments"];

// 팝업 카드 한 줄에 들어가는 폭이다. 팝업 320px에서 컨테이너·그리드·카드·span 패딩과
// 3열 gap을 빼면 68.7px이고, 스크롤바가 뜨면 66.7px이다. 좁은 쪽을 기준으로 잡는다.
// 카드 폭(src/popup.css의 .grid-item span)이 바뀌면 이 값도 같이 바뀌어야 한다.
const CARD_LINE_WIDTH_PX = 66.7;
// 글자 폭 근사다. Noto Sans KR 11.5px 기준 한글 11.5 / 라틴·숫자 6.9 / 그 외 5.0에서
// letter-spacing: -0.5px를 각각 뺀다. 실제 글자마다 폭이 다르므로 정확한 측정이 아니라,
// "표에 넣어야 할 만큼 긴 이름"을 걸러내기 위한 어림값이다.
const CHAR_WIDTH_PX = { hangul: 11.0, latin: 6.4, other: 4.5 };

function loadSiteList() {
  const source = fs.readFileSync(DATA_FILE, "utf8");
  const context = {};

  vm.createContext(context);
  vm.runInContext(`${source}\nthis.MASTER_SITE_LIST = MASTER_SITE_LIST;`, context, {
    filename: DATA_FILE,
  });

  if (!Array.isArray(context.MASTER_SITE_LIST)) {
    throw new Error("MASTER_SITE_LIST must be an array.");
  }

  return context.MASTER_SITE_LIST;
}

// data.js와 같은 방식으로 읽는다. shared.js는 DOM에 의존하지 않아 vm에서 그대로 돌아간다.
function loadShared() {
  const source = fs.readFileSync(SHARED_FILE, "utf8");
  const context = { module: undefined };

  vm.createContext(context);
  vm.runInContext(`${source}\nthis.LinKHUShared = LinKHUShared;`, context, {
    filename: SHARED_FILE,
  });

  if (!context.LinKHUShared) {
    throw new Error("LinKHUShared must be defined in src/shared.js.");
  }

  return context.LinKHUShared;
}

function estimateCardTextWidth(text) {
  return [...text].reduce((total, character) => {
    if (/[가-힣]/.test(character)) return total + CHAR_WIDTH_PX.hangul;
    if (/[A-Za-z0-9]/.test(character)) return total + CHAR_WIDTH_PX.latin;
    return total + CHAR_WIDTH_PX.other;
  }, 0);
}

// 공백이 있는 이름은 word-break: keep-all이 어절 단위로 꺾으므로 표가 필요 없다.
// 공백이 없는데 한 줄을 넘는 이름은 꺾을 자리가 없어 글자 사이 아무 데서나 꺾이므로,
// 줄바꿈 표나 예외 목록 둘 중 하나에 반드시 있어야 한다.
function findCardLineBreakErrors(siteList, shared) {
  const lineBreaks = shared.CARD_LINE_BREAKS || {};
  const wideNames = new Set(shared.WIDE_CARD_NAMES || []);
  const errors = [];

  siteList.forEach((site) => {
    if (!site || !isNonEmptyString(site.id) || !isNonEmptyString(site.name)) return;

    const firstLine = lineBreaks[site.id];
    if (firstLine !== undefined && !site.name.startsWith(firstLine)) {
      errors.push(
        `${site.id}: CARD_LINE_BREAKS first line "${firstLine}" is not a prefix of "${site.name}".`,
      );
    }

    if (/\s/.test(site.name)) return;
    if (estimateCardTextWidth(site.name) <= CARD_LINE_WIDTH_PX) return;
    if (firstLine !== undefined || wideNames.has(site.id)) return;

    errors.push(
      `${site.id}: "${site.name}" does not fit one card line and has no line break. ` +
        `Add it to CARD_LINE_BREAKS or WIDE_CARD_NAMES in src/shared.js.`,
    );
  });

  return errors;
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function findDuplicateValues(siteList, field) {
  const values = new Map();

  siteList.forEach((site, index) => {
    if (!site || !isNonEmptyString(site[field])) return;
    const entries = values.get(site[field]) || [];
    entries.push({ id: site.id || `index ${index}`, index });
    values.set(site[field], entries);
  });

  return [...values.entries()].filter(([, entries]) => entries.length > 1);
}

function findDuplicateFieldErrors(siteList) {
  return ["name", "url"].flatMap((field) =>
    findDuplicateValues(siteList, field).map(
      ([value, entries]) =>
        `duplicate ${field} "${value}" used by: ${entries
          .map((entry) => entry.id)
          .join(", ")}.`,
    ),
  );
}

function collectImagePaths(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectImagePaths(absolutePath);
    return entry.isFile() ? [absolutePath] : [];
  });
}

function normalizeImagePath(imagePath) {
  return imagePath.replace(/\\/g, "/");
}

function findUnusedImages(siteList) {
  const usedImages = new Set(
    siteList
      .filter((site) => site && isNonEmptyString(site.imgSrc))
      .map((site) => normalizeImagePath(site.imgSrc)),
  );

  return IMAGE_DIRECTORIES.flatMap((relativeDirectory) =>
    collectImagePaths(path.join(SRC_ROOT, relativeDirectory)),
  )
    .map((absolutePath) =>
      normalizeImagePath(path.relative(SRC_ROOT, absolutePath)),
    )
    .filter((relativePath) => VALID_IMAGE_EXTENSION_PATTERN.test(relativePath))
    .filter((relativePath) => !usedImages.has(relativePath))
    .sort();
}

function validateSiteList(siteList, shared = loadShared()) {
  const errors = [];
  const warnings = [];
  const seenIds = new Map();

  siteList.forEach((site, index) => {
    const label = site && site.id ? site.id : `index ${index}`;

    if (!site || typeof site !== "object" || Array.isArray(site)) {
      errors.push(`${label}: site entry must be an object.`);
      return;
    }

    REQUIRED_FIELDS.forEach((field) => {
      if (!isNonEmptyString(site[field])) {
        errors.push(`${label}: missing or empty required field "${field}".`);
      }
    });

    if (isNonEmptyString(site.id)) {
      if (!VALID_ID_PATTERN.test(site.id)) {
        errors.push(`${label}: id must use lowercase letters, numbers, or hyphens only.`);
      }

      const firstIndex = seenIds.get(site.id);
      if (firstIndex !== undefined) {
        errors.push(
          `${site.id}: duplicate id found at index ${index} (first used at index ${firstIndex}).`,
        );
      } else {
        seenIds.set(site.id, index);
      }
    }

    if (isNonEmptyString(site.category) && !ALLOWED_CATEGORIES.has(site.category)) {
      errors.push(
        `${label}: invalid category "${site.category}". Allowed categories: ${[
          ...ALLOWED_CATEGORIES,
        ].join(", ")}.`,
      );
    }

    if (isNonEmptyString(site.imgSrc)) {
      if (!VALID_IMAGE_EXTENSION_PATTERN.test(site.imgSrc)) {
        errors.push(
          `${label}: imgSrc must be a valid image file (.png, .jpg, .jpeg, .svg).`,
        );
      }

      const imagePath = path.join(SRC_ROOT, site.imgSrc);
      const relativePath = path.relative(SRC_ROOT, imagePath);
      const escapesSrcRoot =
        relativePath.startsWith("..") || path.isAbsolute(relativePath);

      if (escapesSrcRoot) {
        errors.push(`${label}: imgSrc must stay inside src/: ${site.imgSrc}`);
      } else if (!fs.existsSync(imagePath)) {
        errors.push(`${label}: imgSrc file does not exist: ${site.imgSrc}`);
      }
    }

    if (isNonEmptyString(site.url)) {
      try {
        const url = new URL(site.url);
        if (url.protocol === "http:") {
          warnings.push(`${label}: http URL should be checked for HTTPS support: ${site.url}`);
        } else if (url.protocol !== "https:") {
          errors.push(`${label}: unsupported URL protocol "${url.protocol}": ${site.url}`);
        }
      } catch {
        errors.push(`${label}: invalid URL: ${site.url}`);
      }
    }
  });

  errors.push(...findDuplicateFieldErrors(siteList));
  errors.push(...findCardLineBreakErrors(siteList, shared));

  findUnusedImages(siteList).forEach((imagePath) => {
    errors.push(`unused service image: ${imagePath}`);
  });

  return { errors, warnings };
}

function printResults(siteList, errors, warnings) {
  console.log(`Validated ${siteList.length} sites.`);

  if (warnings.length > 0) {
    console.log(`\nWarnings (${warnings.length}):`);
    warnings.forEach((warning) => console.log(`- ${warning}`));
  }

  if (errors.length > 0) {
    console.error(`\nErrors (${errors.length}):`);
    errors.forEach((error) => console.error(`- ${error}`));
    return;
  }

  console.log("\nData validation passed.");
}

function main() {
  try {
    const siteList = loadSiteList();
    const { errors, warnings } = validateSiteList(siteList);
    printResults(siteList, errors, warnings);

    if (errors.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`Data validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ALLOWED_CATEGORIES,
  estimateCardTextWidth,
  findCardLineBreakErrors,
  findDuplicateFieldErrors,
  findDuplicateValues,
  findUnusedImages,
  loadShared,
  loadSiteList,
  normalizeImagePath,
  validateSiteList,
};

const fs = require("fs");
const path = require("path");

const { PROJECT_ROOT, listFiles } = require("./lib");
const { ALLOWED_CATEGORIES, loadSiteList } = require("./validate-data");

const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const ASSETS_ROOT = path.join(PROJECT_ROOT, "landing", "assets");
const OUTPUT_FILE = path.join(ASSETS_ROOT, "services.json");
const ICON_OUTPUT_ROOT = path.join(ASSETS_ROOT, "images");
// 지원 서비스 목록 문서. 손으로 옮긴 사본은 한 번 어긋났으므로(이슈 #243) 데이터에서 만든다.
const SERVICES_DOC_FILE = path.join(PROJECT_ROOT, "docs", "supported-services.md");

// README, 랜딩, 이슈 템플릿, 스토어 설명이 이 문서로 링크한다. 카테고리 순서는 3-2 계약값이다.
function serializeSupportedServicesDoc(siteList) {
  const sections = [...ALLOWED_CATEGORIES].map((category) => {
    const names = siteList.filter((site) => site.category === category).map((site) => site.name);
    return [`## ${category} (${names.length}개)`, "", ...names.map((name) => `- ${name}`)].join("\n");
  });

  return [
    "# Supported Services",
    "",
    `LinKHU는 \`src/data.js\`의 \`MASTER_SITE_LIST\`를 기준으로 총 ${siteList.length}개 서비스를 지원한다.`,
    "",
    sections.join("\n\n"),
    "",
  ].join("\n");
}

function serializeLandingServices(siteList) {
  const services = siteList.map(({ id, name, url, category, imgSrc }) => ({
    id,
    name,
    url,
    category,
    imgSrc,
  }));

  return `${JSON.stringify(services, null, 2)}\n`;
}

// 랜딩 페이지가 확장과 같은 아이콘을 쓰도록 사용 중인 이미지 목록을 만든다.
// imgSrc는 "images/common/portal.png" 형태의 src/ 기준 상대 경로다.
// 아이콘은 라이트·다크 두 벌이므로 다크 경로도 함께 복사한다.
function collectUsedIconPaths(siteList) {
  const light = [...new Set(siteList.map((site) => site.imgSrc))];
  const dark = light.map((iconPath) => iconPath.replace(/^images\//, "images/dark/"));
  return [...light, ...dark].sort();
}

function collectCopiedIconPaths() {
  return listFiles(ICON_OUTPUT_ROOT).map((absolutePath) =>
    path.relative(ASSETS_ROOT, absolutePath).split(path.sep).join("/"),
  );
}

function syncLandingIcons(siteList) {
  const usedIconPaths = collectUsedIconPaths(siteList);

  usedIconPaths.forEach((iconPath) => {
    const sourceFile = path.join(SRC_ROOT, iconPath);
    const outputFile = path.join(ASSETS_ROOT, iconPath);

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.copyFileSync(sourceFile, outputFile);
  });

  const usedIconSet = new Set(usedIconPaths);
  collectCopiedIconPaths()
    .filter((iconPath) => !usedIconSet.has(iconPath))
    .forEach((iconPath) => {
      fs.rmSync(path.join(ASSETS_ROOT, iconPath));
    });

  return usedIconPaths.length;
}

function checkLandingIcons(siteList) {
  const usedIconPaths = collectUsedIconPaths(siteList);
  const usedIconSet = new Set(usedIconPaths);

  usedIconPaths.forEach((iconPath) => {
    const sourceFile = path.join(SRC_ROOT, iconPath);
    const outputFile = path.join(ASSETS_ROOT, iconPath);

    if (!fs.existsSync(outputFile)) {
      throw new Error(
        `Landing icon is missing: ${iconPath}. Run \`npm run generate:landing-data\`.`,
      );
    }

    if (!fs.readFileSync(sourceFile).equals(fs.readFileSync(outputFile))) {
      throw new Error(
        `Landing icon is out of date: ${iconPath}. Run \`npm run generate:landing-data\`.`,
      );
    }
  });

  const staleIcons = collectCopiedIconPaths().filter(
    (iconPath) => !usedIconSet.has(iconPath),
  );
  if (staleIcons.length > 0) {
    throw new Error(
      `Unused landing icons found: ${staleIcons.join(", ")}. Run \`npm run generate:landing-data\`.`,
    );
  }
}

function checkGeneratedFile(file, expected, label) {
  if (!fs.existsSync(file)) {
    throw new Error(`${label} is missing. Run \`npm run generate:landing-data\`.`);
  }

  const current = fs.readFileSync(file, "utf8");
  if (current !== expected) {
    throw new Error(`${label} is out of date. Run \`npm run generate:landing-data\`.`);
  }

  console.log(`${label} is up to date.`);
}

function checkLandingData(expected) {
  checkGeneratedFile(OUTPUT_FILE, expected, "Landing service data");
}

function checkSupportedServicesDoc(expected) {
  checkGeneratedFile(SERVICES_DOC_FILE, expected, "Supported services document");
}

function main() {
  const siteList = loadSiteList();
  const serializedServices = serializeLandingServices(siteList);
  const serializedDoc = serializeSupportedServicesDoc(siteList);

  if (process.argv.includes("--check")) {
    checkLandingData(serializedServices);
    checkLandingIcons(siteList);
    console.log("Landing icons are up to date.");
    checkSupportedServicesDoc(serializedDoc);
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, serializedServices);
  const iconCount = syncLandingIcons(siteList);
  fs.writeFileSync(SERVICES_DOC_FILE, serializedDoc);
  console.log(
    `Generated landing data at ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}, synced ${iconCount} icons, ` +
      `and wrote ${path.relative(PROJECT_ROOT, SERVICES_DOC_FILE)}.`,
  );
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Landing data generation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  checkLandingData,
  checkLandingIcons,
  checkSupportedServicesDoc,
  collectUsedIconPaths,
  serializeLandingServices,
  serializeSupportedServicesDoc,
  syncLandingIcons,
};

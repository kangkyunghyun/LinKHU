const fs = require("fs");
const path = require("path");

const { loadSiteList } = require("./validate-data");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const ASSETS_ROOT = path.join(PROJECT_ROOT, "docs", "assets");
const OUTPUT_FILE = path.join(ASSETS_ROOT, "services.json");
const ICON_OUTPUT_ROOT = path.join(ASSETS_ROOT, "images");

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

function collectCopiedIconPaths(directory = ICON_OUTPUT_ROOT) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectCopiedIconPaths(absolutePath);
    if (!entry.isFile()) return [];
    return [
      path.relative(ASSETS_ROOT, absolutePath).split(path.sep).join("/"),
    ];
  });
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

function checkLandingData(expected) {
  if (!fs.existsSync(OUTPUT_FILE)) {
    throw new Error(
      "Landing service data is missing. Run `npm run generate:landing-data`.",
    );
  }

  const current = fs.readFileSync(OUTPUT_FILE, "utf8");
  if (current !== expected) {
    throw new Error(
      "Landing service data is out of date. Run `npm run generate:landing-data`.",
    );
  }

  console.log("Landing service data is up to date.");
}

function main() {
  const siteList = loadSiteList();
  const serializedServices = serializeLandingServices(siteList);

  if (process.argv.includes("--check")) {
    checkLandingData(serializedServices);
    checkLandingIcons(siteList);
    console.log("Landing icons are up to date.");
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, serializedServices);
  const iconCount = syncLandingIcons(siteList);
  console.log(
    `Generated landing data at ${path.relative(PROJECT_ROOT, OUTPUT_FILE)} and synced ${iconCount} icons.`,
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
  collectUsedIconPaths,
  serializeLandingServices,
  syncLandingIcons,
};

const fs = require("fs");
const path = require("path");

const { loadSiteList } = require("./validate-data");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "docs", "assets", "services.json");

function serializeLandingServices(siteList) {
  const services = siteList.map(({ id, name, url, category }) => ({
    id,
    name,
    url,
    category,
  }));

  return `${JSON.stringify(services, null, 2)}\n`;
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
  const serializedServices = serializeLandingServices(loadSiteList());

  if (process.argv.includes("--check")) {
    checkLandingData(serializedServices);
    return;
  }

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, serializedServices);
  console.log(`Generated landing data at ${path.relative(PROJECT_ROOT, OUTPUT_FILE)}.`);
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
  serializeLandingServices,
};

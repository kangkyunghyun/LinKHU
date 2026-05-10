const fs = require("fs");
const path = require("path");
const vm = require("vm");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const DATA_FILE = path.join(SRC_ROOT, "data.js");
const ALLOWED_CATEGORIES = new Set(["공통", "단과대", "학과"]);
const REQUIRED_FIELDS = ["id", "name", "url", "imgSrc", "category"];

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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateSiteList(siteList) {
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

main();

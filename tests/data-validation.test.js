const assert = require("node:assert/strict");
const test = require("node:test");

const {
  findDuplicateValues,
  findUnusedImages,
  loadSiteList,
  validateSiteList,
} = require("../scripts/validate-data");

test("repository site data is valid and uses every service image", () => {
  const sites = loadSiteList();
  const { errors } = validateSiteList(sites);

  assert.deepEqual(errors, []);
  assert.deepEqual(findUnusedImages(sites), []);
});

test("duplicate service fields are detected", () => {
  const sites = [
    { id: "first", name: "같은 이름", url: "https://example.com", imgSrc: "a.png" },
    { id: "second", name: "같은 이름", url: "https://example.org", imgSrc: "b.png" },
  ];

  assert.deepEqual(
    findDuplicateValues(sites, "name").map(([value]) => value),
    ["같은 이름"],
  );
  assert.deepEqual(findDuplicateValues(sites, "url"), []);
});

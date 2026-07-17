const assert = require("node:assert/strict");
const test = require("node:test");

const {
  findDuplicateFieldErrors,
  findDuplicateValues,
  findUnusedImages,
  loadSiteList,
  normalizeImagePath,
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

test("multiple services may intentionally share an image", () => {
  const sites = [
    {
      id: "first",
      name: "첫 번째",
      url: "https://example.com/first",
      imgSrc: "images/common/khu.png",
    },
    {
      id: "second",
      name: "두 번째",
      url: "https://example.com/second",
      imgSrc: "images/common/khu.png",
    },
  ];

  assert.deepEqual(findDuplicateFieldErrors(sites), []);
});

test("image paths use consistent separators across platforms", () => {
  assert.equal(
    normalizeImagePath("images\\common\\khu.png"),
    "images/common/khu.png",
  );
});

const test = require("node:test");
const assert = require("node:assert/strict");

const LinKHUShared = require("../src/shared");

test("shared normalize removes spaces and letter case", () => {
  assert.equal(LinKHUShared.normalize("  e Campus "), "ecampus");
  assert.equal(LinKHUShared.normalize("소프트웨어 융합대학"), "소프트웨어융합대학");
  assert.equal(LinKHUShared.normalize(null), "");
});

test("shared matchesSearch matches name, id, and category", () => {
  const site = { id: "software", name: "소프트웨어 융합대학", category: "단과대" };

  assert.equal(
    LinKHUShared.matchesSearch(site, LinKHUShared.normalize("소프트웨어융합 대학")),
    true,
  );
  assert.equal(LinKHUShared.matchesSearch(site, "software"), true);
  assert.equal(LinKHUShared.matchesSearch(site, "단과대"), true);
  assert.equal(LinKHUShared.matchesSearch(site, "없는검색어"), false);
});

test("shared getDefaultOrder keeps 공통 sites in list order", () => {
  const sites = [
    { id: "a", category: "공통" },
    { id: "b", category: "학과" },
    { id: "c", category: "공통" },
  ];

  assert.deepEqual(LinKHUShared.getDefaultOrder(sites), ["a", "c"]);
});

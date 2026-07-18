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

test("shared rankSites orders by name prefix, name, id, then category", () => {
  const sites = [
    { id: "swcon", name: "소프트웨어융합학과", category: "학과" },
    { id: "software", name: "소프트웨어 융합대학", category: "단과대" },
    { id: "cs", name: "컴퓨터공학부", category: "학과" },
  ];

  assert.deepEqual(
    LinKHUShared.rankSites(sites, "소프트웨어").map((site) => site.id),
    ["swcon", "software"],
  );
  assert.deepEqual(
    LinKHUShared.rankSites(sites, "cs").map((site) => site.id),
    ["cs"],
  );
  assert.deepEqual(
    LinKHUShared.rankSites(sites, "학과").map((site) => site.id),
    ["swcon", "cs"],
  );
  assert.deepEqual(LinKHUShared.rankSites(sites, "  "), []);
});

test("shared rankSites matches landing search order", () => {
  const { searchServices } = require("../docs/landing");
  const services = [
    { id: "info21", name: "인포21", category: "공통" },
    { id: "ecampus", name: "e-Campus", category: "공통" },
    { id: "sugang", name: "수강신청", category: "공통" },
    { id: "software", name: "소프트웨어융합대학", category: "단과대" },
    { id: "swcon", name: "소프트웨어융합학과", category: "학과" },
    { id: "cs", name: "컴퓨터공학부", category: "학과" },
  ];

  ["소프트웨어", "E campus", "cs", "학과", "공통"].forEach((query) => {
    assert.deepEqual(
      LinKHUShared.rankSites(services, query)
        .slice(0, 5)
        .map((service) => service.id),
      searchServices(services, query).map((service) => service.id),
      `query "${query}" should rank identically on popup and landing`,
    );
  });
});

test("shared getDefaultOrder keeps 공통 sites in list order", () => {
  const sites = [
    { id: "a", category: "공통" },
    { id: "b", category: "학과" },
    { id: "c", category: "공통" },
  ];

  assert.deepEqual(LinKHUShared.getDefaultOrder(sites), ["a", "c"]);
});

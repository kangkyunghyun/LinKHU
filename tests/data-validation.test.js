const assert = require("node:assert/strict");
const test = require("node:test");

const {
  CARD_LINE_WIDTH_PX,
  estimateCardTextWidth,
  findCardLineBreakErrors,
  findDuplicateFieldErrors,
  findDuplicateValues,
  findUnusedImages,
  loadShared,
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

// 카드 폭을 바꾸는 사람이 반복해야 할 검사다. 폭 한 줄만 고치고 표를 두면
// 표에 있는 이름이 조용히 말줄임된다(#177 이전에 국제통상금융투자학부가 그랬다).
test("줄바꿈 표의 두 줄이 모두 카드 한 줄 폭에 들어간다", () => {
  const shared = loadShared();
  const nameById = new Map(loadSiteList().map((site) => [site.id, site.name]));

  Object.entries(shared.CARD_LINE_BREAKS).forEach(([id, firstLine]) => {
    const name = nameById.get(id);
    const secondLine = name.slice(firstLine.length);

    [firstLine, secondLine].forEach((line, index) => {
      assert.ok(
        estimateCardTextWidth(line) <= CARD_LINE_WIDTH_PX,
        `${id}: ${index + 1}번째 줄 "${line}"이 ${CARD_LINE_WIDTH_PX}px를 넘는다`,
      );
    });
  });
});

test("두 줄 중 하나라도 카드 폭을 넘으면 데이터 검증이 실패한다", () => {
  const errors = findCardLineBreakErrors(
    [{ id: "toolong", name: "가나다라마바사아자차" }],
    { CARD_LINE_BREAKS: { toolong: "가나다라마바사" }, WIDE_CARD_NAMES: [] },
  );

  assert.equal(errors.length, 1);
  assert.match(errors[0], /does not fit a .+px card line/);
});

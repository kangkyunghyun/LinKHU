const test = require("node:test");
const assert = require("node:assert/strict");

const { createFeedbackSubmission, FEEDBACK_TYPES } = require("../landing/landing");
const Feedback = require("../src/feedback");

const CONFIG = {
  formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
  messageEntry: "entry.123456789",
  emailEntry: "entry.987654321",
  typeEntry: "entry.275621407",
};

test("landing feedback submission matches the extension submission", () => {
  [
    ["문의 내용입니다", "khu@khu.ac.kr", "오류 제보"],
    ["이메일 없는 문의", "", "기능 건의"],
    ["기타 문의", "", "기타"],
  ].forEach(([message, email, type]) => {
    const landing = createFeedbackSubmission(message, email, type, CONFIG);
    const extension = Feedback.createSubmission(message, email, type, CONFIG);

    assert.equal(landing.url, extension.url);
    assert.equal(landing.body.toString(), extension.body.toString());
  });
});

test("landing feedback uses the same live form as the extension", () => {
  const landing = createFeedbackSubmission("문의", "khu@khu.ac.kr", "기타");
  const extension = Feedback.createSubmission("문의", "khu@khu.ac.kr", "기타");

  assert.equal(landing.url, extension.url);
  assert.equal(landing.body.toString(), extension.body.toString());
  assert.equal(landing.body.get("entry.1096769292"), "문의");
  assert.equal(landing.body.get("entry.491031779"), "khu@khu.ac.kr");
  assert.equal(landing.body.get("entry.275621407"), "기타");
});

test("landing and extension expose the exact same feedback choices in order", () => {
  assert.deepEqual(FEEDBACK_TYPES, ["오류 제보", "기능 건의", "기타"]);
  assert.deepEqual(FEEDBACK_TYPES, Feedback.FEEDBACK_TYPES);
});

test("landing omits the type when its value or entry is missing", () => {
  const emptyType = createFeedbackSubmission("문의", "", "", CONFIG);
  assert.equal(emptyType.body.has(CONFIG.typeEntry), false);
  const noEntry = createFeedbackSubmission("문의", "", "기타", {
    ...CONFIG, typeEntry: "",
  });
  assert.deepEqual([...noEntry.body.entries()], [[CONFIG.messageEntry, "문의"]]);
});

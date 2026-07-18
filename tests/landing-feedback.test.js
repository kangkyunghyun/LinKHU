const test = require("node:test");
const assert = require("node:assert/strict");

const { createFeedbackSubmission } = require("../docs/landing");
const Feedback = require("../src/feedback");

const CONFIG = {
  formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
  messageEntry: "entry.123456789",
  emailEntry: "entry.987654321",
};

test("landing feedback submission matches the extension submission", () => {
  [
    ["문의 내용입니다", "khu@khu.ac.kr"],
    ["이메일 없는 문의", ""],
  ].forEach(([message, email]) => {
    const landing = createFeedbackSubmission(message, email, CONFIG);
    const extension = Feedback.createSubmission(message, email, CONFIG);

    assert.equal(landing.url, extension.url);
    assert.equal(landing.body.toString(), extension.body.toString());
  });
});

test("landing feedback uses the same live form as the extension", () => {
  const landing = createFeedbackSubmission("문의", "khu@khu.ac.kr");
  const extension = Feedback.createSubmission("문의", "khu@khu.ac.kr");

  assert.equal(landing.url, extension.url);
  assert.equal(landing.body.toString(), extension.body.toString());
});

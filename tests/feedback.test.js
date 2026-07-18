const test = require("node:test");
const assert = require("node:assert/strict");

const Feedback = require("../src/feedback");

test("feedback stays disabled until the form is configured", () => {
  assert.equal(Feedback.isConfigured({ formUrl: "", messageEntry: "" }), false);
  assert.equal(
    Feedback.isConfigured({
      formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
      messageEntry: "",
    }),
    false,
  );
  assert.equal(
    Feedback.isConfigured({
      formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
      messageEntry: "entry.123456789",
    }),
    true,
  );
});

test("feedback submission targets the configured form entry", () => {
  const { url, body } = Feedback.createSubmission("팝업이 열리지 않아요", {
    formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
    messageEntry: "entry.123456789",
  });

  assert.equal(url, "https://docs.google.com/forms/d/e/FORM/formResponse");
  assert.equal(body.get("entry.123456789"), "팝업이 열리지 않아요");
});

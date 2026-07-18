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
  const { url, body } = Feedback.createSubmission("팝업이 열리지 않아요", "", {
    formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
    messageEntry: "entry.123456789",
  });

  assert.equal(url, "https://docs.google.com/forms/d/e/FORM/formResponse");
  assert.equal(body.get("entry.123456789"), "팝업이 열리지 않아요");
});

test("feedback submission includes email only when entry is configured", () => {
  const config = {
    formUrl: "https://docs.google.com/forms/d/e/FORM/formResponse",
    messageEntry: "entry.123456789",
    emailEntry: "entry.987654321",
  };

  const withEmail = Feedback.createSubmission("문의", "khu@khu.ac.kr", config);
  assert.equal(withEmail.body.get("entry.987654321"), "khu@khu.ac.kr");

  const withoutEmail = Feedback.createSubmission("문의", "", config);
  assert.equal(withoutEmail.body.has("entry.987654321"), false);

  const noEmailEntry = Feedback.createSubmission("문의", "khu@khu.ac.kr", {
    formUrl: config.formUrl,
    messageEntry: config.messageEntry,
    emailEntry: "",
  });
  assert.equal([...noEmailEntry.body.keys()].length, 1);
});

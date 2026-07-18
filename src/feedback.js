// 문의 전송 설정. docs/feedback-setup.md 절차대로 Google Form을 만든 뒤
// 아래 두 값을 채우면 팝업/설정 페이지의 문의 기능이 활성화된다.
// Google Forms 전송 주소는 공개돼도 안전하므로 확장 소스에 그대로 둔다.
const FEEDBACK_CONFIG = {
  // 예: "https://docs.google.com/forms/d/e/1FAIpQL.../formResponse"
  formUrl: "",
  // 예: "entry.123456789" (문의 내용 장문형 질문의 entry ID)
  messageEntry: "",
  // 예: "entry.987654321" (답변 받을 이메일 단답형 질문의 entry ID, 선택)
  // 비워두면 이메일 입력란이 표시되지 않는다.
  emailEntry: "",
};

const Feedback = {
  isConfigured(config = FEEDBACK_CONFIG) {
    return Boolean(config.formUrl && config.messageEntry);
  },

  createSubmission(message, email, config = FEEDBACK_CONFIG) {
    const body = new URLSearchParams({ [config.messageEntry]: message });
    if (email && config.emailEntry) {
      body.set(config.emailEntry, email);
    }
    return { url: config.formUrl, body };
  },

  // Google Forms는 CORS 응답 헤더를 주지 않으므로 no-cors로 보내고,
  // 네트워크 오류가 없으면 전송된 것으로 간주한다.
  async submit(message, email) {
    const { url, body } = this.createSubmission(message, email);
    await fetch(url, { method: "POST", mode: "no-cors", body });
  },
};

// 팝업과 설정 페이지가 같은 요소 id를 사용하므로 한 곳에서 와이어링한다.
function initFeedbackForm() {
  const toggle = document.getElementById("feedback-toggle");
  const panel = document.getElementById("feedback-panel");
  const messageInput = document.getElementById("feedback-message");
  const emailInput = document.getElementById("feedback-email");
  const sendBtn = document.getElementById("feedback-send");
  const status = document.getElementById("feedback-status");

  if (!toggle || !panel || !messageInput || !sendBtn || !status) return;

  // 이메일 질문(entry)이 연결된 경우에만 입력란을 보여준다.
  if (emailInput) {
    emailInput.hidden = !FEEDBACK_CONFIG.emailEntry;
  }

  toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    if (!panel.hidden) messageInput.focus();
  });

  sendBtn.addEventListener("click", async () => {
    const message = messageInput.value.trim();
    if (!message) {
      status.textContent = "문의 내용을 입력해주세요.";
      return;
    }

    const email =
      emailInput && !emailInput.hidden ? emailInput.value.trim() : "";
    if (email && !email.includes("@")) {
      status.textContent = "이메일 주소를 확인해주세요.";
      return;
    }

    if (!Feedback.isConfigured()) {
      status.textContent =
        "문의 채널이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.";
      return;
    }

    sendBtn.disabled = true;
    status.textContent = "전송 중...";

    try {
      await Feedback.submit(message, email);
      messageInput.value = "";
      status.textContent = "전송했습니다. 소중한 의견 감사합니다!";
    } catch (error) {
      console.error("문의 전송 실패:", error);
      status.textContent = "전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
    } finally {
      sendBtn.disabled = false;
    }
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", initFeedbackForm);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = Feedback;
}

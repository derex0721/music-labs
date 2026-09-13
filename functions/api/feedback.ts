interface Env {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

interface FeedbackSubmission {
  type: "general" | "bug" | "content";
  name: string;
  email: string;
  message: string;
}

const TO_EMAIL = "derexbowei0706@gmail.com";
const TYPE_LABELS: Record<FeedbackSubmission["type"], string> = {
  general: "一般建議",
  bug: "問題回報",
  content: "內容或功能建議",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function readText(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateFeedback(form: FormData):
  | { ok: true; data: FeedbackSubmission }
  | { ok: false; message: string } {
  if (readText(form, "bot-field")) {
    return { ok: false, message: "無法處理這次提交。" };
  }

  const type = readText(form, "type");
  if (!(type in TYPE_LABELS)) {
    return { ok: false, message: "請選擇有效的建議類型。" };
  }

  const data: FeedbackSubmission = {
    type: type as FeedbackSubmission["type"],
    name: readText(form, "name"),
    email: readText(form, "email").toLowerCase(),
    message: readText(form, "message"),
  };

  if (data.name.length > 80 || data.email.length > 160) {
    return { ok: false, message: "部分欄位超過允許長度。" };
  }

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, message: "請輸入有效的 Email。" };
  }

  if (data.message.length < 10 || data.message.length > 1500) {
    return { ok: false, message: "建議內容需為 10 至 1500 個字。" };
  }

  return { ok: true, data };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > 32_768) {
    return jsonResponse({ ok: false, message: "提交內容過大。" }, 413);
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin && new URL(origin).host !== requestUrl.host) {
    return jsonResponse({ ok: false, message: "不允許跨站提交。" }, 403);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ ok: false, message: "無法讀取提交內容。" }, 400);
  }

  const validation = validateFeedback(form);
  if (!validation.ok) {
    return jsonResponse({ ok: false, message: validation.message }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY secret");
    return jsonResponse(
      { ok: false, message: "意見信箱尚未完成設定，請稍後再試。" },
      503,
    );
  }

  const { type, name, email, message } = validation.data;
  const displayName = name || "匿名訪客";
  const displayEmail = email || "未提供";
  const submittedAt = new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Asia/Taipei",
  }).format(new Date());

  const emailPayload: Record<string, unknown> = {
    from: env.RESEND_FROM_EMAIL || "Music Labs <onboarding@resend.dev>",
    to: [TO_EMAIL],
    subject: `Music Labs 意見回饋｜${TYPE_LABELS[type]}`,
    text: [
      "Music Labs 收到新的意見回饋。",
      "",
      `類型：${TYPE_LABELS[type]}`,
      `姓名：${displayName}`,
      `Email：${displayEmail}`,
      `內容：${message}`,
      `提交時間：${submittedAt}`,
    ].join("\n"),
    html: `
      <h1>Music Labs 意見回饋</h1>
      <p><strong>類型：</strong>${escapeHtml(TYPE_LABELS[type])}</p>
      <p><strong>姓名：</strong>${escapeHtml(displayName)}</p>
      <p><strong>Email：</strong>${escapeHtml(displayEmail)}</p>
      <p><strong>內容：</strong></p>
      <p style="white-space: pre-wrap">${escapeHtml(message)}</p>
      <p><strong>提交時間：</strong>${escapeHtml(submittedAt)}</p>
    `,
  };

  if (email) emailPayload.reply_to = email;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    console.error("Resend delivery failed", response.status, await response.text());
    return jsonResponse(
      { ok: false, message: "郵件暫時無法寄出，請稍後再試。" },
      502,
    );
  }

  return jsonResponse({ ok: true, message: "意見已成功送出。" });
};


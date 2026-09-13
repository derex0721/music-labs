interface Env {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

interface Submission {
  name: string;
  email: string;
  role: string;
  portfolio: string;
  intro: string;
}

const TO_EMAIL = "derexbowei0706@gmail.com";
const ALLOWED_ROLES = new Set([
  "Producer",
  "Guitarist",
  "Vocalist",
  "DJ",
  "Composer",
]);

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

function validateSubmission(form: FormData):
  | { ok: true; data: Submission }
  | { ok: false; message: string } {
  if (readText(form, "bot-field")) {
    return { ok: false, message: "無法處理這次提交。" };
  }

  const data: Submission = {
    name: readText(form, "name"),
    email: readText(form, "email").toLowerCase(),
    role: readText(form, "role"),
    portfolio: readText(form, "portfolio"),
    intro: readText(form, "intro"),
  };

  if (!data.name || !data.email || !data.role || !data.portfolio || !data.intro) {
    return { ok: false, message: "請完整填寫所有必填欄位。" };
  }

  if (data.name.length > 80 || data.email.length > 160 || data.intro.length > 300) {
    return { ok: false, message: "部分欄位超過允許長度。" };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, message: "請輸入有效的 Email。" };
  }

  if (!ALLOWED_ROLES.has(data.role)) {
    return { ok: false, message: "請選擇有效的音樂人角色。" };
  }

  try {
    const portfolioUrl = new URL(data.portfolio);
    if (portfolioUrl.protocol !== "https:" && portfolioUrl.protocol !== "http:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return { ok: false, message: "請輸入有效的作品集網址。" };
  }

  return { ok: true, data };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const contentLength = Number(request.headers.get("Content-Length") || "0");
  if (contentLength > 16_384) {
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

  const validation = validateSubmission(form);
  if (!validation.ok) {
    return jsonResponse({ ok: false, message: validation.message }, 400);
  }

  if (!env.RESEND_API_KEY) {
    console.error("Missing RESEND_API_KEY secret");
    return jsonResponse(
      { ok: false, message: "投稿信箱尚未完成設定，請稍後再試。" },
      503,
    );
  }

  const { name, email, role, portfolio, intro } = validation.data;
  const submittedAt = new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "Asia/Taipei",
  }).format(new Date());

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || "Music Labs <onboarding@resend.dev>",
      to: [TO_EMAIL],
      reply_to: email,
      subject: `Music Labs 創作者投稿｜${name}｜${role}`,
      text: [
        "Music Labs 收到新的創作者聚落投稿。",
        "",
        `姓名／藝名：${name}`,
        `Email：${email}`,
        `角色：${role}`,
        `作品集：${portfolio}`,
        `一句話介紹：${intro}`,
        `提交時間：${submittedAt}`,
      ].join("\n"),
      html: `
        <h1>Music Labs 創作者投稿</h1>
        <p><strong>姓名／藝名：</strong>${escapeHtml(name)}</p>
        <p><strong>Email：</strong><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        <p><strong>角色：</strong>${escapeHtml(role)}</p>
        <p><strong>作品集：</strong><a href="${escapeHtml(portfolio)}">${escapeHtml(portfolio)}</a></p>
        <p><strong>一句話介紹：</strong>${escapeHtml(intro)}</p>
        <p><strong>提交時間：</strong>${escapeHtml(submittedAt)}</p>
      `,
    }),
  });

  if (!response.ok) {
    console.error("Resend delivery failed", response.status, await response.text());
    return jsonResponse(
      { ok: false, message: "郵件暫時無法寄出，請稍後再試。" },
      502,
    );
  }

  return jsonResponse({ ok: true, message: "作品資料已成功送出。" });
};


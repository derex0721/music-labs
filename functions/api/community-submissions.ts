import {
  CommunityContentSlugConflictError,
  createOrGetContentItem,
  getOrCreateCreator,
} from "../../db/community-repository.ts";
import type { CommunityPayload } from "../../db/community-validation.ts";
import { createCommunitySlug, validateCommunityContentType, validateCommunitySlug, validatePendingSubmissionStatus } from "../../db/community-validation.ts";
import type { CommunityDatabase } from "../../db/index.ts";

interface Env {
  DB?: CommunityDatabase;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
}

type SubmissionType = "course" | "event" | "note";
type Input = Record<string, unknown>;

const MAX_BODY = 100 * 1024;
const MAX_PAYLOAD = 48 * 1024;
const TYPES = new Set<SubmissionType>(["course", "event", "note"]);
const FORMATS = new Set(["Online", "In Person", "Hybrid"]);
const LEVELS = new Set(["Beginner", "Intermediate", "Advanced", "All Levels"]);
const PRICES = new Set(["Free", "Paid"]);
const LANGUAGES = new Set(["繁體中文", "English", "中文 / English"]);
const CURRENCIES = new Set(["TWD", "USD", "JPY", "KRW"]);
const CATEGORIES = new Set(["Music Production", "Songwriting", "Performance", "Music Theory", "Music Business", "Other"]);
const EVENT_TYPES = new Set(["Live Performance", "Workshop", "Meetup", "Jam Session", "Lecture", "Release Event", "Other"]);

const errorResponse = (message: string, status = 400) =>
  Response.json({ ok: false, message }, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
const text = (input: Input, key: string) => typeof input[key] === "string" ? input[key].trim() : "";
const safeUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch {
    return "";
  }
};
const directImageUrl = (value: string) => {
  const url = safeUrl(value);
  if (!url) return "";
  const parsed = new URL(url);
  return parsed.hostname === "drive.google.com" && parsed.pathname.includes("/file/") ? "" : url;
};
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
const oneOf = (value: string, allowed: Set<string>) => allowed.has(value);

function validateBase(input: Input): string {
  const title = text(input, "title");
  const creatorId = text(input, "creatorId");
  const creatorName = text(input, "creatorName");
  const email = text(input, "contactEmail").toLowerCase();
  if (!title || title.length > 160) return "請填寫 160 字以內的標題。";
  try {
    validateCommunitySlug(creatorId);
    if (input.slug !== undefined) {
      const slug = validateCommunitySlug(input.slug);
      if (slug.length > 120) return "內容網址 slug 不可超過 120 個字元。";
    }
  } catch (validationError) {
    return validationError instanceof Error ? validationError.message : "請選擇有效的 Artist Profile。";
  }
  if (creatorId.length > 80) return "Artist Profile slug 過長。";
  if (creatorName.length > 120) return "Artist Profile 名稱過長。";
  if (!validEmail(email) || email.length > 160) return "請輸入有效的聯絡 Email。";
  try {
    validatePendingSubmissionStatus(input.status);
  } catch {
    return "投稿狀態無效；新內容只能送交審核。";
  }
  return "";
}

function validateCourse(input: Input): string {
  const description = text(input, "shortDescription");
  const externalUrl = safeUrl(text(input, "externalUrl"));
  const cover = text(input, "coverImage");
  if (!description || description.length > 600) return "請填寫 600 字以內的課程簡介。";
  if (!oneOf(text(input, "category"), CATEGORIES)) return "課程 Category 無效。";
  if (!oneOf(text(input, "level"), LEVELS) || !oneOf(text(input, "format"), FORMATS)) return "課程 Level 或 Format 無效。";
  if (!oneOf(text(input, "language"), LANGUAGES)) return "請選擇有效的課程語言。";
  if (!oneOf(text(input, "priceType"), PRICES)) return "Price Type 無效。";
  if (!externalUrl) return "課程 / 報名連結必須是安全的 HTTPS 網址。";
  if (cover && !directImageUrl(cover)) return "Cover Image 必須是安全的直接 HTTPS 圖片網址，不能使用 Google Drive 分享頁。";
  if (text(input, "priceType") === "Paid" && (!Number.isFinite(Number(text(input, "price"))) || Number(text(input, "price")) <= 0 || Number(text(input, "price")) > 10000000 || !oneOf(text(input, "currency"), CURRENCIES))) return "付費課程請填寫有效價格與貨幣。";
  return "";
}

function validateEvent(input: Input): string {
  const description = text(input, "description");
  const start = new Date(text(input, "startDateTime"));
  const end = new Date(text(input, "endDateTime"));
  const cover = text(input, "coverImage");
  if (!description || description.length > 1500) return "請填寫 1500 字以內的活動介紹。";
  if (!oneOf(text(input, "eventType"), EVENT_TYPES) || !oneOf(text(input, "format"), FORMATS)) return "活動 Type 或 Format 無效。";
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start <= new Date() || end <= start) return "請填寫未來且有效的活動起訖時間。";
  if (!text(input, "timezone") || text(input, "timezone").length > 80) return "請選擇活動時區。";
  if (text(input, "format") !== "Online" && (!text(input, "venueName") || !text(input, "city") || !text(input, "country"))) return "實體或混合活動請填寫場地、城市與國家。";
  if (!safeUrl(text(input, "externalUrl"))) return "活動 / 報名連結必須是安全的 HTTPS 網址。";
  if (cover && !directImageUrl(cover)) return "Cover Image 必須是安全的直接 HTTPS 圖片網址，不能使用 Google Drive 分享頁。";
  if (!oneOf(text(input, "priceType"), PRICES)) return "Price Type 無效。";
  if (text(input, "priceType") === "Paid" && (!Number.isFinite(Number(text(input, "price"))) || Number(text(input, "price")) <= 0 || Number(text(input, "price")) > 10000000 || !oneOf(text(input, "currency"), CURRENCIES))) return "付費活動請填寫有效價格與貨幣。";
  return "";
}

function validateNote(input: Input): string {
  const excerpt = text(input, "excerpt");
  const content = text(input, "content");
  const cover = text(input, "coverImage");
  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (input.tags !== undefined && !Array.isArray(input.tags)) return "Tags 格式無效。";
  if (!excerpt || excerpt.length > 420 || !content || content.length > 12000) return "請填寫有效的摘要與文章內容。";
  if (cover && !directImageUrl(cover)) return "Cover Image 必須是安全的直接 HTTPS 圖片網址，不能使用 Google Drive 分享頁。";
  if (tags.length > 8 || tags.some((tag) => typeof tag !== "string" || tag.trim().length > 40)) return "Tags 最多 8 個，每個最多 40 字。";
  return "";
}

function contentPayload(type: SubmissionType, input: Input): CommunityPayload {
  const coverImage = directImageUrl(text(input, "coverImage"));
  if (type === "course") {
    return {
      category: text(input, "category"),
      shortDescription: text(input, "shortDescription"),
      coverImage,
      level: text(input, "level"),
      language: text(input, "language"),
      format: text(input, "format"),
      priceType: text(input, "priceType"),
      price: text(input, "priceType") === "Paid" ? Number(text(input, "price")) : null,
      currency: text(input, "currency"),
      externalUrl: safeUrl(text(input, "externalUrl")),
    };
  }
  if (type === "event") {
    return {
      eventType: text(input, "eventType"),
      description: text(input, "description"),
      coverImage,
      startDateTime: new Date(text(input, "startDateTime")).toISOString(),
      endDateTime: new Date(text(input, "endDateTime")).toISOString(),
      timezone: text(input, "timezone"),
      format: text(input, "format"),
      venueName: text(input, "venueName"),
      city: text(input, "city"),
      country: text(input, "country"),
      priceType: text(input, "priceType"),
      price: text(input, "priceType") === "Paid" ? Number(text(input, "price")) : null,
      currency: text(input, "currency"),
      externalUrl: safeUrl(text(input, "externalUrl")),
    };
  }
  return {
    excerpt: text(input, "excerpt"),
    content: text(input, "content"),
    coverImage,
    tags: (Array.isArray(input.tags) ? input.tags : []).map((tag) => String(tag).trim()),
  };
}

async function sendReviewEmail(env: Env, email: string, type: SubmissionType, item: { id: number; slug: string; title: string; payload: CommunityPayload }, creator: { slug: string; displayName: string }): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  const reviewPayload = { id: item.id, slug: item.slug, title: item.title, type, status: "pending", creator: { slug: creator.slug, displayName: creator.displayName }, payload: item.payload };
  const serialized = JSON.stringify(reviewPayload, null, 2);
  const emailPayload = {
    from: env.RESEND_FROM_EMAIL || "Music Labs <onboarding@resend.dev>",
    to: ["derexbowei0706@gmail.com"],
    reply_to: email,
    subject: "Music Labs " + type + " Review｜" + item.title.replace(/[\r\n]/g, " "),
    text: "待審核 " + type + " 投稿（不會自動公開）\n\n" + serialized + "\n\n--- 僅供管理，不公開 ---\n聯絡 Email：" + email,
    html: "<h1>待審核 " + escape(type) + " 投稿</h1><pre style=\"white-space:pre-wrap;font-family:inherit\">" + escape(serialized) + "</pre><hr><p>僅供管理，不公開</p><p>聯絡 Email：" + escape(email) + "</p>",
  };
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(emailPayload),
    });
  } catch {
    // D1 is the submission record of truth; a notification failure must not trigger duplicate retries.
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (new URL(request.headers.get("Origin") || "").origin !== new URL(request.url).origin) return errorResponse("不允許跨站提交。", 403);
  } catch {
    return errorResponse("請求來源無效。", 403);
  }
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) return errorResponse("投稿內容過大。", 413);

  let input: Input;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY) return errorResponse("投稿內容過大。", 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return errorResponse("投稿內容無效。");
    input = parsed as Input;
  } catch {
    return errorResponse("無法讀取投稿內容。");
  }

  let type: SubmissionType;
  try {
    type = validateCommunityContentType(input.type) as SubmissionType;
  } catch {
    return errorResponse("投稿類型無效。");
  }
  if (!TYPES.has(type)) return errorResponse("作品請使用既有 Artist Submission 流程。", 400);

  const validation = validateBase(input) || (type === "course" ? validateCourse(input) : type === "event" ? validateEvent(input) : validateNote(input));
  if (validation) return errorResponse(validation);
  if (!env.DB) return errorResponse("投稿服務暫時無法連線，請稍後再試。", 503);

  const creatorSlug = text(input, "creatorId");
  const creatorName = text(input, "creatorName") || creatorSlug.replace(/-/g, " ");
  const title = text(input, "title");
  const contactEmail = text(input, "contactEmail").toLowerCase();
  const payload = contentPayload(type, input);
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_PAYLOAD) return errorResponse("投稿內容過大，請縮短內容後重試。", 413);

  try {
    const creator = await getOrCreateCreator({ slug: creatorSlug, displayName: creatorName, status: "active" }, env.DB);
    const slug = input.slug === undefined ? createCommunitySlug(type, creator.slug, title) : validateCommunitySlug(input.slug);
    const item = await createOrGetContentItem({
      creatorId: creator.id,
      type,
      slug,
      title,
      payload,
      status: "pending",
    }, env.DB);
    await sendReviewEmail(env, contactEmail, type, item, creator);
    return Response.json({ ok: true, id: item.id, slug: item.slug, status: "pending", message: "投稿完成，已進入 Music Labs Pending Review。" }, { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (submissionError) {
    if (submissionError instanceof CommunityContentSlugConflictError) return errorResponse("相同網址已被其他內容使用，請修改標題後重試。", 409);
    return errorResponse("投稿暫時無法儲存，請稍後重試。", 503);
  }
};

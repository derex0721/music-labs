import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";

const ADMIN_USER_ID = "f2dfe94b-86ca-46d5-9642-b6ce46630220";
const CATEGORIES = new Set(["chord", "scale", "quiz", "tool", "AI 音樂", "Plugin", "免費資源", "DAW", "音樂科技", "硬體"]);
const MAX_BODY_BYTES = 16_384;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readJsonBody(request: Request) {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new Error("unsupported media type");
  }
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) throw new Error("body too large");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) throw new Error("body too large");
  return JSON.parse(raw) as Record<string, unknown>;
}

function db() {
  if (!env.DB) throw new Error("Database unavailable");
  return env.DB;
}

export async function GET() {
  try {
    const result = await db().prepare(
      "SELECT id, category, title, description, url, tags, created_at AS createdAt FROM content_items ORDER BY created_at DESC, id DESC LIMIT 200"
    ).all();
    return json({ items: result.results });
  } catch {
    return json({ error: "內容暫時無法載入。" }, 503);
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.userId !== ADMIN_USER_ID) return json({ error: "沒有管理權限。" }, 403);
  if (!isSameOrigin(request)) return json({ error: "請求來源無效。" }, 403);
  try {
    const body = await readJsonBody(request);
    const category = String(body.category ?? "").trim();
    const title = String(body.title ?? "").trim().slice(0, 120);
    const description = String(body.description ?? "").trim().slice(0, 600);
    const tags = String(body.tags ?? "").trim().slice(0, 120);
    const rawUrl = String(body.url ?? "").trim();
    if (!CATEGORIES.has(category) || !title) return json({ error: "請填寫有效的分類與標題。" }, 400);
    let url = "";
    if (rawUrl) {
      const parsed = new URL(rawUrl);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("invalid URL");
      url = parsed.toString().slice(0, 500);
    }
    const result = await db().prepare(
      "INSERT INTO content_items (category, title, description, url, tags, created_by) VALUES (?, ?, ?, ?, ?, ?) RETURNING id, category, title, description, url, tags, created_at AS createdAt"
    ).bind(category, title, description, url, tags, user.userId).first();
    return json({ item: result }, 201);
  } catch {
    return json({ error: "無法新增，請檢查網址與欄位。" }, 400);
  }
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user || user.userId !== ADMIN_USER_ID) return json({ error: "沒有管理權限。" }, 403);
  if (!isSameOrigin(request)) return json({ error: "請求來源無效。" }, 403);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return json({ error: "資料編號錯誤。" }, 400);
  await db().prepare("DELETE FROM content_items WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

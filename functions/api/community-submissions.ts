interface Env { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }

type SubmissionType = 'course' | 'event' | 'note';
type Input = Record<string, unknown> & { type?: SubmissionType; title?: string; creatorId?: string; contactEmail?: string; publishMode?: string };

const MAX_BODY = 100 * 1024;
const TYPES = new Set<SubmissionType>(['course','event','note']);
const FORMATS = new Set(['Online','In Person','Hybrid']);
const LEVELS = new Set(['Beginner','Intermediate','Advanced','All Levels']);
const PRICES = new Set(['Free','Paid']);
const EVENT_TYPES = new Set(['Live Performance','Workshop','Meetup','Jam Session','Lecture','Release Event','Other']);
const error = (message: string, status=400) => Response.json({ok:false,message},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const ok = (message: string) => Response.json({ok:true,message,status:'pending',publishMode:'review'},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const text = (input: Input, key: string) => typeof input[key] === 'string' ? input[key].trim() : '';
const safeUrl = (value: string) => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''; } catch { return ''; } };
const directImageUrl = (value: string) => { const url = safeUrl(value); if (!url) return ''; const parsed = new URL(url); return parsed.hostname === 'drive.google.com' && parsed.pathname.includes('/file/') ? '' : url; };
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const oneOf = (value: string, allowed: Set<string>) => allowed.has(value);
const slugify = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,72) || 'untitled';

function validBase(input: Input) {
  const type = input.type;
  const title = text(input,'title'); const creatorId = text(input,'creatorId'); const email = text(input,'contactEmail').toLowerCase();
  if (!TYPES.has(type as SubmissionType)) return '投稿類型無效。';
  if (!title || title.length > 160) return '請填寫 160 字以內的標題。';
  if (!/^[a-z0-9-]{1,80}$/i.test(creatorId)) return '請選擇有效的 Artist Profile。';
  if (!validEmail(email) || email.length > 160) return '請輸入有效的聯絡 Email。';
  return '';
}
function validateCourse(input: Input) {
  const description = text(input,'shortDescription'); const externalUrl = safeUrl(text(input,'externalUrl')); const cover = text(input,'coverImage');
  if (!description || description.length > 600) return '請填寫 600 字以內的課程簡介。';
  if (!oneOf(text(input,'level'),LEVELS) || !oneOf(text(input,'format'),FORMATS)) return '課程 Level 或 Format 無效。';
  if (!oneOf(text(input,'priceType'),PRICES)) return 'Price Type 無效。';
  if (!externalUrl) return '課程 / 報名連結必須是安全的 HTTPS 網址。';
  if (cover && !directImageUrl(cover)) return 'Cover Image 必須是安全的直接 HTTPS 圖片網址，不能使用 Google Drive 分享頁。';
  if (text(input,'priceType') === 'Paid' && (!(Number(text(input,'price')) > 0) || !text(input,'currency'))) return '付費課程請填寫價格與貨幣。';
  return '';
}
function validateEvent(input: Input) {
  const description = text(input,'description'); const start = new Date(text(input,'startDateTime')); const end = new Date(text(input,'endDateTime')); const cover = text(input,'coverImage');
  if (!description || description.length > 1500) return '請填寫 1500 字以內的活動介紹。';
  if (!oneOf(text(input,'eventType'),EVENT_TYPES) || !oneOf(text(input,'format'),FORMATS)) return '活動 Type 或 Format 無效。';
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start <= new Date() || end <= start) return '請填寫未來且有效的活動起訖時間。';
  if (!text(input,'timezone')) return '請選擇活動時區。';
  if (text(input,'format') !== 'Online' && (!text(input,'venueName') || !text(input,'city') || !text(input,'country'))) return '實體或混合活動請填寫場地、城市與國家。';
  if (!safeUrl(text(input,'externalUrl'))) return '活動 / 報名連結必須是安全的 HTTPS 網址。';
  if (cover && !directImageUrl(cover)) return 'Cover Image 必須是安全的直接 HTTPS 圖片網址，不能使用 Google Drive 分享頁。';
  if (!oneOf(text(input,'priceType'),PRICES)) return 'Price Type 無效。';
  if (text(input,'priceType') === 'Paid' && (!(Number(text(input,'price')) > 0) || !text(input,'currency'))) return '付費活動請填寫價格與貨幣。';
  return '';
}
function validateNote(input: Input) {
  const excerpt = text(input,'excerpt'); const content = text(input,'content'); const cover = text(input,'coverImage'); const tags = Array.isArray(input.tags) ? input.tags : [];
  if (!excerpt || excerpt.length > 420 || !content || content.length > 12000) return '請填寫有效的摘要與文章內容。';
  if (cover && !directImageUrl(cover)) return 'Cover Image 必須是安全的直接 HTTPS 圖片網址，不能使用 Google Drive 分享頁。';
  if (tags.length > 8 || tags.some((tag) => typeof tag !== 'string' || tag.length > 40)) return 'Tags 最多 8 個，每個最多 40 字。';
  return '';
}

export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  try { if (new URL(request.headers.get('Origin') || '').origin !== new URL(request.url).origin) return error('不允許跨站提交。',403); } catch { return error('請求來源無效。',403); }
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BODY) return error('投稿內容過大。',413);
  let input: Input; try { const raw = await request.text(); if (raw.length > MAX_BODY) return error('投稿內容過大。',413); input = JSON.parse(raw); } catch { return error('無法讀取投稿內容。'); }
  if (!input || typeof input !== 'object') return error('投稿內容無效。');
  const type = input.type as SubmissionType; const validation = validBase(input) || (type === 'course' ? validateCourse(input) : type === 'event' ? validateEvent(input) : validateNote(input));
  if (validation) return error(validation);
  if (!env.RESEND_API_KEY) return error('投稿信箱尚未完成設定，請稍後再試。',503);
  const now = new Date().toISOString(); const slug = slugify(text(input,'title'));
  const publicPayload = {...input,id:`${type}-${slug}-${Date.now()}`,slug,status:'pending',publishMode:'review',createdAt:now,updatedAt:now,submittedAt:now,coverImage:directImageUrl(text(input,'coverImage')),externalUrl:safeUrl(text(input,'externalUrl')) || undefined,price:text(input,'price') ? Number(text(input,'price')) : null};
  delete publicPayload.contactEmail;
  const email = text(input,'contactEmail').toLowerCase();
  const payload = {from:env.RESEND_FROM_EMAIL || 'Music Labs <onboarding@resend.dev>',to:['derexbowei0706@gmail.com'],reply_to:email,subject:`Music Labs ${type} Review｜${text(input,'title').replace(/[\r\n]/g,' ')}`,text:`待審核 ${type} 投稿（不會自動公開）\n\n${JSON.stringify(publicPayload,null,2)}\n\n--- 僅供管理，不公開 ---\n聯絡 Email：${email}`,html:`<h1>待審核 ${escape(type)} 投稿</h1><pre style="white-space:pre-wrap;font-family:inherit">${escape(JSON.stringify(publicPayload,null,2))}</pre><hr><p>僅供管理，不公開</p><p>聯絡 Email：${escape(email)}</p>`};
  try { const response = await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)}); if (!response.ok) return error('郵件暫時無法寄出，請稍後再試。',502); } catch { return error('投稿服務暫時無法連線，請稍後再試。',502); }
  return ok('投稿完成，已進入 Music Labs Pending Review。');
};

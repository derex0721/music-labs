import {
  CommunityContentSlugConflictError,
  createOrGetContentItem,
  getOrCreateCreator,
} from "../../db/community-repository.ts";
import { createCommunitySlug, validatePendingSubmissionStatus } from "../../db/community-validation.ts";
import type { CommunityDatabase } from "../../db/index.ts";

interface Env { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string; DB?: CommunityDatabase }

const MAX_FILE = 3 * 1024 * 1024;
const MAX_BODY = 10 * 1024 * 1024;
const MAX_PAYLOAD = 48 * 1024;
const MAX_RELEASES = 3;
const ROLES = new Set(['singer','songwriter','composer','producer','instrumentalist','dj','band','visual-artist','other']);
const GENRES = new Set(['pop','alternative-rnb','rnb','rock','indie','electronic','hip-hop','jazz','folk','world','classical','ambient','experimental','other']);
const RELEASE_TYPES = new Set(['Single','EP','Album','MV','Demo','Live','Other']);
const SOCIALS = ['instagram','youtube','spotify','soundcloud','bandcamp','website'] as const;

const text = (form: FormData, key: string) => { const value=form.get(key); return typeof value==='string'?value.trim():'' };
const values = (form: FormData, key: string) => form.getAll(key).filter((value): value is string => typeof value==='string').map(value=>value.trim()).filter(Boolean);
const reply = (message: string,status=400,extra: Record<string,unknown>={}) => Response.json({ok:status===200,message,...extra},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const safeUrl = (value: string) => { try { const url=new URL(value); return url.protocol==='https:'&&!url.username&&!url.password?url.toString():'' } catch { return '' } };
const slugify = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[^a-z0-9\s-]/g,'').trim().replace(/[\s_]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,64)||'artist';
const normalizeLegacyGenre = (value: string) => { const lower=value.toLowerCase(); if(lower.includes('alternative')&&lower.includes('r&b'))return'alternative-rnb'; if(lower.includes('r&b'))return'rnb'; if(lower.includes('pop')||value.includes('流行'))return'pop'; if(lower.includes('folk')||value.includes('民謠'))return'folk'; if(lower.includes('world')||value.includes('異國'))return'world'; return'other' };
const links = (items: string[]) => items.every(value=>Boolean(safeUrl(value)));

function validateImage(file: File, label: string) {
  if(file.size>MAX_FILE)return `${label}不可超過 3 MB。`;
  const type=file.type;
  if(!['image/jpeg','image/png','image/webp'].includes(type))return `${label}僅接受 JPG、PNG 或 WebP。`;
  return '';
}

async function attachment(file: File, label: string) {
  if(!file.size)return null;
  const error=validateImage(file,label);if(error)throw new Error(error);
  const bytes=new Uint8Array(await file.arrayBuffer());
  const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  const type=jpeg?'image/jpeg':png?'image/png':webp?'image/webp':'';
  if(!type||file.type!==type)throw new Error(`${label}不是有效的圖片檔案。`);
  let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const extension=type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';
  return {filename:`${label.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.${extension}`,content:btoa(binary),content_type:type,size:file.size};
}

async function uniqueSlug(name: string, request: Request) {
  const base=slugify(name);const used=new Set<string>();
  try { const response=await fetch(new URL('/artists-data.json',request.url));if(response.ok){const artists=await response.json() as Array<{id?:string;slug?:string}>;artists.forEach(artist=>{if(artist.id)used.add(artist.id);if(artist.slug)used.add(artist.slug)})} } catch {}
  if(!used.has(base))return base;let index=2;while(used.has(`${base}-${index}`))index++;return `${base}-${index}`;
}

function legacySocials(raw: string) { const result: Record<string,string>={};raw.split(/\r?\n/).map(value=>safeUrl(value.trim())).filter(Boolean).forEach(url=>{const host=new URL(url).hostname;if(host.includes('instagram'))result.instagram=url;else if(host.includes('youtube'))result.youtube=url;else if(host.includes('spotify'))result.spotify=url;else if(host.includes('soundcloud'))result.soundcloud=url;else result.website=url});return result }

export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  try { if(new URL(request.headers.get('Origin')||'').origin!==new URL(request.url).origin)return reply('不允許跨站提交。',403) } catch { return reply('請求來源無效。',403) }
  const contentLength=Number(request.headers.get('Content-Length')||0);if(contentLength>MAX_BODY)return reply('圖片或投稿內容過大。',413);
  let form: FormData;try{form=await request.formData()}catch{return reply('無法讀取投稿內容。')}
  if(text(form,'bot-field'))return reply('無法處理這次提交。');
  if(form.has('status')){try{validatePendingSubmissionStatus(form.get('status'))}catch{return reply('投稿狀態無效；新內容只能送交審核。')}}
  const name=text(form,'name'),email=text(form,'email').toLowerCase(),bioZh=text(form,'bioZh')||text(form,'intro'),bioEn=text(form,'bioEn')||text(form,'introEn');
  if(!name||!email||!bioZh)return reply('請完整填寫 Artist Name、Email 與中文介紹。');
  if(name.length>80||email.length>160||bioZh.length>2000||bioEn.length>3000)return reply('部分欄位超過允許長度。');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply('請輸入有效的 Email。');
  const newRoles=values(form,'roles');const oldRole=text(form,'role');const roles=[...new Set(newRoles.length?newRoles:(oldRole?[oldRole.toLowerCase()]:[]))];if(roles.some(role=>!ROLES.has(role))||roles.length>5)return reply('請選擇有效的 Role，最多 5 個。');
  const rawGenres=values(form,'genres');const legacyGenres=rawGenres.length?rawGenres:text(form,'genres').split(/[,，、]/).map(value=>value.trim()).filter(Boolean);const genres=[...new Set(legacyGenres.map(value=>GENRES.has(value)?value:normalizeLegacyGenre(value)))];if(!genres.length||genres.length>3)return reply('請選擇 1 至 3 個 Genre。');
  const genreOther=text(form,'genreOther');if(genres.includes('other')&&!genreOther)return reply('選擇 Other 後，請補充 Genre 名稱。');
  const slug=await uniqueSlug(text(form,'slug')||name,request);
  const titleValues=values(form,'releaseTitle[]');const typeValues=values(form,'releaseType[]');const urlValues=values(form,'releaseUrl[]');const genreValues=values(form,'releaseGenre[]');const descriptionValues=values(form,'releaseDescription[]');
  const oldUrls=text(form,'portfolio').split(/\r?\n/).map(value=>value.trim()).filter(Boolean);const releaseUrls=urlValues.length?urlValues:oldUrls;const releaseTitles=titleValues.length?titleValues:[text(form,'workTitle')||'Untitled release'];
  if(releaseUrls.length<1||releaseUrls.length>MAX_RELEASES||releaseTitles.length>MAX_RELEASES)return reply('請提供 1 至 3 個作品。');
  if(!links(releaseUrls))return reply('Release URL 必須是安全的 HTTPS 網址。');
  if(typeValues.some(type=>!RELEASE_TYPES.has(type)))return reply('請選擇有效的 Release Type。');
  const socials: Record<string,string>={};for(const key of SOCIALS){const value=text(form,key);if(value&&!safeUrl(value))return reply(`${key} 必須是安全的 HTTPS 網址。`);if(value)socials[key]=safeUrl(value)}
  const oldSocials=Object.keys(socials).length?{}:legacySocials(text(form,'socials'));Object.assign(socials,oldSocials);
  let avatarFile: Awaited<ReturnType<typeof attachment>> = null, heroFile: Awaited<ReturnType<typeof attachment>> = null;
  const artworks:Array<Awaited<ReturnType<typeof attachment>>> = [];
  try {
    const avatar=form.get('avatar')||form.get('photo');avatarFile=avatar&&typeof avatar!=='string'?await attachment(avatar,'artist-avatar'):null;if(!avatarFile&&!form.get('photo'))return reply('請上傳 Artist Avatar。');
    const hero=form.get('heroImage');heroFile=hero&&typeof hero!=='string'?await attachment(hero,'hero-image'):null;
    const artworkFiles=form.getAll('releaseArtwork[]').filter((value):value is File=>typeof value!=='string'&&value.size>0);for(const [index,file] of artworkFiles.entries())artworks.push(await attachment(file,`release-artwork-${index+1}`));
  } catch(error) { return reply(error instanceof Error?error.message:'圖片檔案無效。'); }
  if(text(form,'consent')!=='yes'||text(form,'rightsConsent')!=='yes')return reply('請先確認公開授權與圖片內容使用權。');
  const attachments=[avatarFile,heroFile,...artworks].filter(Boolean) as Array<{filename:string;content:string;content_type:string;size:number}>;if(attachments.reduce((sum,file)=>sum+file.size,0)>8*1024*1024)return reply('圖片總大小不可超過 8 MB。',413);
  const releases=releaseUrls.map((url,index)=>({id:`${slug}-release-${index+1}`,title:releaseTitles[index]||`Release ${index+1}`,type:typeValues[index]||'Other',genres:genreValues[index]?[genreValues[index]]:genres,artwork:artworks[index]?.filename||'',url,description:descriptionValues[index]||'',featured:index===0}));
  const artist={schemaVersion:'artist-profile-v2',id:slug,slug,name,roles,genres,bio:{zh:bioZh,en:bioEn},avatar:avatarFile?.filename||'',heroImage:heroFile?.filename||'',releases,socials,status:'pending',publishMode:'review',editorNotes:text(form,'editorNotes'),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(!env.DB)return reply('投稿服務暫時無法連線，請稍後再試。',503);
  let creator: Awaited<ReturnType<typeof getOrCreateCreator>>;
  const savedItems: Awaited<ReturnType<typeof createOrGetContentItem>>[]=[];
  try {
    creator=await getOrCreateCreator({slug,displayName:name,status:'pending'},env.DB);
    for(const [index,release] of releases.entries()){
      const workPayload={
        release:{id:release.id,title:release.title,type:release.type,genres:release.genres,artwork:release.artwork,url:release.url,description:release.description,featured:release.featured},
        artist:{name,roles,genres,bio:{zh:bioZh,en:bioEn},avatar:artist.avatar,heroImage:artist.heroImage,socials},
      };
      if(new TextEncoder().encode(JSON.stringify(workPayload)).byteLength>MAX_PAYLOAD)return reply('投稿內容過大，請縮短介紹或作品資訊後重試。',413);
      const workSlug=createCommunitySlug('work',creator.slug,release.title,release.url+':'+index);
      const item=await createOrGetContentItem({creatorId:creator.id,type:'work',slug:workSlug,title:release.title,payload:workPayload,status:'pending'},env.DB);
      savedItems.push(item);
    }
  } catch(error) {
    if(error instanceof CommunityContentSlugConflictError)return reply('相同網址已被其他作品使用，請修改作品標題後重試。',409);
    return reply('投稿暫時無法儲存，請稍後重試。',503);
  }
  const privateText=`聯絡 Email：${email}\n同意編輯協助：${text(form,'editConsent')==='yes'?'是':'否'}\n\n`;
  const publicText=JSON.stringify(artist,null,2);
  const payload={from:env.RESEND_FROM_EMAIL||'Music Labs <onboarding@resend.dev>',to:['derexbowei0706@gmail.com'],reply_to:email,subject:`Music Labs Artist Profile Review｜${name.replace(/[\r\n]/g,' ')}｜${slug}`,text:`待審核 Artist Profile（不會自動刊登）\n\n${publicText}\n\n--- 僅供管理，不公開 ---\n${privateText}`,html:`<h1>待審核 Artist Profile</h1><pre style="white-space:pre-wrap;font-family:inherit">${escape(publicText)}</pre><hr><p>僅供管理，不公開</p><pre style="white-space:pre-wrap;font-family:inherit">${escape(privateText)}</pre>`,...(attachments.length?{attachments:attachments.map(file=>({filename:file.filename,content:file.content,content_type:file.content_type}))}: {})};
  if(env.RESEND_API_KEY){try{await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(payload)})}catch{}}
  return reply('投稿完成，已進入 Music Labs Pending Review。',200,{id:savedItems[0]?.id,ids:savedItems.map(item=>item.id),status:'pending',publishMode:'review',creatorSlug:slug,slug:savedItems[0]?.slug||slug});
};

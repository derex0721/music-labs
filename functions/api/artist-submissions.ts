interface Env { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string }
const MAX_PHOTO = 3 * 1024 * 1024;
const MAX_BODY = MAX_PHOTO + 65536;
const roles = new Set(['Producer','Guitarist','Vocalist','DJ','Composer']);
const text = (f: FormData,k: string) => typeof f.get(k)==='string' ? String(f.get(k)).trim() : '';
const reply = (message: string,status=400) => Response.json({ok:status===200,message},{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const escape = (s: string) => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function links(value: string,max=5) {
  const rows=value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  if(rows.length>max) return false;
  return rows.every(v=>{try{const u=new URL(v);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}});
}
export const onRequestPost: PagesFunction<Env> = async ({request,env}) => {
  if(request.headers.get('Origin')!==new URL(request.url).origin) return reply('不允許跨站提交。',403);
  if(Number(request.headers.get('Content-Length')||0)>MAX_BODY) return reply('照片或提交內容過大。',413);
  let form: FormData;
  try {
    const reader=request.body?.getReader();if(!reader)return reply('沒有投稿內容。');
    const chunks: Uint8Array[]=[];let total=0;
    while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>MAX_BODY){await reader.cancel();return reply('照片或提交內容過大。',413)}chunks.push(value)}
    const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
    form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('Content-Type')||''}}).formData();
  } catch {return reply('無法讀取投稿內容。')}
  if(text(form,'bot-field'))return reply('無法處理這次提交。');
  const limits: Record<string,number>={name:80,email:160,role:30,intro:2000,introEn:3000,workTitle:200,portfolio:6000,socials:6000,photoUrl:2000,genres:200,placement:1000};
  const values: Record<string,string>={};
  for(const [field,max] of Object.entries(limits)){values[field]=text(form,field);if(values[field].length>max)return reply('部分欄位超過允許長度。')}
  for(const field of ['name','email','role','intro','portfolio','genres'])if(!values[field])return reply('請完整填寫所有必填欄位。');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))return reply('請輸入有效的 Email。');
  if(!roles.has(values.role))return reply('請選擇有效的創作角色。');
  if(!links(values.portfolio)||!links(values.socials)||!links(values.photoUrl,1))return reply('請填寫有效的 http／https 網址，作品與社群各最多 5 個，每行一個。');
  if(text(form,'consent')!=='yes')return reply('請先確認公開刊登授權。');
  const attachments: {filename:string;content:string;content_type:string}[]=[];
  const photo=form.get('photo');
  if(photo && typeof photo!=='string' && photo.size){
    if(photo.size>MAX_PHOTO)return reply('照片不可超過 3 MB。',413);
    const bytes=new Uint8Array(await photo.arrayBuffer());
    const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
    const webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
    const type=jpeg?'image/jpeg':png?'image/png':webp?'image/webp':'';
    if(!type||photo.type!==type)return reply('照片僅接受有效的 JPG、PNG 或 WebP 檔案。');
    let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
    attachments.push({filename:`creator-photo.${jpeg?'jpg':png?'png':'webp'}`,content:btoa(binary),content_type:type});
  }
  if(!env.RESEND_API_KEY)return reply('投稿信箱尚未完成設定，請稍後再試。',503);
  const labels: Record<string,string>={name:'創作者／藝名',intro:'中文介紹',introEn:'英文介紹',workTitle:'作品名稱',portfolio:'作品相關連結',socials:'社群／官方網站',photoUrl:'頭像或封面分享連結',genres:'作品風格／分類',placement:'位置／排序或其他補充',role:'創作角色'};
  const rows=Object.entries(labels).map(([k,label])=>`${label}：${values[k]||'未提供'}`);
  rows.push(`照片附件：${attachments.length?'已附上':'未提供'}`,'同意公開：是',`同意潤飾與英文翻譯：${text(form,'editConsent')==='yes'?'是':'否，請先徵詢創作者'}`);
  const publicText=rows.join('\n\n');
  const timestamp=new Date().toISOString();
  try{
    const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.RESEND_FROM_EMAIL||'Music Labs <onboarding@resend.dev>',to:['derexbowei0706@gmail.com'],reply_to:values.email,subject:`Music Labs 創作者投稿｜${values.name.replace(/[\r\n]/g,' ')}｜${values.role}`,text:`待審核投稿（不會自動刊登）\n\n${publicText}\n\n--- 僅供管理，不公開 ---\n聯絡 Email：${values.email}\n授權版本：creator-submission-v1\n提交時間：${timestamp}`,html:`<h1>待審核創作者投稿</h1><pre style="white-space:pre-wrap;font-family:inherit">${escape(publicText)}</pre><hr><p>僅供管理，不公開</p><p>聯絡 Email：${escape(values.email)}</p><p>授權版本：creator-submission-v1<br>提交時間：${timestamp}</p>`,...(attachments.length?{attachments}:{})})});
    if(!response.ok)return reply('郵件暫時無法寄出，請稍後再試。',502);
  }catch{return reply('投稿服務暫時無法連線，請稍後再試。',502)}
  return reply('作品資料已成功送出，審核後會再與你聯繫。',200);
};

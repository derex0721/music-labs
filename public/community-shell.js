const theme=document.documentElement;
const themeSessionKey='ml-theme-session';
const navigationType=performance.getEntriesByType('navigation')[0]?.type;
const cameFromMusicLabs=(()=>{try{return !!document.referrer&&new URL(document.referrer).origin===location.origin}catch{return false}})();
const savedTheme=navigationType!=='reload'&&cameFromMusicLabs&&sessionStorage.getItem(themeSessionKey)==='dark'?'dark':'light';
if(savedTheme==='light')sessionStorage.removeItem(themeSessionKey);
localStorage.removeItem('ml-theme');
theme.dataset.theme=savedTheme;
const communityPaths=/^\/(community|artists|works|notes|submit)(\/|$)/;
const isCommunity=communityPaths.test(location.pathname);
document.body.dataset.siteMode=isCommunity?'community':'wiki';
document.querySelectorAll('.mode-switch [data-mode]').forEach(link=>{const active=(link.dataset.mode==='community')===isCommunity;link.classList.toggle('active',active);link.setAttribute('aria-selected',String(active))});
const toggle=document.querySelector('[data-theme-toggle]');
function syncTheme(){const light=theme.dataset.theme==='light';if(toggle){toggle.textContent=light?'☾':'☀';toggle.setAttribute('aria-label',light?'切換深色模式':'切換亮色模式')}}
toggle?.addEventListener('click',()=>{theme.dataset.theme=theme.dataset.theme==='light'?'dark':'light';sessionStorage.setItem(themeSessionKey,theme.dataset.theme);syncTheme()});
syncTheme();

const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const safeHttps=value=>{try{const url=new URL(value);return url.protocol==='https:'?url.href:'#'}catch{return '#'}};
const worksGrid=location.pathname.startsWith('/works')?document.querySelector('main .empty-state'):null;
if(worksGrid){
  fetch('/artists-data.json').then(response=>response.ok?response.json():[]).then(artists=>{
    const works=artists.flatMap(artist=>(artist.works||[]).map(work=>({artist,work})));
    if(!works.length)return;
    worksGrid.classList.remove('empty-state');
    worksGrid.innerHTML=works.map(({artist,work})=>`<article class="community-work-card"><a class="community-work-cover" href="${safeHttps(work.url||work.embedUrl)}" target="_blank" rel="noopener noreferrer">${work.cover?`<img src="${escapeHtml(work.cover)}" alt="${escapeHtml(`${artist.name} — ${work.title} 作品封面`)}" loading="lazy">`:''}<span>↗</span></a><div><p class="community-work-type">${escapeHtml(work.genre||work.type||'WORK')}</p><h2>${escapeHtml(work.title)}</h2><p><a href="/artists/${escapeHtml(artist.id)}/">${escapeHtml(artist.name)}</a></p></div></article>`).join('');
  }).catch(()=>{});
}

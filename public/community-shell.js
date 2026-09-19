const theme=document.documentElement;
const savedTheme=localStorage.getItem('ml-theme')||'dark';
theme.dataset.theme=savedTheme;
const communityPaths=/^\/(community|artists|works|notes|submit)(\/|$)/;
const isCommunity=communityPaths.test(location.pathname);
document.body.dataset.siteMode=isCommunity?'community':'wiki';
document.querySelectorAll('.mode-switch [data-mode]').forEach(link=>{const active=(link.dataset.mode==='community')===isCommunity;link.classList.toggle('active',active);link.setAttribute('aria-selected',String(active))});
const toggle=document.querySelector('[data-theme-toggle]');
function syncTheme(){const light=theme.dataset.theme==='light';if(toggle){toggle.textContent=light?'☾':'☀';toggle.setAttribute('aria-label',light?'切換深色模式':'切換亮色模式')}}
toggle?.addEventListener('click',()=>{theme.dataset.theme=theme.dataset.theme==='light'?'dark':'light';localStorage.setItem('ml-theme',theme.dataset.theme);syncTheme()});
syncTheme();

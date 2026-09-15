document.getElementById('language').onclick=function(){const english=document.documentElement.lang!=='en';document.documentElement.lang=english?'en':'zh-Hant';this.textContent=english?'繁體中文':'English';this.setAttribute('aria-label',english?'切換為繁體中文':'Switch to English')};
const profileFooter=document.querySelector('main footer');
if(profileFooter){const github=document.createElement('a');github.href='https://github.com/derex0721/music-labs';github.target='_blank';github.rel='noopener noreferrer';github.textContent='GitHub ↗';profileFooter.append(document.createTextNode(' · '),github)}

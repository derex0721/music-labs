import { MusicSynth } from './music-synth.js?v=20260912-3';

const synth=new MusicSynth();
const NOTES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const html=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const pulse=(element,duration=220)=>{if(!element)return;clearTimeout(element._pulseTimer);element.classList.remove('is-playing');void element.offsetWidth;element.classList.add('is-playing');element._pulseTimer=setTimeout(()=>element.classList.remove('is-playing'),duration)};
const trackEvent=(name,props={})=>{try{window.gtag?.('event',name,props);window.plausible?.(name,{props})}catch(error){/* analytics are optional */}};

const learnItems=[
  {index:'01',label:'LEARN',title:'Chord Explorer',description:'看見組成音、公式與音程，立即播放並加入和弦進行。',href:'/#chords',action:'EXPLORE CHORDS'},
  {index:'02',label:'LEARN',title:'Scale Explorer',description:'比較音階結構、調式色彩與鍵盤位置，建立旋律語彙。',href:'/#scales',action:'EXPLORE SCALES'},
  {index:'03',label:'PRACTICE',title:'Music Quiz',description:'從辨識到組成音，每答一題都得到簡短的樂理解釋。',href:'/#quiz',action:'TAKE A QUIZ'}
];

const tools=[
  {icon:'4×',title:'Progression Lab',description:'依情緒與調性取得四和弦創作起點。',href:'/#progression-lab',status:'READY'},
  {icon:'⌁',title:'Chord Finder',description:'探索基礎與進階和弦，聆聽並理解結構。',href:'/#chords',status:'READY'},
  {icon:'△',title:'Scale Finder',description:'探索調式、藍調與對稱音階。',href:'/#scales',status:'READY'},
  {icon:'↕',title:'Transpose',description:'快速移調並保留和弦延伸音。',href:'/#transpose',status:'READY'},
  {icon:'×2',title:'BPM Calculator',description:'換算 Delay 時值，支援 Tap Tempo。',href:'/#bpm',status:'READY'},
  {icon:'○',title:'Circle of Fifths',description:'互動查看調號與常用功能和弦。',href:'/#circle-of-fifths',status:'READY'},
  {icon:'TAP',title:'Tap Tempo',description:'用點擊快速抓出歌曲或靈感的速度。',href:'/#bpm',status:'READY'}
];

const discoverItems=[
  {category:'AI Music',code:'DSS',title:'DiffSynth-Studio：開源生成模型與音樂工作流引擎',summary:'ModelScope 團隊維護的開源生成模型引擎，支援圖像、影片與音訊生成。音樂方面包含 DiffSynth-Music、YuE2、MiniMax-Music3 等模型，可用於音樂生成、控制與模型研究。',summaryEn:'An open-source generative model engine maintained by the ModelScope team, supporting image, video, and audio generation. Its music ecosystem includes DiffSynth-Music, YuE2, MiniMax-Music3, and related music generation workflows.',date:'2026-09-20',source:'GitHub · Open Source',url:'https://github.com/modelscope/DiffSynth-Studio/blob/main/README_zh.md',tags:['Open Source','Music Generation','Music Tech','Diffusion']},
  {category:'Music Tech',code:'UA',title:'Universal Audio：專業錄音硬體與 UAD 音樂製作工具',summary:'Universal Audio 官方平台，集合 UAD 外掛、LUNA 工作站、Apollo／Volt 音訊介面、麥克風與效果器，適合錄音、混音與音樂製作流程。',date:'2026-09-17',source:'Universal Audio',url:'https://www.uaudio.com/'},
  {category:'Music Tech',code:'AIMC',title:'AIMC 2026：第 7 屆 AI 音樂創意國際會議',summary:'於 2026 年 9 月 16–18 日在德國柏林舉行，聚焦 AI 與音樂創作的交會，涵蓋生成式創作、演出系統、機器聆聽、音樂倫理與創作者工作流程。',date:'2026-09-16',eventEndDate:'2026-09-18',source:'AIMC 2026',url:'https://aimc2026.org/home'},
  {category:'Software',code:'BAND',title:'BandBuddy：本機分軌與樂器練習工作站',summary:'支援本機音軌分離、A–B 循環、變速與移調，搭配節拍器及練習錄音，協助拆解歌曲、反覆練習。提供 Windows／macOS 版本；近期也推出 Android／iOS 版本。',date:'2026-09-13',source:'BandBuddy · GitHub',url:'https://github.com/dourgey/BandBuddy'},
  {category:'AI Music',code:'UMG × 11',title:'UMG × ElevenLabs：合作開發授權 AI 音樂創作平台',summary:'雙方簽署多年合作協議，規劃以授權音樂支援 Remix、Mashup 與個人化聲音體驗。',date:'2026-09-10',source:'Universal Music Group',url:'https://www.universalmusic.com/universal-music-group-and-elevenlabs-announce-multi-year-strategic-agreement-beginning-with-a-new-licensed-ai-music-creation-platform/'},
  {category:'Plugins',code:'EQ',title:'iZotope Ozone EQ：免費母帶等化器',summary:'提供動態顯示、Transient／Sustain、Mid／Side 處理與即時 Gain Match。',date:'2026-09-11',source:'Plugin Boutique',url:'https://www.pluginboutique.com/product/2-Effects/16-EQ/11504-iZotope-Ozone-EQ'},
  {category:'Plugins',code:'REASON',title:'Reason Free：免費集合 15 款經典 Reason 裝置的外掛',summary:'免費提供 Europa 合成器、Kong 鼓機、Echo 延遲、RV7000 MKII 混響等 15 款裝置，可作為 VST3／AU／AAX 外掛使用，也能獨立運行。',date:'2026-09-02',source:'MusicRadar',url:'https://www.musicradar.com/music-tech/plugins/reason-free-puts-15-classic-reason-devices-in-one-free-plugin-that-you-can-use-in-your-existing-daw'},
  {category:'Free Resources',code:'MASTER',title:'Vanity Lite：免費母帶處理 Plugin',summary:'分析音色、動態、響度與立體聲影像後建立四種母帶版本，支援 AU／VST3。',date:'2026-09-11',source:'AngelicVibes',url:'https://www.angelicvibes.com/vanity-lite/'},
  {category:'AI Music',code:'ACE',title:'ACE Studio：以 MIDI 與歌詞製作 AI 人聲',summary:'輸入 MIDI 與歌詞生成可編輯歌唱人聲，也提供 AI 樂器、合唱與聲音模型工具。',date:'2026-09-11',source:'ACE Studio',url:'https://acestudio.ai/'},
  {category:'AI Music',code:'AI',title:'Suno V6：改用授權音樂重新訓練',summary:'新一代模型強化結構、情緒與局部編輯控制，並提供不同使用取向的版本。',date:'2026-09-09',source:'MusicRadar',url:'https://www.musicradar.com/music-tech/suno-has-rebuilt-its-ai-music-models-from-scratch-with-licensed-music'},
  {category:'Plugins',code:'UAD',title:'Topline Vocal Tune 登上 Apollo 與 UAD-2',summary:'即時音高校正加入硬體 DSP，以低延遲監聽並支援 MIDI Repitching。',date:'2026-09-08',source:'MusicRadar',url:'https://www.musicradar.com/music-tech/universal-audios-topline-vocal-tune-is-now-available-for-apollo-and-uad-hardware'},
  {category:'Free Resources',code:'FREE',title:'免費 Casio SK-1 Lo-fi 取樣包',summary:'110MB 的 8-bit hits、beats、loops 與 one-shots，可免版稅用於作品。',date:'2026-09-04',source:'MusicRadar',url:'https://www.musicradar.com/music-tech/samples/this-free-casio-sk-1-sample-pack-will-remind-you-why-everybody-loves-this-miniature-lo-fi-legend'},
  {category:'Software',code:'6.1',title:'Bitwig Studio 6.1 重做 Sampler',summary:'新增五種切片方式、Spectral 與 Fragments 播放模式，以及自動音高分析。',date:'2026-08-27',source:'MusicRadar',url:'https://www.musicradar.com/music-tech/what-makes-a-modern-sampler-we-found-many-answers-to-this-question-and-decided-to-implement-all-of-them-bitwig-studio-6-1-launches-with-radically-updated-sampler-device'},
  {category:'Plugins',code:'MIDI',title:'Roland Melody Flip：探索旋律靈感的創作外掛',summary:'從音訊或超過 250 種風格範本出發，生成旋律、和弦、貝斯與鼓組，可匯出音訊及 MIDI。支援 VST3／AU，Roland Cloud 免費會員也可取得。',date:'2026-09-13',source:'Roland',url:'https://www.roland.com/global/products/rc_melody_flip/'},
  {category:'Hardware',code:'8×',title:'Elektron Outbox 8 擴充八路 Audio / CV',summary:'讓 groovebox 不經電腦便能拆分音軌輸出，也可作 MIDI-to-CV 與行動音訊介面。',date:'2026-09-09',source:'MusicRadar',url:'https://www.musicradar.com/music-tech/audio-interfaces/outbox-8-can-add-multiple-audio-and-cv-outputs-to-your-favourite-elektron-groovebox-or-any-other-class-compliant-hardware'},
  {category:'AI Music',code:'NOIZ',title:'Noiz Labs：可直接試玩的 AI 聲音實驗室',summary:'集合情感 TTS、聲音複製、音色設計、Video-to-SFX 與 AI BGM。',date:'2026-09-11',source:'NoizAI',url:'https://noiz.ai/labs'},
  {category:'Music Tech',code:'MOSS',title:'Mossland：AIGC 音訊與影片創作工作台',summary:'整合文字轉語音、音色庫、多語配音、轉錄與聲音處理工具。',date:'2026-09-11',source:'Mossland',url:'https://mossland.studio/'}
];

const discoverCategories=[
  {label:'All',slug:'all',intro:'為音樂創作者篩選值得關注的工具、資源與技術動態。'},
  {label:'AI Music',slug:'ai-music',intro:'生成音樂、智慧配樂、聲音模型與 AI 輔助創作工具。'},
  {label:'Plugins',slug:'plugins',intro:'音源、效果器、混音與製作 Plugin 的重要更新。'},
  {label:'Software',slug:'software',intro:'DAW、聲音軟體與創作工作流程的新功能。'},
  {label:'Hardware',slug:'hardware',intro:'合成器、控制器、音訊介面與製作設備。'},
  {label:'Free Resources',slug:'free-resources',intro:'可以立即加入創作流程的免費音色、取樣與工具。'},
  {label:'Tutorials',slug:'tutorials',intro:'能直接改善音樂製作與樂理理解的實用教學。'},
  {label:'Music Tech',slug:'music-tech',intro:'聲音、軟體與創作介面正在發生的技術變化。'}
];
const discoverCategoryLabels={
  'zh-Hant':{All:'全部','AI Music':'AI 音樂',Plugins:'外掛',Software:'軟體',Hardware:'硬體','Free Resources':'免費資源',Tutorials:'教學','Music Tech':'音樂科技'},
  'zh-Hans':{All:'全部','AI Music':'AI 音乐',Plugins:'插件',Software:'软件',Hardware:'硬件','Free Resources':'免费资源',Tutorials:'教程','Music Tech':'音乐科技'}
};
function discoverStatus(item){if(!item.eventEndDate)return'';const now=new Date();const start=new Date(`${item.date}T00:00:00`);const end=new Date(`${item.eventEndDate}T23:59:59`);return now<start?'即將開始':now<=end?'進行中':'已結束'}
function discoverCard(item){const status=discoverStatus(item);return `<a class="news-card" data-cat="${html(item.category)}" data-analytics-event="discover_open" href="${html(item.url)}" target="_blank" rel="noopener noreferrer" aria-label="Open original source: ${html(item.title)}"><div class="news-visual"><span>${html(item.code)}</span></div><div class="news-body"><span class="tag">${html(item.category)}</span>${status?`<span class="event-status">${status}</span>`:''}<h3>${html(item.title)}</h3><p>${html(item.summary)}</p><time datetime="${html(item.date)}">${html(item.date)} · ${html(item.source)} <b>↗</b></time></div></a>`}
function initStandaloneDiscover(){const grid=document.getElementById('newsPageGrid');if(!grid)return;const filters=document.getElementById('newsFilters');const search=document.getElementById('discoverSearch');const clear=document.getElementById('discoverSearchClear');const status=document.getElementById('discoverSearchStatus');const empty=document.getElementById('discoverEmpty');const locale=()=>document.getElementById('langSelect')?.value||localStorage.getItem('ml-locale')||'zh-Hant';const label=value=>discoverCategoryLabels[locale()]?.[value]||value;const normalize=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().trim();const sorted=[...discoverItems].sort((a,b)=>b.date.localeCompare(a.date));grid.innerHTML=sorted.map(discoverCard).join('');filters.innerHTML=discoverCategories.map(category=>`<a href="/discover/#discover/${category.slug}" data-cat="${category.label}">${label(category.label)}</a>`).join('');const sync=()=>{const hash=(location.hash||'#discover/all').slice(1).split('/');const selected=discoverCategories.find(category=>category.slug===(hash[1]||'all'))||discoverCategories[0];const selectedLabel=label(selected.label);const isChinese=locale().startsWith('zh');const query=normalize(search?.value);document.getElementById('newsEyebrow').textContent=isChinese?`探索 / ${selectedLabel}`:`DISCOVER / ${selected.slug.toUpperCase()}`;document.getElementById('newsTitle').innerHTML=selected.label==='All'?'Music <em>Discover</em>':`Discover <em>${html(selectedLabel)}</em>`;document.getElementById('newsIntro').textContent=selected.intro;filters.querySelectorAll('a').forEach(link=>{const active=link.dataset.cat===selected.label;link.classList.toggle('active',active);link.toggleAttribute('aria-current',active)});let visible=0;grid.querySelectorAll('.news-card').forEach(card=>{const item=discoverItems.find(entry=>entry.url===card.href);const matches=(selected.label==='All'||card.dataset.cat===selected.label)&&(!query||normalize([item?.title,item?.summary,item?.source,item?.category,label(item?.category)].join(' ')).includes(query));card.hidden=!matches;if(matches)visible++});clear.hidden=!query;status.textContent=query?`${visible} 個搜尋結果`:'';empty.hidden=visible!==0;grid.querySelectorAll('.news-card .tag').forEach(tag=>{tag.textContent=label(tag.closest('.news-card').dataset.cat)})};search?.addEventListener('input',sync);clear?.addEventListener('click',()=>{search.value='';search.focus();sync()});addEventListener('hashchange',sync);document.getElementById('langSelect')?.addEventListener('change',sync);const menuButton=document.getElementById('menuBtn');menuButton?.addEventListener('click',()=>{const menu=document.getElementById('mobileNav');const open=menu.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open))});document.querySelectorAll('.nav-trigger').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const next=button.getAttribute('aria-expanded')!=='true';document.querySelectorAll('.nav-trigger').forEach(item=>item.setAttribute('aria-expanded','false'));button.setAttribute('aria-expanded',String(next))}));document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelectorAll('.nav-trigger').forEach(button=>button.setAttribute('aria-expanded','false'));document.getElementById('mobileNav')?.classList.remove('open');menuButton?.setAttribute('aria-expanded','false')}});sync()}
const standaloneDiscover=document.body.dataset.discoverStandalone==='true';
if(!standaloneDiscover){

const routeAliases={news:'discover','ai-chords':'progression-lab','tool-overview':'tools'};
function syncSiteMode(){
  const community=Boolean(document.body.dataset.communityMode==='true');
  document.body.dataset.siteMode=community?'community':'wiki';
  document.querySelectorAll('.mode-switch [data-mode]').forEach(link=>{const active=(link.dataset.mode==='community')===community;link.setAttribute('aria-selected',String(active));link.classList.toggle('active',active)});
  document.querySelector('.wiki-navigation')?.toggleAttribute('hidden',community);
  document.querySelector('.community-navigation')?.toggleAttribute('hidden',!community);
  document.querySelector('.mobile-wiki-navigation')?.toggleAttribute('hidden',community);
  document.querySelector('.mobile-community-navigation')?.toggleAttribute('hidden',!community);
}
function pageFromLocation(){
  if(location.hash){const raw=location.hash.slice(1).split('/')[0]||'home';return routeAliases[raw]||raw}
  const queryRoute=new URLSearchParams(location.search).get('route');
  if(queryRoute)return routeAliases[queryRoute]||queryRoute;
  const path=location.pathname.replace(/\/$/,'')||'/';
  if(/^\/chords\//.test(path))return'chords';
  if(/^\/scales\//.test(path))return'scales';
  return {'/':'home','/index.html':'home','/music-labs.html':'home','/discover':'discover','/chords-scales':'chords-scales','/tools/transpose':'transpose','/tools/bpm':'bpm','/tools/bpm-calculator':'bpm','/tools/ai-chords':'progression-lab','/tools/progression-lab':'progression-lab','/tools/circle-of-fifths':'circle-of-fifths'}[path]||'home';
}
function route(){
  const name=pageFromLocation();
  const page=document.querySelector(`[data-page="${name}"]`)||document.querySelector('[data-page="home"]');
  document.querySelectorAll('.page').forEach(item=>item.classList.toggle('active',item===page));
  const section=['transpose','bpm','progression-lab','circle-of-fifths'].includes(name)?'tools':name;
  document.querySelectorAll('[data-nav]').forEach(link=>link.classList.toggle('active',link.dataset.nav===name||link.dataset.nav===section));
  document.querySelectorAll('.nav-group').forEach(group=>group.classList.toggle('active',Boolean(group.querySelector('[data-nav].active'))));
  syncSiteMode();
  document.getElementById('mobileNav')?.classList.remove('open');
  document.getElementById('menuBtn')?.setAttribute('aria-expanded','false');
  document.querySelectorAll('.nav-trigger').forEach(button=>button.setAttribute('aria-expanded','false'));
  scrollTo(0,0);
}
addEventListener('hashchange',route);
document.querySelectorAll('.mode-switch [data-mode]').forEach(link=>link.addEventListener('click',()=>{document.querySelectorAll('.mode-switch [data-mode]').forEach(item=>item.setAttribute('aria-selected',String(item===link)))}));
route();

const menuButton=document.getElementById('menuBtn');
menuButton?.addEventListener('click',()=>{const menu=document.getElementById('mobileNav');const open=menu.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open))});
document.querySelectorAll('.nav-trigger').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();const next=button.getAttribute('aria-expanded')!=='true';document.querySelectorAll('.nav-trigger').forEach(item=>item.setAttribute('aria-expanded','false'));button.setAttribute('aria-expanded',String(next))}));
document.addEventListener('click',event=>{if(!event.target.closest('.nav-group'))document.querySelectorAll('.nav-trigger').forEach(button=>button.setAttribute('aria-expanded','false'))});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){document.querySelectorAll('.nav-trigger').forEach(button=>button.setAttribute('aria-expanded','false'));document.getElementById('mobileNav')?.classList.remove('open');menuButton?.setAttribute('aria-expanded','false')}});

document.getElementById('homeLearn').innerHTML=learnItems.map(item=>`<a class="learn-card" data-analytics-event="learning_step" href="${item.href}"><span class="learn-index">${item.index}</span><small>${item.label}</small><h3>${item.title}</h3><p>${item.description}</p><b>${item.action} →</b></a>`).join('');
const primaryTools=['Progression Lab','Circle of Fifths','Transpose','BPM Calculator'];
document.getElementById('homeTools').innerHTML=tools.filter(tool=>primaryTools.includes(tool.title)).map(tool=>`<a class="creator-tool-card" data-analytics-event="tool_open" href="${tool.href}"><span class="tool-icon">${tool.icon}</span><div><small>${tool.status}</small><h3>${tool.title}</h3><p>${tool.description}</p></div><b>↗</b></a>`).join('');
document.getElementById('toolsPage').innerHTML=tools.map((tool,index)=>`<article class="tool-card product-tool-card"><header><span class="tool-icon">${tool.icon}</span><small>${String(index+1).padStart(2,'0')} / ${tool.status}</small></header><h3>${tool.title}</h3><p>${tool.description}</p><a class="tool-open-link" data-analytics-event="tool_open" href="${tool.href}">OPEN TOOL →</a></article>`).join('');

const latestDiscoverItems=[...discoverItems].sort((a,b)=>b.date.localeCompare(a.date));
document.getElementById('homeNews').innerHTML=latestDiscoverItems.slice(0,3).map(discoverCard).join('');
document.getElementById('newsPageGrid').innerHTML=latestDiscoverItems.map(discoverCard).join('');
const discoverLocale=()=>document.getElementById('langSelect')?.value||localStorage.getItem('ml-locale')||'zh-Hant';
const discoverCategoryLabel=label=>discoverCategoryLabels[discoverLocale()]?.[label]||label;
function renderDiscoverCategoryLabels(){
  document.querySelectorAll('#newsFilters [data-cat]').forEach(link=>{link.textContent=discoverCategoryLabel(link.dataset.cat)});
  document.querySelectorAll('.news-card').forEach(card=>{const tag=card.querySelector('.tag');if(tag)tag.textContent=discoverCategoryLabel(card.dataset.cat)});
}
document.getElementById('newsFilters').innerHTML=discoverCategories.map(category=>`<a href="/#discover/${category.slug}" data-cat="${category.label}">${discoverCategoryLabel(category.label)}</a>`).join('');
const discoverSearch=document.getElementById('discoverSearch');
const discoverSearchClear=document.getElementById('discoverSearchClear');
const discoverSearchStatus=document.getElementById('discoverSearchStatus');
const discoverEmpty=document.getElementById('discoverEmpty');
const normalizeSearch=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().trim();
function syncDiscover(){const hash=(location.hash||'#discover/all').slice(1).split('/');if(!['discover','news'].includes(hash[0]))return;const selected=discoverCategories.find(category=>category.slug===(hash[1]||'all'))||discoverCategories[0];const label=discoverCategoryLabel(selected.label);const chinese=discoverLocale().startsWith('zh');const query=normalizeSearch(discoverSearch?.value);document.getElementById('newsEyebrow').textContent=chinese?`探索 / ${label}`:`DISCOVER / ${selected.slug.toUpperCase()}`;document.getElementById('newsTitle').innerHTML=selected.label==='All'?'Music <em>Discover</em>':`Discover <em>${html(label)}</em>`;document.getElementById('newsIntro').textContent=selected.intro;document.querySelectorAll('#newsFilters a').forEach(link=>{const active=link.dataset.cat===selected.label;link.classList.toggle('active',active);if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current')});let visible=0;document.querySelectorAll('#newsPageGrid .news-card').forEach(card=>{const item=discoverItems.find(entry=>entry.url===card.href);const haystack=normalizeSearch([item?.title,item?.summary,item?.source,item?.category,discoverCategoryLabel(item?.category)].join(' '));const show=(selected.label==='All'||card.dataset.cat===selected.label)&&(!query||haystack.includes(query));card.hidden=!show;if(show)visible++});if(discoverSearchClear)discoverSearchClear.hidden=!query;if(discoverSearchStatus)discoverSearchStatus.textContent=query?`${visible} 個搜尋結果`:'';if(discoverEmpty)discoverEmpty.hidden=visible!==0;renderDiscoverCategoryLabels()}
discoverSearch?.addEventListener('input',syncDiscover);
discoverSearchClear?.addEventListener('click',()=>{discoverSearch.value='';discoverSearch.focus();syncDiscover()});
document.addEventListener('click',event=>{const target=event.target.closest('[data-analytics-event]');if(target)trackEvent(target.dataset.analyticsEvent,{label:(target.querySelector('h3')?.textContent||target.textContent||'').trim().slice(0,80)})});
addEventListener('hashchange',syncDiscover);syncDiscover();
document.getElementById('langSelect')?.addEventListener('change',()=>{renderDiscoverCategoryLabels();syncDiscover()});

const quickNotes=['C4','E4','G4','B4'];
const quickPitch=new Set(['C','E','G','B']);
const quickPiano=document.getElementById('homeQuickPiano');
quickPiano.innerHTML=NOTES.concat('C').map((note,index)=>`<button class="${note.includes('#')?'black':''} ${quickPitch.has(note)?'active':''}" data-note="${note}${index===12?5:4}" type="button" aria-label="Play ${note}${index===12?5:4}">${note.replace('#','♯')}</button>`).join('');
quickPiano.addEventListener('click',event=>{const key=event.target.closest('button');if(!key)return;synth.play([key.dataset.note],{onNote:()=>pulse(key)}).then(()=>{document.getElementById('homeAudioStatus').textContent='Audio ready.'}).catch(()=>{document.getElementById('homeAudioStatus').textContent='請確認裝置音量後再試一次。'})});
document.getElementById('homePlayChord').addEventListener('click',event=>{pulse(event.currentTarget);synth.play(quickNotes,{onNote:note=>{const pitch=note.replace(/\d+$/,'');pulse(quickPiano.querySelector(`[data-note^="${pitch}"]`))}}).then(()=>{document.getElementById('homeAudioStatus').textContent='Playing Cmaj7 · C E G B'}).catch(()=>{document.getElementById('homeAudioStatus').textContent='請確認裝置音量後再試一次。'})});

const quizQuestions=[
  {type:'chord',difficulty:'beginner',question:'C – E – G 組成什麼和弦？',options:['C Major','C Minor','F Major','A Minor'],answer:'C Major',explanation:'C Major = 1 – 3 – 5。C → E 是 Major 3rd，E → G 是 Minor 3rd。'},
  {type:'chord',difficulty:'beginner',question:'A – C – E 組成什麼和弦？',options:['A Major','A Minor','C Major','E Minor'],answer:'A Minor',explanation:'A Minor = 1 – ♭3 – 5。小三度 A → C 決定了小和弦色彩。'},
  {type:'chord',difficulty:'intermediate',question:'D – F – A – C 是哪一個和弦？',options:['Dm7','D7','Dmaj7','F6'],answer:'Dm7',explanation:'Dm7 = 1 – ♭3 – 5 – ♭7，也就是 D、F、A、C。'},
  {type:'chord',difficulty:'advanced',question:'C – E – G – B♭ – D♯ 最接近哪個和弦？',options:['C9','C7♯9','Cmaj9','Cm9'],answer:'C7♯9',explanation:'C7♯9 = 1 – 3 – 5 – ♭7 – ♯9。♯9 帶來強烈的 altered dominant 色彩。'},
  {type:'scale',difficulty:'beginner',question:'哪個音階聽起來最像自然大調？',options:['Ionian','Dorian','Phrygian','Locrian'],answer:'Ionian',explanation:'Ionian 就是自然大調，公式為 1 – 2 – 3 – 4 – 5 – 6 – 7。'},
  {type:'scale',difficulty:'beginner',question:'五聲音階包含幾個不同音級？',options:['5','6','7','8'],answer:'5',explanation:'Pentatonic 的意思就是五聲；Major Pentatonic 常用 1 – 2 – 3 – 5 – 6。'},
  {type:'scale',difficulty:'intermediate',question:'Dorian 與自然小調最主要的差異是？',options:['第六音升高','第三音升高','第七音升高','第二音降低'],answer:'第六音升高',explanation:'Dorian = 1 – 2 – ♭3 – 4 – 5 – 6 – ♭7，比自然小調多了明亮的自然六度。'},
  {type:'scale',difficulty:'advanced',question:'Lydian Dominant 的特色組合是？',options:['♯4 與 ♭7','♭2 與 ♭6','♭3 與 7','♯5 與 7'],answer:'♯4 與 ♭7',explanation:'Lydian Dominant = 1 – 2 – 3 – ♯4 – 5 – 6 – ♭7，常用於 7♯11。'},
  {type:'chordNotes',difficulty:'beginner',question:'Cmaj7 包含哪些音？',options:['C E G B','C E G B♭','C E♭ G B','C F G B'],answer:'C E G B',explanation:'Cmaj7 = 1 – 3 – 5 – 7：C、E、G、B。堆疊順序是 Major 3rd、Minor 3rd、Major 3rd。'},
  {type:'chordNotes',difficulty:'beginner',question:'G7 包含哪些音？',options:['G B D F','G B D F♯','G B♭ D F','G C D F'],answer:'G B D F',explanation:'G7 = 1 – 3 – 5 – ♭7：G、B、D、F。B 與 F 形成 tritone 張力。'},
  {type:'chordNotes',difficulty:'intermediate',question:'Bm7♭5 包含哪些音？',options:['B D F A','B D F♯ A','B D♯ F A','B E F A'],answer:'B D F A',explanation:'Bm7♭5 = 1 – ♭3 – ♭5 – ♭7：B、D、F、A，也稱半減七和弦。'},
  {type:'chordNotes',difficulty:'advanced',question:'G7♭9 包含哪些音？',options:['G B D F A♭','G B D F A','G B♭ D F A♭','G B D F♯ A♭'],answer:'G B D F A♭',explanation:'G7♭9 = 1 – 3 – 5 – ♭7 – ♭9。A♭ 是根音 G 上方的小九度。'},
  {type:'scaleNotes',difficulty:'beginner',question:'C Major 包含哪些音？',options:['C D E F G A B','C D E♭ F G A♭ B♭','C D♭ E F G A B','C D E F♯ G A B'],answer:'C D E F G A B',explanation:'C Major 沒有升降記號，公式為 1 – 2 – 3 – 4 – 5 – 6 – 7。'},
  {type:'scaleNotes',difficulty:'beginner',question:'A Minor Pentatonic 包含哪些音？',options:['A C D E G','A B C E F','A C D F G','A B D E G'],answer:'A C D E G',explanation:'Minor Pentatonic = 1 – ♭3 – 4 – 5 – ♭7，因此 A 調是 A、C、D、E、G。'},
  {type:'scaleNotes',difficulty:'intermediate',question:'D Dorian 包含哪些音？',options:['D E F G A B C','D E F G A B♭ C','D E F♯ G A B C♯','D E♭ F G A B♭ C'],answer:'D E F G A B C',explanation:'D Dorian 使用 C Major 的相同音群，但以 D 為中心；自然六度 B 是關鍵色彩。'},
  {type:'scaleNotes',difficulty:'advanced',question:'C Whole Tone 包含哪些音？',options:['C D E F♯ G♯ A♯','C D E F G A','C D♭ E♭ F G A','C D E♭ F♯ G A'],answer:'C D E F♯ G♯ A♯',explanation:'Whole Tone 每一步都是全音，形成 1 – 2 – 3 – ♯4 – ♯5 – ♭7 的對稱結構。'}
];
const difficultyRank={beginner:0,intermediate:1,advanced:2};
let quizMode='chord',quizDifficulty='beginner',questionIndex=0,score=0,answered=false;
const bestKey='music-labs-quiz-best';
document.getElementById('bestScore').textContent=String(Number(localStorage.getItem(bestKey)||0));
function quizPool(){return quizQuestions.filter(item=>item.type===quizMode&&difficultyRank[item.difficulty]<=difficultyRank[quizDifficulty])}
function renderQuiz(){const pool=quizPool();const question=pool[questionIndex%pool.length];answered=false;document.getElementById('quizCount').textContent=`QUESTION ${String(questionIndex+1).padStart(2,'0')} / 05`;document.getElementById('quizProgress').style.width=`${(questionIndex+1)*20}%`;document.getElementById('quizQuestion').textContent=question.question;document.getElementById('quizAnswers').innerHTML=question.options.map(option=>`<button type="button" data-answer="${html(option)}">${html(option)}</button>`).join('');document.getElementById('quizFeedback').innerHTML='';document.getElementById('nextQuestion').hidden=true;document.getElementById('quizScore').textContent=String(score)}
function resetQuiz(){questionIndex=0;score=0;renderQuiz()}
document.getElementById('quizTabs').addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(!button)return;quizMode=button.dataset.mode;document.querySelectorAll('#quizTabs button').forEach(item=>item.classList.toggle('active',item===button));resetQuiz()});
document.getElementById('quizDifficulty').addEventListener('click',event=>{const button=event.target.closest('[data-difficulty]');if(!button)return;quizDifficulty=button.dataset.difficulty;document.querySelectorAll('#quizDifficulty button').forEach(item=>item.classList.toggle('active',item===button));resetQuiz()});
document.getElementById('quizAnswers').addEventListener('click',event=>{const button=event.target.closest('button');if(!button||answered)return;answered=true;const question=quizPool()[questionIndex%quizPool().length];document.querySelectorAll('#quizAnswers button').forEach(item=>{item.disabled=true;if(item.dataset.answer===question.answer)item.classList.add('correct')});const correct=button.dataset.answer===question.answer;if(correct){score++;button.classList.add('correct')}else button.classList.add('wrong');document.getElementById('quizScore').textContent=String(score);const best=Math.max(score,Number(localStorage.getItem(bestKey)||0));localStorage.setItem(bestKey,String(best));document.getElementById('bestScore').textContent=String(best);document.getElementById('quizFeedback').innerHTML=`<strong>${correct?'Correct.':'Not quite.'}</strong><p>${html(question.explanation)}</p>${correct?'':'<small>提示：先找出根音，再用公式逐一對照組成音。</small>'}`;document.getElementById('nextQuestion').hidden=false});
document.getElementById('nextQuestion').addEventListener('click',()=>{questionIndex=(questionIndex+1)%5;if(questionIndex===0)score=0;renderQuiz()});
renderQuiz();

async function submitFeedback(form){const button=form.querySelector('button[type="submit"]');const status=form.querySelector('[data-form-status]');const success=document.getElementById('feedbackSuccess');button.disabled=true;button.dataset.label=button.textContent;button.textContent='SENDING…';status.textContent='正在安全提交…';try{const response=await fetch(form.action,{method:'POST',headers:{Accept:'application/json'},body:new FormData(form),credentials:'same-origin'});const result=await response.json().catch(()=>({message:'意見服務暫時無法回應。'}));if(!response.ok||!result.ok)throw new Error(result.message||'意見暫時無法送出。');form.reset();form.hidden=true;success.hidden=false;success.focus?.()}catch(error){status.textContent=error instanceof Error?error.message:'暫時無法送出，請稍後再試或使用頁尾 Email。';button.disabled=false;button.textContent=button.dataset.label}}
document.getElementById('feedbackForm')?.addEventListener('submit',event=>{event.preventDefault();if(event.currentTarget.reportValidity())submitFeedback(event.currentTarget)});
}else{initStandaloneDiscover()}

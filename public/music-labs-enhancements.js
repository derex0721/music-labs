const COPY={
  'zh-Hant':{heroLead:'互動樂理、創作工具，以及音樂創作者的作品與故事。',exploreChords:'Explore Chords',takeQuiz:'Take a Quiz',exploreTools:'Explore Tools'},
  'zh-Hans':{heroLead:'互动乐理、创作工具，以及音乐创作者的作品与故事。',exploreChords:'Explore Chords',takeQuiz:'Take a Quiz',exploreTools:'Explore Tools'},
  en:{heroLead:'Interactive music theory, creator tools, and the work and stories of music makers.',exploreChords:'Explore Chords',takeQuiz:'Take a Quiz',exploreTools:'Explore Tools'},
  ja:{heroLead:'コード、スケール、理論練習、コード進行を一つに。現代の音楽クリエイターのためのインタラクティブツールボックス。',exploreChords:'Explore Chords',takeQuiz:'Take a Quiz',exploreTools:'Explore Tools'},
  ko:{heroLead:'코드, 스케일, 음악 이론 연습과 코드 진행을 한곳에서 경험하는 현대 크리에이터용 인터랙티브 도구입니다.',exploreChords:'Explore Chords',takeQuiz:'Take a Quiz',exploreTools:'Explore Tools'},
  fr:{heroLead:'Théorie interactive, entraînement, progressions d’accords et outils pratiques pour les créateurs modernes.',exploreChords:'Explore Chords',takeQuiz:'Take a Quiz',exploreTools:'Explore Tools'}
};

const localeSelect=document.getElementById('langSelect');
let locale=localStorage.getItem('ml-locale')||'zh-Hant';
if(!COPY[locale])locale='zh-Hant';
localeSelect.value=locale;
function applyLanguage(){const copy=COPY[locale];document.documentElement.lang=locale;document.querySelectorAll('[data-i18n]').forEach(element=>{const value=copy[element.dataset.i18n];if(!value)return;if(element.childElementCount){element.childNodes[0].textContent=`${value} `}else element.textContent=value})}
localeSelect.addEventListener('change',()=>{locale=localeSelect.value;localStorage.setItem('ml-locale',locale);applyLanguage()});
applyLanguage();

const themeButton=document.getElementById('themeToggle');
const savedTheme=localStorage.getItem('ml-theme')||'dark';
document.documentElement.dataset.theme=savedTheme;
function syncTheme(){const light=document.documentElement.dataset.theme==='light';themeButton.textContent=light?'☾':'☀';themeButton.setAttribute('aria-label',light?'Switch to dark mode':'Switch to light mode');document.getElementById('themeColor')?.setAttribute('content',light?'#f4f5f7':'#101113')}
themeButton.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem('ml-theme',next);syncTheme()});
syncTheme();

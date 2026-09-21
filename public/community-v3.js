const V3 = (() => {
  const CONTENT_TYPES = new Set(['courses', 'events', 'notes']);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const safeUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; } catch { return '#'; } };
  const formatDate = (value, options = {month:'short', day:'numeric', year:'numeric'}) => new Intl.DateTimeFormat('zh-TW', options).format(new Date(value));
  const typeLabel = {courses:'課程', events:'活動', notes:'創作筆記'};
  const pluralForPath = (path) => path.startsWith('/courses') ? 'courses' : path.startsWith('/events') ? 'events' : path.startsWith('/notes') ? 'notes' : '';
  const initials = (value) => String(value || 'Music').trim().slice(0, 8).toUpperCase();

  function installNav() {
    const nav = document.querySelector('.community-nav');
    if (!nav) return;
    const current = location.pathname.replace(/\/$/, '') || '/community';
    const links = [
      ['/community/', '探索'], ['/artists/', '音樂人'], ['/works/', '作品'], ['/courses/', '課程'], ['/events/', '活動'], ['/notes/', '創作筆記'], ['/create/', '發布']
    ];
    nav.querySelectorAll('a').forEach((link) => link.remove());
    links.forEach(([href, label]) => {
      const link = document.createElement('a'); link.href = href; link.textContent = label;
      const normalized = href.replace(/\/$/, '');
      if (current === normalized) link.setAttribute('aria-current', 'page');
      if (href === '/create/') link.className = 'v3-publish-link';
      nav.insertBefore(link, nav.querySelector('button'));
    });
  }

  async function artists() {
    const response = await fetch('/artists-data.json');
    if (!response.ok) throw new Error('無法載入音樂人資料');
    return response.json();
  }
  async function content(type, options = {}) {
    const params = new URLSearchParams({type, limit:String(options.limit || 6)});
    if (options.slug) params.set('slug', options.slug);
    const response = await fetch(`/api/community-content?${params}`);
    if (!response.ok) throw new Error('無法載入公開內容');
    return response.json();
  }
  function imageMarkup(src, alt, label) {
    return `<div class="v3-content-cover" data-cover>${src ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : ''}<span class="v3-cover-fallback">${esc(label)}</span></div>`;
  }
  function imageFallbacks(root = document) {
    root.querySelectorAll('[data-cover] img').forEach((image) => image.addEventListener('error', () => { image.remove(); }));
  }
  function emptyMarkup(kind, copy) {
    return `<div class="v3-empty"><strong>${esc(kind)}即將由創作者帶來</strong><p>${esc(copy)}</p><a class="v3-button" href="/create/">前往發布</a></div>`;
  }
  function creatorMarkup(artist) {
    const bio = typeof artist.bio === 'string' ? artist.bio : (artist.bio?.zh || artist.bio?.en || '');
    const photo = artist.photo ? `<img src="${esc(artist.photo)}" alt="${esc(artist.name)} 頭像" loading="lazy">` : `<span class="v3-avatar-fallback">${esc(initials(artist.name))}</span>`;
    return `<a class="v3-creator" href="/artists/${esc(artist.id)}/">${photo}<span><strong>${esc(artist.name)}</strong><small>${esc((artist.genres || []).join(' / ') || bio.slice(0, 26))}</small></span><span aria-hidden="true">↗</span></a>`;
  }
  function workMarkup(artist, work) {
    return `<a class="v3-work" href="${safeUrl(work.url || work.embedUrl)}" target="_blank" rel="noopener noreferrer">${imageMarkup(work.cover, `${artist.name} — ${work.title}`, initials(work.title))}<div class="v3-card-copy"><p class="v3-kicker">${esc(work.genre || work.type || 'WORK')}</p><h3>${esc(work.title)}</h3><p>${esc(artist.name)}</p></div></a>`;
  }
  function cardMarkup(item, type) {
    const creator = item.creatorName || item.creatorId || 'Music Labs Creator';
    if (type === 'events') {
      const date = new Date(item.startDateTime);
      return `<a class="v3-date-card" href="/events/${esc(item.slug)}/"><time class="v3-date" datetime="${esc(item.startDateTime)}"><span>${esc(new Intl.DateTimeFormat('en',{month:'short'}).format(date)).toUpperCase()}</span><b>${String(date.getDate()).padStart(2,'0')}</b></time><span><p class="v3-kicker">${esc(item.eventType || 'EVENT')}</p><h3>${esc(item.title)}</h3><p>${esc(creator)} · ${esc(item.format === 'Online' ? 'Online' : [item.city, item.country].filter(Boolean).join(', ') || item.venueName || 'Location to be announced')}</p></span></a>`;
    }
    const meta = type === 'courses' ? [item.category, item.level, item.format, item.priceType === 'Free' ? 'Free' : item.price ? `${item.currency || 'TWD'} ${item.price}` : 'Paid'] : (item.tags || []).slice(0, 3);
    return `<a class="v3-content-card" href="/${type}/${esc(item.slug)}/">${imageMarkup(item.coverImage, `${item.title} cover`, initials(item.title))}<div class="v3-card-copy"><p class="v3-kicker">${esc(type === 'courses' ? 'COURSE' : 'CREATOR NOTE')}</p><h3>${esc(item.title)}</h3><p>${esc(creator)}</p><div class="v3-card-meta">${meta.filter(Boolean).map((value) => `<span class="v3-chip">${esc(value)}</span>`).join('')}</div></div></a>`;
  }
  async function renderContentList(root, type, limit = 6) {
    try {
      const result = await content(type, {limit});
      if (!result.items?.length) { root.innerHTML = emptyMarkup(typeLabel[type], type === 'events' ? '公開活動會依日期排序，過期活動不會出現在 Upcoming。' : '第一批已審核發布的內容會顯示在這裡。'); return; }
      root.innerHTML = type === 'events' ? result.items.map((item) => cardMarkup(item, type)).join('') : result.items.map((item) => cardMarkup(item, type)).join('');
      imageFallbacks(root);
    } catch { root.innerHTML = emptyMarkup(typeLabel[type], '暫時無法載入內容，請稍後再試。'); }
  }
  async function initHome() {
    const creatorRoot = document.querySelector('[data-v3-creators]');
    const worksRoot = document.querySelector('[data-v3-works]');
    if (creatorRoot) {
      try { const list = await artists(); creatorRoot.innerHTML = list.slice(0, 3).map(creatorMarkup).join('') || emptyMarkup('音樂人', '公開的創作者會在這裡出現。'); } catch { creatorRoot.innerHTML = emptyMarkup('音樂人', '暫時無法載入創作者。'); }
    }
    if (worksRoot) {
      try { const list = await artists(); const works = list.flatMap((artist) => (artist.works || []).map((work) => ({artist, work}))).slice(0, 3); worksRoot.innerHTML = works.length ? works.map(({artist, work}) => workMarkup(artist, work)).join('') : emptyMarkup('作品', '公開作品會在這裡出現。'); imageFallbacks(worksRoot); } catch { worksRoot.innerHTML = emptyMarkup('作品', '暫時無法載入作品。'); }
    }
    [['courses', document.querySelector('[data-v3-courses]')], ['events', document.querySelector('[data-v3-events]')], ['notes', document.querySelector('[data-v3-notes]')]].forEach(([type, root]) => { if (root) renderContentList(root, type, 3); });
  }
  function initDirectory() {
    const root = document.querySelector('[data-v3-directory]');
    const type = root?.dataset.v3Directory;
    if (root && CONTENT_TYPES.has(type)) renderContentList(root, type, 12);
  }
  async function initWorksDirectory() {
    const root = document.querySelector('[data-v3-works-directory]');
    if (!root) return;
    try {
      const list = await artists();
      const works = list.flatMap((artist) => (artist.works || []).map((work) => ({artist, work})));
      root.innerHTML = works.length ? works.map(({artist, work}) => workMarkup(artist, work)).join('') : emptyMarkup('作品', '已審核的 Artist Release、MV、Demo 與 Live 會出現在這裡。');
      imageFallbacks(root);
    } catch { root.innerHTML = emptyMarkup('作品', '暫時無法載入作品。'); }
  }
  async function initDetail() {
    const root = document.querySelector('[data-v3-detail]');
    if (!root) return;
    const type = root.dataset.v3Detail || pluralForPath(location.pathname);
    const slug = location.pathname.split('/').filter(Boolean).at(-1);
    if (!CONTENT_TYPES.has(type) || !slug || slug === type) return;
    try {
      const result = await content(type, {slug, limit:1}); const item = result.items?.[0];
      if (!item) throw new Error('not found');
      const creator = item.creatorName || item.creatorId;
      const details = type === 'courses' ? [['Creator', creator], ['Category', item.category], ['Level', item.level], ['Format', item.format], ['Language', item.language], ['Price', item.priceType === 'Free' ? 'Free' : `${item.currency || ''} ${item.price || 'Paid'}`]] : type === 'events' ? [['Creator', creator], ['When', formatDate(item.startDateTime, {dateStyle:'medium', timeStyle:'short'})], ['Format', item.format], ['Where', item.format === 'Online' ? 'Online' : [item.venueName, item.city, item.country].filter(Boolean).join(', ')], ['Type', item.eventType], ['Price', item.priceType === 'Free' ? 'Free' : `${item.currency || ''} ${item.price || 'Paid'}`]] : [['Creator', creator], ['Published', item.publishedAt ? formatDate(item.publishedAt) : '—'], ['Tags', (item.tags || []).join(' · ') || '—']];
      root.innerHTML = `<div class="v3-detail"><div>${imageMarkup(item.coverImage, `${item.title} cover`, initials(item.title))}</div><div class="v3-detail-copy"><p class="eyebrow">${esc(type === 'notes' ? 'CREATOR NOTE' : type.slice(0,-1).toUpperCase())}</p><h1>${esc(item.title)}</h1>${creator ? `<p class="v3-kicker"><a href="/artists/${esc(item.creatorId)}/">${esc(creator)}</a></p>` : ''}<p class="lead">${esc(item.description || item.shortDescription || item.excerpt || '')}</p>${type !== 'notes' && item.externalUrl ? `<p class="v3-actions"><a class="v3-button primary" href="${safeUrl(item.externalUrl)}" target="_blank" rel="noopener noreferrer">${type === 'courses' ? '查看課程 / 報名' : '前往活動頁面'} ↗</a></p>` : ''}</div></div><div class="v3-detail-content">${esc(item.content || item.description || item.shortDescription || '')}</div><aside class="v3-detail-info"><h2>${type === 'courses' ? 'Course Information' : type === 'events' ? 'Event Information' : 'Note Information'}</h2><dl>${details.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value || '—')}</dd></div>`).join('')}</dl></aside>`;
      imageFallbacks(root);
    } catch { root.innerHTML = `<div class="v3-empty"><strong>找不到這筆公開${esc(typeLabel[type] || '內容')}</strong><p>它可能仍在審核中、尚未發布，或網址有誤。</p><a class="v3-button" href="/${esc(type)}/">返回${esc(typeLabel[type] || '目錄')}</a></div>`; }
  }

  const flowMeta = {
    course:{label:'建立課程', kicker:'COURSE PUBLISHER', steps:['資訊','細節','預覽']},
    event:{label:'建立活動', kicker:'EVENT PUBLISHER', steps:['資訊','安排','預覽']},
    note:{label:'發布創作筆記', kicker:'NOTE PUBLISHER', steps:['內容','視覺','預覽']}
  };
  const options = {
    category:['Music Production','Songwriting','Performance','Music Theory','Music Business','Other'], level:['Beginner','Intermediate','Advanced','All Levels'], format:['Online','In Person','Hybrid'], language:['繁體中文','English','中文 / English'], eventType:['Live Performance','Workshop','Meetup','Jam Session','Lecture','Release Event','Other'], timezone:['Asia/Taipei','Asia/Tokyo','Asia/Seoul','Asia/Shanghai','UTC'], currency:['TWD','USD','JPY','KRW']
  };
  const select = (name, values, value, label) => `<label class="v3-field">${label}<select name="${name}" required>${values.map((item) => `<option value="${esc(item)}"${item === value ? ' selected' : ''}>${esc(item)}</option>`).join('')}</select></label>`;
  function inputValueMarkup(name, label, value, config = {}) { return `<label class="v3-field${config.full ? ' full' : ''}">${label}<input name="${name}" type="${config.type || 'text'}" value="${esc(value || '')}"${config.required === false ? '' : ' required'}${config.placeholder ? ` placeholder="${esc(config.placeholder)}"` : ''}>${config.help ? `<small>${esc(config.help)}</small>` : ''}</label>`; }
  function textareaMarkup(name, label, value, config = {}) { return `<label class="v3-field${config.full ? ' full' : ''}">${label}<textarea name="${name}"${config.required === false ? '' : ' required'} maxlength="${config.max || 4000}" placeholder="${esc(config.placeholder || '')}">${esc(value || '')}</textarea>${config.help ? `<small>${esc(config.help)}</small>` : ''}</label>`; }
  function creatorSelect(value, creatorOptions) { return `<label class="v3-field">Creator / Artist Profile<select name="creatorId" required><option value="">選擇已公開的 Artist Profile</option>${creatorOptions.map((artist) => `<option value="${esc(artist.id)}"${artist.id === value ? ' selected' : ''}>${esc(artist.name)}</option>`).join('')}</select><small>發布內容會連到這個 Artist Profile。</small></label>`; }
  function populateState(form, state) { new FormData(form).forEach((value, key) => { state[key] = typeof value === 'string' ? value.trim() : value; }); }
  function requiredError(message) { const error = document.querySelector('[data-v3-form-error]'); if (error) error.textContent = message || ''; }
  function validateFlow(form, state, type, step) {
    requiredError(''); populateState(form, state);
    const controls = [...form.querySelectorAll('input, select, textarea')];
    const invalid = controls.find((control) => !control.checkValidity());
    if (invalid) { invalid.focus(); requiredError('請完成這一步的必填欄位，並確認 Email 與網址格式。'); return false; }
    if (type === 'event' && step === 2) { const start = new Date(state.startDateTime); const end = new Date(state.endDateTime); if (!(start > new Date())) { requiredError('活動開始時間必須在未來。'); return false; } if (!(end > start)) { requiredError('結束時間必須晚於開始時間。'); return false; } }
    if ((type === 'course' || type === 'event') && step === 2 && state.priceType === 'Paid' && (!Number.isFinite(Number(state.price)) || Number(state.price) <= 0)) { requiredError('付費內容請填寫有效價格。'); return false; }
    return true;
  }
  function flowFields(type, step, state, creatorOptions) {
    if (type === 'course') {
      if (step === 1) return `${inputValueMarkup('title', '課程名稱 ＊', state.title, {label:'課程名稱 ＊', max:160, placeholder:'例如：從 Demo 到正式發行'})}${creatorSelect(state.creatorId, creatorOptions)}${inputValueMarkup('contactEmail', '聯絡 Email ＊', state.contactEmail, {label:'聯絡 Email ＊', type:'email', placeholder:'you@example.com'})}${select('category', options.category, state.category || options.category[0], 'Category ＊')}${textareaMarkup('shortDescription', '課程簡介 ＊', state.shortDescription, {full:true,max:600,placeholder:'用一段清楚的文字說明課程內容、適合誰與能獲得什麼。'})}`;
      return `${inputValueMarkup('coverImage', 'Cover Image URL（Optional）', state.coverImage, {label:'Cover Image URL（Optional）', type:'url', required:false, full:true, placeholder:'https://…/course-cover.jpg', help:'V3.0 先使用安全的直接圖片網址；Google Drive 分享頁不支援。'})}${select('level', options.level, state.level || 'All Levels', 'Level ＊')}${select('language', options.language, state.language || '繁體中文', 'Language ＊')}${select('format', options.format, state.format || 'Online', 'Format ＊')}<label class="v3-field">Price Type ＊<span class="v3-inline-options"><span class="v3-option"><input type="radio" name="priceType" value="Free"${(state.priceType || 'Free') === 'Free' ? ' checked' : ''}>Free</span><span class="v3-option"><input type="radio" name="priceType" value="Paid"${state.priceType === 'Paid' ? ' checked' : ''}>Paid</span></span></label>${inputValueMarkup('price', 'Price', state.price, {label:'Price', type:'number', required:state.priceType === 'Paid', placeholder:'例如：1200'})}${select('currency', options.currency, state.currency || 'TWD', 'Currency ＊')}${inputValueMarkup('externalUrl', '課程 / 報名連結 ＊', state.externalUrl, {label:'課程 / 報名連結 ＊', type:'url', full:true, placeholder:'https://…'})}`;
    }
    if (type === 'event') {
      if (step === 1) return `${inputValueMarkup('title', '活動名稱 ＊', state.title, {label:'活動名稱 ＊', max:160, placeholder:'例如：夜晚創作交流場'})}${creatorSelect(state.creatorId, creatorOptions)}${inputValueMarkup('contactEmail', '聯絡 Email ＊', state.contactEmail, {label:'聯絡 Email ＊', type:'email', placeholder:'you@example.com'})}${select('eventType', options.eventType, state.eventType || 'Workshop', 'Event Type ＊')}${textareaMarkup('description', '活動介紹 ＊', state.description, {full:true,max:1500,placeholder:'說明活動內容、適合誰、需要準備什麼。'})}`;
      return `${inputValueMarkup('coverImage', 'Cover Image URL（Optional）', state.coverImage, {label:'Cover Image URL（Optional）', type:'url', required:false, full:true, placeholder:'https://…/event-cover.jpg', help:'V3.0 先使用安全的直接圖片網址；Google Drive 分享頁不支援。'})}${inputValueMarkup('startDateTime', '開始時間 ＊', state.startDateTime, {label:'開始時間 ＊', type:'datetime-local'})}${inputValueMarkup('endDateTime', '結束時間 ＊', state.endDateTime, {label:'結束時間 ＊', type:'datetime-local'})}${select('timezone', options.timezone, state.timezone || 'Asia/Taipei', 'Timezone ＊')}${select('format', options.format, state.format || 'In Person', 'Format ＊')}${inputValueMarkup('venueName', 'Venue Name', state.venueName, {label:'Venue Name', required:state.format !== 'Online', placeholder:'線下場地名稱；Online 可填 Online'})}${inputValueMarkup('city', 'City', state.city, {label:'City', required:state.format !== 'Online', placeholder:'Taipei'})}${inputValueMarkup('country', 'Country', state.country, {label:'Country', required:state.format !== 'Online', placeholder:'Taiwan'})}<label class="v3-field">Price Type ＊<span class="v3-inline-options"><span class="v3-option"><input type="radio" name="priceType" value="Free"${(state.priceType || 'Free') === 'Free' ? ' checked' : ''}>Free</span><span class="v3-option"><input type="radio" name="priceType" value="Paid"${state.priceType === 'Paid' ? ' checked' : ''}>Paid</span></span></label>${inputValueMarkup('price', 'Price', state.price, {label:'Price',type:'number',required:state.priceType === 'Paid',placeholder:'例如：350'})}${select('currency', options.currency, state.currency || 'TWD', 'Currency ＊')}${inputValueMarkup('externalUrl', '活動 / 報名連結 ＊', state.externalUrl, {label:'活動 / 報名連結 ＊',type:'url',full:true,placeholder:'https://…'})}`;
    }
    if (step === 1) return `${inputValueMarkup('title', '筆記標題 ＊', state.title, {label:'筆記標題 ＊',max:160,placeholder:'例如：我如何保留一首歌最初的感覺'})}${creatorSelect(state.creatorId, creatorOptions)}${inputValueMarkup('contactEmail', '聯絡 Email ＊', state.contactEmail, {label:'聯絡 Email ＊',type:'email',placeholder:'you@example.com'})}${textareaMarkup('excerpt', '摘要 ＊', state.excerpt, {full:true,max:420,placeholder:'一段讓讀者快速理解內容的摘要。'})}${textareaMarkup('content', '文章內容 ＊', state.content, {full:true,max:12000,placeholder:'以純文字撰寫即可；V3.0 不建立複雜 Rich Text CMS。'})}`;
    return `${inputValueMarkup('coverImage', 'Cover Image URL（Optional）', state.coverImage, {label:'Cover Image URL（Optional）',type:'url',required:false,full:true,placeholder:'https://…/note-cover.jpg',help:'V3.0 先使用安全的直接圖片網址；Google Drive 分享頁不支援。'})}${inputValueMarkup('tags', 'Tags（Optional）', state.tags, {label:'Tags（Optional）',required:false,full:true,placeholder:'例如：創作紀錄, 製作, songwriting',help:'以逗號分隔，最多 8 個。'})}`;
  }
  function previewMarkup(type, state, creatorOptions) {
    const creator = creatorOptions.find((artist) => artist.id === state.creatorId)?.name || 'Creator';
    const text = type === 'course' ? state.shortDescription : type === 'event' ? state.description : state.excerpt;
    const meta = type === 'course' ? [state.category, state.level, state.format, state.priceType === 'Free' ? 'Free' : `${state.currency || ''} ${state.price || ''}`] : type === 'event' ? [state.eventType, state.format, state.startDateTime ? formatDate(state.startDateTime, {dateStyle:'medium',timeStyle:'short'}) : '', state.format === 'Online' ? 'Online' : [state.city,state.country].filter(Boolean).join(', ')] : String(state.tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
    return `<div class="v3-preview"><article class="v3-preview-card">${imageMarkup(state.coverImage, `${state.title || 'Preview'} cover`, initials(state.title))}<div class="v3-preview-copy"><p class="v3-kicker">${esc(type === 'note' ? 'CREATOR NOTE' : type.toUpperCase())}</p><h3>${esc(state.title || 'Untitled')}</h3><p>${esc(creator)}</p><div class="v3-card-meta">${meta.filter(Boolean).map((value) => `<span class="v3-chip">${esc(value)}</span>`).join('')}</div><p style="margin-top:18px">${esc(text || '內容預覽會顯示在這裡。')}</p></div></article><aside class="v3-preview-aside"><h3>送出前確認</h3><p>公開使用者一律進入 Pending Review，不會自動發布。</p><p>發布後會連到 <strong>${esc(creator)}</strong> 的 Artist Profile。</p><p>外部課程、活動連結只會在審核後公開。</p></aside></div>`;
  }
  function initCreate() {
    const root = document.getElementById('createApp'); if (!root) return;
    const queryType = new URLSearchParams(location.search).get('type'); let type = ['course','event','note','work'].includes(queryType) ? queryType : ''; let step = 1; const state = {}; let creatorOptions = [];
    artists().then((list) => { creatorOptions = list; if (type && type !== 'work') render(); }).catch(() => { if (type && type !== 'work') render(); });
    const renderChoice = () => { root.innerHTML = `<section class="v3-create-intro"><p class="eyebrow">COMMUNITY / CREATE</p><h1>你想發布什麼？</h1><p class="lead">先選擇內容類型。公開內容都會先經過 Music Labs Review，確認後才會出現在創作者聚落。</p></section><div class="v3-choice-grid"><button class="v3-choice" type="button" data-create-type="work"><span class="v3-choice-icon">🎵</span><span><strong>發布作品</strong><small>沿用既有 Artist Profile 的作品流程。</small></span></button><button class="v3-choice" type="button" data-create-type="course"><span class="v3-choice-icon">🎓</span><span><strong>建立課程</strong><small>以外部課程與報名連結為主。</small></span></button><button class="v3-choice" type="button" data-create-type="event"><span class="v3-choice-icon">📅</span><span><strong>建立活動</strong><small>演出、工作坊、聚會或發行活動。</small></span></button><button class="v3-choice" type="button" data-create-type="note"><span class="v3-choice-icon">✍️</span><span><strong>發布創作筆記</strong><small>記錄創作故事、製作心得與學習內容。</small></span></button></div><p class="v3-profile-link">尚未有 Artist Profile？請先 <a href="/artists/submit/">建立音樂人頁面</a>，通過審核後再發布作品、課程、活動或筆記。</p>`; root.querySelectorAll('[data-create-type]').forEach((button) => button.addEventListener('click', () => { type = button.dataset.createType; step = 1; render(); })); };
    const renderWork = () => { root.innerHTML = `<section class="v3-pending"><div class="v3-pending-mark" aria-hidden="true">♪</div><p class="eyebrow">WORKS</p><h2>作品沿用 Artist Profile</h2><p>為了讓 Artist Profile 與 Works 保持同一份資料，V3.0 不重複建立 Release Schema。請使用既有 Artist Submission V2 新增或更新作品，審核後會同時出現在作品目錄。</p><div class="v3-actions" style="justify-content:center"><a class="v3-button primary" href="/artists/submit/">前往 Artist Submission</a><button class="v3-button secondary" type="button" data-create-back>選擇其他類型</button></div></section>`; root.querySelector('[data-create-back]').addEventListener('click', () => { type = ''; render(); }); };
    const renderFlow = () => { const meta = flowMeta[type]; const isPreview = step === 3; root.innerHTML = `<section class="v3-flow"><div class="v3-flow-top"><p class="eyebrow">${meta.kicker}</p><a href="/create/" data-create-back>← 重新選擇</a></div><ol class="v3-stepper" aria-label="${esc(meta.label)}步驟">${meta.steps.map((label,index) => `<li${index + 1 === step ? ' aria-current="step"' : ''}${index + 1 < step ? ' class="is-complete"' : ''}><b>${index + 1 < step ? '✓' : `0${index+1}`}</b><span>${esc(label)}</span></li>`).join('')}</ol>${isPreview ? `<section aria-labelledby="v3StepHeading"><div class="v3-step-heading"><p class="eyebrow">03 / PREVIEW</p><h2 id="v3StepHeading" tabindex="-1">確認發布預覽</h2><p>這是發布後的內容結構預覽；送出後會進入 Pending Review。</p></div>${previewMarkup(type,state,creatorOptions)}</section>` : `<form id="v3CreateForm" novalidate><section aria-labelledby="v3StepHeading"><div class="v3-step-heading"><p class="eyebrow">0${step} / ${step === 1 ? 'INFORMATION' : 'DETAILS'}</p><h2 id="v3StepHeading" tabindex="-1">${step === 1 ? (type === 'note' ? '先寫下內容' : '先說明基本資訊') : '補齊公開細節'}</h2><p>${type === 'course' ? '內容與創作者先清楚，再補上外部報名資訊。' : type === 'event' ? '日期、地點與報名連結都會在送出前再次驗證。' : 'V3.0 先保持純文字筆記，讓創作者快速發布。'}</p></div><div class="v3-form-grid">${flowFields(type,step,state,creatorOptions)}</div></section><p class="v3-form-error" data-v3-form-error role="alert" aria-live="assertive"></p><div class="v3-flow-actions">${step > 1 ? '<button class="v3-button secondary" type="button" data-flow-prev>← 上一步</button>' : '<span></span>'}<button class="v3-button primary" type="button" data-flow-next>${step === 2 ? '預覽資料 →' : '下一步 →'}</button></div></form>`}</section>`; const heading=root.querySelector('#v3StepHeading'); if (step > 1) heading?.focus(); if (isPreview) { root.querySelector('[data-create-back]').addEventListener('click',(event)=>{event.preventDefault();type='';step=1;render();}); const actions=document.createElement('div'); actions.className='v3-flow-actions'; actions.innerHTML='<button class="v3-button secondary" type="button" data-flow-prev>← 返回修改</button><button class="v3-button primary" type="button" data-flow-submit>送出審核 →</button>'; root.querySelector('.v3-preview').after(actions); actions.querySelector('[data-flow-prev]').addEventListener('click',()=>{step=2;render();}); actions.querySelector('[data-flow-submit]').addEventListener('click',submit); return; } const form=root.querySelector('#v3CreateForm'); root.querySelector('[data-create-back]').addEventListener('click',(event)=>{event.preventDefault();type='';step=1;render();}); form.addEventListener('change',(event)=>{if(event.target.name==='priceType'){populateState(form,state);render();}}); root.querySelector('[data-flow-next]').addEventListener('click',()=>{if(validateFlow(form,state,type,step)){step+=1;render();}}); root.querySelector('[data-flow-prev]')?.addEventListener('click',()=>{populateState(form,state);step-=1;render();}); };
    const submit = async () => { const button=root.querySelector('[data-flow-submit]'); button.disabled=true; button.textContent='正在送出…'; const payload={type,status:'pending',publishMode:'review',...state,tags:type==='note'?String(state.tags || '').split(',').map((tag)=>tag.trim()).filter(Boolean):undefined}; try { const response=await fetch('/api/community-submissions',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)}); const result=await response.json().catch(()=>({message:'投稿服務暫時無法回應。'})); if(!response.ok||!result.ok)throw new Error(result.message||'投稿暫時無法送出。'); root.innerHTML=`<section class="v3-pending" tabindex="-1"><div class="v3-pending-mark" aria-hidden="true">✓</div><p class="eyebrow">PENDING REVIEW</p><h2>已送出審核</h2><p>${esc(result.message || '內容已進入 Music Labs Review。')}</p><div class="v3-actions" style="justify-content:center"><a class="v3-button primary" href="/community/">回到聚落首頁</a><a class="v3-button secondary" href="/create/">發布其他內容</a></div></section>`; root.querySelector('.v3-pending').focus(); } catch(error) { button.disabled=false;button.textContent='送出審核 →'; const container=root.querySelector('.v3-flow'); container.insertAdjacentHTML('beforeend',`<p class="v3-form-error" role="alert">${esc(error instanceof Error?error.message:'投稿暫時無法送出。')}</p>`); } };
    const render = () => { if (!type) renderChoice(); else if (type === 'work') renderWork(); else renderFlow(); };
    render();
  }
  function init() { installNav(); initHome(); initDirectory(); initWorksDirectory(); initDetail(); initCreate(); }
  return {init, imageFallbacks};
})();
document.addEventListener('DOMContentLoaded', V3.init);

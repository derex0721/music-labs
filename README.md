# Music Labs

> **Learn music. Make better music.**

Music Labs 是一個為現代音樂創作者打造的互動音樂平台，將樂理學習、聽覺練習、創作工具、音樂科技情報與創作者作品集中在同一個地方。

Music Labs is an interactive music platform for modern creators—bringing music theory, ear-friendly practice, practical creation tools, music-tech discoveries, and an artist community into one focused experience.

[開啟 Music Labs / Visit Music Labs](https://music-labs.pages.dev/)

---

## 中文介紹

### 關於 Music Labs

樂理不應只停留在文字與公式。Music Labs 讓使用者可以直接查看、聆聽並操作和弦、音階與和弦進行，把抽象知識轉化成真正能用在編曲、作曲與音樂製作中的直覺。

網站以「Learn → Practice → Create → Discover」為核心路徑：

- **Learn**：探索和弦、音階、調式、組成音與音程關係。
- **Practice**：透過分級測驗練習和弦、音階與組成音辨識。
- **Create**：使用和弦進行、移調、BPM、Delay 時值、Tap Tempo 與五度圈等工具。
- **Discover**：追蹤值得音樂創作者注意的軟體、Plugin、AI 音樂與製作技術。
- **Community**：讓音樂人投稿作品，通過確認後加入創作者聚落。

### 主要功能

- **Chord Explorer**：查詢和弦公式、組成音與音程，並直接播放。
- **Scale Explorer**：比較音階與調式結構，查看鍵盤位置並聆聽音色。
- **Music Quiz**：依主題與難度練習樂理，每題提供簡短解釋。
- **Progression Lab**：依調性與情緒取得四和弦創作起點。
- **Transpose**：快速移調，保留延伸音與斜線和弦。
- **BPM Calculator**：計算常用音符與 Delay 時值，支援 Tap Tempo。
- **Circle of Fifths**：互動查看調號、音階與常用功能和弦。
- **Discover**：整理音樂工具、免費資源、AI 音樂與產業動態。
- **Artists**：展示經確認的創作者、作品集與相關連結。

### 投稿與意見回饋

創作者投稿與 Feedback 表單皆透過 **Cloudflare Pages Functions** 驗證，再由 **Resend** 將內容安全寄送給管理者。

- 投稿內容不會自動公開。
- 管理者確認資料後，才會建立創作者頁面。
- API Key 僅存放於 Cloudflare 的加密環境變數，不會出現在前端程式碼中。
- 表單包含欄位驗證、來源檢查、內容長度限制與 honeypot 防垃圾訊息機制。

### 技術架構

- HTML、CSS、JavaScript
- TypeScript
- Web Audio API
- Tonal.js
- React 19 / Next.js 16 / Vinext / Vite
- Cloudflare Pages
- Cloudflare Pages Functions
- Resend Email API

### 專案結構

```text
app/                 應用程式入口與路由
functions/api/       Cloudflare Pages Functions
lib/                 音樂理論與聲音工具原始碼
public/              網站頁面、樣式、前端腳本與靜態資源
data/                創作者資料
scripts/             建置與執行腳本
```

### 本機開發

需求：Node.js 22.13.0 或以上版本。

```bash
npm ci
npm run dev
```

常用指令：

```bash
npm run build
npm run lint
npm run start
```

### Cloudflare 設定

Cloudflare Pages 專案連接 `main` 分支後，可在每次推送時自動建置與部署。

表單寄信所需環境變數：

```text
RESEND_API_KEY       必填，Resend API 金鑰
RESEND_FROM_EMAIL    選填，已驗證的寄件地址
```

請勿將 API Key、密碼或其他敏感資料提交到 GitHub。

### 專案狀態

Music Labs 目前為持續開發中的 V1。接下來會逐步擴充樂理內容、創作工具、Discover 更新流程與創作者頁面。

---

## English

### About Music Labs

Music theory should be more than text and formulas. Music Labs lets users see, hear, and interact with chords, scales, and progressions—turning abstract concepts into practical intuition for songwriting, arranging, and music production.

The experience follows four core stages: **Learn → Practice → Create → Discover**.

- **Learn** chords, scales, modes, intervals, and note structures.
- **Practice** with focused quizzes and concise explanations.
- **Create** with practical tools for progressions, transposition, tempo, delay timing, and harmony.
- **Discover** useful software, plugins, AI music tools, resources, and production news.
- **Community** gives artists a reviewed way to submit and showcase their work.

### Key Features

- **Chord Explorer** — inspect chord formulas, notes, and intervals, then hear them instantly.
- **Scale Explorer** — compare scales and modes on an interactive keyboard.
- **Music Quiz** — practice by topic and difficulty with an explanation for every answer.
- **Progression Lab** — generate four-chord starting points by key and mood.
- **Transpose** — transpose extended and slash chords quickly.
- **BPM Calculator** — calculate note and delay times with Tap Tempo support.
- **Circle of Fifths** — explore keys, signatures, and functional harmony.
- **Discover** — browse selected music tools, free resources, AI music, and industry updates.
- **Artists** — showcase approved creators, portfolios, and links.

### Submissions and Feedback

Artist submissions and feedback are validated by **Cloudflare Pages Functions** and delivered to the project maintainer through **Resend**.

- Artist submissions are never published automatically.
- Creator pages are added only after manual review.
- API keys remain in encrypted Cloudflare environment variables and are never exposed to the browser.
- Forms include field validation, same-origin checks, length limits, and honeypot spam protection.

### Technology

- HTML, CSS, and JavaScript
- TypeScript
- Web Audio API
- Tonal.js
- React 19 / Next.js 16 / Vinext / Vite
- Cloudflare Pages and Pages Functions
- Resend Email API

### Project Structure

```text
app/                 Application entry points and routes
functions/api/       Cloudflare Pages Functions
lib/                 Music-theory and audio source modules
public/              Pages, styles, browser scripts, and static assets
data/                Artist data
scripts/             Build and runtime helpers
```

### Local Development

Requires Node.js 22.13.0 or later.

```bash
npm ci
npm run dev
```

Common commands:

```bash
npm run build
npm run lint
npm run start
```

### Cloudflare Configuration

Connect the Cloudflare Pages project to the `main` branch to build and deploy automatically after each push.

Environment variables required for form delivery:

```text
RESEND_API_KEY       Required Resend API key
RESEND_FROM_EMAIL    Optional verified sender address
```

Never commit API keys, passwords, or other sensitive information to GitHub.

### Project Status

Music Labs is currently an actively developed V1. Upcoming work will expand the theory library, creator tools, Discover publishing workflow, and approved artist profiles.

---

Created and maintained by [Derex Lee](https://github.com/derex0721).

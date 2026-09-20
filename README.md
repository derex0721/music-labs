[繁體中文](README.md) · [English](README.en.md)

# 🎵 Music Labs

> Learn music. Make better music.

音樂百科 × 創作工具 × 音樂科技 × 音樂人聚落

**[🌐 直接使用 Music Labs](https://music-labs.pages.dev/)**

## What is Music Labs?

Music Labs 是給音樂學習者與創作者的互動平台。從理解和弦與音階，到建立和弦進行、調整速度，再到探索 AI 音樂與創作者作品，讓樂理能直接進入創作流程。

## Music Wiki

- **Chord Explorer**：查看和弦組成音、公式與音程，並直接聆聽。
- **Scale Explorer**：探索音階、調式與鍵盤位置。
- **Theory Library**：瀏覽和弦與音階的結構資料。
- **Music Quiz**：透過和弦、音階與組成音題目練習樂理。

## Creator Tools

- **Progression Lab**：依調性與情緒取得四和弦創作起點。
- **Transpose**：快速移調，保留延伸音與斜線和弦。
- **BPM Calculator**：換算音符與 Delay 時值。
- **Tap Tempo**：用點擊快速抓取歌曲速度。
- **Circle of Fifths**：互動探索調號、音階與功能和弦。

## Discover

為音樂創作者整理值得關注的資源與動態：

`AI Music` · `Plugins` · `Software` · `Hardware` · `Free Resources` · `Tutorials` · `Music Tech`

## Artist Community

- **Artists**：認識已發布的音樂創作者。
- **Works**：探索創作者的作品。
- **Notes**：收錄創作故事與筆記。
- **Artist Submission**：提交音樂人資料，經審核後加入聚落。

## Screenshots

[![Music Labs 首頁：Quick Lab 與創作工具](docs/images/music-labs-homepage.jpg)](https://music-labs.pages.dev/)

## Tech Stack

- React 19、Next.js 16、TypeScript
- Vinext、Vite、Tailwind CSS
- Cloudflare Pages、Cloudflare Pages Functions
- Web Audio API、Tonal.js

## Local Development

需要 Node.js 22.13.0 或以上版本。

```bash
npm ci
npm run dev
```

```bash
npm run build
npm run lint
npm run start
```

## Project Structure

```text
app/                 應用程式入口與路由
functions/api/       Cloudflare Pages Functions
lib/                 音樂理論與聲音工具原始碼
public/              網站頁面、樣式、前端腳本與靜態資源
data/                創作者資料
docs/images/         README 使用的本地圖片
scripts/             建置與執行腳本
```

## Project Status

**V2** 持續開發中。Music Labs 會持續擴充樂理內容、創作工具、Discover 資源與音樂人聚落。

## Contributing

歡迎以 Issue 或 Pull Request 提出內容修正、工具建議與改進想法。請不要把 API keys、密碼或其他敏感資料提交到 GitHub；部署用 secrets 請存放於 Cloudflare environment variables。

## License / Maintainer

License: 尚未指定。

Created and maintained by [Derex Lee](https://github.com/derex0721).

# 🎵 Floating Lyrics Extension for YouTube Music

A simple Chrome Extension to show **floating synced lyrics** while listening to music on [YouTube Music](https://music.youtube.com).

✅ Works in **popup** and **floating window**  
✅ Displays **previous / current / next** lyrics with smooth transitions  
✅ Syncs lyrics with current time  
✅ Native CSS for floating window (no Tailwind needed)  
✅ Built using [WXT.dev](https://wxt.dev/) (Web Extension Toolkit) → fast and modern setup

---

## Demo

👉 [You can insert a short GIF or video here — highly recommended for GitHub and Showcase posts!]

---

## Features

🎵 Floating lyrics window  
🎵 Popup with current song info and lyrics  
🎵 Real-time sync using `lrclib.net` public API  
🎵 Works fully offline after load  
🎵 Light-weight and fast — no extra libraries

---

## Tech Stack

- [WXT.dev](https://wxt.dev/) → Web Extension Toolkit
- React + TypeScript (popup)
- Content script to extract YouTube Music player state
- Background service worker → lyrics caching + sync
- Native CSS → smooth lyric transitions

---

## Setup and Run

### 1️⃣ Clone the repo

```bash
git clone https://github.com/santhoshkumar-dev/lyrics
cd your-repo-name
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Run in development mode (hot reload extension)

```bash
npm run dev
```

This will start WXT.dev and give you a URL → load that as an **unpacked extension** in Chrome.

### 4️⃣ Build production version

```bash
npm run build
```

The build will be output in the `.output` folder → ready to pack and publish.

---

## Project Structure

```txt
entrypoints/
├── popup/              → Popup window (React + CSS)
│   ├── App.tsx
│   ├── App.css
│   ├── index.html
│   ├── main.tsx
│   ├── style.css
├── background.ts       → Background service worker (MV3)
├── content.ts          → Content script for YouTube Music
public/                  → Static files
package.json
tsconfig.json
wxt.config.ts
```

---

## How it works

1️⃣ Content script (`content.ts`) runs on `music.youtube.com` → extracts:

- current song name
- author
- current play time

2️⃣ It sends messages to:

- background worker → caches lyrics
- popup → updates lyrics view
- floating window → updates lyrics view

3️⃣ Lyrics are fetched from `lrclib.net` synced lyrics API.

4️⃣ Popup and floating window both show:

- Previous lyric (fade up)
- Current lyric (fade in/out, glow)
- Next lyric (fade down)

---

## Roadmap

✅ Floating lyrics  
✅ Popup with lyrics  
✅ Background lyrics cache  
✅ Smooth animations

Known Issues / Bugs 🐛
🚧 Some bugs still need fixing:

Previous lyrics sometimes remain visible when song changes
→ If a new song starts and no lyric is playing yet, the "previous" line may still show the old song's previous lyric until the next lyric is detected.

Performance on very long syncedLyrics
→ On some songs with very dense syncedLyrics, performance may lag slightly (popup window and floating window animations may jitter).

Initial sync delay
→ Sometimes the floating window needs ~1-2 seconds to sync fully when opened in the middle of a song.

No fallback for unsynced lyrics
→ If lrclib.net returns no synced lyrics, no fallback static lyrics are shown (this is by design, but can be improved).

Next:

- [ ] Multi-platform support (Spotify Web, SoundCloud, etc)
- [ ] Light/Dark theme toggle
- [ ] Configurable font and style
- [ ] Settings page

---

## Credits

- [lrclib.net](https://lrclib.net/) → public lyrics API
- [WXT.dev](https://wxt.dev/) → Web Extension Toolkit
- YouTube Music player reverse engineering → content script

---

## License

MIT — feel free to fork and contribute!

---

**Enjoy your music! 🎵✨**

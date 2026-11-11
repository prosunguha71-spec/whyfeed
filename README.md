# WhyFeed – Algorithm Transparency Extension

Privacy-first Chrome extension (Manifest V3 + TypeScript + Vite + Chart.js) that *estimates* why YouTube recommends videos, using only local data.

## Install & build
```
npm install
npm run build        # outputs dist/
npm run typecheck    # optional
```
Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `dist/`.
Open `index.html` in a browser for the product website.

## Test
1. Open youtube.com → recommended videos show a **Why this?** pill (explanations are estimates).
2. Watch a few videos for 15+ s → dashboard (toolbar popup → Open dashboard) fills with real data.
3. Dashboard → Feed controls → add "Show less" for a topic → matching cards are hidden locally.
4. Settings → export, import, clear data, tune scoring weights.
5. Console check: DevTools → Network on youtube.com shows no requests from the extension.

## Notes
YouTube changes its markup often; selectors live in `src/content/recommendation-reader.ts`.
Hiding/highlighting is local only and never changes YouTube's server-side algorithm.

## WhyFeed web app (PWA)
Installable on phone and desktop, works offline. A web app cannot read YouTube pages, so it works from data you give it:
Google Takeout `watch-history.json`, a WhyFeed export from the extension, and pasted lists of recommended videos (Explain tab).
```
npm run build:pwa      # outputs dist-pwa/
npm run preview:pwa    # http://localhost:4173 (installable on localhost)
```
To install on a phone, host `dist-pwa/` on any static HTTPS host (Netlify, Vercel, GitHub Pages, Cloudflare Pages).
iOS: Share → Add to Home Screen. Android/desktop Chrome: Install app.

# ASOQA — promo site

Single-page cinematic promo site for **ASOQA** (App Store Optimization studio),
implemented from the `ASOQA7 Hig` Claude Design handoff. Scroll-driven film scenes
(hero → idea → build → launch → Top 5), an animated "rise to Top 5" chart, team,
the CASIDOM featured build, case studies, and a lead form that delivers straight
to Telegram. Bilingual **EN / ES** (remembered in `localStorage`).

Framework-free: plain HTML/CSS/JS + a tiny Node server. No build step to run it.

## Structure

```
index.html          — the whole page (markup + inline design styles)
js/app.js           — runtime: preloader, scroll cinematics, chart animation,
                      EN/ES toggle, spark canvas, form → /api/lead
media/              — optimized assets:  *.webm + *.mp4 (video),  *.webp (images)
assets/             — favicon.svg, og-image.jpg
server/
  server.js         — static server + POST /api/lead → Telegram (zero deps)
  config.json       — secrets (bot token, chat ids) — GITIGNORED
  config.example.json
tools/              — build/optimization scripts (see DEPLOY.md)
Dockerfile          — containerized static+API
DEPLOY.md           — how to run & deploy
```

## Run locally

```bash
node server/server.js          # → http://127.0.0.1:8080  (site + form API)
```
The form posts to `/api/lead` (same origin) and forwards each lead to the
configured Telegram recipients.

## Weight

Per-visitor ≈ **8 MB** (WebM video + WebP images), down from the 420 MB source
handoff — a 96% reduction, no visible quality loss. Only the assets the design
actually references are shipped (6 of 41 videos, 33 of 122 images).

## Editing

- **Copy / Spanish text** — inline in `index.html` (`data-es` / `data-es-ph`
  attributes hold the ES translation next to the EN text).
- **Lead recipients** — `server/config.json` `chatIds`, or `TELEGRAM_CHAT_IDS` env.
- **Re-optimize media / regenerate index** — see the `tools/` scripts in `DEPLOY.md`.

Deploy: see [DEPLOY.md](DEPLOY.md).

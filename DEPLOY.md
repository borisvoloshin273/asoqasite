# ASOQA — deploy

The site is a single, self-contained unit: a **static front-end** (`index.html`,
`js/`, `assets/`, `media/`) served by a **zero-dependency Node server**
(`server/server.js`) that also accepts the lead form at `POST /api/lead` and
forwards each lead to Telegram.

**Per-visitor weight ≈ 8 MB** (WebM video + WebP images), down from the 420 MB bundle.

## Secrets (never committed)

The server needs the Telegram bot token and recipient chat-ids. Provide them by
**environment variables** (preferred for containers) or `server/config.json`
(gitignored). Both are already set locally in `server/config.json`.

```
TELEGRAM_BOT_TOKEN = <bot token>
TELEGRAM_CHAT_IDS  = 56581499,413209663
PORT               = 8080   # optional
```

## Run — bare Node (any Linux host)

```bash
TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHAT_IDS=56581499,413209663 node server/server.js
# serves the whole site + /api/lead on :8080
```
Put nginx/Caddy in front for TLS and proxy everything to `127.0.0.1:8080`.

## Run — Docker (matches the Caddy/Compose infra)

```bash
docker build -t asoqa-site .
docker run -d --name asoqa -p 8080:8080 \
  -e TELEGRAM_BOT_TOKEN=xxx \
  -e TELEGRAM_CHAT_IDS=56581499,413209663 \
  asoqa-site
```

### Caddy site block (asoqa.com → this container)
```
asoqa.com, www.asoqa.com {
    reverse_proxy asoqa:8080
}
```

## DNS

Point `asoqa.com` (A record, and `www` CNAME/A) at the host that runs the above.
`api/lead` is same-origin, so no CORS or mixed-content concerns.

## Health

`GET /api/health` → `{"ok":true,"configured":true,"recipients":2}`

## Rebuilding from the design handoff

- `node tools/build-index.js`  — regenerate `index.html` from the DC prototype
- `node tools/opt-images.js`   — re-optimize images → WebP
- `bash tools/opt-video.sh`    — re-encode videos → mp4 + webm
- `node tools/make-og.js`      — regenerate the OG share image

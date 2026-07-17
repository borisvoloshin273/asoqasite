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
Put a TLS-terminating reverse proxy in front and proxy everything to `127.0.0.1:8080`.

## Production (as actually deployed)

The live site is **`https://asoqa.io`** on VPS **`45.84.227.27`** (Ubuntu 24.04).
Note: `asoqa.com` is **not** ours — it is parked on a domain marketplace.

The box is shared with an unrelated project, **flowerhub** (`flowerhab.ru`).
There is **no Caddy** — flowerhub's **nginx** container owns ports 80/443 and
reverse-proxies both sites. TLS is therefore *not* automatic: certificates are
issued explicitly with certbot (see below).

| Path | What |
| --- | --- |
| `/opt/asoqa/` | this site — `docker-compose.yml`, `.env` (secrets), site files |
| `/opt/flowerhub/infra/nginx.conf` | the **single** nginx vhost file for *both* sites |
| `/opt/flowerhub/infra/certbot/{conf,www}` | Let's Encrypt state + ACME webroot |
| `/etc/cron.d/certbot-flowerhub` | 03:00 daily `certbot renew` (covers **all** certs) + nginx restart |

The container joins flowerhub's docker network under the alias `asoqa`, so nginx
reaches it at `http://asoqa:8080`. Its `8088` port is bound to `127.0.0.1` only —
do **not** publish it on `0.0.0.0`, that would serve the whole site in cleartext,
bypassing TLS.

```bash
cd /opt/asoqa && docker compose up -d --build   # deploy/restart
```

nginx.conf is a **single-file bind mount**: `sed -i` swaps the inode, so the
container keeps the old file until `docker restart flowerhub-nginx-1`
(a plain `nginx -s reload` is not enough). Validate before restarting:

```bash
docker run --rm --network flowerhub_default \
  -v /opt/flowerhub/infra/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /opt/flowerhub/infra/certbot/conf:/etc/letsencrypt:ro \
  -v /opt/flowerhub/infra/certbot/www:/var/www/certbot:ro \
  nginx:1.27-alpine nginx -t
```

Restarting nginx briefly drops `flowerhab.ru` too — it is the same container.

### TLS (done 2026-07-17, expires 2026-10-15)

Cert for `asoqa.io` + `www.asoqa.io`, issued via the shared certbot webroot:

```bash
CB=/opt/flowerhub/infra/certbot
docker run --rm -v "$CB/conf:/etc/letsencrypt" -v "$CB/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d asoqa.io -d www.asoqa.io \
  --email saqlain358888@gmail.com --agree-tos --no-eff-email --non-interactive
```

Renewal needs no extra setup — the existing flowerhub cron renews every cert it
finds. Verify with `certbot renew --dry-run`.

## DNS

`asoqa.io` (A, apex) and `www.asoqa.io` (A) → `45.84.227.27`. Already set.
`api/lead` is same-origin, so no CORS or mixed-content concerns.

## Health

`GET /api/health` → `{"ok":true,"configured":true,"recipients":2}`

## Rebuilding from the design handoff

- `node tools/build-index.js`  — regenerate `index.html` from the DC prototype
- `node tools/opt-images.js`   — re-optimize images → WebP
- `bash tools/opt-video.sh`    — re-encode videos → mp4 + webm
- `node tools/make-og.js`      — regenerate the OG share image

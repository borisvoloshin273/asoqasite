# ASOQA site — static + form→Telegram backend, single zero-dependency Node process.
FROM node:22-alpine

WORKDIR /app

# App = static site + server (no npm deps: server uses only Node built-ins)
COPY index.html ./index.html
COPY js ./js
COPY assets ./assets
COPY media ./media
COPY server/server.js ./server/server.js

ENV PORT=8080
# Secrets are provided at runtime, NEVER baked into the image:
#   -e TELEGRAM_BOT_TOKEN=...   -e TELEGRAM_CHAT_IDS=56581499,413209663
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "server/server.js"]

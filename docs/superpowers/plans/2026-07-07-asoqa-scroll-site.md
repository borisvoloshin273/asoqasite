# ASOQA scroll-scrub site — Implementation Plan

> **For agentic workers:** verification cycle is **browser (Playwright/local server)**, not unit tests. Not a git repo → "commit" = checkpoint (owner controls git). Steps use `- [ ]`.

**Goal:** Одностраничный сайт ASOQA: 8 клипов склеены в одну ленту кадров, проигрываемую только скроллом на canvas, с RU/EN плашками и прелоадером, без подвисаний.

**Architecture:** Статик HTML/CSS/vanilla-JS. ffmpeg разбирает видео в JPEG-кадры → один fixed `<canvas>` рисует кадр по глобальному прогрессу скролла (rAF+lerp). Прелоадер грузит 1-ю сцену, префетч догоняет остальные. Плашки и i18n — оверлей.

**Tech Stack:** ffmpeg-static (npm, установлен), vanilla JS, Playwright (MCP) для проверки, python3 `http.server` для локального сервера.

## Global Constraints
- Ноль внешних runtime-зависимостей (весь JS/CSS свой, инлайн-ассеты не требуются).
- Скраб-fps 12, ширина кадра 1280 (desktop). Мобильный слой добавляем только если вес/скорость потребуют.
- Кадры в памяти — сжатые JPEG (Image), НЕ распакованные bitmap. Lookahead `decode()` ≤ 8 кадров.
- Приоритет №1: никаких подвисаний/белых экранов — скраб клампится к загруженной границе.
- Язык по умолчанию RU, выбор в localStorage. Стиль плашек — «чистое стекло». CTA — заглушка href="#".
- Исходники в `video/` не трогаем. Бинарь ffmpeg: `node_modules/ffmpeg-static/ffmpeg`.

---

### Task 1: Конвейер кадров (foundation)
**Files:** Create `tools/build-frames.sh`, `assets/frames/scene01..08/frame_%04d.jpg`, `assets/manifest.json`
**Produces:** `assets/manifest.json` = `{scenes:[{id,file,frames,dur,fps}],scrubFps,totalFrames}` — потребляется config.js.

- [ ] Написать `tools/build-frames.sh`: для каждого `video/N.mp4` → `ffmpeg -i N.mp4 -vf "fps=12,scale=1280:-2" -q:v 5 assets/frames/sceneNN/frame_%04d.jpg`, без звука; посчитать кадры; записать manifest.json.
- [ ] Запустить скрипт.
- [ ] Проверить: у каждой сцены > 0 кадров; сумма ≈ 600–650; общий вес `du -sh assets/frames`; открыть по 1 кадру из сцены 1 и 8 (Read image) — картинка валидна.
- [ ] Если вес > ~50 МБ — поднять `-q:v` до 6–7; перезапустить.

### Task 2: config.js — манифест сцен + копирайт + константы
**Files:** Create `js/config.js`
**Consumes:** assets/manifest.json (числа кадров). **Produces:** `window.ASOQA_CONFIG` = `{scrubFps, lerp, lookahead, pageVh, defaultLang, ctaHref, scenes:[{id, dir, frames, start, end, panelPos, text:{ru:{h,p},en:{h,p}}}]}` где start/end — глобальный прогресс [0,1] по накопленной длительности.

- [ ] Захардкодить массив сцен: dir, frames (из manifest), вычислить start/end по накопленным кадрам, panelPos (`center|bottom|left|right`), тексты RU/EN из спека раздел 5.
- [ ] Константы: scrubFps=12, lerp=0.15, lookahead=6, pageVh (сумм. кадры→высота, ~ totalFrames*1.1 vh как старт), defaultLang='ru', ctaHref='#'.
- [ ] Проверка: `node -e "require синтаксис"` через быстрый браузер-лог позже; сейчас — визуальный контроль сумм start/end (0→1 без разрывов).

### Task 3: index.html + css/style.css (каркас, стекло, топ-бар, прелоадер)
**Files:** Create `index.html`, `css/style.css`
**Produces:** DOM: `#stage>canvas#frame`, `#topbar`(logo + `#lang-ru`/`#lang-en`), `#panels`, `#preloader`(#pct), `#scroll-hint`, `#spacer`(высота ленты).

- [ ] index.html подключает config.js, i18n.js, loader.js, scrubber.js, panels.js, main.js (в конце body).
- [ ] CSS: `#stage{position:fixed;inset:0}` canvas cover; topbar фикс с градиент-подложкой; `.panel` — стекло (backdrop-filter blur, rgba фон, рамка 1px, radius 16px, тень), центрирование по panelPos; `.panel.show` анимация; preloader фуллскрин; `body` высота = pageVh через `#spacer`.
- [ ] Проверка: открыть в браузере — виден прелоадер, топ-бар, страница скроллится (spacer даёт высоту).

### Task 4: loader.js — прелоадер + префетч
**Files:** Create `js/loader.js`
**Consumes:** ASOQA_CONFIG. **Produces:** `ASOQA.frames` (массив Image по глобальному индексу), `ASOQA.loadedCount`, событие `asoqa:ready` после сцены 1, `ASOQA.frontier` (индекс последнего загруженного).

- [ ] Функция preload: грузит кадры сцены 1 (Image.src, onload), обновляет `#pct`; по завершении прячет прелоадер, dispatch `asoqa:ready`.
- [ ] Sequential prefetch: после ready продолжает грузить сцены 2..8 по порядку, инкрементит frontier.
- [ ] Проверка (Playwright): прелоадер показывает %, исчезает; в консоли frontier растёт до totalFrames.

### Task 5: scrubber.js — движок скраба
**Files:** Create `js/scrubber.js`
**Consumes:** ASOQA.frames, ASOQA.frontier, ASOQA_CONFIG. **Produces:** `ASOQA.progress` (текущий глоб. прогресс), рисует на canvas.

- [ ] scroll→targetFrame = round(progress*(total-1)), клампится к frontier.
- [ ] rAF loop: renderFrame lerp→target; drawImage cover-fit (расчёт масштаба под вьюпорт, центр); resize handler.
- [ ] Lookahead: `frames[i+1..i+lookahead].decode()` по направлению.
- [ ] Проверка (Playwright): scrollTo разные Y → canvas меняется (screenshot diff); быстрый скролл в конец при неполном префетче → нет белого (держит кадр).

### Task 6: i18n.js + panels.js
**Files:** Create `js/i18n.js`, `js/panels.js`
**Consumes:** ASOQA_CONFIG, ASOQA.progress. **Produces:** `ASOQA.setLang(l)`, панели показываются по прогрессу.

- [ ] i18n: setLang меняет тексты всех панелей + topbar, сохраняет в localStorage, подсветка активной кнопки; init читает сохранённый/дефолт.
- [ ] panels: на каждом кадре rAF — для активной сцены вычислить локальный прогресс; показать `.panel.show` в [0.15,0.85], иначе скрыть; CTA-кнопка в панели 8 (ctaHref).
- [ ] Проверка (Playwright): скролл по диапазонам сцен → нужная плашка видна; клик RU/EN меняет весь текст; reload сохраняет язык.

### Task 7: main.js + полная интеграция и проверка
**Files:** Create `js/main.js`
**Consumes:** всё. **Produces:** запуск в правильном порядке.

- [ ] main: init i18n → loader.preload → на `asoqa:ready` старт scrubber+panels rAF; scroll-hint скрыть после первого скролла.
- [ ] Полная проверка (Playwright, local server): прелоадер→вход; скролл вперёд/назад двигает ленту; плашки в тайминге; RU/EN; мобильная ширина 390px; быстрый скролл — без зависаний. Скриншоты сцен 1,5,7,8 на RU и EN.
- [ ] Показать владельцу скриншоты.

### Task 8: пережатые mp4 (постеры/резерв) — низкий приоритет
**Files:** Modify `tools/build-frames.sh` (доп. секция) → `assets/video/N.mp4`
- [ ] ffmpeg H.264 CRF 26 faststart scale 1080p для каждого клипа (резерв/постер первого кадра). Не блокирует основной функционал.

## Self-Review
- Покрытие спека: §2 карта→Task1/2; §3 архитектура→Task3-7; §4 сжатие→Task1/8; §5 тексты→Task2/6; §6 визуал→Task3/6; §7 не-виснет→Task4/5; §8 проверка→Task7. ✓
- Плейсхолдеров нет (CTA-заглушка осознанная, зафиксирована в константах).
- Согласованность имён: ASOQA.frames/frontier/progress/setLang, ASOQA_CONFIG — единообразны во всех тасках. ✓

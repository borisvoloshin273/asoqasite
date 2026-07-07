/* ASOQA — движок скраба.
 * scroll -> глобальный прогресс -> кадр на <canvas>. Сглаживание (lerp),
 * cover-fit под вьюпорт, декодирование кадров вперёд, кламп к границе загрузки. */
(function () {
  'use strict';
  var CFG = window.ASOQA_CONFIG;
  var A = (window.ASOQA = window.ASOQA || {});
  var total = CFG.totalFrames;

  var canvas = document.getElementById('frame');
  var ctx = canvas.getContext('2d', { alpha: false });
  var cssW = 0, cssH = 0, dpr = 1;

  var cur = 0;            // текущий (сглаженный) кадр
  var lastDrawn = -1;
  var lastGood = null;    // последний успешно нарисованный Image (страховка от пустого экрана)
  var dir = 1;

  A.progress = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastDrawn = -1;           // форсируем перерисовку
    drawFrame(Math.round(cur));
  }

  function drawCover(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return false;
    var scale = Math.max(cssW / iw, cssH / ih);
    var dw = iw * scale, dh = ih * scale;
    var dx = (cssW - dw) / 2, dy = (cssH - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  function drawFrame(idx) {
    idx = Math.max(0, Math.min(total - 1, idx));
    var img = A.frames[idx];
    if (img && img.naturalWidth > 0) {
      if (drawCover(img)) { lastGood = img; return; }
    }
    if (lastGood) drawCover(lastGood);   // держим последний хороший кадр, не мигаем
  }

  function readProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return 0;
    var p = window.pageYOffset / max;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  function decodeAhead(idx) {
    var end = Math.min(total - 1, idx + (dir >= 0 ? CFG.lookahead : 1));
    var start = Math.max(0, idx + (dir >= 0 ? 1 : -CFG.lookahead));
    for (var g = start; g <= end; g++) {
      var im = A.frames[g];
      if (im && im.decode && !im._dec) { im._dec = 1; im.decode().catch(function () {}); }
    }
  }

  // Один тик рендера (вызывается из общего rAF в main.js)
  A.scrubber = {
    tick: function () {
      var p = readProgress();
      A.progress = p;                                  // «сырой» прогресс скролла
      var target = p * (total - 1);
      var drawTarget = Math.min(target, A.frontier);   // не заходим за загруженное
      if (drawTarget < 0) drawTarget = 0;

      var d = drawTarget - cur;
      // хвост сглаживания рубим раньше (≤0.75 кадра неразличимо) — плашки/рельс
      // не отстают, когда скролл останавливается
      if (Math.abs(d) < 0.75) { cur = drawTarget; }
      else { dir = d >= 0 ? 1 : -1; cur += d * CFG.lerp; }

      // прогресс того, что РЕАЛЬНО на экране — по нему живут плашки и рельс,
      // чтобы текст всегда совпадал с кадром (даже если скролл обогнал загрузку)
      A.viewProgress = total > 1 ? cur / (total - 1) : 0;

      var idx = Math.round(cur);
      if (idx !== lastDrawn) { drawFrame(idx); lastDrawn = idx; decodeAhead(idx); }
    },
    resize: resize,
    redraw: function () { lastDrawn = -1; drawFrame(Math.round(cur)); }
  };

  window.addEventListener('resize', resize, { passive: true });
  resize();
})();

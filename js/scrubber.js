/* ASOQA — движок скраба.
 * scroll -> кадр на <canvas>. Ключевое против «зависаний»: длина прокрутки
 * растёт вместе с загрузкой (body height = загруженные кадры), поэтому скролл
 * физически не может обогнать загрузку — вместо замершего кадра просто пока
 * нет прокрутки дальше. Плюс сглаживание (lerp), cover-fit, декод вперёд. */
(function () {
  'use strict';
  var CFG = window.ASOQA_CONFIG;
  var A = (window.ASOQA = window.ASOQA || {});
  var total = CFG.totalFrames;

  var canvas = document.getElementById('frame');
  var ctx = canvas.getContext('2d', { alpha: false });
  var cssW = 0, cssH = 0, dpr = 1;

  var cur = 0;
  var lastDrawn = -1;
  var lastGood = null;
  var dir = 1;
  var lastHeightFrontier = -2;

  A.progress = 0;
  A.viewProgress = 0;

  // пикселей прокрутки на один кадр (константа при данной высоте вьюпорта)
  function ppf() { return (CFG.pageVh / 100 * window.innerHeight) / (total - 1); }

  // длина страницы = по загруженную границу (+ экран), растёт по мере загрузки
  function updateHeight() {
    var f = A.frontier == null || A.frontier < 0 ? 0 : A.frontier;
    document.body.style.height = (f * ppf() + window.innerHeight) + 'px';
  }

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssW = window.innerWidth;
    cssH = window.innerHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastDrawn = -1;
    drawFrame(Math.round(cur));
  }

  function drawCover(img) {
    var iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw || !ih) return false;
    var scale = Math.max(cssW / iw, cssH / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
    return true;
  }

  function drawFrame(idx) {
    idx = Math.max(0, Math.min(total - 1, idx));
    var img = A.frames[idx];
    if (img && img.naturalWidth > 0) {
      if (drawCover(img)) { lastGood = img; return; }
    }
    if (lastGood) drawCover(lastGood);
  }

  function decodeAhead(idx) {
    var end = Math.min(total - 1, idx + (dir >= 0 ? CFG.lookahead : 1));
    var start = Math.max(0, idx + (dir >= 0 ? 1 : -CFG.lookahead));
    for (var g = start; g <= end; g++) {
      var im = A.frames[g];
      if (im && im.decode && !im._dec) { im._dec = 1; im.decode().catch(function () {}); }
    }
  }

  function onResize() {
    resizeCanvas();
    updateHeight();
    window.scrollTo(0, cur * ppf());   // сохранить текущий кадр при ресайзе
  }

  A.scrubber = {
    tick: function () {
      // длина страницы догоняет загрузку
      if (A.frontier !== lastHeightFrontier) { lastHeightFrontier = A.frontier; updateHeight(); }

      var p = ppf();
      var target = window.pageYOffset / p;
      if (target < 0) target = 0;
      var maxF = A.frontier < 0 ? 0 : Math.min(total - 1, A.frontier);
      if (target > maxF) target = maxF;

      A.progress = target / (total - 1);

      var d = target - cur;
      if (Math.abs(d) < 0.75) { cur = target; }
      else { dir = d >= 0 ? 1 : -1; cur += d * CFG.lerp; }

      A.viewProgress = total > 1 ? cur / (total - 1) : 0;

      var idx = Math.round(cur);
      if (idx !== lastDrawn) { drawFrame(idx); lastDrawn = idx; decodeAhead(idx); }
    },
    resize: onResize,
    redraw: function () { lastDrawn = -1; drawFrame(Math.round(cur)); },
    updateHeight: updateHeight
  };

  window.addEventListener('resize', onResize, { passive: true });
  resizeCanvas();
})();

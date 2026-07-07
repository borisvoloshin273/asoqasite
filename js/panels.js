/* ASOQA — плашки с текстом + телеметрия (рельс миссии).
 * Строит 8 стеклянных плашек и станции рельса из config; на каждом тике
 * показывает/прячет активную плашку, двигает прогресс рельса и смещает
 * акцент от янтарного к синему по ходу истории. */
(function () {
  'use strict';
  var CFG = window.ASOQA_CONFIG;
  var A = (window.ASOQA = window.ASOQA || {});
  var scenes = CFG.scenes;
  var total = CFG.totalFrames;
  var n = scenes.length;

  var panelEls = [];      // {root, tag, h, p, cta}
  var stationEls = [];
  var railFill, railCur;
  var lastActive = -1;
  var lastFillPct = '';

  var AMBER = [255, 178, 62];
  var BLUE = [77, 163, 255];
  function lerpHex(t) {
    var r = Math.round(AMBER[0] + (BLUE[0] - AMBER[0]) * t);
    var g = Math.round(AMBER[1] + (BLUE[1] - AMBER[1]) * t);
    var b = Math.round(AMBER[2] + (BLUE[2] - AMBER[2]) * t);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }
  function two(x) { return x < 10 ? '0' + x : '' + x; }

  function build() {
    var host = document.getElementById('panels');
    for (var i = 0; i < n; i++) {
      var s = scenes[i];
      var root = document.createElement('article');
      root.className = 'panel pos-' + s.panelPos;
      root.setAttribute('data-scene', s.id);

      var eyebrow = document.createElement('div');
      eyebrow.className = 'panel-eyebrow';
      var num = document.createElement('span'); num.className = 'eb-num'; num.textContent = two(s.id);
      var sep = document.createElement('span'); sep.className = 'eb-sep'; sep.textContent = '·';
      var tag = document.createElement('span'); tag.className = 'eb-tag';
      eyebrow.appendChild(num); eyebrow.appendChild(sep); eyebrow.appendChild(tag);

      var h = document.createElement('h2'); h.className = 'panel-h';
      var p = document.createElement('p'); p.className = 'panel-p';

      root.appendChild(eyebrow); root.appendChild(h); root.appendChild(p);

      var cta = null;
      if (s.cta) {
        cta = document.createElement('a');
        cta.className = 'panel-cta';
        cta.href = CFG.ctaHref;
        root.appendChild(cta);
      }
      host.appendChild(root);
      panelEls.push({ root: root, tag: tag, h: h, p: p, cta: cta });
    }

    // Станции рельса (десктоп) по границам сцен
    var host2 = document.getElementById('rail-stations');
    for (var j = 0; j < n; j++) {
      var st = document.createElement('div');
      st.className = 'rail-station';
      st.style.top = (scenes[j].startFrame / total) * 100 + '%';
      host2.appendChild(st);
      stationEls.push(st);
    }
    var totEl = document.getElementById('rail-total');
    if (totEl) totEl.textContent = two(n);
    railFill = document.getElementById('rail-fill');
    railCur = document.getElementById('rail-cur');
  }

  function applyLang(lang) {
    for (var i = 0; i < n; i++) {
      var s = scenes[i], t = s.text[lang], el = panelEls[i];
      el.tag.textContent = s.tag[lang];
      el.h.textContent = t.h;
      el.p.textContent = t.p;
      if (el.cta && t.cta) el.cta.textContent = t.cta;
    }
  }

  function activeIndex(p) {
    var g = p * total;
    for (var i = 0; i < n; i++) {
      if (g < scenes[i].startFrame + scenes[i].frames) return i;
    }
    return n - 1;
  }

  function tick() {
    // ведём плашки/рельс по отображаемому кадру (viewProgress), а не по сырому скроллу —
    // так текст и телеметрия всегда синхронны с картинкой на холсте
    var p = (A.viewProgress != null ? A.viewProgress : A.progress) || 0;

    // показ/скрытие плашек по локальному прогрессу их сцены
    for (var i = 0; i < n; i++) {
      var s = scenes[i];
      var local = (p * total - s.startFrame) / s.frames;
      var show = local >= s.panelIn && local <= s.panelOut;
      panelEls[i].root.classList.toggle('show', show);
    }

    var act = activeIndex(p);

    // рельс: прогресс — пишем в DOM только при заметном изменении
    if (railFill) {
      var pctStr = (Math.round(p * 1000) / 10) + '%';
      if (pctStr !== lastFillPct) {
        lastFillPct = pctStr;
        if (window.innerWidth <= 720) { railFill.style.height = ''; railFill.style.width = pctStr; }
        else { railFill.style.width = ''; railFill.style.height = pctStr; }
      }
    }
    if (act !== lastActive) {
      lastActive = act;
      // акцент: янтарь -> синий по середине активной сцены
      var s2 = scenes[act];
      var t = (s2.startFrame + s2.frames / 2) / total;
      document.documentElement.style.setProperty('--accent', lerpHex(t));
      if (railCur) railCur.textContent = two(scenes[act].id);
      for (var k = 0; k < n; k++) {
        stationEls[k].classList.toggle('passed', k < act);
        stationEls[k].classList.toggle('active', k === act);
      }
    }
  }

  A.panels = { build: build, applyLang: applyLang, tick: tick };
})();

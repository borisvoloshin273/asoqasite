/* ASOQA — загрузчик кадров.
 * Держит массив Image по глобальному индексу, продвигает "границу загрузки"
 * (frontier) — до неё скраб гарантированно имеет кадры. Грузит 1-ю сцену,
 * снимает прелоадер, затем фоном догоняет остальные впереди скролла. */
(function () {
  'use strict';
  var CFG = window.ASOQA_CONFIG;
  var A = (window.ASOQA = window.ASOQA || {});
  var total = CFG.totalFrames;

  A.frames = new Array(total);
  A.loaded = new Array(total).fill(false);
  A.frontier = -1;          // макс. индекс, до которого всё загружено подряд
  A.ready = false;

  // глобальный индекс -> {dir, local(1-based)}
  function locate(g) {
    var scenes = CFG.scenes;
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      if (g < s.startFrame + s.frames) {
        return CFG.framePath(s.dir, g - s.startFrame + 1);
      }
    }
    return CFG.framePath(scenes[scenes.length - 1].dir, scenes[scenes.length - 1].frames);
  }
  A.frameSrc = locate;

  function advanceFrontier() {
    while (A.frontier + 1 < total && A.loaded[A.frontier + 1]) A.frontier++;
  }

  function loadFrame(g) {
    return new Promise(function (resolve) {
      if (A.loaded[g]) return resolve();
      var img = new Image();
      img.decoding = 'async';
      img.onload = function () { A.frames[g] = img; A.loaded[g] = true; advanceFrontier(); resolve(); };
      img.onerror = function () { A.loaded[g] = true; advanceFrontier(); resolve(); }; // не блокируем границу
      img.src = locate(g);
    });
  }

  // Полная предзагрузка всей ленты за прелоадером — скраб не сможет обогнать
  // загрузку и «зависнуть» на кадре. Показываем реальный % по всем кадрам.
  function loadAll() {
    var fill = document.getElementById('pl-fill');
    var pct = document.getElementById('pl-pct');
    var done = 0, next = 0, running = 0;
    var CONC = 8;                      // параллельных запросов
    return new Promise(function (resolve) {
      function launch() {
        while (running < CONC && next < total) {
          var g = next++;
          running++;
          loadFrame(g).then(function () {
            running--; done++;
            var p = Math.round((done / total) * 100);
            if (fill) fill.style.width = p + '%';
            if (pct) pct.textContent = p + '%';
            if (done >= total) resolve();
            else launch();
          });
        }
      }
      launch();
    });
  }

  A.startLoading = function () {
    return loadAll().then(function () { A.ready = true; });
  };
})();

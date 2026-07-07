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

  // Грузим кадры по порядку с параллелизмом. Прелоадер снимаем сразу после
  // 1-й сцены (быстрый старт), остальное догружается фоном. Длину прокрутки
  // наращивает scrubber по A.frontier — обогнать загрузку и «зависнуть» нельзя.
  function loadAll(onInit) {
    var fill = document.getElementById('pl-fill');
    var pct = document.getElementById('pl-pct');
    var firstCount = CFG.scenes[0].frames;
    var next = 0, running = 0, inited = false;
    var CONC = 8;
    function markInit() {
      if (inited) return;
      inited = true;
      A.ready = true;
      onInit();
    }
    function launch() {
      while (running < CONC && next < total) {
        var g = next++;
        running++;
        loadFrame(g).then(function () {
          running--;
          if (!inited) {
            var p = Math.min(100, Math.round(((A.frontier + 1) / firstCount) * 100));
            if (fill) fill.style.width = p + '%';
            if (pct) pct.textContent = p + '%';
            if (A.frontier >= firstCount - 1) markInit();
          }
          if (next < total) launch();
        });
      }
    }
    launch();
  }

  A.startLoading = function () {
    return new Promise(function (resolve) { loadAll(resolve); });
  };
})();

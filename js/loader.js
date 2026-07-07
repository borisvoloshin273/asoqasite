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

  // Прелоадер: грузим кадры 1-й сцены, показываем %, снимаем экран.
  function preloadFirstScene() {
    var firstCount = CFG.scenes[0].frames;
    var fill = document.getElementById('pl-fill');
    var pct = document.getElementById('pl-pct');
    var done = 0;
    var promises = [];
    for (var g = 0; g < firstCount; g++) {
      promises.push(loadFrame(g).then(function () {
        done++;
        var p = Math.round((done / firstCount) * 100);
        if (fill) fill.style.width = p + '%';
        if (pct) pct.textContent = p + '%';
      }));
    }
    return Promise.all(promises);
  }

  // Фоновый префетч остальных сцен по порядку (совпадает с направлением скролла).
  function prefetchRest() {
    var g = CFG.scenes[0].frames;
    var CONC = 6;
    function pump() {
      var batch = [];
      for (var k = 0; k < CONC && g < total; k++, g++) batch.push(loadFrame(g));
      if (batch.length === 0) return;
      Promise.all(batch).then(pump);
    }
    pump();
  }

  A.startLoading = function () {
    return preloadFirstScene().then(function () {
      A.ready = true;
      prefetchRest();
    });
  };
})();

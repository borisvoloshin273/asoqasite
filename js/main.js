/* ASOQA — сборка и запуск.
 * Порядок: строим плашки -> язык -> высота ленты -> грузим 1-ю сцену ->
 * снимаем прелоадер и запускаем общий rAF (скраб + телеметрия). */
(function () {
  'use strict';
  var CFG = window.ASOQA_CONFIG;
  var A = window.ASOQA;

  A.panels.build();
  A.initLang();

  // Высота страницы задаёт длину скролла (темп скраба)
  document.body.style.height = CFG.pageVh + 'vh';

  var loopRunning = false;
  function loop() {
    A.scrubber.tick();
    A.panels.tick();
    requestAnimationFrame(loop);
  }

  function reveal() {
    // первый кадр на холсте до снятия прелоадера
    A.scrubber.tick();
    A.panels.tick();
    document.documentElement.classList.add('ready');
    var pl = document.getElementById('preloader');
    if (pl) pl.classList.add('done');
    if (!loopRunning) { loopRunning = true; requestAnimationFrame(loop); }
    setupHint();
  }

  function setupHint() {
    var hint = document.getElementById('scroll-hint');
    if (!hint) return;
    function onScroll() {
      if (window.pageYOffset > 12) {
        hint.classList.add('hide');
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  A.startLoading().then(reveal);
})();

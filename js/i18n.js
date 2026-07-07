/* ASOQA — переключение языка RU/EN. Выбор запоминается в localStorage. */
(function () {
  'use strict';
  var CFG = window.ASOQA_CONFIG;
  var A = (window.ASOQA = window.ASOQA || {});
  var KEY = 'asoqa-lang';

  A.lang = CFG.defaultLang;

  function applyUi(lang) {
    var ui = CFG.ui[lang];
    var nodes = document.querySelectorAll('[data-ui]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-ui');
      if (ui[key] != null) nodes[i].textContent = ui[key];
    }
  }

  function markButtons(lang) {
    var btns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].getAttribute('data-lang') === lang);
    }
  }

  A.setLang = function (lang) {
    if (lang !== 'ru' && lang !== 'en') lang = 'ru';
    A.lang = lang;
    document.documentElement.lang = lang;
    applyUi(lang);
    markButtons(lang);
    if (A.panels && A.panels.applyLang) A.panels.applyLang(lang);
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  };

  A.initLang = function () {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    var btns = document.querySelectorAll('.lang-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () { A.setLang(this.getAttribute('data-lang')); });
    }
    A.setLang(saved || CFG.defaultLang);
  };
})();

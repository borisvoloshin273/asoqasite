/* ASOQA — конфигурация ленты и копирайт.
 * Единственный источник правды: список сцен, их кадры, позиции плашек и тексты RU/EN.
 * startFrame вычисляется кумулятивно из frames (DRY — не хардкодим глобальные индексы). */
(function () {
  'use strict';

  var scenes = [
    {
      id: 1, tag: { ru: 'ИДЕЯ', en: 'IDEA' }, dir: 'scene01', frames: 46, panelPos: 'bottom', panelIn: 0.16, panelOut: 0.92,
      text: {
        ru: { h: 'Всё начинается с идеи', p: 'У вас появилась идея приложения — здесь начинается путь.' },
        en: { h: 'It starts with an idea', p: 'You have an app in mind — this is where the journey begins.' }
      }
    },
    {
      id: 2, tag: { ru: 'БРИФ', en: 'BRIEF' }, dir: 'scene02', frames: 54, panelPos: 'bottom', panelIn: 0.16, panelOut: 0.9,
      text: {
        ru: { h: 'Вы приходите к нам', p: 'Мы внимательно слушаем и превращаем замысел в чёткий план.' },
        en: { h: 'You bring it to us', p: 'We listen closely and turn your vision into a clear plan.' }
      }
    },
    {
      id: 3, tag: { ru: 'КОМАНДА', en: 'TEAM' }, dir: 'scene03', frames: 61, panelPos: 'top', panelIn: 0.16, panelOut: 0.9,
      text: {
        ru: { h: 'За дело берётся команда', p: 'Дизайн, разработка, тестирование — единый поток.' },
        en: { h: 'The team takes over', p: 'Design, development, QA — one seamless flow.' }
      }
    },
    {
      id: 4, tag: { ru: 'РЕЛИЗ', en: 'RELEASE' }, dir: 'scene04', frames: 61, panelPos: 'bottom', panelIn: 0.16, panelOut: 0.9,
      text: {
        ru: { h: 'Приложение выходит в стор', p: 'Готовый продукт занимает своё место на витрине.' },
        en: { h: 'Your app goes live', p: 'The finished product lands in the store.' }
      }
    },
    {
      id: 5, tag: { ru: 'ТОП', en: 'RANK' }, dir: 'scene05', frames: 61, panelPos: 'bottom-left', panelIn: 0.16, panelOut: 0.9,
      text: {
        ru: { h: 'Путь в топ', p: 'ASO и оптимизация выводят приложение на первые строчки.' },
        en: { h: 'Climbing to #1', p: 'ASO and optimization push your app to the top.' }
      }
    },
    {
      id: 6, tag: { ru: 'ЗАПУСК', en: 'LAUNCH' }, dir: 'scene06', frames: 94, panelPos: 'top-left', panelIn: 0.14, panelOut: 0.9,
      text: {
        ru: { h: 'Обратный отсчёт', p: 'Один запуск — и продукт отправляется к пользователям.' },
        en: { h: 'Countdown to launch', p: 'One push — and your product is on its way.' }
      }
    },
    {
      id: 7, tag: { ru: 'МАСШТАБ', en: 'SCALE' }, dir: 'scene07', frames: 169, panelPos: 'bottom', panelIn: 0.12, panelOut: 0.9,
      text: {
        ru: { h: 'Весь мир на связи', p: 'Ваше приложение находит пользователей по всей планете.' },
        en: { h: 'The whole world, connected', p: 'Your app reaches users across the planet.' }
      }
    },
    {
      id: 8, tag: { ru: 'ГОТОВЫ?', en: 'READY?' }, dir: 'scene08', frames: 85, panelPos: 'center', panelIn: 0.22, panelOut: 1.01,
      cta: true,
      text: {
        ru: { h: 'От идеи до вершины', p: 'ASOQA доводит приложения до результата. Начнём ваш?', cta: 'Связаться' },
        en: { h: 'From idea to the summit', p: 'ASOQA takes apps all the way. Shall we start yours?', cta: 'Get in touch' }
      }
    }
  ];

  // Кумулятивные глобальные индексы кадров.
  var acc = 0;
  for (var i = 0; i < scenes.length; i++) {
    scenes[i].startFrame = acc;
    acc += scenes[i].frames;
  }

  window.ASOQA_CONFIG = {
    scrubFps: 12,
    width: 1280,
    totalFrames: acc,            // 631
    lerp: 0.16,                  // сглаживание догона кадра (0..1, больше = резче)
    lookahead: 14,               // сколько кадров вперёд декодировать заранее (декод не блокирует кадр)
    pageVh: 850,                 // высота страницы в vh — задаёт темп скраба (тюним)
    defaultLang: 'ru',
    ctaHref: '#',                // заглушка: заменить на Telegram/почту
    scenes: scenes,
    framePath: function (dir, oneBasedIndex) {
      var s = String(oneBasedIndex);
      while (s.length < 4) s = '0' + s;
      return 'assets/frames/' + dir + '/frame_' + s + '.jpg';
    },
    ui: {
      ru: { brand: 'ASOQA', tagline: 'Разработка мобильных приложений', hint: 'Листайте вниз', loading: 'Загрузка' },
      en: { brand: 'ASOQA', tagline: 'Mobile app development', hint: 'Scroll down', loading: 'Loading' }
    }
  };
})();

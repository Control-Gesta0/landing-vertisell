/* =========================================================================
   Vertisell — demo animada + interativa do CRM (módulo isolado)
   Renderiza, dentro de #crm-demo: abas de cenas, janela do app (desenho fixo
   1200×740 "px de design", escalada por transform), legenda e play/pausa.
   API pública: window.VertisellDemo = { init(el), goTo(sceneId), play(), pause() }
   Ids de cena: atendimento · funil · agenda · ligacao · automacoes · painel
   Sem dependências, sem Math.random no roteiro (tudo determinístico).
   ========================================================================= */
(function () {
  'use strict';
  if (window.VertisellDemo) return;

  var D = document;
  var SCRIPT_SRC = (D.currentScript && D.currentScript.src) ||
    (function () { var s = D.querySelector('script[src*="demo.js"]'); return s ? s.src : ''; })();

  /* ================================================================ base */
  var W = 1200, H = 740;
  var MQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var EASE = { out: 'cubic-bezier(.22,1,.36,1)', io: 'cubic-bezier(.65,0,.35,1)', back: 'cubic-bezier(.34,1.56,.64,1)' };
  var E = {
    lin: function (t) { return t; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    out4: function (t) { return 1 - Math.pow(1 - t, 4); },
    io: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    io2: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
  };
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rng(seed) { // mulberry32 — determinístico
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dots(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function brl(n) { return 'R$ ' + dots(n); }
  function mil(n) { return 'R$ ' + (Math.round(n * 10) / 10).toFixed(1).replace('.', ',') + ' mil'; }
  function pct(n) { return n.toFixed(1).replace('.', ',') + '%'; }
  function mmss(s) { s = Math.max(0, Math.floor(s)); return (s < 600 ? '0' : '') + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60); }
  function h(html) { var t = D.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function ic(n, c) { return '<svg class="vd-i' + (c ? ' ' + c : '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#vd-i-' + n + '"></use></svg>'; }
  function report(e) { if (window.console && console.warn) console.warn('[VertisellDemo]', e); }
  function imgURL(name) {
    if (!SCRIPT_SRC) return 'assets/img/' + name;
    try { return new URL('../img/' + name, SCRIPT_SRC).href; } catch (e) { return 'assets/img/' + name; }
  }

  /* ============================================================== ícones */
  var I_CAL = '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>';
  var I_BELL = '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>';
  var I_PHONE = '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>';
  var ICONS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    pin: '<path d="M19 10c0 5.4-7 11.6-7 11.6S5 15.4 5 10a7 7 0 0 1 14 0z"/><circle cx="12" cy="10" r="2.5"/>',
    updown: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
    spark: '<path d="M10 3q1 7.5 8 8.5-7 1-8 8.5-1-7.5-8-8.5 7-1 8-8.5z"/><path d="M19 2v4M21 4h-4M19.5 16.5v3M21 18h-3"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/>',
    chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5z"/>',
    cal: I_CAL,
    calcheck: I_CAL + '<path d="m9 15.5 2 2 4-4"/>',
    contacts: '<rect x="5" y="2.5" width="15" height="19" rx="2.5"/><circle cx="12.5" cy="10" r="2.6"/><path d="M8.5 17.5a4 4 0 0 1 8 0M3 7h2.5M3 12h2.5M3 17h2.5"/>',
    leads: '<circle cx="12" cy="12" r="2.3"/><circle cx="5" cy="5" r="1.7"/><circle cx="19" cy="5" r="1.7"/><circle cx="5" cy="19" r="1.7"/><circle cx="19" cy="19" r="1.7"/><path d="m6.6 6.6 3.6 3.6M17.4 6.6l-3.6 3.6M6.6 17.4l3.6-3.6M17.4 17.4l-3.6-3.6"/>',
    kanban: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M8 7v7M12 7v4M16 7v9"/>',
    receipt: '<path d="M5 2.5h14v19l-2.4-1.5-2.3 1.5-2.3-1.5-2.3 1.5L7.4 20 5 21.5z"/><path d="M14.5 8h-4a1.7 1.7 0 0 0 0 3.4h3a1.7 1.7 0 0 1 0 3.4h-4M12 6.5V8M12 14.8v1.5"/>',
    scan: '<path d="M3 7.5V5a2 2 0 0 1 2-2h2.5M16.5 3H19a2 2 0 0 1 2 2v2.5M21 16.5V19a2 2 0 0 1-2 2h-2.5M7.5 21H5a2 2 0 0 1-2-2v-2.5"/><path d="M7.5 9h6M7.5 12.5h4"/><path d="M17 12.5q.4 2.6 3 3-2.6.4-3 3-.4-2.6-3-3 2.6-.4 3-3z"/>',
    agents: '<path d="M14 3q.9 6.1 7 7-6.1.9-7 7-.9-6.1-7-7 6.1-.9 7-7z"/><path d="M5 15v6M2 18h6"/>',
    send: '<path d="m21.5 2.5-7 19-4-8.5-8.5-4z"/><path d="M21.5 2.5 10.5 13"/>',
    auto: '<path d="M12 3a9 9 0 1 1-8.2 5.3"/><path d="M3 3.5v5h5"/><path d="m10 9 5 3-5 3z"/>',
    sites: '<rect x="3" y="3.5" width="18" height="17" rx="2.5"/><path d="M3 8.5h18"/><circle cx="12" cy="14.5" r="2.4"/>',
    star: '<path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    mobile: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M11 18h2"/>',
    gear: '<path d="M12.2 2h-.4a2 2 0 0 0-2 2v.2a2 2 0 0 1-1 1.7l-.4.3a2 2 0 0 1-2 0l-.2-.1a2 2 0 0 0-2.7.7l-.2.4a2 2 0 0 0 .7 2.7l.2.1a2 2 0 0 1 1 1.7v.5a2 2 0 0 1-1 1.7l-.2.1a2 2 0 0 0-.7 2.7l.2.4a2 2 0 0 0 2.7.7l.2-.1a2 2 0 0 1 2 0l.4.3a2 2 0 0 1 1 1.7v.2a2 2 0 0 0 2 2h.4a2 2 0 0 0 2-2v-.2a2 2 0 0 1 1-1.7l.4-.3a2 2 0 0 1 2 0l.2.1a2 2 0 0 0 2.7-.7l.2-.4a2 2 0 0 0-.7-2.7l-.2-.1a2 2 0 0 1-1-1.7v-.5a2 2 0 0 1 1-1.7l.2-.1a2 2 0 0 0 .7-2.7l-.2-.4a2 2 0 0 0-2.7-.7l-.2.1a2 2 0 0 1-2 0l-.4-.3a2 2 0 0 1-1-1.7V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    phone: I_PHONE,
    phonecall: I_PHONE + '<path d="M14.5 2.5a8.5 8.5 0 0 1 7 7M14.5 6a5 5 0 0 1 3.5 3.5"/>',
    mega: '<path d="m3 11 18-5v12L3 14z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
    bell: I_BELL,
    bellring: I_BELL + '<path d="M3.5 3A10 10 0 0 0 2 8M22 8a10 10 0 0 0-1.5-5"/>',
    filter: '<path d="M3 6h18M7 12h10M10.5 18h3"/>',
    funnel: '<path d="M3 4h18l-7 8.5V19l-4 2v-8.5z"/>',
    sort: '<path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 7 9 6 9-6"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    history: '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5M12 7.5V12l3 2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkcircle: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    tri: '<circle cx="12" cy="5" r="2.2"/><circle cx="5" cy="18" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="m10.9 7-4.8 9M13.1 7l4.8 9M7.2 18h9.6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    chatplus: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2.5 21.5z"/><path d="M8.5 12h7M12 8.5v7"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M19 10.5v1a7 7 0 0 1-14 0v-1M12 18.5v3"/>',
    play: '<path d="M7 4.6v14.8a1 1 0 0 0 1.5.9l12-7.4a1 1 0 0 0 0-1.8l-12-7.4A1 1 0 0 0 7 4.6z"/>',
    pause: '<rect x="6" y="4" width="4.2" height="16" rx="1.2"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.2"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    chevd: '<path d="m6 9 6 6 6-6"/>',
    chevl: '<path d="m15 18-6-6 6-6"/>',
    chevr: '<path d="m9 18 6-6-6-6"/>',
    chevu: '<path d="m18 15-6-6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    pluscircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    link: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    file: '<path d="M14.5 2.5H6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2.5V8h6M15.5 13h-7M15.5 17h-7"/>',
    checksq: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
    braces: '<path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.9 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.1.5 2 2 2 3.8"/><path d="M18 2H6v7a6 6 0 0 0 12 0z"/>',
    pencil: '<path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/><path d="m15 5 4 4"/>',
    undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
    redo: '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>',
    back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M9 3v18"/>',
    zin: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M11 8v6M8 11h6"/>',
    zout: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6M8 11h6"/>',
    fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    pointer: '<path d="m4.5 4.5 6.6 16 2.3-6.8 6.8-2.3z"/>',
    bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.9 5.9 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5M9 18h6M10 22h4"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    arrowup: '<path d="m5 12 7-7 7 7M12 19V5"/>',
    arrowdown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    sliders: '<path d="M20 7h-9M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    volume: '<path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    keypad: '<path d="M6 5h.01M12 5h.01M18 5h.01M6 11h.01M12 11h.01M18 11h.01M6 17h.01M12 17h.01M18 17h.01M12 22h.01" stroke-width="3"/>',
    ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.5 6.5h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M12 3a14 14 0 0 0 0 18 14 14 0 0 0 0-18M3 12h18"/>',
    pie: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  };
  function spriteHTML() {
    var s = '';
    for (var k in ICONS) s += '<symbol id="vd-i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>';
    return '<svg class="vd-sprite" id="vd-sprite" aria-hidden="true" focusable="false"><defs>' + s + '</defs></svg>';
  }

  /* ================================================== dados fictícios */
  var P = {};
  [
    ['ju', 'Juliana Alves', 'JA', 'rose', '(11) 98432-1765'],
    ['ra', 'Rafael Souza', 'RS', 'blue', '(11) 97215-3380'],
    ['ca', 'Camila Rocha', 'CR', 'violet', '(11) 99146-2087'],
    ['di', 'Diego Martins', 'DM', 'teal', '(11) 96630-4412'],
    ['be', 'Beatriz Lima', 'BL', 'amber', '(11) 98807-5531'],
    ['th', 'Thiago Moreira', 'TM', 'sky', '(11) 97754-9068'],
    ['pa', 'Paula Nogueira', 'PN', 'green', '(11) 99321-7740'],
    ['lu', 'Lucas Ribeiro', 'LR', 'orange', '(11) 96218-3305'],
    ['fe', 'Fernanda Castro', 'FC', 'indigo', '(11) 98573-1196'],
    ['gu', 'Gustavo Pires', 'GP', 'lime', '(11) 97402-6658'],
    ['al', 'Aline Duarte', 'AD', 'slate', '(11) 99688-0273'],
    ['re', 'Renata Prado', 'RP', 'violet', '(11) 98159-4427'],
    ['cm', 'Carla Mendes', 'CM', 'me', '(11) 97011-2290'],
  ].forEach(function (a) { P[a[0]] = { k: a[0], n: a[1], i: a[2], c: a[3], tel: a[4] }; });

  var CH = { wa: 'chat', ig: 'ig', site: 'globe' };
  function av(p, size, ch) {
    var badge = ch ? '<i class="vd-av__ch' + (ch !== 'wa' ? ' vd-av__ch--' + ch : '') + '">' + ic(CH[ch]) + '</i>' : '';
    return '<span class="vd-av' + (size ? ' vd-av--' + size : '') + ' vd-c-' + p.c + '">' + p.i + badge + '</span>';
  }
  function aiAv(size) { return '<span class="vd-av vd-av--' + (size || 'sm') + ' vd-c-ai">' + ic('spark') + '</span>'; }

  /* ===================================================================
     Run: relógio de UMA cena — fila de beats (tempo relativo da cena) +
     tweens. Avança só quando o Demo chama advance(t). instant = estado final.
     =================================================================== */
  function Run(demo, scene, root) {
    this.demo = demo; this.scene = scene; this.root = root;
    this.q = []; this.tw = []; this.now = 0; this.t = 0; this.seq = 0;
    this.dead = false; this.instant = !!demo.reduced; this.r = {};
  }
  Run.prototype = {
    at: function (t, fn) {
      if (this.dead) return;
      var q = this.q, i = q.length, ev = { t: t, fn: fn, s: this.seq++ };
      while (i > 0 && q[i - 1].t > t) i--;
      q.splice(i, 0, ev);
    },
    after: function (ms, fn) { this.at(this.now + ms, fn); },
    tween: function (dur, fn, opt) {
      opt = opt || {};
      var w = { t0: this.now + (opt.delay || 0), dur: Math.max(1, dur), ease: opt.ease || E.io, fn: fn, done: opt.done };
      if (this.instant) { fn(1, 1); if (w.done) w.done(); return w; }
      this.tw.push(w);
      return w;
    },
    advance: function (t) {
      var q = this.q;
      while (!this.dead && q.length && q[0].t <= t) {
        var ev = q.shift(); this.now = ev.t;
        try { ev.fn(); } catch (e) { report(e); }
      }
      if (this.dead) return;
      this.now = t; this.t = t;
      var tw = this.tw;
      for (var i = 0; i < tw.length; i++) {
        var w = tw[i];
        if (t < w.t0) continue;
        var k = Math.min(1, (t - w.t0) / w.dur);
        try { w.fn(w.ease(k), k); } catch (e) { report(e); }
        if (k >= 1) {
          tw.splice(i--, 1);
          if (w.done) { this.now = w.t0 + w.dur; try { w.done(); } catch (e2) { report(e2); } this.now = t; }
        }
      }
    },
    kill: function () { this.dead = true; this.q.length = 0; this.tw.length = 0; },
    $: function (s) { return this.root.querySelector(s); },
    $$: function (s) { return Array.prototype.slice.call(this.root.querySelectorAll(s)); },
    anim: function (el, kf, opt) {
      if (this.instant || !el || !el.animate) return null;
      var o = { duration: 400, easing: EASE.out, fill: 'backwards' };
      for (var k in opt) o[k] = opt[k];
      try { return el.animate(kf, o); } catch (e) { delete o.composite; return el.animate(kf, o); }
    },
    text: function (el, fmt, from, to, dur, opt) {
      var last = null;
      var set = function (v) { var s = fmt(v); if (s !== last) { el.textContent = s; last = s; } };
      set(from);
      opt = opt || {}; if (!opt.ease) opt.ease = E.out;
      this.tween(dur, function (k) { set(from + (to - from) * k); }, opt);
    },
    rel: function (node, base) {
      var s = this.demo.scale || 1, a = node.getBoundingClientRect(), b = (base || this.demo.win).getBoundingClientRect();
      return { x: (a.left - b.left) / s, y: (a.top - b.top) / s, w: a.width / s, h: a.height / s };
    },
    pt: function (node, fx, fy) {
      var r = this.rel(node);
      return { x: r.x + r.w * (fx == null ? .5 : fx), y: r.y + r.h * (fy == null ? .5 : fy) };
    },
    /* ---- cursor (coordenadas da janela) */
    cursorAt: function (x, y) {
      var c = this.demo.cursor; c.x = x; c.y = y;
      c.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    },
    cursorShow: function (on) {
      if (this.instant) return;
      var c = this.demo.cursor; c.on = on !== false;
      c.el.classList.toggle('is-on', c.on);
    },
    move: function (target, dur, opt) {
      if (this.instant) return null;
      opt = opt || {};
      var c = this.demo.cursor;
      var p = target.nodeType ? this.pt(target, opt.fx, opt.fy) : { x: target.x, y: target.y };
      p.x += opt.dx || 0; p.y += opt.dy || 0;
      if (!c.on) {
        var s = opt.from || { x: Math.min(1150, p.x + 170), y: Math.min(715, p.y + 150) };
        this.cursorAt(s.x, s.y); this.cursorShow(true);
      }
      var self = this, x0 = c.x, y0 = c.y, dx = p.x - x0, dy = p.y - y0, len = Math.sqrt(dx * dx + dy * dy) || 1;
      var arc = (opt.arc == null ? .12 : opt.arc) * Math.min(len, 600), nx = -dy / len, ny = dx / len;
      this.tween(dur || 700, function (k) {
        var b = Math.sin(Math.PI * k) * arc;
        self.cursorAt(x0 + dx * k + nx * b, y0 + dy * k + ny * b);
      }, { ease: opt.ease || E.io, done: opt.done });
      return p;
    },
    press: function (on) { if (!this.instant) this.demo.cursor.el.classList.toggle('is-down', on !== false); },
    click: function () {
      if (this.instant) return;
      var c = this.demo.cursor, self = this;
      this.press(true);
      this.after(150, function () { self.press(false); });
      var rp = h('<i class="vd-ripple"></i>');
      rp.style.left = c.x + 'px'; rp.style.top = c.y + 'px';
      this.demo.fx.appendChild(rp);
      var a = rp.animate([{ transform: 'scale(.3)', opacity: .95 }, { transform: 'scale(1.7)', opacity: 0 }], { duration: 560, easing: EASE.out });
      a.onfinish = function () { rp.remove(); };
    },
    /* ---- listas */
    flip: function (container, mutate, opt) {
      if (this.instant) { mutate(); return; }
      opt = opt || {};
      var kids = Array.prototype.slice.call(container.children), before = new Map();
      kids.forEach(function (k) { before.set(k, k.offsetTop); });
      mutate();
      var self = this;
      Array.prototype.forEach.call(container.children, function (k) {
        if (!before.has(k)) return;
        var d = before.get(k) - k.offsetTop;
        if (d) self.anim(k, [{ transform: 'translateY(' + d + 'px)' }, { transform: 'translateY(0)' }], { duration: opt.dur || 560, easing: opt.easing || EASE.out, composite: 'add', fill: 'none' });
      });
    },
    push: function (stack, node, opt) {
      opt = opt || {};
      var h0 = stack.offsetHeight;
      if (opt.replace && opt.replace.parentNode === stack) stack.replaceChild(node, opt.replace);
      else stack.appendChild(node);
      if (this.instant) return node;
      var d = stack.offsetHeight - h0;
      if (d) this.anim(stack, [{ transform: 'translateY(' + d + 'px)' }, { transform: 'translateY(0)' }], { duration: 480, easing: EASE.out, composite: 'add', fill: 'none' });
      this.anim(node, [{ opacity: 0, transform: opt.from || 'translateY(10px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 440, easing: EASE.out, delay: 40 });
      return node;
    },
    grow: function (watch, mutate, followers) {
      if (this.instant) { mutate(); return; }
      var h0 = watch.offsetHeight; mutate();
      var d = watch.offsetHeight - h0, self = this;
      if (d) followers.forEach(function (f) {
        self.anim(f, [{ transform: 'translateY(' + (-d) + 'px)' }, { transform: 'translateY(0)' }], { duration: 440, easing: EASE.out, composite: 'add', fill: 'none' });
      });
    },
    pop: function (el, delay) {
      this.anim(el, [{ opacity: 0, transform: 'scale(.55)' }, { opacity: 1, transform: 'scale(1.08)', offset: .62 }, { opacity: 1, transform: 'scale(1)' }], { duration: 480, easing: EASE.out, delay: delay || 0 });
    },
    fadeOut: function (el, dur) {
      if (!el) return;
      if (this.instant || !el.animate) { el.remove(); return; }
      var a = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur || 220, easing: 'ease-out', fill: 'forwards' });
      a.onfinish = function () { el.remove(); };
    },
    toast: function (html, life) {
      var t = h('<div class="vd-toast">' + html + '</div>');
      this.root.appendChild(t);
      this.anim(t, [{ opacity: 0, transform: 'translateY(-14px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: EASE.out });
      var self = this;
      this.after(life || 2600, function () {
        if (self.instant || !t.animate) { t.remove(); return; }
        var a = t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-10px) scale(.98)' }], { duration: 380, easing: EASE.io, fill: 'forwards' });
        a.onfinish = function () { t.remove(); };
      });
      return t;
    },
    confetti: function (x, y, n) {
      if (this.instant) return;
      var R = rng(20261021), cols = ['#ef4e22', '#1d6cf2', '#16a34a', '#f5b400', '#7047eb', '#ef4e22'], root = this.root;
      for (var i = 0; i < n; i++) {
        var c = h('<i class="vd-confetti"></i>');
        c.style.left = x + 'px'; c.style.top = y + 'px'; c.style.background = cols[i % cols.length];
        if (i % 3 === 0) { c.style.width = '7px'; c.style.height = '7px'; c.style.borderRadius = '50%'; }
        root.appendChild(c);
        var ang = -Math.PI / 2 + (R() - .5) * 2.4, v = 55 + R() * 75, rot = (R() - .5) * 760;
        var dx = Math.cos(ang) * v, dy = Math.sin(ang) * v;
        var a = c.animate([
          { opacity: 1, transform: 'translate(0,0) rotate(0deg) scale(.5)' },
          { opacity: 1, transform: 'translate(' + (dx * .78).toFixed(1) + 'px,' + (dy * .78).toFixed(1) + 'px) rotate(' + (rot * .45).toFixed(0) + 'deg) scale(1)', offset: .32 },
          { opacity: 0, transform: 'translate(' + dx.toFixed(1) + 'px,' + (dy + 95).toFixed(1) + 'px) rotate(' + rot.toFixed(0) + 'deg) scale(.85)' },
        ], { duration: 1150 + R() * 350, easing: 'cubic-bezier(.2,.75,.45,1)', delay: R() * 70, fill: 'backwards' });
        a.onfinish = (function (el) { return function () { el.remove(); }; })(c);
      }
    },
  };

  /* ===================================================================
     CENAS — cada uma: { id, label, nav, title, tabs, dur, captions,
     mount(run), beats: [[t, fn(run)]], cleanup?(run) }
     =================================================================== */

  /* ---------------------------------------------------- Conversas (base) */
  var TICKS = '<span class="vd-ticks"><svg viewBox="0 0 16 11"><path d="M1.2 6.1 4.3 9 10.6 1.8"/></svg><svg class="vd-t2" viewBox="0 0 16 11"><path d="M6.4 8.4 7 9 13.6 1.8"/></svg></span>';

  function ciHTML(p, time, prev, unread, ch, cls) {
    return '<div class="vd-ci' + (cls ? ' ' + cls : '') + (unread ? ' is-unread' : '') + '" data-id="' + p.k + '">' +
      '<i class="vd-cb"></i>' + av(p, '', ch) +
      '<div class="vd-ci__m"><div class="vd-ci__r"><b>' + p.n + '</b><time>' + time + '</time></div>' +
      '<div class="vd-ci__r vd-ci__r--2"><span class="vd-ci__p">' + prev + '</span>' +
      (unread ? '<span class="vd-ci__n">' + unread + '</span>' : ic('star', 'vd-ci__s')) + '</div></div></div>';
  }
  function convShell(run) {
    var root = run.root;
    root.classList.add('vd-conv');
    root.innerHTML =
      '<div class="vd-rail"><span class="is-pri">' + ic('chatplus') + '</span><span>' + ic('search') + '</span><span class="is-sel">' + ic('user') + '</span><span>' + ic('users') + '</span><span>' + ic('tri') + '</span><hr><span>' + ic('eye') + '</span></div>' +
      '<section class="vd-pane vd-inbox">' +
        '<div class="vd-inbox__hd"><b>Minha caixa de entrada</b>' + ic('filter') + ic('sort') + '</div>' +
        '<div class="vd-inbox__tabs">' +
          '<span class="vd-itab"><span class="vd-itab__ic">' + ic('mail') + '<i class="vd-itab__n">2</i></span>Não lidos</span>' +
          '<span class="vd-itab is-on"><span class="vd-itab__ic">' + ic('inbox') + '</span>Todos</span>' +
          '<span class="vd-itab"><span class="vd-itab__ic">' + ic('history') + '</span>Recente</span>' +
          '<span class="vd-itab"><span class="vd-itab__ic">' + ic('star') + '</span>Marcados</span>' +
        '</div>' +
        '<div class="vd-inbox__all"><i class="vd-cb"></i>Selecionar tudo</div>' +
        '<div class="vd-inbox__list"></div>' +
      '</section>' +
      '<section class="vd-pane vd-thread"><div class="vd-thread__hd"></div><div class="vd-thread__body"></div>' +
        '<div class="vd-composer"><div class="vd-composer__f"><span class="vd-composer__ch">' + ic('chat') + ic('chevd') + '</span>' +
        '<span class="vd-composer__ph">Digite uma mensagem</span><span class="vd-composer__b vd-composer__b--ai">' + ic('spark') + '</span>' +
        '<span class="vd-composer__b vd-composer__b--go">' + ic('send') + '</span></div></div>' +
      '</section>' +
      '<section class="vd-pane vd-details"></section>';
    var r = run.r;
    r.list = run.$('.vd-inbox__list'); r.unread = run.$('.vd-itab__n');
    r.head = run.$('.vd-thread__hd'); r.body = run.$('.vd-thread__body'); r.det = run.$('.vd-details');
    return r;
  }
  function fillList(run, rows) {
    run.r.list.innerHTML = rows.map(function (a) { return ciHTML(P[a[0]], a[1], a[2], a[3], a[4], a[5]); }).join('');
  }
  function threadHead(p, sub) {
    return '<div class="vd-th">' + av(p, 'md', 'wa') +
      '<div class="vd-th__n"><b>' + p.n + '</b><small>' + sub + '</small></div>' +
      '<span class="vd-callbtn">' + ic('phone') + 'Ligar pelo WhatsApp</span>' +
      '<span class="vd-th__ic">' + ic('phonecall') + ic('star') + ic('mail') + ic('trash') + '</span></div>';
  }
  function mDate(t) { return h('<div class="vd-date">' + t + '</div>'); }
  function mIn(p, text, time) {
    return h('<div class="vd-m vd-m--in">' + av(p, 'sm', 'wa') + '<div class="vd-m__c"><div class="vd-bub">' + text + '</div><div class="vd-m__meta"><span>' + time + '</span></div></div></div>');
  }
  function mOut(kind, text, time, opt) {
    opt = opt || {};
    var who = kind === 'ai' ? aiAv('sm') : av(P.cm, 'sm');
    return h('<div class="vd-m vd-m--out' + (kind === 'ai' ? ' vd-m--ai' : '') + '"><div class="vd-m__c"><div class="vd-bub">' + text + '</div>' +
      '<div class="vd-m__meta">' + (opt.chip || '') + '<span>' + time + '</span>' + TICKS.replace('vd-ticks', 'vd-ticks' + (opt.read ? ' is-2 is-read' : '')) + '</div></div>' + who + '</div>');
  }
  function mTyping(kind, p) {
    if (kind === 'ai') {
      return h('<div class="vd-m vd-m--out vd-m--ai vd-typing"><div class="vd-m__c"><div class="vd-bub"><i></i><i></i><i></i></div>' +
        '<div class="vd-m__meta vd-m__meta--ai">' + ic('spark') + 'Agente IA digitando…</div></div>' + aiAv('sm') + '</div>');
    }
    return h('<div class="vd-m vd-m--in vd-typing">' + av(p, 'sm', 'wa') + '<div class="vd-m__c"><div class="vd-bub"><i></i><i></i><i></i></div><div class="vd-m__meta">digitando…</div></div></div>');
  }
  function mSys(icon, html, cls) { return h('<div class="vd-sys ' + (cls || '') + '">' + ic(icon) + '<span>' + html + '</span></div>'); }

  function setThread(run, p, sub, items, swap) {
    var r = run.r, head = h(threadHead(p, sub)), stack = h('<div class="vd-stack"></div>');
    items.forEach(function (n) { stack.appendChild(n); });
    var oldH = r.head.firstElementChild, oldS = r.stack;
    r.head.appendChild(head); r.body.appendChild(stack);
    r.stack = stack; r.callBtn = head.querySelector('.vd-callbtn');
    if (swap) {
      run.fadeOut(oldH, 200); run.fadeOut(oldS, 200);
      run.anim(head, [{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 140 });
      run.anim(stack, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 460, delay: 140 });
    } else { if (oldH) oldH.remove(); if (oldS) oldS.remove(); }
  }
  function tagHTML(t) {
    return t.ai ? '<span class="vd-tag vd-tag--ai">' + ic('spark') + t.t + '</span>' : '<span class="vd-tag">' + t.t + '</span>';
  }
  function setDetails(run, p, o, swap) {
    var r = run.r;
    var node = h('<div class="vd-det">' +
      '<div class="vd-det__hd">Detalhes do contato' + ic('x') + '</div>' +
      '<div class="vd-det__card">' +
        '<div class="vd-det__who">' + av(p, 'md') + '<b>' + p.n + '</b>' + ic('link') + '</div>' +
        '<div class="vd-det__lb">Proprietário</div><span class="vd-owner">' + av(P.cm, 'xs') + 'Carla Mendes' + ic('x') + '</span>' +
        '<div class="vd-det__lb"><span>Tags (<span class="vd-tagn">' + o.tags.length + '</span>)</span>' + ic('pluscircle') + '</div>' +
        '<div class="vd-tags">' + o.tags.map(tagHTML).join('') + '</div>' +
      '</div>' +
      '<div class="vd-seg"><span class="is-on">Todos os campos</span><span>DND</span><span>Ações</span></div>' +
      '<div class="vd-fields"><div class="vd-fields__hd">Contato' + ic('chevu') + '</div>' +
        '<div class="vd-field"><small>Etapa</small><div><span class="vd-stage-v" style="--dot:' + o.dot + '">' + o.stage + '</span></div></div>' +
        '<div class="vd-field"><small>Telefone</small><div><i class="vd-flag"></i>' + p.tel + '</div></div>' +
        '<div class="vd-field"><small>Fonte de contato</small><div>' + (o.source || 'WhatsApp') + '</div></div>' +
        '<div class="vd-field"><small>Tipo de contato</small><div>Lead</div></div>' +
      '</div></div>');
    var old = r.det.firstElementChild;
    r.det.appendChild(node);
    r.tags = node.querySelector('.vd-tags'); r.tagn = node.querySelector('.vd-tagn');
    r.stageV = node.querySelector('.vd-stage-v'); r.seg = node.querySelector('.vd-seg'); r.fields = node.querySelector('.vd-fields');
    if (old) { if (swap) run.fadeOut(old, 200); else old.remove(); }
    if (swap) run.anim(node, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 140 });
  }
  function addTag(run, text) {
    var r = run.r, t = h(tagHTML({ t: text, ai: 1 }));
    run.grow(r.tags, function () { r.tags.appendChild(t); }, [r.seg, r.fields]);
    run.pop(t);
    r.tagn.textContent = r.tags.children.length;
  }
  function setStage(run, label, color) {
    var r = run.r, v = r.stageV;
    v.textContent = label; v.style.setProperty('--dot', color);
    v.classList.add('is-flash');
    var chip = h('<span class="vd-chip-ai">' + ic('spark') + 'IA</span>');
    v.parentNode.appendChild(chip);
    run.pop(chip);
    run.after(1500, function () { v.classList.remove('is-flash'); });
  }
  function setPreview(item, text, time) {
    if (!item) return;
    item.querySelector('.vd-ci__p').textContent = text;
    if (time) item.querySelector('time').textContent = time;
  }
  function aiReply(run, text, time, chip) {
    var r = run.r;
    var m = mOut('ai', text, time, { chip: chip ? '<span class="vd-chip-ai">' + ic('zap') + 'respondido em 8 s</span>' : '' });
    run.push(r.stack, m, { replace: r.typ }); r.typ = null;
    var tk = m.querySelector('.vd-ticks');
    run.after(380, function () { tk.classList.add('is-2'); });
    run.after(950, function () { tk.classList.add('is-read'); });
    setPreview(r.ju, text, time);
  }
  function inReply(run, p, text, time) {
    var r = run.r;
    run.push(r.stack, mIn(p, text, time), { replace: r.typ }); r.typ = null;
    setPreview(r.ju, text, time);
  }
  function typing(run, kind, p) { var r = run.r; r.typ = run.push(r.stack, mTyping(kind, p)); }

  var INBOX_NIGHT = [
    ['ra', '18:12', 'Perfeito, te mando amanhã cedo.', 0, 'wa', 'is-sel'],
    ['ca', '17:40', 'Pode ser no sábado de manhã?', 1, 'ig'],
    ['di', '16:05', 'Obrigado pelo retorno!', 0, 'wa'],
    ['be', '15:22', 'Vou conversar com meu marido e te aviso.', 0, 'wa'],
    ['th', '14:48', 'Qual o valor do condomínio?', 1, 'site'],
    ['pa', 'ontem', 'Combinado!', 0, 'wa'],
    ['lu', 'ontem', 'Vocês aceitam FGTS?', 0, 'ig'],
    ['fe', 'ontem', 'Obrigada pelas fotos!', 0, 'wa'],
  ];

  /* ------------------------------------------------ 1. atendimento com IA */
  var S_ATENDIMENTO = {
    id: 'atendimento', label: 'atendimento com ia', nav: 'conversas',
    title: 'Conversas', tabs: ['Conversas', 'Ações manuais', 'Trechos'], dur: 11000,
    captions: [
      [0, '21:47. Lead novo no WhatsApp e ninguém da equipe online.'],
      [2000, 'O agente de IA responde em 8 segundos, no tom da sua empresa.'],
      [5100, 'Ele qualifica com as perguntas certas e anota tudo no contato.'],
      [7700, 'Lead qualificado: a IA oferece horários e agenda a visita sozinha.'],
    ],
    mount: function (run) {
      convShell(run);
      fillList(run, INBOX_NIGHT);
      setThread(run, P.ra, 'WhatsApp · ' + P.ra.tel, [
        mDate('Hoje'),
        mIn(P.ra, 'Boa tarde, Carla! Consegui separar os documentos.', '18:02'),
        mOut('cm', 'Ótimo, Rafael! Pode me enviar por aqui mesmo.', '18:05', { read: true }),
        mIn(P.ra, 'Perfeito, te mando amanhã cedo.', '18:12'),
      ]);
      setDetails(run, P.ra, { tags: [{ t: 'whatsapp' }, { t: 'documentos' }], stage: 'Reunião realizada', dot: '#f59e0b' });
    },
    beats: [
      [250, function (run) { run.cursorShow(false); }],
      [500, function (run) { // chega o WhatsApp da Juliana
        var r = run.r, it = h(ciHTML(P.ju, '21:47', 'Oi! Vi o apartamento de 2 quartos no Instagram…', 1, 'wa', 'is-new'));
        run.flip(r.list, function () { r.list.insertBefore(it, r.list.firstChild); });
        run.anim(it, [{ opacity: 0, transform: 'translateY(-18px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 560, easing: EASE.out });
        r.ju = it;
        r.unread.textContent = '3'; run.pop(r.unread);
        run.pop(it.querySelector('.vd-ci__n'), 220);
        run.demo.ping();
      }],
      [1150, function (run) { // a IA assume a conversa
        var r = run.r, old = r.list.querySelector('.is-sel');
        if (old) old.classList.remove('is-sel');
        r.ju.classList.remove('is-new'); r.ju.classList.add('is-sel');
        setThread(run, P.ju, '<i></i><em>Agente de IA atendendo</em>', [mDate('Hoje')], true);
        setDetails(run, P.ju, { tags: [{ t: 'whatsapp' }], stage: 'Novo lead', dot: '#94a3b8' }, true);
      }],
      [1500, function (run) { run.push(run.r.stack, mIn(P.ju, 'Oi! Vi o apartamento de 2 quartos no Instagram. Ainda está disponível?', '21:47')); }],
      [2150, function (run) { typing(run, 'ai'); }],
      [3550, function (run) {
        aiReply(run, 'Oi, Juliana! Está sim 😊 Sou a assistente virtual da Horizonte. Pra te ajudar melhor: você pensa em financiar ou comprar à vista?', '21:47', true);
        var r = run.r, n = r.ju.querySelector('.vd-ci__n');
        if (n) { n.outerHTML = ic('star', 'vd-ci__s'); }
        r.ju.classList.remove('is-unread'); r.unread.textContent = '2';
      }],
      [4550, function (run) { typing(run, 'in', P.ju); }],
      [5300, function (run) { inReply(run, P.ju, 'Financiar. Tenho uns 80 mil de entrada.', '21:48'); }],
      [5850, function (run) { addTag(run, 'financiamento'); }],
      [6150, function (run) { addTag(run, 'entrada R$ 80 mil'); }],
      [6450, function (run) { addTag(run, '2 quartos'); }],
      [6850, function (run) { setStage(run, 'Qualificado', '#10b981'); }],
      [7050, function (run) { typing(run, 'ai'); }],
      [7850, function (run) { aiReply(run, 'Perfeito! Consigo uma visita na quinta, às 10h ou às 15h. Qual fica melhor?', '21:48'); }],
      [8500, function (run) { typing(run, 'in', P.ju); }],
      [9000, function (run) { inReply(run, P.ju, '15h', '21:49'); }],
      [9400, function (run) {
        run.push(run.r.stack, mSys('calcheck', '<b>Visita agendada</b> · qui, 15:00 · Juliana Alves', 'vd-sys--cal'), { from: 'translateY(8px) scale(.9)' });
        setPreview(run.r.ju, 'Visita agendada · qui, 15:00', '21:49');
      }],
      [9800, function (run) {
        run.push(run.r.stack, mSys('leads', 'Oportunidade criada em <b>Vendas</b> · Qualificado <a>Detalhes</a>', 'vd-sys--opp'), { from: 'translateY(8px) scale(.9)' });
      }],
    ],
    cleanup: function (run) { run.demo.bellDot.classList.remove('is-ping'); },
  };

  /* ------------------------------------------------------ 2. funil (Leads) */
  var COLS = [
    { k: 'novo', t: 'Novo Lead', c: '#cdd6fb', n: 37, v: 98400, cards: ['lu', 'gu', 'fe'] },
    { k: 'cont', t: 'Em Contato', c: '#c3e6f1', n: 11, v: 41200, cards: ['al', 'th'] },
    { k: 'qual', t: 'Qualificado', c: '#c4f0e2', n: 8, v: 52600, cards: ['pa', 'di'] },
    { k: 'agen', t: 'Reunião Agendada', c: '#f8e4bb', n: 5, v: 31500, cards: ['ca'] },
    { k: 'real', t: 'Reunião Realizada', c: '#f7cdbd', n: 4, v: 19600, cards: ['ra', 'be'] },
    { k: 'ganho', t: 'Ganho', c: '#cdeccb', n: 12, v: 71300, cards: ['re'] },
  ];
  var DEALS = {
    lu: ['Instagram', 'Studio', 3900, 1], gu: ['Site', 'Casa 3 quartos', 9600, 2], fe: ['WhatsApp', 'Apto 3 quartos', 7800, 2],
    al: ['WhatsApp', 'Apto 2 quartos', 5200, 3], th: ['Instagram', 'Cobertura', 12600, 2],
    pa: ['Site', 'Apto 1 quarto', 3100, 2], di: ['WhatsApp', 'Casa 2 quartos', 8400, 3], ju: ['WhatsApp', 'Apto 2 quartos', 7200, 4],
    ca: ['Instagram', 'Apto 2 quartos', 5900, 3],
    ra: ['WhatsApp', 'Apto 2 quartos', 4800, 3], be: ['Site', 'Apto 3 quartos', 6900, 2],
    re: ['Instagram', 'Studio', 3600, 2],
  };
  function cardHTML(k, cls, chip) {
    var p = P[k], d = DEALS[k];
    return '<div class="vd-card' + (cls ? ' ' + cls : '') + '" data-k="' + k + '">' +
      '<div class="vd-card__hd"><b>' + p.n + '</b><span class="vd-av vd-av--xs vd-c-own">CM</span></div>' +
      '<div class="vd-card__f"><span>Fonte:</span><span>' + d[0] + '</span></div>' +
      '<div class="vd-card__f"><span>Interesse:</span><span>' + d[1] + '</span></div>' +
      '<div class="vd-card__f"><span>Valor:</span><span><strong>' + brl(d[2]) + '</strong></span></div>' +
      '<div class="vd-card__ic"><span>' + ic('phone') + '</span><span>' + ic('chat') + '</span><span>' + ic('tag') + '<em>' + d[3] + '</em></span><span>' + ic('file') + '</span><span>' + ic('checksq') + '</span><span class="vd-card__cal">' + ic('cal') + '</span></div>' +
      (chip ? '<span class="vd-chip-ai">' + ic('spark') + chip + '</span>' : '') +
      '</div>';
  }
  function colHTML(c) {
    return '<div class="vd-col" data-c="' + c.k + '" style="--col:' + c.c + '">' +
      '<div class="vd-col__hd"><div class="vd-col__t"><b>' + c.t + '</b><span class="vd-col__n">' + c.n + '</span></div>' +
      '<div class="vd-col__v"><b>' + brl(c.v) + '</b></div></div>' +
      '<div class="vd-col__list">' + c.cards.map(function (k) { return cardHTML(k); }).join('') + '</div></div>';
  }
  function colBump(run, c) { if (!run.instant) { c.hd.classList.remove('is-bump'); void c.hd.offsetWidth; c.hd.classList.add('is-bump'); } }
  function colUpdate(run, key, dn, dv) {
    var c = run.r.cols[key];
    if (!c || (!dn && !dv)) return;
    var n0 = c.n, v0 = c.v; c.n += dn; c.v += dv;
    run.tween(600, function (k) { c.nEl.textContent = String(Math.round(n0 + (c.n - n0) * k)); }, { ease: E.out });
    run.tween(900, function (k) { c.vEl.textContent = brl(v0 + (c.v - v0) * k); }, { ease: E.out });
    colBump(run, c);
  }
  function colKey(node) { var c = node && node.closest && node.closest('.vd-col'); return c ? c.getAttribute('data-c') : null; }
  function flipCards(run, lists, mutate, dur) { // FLIP dos cards vizinhos entre colunas (só transform)
    var scene = run.root, sibs = [], before = new Map();
    lists.forEach(function (l) { Array.prototype.forEach.call(l.children, function (c) { sibs.push(c); }); });
    if (!run.instant) sibs.forEach(function (c) { before.set(c, run.rel(c, scene).y); });
    mutate();
    if (run.instant) return;
    sibs.forEach(function (c) {
      if (!c.parentNode || !before.has(c)) return;
      var d = before.get(c) - run.rel(c, scene).y;
      if (Math.abs(d) > .5) run.anim(c, [{ transform: 'translateY(' + d + 'px)' }, { transform: 'translateY(0)' }], { duration: dur || 520, easing: EASE.io, composite: 'add', fill: 'none' });
    });
  }
  /* com a demo pausada (ou em movimento reduzido), o visitante arrasta cards entre colunas */
  function enableDrag(run) {
    var demo = run.demo, root = run.root, r = run.r;
    root.addEventListener('pointerdown', function (e) {
      if (demo.running || run.dead || e.button > 0) return;
      var card = e.target.closest && e.target.closest('.vd-card');
      if (!card || !card.parentNode || !card.parentNode.classList.contains('vd-col__list')) return;
      e.preventDefault();
      demo.interact();
      var s = demo.scale || 1, from = card.closest('.vd-col'), r0 = run.rel(card, root), sr = root.getBoundingClientRect();
      var gx = (e.clientX - sr.left) / s - r0.x, gy = (e.clientY - sr.top) / s - r0.y;
      var ph = h('<div class="vd-ph is-drop"></div>'); ph.style.height = r0.h + 'px';
      var fly = h('<div class="vd-fly"></div>'); fly.style.width = r0.w + 'px';
      card.parentNode.replaceChild(ph, card); fly.appendChild(card); r.drag.appendChild(fly);
      card.classList.add('is-lift');
      var cols = run.$$('.vd-col'), over = null, last = { x: r0.x, y: r0.y };
      var pos = function (x, y) { last.x = x; last.y = y; fly.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; };
      pos(r0.x, r0.y);
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      var move = function (ev) {
        var px = (ev.clientX - sr.left) / s, py = (ev.clientY - sr.top) / s, hit = null;
        pos(px - gx, py - gy);
        cols.forEach(function (c) { var rc = run.rel(c, root); if (px >= rc.x - 4 && px <= rc.x + rc.w + 4) hit = c; });
        if (hit !== over) { if (over) over.classList.remove('is-over'); over = hit; if (over) over.classList.add('is-over'); }
      };
      var up = function () {
        root.removeEventListener('pointermove', move); root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', up);
        if (over) over.classList.remove('is-over');
        var target = over || from, list = target.querySelector('.vd-col__list'), fk = from.getAttribute('data-c'), tk = target.getAttribute('data-c');
        card.classList.remove('is-lift');
        flipCards(run, [from.querySelector('.vd-col__list'), list], function () { ph.remove(); fly.remove(); list.insertBefore(card, list.firstChild); }, 420);
        var to = run.rel(card, root);
        run.anim(card, [{ transform: 'translate(' + (last.x - to.x).toFixed(1) + 'px,' + (last.y - to.y).toFixed(1) + 'px)' }, { transform: 'none' }], { duration: 380, easing: EASE.out });
        if (fk !== tk) {
          var v = DEALS[card.getAttribute('data-k')][2], cf = r.cols[fk], ct = r.cols[tk];
          cf.n -= 1; cf.v -= v; ct.n += 1; ct.v += v;
          [cf, ct].forEach(function (c) { c.nEl.textContent = String(c.n); c.vEl.textContent = brl(c.v); colBump(run, c); });
          card.classList.toggle('is-won', tk === 'ganho');
        }
      };
      root.addEventListener('pointermove', move); root.addEventListener('pointerup', up); root.addEventListener('pointercancel', up);
    });
  }
  /* arrasta um card até o topo de outra coluna (FLIP nos vizinhos, voo em camada própria) */
  function moveCard(run, card, toList, opt) {
    opt = opt || {};
    var from = card.parentNode, fk = colKey(from);
    if (run.instant) { card.classList.remove('is-lift'); toList.insertBefore(card, toList.firstChild); if (opt.drop) opt.drop(fk); return; }
    var scene = run.root, layer = run.r.drag;
    var r0 = run.rel(card, scene);
    var sibs = Array.prototype.slice.call(from.children).concat(Array.prototype.slice.call(toList.children)).filter(function (x) { return x !== card; });
    var before = new Map();
    sibs.forEach(function (s) { before.set(s, run.rel(s, scene).y); });
    var ph = h('<div class="vd-ph is-drop"></div>'); ph.style.height = r0.h + 'px';
    var fly = h('<div class="vd-fly"></div>'); fly.style.width = r0.w + 'px';
    layer.appendChild(fly); fly.appendChild(card);
    toList.insertBefore(ph, toList.firstChild);
    sibs.forEach(function (s) {
      var d = before.get(s) - run.rel(s, scene).y;
      if (Math.abs(d) > .5) run.anim(s, [{ transform: 'translateY(' + d + 'px)' }, { transform: 'translateY(0)' }], { duration: opt.dur ? opt.dur * .8 : 700, easing: EASE.io, composite: 'add', fill: 'none' });
    });
    var r1 = run.rel(ph, scene), off = run.rel(scene);
    var x0 = r0.x, y0 = r0.y, x1 = r1.x, y1 = r1.y;
    var pos = function (x, y) { fly.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)'; };
    pos(x0, y0);
    card.classList.add('is-lift');
    run.tween(opt.dur || 1100, function (k) {
      var x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k - Math.sin(Math.PI * k) * (opt.arc || 26);
      pos(x, y);
      if (opt.grab) run.cursorAt(off.x + x + opt.grab.x, off.y + y + opt.grab.y);
    }, {
      ease: E.io,
      done: function () {
        card.classList.remove('is-lift');
        if (ph.parentNode) ph.parentNode.replaceChild(card, ph); else toList.insertBefore(card, toList.firstChild);
        fly.remove();
        if (opt.drop) opt.drop(fk);
      },
    });
  }
  var S_FUNIL = {
    id: 'funil', label: 'funil de vendas', nav: 'leads',
    pausedHint: 'Pausado: arraste um card para outra coluna e veja os totais mudarem.',
    title: 'Leads', tabs: ['Leads', 'Previsão', 'Pipelines', 'Ações em massa'], dur: 10000,
    captions: [
      [0, 'Ninguém digitou nada: o card nasce no funil e anda sozinho.'],
      [2600, 'Visita marcada? O card vai para Reunião agendada.'],
      [5300, 'Venda ganha entra no funil e no painel na mesma hora.'],
    ],
    mount: function (run) {
      var root = run.root;
      root.classList.add('vd-leads');
      root.innerHTML =
        '<div class="vd-lh"><span class="vd-sel">Vendas' + ic('chevd') + '</span><span class="vd-count-pill">184 leads</span><span class="vd-sp"></span>' +
          '<span class="vd-vt"><span class="is-on">' + ic('grid') + '</span><span>' + ic('list') + '</span></span>' +
          '<span class="vd-btn vd-btn--pri">' + ic('plus') + 'Adicionar oportunidade</span></div>' +
        '<div class="vd-subtabs"><span class="is-on">' + ic('list') + 'Oportunidades abertas</span><span>' + ic('plus') + 'Lista</span></div>' +
        '<div class="vd-lf"><span class="vd-pillb">' + ic('funnel') + 'Filtros avançados</span><span class="vd-pillb vd-pillb--b">' + ic('updown') + 'Classificar (1)</span><span class="vd-sp"></span>' +
          '<span class="vd-searchf">' + ic('search') + 'Pesquisar leads</span><span class="vd-link">' + ic('gear') + 'Gerenciar campos</span></div>' +
        '<div class="vd-kb">' + COLS.map(colHTML).join('') + '</div>' +
        '<div class="vd-drag"></div>';
      var r = run.r;
      r.drag = run.$('.vd-drag'); r.cols = {}; r.lists = {};
      COLS.forEach(function (c) {
        var col = run.$('[data-c="' + c.k + '"]');
        r.cols[c.k] = { n: c.n, v: c.v, hd: col.querySelector('.vd-col__hd'), nEl: col.querySelector('.vd-col__n'), vEl: col.querySelector('.vd-col__v b') };
        r.lists[c.k] = col.querySelector('.vd-col__list');
      });
      enableDrag(run);
    },
    beats: [
      [300, function (run) { run.cursorShow(false); }],
      [700, function (run) { // o card nasce em Qualificado
        var r = run.r, c = h(cardHTML('ju', 'is-ai', 'criado pela IA'));
        run.flip(r.lists.qual, function () { r.lists.qual.insertBefore(c, r.lists.qual.firstChild); }, { dur: 600 });
        run.anim(c, [{ opacity: 0, transform: 'translateY(-14px) scale(.92)' }, { opacity: 1, transform: 'none' }], { duration: 620, easing: EASE.out });
        run.pop(c.querySelector('.vd-chip-ai'), 260);
        r.ju = c;
        colUpdate(run, 'qual', 1, 7200);
      }],
      [2850, function (run) { // a IA move o card para Reunião Agendada
        var r = run.r, chip = r.ju.querySelector('.vd-chip-ai');
        chip.innerHTML = ic('spark') + 'IA movendo';
        moveCard(run, r.ju, r.lists.agen, {
          dur: 1150,
          drop: function (fk) {
            if (fk !== 'agen') { colUpdate(run, fk, -1, -7200); colUpdate(run, 'agen', 1, 7200); }
            chip.innerHTML = ic('calcheck') + 'visita qui, 15:00';
            var cal = r.ju.querySelector('.vd-card__cal');
            cal.classList.add('is-hot'); cal.insertAdjacentHTML('beforeend', '<em>1</em>');
            run.pop(cal.querySelector('em'));
            run.after(1300, function () { r.ju.classList.remove('is-ai'); });
          },
        });
      }],
      [4900, function (run) { // Carla pega o card do Rafael
        var r = run.r;
        r.ra = run.$('[data-k="ra"]');
        run.move(r.ra, 900, { fx: .42, fy: .3, from: { x: 1120, y: 690 }, arc: .16 });
      }],
      [5900, function (run) { run.press(true); run.r.ra.classList.add('is-lift'); }],
      [6050, function (run) {
        var r = run.r, cr = run.rel(r.ra, run.root), c = run.demo.cursor, off = run.rel(run.root);
        moveCard(run, r.ra, r.lists.ganho, {
          dur: 1200, arc: 34,
          grab: { x: c.x - off.x - cr.x, y: c.y - off.y - cr.y },
          drop: function (fk) {
            run.press(false);
            r.ra.classList.add('is-won');
            if (fk !== 'ganho') { colUpdate(run, fk, -1, -4800); colUpdate(run, 'ganho', 1, 4800); }
            var p = run.rel(r.ra, run.root);
            run.confetti(p.x + p.w / 2, p.y + 18, 22);
            run.toast('<span class="vd-toast__ic">' + ic('trophy') + '</span><div><b>Venda ganha</b><small>Rafael Souza · Apto 2 quartos</small></div><span class="vd-toast__amt">R$ 4.800</span>', 2700);
          },
        });
      }],
      [7650, function (run) { run.move({ x: 1060, y: 560 }, 800, { arc: .2 }); }],
    ],
  };

  /* --------------------------------------------- 3. agenda e lembretes */
  var DAYS = ['seg., 19', 'ter., 20', 'qua., 21', 'qui., 22', 'sex., 23', 'sáb., 24', 'dom., 25'];
  var HOUR0 = 9, ROWS = 9, ROW_H = 58;
  var EVENTS = [
    [0, 10, 1, 'Rafael Souza', 'Assinatura', 'g'],
    [0, 14, 1, 'Aline Duarte', 'Visita · Vila Mariana', ''],
    [1, 14, 1, 'Camila Rocha', 'Visita · Tatuapé', ''],
    [1, 11, 1, 'Lucas Ribeiro', 'Ligação', 'b'],
    [2, 11, 1, 'Paula Nogueira', 'Ligação', 'b'],
    [3, 10, 1, 'Diego Martins', 'Visita · Butantã', ''],
    [3, 16, 1, 'Gustavo Pires', 'Visita · Granja Viana', ''],
    [4, 16, 1, 'Beatriz Lima', 'Visita · Ipiranga', ''],
    [5, 10, 1.5, 'Renata Prado', 'Visita · Bela Vista', ''],
  ];
  function hh(x) { var hr = Math.floor(x), m = Math.round((x - hr) * 60); return (hr < 10 ? '0' : '') + hr + ':' + (m < 10 ? '0' : '') + m; }
  function evPos(d, hr, dur) {
    return 'left:calc(50px + (100% - 50px) * ' + d + ' / 7 + 3px);width:calc((100% - 50px) / 7 - 6px);top:' + ((hr - HOUR0) * ROW_H + 2) + 'px;height:' + (dur * ROW_H - 4) + 'px';
  }
  function remItem(title, when, cls) {
    return '<li class="vd-tl__it ' + (cls || '') + '"><span class="vd-tl__dot"><svg class="vd-tl__ck" viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7"/></svg><svg class="vd-tl__ck2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 1.5"/></svg></span>' +
      '<span class="vd-tl__ln"><i></i></span><div class="vd-tl__tx"><b>' + title + '</b><small>' + when + ' · <span class="vd-tl__st">na fila</span></small></div></li>';
  }
  function remStep(run, i, state, label) {
    var it = run.r.steps[i];
    it.classList.remove('is-done', 'is-sched'); it.classList.add(state);
    it.querySelector('.vd-tl__st').textContent = label;
    if (state === 'is-done' && i < run.r.steps.length - 1) run.after(250, function () { it.classList.add('is-flow'); });
    run.pop(it.querySelector('.vd-tl__dot'));
  }
  var S_AGENDA = {
    id: 'agenda', label: 'agenda e lembretes', nav: 'calendarios',
    title: 'Calendários', tabs: ['Visualização de calendário', 'Lista de compromissos', 'Configurações'], dur: 10000,
    captions: [
      [0, 'A visita cai na agenda do corretor certo.'],
      [2600, 'Lembretes automáticos no WhatsApp: na hora, 24 h antes e 1 h antes.'],
      [6900, 'Juliana confirmou. Menos cadeira vazia.'],
    ],
    mount: function (run) {
      var root = run.root, rows = '', cols = '', evs = '';
      root.classList.add('vd-cal');
      for (var i = 0; i < ROWS; i++) {
        rows += '<i class="vd-grid__row" style="top:' + (i * ROW_H) + 'px"></i><span class="vd-grid__h" style="top:' + (i * ROW_H + 9) + 'px">' + (HOUR0 + i < 10 ? '0' : '') + (HOUR0 + i) + '</span>';
      }
      rows += '<i class="vd-grid__row" style="top:' + (ROWS * ROW_H) + 'px"></i>';
      for (var d = 0; d < 7; d++) cols += '<i class="vd-grid__col" data-d="' + d + '" style="left:calc(50px + (100% - 50px) * ' + d + ' / 7);width:calc((100% - 50px) / 7)"></i>';
      EVENTS.forEach(function (e) {
        evs += '<div class="vd-ev' + (e[5] ? ' vd-ev--' + e[5] : '') + '" style="' + evPos(e[0], e[1], e[2]) + '"><b>' + e[3] + '</b><span>' + e[4] + '</span><span>' + hh(e[1]) + ' – ' + hh(e[1] + e[2]) + '</span></div>';
      });
      root.innerHTML =
        '<div class="vd-calbar"><span class="vd-btn vd-btn--ghost">Hoje</span>' +
          '<span class="vd-dnav">' + ic('chevl') + '19 – 25 de out. de 2026' + ic('chevr') + '</span>' +
          '<span class="vd-sel">Semana' + ic('chevd') + '</span>' + ic('bulb', 'vd-bulb') + '<span class="vd-sp"></span>' +
          '<span class="vd-btn vd-btn--line">' + ic('funnel') + 'Gerenciar visualização</span><span class="vd-btn vd-btn--pri">' + ic('plus') + 'Novo</span></div>' +
        '<div class="vd-calwrap">' +
          '<div class="vd-grid"><div class="vd-grid__hd"><span>GMT<br>-03:00</span>' + DAYS.map(function (d, i) { return '<span' + (i === 1 ? ' class="is-today"' : '') + '>' + d + '</span>'; }).join('') + '</div>' +
            '<div class="vd-grid__bd">' + cols + rows + evs +
              '<i class="vd-ev__ring" style="' + evPos(3, 15, 1) + '"></i>' +
              '<div class="vd-ev vd-ev--j" style="' + evPos(3, 15, 1) + '"><b>Juliana Alves</b><span>Visita · Saúde</span><span>15:00 – 16:00</span></div>' +
            '</div></div>' +
          '<aside class="vd-side-p">' +
            '<div class="vd-sp-v vd-gv-v"><div class="vd-sp__hd">Gerenciar visualização' + ic('x') + '</div>' +
              '<div class="vd-gv"><p>Visualize por tipo</p><div class="vd-radio"><i class="is-on"></i>Todos</div><div class="vd-radio"><i></i>Agendamentos</div><div class="vd-radio"><i></i>Intervalos bloqueados</div></div>' +
              '<div class="vd-gv__sec">Filtros<a>' + ic('x') + 'Limpar tudo</a></div>' +
              '<span class="vd-searchf" style="width:100%">' + ic('search') + 'Pesquise usuários ou calendários</span>' +
              '<div class="vd-gv__sec">Usuários</div><div class="vd-check"><i class="vd-cb is-on"></i>Carla Mendes</div>' +
              '<div class="vd-gv__sec">Calendários</div><div class="vd-check"><i class="vd-cb is-on"></i>Visitas · Vendas</div><div class="vd-check"><i class="vd-cb is-on"></i>Visitas · Locação</div><div class="vd-check"><i class="vd-cb"></i>Assinaturas</div>' +
            '</div>' +
            '<div class="vd-sp-v vd-rem-v" style="visibility:hidden"><div class="vd-sp__hd">Lembretes' + ic('x') + '</div>' +
              '<div class="vd-appt"><span class="vd-appt__ic">' + ic('cal') + '</span><div><b>Juliana Alves · Visita</b><small>qui., 22 de out. · 15:00 – 16:00</small>' +
                '<div class="vd-appt__who">' + av(P.cm, 'xs') + 'Carla Mendes · corretora</div></div></div>' +
              '<div class="vd-rem__lb">Sequência automática<span><i></i>WhatsApp</span></div>' +
              '<ol class="vd-tl">' + remItem('Confirmação enviada', 'na hora') + remItem('Lembrete 24 h antes', '24 h antes') + remItem('Lembrete 1 h antes', '1 h antes') + '</ol>' +
              '<div class="vd-reply-slot"></div>' +
            '</div>' +
          '</aside>' +
        '</div>';
      var r = run.r;
      r.ev = run.$('.vd-ev--j'); r.ring = run.$('.vd-ev__ring'); r.col = run.$('.vd-grid__col[data-d="3"]');
      r.gv = run.$('.vd-gv-v'); r.rem = run.$('.vd-rem-v'); r.steps = run.$$('.vd-tl__it'); r.slot = run.$('.vd-reply-slot');
      r.ev.style.visibility = 'hidden';
    },
    beats: [
      [450, function (run) { run.r.col.classList.add('is-hl'); }],
      [650, function (run) { // a visita aparece na agenda
        var r = run.r;
        r.ev.style.visibility = '';
        run.anim(r.ev, [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 1, transform: 'scaleY(1.04)', offset: .7 }, { opacity: 1, transform: 'none' }], { duration: 620, easing: EASE.out });
        run.anim(r.ring, [{ opacity: .9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.18)' }], { duration: 1100, delay: 520, easing: EASE.out });
        var chip = h('<span class="vd-chip-ai vd-ev__ai">' + ic('spark') + 'IA</span>');
        r.ev.appendChild(chip); run.pop(chip, 420);
      }],
      [1300, function (run) { run.move(run.r.ev, 850, { fx: .55, fy: .55, arc: .1 }); }],
      [2200, function (run) {
        var r = run.r;
        run.click();
        r.rem.style.visibility = '';
        run.fadeOut(r.gv, 200);
        run.anim(r.rem, [{ opacity: 0, transform: 'translateX(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, delay: 80 });
      }],
      [2750, function (run) { run.move({ x: 700, y: 660 }, 700, { arc: .2 }); }],
      [3000, function (run) { remStep(run, 0, 'is-done', 'enviada'); }],
      [3500, function (run) { run.cursorShow(false); }],
      [4100, function (run) { remStep(run, 1, 'is-done', 'enviado'); }],
      [5200, function (run) { remStep(run, 2, 'is-sched', 'agendado p/ qui, 14:00'); }],
      [6150, function (run) {
        var r = run.r, node = h('<div class="vd-reply"><div class="vd-reply__who">' + av(P.ju, 'xs') + '<b>Juliana Alves</b>respondeu no WhatsApp</div>' +
          '<div class="vd-reply__b">Confirmado, estarei lá! 👍<time>agora</time></div></div>');
        r.slot.appendChild(node);
        run.anim(node, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 520 });
      }],
      [7050, function (run) {
        var r = run.r, seal = h('<span class="vd-seal">' + ic('checkcircle') + 'Presença confirmada</span>');
        r.slot.appendChild(seal); run.pop(seal);
        var ok = h('<span class="vd-ev__ok">' + ic('check') + '</span>');
        r.ev.appendChild(ok); run.pop(ok, 200);
        var ai = r.ev.querySelector('.vd-ev__ai'); if (ai) run.fadeOut(ai, 200);
      }],
    ],
  };

  /* ---------------------------------------------------- 4. ligação gravada */
  var INBOX_DAY = [
    ['ju', '09:14', 'Pode sim! 😊', 0, 'wa', 'is-sel'],
    ['ra', '08:55', 'Bom dia! Enviei os documentos.', 1, 'wa'],
    ['ca', 'ontem', 'Pode ser no sábado de manhã?', 0, 'ig'],
    ['di', 'ontem', 'Obrigado pelo retorno!', 0, 'wa'],
    ['be', 'ontem', 'Vou conversar com meu marido e te aviso.', 0, 'wa'],
    ['th', 'ontem', 'Qual o valor do condomínio?', 0, 'site'],
    ['pa', 'seg.', 'Combinado!', 0, 'wa'],
    ['lu', 'seg.', 'Vocês aceitam FGTS?', 0, 'ig'],
  ];
  function waveBars(n, seed, maxH) {
    var R = rng(seed), s = '', prev = .5;
    for (var i = 0; i < n; i++) {
      var env = .35 + .65 * Math.sin(Math.PI * (i + .5) / n);
      var v = clamp(prev * .35 + R() * .65, .12, 1); prev = v;
      s += '<i style="height:' + Math.max(3, Math.round(maxH * v * env)) + 'px"></i>';
    }
    return s;
  }
  function eqBars(n) {
    var R = rng(4532), s = '';
    for (var i = 0; i < n; i++) {
      var env = .4 + .6 * Math.sin(Math.PI * (i + .5) / n);
      s += '<i style="--d:' + (.45 + R() * .5).toFixed(2) + 's;--dl:-' + (R() * .9).toFixed(2) + 's;--lo:' + (.1 + R() * .15).toFixed(2) + ';--hi:' + (.35 + env * .65 * (.6 + R() * .4)).toFixed(2) + '"></i>';
    }
    return s;
  }
  var S_LIGACAO = {
    id: 'ligacao', label: 'ligação gravada', nav: 'conversas',
    title: 'Conversas', tabs: ['Conversas', 'Ações manuais', 'Trechos'], dur: 11000,
    captions: [
      [0, 'Ligue pelo WhatsApp sem sair do CRM.'],
      [3000, 'A chamada fica gravada dentro da conversa.'],
      [7300, 'Ouça depois, compartilhe com o time, use no treinamento.'],
    ],
    mount: function (run) {
      convShell(run);
      fillList(run, INBOX_DAY);
      run.r.unread.textContent = '1';
      run.r.ju = run.$('.vd-ci[data-id="ju"]');
      setThread(run, P.ju, 'WhatsApp · ' + P.ju.tel, [
        mOut('ai', 'Perfeito! Consigo uma visita na quinta, às 10h ou às 15h. Qual fica melhor?', '21:48', { read: true }),
        mIn(P.ju, '15h', '21:49'),
        mSys('calcheck', '<b>Visita agendada</b> · qui, 15:00 · Juliana Alves', 'vd-sys--cal'),
        mDate('Hoje'),
        mOut('cm', 'Bom dia, Juliana! Aqui é a Carla, corretora da Horizonte. Posso te ligar rapidinho pra alinhar a visita?', '09:12', { read: true }),
        mIn(P.ju, 'Pode sim! 😊', '09:14'),
      ]);
      setDetails(run, P.ju, {
        tags: [{ t: 'whatsapp' }, { t: 'financiamento', ai: 1 }, { t: 'entrada R$ 80 mil', ai: 1 }, { t: '2 quartos', ai: 1 }],
        stage: 'Reunião agendada', dot: '#f59e0b',
      });
    },
    beats: [
      [350, function (run) { run.move(run.r.callBtn, 900, { fx: .5, fy: .55, arc: .14 }); }],
      [1150, function (run) { run.r.callBtn.classList.add('is-hover'); }],
      [1350, function (run) {
        var r = run.r;
        run.click(); r.callBtn.classList.add('is-press');
        run.after(180, function () { r.callBtn.classList.remove('is-press'); });
      }],
      [1550, function (run) { // overlay da chamada
        var r = run.r;
        r.callBtn.classList.remove('is-hover');
        var wrap = h('<div class="vd-callwrap"><div class="vd-callwrap__bg"></div><div class="vd-call is-ringing">' +
          '<div class="vd-call__top"><i>' + ic('phone') + '</i>Chamada de voz · WhatsApp</div>' +
          '<div class="vd-call__av"><span class="vd-call__ring"></span><span class="vd-call__ring"></span>' + av(P.ju, 'xl') + '</div>' +
          '<div class="vd-call__n">Juliana Alves</div><div class="vd-call__p">' + P.ju.tel + '</div>' +
          '<div class="vd-call__st"><div class="vd-call__wait"><span class="vd-call__calling">Chamando<i></i><i></i><i></i></span></div>' +
            '<div class="vd-call__live"><small><i></i>Em ligação</small><span class="vd-call__tm">00:00</span></div></div>' +
          '<span class="vd-rec"><i></i>Gravando chamada</span>' +
          '<div class="vd-wave">' + eqBars(30) + '</div>' +
          '<div class="vd-call__ctl"><span>' + ic('mic') + '</span><span>' + ic('keypad') + '</span><span>' + ic('volume') + '</span><span class="vd-hang">' + ic('phone') + '</span></div>' +
          '</div></div>');
        run.root.appendChild(wrap);
        r.callWrap = wrap; r.call = wrap.querySelector('.vd-call');
        run.anim(wrap.firstChild, [{ opacity: 0 }, { opacity: 1 }], { duration: 380, easing: 'ease-out' });
        run.anim(r.call, [{ opacity: 0, transform: 'translateY(18px) scale(.94)' }, { opacity: 1, transform: 'none' }], { duration: 560, easing: EASE.out });
        run.move({ x: 1010, y: 640 }, 900, { arc: .18 });
      }],
      [3000, function (run) { // atendeu: cronômetro acelerado até 04:32
        var r = run.r, call = r.call, tm = call.querySelector('.vd-call__tm');
        call.classList.remove('is-ringing'); call.classList.add('is-live');
        run.text(tm, mmss, 0, 272, 3300, { ease: E.io2 });
      }],
      [6450, function (run) { run.move(run.r.call.querySelector('.vd-hang'), 650, { arc: .12 }); }],
      [7150, function (run) { // desliga
        var r = run.r, hang = r.call.querySelector('.vd-hang');
        run.click(); hang.classList.add('is-press');
        r.call.classList.remove('is-live');
        var wrap = r.callWrap;
        if (run.instant || !wrap.animate) { wrap.remove(); return; }
        wrap.firstChild.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 360, delay: 120, fill: 'forwards' });
        var a = r.call.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(10px) scale(.94)' }], { duration: 360, delay: 120, easing: EASE.io, fill: 'forwards' });
        a.onfinish = function () { wrap.remove(); };
      }],
      [7550, function (run) { // o cartão da ligação entra na conversa
        var r = run.r;
        var m = h('<div class="vd-m vd-m--out"><div class="vd-m__c"><div class="vd-callcard">' +
          '<div class="vd-callcard__hd"><span class="vd-callcard__ic">' + ic('phonecall') + '</span><div><b>Ligação de WhatsApp</b><small><i></i>04:32 · gravada</small></div></div>' +
          '<div class="vd-player"><span class="vd-player__pb">' + ic('play', 'vd-i--f vd-pl') + ic('pause', 'vd-i--f vd-pp') + '</span>' +
            '<div class="vd-pwave"><div class="vd-pwave__l">' + waveBars(34, 77, 22) + '</div><div class="vd-pwave__l vd-pwave__l--on">' + waveBars(34, 77, 22) + '</div><i class="vd-pwave__k"></i></div>' +
            '<span class="vd-player__t">04:32</span><span class="vd-speed">1x</span>' + ic('download', 'vd-dl') + '</div>' +
          '</div><div class="vd-m__meta"><span>Carla Mendes · 09:20</span></div></div>' + av(P.cm, 'sm') + '</div>');
        run.push(r.stack, m, { from: 'translateY(14px) scale(.94)' });
        r.player = m;
        setPreview(r.ju, 'Ligação de WhatsApp · 04:32', '09:20');
      }],
      [8150, function (run) { run.move(run.r.player.querySelector('.vd-player__pb'), 750, { arc: .14 }); }],
      [8950, function (run) { // play: a onda vai sendo preenchida
        var r = run.r, m = r.player, pb = m.querySelector('.vd-player__pb'), on = m.querySelector('.vd-pwave__l--on'),
          knob = m.querySelector('.vd-pwave__k'), t = m.querySelector('.vd-player__t'), wv = m.querySelector('.vd-pwave');
        run.click(); pb.classList.add('is-press');
        run.after(160, function () { pb.classList.remove('is-press'); });
        if (run.instant) return;
        pb.classList.add('is-play');
        var w = wv.offsetWidth, last = '';
        run.tween(1700, function (k) {
          var p = k * .34;
          on.style.clipPath = 'inset(0 ' + ((1 - p) * 100).toFixed(2) + '% 0 0)';
          knob.style.transform = 'translateX(' + (p * w).toFixed(1) + 'px)';
          var s = mmss(p * 272); if (s !== last) { t.textContent = s; last = s; }
        }, { ease: E.lin });
      }],
    ],
  };

  /* ------------------------------------------------------- 5. automações */
  var NODES = {
    n1: { x: 70, y: 261, c: 'wa', i: 'chat', lb: 'Mensagem recebida', sub: '(WhatsApp)' },
    n2: { x: 190, y: 261, c: 'ai', i: 'spark', lb: 'Agente de IA responde' },
    n3: { x: 310, y: 261, c: 'if', i: 'braces', lb: 'Qualificado?', sub: '(Condição)' },
    b1: { x: 400, y: 141, branch: 'SIM', text: 'Se a etapa for “Qualificado”' },
    b2: { x: 400, y: 381, branch: 'NÃO', text: 'Quando nenhuma condição é atendida' },
    y1: { x: 622, y: 141, c: 'cal', i: 'calcheck', lb: 'Agendar visita' },
    y2: { x: 747, y: 141, c: 'bell', i: 'bellring', lb: 'Lembretes 24 h e 1 h' },
    y3: { x: 872, y: 141, c: 'move', i: 'kanban', lb: 'Mover card: Reunião agendada' },
    f1: { x: 622, y: 381, c: 'fu', i: 'send', lb: 'Follow-up dia 1', day: 'dia 1' },
    f2: { x: 747, y: 381, c: 'fu', i: 'send', lb: 'Follow-up dia 3', day: 'dia 3' },
    f3: { x: 872, y: 381, c: 'fu', i: 'send', lb: 'Follow-up dia 7', day: 'dia 7' },
  };
  var WIRES = {
    w1: [97, 261, 'H163'], w2: [217, 261, 'H283'],
    w3: [337, 261, 'C372 261 365 141 400 141'], w4: [337, 261, 'C372 261 365 381 400 381'],
    w5: [548, 141, 'H595'], w6: [649, 141, 'H720'], w7: [774, 141, 'H845'],
    w8: [548, 381, 'H595'], w9: [649, 381, 'H720'], w10: [774, 381, 'H845'],
  };
  var RUN1 = [['n1', 450], ['w1', 650, 520], ['n2', 1170], ['w2', 1420, 520], ['n3', 1940], ['w3', 2180, 640], ['b1', 2820], ['w5', 3040, 440], ['y1', 3480], ['w6', 3680, 460], ['y2', 4140], ['w7', 4330, 460], ['y3', 4790]];
  var RUN2 = [['n1', 5550], ['w1', 5680, 380], ['n2', 6060], ['w2', 6190, 380], ['n3', 6570], ['w4', 6700, 480], ['b2', 7180], ['w8', 7300, 360], ['f1', 7660], ['w9', 7780, 380], ['f2', 8160], ['w10', 8280, 380], ['f3', 8660]];
  function wireEnd(w) { var m = w[2].match(/(-?\d+(?:\.\d+)?)/g), c = w[2][0]; return c === 'H' ? [+m[0], w[1]] : [+m[m.length - 2], +m[m.length - 1]]; }
  var WIRE_TO = { w1: 'n2', w2: 'n3', w3: 'b1', w4: 'b2', w5: 'y1', w6: 'y2', w7: 'y3', w8: 'f1', w9: 'f2', w10: 'f3' };
  function runnerTo(r, k, dur) { // a etiqueta do contato desliza junto com o ponto até o próximo nó
    var spec = NODES[k], top = spec.branch ? spec.y - 31 : spec.y - 27, cx = spec.branch ? spec.x + 74 : spec.x;
    r.runner.style.transitionDuration = '.3s, ' + (dur || 0) + 'ms';
    r.runner.style.transform = 'translate3d(' + (cx - r.runnerW / 2).toFixed(1) + 'px,' + (top - 4) + 'px,0)';
  }
  function nodeOn(run, k, who) {
    var r = run.r, n = r.nodes[k], g = r.gen;
    n.classList.add('is-on');
    run.after(650, function () { if (r.gen !== g) return; n.classList.remove('is-on'); n.classList.add('is-done'); });
    if (who) {
      r.runner.innerHTML = av(who, 'xs') + who.n; r.runnerW = r.runner.offsetWidth;
      runnerTo(r, k, 0);
      r.runner.classList.add('is-on');
    }
    r.pulse.classList.remove('is-on');
  }
  function hop(run, k, dur, ai) {
    var r = run.r, w = r.wires[k];
    r.pulse.classList.toggle('is-ai', !!ai);
    r.pulse.classList.add('is-on');
    w.lit.style.opacity = '1';
    runnerTo(r, WIRE_TO[k], dur);
    run.tween(dur, function (e) {
      var p = w.path.getPointAtLength(w.len * e);
      r.pulse.style.transform = 'translate3d(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px,0)';
      w.lit.style.strokeDashoffset = (w.len * (1 - e)).toFixed(1);
    }, { ease: E.io });
  }
  function runFlow(run, seq, who) {
    seq.forEach(function (s, i) {
      run.at(s[1], function () {
        if (s[0][0] === 'w') hop(run, s[0], s[2], s[0] === 'w1' || s[0] === 'w2');
        else nodeOn(run, s[0], i === 0 ? who : null);
      });
    });
  }
  var S_AUTOMACOES = {
    id: 'automacoes', label: 'automações', nav: 'automacoes',
    title: 'Automações', tabs: ['Fluxos de trabalho', 'Configurações globais do fluxo de trabalho'], dur: 10000,
    captions: [
      [0, 'Por trás, um fluxo roda 24 horas por dia.'],
      [5300, 'Não respondeu? Follow-up no dia 1, 3 e 7, sem ninguém precisar lembrar.'],
    ],
    mount: function (run) {
      var root = run.root, svg = '', nodes = '';
      root.classList.add('vd-auto');
      Object.keys(WIRES).forEach(function (k) {
        var w = WIRES[k], d = 'M' + w[0] + ' ' + w[1] + w[2], e = wireEnd(w);
        svg += '<path class="vd-w" d="' + d + '"/><path class="vd-wl" data-w="' + k + '" d="' + d + '" style="opacity:0"/>' +
          '<circle class="vd-port" cx="' + w[0] + '" cy="' + w[1] + '" r="3"/><path class="vd-arr" d="M' + (e[0] - 10) + ' ' + (e[1] - 3.6) + 'L' + (e[0] - 3.5) + ' ' + e[1] + 'L' + (e[0] - 10) + ' ' + (e[1] + 3.6) + 'z"/>' +
          '<circle class="vd-port" cx="' + e[0] + '" cy="' + e[1] + '" r="3"/>';
      });
      Object.keys(NODES).forEach(function (k) {
        var n = NODES[k];
        if (n.branch) {
          nodes += '<div class="vd-branch" data-n="' + k + '" style="left:' + n.x + 'px;top:' + (n.y - 31) + 'px"><em class="' + (n.branch === 'NÃO' ? 'no' : '') + '">' + ic('braces') + n.branch + '</em><div>' + n.text + '</div></div>';
        } else {
          nodes += '<div class="vd-node vd-node--' + n.c + '" data-n="' + k + '" style="left:' + n.x + 'px;top:' + n.y + 'px">' + ic(n.i) +
            (n.day ? '<span class="vd-node__day">' + n.day + '</span>' : '') + '<span class="vd-node__d">' + ic('check') + '</span>' +
            '<div class="vd-node__lb">' + n.lb + (n.sub ? '<small>' + n.sub + '</small>' : '') + '</div></div>';
        }
      });
      root.innerHTML =
        '<div class="vd-ah1"><span class="vd-ah1__back">' + ic('back') + 'Lista de fluxos de trabalho</span><span class="vd-ibtn">' + ic('panel') + '</span>' +
          '<span class="vd-ah1__name">Atendimento de leads · WhatsApp' + ic('pencil') + '</span><span class="vd-sp"></span>' +
          av(P.cm, 'sm') + '<span class="vd-ibtn">' + ic('undo') + '</span><span class="vd-ibtn">' + ic('redo') + '</span><span class="vd-saved">' + ic('check') + 'Salvo</span></div>' +
        '<div class="vd-ah2"><span class="vd-sel">Construtor avançado' + ic('chevd') + '</span>' +
          '<div class="vd-ah2__tabs"><span class="is-on">Construtor</span><span>Configurações</span><span>Histórico de inscrições</span></div><span class="vd-sp"></span>' +
          '<span class="vd-btn vd-btn--soft">Testar fluxo de trabalho</span><span class="vd-tgl">Rascunho<i></i>Publicado</span></div>' +
        '<div class="vd-cw"><div class="vd-atools">' + ['msg', 'checkcircle', 'pie', 'file', 'link', 'search', 'history'].map(function (n) { return ic(n === 'msg' ? 'chat' : n); }).join('') + ic('spark', 'is-ai') + '</div>' +
          '<div class="vd-canvas">' +
            '<div class="vd-canvas__tl"><span class="vd-badge-live"><i></i>Ativo · 24 h por dia</span><span class="vd-runs">' + ic('zap') + 'Executado <b>1.282</b> vezes</span></div>' +
            '<div class="vd-canvas__tr"><span class="vd-btn vd-btn--ghost">' + ic('plus') + 'Adicionar</span></div>' +
            '<svg class="vd-wires" width="960" height="522" viewBox="0 0 960 522" aria-hidden="true"><defs><linearGradient id="vd-wg" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="900" y2="0"><stop offset="0" stop-color="#1d6cf2"/><stop offset="1" stop-color="#7047eb"/></linearGradient></defs>' + svg + '</svg>' +
            nodes + '<i class="vd-pulse"></i><span class="vd-runner"></span>' +
            '<div class="vd-zoom"><span>' + ic('pointer') + '</span><span>' + ic('fit') + '</span><span>' + ic('zout') + '</span><span>' + ic('zin') + '</span></div>' +
          '</div></div>';
      var r = run.r;
      r.nodes = {}; r.wires = {};
      run.$$('[data-n]').forEach(function (n) { r.nodes[n.getAttribute('data-n')] = n; });
      run.$$('.vd-wl').forEach(function (p) {
        var len = p.getTotalLength();
        p.style.strokeDasharray = len.toFixed(1) + ' ' + (len + 2).toFixed(1); p.style.strokeDashoffset = len.toFixed(1);
        r.wires[p.getAttribute('data-w')] = { path: p, lit: p, len: len };
      });
      r.pulse = run.$('.vd-pulse'); r.runner = run.$('.vd-runner'); r.runnerW = 0; r.gen = 0; r.runs = run.$('.vd-runs b');
      runFlow(run, RUN1, P.ju);
      runFlow(run, RUN2, P.lu);
    },
    beats: [
      [300, function (run) { run.cursorShow(false); }],
      [4950, function (run) { bumpRuns(run, 1283); }],
      [5000, function (run) { // limpa para a 2ª execução
        var r = run.r;
        r.gen = (r.gen || 0) + 1;
        Object.keys(r.nodes).forEach(function (k) { r.nodes[k].classList.remove('is-done', 'is-on'); });
        Object.keys(r.wires).forEach(function (k) { r.wires[k].lit.style.opacity = '0'; });
        r.runner.classList.remove('is-on');
        run.after(520, function () { Object.keys(r.wires).forEach(function (k) { var w = r.wires[k]; w.lit.style.strokeDashoffset = w.len.toFixed(1); }); }); // antes do 1º salto (5680)
      }],
      [8800, function (run) { bumpRuns(run, 1284); run.r.runner.classList.remove('is-on'); }],
    ],
  };
  function bumpRuns(run, n) {
    var b = run.r.runs; b.textContent = dots(n);
    if (!run.instant) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
  }

  /* ----------------------------------------------------------- 6. painel */
  var KPIS = [
    { ic: 'users', bg: '#e8f0ff', fg: '#1d6cf2', lb: 'Leads atendidos', to: 312, fmt: function (v) { return dots(v); }, d: '24%', up: 1 },
    { ic: 'zap', bg: '#f1ecff', fg: '#7047eb', lb: 'Tempo médio de resposta', to: 9, fmt: function (v) { return Math.round(v) + ' s'; }, d: '96%', up: 0 },
    { ic: 'calcheck', bg: '#e0f4fd', fg: '#0284c7', lb: 'Visitas agendadas', to: 47, fmt: function (v) { return dots(v); }, d: '31%', up: 1 },
    { ic: 'trophy', bg: '#e7f8ee', fg: '#16a34a', lb: 'Vendas no mês', to: 81.6, fmt: mil, d: '18%', up: 1 },
  ];
  var FUNNEL = [
    ['Novo lead', 312, '#2d6fff'], ['Em contato', 268, '#528dff'], ['Qualificado', 141, '#155df0'],
    ['Reunião agendada', 47, '#7faaf8'], ['Reunião realizada', 38, '#014ef4'], ['Ganho', 17, '#0141bd'],
  ];
  var FMAX = 350, DONUT_R = 52, DONUT_C = 2 * Math.PI * DONUT_R;
  var SEGS = [['Abertas', 162.2, '#2d6fff'], ['Ganhas', 81.6, '#0b3fbf'], ['Perdidas', 18.0, '#a9c4ff']];
  function funRowHTML(f, i) {
    var w = f[1] / FMAX * 100, cum = f[1] / FUNNEL[0][1] * 100, nx = FUNNEL[i + 1] ? FUNNEL[i + 1][1] / f[1] * 100 : null;
    return '<div class="vd-fun__r" data-i="' + i + '"><span class="vd-fun__lb">' + f[0] + '</span>' +
      '<div class="vd-fun__tr"><i class="vd-fun__bar" style="width:' + w.toFixed(2) + '%;--bc:' + f[2] + '"></i><span class="vd-fun__n" style="left:' + w.toFixed(2) + '%">' + f[1] + '</span></div>' +
      '<span class="vd-chev">' + pct(cum) + '</span><span class="vd-chev' + (i === 2 ? ' vd-chev--x' : '') + '">' + (nx == null ? '—' : pct(nx)) + '</span></div>';
  }
  function donutDraw(r, vals, k) {
    var tot = vals.reduce(function (a, b) { return a + b; }, 0), sweep = k * DONUT_C, acc = 0;
    vals.forEach(function (v, i) {
      var full = v / tot * DONUT_C, len = clamp(sweep - acc, 0, full) - 2.5;
      r.segs[i].setAttribute('stroke-dasharray', Math.max(0, len).toFixed(2) + ' ' + DONUT_C.toFixed(2));
      r.segs[i].setAttribute('stroke-dashoffset', (-acc).toFixed(2));
      acc += full;
    });
  }
  var S_PAINEL = {
    id: 'painel', label: 'painel', nav: 'painel',
    title: 'Painel de controle', tabs: [], dur: 9500,
    captions: [
      [0, 'Tudo vira número: tempo de resposta, visitas, vendas.'],
      [4700, 'Você vê onde o funil trava e decide com dados.'],
    ],
    mount: function (run) {
      var root = run.root;
      root.classList.add('vd-dash');
      root.innerHTML =
        '<div class="vd-dh"><div class="vd-grp"><span>Painel principal' + ic('chevd') + '</span><span>' + ic('plus') + 'Novo</span></div><span class="vd-sp"></span>' +
          '<span class="vd-sel">' + ic('cal', 'vd-sel__l') + 'Últimos 30 dias' + ic('chevd') + '</span><span class="vd-ibtn vd-ibtn--ai">' + ic('spark') + '</span>' +
          '<span class="vd-btn vd-btn--pri">' + ic('pencil') + 'Editar painel</span></div>' +
        '<div class="vd-db">' +
          '<div class="vd-qf">' + ic('plus') + 'Filtros rápidos</div>' +
          '<div class="vd-pipe">Pipeline</div>' +
          '<div class="vd-kpis">' + KPIS.map(function (k, i) {
            return '<div class="vd-kpi"><div class="vd-kpi__l"><span class="vd-kpi__ic" style="--k-bg:' + k.bg + ';--k-fg:' + k.fg + '">' + ic(k.ic) + '</span>' + k.lb + '</div>' +
              '<div class="vd-kpi__v" data-i="' + i + '">' + k.fmt(0) + '</div>' +
              '<span class="vd-kpi__d">' + ic(k.up ? 'arrowup' : 'arrowdown') + k.d + '<small>vs. set.</small></span></div>';
          }).join('') + '</div>' +
          '<div class="vd-drow">' +
            '<div class="vd-dc"><div class="vd-dc__hd"><div><b>Funil</b><small>(Alteração de status)</small></div><span class="vd-sel">Vendas' + ic('chevd') + '</span>' + ic('sliders') + '</div>' +
              '<div class="vd-fun"><div class="vd-fun__ax"><span></span><div>' + [0, 100, 200, 300].map(function (v) { return '<em style="left:' + (v / FMAX * 100).toFixed(2) + '%">' + v + '</em>'; }).join('') + '</div><span>Cumulativo</span><span>Próxima etapa</span></div>' +
                FUNNEL.map(funRowHTML).join('') +
                '<div class="vd-tip"><b>Qualificado → Reunião agendada</b><span>Oportunidades <strong>141 → 47</strong></span><span>Conversão <strong>33,3%</strong></span><em>' + ic('arrowdown') + 'maior queda do funil</em></div>' +
              '</div>' +
              '<div class="vd-fun__ft"><span>' + ic('trend') + 'Conversão total <b class="vd-ft-conv">5,4%</b></span><span>' + ic('clock') + 'Ciclo médio <b>12 dias</b></span><span>' + ic('trophy') + '<b class="vd-ft-won">17</b> vendas no mês</span></div>' +
              '</div>' +
            '<div class="vd-dc"><div class="vd-dc__hd"><div><b>Valor total de oportunidades</b><small>(01 – 31 de out. de 2026)</small></div></div>' +
              '<div class="vd-dn"><div class="vd-dn__v">' + mil(0) + '</div><div class="vd-kpi__row"><span class="vd-kpi__d">' + ic('arrowup') + '12,4%</span><span class="vd-dn__vs">versus mês passado</span></div>' +
                '<div class="vd-dn__row"><div class="vd-donut"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="' + DONUT_R + '" stroke="#eef1f6"/>' +
                  SEGS.map(function (s) { return '<circle class="vd-seg-c" cx="66" cy="66" r="' + DONUT_R + '" stroke="' + s[2] + '" stroke-dasharray="0 ' + DONUT_C.toFixed(2) + '"/>'; }).join('') +
                  '</svg><div class="vd-donut__c"><div><b>' + mil(0) + '</b>total</div></div></div>' +
                  '<div class="vd-leg">' + SEGS.map(function (s) { return '<div style="--lc:' + s[2] + '"><i></i>' + s[0] + '<b>' + mil(s[1]) + '</b></div>'; }).join('') + '</div></div>' +
                '<div class="vd-goal"><div class="vd-goal__t"><span>' + ic('trophy') + 'Meta de vendas do mês</span><b><span class="vd-goal__p">0%</span> de R$ 100 mil</b></div><div class="vd-goal__tr"><i class="vd-goal__f"></i></div></div>' +
              '</div></div>' +
          '</div>' +
        '</div>';
      var r = run.r;
      r.kv = run.$$('.vd-kpi__v'); r.rows = run.$$('.vd-fun__r'); r.bars = run.$$('.vd-fun__bar'); r.nums = run.$$('.vd-fun__n');
      r.chev = run.$$('.vd-fun__r .vd-chev'); r.tip = run.$('.vd-tip'); r.segs = run.$$('.vd-seg-c');
      r.dv = run.$('.vd-dn__v'); r.dc = run.$('.vd-donut__c b'); r.leg = run.$$('.vd-leg b'); r.vals = SEGS.map(function (s) { return s[1]; });
      r.goalF = run.$('.vd-goal__f'); r.goalP = run.$('.vd-goal__p'); r.ftConv = run.$('.vd-ft-conv'); r.ftWon = run.$('.vd-ft-won');
      r.goalF.style.transform = 'scaleX(0)';
      r.bars.forEach(function (b) { b.style.transform = 'scaleX(0)'; });
      r.nums.forEach(function (n) { n.style.opacity = '0'; });
      r.chev.forEach(function (c) { c.style.opacity = '0'; });
    },
    beats: [
      [300, function (run) {
        run.cursorShow(false);
        var r = run.r;
        KPIS.forEach(function (k, i) { run.after(i * 130, function () { run.text(r.kv[i], k.fmt, 0, k.to, 1400, { ease: E.out4 }); }); });
      }],
      [1050, function (run) {
        var r = run.r;
        r.bars.forEach(function (b, i) {
          run.tween(950, function (e) { b.style.transform = 'scaleX(' + e.toFixed(4) + ')'; }, { delay: i * 110, ease: E.out4 });
          run.after(i * 110 + 650, function () { r.nums[i].style.opacity = ''; run.anim(r.nums[i], [{ opacity: 0, transform: 'translateX(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 360 }); });
        });
        r.chev.forEach(function (c, i) {
          run.after(500 + Math.floor(i / 2) * 110 + (i % 2) * 60, function () { c.style.opacity = ''; run.anim(c, [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 380 }); });
        });
      }],
      [1900, function (run) {
        var r = run.r, tot = r.vals.reduce(function (a, b) { return a + b; }, 0);
        run.tween(1250, function (e) { donutDraw(r, r.vals, e); }, { ease: E.io });
        run.text(r.dv, mil, 0, tot, 1250, { ease: E.out });
        run.text(r.dc, mil, 0, tot, 1250, { ease: E.out });
        run.tween(1300, function (e) { r.goalF.style.transform = 'scaleX(' + (.816 * e).toFixed(4) + ')'; }, { ease: E.out4, delay: 250 });
        run.text(r.goalP, function (v) { return Math.round(v) + '%'; }, 0, 82, 1300, { ease: E.out4, delay: 250 });
      }],
      [4300, function (run) { run.move(run.r.bars[2], 850, { fx: .82, fy: .5, from: { x: 1120, y: 700 }, arc: .14 }); }],
      [5150, function (run) { // gargalo
        var r = run.r, tr = r.rows[2].querySelector('.vd-fun__tr'), fun = run.$('.vd-fun'), p = run.rel(tr, fun);
        r.tip.style.left = (p.x + p.w * .2) + 'px'; r.tip.style.top = (p.y + p.h + 12) + 'px';
        r.tip.classList.add('is-on');
        r.rows.forEach(function (row, i) { row.classList.toggle('is-dim', i !== 2 && i !== 3); });
        r.rows[2].classList.add('is-hl');
        r.chev[5].classList.add('is-low');
      }],
      [6350, function (run) {
        var r = run.r;
        r.tip.classList.remove('is-on');
        r.rows.forEach(function (row) { row.classList.remove('is-dim', 'is-hl'); });
        run.move({ x: 1080, y: 610 }, 700, { arc: .2 });
      }],
      [6650, function (run) { // a venda do Rafael chega ao painel
        var r = run.r, v0 = r.vals.reduce(function (a, b) { return a + b; }, 0);
        run.toast('<span class="vd-toast__ic">' + ic('trophy') + '</span><div><b>Venda ganha</b><small>Rafael Souza · entrou no painel</small></div><span class="vd-toast__amt">+ R$ 4.800</span>', 2300);
        run.text(r.kv[3], mil, 81.6, 86.4, 900, { ease: E.out });
        if (!run.instant) { r.kv[3].classList.remove('is-bump'); void r.kv[3].offsetWidth; r.kv[3].classList.add('is-bump'); }
        var g0 = r.vals[1];
        run.tween(900, function (e) {
          r.vals[1] = g0 + 4.8 * e; donutDraw(r, r.vals, 1);
          var tot = v0 + 4.8 * e; r.dv.textContent = mil(tot); r.dc.textContent = mil(tot); r.leg[1].textContent = mil(r.vals[1]);
        }, { ease: E.out });
        var bar = r.bars[5], n = r.nums[5], dx = bar.parentNode.offsetWidth / FMAX; // 1 venda a mais = 1/350 da trilha
        bar.style.transformOrigin = '0 50%';
        run.tween(700, function (e) { bar.style.transform = 'scaleX(' + (1 + e / 17).toFixed(4) + ')'; n.style.transform = 'translateX(' + (dx * e).toFixed(2) + 'px)'; }, { ease: E.out });
        n.textContent = '18';
        r.chev[10].textContent = pct(18 / 312 * 100); r.chev[9].textContent = pct(18 / 38 * 100);
        r.ftConv.textContent = pct(18 / 312 * 100); r.ftWon.textContent = '18';
        run.tween(900, function (e) { r.goalF.style.transform = 'scaleX(' + (.816 + .048 * e).toFixed(4) + ')'; }, { ease: E.out });
        run.text(r.goalP, function (v) { return Math.round(v) + '%'; }, 82, 86, 900, { ease: E.out });
      }],
      [7400, function (run) { run.cursorShow(false); }],
    ],
  };

  var SCENES = [S_ATENDIMENTO, S_FUNIL, S_AGENDA, S_LIGACAO, S_AUTOMACOES, S_PAINEL];

  /* ===================================================================
     Demo: casca (abas, janela, legenda), relógio rAF pausável, IO, RO
     =================================================================== */
  var NAV = [
    ['ia', 'spark', 'Pergunte à IA'], ['painel', 'grid', 'Painel de controle'], ['conversas', 'chat', 'Conversas'],
    ['calendarios', 'cal', 'Calendários'], ['contatos', 'contacts', 'Contatos'], ['leads', 'leads', 'Leads'],
    ['pagamentos', 'receipt', 'Pagamentos'], '-', ['aistudio', 'scan', 'AI Studio', 'Beta'], ['agentes', 'agents', 'Agentes de IA'],
    ['marketing', 'send', 'Marketing'], ['automacoes', 'auto', 'Automações'], ['sites', 'sites', 'Sites'],
    ['reputacao', 'star', 'Reputação'], ['relatorios', 'trend', 'Relatórios'], ['app', 'mobile', 'Aplicativo móvel'],
  ];
  var NAV_SCENE = { painel: 'painel', conversas: 'atendimento', calendarios: 'agenda', leads: 'funil', automacoes: 'automacoes' };
  var uid = 0;

  function Demo(root) {
    this.root = root; root.__vd = this;
    this.id = 'vd' + (++uid);
    this.idx = 0; this.t = 0; this.run = null; this.running = false; this.raf = 0;
    this.userPaused = false; this.visible = !('IntersectionObserver' in window); this.docHidden = !!D.hidden;
    this.reduced = !!MQ.matches; this.scale = 1; this.held = []; this.capTok = 0;
    this.tick = this.tick.bind(this);
    this.build(); this.bind(); this.layout();
    this.show(0, { initial: true });
    this.sync();
  }
  Demo.prototype = {
    build: function () {
      var self = this, root = this.root, logo = imgURL('vertisell-shield.webp');
      root.classList.add('vd');
      root.classList.toggle('vd--reduced', this.reduced);
      if (!root.hasAttribute('role')) root.setAttribute('role', 'region'); // torna o aria-label do contêiner anunciável
      if (!root.hasAttribute('aria-label')) root.setAttribute('aria-label', 'Demonstração interativa do CRM Vertisell');
      var nav = NAV.map(function (n) {
        if (n === '-') return '<div class="vd-nav__div"></div>';
        var go = NAV_SCENE[n[0]];
        return '<div class="vd-nav__it" data-nav="' + n[0] + '"' + (go ? ' data-go="' + go + '"' : '') + '>' + ic(n[1]) + '<span>' + n[2] + '</span>' + (n[3] ? '<span class="vd-beta">' + n[3] + '</span>' : '') + '</div>';
      }).join('');
      root.innerHTML =
        (D.getElementById('vd-sprite') ? '' : spriteHTML()) +
        '<div class="vd-bar"><div class="vd-tabs" role="tablist" aria-label="Etapas da demonstração do CRM">' +
          SCENES.map(function (s, i) {
            return '<button type="button" class="vd-tab" role="tab" id="' + self.id + '-tab-' + s.id + '" aria-controls="' + self.id + '-panel" aria-selected="false" tabindex="-1" data-i="' + i + '">' +
              '<span class="vd-tab__t">' + s.label + '</span><span class="vd-tab__bar" aria-hidden="true"><i></i></span></button>';
          }).join('') +
        '</div><button type="button" class="vd-play" aria-pressed="false" aria-label="pausar demonstração">' +
          '<svg class="vd-play__off" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1.3"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3"/></svg>' +
          '<svg class="vd-play__on" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.2v13.6a1 1 0 0 0 1.5.86l11-6.8a1 1 0 0 0 0-1.72l-11-6.8A1 1 0 0 0 8 5.2z"/></svg>' +
        '</button></div>' +
        '<div class="vd-panel" role="tabpanel" id="' + this.id + '-panel">' +
          '<div class="vd-stage"><div class="vd-win" aria-hidden="true">' +
            '<div class="vd-chrome"><span class="vd-chrome__dots"><i></i><i></i><i></i></span><span class="vd-chrome__url"><img src="' + logo + '" alt="" width="12" height="12">Vertisell CRM</span></div>' +
            '<div class="vd-app">' +
              '<aside class="vd-side"><div class="vd-side__logo"><img src="' + logo + '" alt="" width="34" height="33"></div>' +
                '<div class="vd-acct"><span class="vd-acct__ic">' + ic('pin') + '</span><span class="vd-acct__t"><b>HORIZONTE IMÓVEIS</b><small>São Paulo, SP</small></span>' + ic('updown') + '</div>' +
                '<div class="vd-search"><span class="vd-search__f">' + ic('search') + 'Pesquisar<kbd>ctrl K</kbd></span><span class="vd-search__b">' + ic('zap') + '</span></div>' +
                '<nav class="vd-nav"><span class="vd-nav__pill"></span>' + nav + '</nav>' +
                '<div class="vd-nav__foot"><div class="vd-nav__it">' + ic('gear') + '<span>Configurações</span></div></div>' +
              '</aside>' +
              '<div class="vd-main"><header class="vd-top"><div class="vd-top__l"></div><div class="vd-top__r">' +
                '<span class="vd-dial">' + ic('phone') + 'Discador WhatsApp</span>' +
                '<span class="vd-rb vd-rb--phone">' + ic('phone') + '</span><span class="vd-rb vd-rb--ai">' + ic('spark') + '</span>' +
                '<span class="vd-rb vd-rb--mega">' + ic('mega') + '</span><span class="vd-rb vd-rb--bell">' + ic('bell') + '<i class="vd-rb__dot"></i></span>' +
                '<span class="vd-rb vd-rb--help">?</span><span class="vd-rb vd-rb--me">CM</span>' +
              '</div></header><div class="vd-page"></div></div>' +
            '</div>' +
            '<div class="vd-fx"></div>' +
            '<div class="vd-cursor"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 3.2v16.4l4.3-4 2.8 6 2.8-1.2-2.7-5.9h5.9z" fill="#0b1628" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>' +
          '</div></div>' +
          '<div class="vd-cap"><span class="vd-cap__k" aria-hidden="true">01/06</span><p class="vd-cap__t" aria-live="off" aria-atomic="true"></p></div>' +
        '</div>';
      var q = function (s) { return root.querySelector(s); };
      this.tabList = q('.vd-tabs'); this.tabs = Array.prototype.slice.call(root.querySelectorAll('.vd-tab'));
      this.tabBars = this.tabs.map(function (b) { return b.querySelector('.vd-tab__bar i'); });
      this.playBtn = q('.vd-play'); this.panel = q('.vd-panel'); this.stage = q('.vd-stage'); this.win = q('.vd-win');
      this.page = q('.vd-page'); this.topL = q('.vd-top__l'); this.fx = q('.vd-fx'); this.navPill = q('.vd-nav__pill');
      this.bellDot = q('.vd-rb__dot'); this.capK = q('.vd-cap__k'); this.capT = q('.vd-cap__t');
      this.cursor = { el: q('.vd-cursor'), x: 900, y: 600, on: false };
      this.navItems = {};
      Array.prototype.forEach.call(root.querySelectorAll('.vd-nav [data-nav]'), function (n) { self.navItems[n.getAttribute('data-nav')] = n; });
    },
    bind: function () {
      var self = this;
      this.tabs.forEach(function (b, i) {
        b.addEventListener('click', function () { self.interact(); self.goTo(i, true); });
      });
      this.tabList.addEventListener('keydown', function (e) {
        var n = SCENES.length, i = self.tabs.indexOf(D.activeElement), j = -1;
        if (i < 0) return;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % n;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + n) % n;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = n - 1;
        if (j < 0) return;
        e.preventDefault();
        self.interact(); self.goTo(j, true); self.tabs[j].focus();
      });
      this.playBtn.addEventListener('click', function () { self.interact(); if (self.userPaused) self.play(); else self.pause(); });
      this.tabList.addEventListener('scroll', function () { self.tabEdge(); }, { passive: true });
      this.win.addEventListener('click', function (e) {
        var it = e.target.closest && e.target.closest('[data-go]');
        if (it) { self.interact(); self.goTo(it.getAttribute('data-go'), true); }
      });
      if ('IntersectionObserver' in window) {
        this.io = new IntersectionObserver(function (es) {
          es.forEach(function (en) { self.visible = en.isIntersecting && en.intersectionRatio >= .35; });
          self.sync();
        }, { threshold: [0, .2, .35, .5, .75, 1] });
        this.io.observe(this.root);
      }
      if ('ResizeObserver' in window) {
        this.ro = new ResizeObserver(function () { self.layout(); });
        this.ro.observe(this.root);
      } else window.addEventListener('resize', function () { self.layout(); });
      this.onVis = function () { self.docHidden = !!D.hidden; self.sync(); };
      D.addEventListener('visibilitychange', this.onVis);
      var onMQ = function () { self.setReduced(!!MQ.matches); };
      if (MQ.addEventListener) MQ.addEventListener('change', onMQ); else if (MQ.addListener) MQ.addListener(onMQ);
    },
    interact: function () {
      if (this.live) return;
      this.live = true; this.capT.setAttribute('aria-live', 'polite');
    },
    layout: function () {
      var w = this.stage.clientWidth || this.root.clientWidth || W;
      var s = Math.min(1, w / W);
      if (s === this.scale && this.lw === w) return;
      this.scale = s; this.lw = w;
      this.win.style.transform = s < 1 ? 'scale(' + s.toFixed(5) + ')' : '';
      this.win.style.left = Math.max(0, (w - W * s) / 2).toFixed(2) + 'px';
      this.stage.style.height = (H * s).toFixed(2) + 'px';
      this.tabEdge();
    },
    tabEdge: function () {
      var tl = this.tabList, over = tl.scrollWidth > tl.clientWidth + 2;
      tl.classList.toggle('is-over', over);
      tl.classList.toggle('is-end', !over || tl.scrollLeft + tl.clientWidth >= tl.scrollWidth - 4);
    },
    /* ---- troca de cena */
    show: function (i, opt) {
      opt = opt || {};
      var sc = SCENES[i], self = this;
      if (this.run) {
        this.run.kill();
        var prev = SCENES[this.idx];
        if (prev.cleanup) try { prev.cleanup(this.run); } catch (e) { report(e); }
      }
      clearTimeout(this.gcT);
      var olds = Array.prototype.slice.call(this.page.children);
      this.fx.textContent = '';
      this.cursor.el.classList.remove('is-down');
      var node = h('<div class="vd-scene vd-scene--' + sc.id + '"></div>');
      this.page.appendChild(node);
      this.idx = i; this.t = 0;
      this.setNav(sc.nav, !!opt.initial); this.setTop(sc, !!opt.initial);
      var run = this.run = new Run(this, sc, node);
      try { sc.mount(run); } catch (e) { report(e); }
      (sc.beats || []).forEach(function (b) { run.at(b[0], function () { b[1](run); }); });
      sc.captions.forEach(function (c) { run.at(c[0], function () { self.setCaption(c[1]); }); });
      if (!run.instant) this.outro(run, i);
      if (olds.length && !this.reduced && !opt.initial && node.animate) {
        olds.forEach(function (o) { o.style.zIndex = '0'; o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }); });
        node.style.zIndex = '1';
        node.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 440, delay: 140, easing: EASE.out, fill: 'backwards' });
        this.gcT = setTimeout(function () { olds.forEach(function (o) { o.remove(); }); }, 420);
      } else olds.forEach(function (o) { o.remove(); });
      if (run.instant) {
        run.advance(Infinity);
        this.setCaption(sc.captions.map(function (c) { return c[1]; }).join(' '));
      } else run.advance(0);
      this.syncTabs(); this.progress();
    },
    outro: function (run, i) { // o cursor clica no próximo item da sidebar
      var nx = SCENES[(i + 1) % SCENES.length], it = this.navItems[nx.nav], self = this, t0 = SCENES[i].dur - 1150;
      if (!it) return;
      run.at(t0, function () { run.move(it, 820, { fx: .32, fy: .5, arc: .14 }); });
      run.at(t0 + 880, function () { run.click(); self.setNav(nx.nav); });
    },
    setNav: function (key, instant) {
      if (this.navKey === key) return;
      this.navKey = key;
      var it = this.navItems[key];
      if (!it) return;
      var p = this.navPill;
      if (instant) p.style.transition = 'none';
      p.style.transform = 'translateY(' + it.offsetTop + 'px)';
      if (instant) { void p.offsetWidth; p.style.transition = ''; }
    },
    setTop: function (sc, instant) {
      var key = sc.title + '|' + sc.tabs.join(',');
      if (this.topKey === key) return;
      this.topKey = key;
      var node = h('<div class="vd-ttl"><span class="vd-ttl__h">' + sc.title + '</span><span class="vd-ttl__tabs">' +
        sc.tabs.map(function (t, i) { return '<span class="vd-ttl__tab' + (i === 0 ? ' is-on' : '') + '">' + t + '</span>'; }).join('') + '</span></div>');
      var olds = Array.prototype.slice.call(this.topL.children);
      this.topL.appendChild(node);
      if (instant || this.reduced || !node.animate) { olds.forEach(function (o) { o.remove(); }); return; }
      olds.forEach(function (o) {
        var a = o.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: 170, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' });
        a.onfinish = function () { o.remove(); };
      });
      node.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 150, easing: EASE.out, fill: 'backwards' });
    },
    setCaption: function (text) { this.capText = text; this.paintCaption(); },
    paintCaption: function () {
      var sc = SCENES[this.idx], hint = this.userPaused && !this.reduced && sc.pausedHint;
      this.capT.parentNode.classList.toggle('is-hint', !!hint);
      this.showCaption(hint || this.capText || '');
    },
    showCaption: function (text) {
      var t = this.capT, self = this;
      this.capK.textContent = (this.idx < 9 ? '0' : '') + (this.idx + 1) + '/' + (SCENES.length < 10 ? '0' : '') + SCENES.length;
      if (this.capShown === text) return;
      this.capShown = text;
      var tok = ++this.capTok;
      if (t.getAnimations) t.getAnimations().forEach(function (a) { a.cancel(); });
      if (this.reduced || !this.running || !t.animate || !t.textContent) { t.textContent = text; return; }
      var a = t.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-5px)' }], { duration: 170, easing: 'ease-in', fill: 'forwards' });
      a.onfinish = function () {
        a.cancel();
        if (tok !== self.capTok) return;
        t.textContent = text;
        t.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: EASE.out });
      };
    },
    syncTabs: function () {
      var self = this;
      this.tabs.forEach(function (b, j) {
        var on = j === self.idx;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      this.panel.setAttribute('aria-labelledby', this.tabs[this.idx].id);
      var tl = this.tabList;
      if (tl.scrollWidth > tl.clientWidth + 2) {
        var b = this.tabs[this.idx], left = b.offsetLeft - (tl.clientWidth - b.offsetWidth) / 2;
        try { tl.scrollTo({ left: Math.max(0, left), behavior: this.reduced ? 'auto' : 'smooth' }); } catch (e) { tl.scrollLeft = left; }
      }
    },
    progress: function () {
      var bar = this.tabBars[this.idx], k = this.reduced ? 1 : clamp(this.t / SCENES[this.idx].dur, 0, 1);
      if (this.lastBar && this.lastBar !== bar) this.lastBar.style.transform = 'scaleX(0)';
      this.lastBar = bar;
      bar.style.transform = 'scaleX(' + k.toFixed(4) + ')';
    },
    ping: function () {
      var d = this.bellDot;
      if (this.reduced) return;
      d.classList.remove('is-ping'); void d.offsetWidth; d.classList.add('is-ping');
    },
    /* ---- relógio */
    tick: function (now) {
      this.raf = 0;
      if (!this.running) return;
      var dt = now - this.last; this.last = now;
      if (!(dt > 0)) dt = 0; else if (dt > 100) dt = 100;
      this.t += dt;
      if (this.t >= SCENES[this.idx].dur) this.show((this.idx + 1) % SCENES.length, { auto: true });
      else if (this.run) this.run.advance(this.t);
      this.progress();
      if (this.running && !this.raf) this.raf = requestAnimationFrame(this.tick);
    },
    sync: function () {
      var want = !this.userPaused && this.visible && !this.docHidden && !this.reduced;
      this.syncPlay();
      if (want !== this.running) {
        this.running = want;
        this.root.classList.toggle('vd--paused', !want);
        if (want) {
          this.resumeAnims();
          this.last = performance.now();
          if (!this.raf) this.raf = requestAnimationFrame(this.tick);
        } else {
          if (this.raf) cancelAnimationFrame(this.raf);
          this.raf = 0;
          this.pauseAnims();
        }
      }
      if (this.run) this.paintCaption();
    },
    pauseAnims: function () {
      if (!this.root.getAnimations) return;
      var list = this.root.getAnimations({ subtree: true }).filter(function (a) { return a.playState === 'running'; });
      list.forEach(function (a) { try { a.pause(); } catch (e) { /* ok */ } });
      this.held = this.held.concat(list);
    },
    resumeAnims: function () {
      var list = this.held; this.held = [];
      list.forEach(function (a) { if (a.playState === 'paused') try { a.play(); } catch (e) { /* ok */ } });
    },
    syncPlay: function () {
      var paused = this.userPaused || this.reduced;
      this.playBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      this.playBtn.setAttribute('aria-label', paused ? 'tocar demonstração' : 'pausar demonstração');
    },
    setReduced: function (r) {
      if (r === this.reduced) return;
      this.reduced = r;
      this.root.classList.toggle('vd--reduced', r);
      if (r) { this.cursor.on = false; this.cursor.el.classList.remove('is-on'); }
      this.show(this.idx, { initial: true });
      this.sync();
    },
    /* ---- API */
    goTo: function (i, fromUser) {
      if (typeof i === 'string') { var id = i; i = -1; SCENES.forEach(function (s, j) { if (s.id === id) i = j; }); }
      if (!(i >= 0 && i < SCENES.length)) return;
      if (fromUser) this.userPaused = false;
      this.show(i);
      this.sync();
    },
    play: function () { this.userPaused = false; this.sync(); },
    pause: function () { this.userPaused = true; this.sync(); },
  };

  /* ============================================================ API + init */
  var current = null;
  function init(el) {
    if (typeof el === 'string') el = D.querySelector(el);
    el = el || D.getElementById('crm-demo');
    if (!el) return null;
    if (el.__vd) return (current = el.__vd);
    try { current = new Demo(el); } catch (e) { report(e); return null; }
    return current;
  }
  window.VertisellDemo = {
    init: function (el) { return init(el) ? window.VertisellDemo : null; },
    goTo: function (id) { if (current || init()) current.goTo(id, false); },
    play: function () { if (current || init()) current.play(); },
    pause: function () { if (current || init()) current.pause(); },
  };
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();

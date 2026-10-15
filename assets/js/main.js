/* =========================================================================
   Vertisell — comportamento da landing page
   (hero rotativo, celular ao vivo, comparação, órbita, ligações, follow-up,
    omnichannel, app, tudo-em-um, dados, formulário → WhatsApp)
   ========================================================================= */
(() => {
  'use strict';

  /* ------------------------------------------------------------ config */
  const CONFIG = {
    // WhatsApp da equipe comercial: só dígitos, com DDI e DDD. Ex.: '5511912345678'
    whatsapp: '',
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const h = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
  const icon = (id, size) => `<svg${size ? ` width="${size}" height="${size}"` : ''}><use href="#i-${id}"/></svg>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ------------------------------------------------------------------
     Linhas do tempo pausáveis: o "tempo" de cada seção só anda quando
     ela está visível (e a aba está ativa). Scripts usam `await tl.wait(ms)`.
     ------------------------------------------------------------------ */
  const timelines = new Set();
  let rafId = 0, last = 0;
  function loop(now) {
    const dt = Math.min(100, now - (last || now));
    last = now;
    let any = false;
    timelines.forEach(tl => { if (tl.active) { any = true; tl.tick(dt); } });
    rafId = any ? requestAnimationFrame(loop) : 0;
    if (!any) last = 0;
  }
  function kick() { if (!rafId) rafId = requestAnimationFrame(loop); }

  class Timeline {
    constructor(el, { threshold = 0.25, onFirst } = {}) {
      this.el = el; this.t = 0; this.active = false; this.started = false; this.waits = []; this.frames = new Set();
      this.onFirst = onFirst;
      timelines.add(this);
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { this.inView = e.isIntersecting; this.sync(); });
      }, { threshold });
      io.observe(el);
    }
    sync() {
      const on = !!this.inView && !document.hidden;
      if (on && !this.started) { this.started = true; if (this.onFirst) this.onFirst(this); }
      this.active = on;
      if (on) kick();
    }
    wait(ms) { return new Promise(res => this.waits.push({ at: this.t + ms, res })); }
    /** callback por frame enquanto ativo, por `ms`; f recebe progresso 0..1 */
    tween(ms, f) {
      return new Promise(res => { const start = this.t; this.frames.add({ start, ms, f, res }); });
    }
    tick(dt) {
      this.t += dt;
      if (this.waits.length) {
        const due = this.waits.filter(w => w.at <= this.t);
        if (due.length) { this.waits = this.waits.filter(w => w.at > this.t); due.forEach(w => w.res()); }
      }
      this.frames.forEach(fr => {
        const p = Math.min(1, (this.t - fr.start) / fr.ms);
        fr.f(p);
        if (p >= 1) { this.frames.delete(fr); fr.res(); }
      });
    }
  }
  document.addEventListener('visibilitychange', () => timelines.forEach(tl => tl.sync()));

  const ease = {
    out: p => 1 - Math.pow(1 - p, 3),
    inOut: p => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  };

  /** Prepara (esconde) uma sequência só quando a seção está chegando na tela.
      Assim a página fica completa em repouso (miniatura, sem JS, aba oculta). */
  function armOnApproach(el, cls = 'is-armed') {
    const io = new IntersectionObserver(es => {
      if (es.some(e => e.isIntersecting)) { el.classList.add(cls); io.disconnect(); }
    }, { rootMargin: '0px 0px 35% 0px' });
    io.observe(el);
  }

  /** abre um link externo a partir de um gesto do usuário (funciona também em iframes restritos) */
  function openExternal(url) {
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener';
    document.body.append(a); a.click(); a.remove();
  }

  /* ------------------------------------------------------- WhatsApp */
  function waLink(text) {
    const base = CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp}` : 'https://wa.me/';
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  function initWaLinks() {
    if (!CONFIG.whatsapp) return; // sem número configurado, os botões levam ao formulário (#contato)
    $$('[data-wa]').forEach(a => {
      a.href = waLink(a.dataset.wa);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ------------------------------------------------------------- nav */
  function initNav() {
    const nav = $('[data-nav]');
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const toggle = $('[data-menu-toggle]'), menu = $('[data-menu]');
    const setOpen = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      toggle.innerHTML = icon(open ? 'x' : 'menu', 22);
      menu.hidden = !open;
    };
    toggle.addEventListener('click', () => setOpen(menu.hidden));
    menu.addEventListener('click', e => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setOpen(false); toggle.focus(); } });
    window.addEventListener('resize', () => { if (window.innerWidth > 980 && !menu.hidden) setOpen(false); });

    // botão flutuante: some no topo e perto do formulário
    const fab = $('.wa-float');
    if (fab) {
      const seen = new Map();
      const io = new IntersectionObserver(es => {
        es.forEach(e => seen.set(e.target, e.isIntersecting));
        fab.classList.toggle('is-hidden', Array.from(seen.values()).some(Boolean));
      }, { threshold: 0.15 });
      [$('#topo'), $('#contato')].forEach(s => s && io.observe(s));
    }
  }

  /* ---------------------------------------------- título rotativo */
  const PAIRS = [
    ['lead sem resposta?', 'a ia responde em 8s.'],
    ['lead de madrugada?', 'a ia atende 24/7.'],
    ['follow-up parado?', 'a ia não esquece.'],
    ['agenda vazia?', 'a ia agenda sozinha.'],
    ['cliente faltou?', 'lembrete automático.'],
    ['crm desatualizado?', 'o card anda sozinho.'],
    ['dez ferramentas?', 'uma só plataforma.'],
  ];

  function initRotator() {
    const root = $('[data-rotator]');
    if (!root) return;
    const pain = $('[data-pain]', root), fix = $('[data-fix]', root);

    const reserve = () => {
      const keepP = pain.textContent, keepF = fix.textContent;
      root.style.minHeight = '';
      let max = 0;
      PAIRS.forEach(([p, f]) => { pain.textContent = p; fix.textContent = f; max = Math.max(max, root.offsetHeight); });
      pain.textContent = keepP; fix.textContent = keepF;
      root.style.minHeight = max + 'px';
    };
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    fontsReady.then(reserve);
    if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', reserve);
    window.addEventListener('load', reserve);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(reserve, 150); });

    if (reduceMotion) { pain.classList.add('is-struck'); return; }

    new Timeline(root, {
      threshold: 0.1,
      onFirst: async tl => {
        let i = 0;
        await tl.wait(700);
        for (;;) {
          const [p, f] = PAIRS[i];
          if (pain.textContent !== p) {
            pain.classList.add('is-enter');
            pain.classList.remove('is-struck', 'is-out');
            pain.textContent = p;
            void pain.offsetWidth;
            pain.classList.remove('is-enter');
            fix.textContent = '';
            await tl.wait(1000);
          } else {
            await tl.wait(300);
          }
          pain.classList.add('is-struck');
          await tl.wait(520);
          if (fix.textContent !== f) {
            for (let k = 1; k <= f.length; k++) { fix.textContent = f.slice(0, k); await tl.wait(34 + (k % 4) * 9); }
          }
          await tl.wait(2700);
          for (let k = f.length - 1; k >= 0; k--) { fix.textContent = f.slice(0, k); await tl.wait(13); }
          pain.classList.add('is-out');
          await tl.wait(420);
          i = (i + 1) % PAIRS.length;
        }
      },
    });
  }

  /* ---------------------------------------------- celular do hero */
  const HERO_CHAT = [
    { in: 'Boa noite! Quanto custa o clareamento?', time: '22:14', toast: 'lead', after: 800 },
    { typing: 'ai', ms: 1400 },
    { ai: 'Oi, Marina! 😊 Sou a assistente virtual da clínica. A avaliação é gratuita. Você prefere clareamento a laser ou caseiro?', time: '22:14', toast: 'reply', after: 1500 },
    { typing: 'in', ms: 1100 },
    { in: 'A laser', time: '22:15', after: 500 },
    { typing: 'ai', ms: 1200, toast: 'qualified' },
    { ai: 'Ótimo! Tenho amanhã às 9h ou às 18h. Qual horário fica melhor?', time: '22:15', after: 1400 },
    { typing: 'in', ms: 900 },
    { in: '18h 🙏', time: '22:16', after: 700 },
    { sys: 'Avaliação agendada · amanhã, 18:00', toast: 'booked', after: 1100 },
    { toast: 'moved', after: 500 },
    { typing: 'ai', ms: 900 },
    { ai: 'Prontinho! Te lembro por aqui 1h antes. 💙', time: '22:16', after: 1600 },
    { toast: 'sale', after: 4200 },
  ];

  function bubble(kind, text, time) {
    const b = h('div', `msg ${kind === 'in' ? 'msg--in' : 'msg--out msg--ai'} is-new`);
    b.innerHTML = (kind === 'ai' ? '<span class="msg__ai">IA</span>' : '') + esc(text) +
      `<span class="msg__time">${time}${kind === 'ai' ? `<span class="msg__ticks">${icon('checks')}</span>` : ''}</span>`;
    return b;
  }
  function typingEl(kind) {
    const t = h('div', kind === 'in' ? 'typing typing--in' : 'typing');
    t.innerHTML = (kind === 'ai' ? `${icon('sparkle', 11)} IA digitando ` : '') + '<i></i><i></i><i></i>';
    return t;
  }

  function initHero() {
    const thread = $('[data-hero-thread]');
    if (!thread) return;
    const toasts = Object.fromEntries($$('[data-toast]').map(t => [t.dataset.toast, t]));

    const opening = () => {
      thread.innerHTML = '';
      thread.append(h('div', 'day mono', 'hoje'));
      thread.append(h('div', 'sys', icon('instagram', 12) + 'novo lead · anúncio do Instagram'));
    };
    // remove as mensagens mais antigas (mantém o cabeçalho "hoje") quando a conversa não cabe
    const trim = () => {
      let guard = 0;
      while (thread.scrollHeight > thread.clientHeight + 1 && thread.children.length > 3 && guard++ < 12) {
        thread.children[2].remove();
      }
    };
    opening();
    const showToast = (tl, key) => {
      const t = toasts[key]; if (!t) return;
      t.classList.add('is-on');
      tl.wait(4300).then(() => t.classList.remove('is-on'));
    };

    if (reduceMotion) {
      HERO_CHAT.forEach(s => {
        if (s.in) thread.append(bubble('in', s.in, s.time));
        if (s.ai) thread.append(bubble('ai', s.ai, s.time));
        if (s.sys) { const n = h('div', 'sys', icon('check', 13) + esc(s.sys)); thread.append(n); }
      });
      trim();
      ['reply', 'booked'].forEach(k => toasts[k] && toasts[k].classList.add('is-on'));
      return;
    }

    new Timeline($('.hero__visual'), {
      threshold: 0.15,
      onFirst: async tl => {
        for (;;) {
          for (const s of HERO_CHAT) {
            if (s.typing) {
              const t = typingEl(s.typing); thread.append(t); trim();
              if (s.toast) showToast(tl, s.toast);
              await tl.wait(s.ms); t.remove(); continue;
            }
            if (s.in) thread.append(bubble('in', s.in, s.time));
            if (s.ai) thread.append(bubble('ai', s.ai, s.time));
            if (s.sys) thread.append(h('div', 'sys is-new', icon('check', 13) + esc(s.sys)));
            trim();
            if (s.toast) showToast(tl, s.toast);
            await tl.wait(s.after || 600);
          }
          // recomeça: limpa com um fade
          thread.style.transition = 'opacity .5s';
          thread.style.opacity = '0';
          await tl.wait(520);
          opening();
          thread.style.opacity = '1';
          await tl.wait(500);
        }
      },
    });
  }

  /* ------------------------------------------------- comparação */
  function initRace() {
    const race = $('[data-race]');
    if (!race || reduceMotion) return;
    armOnApproach(race);
    new Timeline(race, {
      threshold: 0.35,
      onFirst: async tl => {
        await tl.wait(350);
        for (let k = 0; k <= 5; k++) {
          $$(`[data-at="${k}"]`, race).forEach(el => el.classList.add('is-on'));
          await tl.wait(k === 0 ? 700 : 950);
        }
      },
    });
  }

  /* ------------------------------------------------------ órbita */
  function initOrbit() {
    const orbit = $('[data-orbit]');
    if (!orbit) return;
    const nodes = $$('.orbit__node', orbit);
    const rings = $$('.orbit__ring', orbit);
    const runner = $('.orbit__runner span', orbit);
    const mq = window.matchMedia('(max-width: 900px)');
    const N = nodes.length;
    let geo = null, hoverIdx = -1, active = -1;

    const setActive = i => {
      if (i === active) return;
      active = i;
      nodes.forEach((n, k) => n.classList.toggle('is-active', k === i));
    };

    const layout = () => {
      if (mq.matches) {
        nodes.forEach(n => { n.style.left = ''; n.style.top = ''; });
        rings.forEach(r => { r.style.width = ''; r.style.height = ''; });
        geo = null; return;
      }
      const W = orbit.clientWidth, H = orbit.clientHeight;
      const rx = Math.min(W / 2 - 112, W * 0.41), ry = H / 2 - 62;
      geo = { cx: W / 2, cy: H / 2, rx, ry };
      nodes.forEach((n, i) => {
        const a = -Math.PI / 2 + (i / N) * Math.PI * 2;
        n.style.left = (geo.cx + Math.cos(a) * rx) + 'px';
        n.style.top = (geo.cy + Math.sin(a) * ry) + 'px';
      });
      rings[0].style.width = (rx * 2) + 'px'; rings[0].style.height = (ry * 2) + 'px';
      if (runner && !runner.style.transform) runner.style.transform = `translate(${geo.cx}px, ${geo.cy - ry}px)`;
    };
    layout();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
    mq.addEventListener ? mq.addEventListener('change', layout) : mq.addListener(layout);

    nodes.forEach((n, i) => {
      n.addEventListener('mouseenter', () => { hoverIdx = i; setActive(i); });
      n.addEventListener('mouseleave', () => { hoverIdx = -1; });
    });

    if (reduceMotion) { setActive(0); if (runner) runner.style.display = 'none'; return; }

    const PERIOD = 18000; // uma volta
    let phase = 0;
    const tl = new Timeline(orbit, { threshold: 0.2 });
    tl.frames.add({
      start: 0, ms: Infinity, res() {},
      f() {
        // avança só quando não está em hover
        if (hoverIdx < 0) phase = (phase + 16.7 / PERIOD) % 1;
        const idx = Math.round(phase * N) % N;
        if (hoverIdx < 0) setActive(idx);
        if (geo && runner) {
          const a = -Math.PI / 2 + phase * Math.PI * 2;
          runner.style.transform = `translate(${geo.cx + Math.cos(a) * geo.rx}px, ${geo.cy + Math.sin(a) * geo.ry}px)`;
        }
      },
    });
  }

  /* ------------------------------------------------ ligação gravada */
  function initCall() {
    const root = $('[data-callmock]');
    if (!root) return;
    const wave = $('[data-wave]', root);
    const BARS = 46;
    for (let i = 0; i < BARS; i++) {
      const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * 0.6 + Math.sin(i * 0.37) * 0.4);
      const bar = h('i'); bar.style.height = Math.round(18 + v * 82) + '%'; wave.append(bar);
    }
    const bars = $$('i', wave);
    const timeEl = $('[data-player-time]', root), btn = $('[data-call-btn]', root);
    const calling = $('[data-calling]', root), timer = $('[data-call-timer]', root);
    const card = $('[data-callcard]', root), saved = $('[data-call-saved]', root);
    const playBtn = $('[data-player-btn]', root);
    const TOTAL = 402; // 06:42
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const setProgress = p => {
      const n = Math.round(p * BARS);
      bars.forEach((b, i) => b.classList.toggle('is-played', i < n));
      timeEl.textContent = `${fmt(p * TOTAL)} / ${fmt(TOTAL)}`;
    };

    setProgress(0.32);
    if (reduceMotion) return;
    armOnApproach(root);

    new Timeline(root, {
      threshold: 0.35,
      onFirst: async tl => {
        await tl.wait(700);
        btn.classList.add('is-press'); await tl.wait(260); btn.classList.remove('is-press');
        calling.classList.add('is-on');
        await tl.wait(1500);
        await tl.tween(2300, p => { timer.textContent = fmt(ease.inOut(p) * TOTAL); });
        await tl.wait(500);
        calling.classList.remove('is-on');
        await tl.wait(300);
        card.classList.add('is-on');
        await tl.wait(500);
        saved.classList.add('is-on');
        setProgress(0);
        for (;;) {
          await tl.wait(900);
          playBtn.innerHTML = icon('pause', 14);
          await tl.tween(9000, p => setProgress(p));
          playBtn.innerHTML = icon('play', 14);
          await tl.wait(1800);
          setProgress(0);
        }
      },
    });
  }

  /* ------------------------------------------------------ follow-up */
  function initFollowUp() {
    const root = $('[data-fumock]');
    if (!root || reduceMotion) return;
    armOnApproach(root);
    const items = $$('[data-fu]', root).sort((a, b) => a.dataset.fu - b.dataset.fu);
    const delays = [300, 900, 900, 700, 500, 900, 500, 1100, 900];
    new Timeline(root, {
      threshold: 0.35,
      onFirst: async tl => {
        for (let i = 0; i < items.length; i++) {
          await tl.wait(delays[i] || 700);
          items[i].classList.add('is-on');
        }
      },
    });
  }

  /* ---------------------------------------------------- omnichannel */
  const CH = {
    whatsapp: { icon: 'whatsapp', c: '#25d366', label: 'WhatsApp' },
    instagram: { icon: 'instagram', c: '#e1306c', label: 'Instagram' },
    messenger: { icon: 'messenger', c: '#0a7cff', label: 'Messenger' },
    mail: { icon: 'mail', c: '#7047eb', label: 'E-mail' },
    sms: { icon: 'sms', c: '#e89a0c', label: 'SMS' },
    site: { icon: 'globe', c: '#0763d1', label: 'Chat do site' },
  };
  const CH_ORDER = ['whatsapp', 'instagram', 'messenger', 'mail', 'sms', 'site'];
  const OMNI = [
    { ch: 'whatsapp', name: 'Otávio Ramos', ini: 'OR', c: '#0891b2', text: 'Vocês atendem aos sábados?', tag: 'IA respondeu', t: 'purple' },
    { ch: 'instagram', name: 'Sabrina Melo', ini: 'SM', c: '#db2777', text: 'Vi o story! Ainda tem vaga para março?', tag: 'IA respondeu', t: 'purple' },
    { ch: 'mail', name: 'Henrique Dias', ini: 'HD', c: '#0763d1', text: 'Segue o contrato assinado.', tag: 'novo', t: '' },
    { ch: 'messenger', name: 'Lívia Martins', ini: 'LM', c: '#7c3aed', text: 'Quanto fica o pacote completo?', tag: 'IA respondeu', t: 'purple' },
    { ch: 'sms', name: 'Caio Nunes', ini: 'CN', c: '#e89a0c', text: 'Confirmado para amanhã às 10h.', tag: 'confirmado', t: 'green' },
    { ch: 'site', name: 'Patrícia Gomes', ini: 'PG', c: '#15a34a', text: 'Quero falar com um consultor.', tag: 'IA respondeu', t: 'purple' },
    { ch: 'whatsapp', name: 'Renan Alcântara', ini: 'RA', c: '#65a30d', text: 'Pode me mandar o link de pagamento?', tag: 'IA respondeu', t: 'purple' },
    { ch: 'instagram', name: 'Mirela Fonseca', ini: 'MF', c: '#f43f5e', text: 'Vocês fazem orçamento por aqui?', tag: 'IA respondeu', t: 'purple' },
  ];

  function omniItem(m, isNew) {
    const ch = CH[m.ch];
    const li = h('li', 'omni__item' + (isNew ? ' is-new' : ''));
    li.innerHTML = `
      <span class="avatar" style="--c:${m.c}">${m.ini}<span class="omni__ch" style="--c:${ch.c}">${icon(ch.icon)}</span></span>
      <span class="omni__body"><strong>${esc(m.name)}</strong><span>${esc(m.text)}</span></span>
      <span class="omni__meta"><time>agora</time><span class="tag ${m.t ? 'tag--' + m.t : ''}">${esc(m.tag)}</span></span>`;
    return li;
  }

  function initOmni() {
    const stage = $('[data-omni]');
    if (!stage) return;
    const svg = $('[data-omni-wires]', stage), list = $('[data-omni-list]', stage), count = $('[data-omni-count]', stage);
    const chans = $$('.omni__channels li', stage);
    const inbox = $('.omni__inbox', stage);
    let paths = [];

    const draw = () => {
      if (!svg.getClientRects().length) { paths = []; return; }
      const r = svg.getBoundingClientRect();
      const ib = inbox.getBoundingClientRect();
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`);
      svg.innerHTML = '';
      paths = chans.map((li, i) => {
        const a = li.getBoundingClientRect();
        const x1 = a.right - r.left - 2, y1 = a.top + a.height / 2 - r.top;
        const x2 = ib.left - r.left + 2, y2 = (ib.top - r.top) + 70 + i * 6;
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const mx = (x1 + x2) / 2;
        p.setAttribute('d', `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`);
        svg.append(p);
        return p;
      });
    };

    // estado inicial
    OMNI.slice(0, 4).reverse().forEach(m => list.prepend(omniItem(m, false)));
    requestAnimationFrame(draw);
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(draw, 120); });
    if (document.fonts) document.fonts.ready.then(draw);

    if (reduceMotion) return;
    let n = 4, unread = 6;
    new Timeline(stage, {
      threshold: 0.3,
      onFirst: async tl => {
        draw();
        for (;;) {
          await tl.wait(1300);
          const m = OMNI[n % OMNI.length]; n++;
          const ci = CH_ORDER.indexOf(m.ch);
          const li = chans[ci];
          li.classList.add('is-ping');
          const path = paths[ci];
          if (path) {
            const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            dot.setAttribute('r', '4.5');
            dot.style.fill = CH[m.ch].c;
            svg.append(dot);
            const L = path.getTotalLength();
            await tl.tween(850, p => { const pt = path.getPointAtLength(ease.inOut(p) * L); dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); });
            dot.remove();
          } else {
            await tl.wait(500);
          }
          li.classList.remove('is-ping');
          list.prepend(omniItem(m, true));
          while (list.children.length > 6) list.lastElementChild.remove();
          unread = unread >= 9 ? 3 : unread + 1;
          count.textContent = `${unread} novas`;
          tl.wait(1400).then(() => { const first = list.firstElementChild; if (first) first.classList.remove('is-new'); });
        }
      },
    });
  }

  /* --------------------------------------------- app: três cenários */
  const SHIELD = 'assets/img/vertisell-shield-white.webp';
  const status = t => `<div class="mini__status"><span>${t}</span><span class="app__status-icons"><i></i><i></i><i></i></span></div>`;
  const notif = (title, text) => `<div class="mini__notif"><img src="${SHIELD}" alt=""><div><b>${title}</b><span>${text}</span></div></div>`;

  const MINI = {
    inbox: {
      html: () => status('07:40') +
        `<div class="mini__bar"><strong>Conversas</strong><span class="tag tag--purple">IA ativa</span></div>
         <div class="mini__body">${notif('Vertisell', 'A IA atendeu 6 leads enquanto você dirigia')}</div>`,
      rows: [
        ['Otávio Ramos', 'OR', '#0891b2', 'Agendado: consulta sex 10h', '07:38'],
        ['Sabrina Melo', 'SM', '#db2777', 'Enviei as opções de horário', '07:31'],
        ['Lívia Martins', 'LM', '#7c3aed', 'Qualificado · ação trabalhista', '07:22'],
        ['Caio Nunes', 'CN', '#e89a0c', 'Documentos recebidos ✓', '07:10'],
        ['Mirela Fonseca', 'MF', '#f43f5e', 'Follow-up enviado', '06:54'],
        ['Renan Alcântara', 'RA', '#65a30d', 'Respondeu às 23:12', '06:40'],
      ],
      async run(tl, el) {
        const body = $('.mini__body', el), n = $('.mini__notif', el);
        body.querySelectorAll('.mini__row').forEach(r => r.remove());
        n.classList.remove('is-on');
        await tl.wait(500);
        for (const [name, ini, c, text, time] of this.rows) {
          const r = h('div', 'mini__row is-new', `<span class="avatar" style="--c:${c}">${ini}</span><div><b>${name}</b><span><span class="msg__ai">IA</span>${text}</span></div><em>${time}</em>`);
          body.append(r);
          await tl.wait(420);
        }
        await tl.wait(400); n.classList.add('is-on');
        await tl.wait(3800); n.classList.remove('is-on');
        await tl.wait(1800);
      },
    },
    agenda: {
      html: () => status('13:15') +
        `<div class="mini__bar"><strong>Agenda · hoje</strong><span class="tag">3 novas</span></div>
         <div class="mini__body">${notif('Nova consulta agendada pela IA', 'Otávio Ramos · hoje, 16:00')}
           <div class="mini__slot"><time>09:00</time><div class="mini__event"><b>Consulta · Lívia Martins</b><span>trabalhista · presencial</span></div></div>
           <div class="mini__slot"><time>11:00</time><div class="mini__event"><b>Retorno · Caio Nunes</b><span>videochamada</span></div></div>
           <div class="mini__slot"><time>14:00</time><div class="mini__empty"></div></div>
           <div class="mini__slot" data-new-slot><time>16:00</time><div class="mini__empty"></div></div>
           <div class="mini__slot"><time>17:30</time><div class="mini__event"><b>Reunião · Sabrina Melo</b><span>confirmada ✓</span></div></div>
         </div>`,
      async run(tl, el) {
        const n = $('.mini__notif', el), slot = $('[data-new-slot]', el);
        slot.innerHTML = '<time>16:00</time><div class="mini__empty"></div>';
        n.classList.remove('is-on');
        await tl.wait(900);
        n.classList.add('is-on');
        await tl.wait(700);
        slot.innerHTML = '<time>16:00</time><div class="mini__event mini__event--new is-new"><b>Consulta · Otávio Ramos</b><span>agendada pela IA · lembrete 1h antes</span></div>';
        await tl.wait(3200); n.classList.remove('is-on');
        await tl.wait(700);
        $('b', n).textContent = 'Lembrete enviado';
        $('span', n).textContent = 'Sabrina Melo confirmou presença · 17:30';
        n.classList.add('is-on');
        await tl.wait(3200); n.classList.remove('is-on');
        $('b', n).textContent = 'Nova consulta agendada pela IA';
        $('span', n).textContent = 'Otávio Ramos · hoje, 16:00';
        await tl.wait(1600);
      },
    },
    sales: {
      html: () => status('19:30') +
        `<div class="mini__bar"><strong>Vendas · hoje</strong><span class="tag tag--green">+2 ganhas</span></div>
         <div class="mini__body">${notif('Venda ganha · R$ 3.600', 'Contrato assinado por Grupo Aurora Eventos')}
           <div class="mini__big"><span>faturado hoje</span><strong data-sum>R$ 3.880</strong><em data-delta>+R$ 0 desde as 18h</em>
             <div class="mini__bars"><i style="--h:30%"></i><i style="--h:44%"></i><i style="--h:38%"></i><i style="--h:56%"></i><i style="--h:48%"></i><i style="--h:40%" data-bar></i></div>
           </div>
           <div class="mini__deal" data-deal><b>Grupo Aurora Eventos</b><span class="tag">contrato enviado</span><span>Formatura 2026 · 220 convidados</span><b>R$ 3.600</b></div>
           <div class="mini__deal"><b>Lívia Martins</b><span class="tag tag--green">ganho</span><span>Plano mensal</span><b>R$ 1.290</b></div>
         </div>`,
      async run(tl, el) {
        const n = $('.mini__notif', el), sum = $('[data-sum]', el), delta = $('[data-delta]', el);
        const deal = $('[data-deal]', el), bar = $('[data-bar]', el), tag = $('.tag', deal);
        n.classList.remove('is-on'); deal.classList.remove('is-won'); tag.className = 'tag'; tag.textContent = 'contrato enviado';
        sum.textContent = 'R$ 3.880'; delta.textContent = '+R$ 0 desde as 18h'; bar.style.setProperty('--h', '40%');
        await tl.wait(1100);
        tag.className = 'tag tag--purple'; tag.textContent = 'assinado ✓';
        await tl.wait(800);
        deal.classList.add('is-won'); tag.className = 'tag tag--green'; tag.textContent = 'ganho';
        n.classList.add('is-on');
        bar.style.setProperty('--h', '92%');
        await tl.tween(1200, p => {
          const v = Math.round(3880 + ease.out(p) * 3600);
          sum.textContent = 'R$ ' + v.toLocaleString('pt-BR');
          delta.textContent = '+R$ ' + Math.round(ease.out(p) * 3600).toLocaleString('pt-BR') + ' desde as 18h';
        });
        await tl.wait(3600); n.classList.remove('is-on');
        await tl.wait(1800);
      },
    },
  };

  function initScenes() {
    const scenes = $$('[data-scene]');
    scenes.forEach((sc, i) => {
      const el = $('[data-mini]', sc);
      const def = MINI[el.dataset.mini];
      el.innerHTML = def.html();
      if (reduceMotion) {
        if (def.rows) {
          const body = $('.mini__body', el);
          def.rows.forEach(([name, ini, c, text, time]) => body.append(h('div', 'mini__row', `<span class="avatar" style="--c:${c}">${ini}</span><div><b>${name}</b><span><span class="msg__ai">IA</span>${text}</span></div><em>${time}</em>`)));
        }
        return;
      }
      new Timeline(sc, {
        threshold: 0.4,
        onFirst: async tl => {
          await tl.wait(i * 450);
          for (;;) await def.run(tl, el);
        },
      });
    });
  }

  /* -------------------------------------------------- tudo em um */
  function initAllIn() {
    const stage = $('[data-allin]');
    if (!stage) return;
    const items = $$('.allin__tools li', stage);
    const btns = $$('[data-allin-set]');
    const mq = window.matchMedia('(max-width: 760px)');

    const layout = () => {
      const W = stage.clientWidth, H = stage.clientHeight;
      const cols = mq.matches ? 2 : 4;
      const rows = Math.ceil(items.length / cols);
      const pad = mq.matches ? 34 : 46, top = 22 + 46 + (mq.matches ? 16 : 24);
      const cw = (W - pad * 2) / cols, ch = (H - top - pad) / rows;
      items.forEach((li, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        li.style.setProperty('--aw', (cw - (mq.matches ? 8 : 18)) + 'px');
        li.style.setProperty('--ax', (pad + c * cw + 4) + 'px');
        li.style.setProperty('--ay', (top + r * ch + (ch - li.offsetHeight) / 2) + 'px');
        li.style.setProperty('--d', String(i));
      });
    };
    const set = state => {
      stage.classList.toggle('is-after', state === 'after');
      btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.allinSet === state)));
    };
    layout();
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 120); });
    if (document.fonts) document.fonts.ready.then(layout);
    btns.forEach(b => b.addEventListener('click', () => set(b.dataset.allinSet)));

    if (reduceMotion) { set('after'); return; }
    set('before');
    new Timeline(stage, {
      threshold: 0.45,
      onFirst: async tl => { await tl.wait(1100); if (!stage.dataset.touched) set('after'); },
    });
    btns.forEach(b => b.addEventListener('click', () => { stage.dataset.touched = '1'; }));
  }

  /* ----------------------------------------------------- dados */
  function initData() {
    const D = window.VERTI_DATA;
    if (!D) return;
    const list = $('[data-stats]');
    if (list && D.stats) {
      list.innerHTML = D.stats.map(s => `
        <li class="stat">
          <span class="stat__label">${esc(s.label)}</span>
          <span class="stat__num">${esc(s.num)}</span>
          <p class="stat__text">${esc(s.text)}</p>
          <span class="stat__bars" aria-hidden="true">${(s.bars || [30, 45, 60, 100]).map(v => `<i style="height:${v}%"></i>`).join('')}</span>
          <span class="stat__src">fonte: ${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.source)}</a>` : esc(s.source)}</span>
        </li>`).join('');
    }
    if (D.fill) {
      Object.entries(D.fill).forEach(([k, v]) => {
        $$(`[data-fill="${k}"]`).forEach(el => { el.innerHTML = v; });
      });
    }
  }

  /* ---------------------------------------------------- formulário */
  function initForm() {
    const form = $('[data-lead-form]');
    if (!form) return;
    const err = $('[data-form-error]', form);
    const tel = $('#f-whats', form);
    tel.addEventListener('input', () => {
      const d = tel.value.replace(/\D/g, '').slice(0, 11);
      let v = d;
      if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
      if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
      tel.value = v;
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const nome = (f.nome || '').trim();
      const digits = (f.whatsapp || '').replace(/\D/g, '');
      $$('input', form).forEach(i => i.removeAttribute('aria-invalid'));
      let msg = '';
      if (!nome) { msg = 'Digite seu nome para continuar.'; $('#f-nome', form).setAttribute('aria-invalid', 'true'); }
      else if (digits.length < 10) { msg = 'Digite um WhatsApp com DDD, por exemplo (11) 98765-4321.'; tel.setAttribute('aria-invalid', 'true'); }
      if (msg) { err.textContent = msg; err.hidden = false; return; }
      err.hidden = true;
      const parts = [`Olá! Sou ${nome}${f.empresa ? `, da ${f.empresa.trim()}` : ''}.`, 'Quero agendar uma demonstração da Vertisell.'];
      if (f.segmento) parts.push(`Segmento: ${f.segmento}.`);
      if (f.leads) parts.push(`Leads por mês: ${f.leads}.`);
      parts.push(`Meu WhatsApp: ${f.whatsapp}.`);
      openExternal(waLink(parts.join(' ')));
    });
  }

  /* ------------------------------------------------------------ init */
  function init() {
    initWaLinks();
    initNav();
    initRotator();
    initHero();
    initRace();
    initOrbit();
    initCall();
    initFollowUp();
    initOmni();
    initScenes();
    initAllIn();
    initData();
    initForm();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VertisellPage = { CONFIG, waLink };
})();

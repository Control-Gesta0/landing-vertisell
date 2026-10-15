/* =========================================================================
   Vertisell — calculadora de ROI
   Modelo conservador e transparente. Premissas em ROI_MODEL, baseadas nas
   fontes de data.js (HBR 2011, InsideSales/MIT 2007, Velocify 2012,
   BMJ Open 2016, Salesforce 2026, McKinsey 2023). Elas aparecem para o
   visitante em "como calculamos".
   ========================================================================= */
(() => {
  'use strict';

  const ROI_MODEL = {
    // responder em segundos multiplica a qualificação conforme o tempo de resposta de hoje
    speed: {
      '5min': { label: 'até 5 min', mult: 1.00 },
      '1h': { label: 'até 1 hora', mult: 1.10 },
      'horas': { label: 'algumas horas', mult: 1.20 },
      'dia': { label: 'no dia seguinte', mult: 1.30 },
    },
    // follow-up automático: 10% dos que não responderam voltam, qualificando com metade da taxa
    follow: {
      'nunca': { label: 'quase nunca', lift: 0.05 },
      'asvezes': { label: 'às vezes', lift: 0.025 },
      'sempre': { label: 'sempre', lift: 0 },
    },
    // lembretes: faltas caem 20% (estudos medem 25%); com 21% de faltas, ≈ +5% de reuniões realizadas
    remind: {
      'nao': { label: 'não envio', lift: 0.05 },
      'sim': { label: 'já envio', lift: 0 },
    },
    hoursPerPersonWeek: 2,  // tempo devolvido por pessoa do comercial
    mckinseyHigh: 0.15,     // acima disso, avisar (faixa de 3–15% da McKinsey)
    plans: [
      { name: 'Verti Sales', price: 397, maxUsers: 10 },
      { name: 'Verti Pro', price: 597, maxUsers: 50 },
      { name: 'Verti Enterprise', price: 997, maxUsers: Infinity },
    ],
  };

  const root = document.querySelector('[data-roi]');
  if (!root) return;

  const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const INT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
  const fmtBRL = v => BRL.format(Math.round(v)).replace(/ /g, ' ');
  const fmtShort = v => {
    if (v >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    if (v >= 1e4) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return fmtBRL(v);
  };
  const pct = v => (Math.round(v * 1000) / 10).toLocaleString('pt-BR') + '%';

  const state = { leads: 300, conv: 8, ticket: 2000, margin: 40, speed: 'horas', follow: 'asvezes', remind: 'nao', team: 4 };

  const LABELS = { speed: 'Tempo da primeira resposta hoje', follow: 'Follow-up hoje', remind: 'Lembrete de reunião hoje' };
  const seg = name => `
    <div class="roi-seg" role="radiogroup" aria-label="${LABELS[name]}">
      ${Object.entries(ROI_MODEL[name]).map(([k, o]) => `<button type="button" role="radio" aria-checked="${state[name] === k}" data-seg="${name}" data-val="${k}">${o.label}</button>`).join('')}
    </div>`;
  const range = (id, key, label, min, max, step) => `
    <div class="roi-field">
      <div class="roi-field__top"><label for="roi-${id}">${label}</label><output class="mono" data-out="${key}" for="roi-${id}"></output></div>
      <input type="range" id="roi-${id}" min="${min}" max="${max}" step="${step}" data-in="${key}">
    </div>`;

  root.innerHTML = `
    <div class="roi__inputs">
      ${range('leads', 'leads', 'leads por mês', 20, 3000, 10)}
      ${range('conv', 'conv', 'quantos viram venda hoje', 1, 40, 0.5)}
      <div class="roi-field">
        <div class="roi-field__top"><label for="roi-ticket-num">ticket médio</label>
          <span class="roi-money"><span>R$</span><input type="text" inputmode="numeric" id="roi-ticket-num" data-ticket-num></span>
        </div>
        <input type="range" id="roi-ticket" min="100" max="20000" step="100" data-in="ticket" aria-label="Ticket médio">
      </div>
      ${range('margin', 'margin', 'margem bruta', 10, 90, 1)}
      <div class="roi-field"><div class="roi-field__top"><span class="roi-label">primeira resposta hoje</span></div>${seg('speed')}</div>
      <div class="roi-field"><div class="roi-field__top"><span class="roi-label">follow-up hoje</span></div>${seg('follow')}</div>
      <div class="roi-field"><div class="roi-field__top"><span class="roi-label">lembrete de reunião hoje</span></div>${seg('remind')}</div>
      ${range('team', 'team', 'pessoas no comercial', 1, 60, 1)}
    </div>

    <div class="roi__result">
      <p class="roi__kicker">receita que fica na mesa por mês</p>
      <p class="roi__big mono" data-r="gain" aria-live="polite">R$ 0</p>
      <p class="roi__sub" data-r="gainSub"></p>
      <p class="roi__warn" data-r="warn" hidden></p>

      <div class="roi__kpis">
        <div><span class="roi__kpi mono" data-r="mult">0x</span><span>retorno sobre o plano, em lucro bruto</span></div>
        <div><span class="roi__kpi mono" data-r="payback">0 dias</span><span>para o plano se pagar</span></div>
        <div><span class="roi__kpi mono" data-r="hours">0 h</span><span>devolvidas ao time por mês</span></div>
      </div>

      <div class="roi__bars" aria-hidden="true">
        <div class="roi__bar"><span>investimento no plano em 12 meses</span><i data-r="barCost"></i><b class="mono" data-r="cost12"></b></div>
        <div class="roi__bar roi__bar--gain"><span>lucro bruto adicional em 12 meses</span><i data-r="barGain"></i><b class="mono" data-r="gain12"></b></div>
      </div>

      <div class="roi__plan">
        <span>plano sugerido</span>
        <strong data-r="plan">Verti Sales · R$ 397/mês</strong>
        <a class="btn btn--sm btn--primary" href="#planos">ver planos</a>
      </div>

      <details class="roi__how">
        <summary>como calculamos</summary>
        <div data-r="how"></div>
      </details>
    </div>`;

  const q = s => root.querySelector(s);
  const qa = s => Array.from(root.querySelectorAll(s));
  const inputs = Object.fromEntries(qa('[data-in]').map(i => [i.dataset.in, i]));
  const ticketNum = q('[data-ticket-num]');
  const paint = el => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
  const suggestPlan = team => ROI_MODEL.plans.find(p => team <= p.maxUsers);

  function compute() {
    const s = state, M = ROI_MODEL;
    const salesNow = s.leads * (s.conv / 100);
    const revNow = salesNow * s.ticket;
    const mult = M.speed[s.speed].mult * (1 + M.follow[s.follow].lift) * (1 + M.remind[s.remind].lift);
    const lift = mult - 1;
    const gain = revNow * lift;
    const profit = gain * (s.margin / 100);
    const plan = suggestPlan(s.team);
    const roi = profit / plan.price;
    const paybackDays = profit > 0 ? Math.max(1, Math.ceil(plan.price / (profit / 30))) : Infinity;
    const hours = s.team * M.hoursPerPersonWeek * 52 / 12;
    return { salesNow, revNow, lift, gain, profit, plan, roi, paybackDays, hours, extraSales: salesNow * lift };
  }

  function render() {
    const r = compute();
    const set = (k, v) => { const el = q(`[data-r="${k}"]`); if (el) el.textContent = v; };
    q('[data-out="leads"]').textContent = INT.format(state.leads);
    q('[data-out="conv"]').textContent = state.conv.toLocaleString('pt-BR') + '%';
    q('[data-out="margin"]').textContent = state.margin + '%';
    q('[data-out="team"]').textContent = state.team + (state.team === 1 ? ' pessoa' : ' pessoas');
    if (document.activeElement !== ticketNum) ticketNum.value = INT.format(state.ticket);

    set('gain', fmtBRL(r.gain));
    if (r.lift > 0) {
      const extra = r.extraSales < 1 ? 'menos de 1 venda' : `cerca de ${INT.format(Math.round(r.extraSales))} ${Math.round(r.extraSales) === 1 ? 'venda' : 'vendas'}`;
      set('gainSub', `Hoje: ${fmtShort(r.revNow)}/mês com ${INT.format(r.salesNow)} vendas. Respondendo em segundos, com follow-up e lembretes: +${pct(r.lift)} nas vendas, ${extra} a mais por mês.`);
    } else {
      set('gainSub', 'Sua operação já responde rápido, faz follow-up e envia lembretes. Aqui o ganho da Vertisell vem do tempo devolvido ao time e da IA atendendo fora do horário.');
    }
    const warn = q('[data-r="warn"]');
    warn.hidden = !(r.lift > ROI_MODEL.mckinseyHigh);
    warn.textContent = `Ganho acima da média de 3% a 15% que a McKinsey observou em empresas que já investem em IA em vendas. Ele aparece quando hoje a resposta demora e o follow-up falha, que é onde a IA mais recupera.`;
    set('mult', r.roi <= 0 ? '—' : (r.roi >= 100 ? '100x+' : (r.roi >= 10 ? INT.format(r.roi) : r.roi.toLocaleString('pt-BR', { maximumFractionDigits: 1 })) + 'x'));
    set('payback', r.paybackDays === Infinity ? '—' : r.paybackDays + (r.paybackDays === 1 ? ' dia' : ' dias'));
    set('hours', INT.format(r.hours) + ' h');
    const cost12 = r.plan.price * 12, gain12 = Math.max(0, r.profit * 12);
    set('cost12', fmtShort(cost12));
    set('gain12', fmtShort(gain12));
    const max = Math.max(cost12, gain12) || 1;
    q('[data-r="barCost"]').style.width = Math.max(2, cost12 / max * 100) + '%';
    q('[data-r="barGain"]').style.width = Math.max(2, gain12 / max * 100) + '%';
    set('plan', `${r.plan.name} · ${fmtBRL(r.plan.price)}/mês`);
    q('[data-r="how"]').innerHTML = howText(r);
  }

  function howText(r) {
    const M = ROI_MODEL;
    const src = (window.VERTI_DATA && window.VERTI_DATA.roiSources) || [];
    const n = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    return `
      <ol>
        <li><b>Receita de hoje</b> = leads × taxa de venda × ticket médio = ${fmtBRL(r.revNow)}/mês.</li>
        <li><b>Velocidade</b>: responder em segundos multiplica a qualificação por ${n(M.speed['1h'].mult)} (hoje até 1 h), ${n(M.speed.horas.mult)} (algumas horas) ou ${n(M.speed.dia.mult)} (dia seguinte). Os estudos mediram efeitos bem maiores, de 7x (HBR) e 21x (InsideSales/MIT). Usamos só uma fração.</li>
        <li><b>Follow-up</b>: supomos que 10% dos leads que não responderam voltam a conversar e qualificam com metade da taxa normal. Isso dá +5% (quase nunca faz follow-up) ou +2,5% (às vezes). Pela Velocify, mais da metade dos leads que compram só responde depois da 1ª tentativa.</li>
        <li><b>Lembretes</b>: consideramos 20% menos faltas (os estudos medem 25%), o que dá cerca de +5% de reuniões realizadas quando hoje não há lembrete.</li>
        <li><b>Retorno e prazo</b> usam lucro bruto (receita adicional × margem), não a receita.</li>
        <li><b>Horas devolvidas</b> = ${M.hoursPerPersonWeek} h por semana por pessoa do comercial. Pela Salesforce, o vendedor médio passa só 40% do tempo vendendo.</li>
        <li><b>Plano</b>: a IA de atendimento entra a partir do Verti Sales. O plano sugerido segue o número de pessoas no comercial.</li>
      </ol>
      ${src.length ? `<p class="roi__src">Fontes: ${src.map(s => s.url ? `<a href="${s.url}" target="_blank" rel="noopener">${s.name}</a>` : s.name).join(' · ')}</p>` : ''}
      <p class="roi__disclaimer">Estimativa ilustrativa, não é promessa de resultado. Não inclui tarifas de mensagens do WhatsApp cobradas pela Meta, quando houver. O efeito real depende da oferta, do time e do volume de leads.</p>`;
  }

  // ligações
  Object.entries(inputs).forEach(([k, el]) => {
    el.value = state[k];
    paint(el);
    el.addEventListener('input', () => { state[k] = parseFloat(el.value); paint(el); render(); });
  });
  ticketNum.addEventListener('input', () => {
    const v = parseInt(ticketNum.value.replace(/\D/g, ''), 10);
    if (!isNaN(v)) {
      state.ticket = Math.max(1, Math.min(10000000, v));
      inputs.ticket.value = Math.min(20000, Math.max(100, state.ticket));
      paint(inputs.ticket);
      render();
    }
  });
  ticketNum.addEventListener('blur', () => { ticketNum.value = INT.format(state.ticket); });

  qa('.roi-seg').forEach(g => {
    const btns = Array.from(g.querySelectorAll('button'));
    const sync = () => btns.forEach(b => { b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1; });
    btns.forEach(b => b.addEventListener('click', () => {
      state[b.dataset.seg] = b.dataset.val;
      btns.forEach(x => x.setAttribute('aria-checked', String(x === b)));
      sync();
      render();
    }));
    g.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault();
      const i = btns.findIndex(b => b.getAttribute('aria-checked') === 'true');
      const nb = btns[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + btns.length) % btns.length];
      nb.click(); nb.focus();
    });
    sync();
  });

  render();
  window.VertisellROI = { ROI_MODEL, state, render };
})();

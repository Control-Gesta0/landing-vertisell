/* =========================================================================
   Vertisell — números com fonte (seção "o que as pesquisas já mostraram",
   trechos da seção de follow-up e base da calculadora de ROI).
   Todos conferidos na fonte original em out/2026. Edite aqui: o restante
   da página lê deste arquivo.
   ========================================================================= */
window.VERTI_DATA = {
  stats: [
    {
      label: 'atendimento rápido', num: '21x',
      text: 'mais chance de qualificar o lead quando o contato acontece em 5 minutos, em vez de 30.',
      source: 'InsideSales.com e MIT, Lead Response Management Study, 2007 (EUA)',
      url: 'https://www.mortech.com/hs-fs/hub/25649/file-13535879-pdf/docs/mit_study.pdf',
      bars: [8, 14, 26, 100],
    },
    {
      label: 'follow-up', num: '93%',
      text: 'dos leads que viraram venda foram alcançados até a 6ª tentativa de contato. Mais da metade, só depois da primeira.',
      source: 'Velocify, The Ultimate Contact Strategy, 2012 (EUA)',
      url: 'https://www.slideshare.net/Velocify/the-ultimate-contact-strategy',
      bars: [30, 52, 74, 93],
    },
    {
      label: 'reuniões', num: '-25%',
      text: 'de faltas com lembretes digitais: a taxa caiu de 21% para 15% em 21 estudos (área da saúde).',
      source: 'Robotham et al., BMJ Open, 2016',
      url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5093388/',
      bars: [100, 72],
    },
    {
      label: 'faturamento', num: '3–15%',
      text: 'de aumento de receita em empresas que investem em IA no marketing e nas vendas.',
      source: 'McKinsey, 2023',
      url: 'https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/ai-powered-marketing-and-sales-reach-new-heights-with-generative-ai',
      bars: [20, 45, 70, 100],
    },
    {
      label: 'ia em vendas', num: '83%',
      text: 'das equipes de vendas que usam IA aumentaram a receita no último ano. Entre as que não usam, 66% (pesquisa com 5.500 profissionais).',
      source: 'Salesforce, State of Sales, 2024',
      url: 'https://www.salesforce.com/news/stories/sales-ai-statistics-2024/',
      bars: [66, 83],
    },
    {
      label: 'whatsapp no brasil', num: '79,5%',
      text: 'dos usuários de WhatsApp conversaram com empresas pelo app nos últimos 12 meses.',
      source: 'Mobile Time e Opinion Box, 2026',
      url: 'https://www.mobiletime.com.br/noticias/23/06/2026/whatsapp-respostas/',
      bars: [40, 58, 70, 80],
    },
  ],

  // trechos com número citados em outras seções (seletor [data-fill="..."])
  fill: {
    'fu-fact': '<strong>Metade dos leads</strong> nunca recebe uma segunda tentativa de contato, e mais da metade dos que viram venda só respondem depois da primeira.<small>fonte: Velocify, The Ultimate Contact Strategy, 2012 (EUA)</small>',
  },

  // fontes listadas em "como calculamos" na calculadora de ROI
  roiSources: [
    { name: 'Harvard Business Review, 2011', url: 'https://hbr.org/2011/03/the-short-life-of-online-sales-leads' },
    { name: 'InsideSales.com e MIT, 2007', url: 'https://www.mortech.com/hs-fs/hub/25649/file-13535879-pdf/docs/mit_study.pdf' },
    { name: 'Velocify, 2012', url: 'https://www.slideshare.net/Velocify/the-ultimate-contact-strategy' },
    { name: 'BMJ Open, 2016', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC5093388/' },
    { name: 'Salesforce, State of Sales, 2026', url: 'https://www.salesforce.com/news/stories/state-of-sales-report-announcement-2026/' },
    { name: 'McKinsey, 2023', url: 'https://www.mckinsey.com/capabilities/growth-marketing-and-sales/our-insights/ai-powered-marketing-and-sales-reach-new-heights-with-generative-ai' },
  ],
};

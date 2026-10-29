// Página "Histórico". Depende de catalog.js e common.js.

// ---------- Métricas por treino (cargas sempre em kg; converte só na exibição) ----------
// kind: 'weight' (kg/lb), 'reps' ou 'time' (segundos) — define unidade e formatação.
// 1RM estimado pela fórmula de Epley: carga × (1 + reps / 30)
const sumOf = (entries, fn) => entries.reduce((total, e) => total + fn(e), 0);
const METRICS = {
  e1rm: {
    title: '1RM estimado', short: '1RM est.', kind: 'weight',
    value: entries => Math.max(...entries.map(e => e.weight * (1 + e.reps / 30))),
    note: '1RM estimado = carga × (1 + reps ÷ 30), fórmula de Epley. Junta carga e reps num número só.',
  },
  maxLoad: {
    title: 'Carga máxima', short: 'Carga', kind: 'weight',
    value: entries => maxWeight(entries),
    note: 'Maior carga usada no treino, sem considerar as reps.',
  },
  volume: {
    title: 'Volume', short: 'Volume', kind: 'weight', compact: true,
    value: entries => sumOf(entries, e => e.weight * e.sets * e.reps),
    note: 'Volume = carga × vezes × reps. Sobe com mais séries, não só com mais força.',
  },
  bestReps: {
    title: 'Máximo de reps', short: 'Reps', kind: 'reps',
    value: entries => Math.max(...entries.map(e => e.reps)),
    note: 'Mais repetições feitas numa série do treino.',
  },
  totalReps: {
    title: 'Reps totais', short: 'Total', kind: 'reps',
    value: entries => sumOf(entries, e => e.sets * e.reps),
    note: 'Soma das repetições do treino (vezes × reps).',
  },
  bestTime: {
    title: 'Maior tempo', short: 'Tempo', kind: 'time',
    value: entries => Math.max(...entries.map(e => e.reps)),
    note: 'Série mais longa do treino.',
  },
  totalTime: {
    title: 'Tempo total', short: 'Total', kind: 'time',
    value: entries => sumOf(entries, e => e.sets * e.reps),
    note: 'Soma do tempo de todas as séries do treino (vezes × segundos).',
  },
};

// O que cada medida mostra: gráfico (opções), indicadores, colunas da tabela e o que conta como recorde
const VIEWS = {
  load: {
    chart: ['e1rm', 'maxLoad', 'volume'],
    stats: [['Maior carga', 'maxLoad'], ['Melhor 1RM est.', 'e1rm']],
    table: ['maxLoad', 'volume'],
  },
  bodyweight: {
    chart: ['bestReps', 'totalReps'],
    stats: [['Máx. reps', 'bestReps'], ['Maior lastro', 'maxLoad']],
    table: ['bestReps', 'totalReps'],
  },
  time: {
    chart: ['bestTime', 'totalTime'],
    stats: [['Maior tempo', 'bestTime'], ['Maior carga', 'maxLoad']],
    table: ['bestTime', 'totalTime'],
  },
};
const viewOf = ex => VIEWS[measureOf(ex)];

const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const longDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });

// Valor no eixo do gráfico: carga convertida para kg/lb; reps e segundos como estão
const chartValue = (key, entries) => {
  const v = METRICS[key].value(entries);
  return METRICS[key].kind === 'weight' ? toUnit(v) : v;
};

const unitOf = key => ({ weight: unit, reps: 'reps', time: 's' })[METRICS[key].kind];

// Texto de uma métrica: "40 kg", "1,2 mil" (volume), "12", "1 min 30 s"; sem carga → "—"
function formatMetric(key, entries) {
  const metric = METRICS[key];
  const v = metric.value(entries);
  if (metric.kind === 'time') return formatSeconds(v);
  if (metric.kind === 'reps') return number.format(v);
  if (!v && key === 'maxLoad') return '—';
  return metric.compact ? compact.format(toUnit(v)) : withUnit(v);
}

// Histórico + registros de hoje, do mais antigo para o mais recente
function sessionsOf(ex) {
  const sessions = [...historyOf(ex.id)];
  if (todayEntries(ex.id).length) sessions.unshift({ date: todayISO(), entries: todayEntries(ex.id) });
  return sessions.slice().reverse();
}

// ---------- Estado ----------
let selected = null;
let metric = 'e1rm';

// ---------- Escolha do exercício ----------
const picker = document.getElementById('picker');
const emptyMessage = document.getElementById('empty');
const detail = document.getElementById('detail');

// Exercícios com algum registro (histórico ou hoje); ?ex= abre um específico, mesmo sem registro
function buildPicker() {
  const logged = allExercises.filter(ex => historyOf(ex.id).length || todayEntries(ex.id).length);
  const requested = exerciseById(new URLSearchParams(location.search).get('ex'));
  if (requested && !logged.includes(requested)) logged.unshift(requested);
  const sorted = sortByFavorite(logged);

  for (const ex of sorted) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'pick';
    btn.dataset.id = ex.id;
    if (isFavorite(ex.id)) {
      const star = document.createElement('span');
      star.className = 'pick-star';
      star.setAttribute('aria-label', 'Favorito');
      star.textContent = '★';
      btn.append(star);
    }
    btn.append(ex.name);
    btn.addEventListener('click', () => select(ex));
    picker.append(btn);
  }
  return requested ?? sorted[0];
}

enableWheelScroll(picker);

function select(ex) {
  selected = ex;
  picker.querySelectorAll('.pick').forEach(btn => {
    const active = btn.dataset.id === ex.id;
    btn.setAttribute('aria-pressed', active);
    if (active) btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  history.replaceState(null, '', `?ex=${ex.id}`);
  render();
}

searchListeners.push(query => {
  const visible = [];
  picker.querySelectorAll('.pick').forEach(btn => {
    const ex = exerciseById(btn.dataset.id);
    const match = matchesQuery(ex, query);
    btn.hidden = !match;
    if (match) visible.push(ex);
  });
  emptyMessage.hidden = visible.length > 0;
  detail.hidden = visible.length === 0;
  if (visible.length && !visible.includes(selected)) select(visible[0]);
});

// ---------- Métrica (botões conforme a medida do exercício) ----------
const metricToggle = document.getElementById('metric-toggle');

function renderMetricButtons() {
  const keys = viewOf(selected).chart;
  if (!keys.includes(metric)) metric = keys[0];
  metricToggle.replaceChildren(...keys.map(key => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = METRICS[key].short;
    btn.setAttribute('aria-pressed', key === metric);
    btn.addEventListener('click', () => {
      metric = key;
      render();
    });
    return btn;
  }));
}

// ---------- Renderização ----------
function render() {
  const sessions = sessionsOf(selected);
  const all = sessions.flatMap(s => s.entries);

  const view = viewOf(selected);

  document.getElementById('ex-name').textContent = selected.name;
  document.getElementById('ex-muscles').textContent = musclesLabel(selected);
  view.stats.forEach(([label, key], i) => {
    const id = i === 0 ? 'stat-a' : 'stat-b';
    document.getElementById(`${id}-label`).textContent = label;
    document.getElementById(id).textContent = all.length ? formatMetric(key, all) : '—';
  });
  document.getElementById('stat-count').textContent = sessions.length;
  document.getElementById('col-a').textContent = METRICS[view.table[0]].title;
  document.getElementById('col-b').textContent = METRICS[view.table[1]].title;

  renderMetricButtons();
  document.getElementById('chart-title').textContent = `${METRICS[metric].title} (${unitOf(metric)}) por treino`;
  document.getElementById('chart-note').textContent = METRICS[metric].note;

  renderTable(sessions);
  drawChart(sessions);
}

function renderTable(sessions) {
  const body = document.getElementById('sessions-body');
  body.replaceChildren();
  if (!sessions.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 4;
    cell.className = 'muted';
    cell.textContent = 'Nenhum treino registrado ainda.';
    return;
  }

  // Recorde = primeira coluna (carga máxima, reps ou tempo) maior que em todos os treinos anteriores
  const [colA, colB] = viewOf(selected).table;
  let best = -Infinity;
  const records = new Set();
  sessions.forEach((s, i) => {
    const value = METRICS[colA].value(s.entries);
    if (i > 0 && value > best) records.add(s);
    best = Math.max(best, value);
  });

  for (const s of [...sessions].reverse()) {
    const row = body.insertRow();

    const dateCell = row.insertCell();
    dateCell.textContent = s.date === todayISO() ? 'Hoje' : shortDate.format(parseDate(s.date));

    const entriesCell = row.insertCell();
    entriesCell.textContent = s.entries.map(e => formatEntry(e, selected)).join(', ');

    const cellA = row.insertCell();
    cellA.className = 'num';
    cellA.textContent = formatMetric(colA, s.entries);
    if (records.has(s)) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = 'recorde';
      cellA.append(' ', badge);
    }

    const cellB = row.insertCell();
    cellB.className = 'num';
    cellB.textContent = formatMetric(colB, s.entries);
  }
}

// ---------- Gráfico (SVG, uma série) ----------
const chart = document.getElementById('chart');
const svg = document.getElementById('chart-svg');
const tooltip = document.getElementById('chart-tooltip');
const SVG_NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent = svg) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  parent.append(node);
  return node;
}

// Divisões "redondas" para o eixo Y (1, 2, 2,5, 5 × 10^n)
function niceScale(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(f => f * mag).find(s => s >= raw);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Number(t.toFixed(6)));
  return { lo, hi, ticks };
}

const formatTick = v => (Math.abs(v) >= 1000 ? compact.format(v) : number.format(v));

function drawChart(sessions) {
  svg.replaceChildren();
  tooltip.hidden = true;

  const width = chart.clientWidth;
  const height = 220;
  const m = { top: 24, right: 16, bottom: 28, left: 40 };
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);

  if (!sessions.length) {
    el('text', { x: width / 2, y: height / 2, class: 'chart-empty', 'text-anchor': 'middle' }).textContent = 'Sem treinos ainda';
    svg.setAttribute('aria-label', 'Sem treinos ainda');
    return;
  }

  const points = sessions.map(s => ({
    session: s,
    date: parseDate(s.date),
    value: chartValue(metric, s.entries),
  }));

  // Escalas
  const t0 = points[0].date.getTime();
  const t1 = points.at(-1).date.getTime();
  const x = t => (t1 === t0
    ? m.left + (width - m.left - m.right) / 2
    : m.left + ((t - t0) / (t1 - t0)) * (width - m.left - m.right));
  const values = points.map(p => p.value);
  const { lo, hi, ticks } = niceScale(Math.min(...values), Math.max(...values));
  const y = v => m.top + (1 - (v - lo) / (hi - lo)) * (height - m.top - m.bottom);
  points.forEach(p => { p.x = x(p.date.getTime()); p.y = y(p.value); });

  // Grade e eixo Y
  for (const t of ticks) {
    el('line', { x1: m.left, x2: width - m.right, y1: y(t), y2: y(t), class: 'chart-grid' });
    el('text', { x: m.left - 8, y: y(t), class: 'chart-axis', 'text-anchor': 'end', 'dominant-baseline': 'middle' }).textContent = formatTick(t);
  }

  // Eixo X: primeira, última e (se couber) a do meio
  const labelIdx = [...new Set([0, points.length > 2 && width > 360 ? Math.floor((points.length - 1) / 2) : 0, points.length - 1])];
  for (const i of labelIdx) {
    const anchor = points.length === 1 ? 'middle' : i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
    el('text', { x: points[i].x, y: height - 8, class: 'chart-axis', 'text-anchor': anchor }).textContent = shortDate.format(points[i].date);
  }

  // Área (wash) + linha
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  if (points.length > 1) {
    const base = height - m.bottom;
    el('path', { d: `${line} L${points.at(-1).x},${base} L${points[0].x},${base} Z`, class: 'chart-area' });
    el('path', { d: line, class: 'chart-line' });
  }

  const cross = el('line', { y1: m.top, y2: height - m.bottom, class: 'chart-cross', visibility: 'hidden' });

  for (const p of points) el('circle', { cx: p.x, cy: p.y, r: 4, class: 'chart-dot' });

  // Rótulos seletivos: o último ponto e o melhor (se forem diferentes)
  const best = points.reduce((a, b) => (b.value > a.value ? b : a));
  const last = points.at(-1);
  const labelPoint = (p, text) => {
    const anchor = p.x > width - 60 ? 'end' : p.x < m.left + 40 ? 'start' : 'middle';
    el('text', { x: p.x, y: p.y - 10, class: 'chart-label', 'text-anchor': anchor }).textContent = text;
  };
  if (best === last) {
    labelPoint(last, `${number.format(last.value)} · recorde`);
  } else {
    labelPoint(best, `${number.format(best.value)} · recorde`);
    labelPoint(last, number.format(last.value));
  }

  const hover = el('circle', { r: 6, class: 'chart-dot chart-dot-hover', visibility: 'hidden' });

  svg.setAttribute('aria-label',
    `${METRICS[metric].title} em ${unitOf(metric)}: de ${number.format(points[0].value)} em ${shortDate.format(points[0].date)} ` +
    `a ${number.format(last.value)} em ${shortDate.format(last.date)}. Recorde ${number.format(best.value)}.`);

  // Hover / toque: ponto mais próximo no eixo X
  const overlay = el('rect', { x: 0, y: 0, width, height, fill: 'transparent' });
  const show = event => {
    const rect = svg.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const p = points.reduce((a, b) => (Math.abs(b.x - px) < Math.abs(a.x - px) ? b : a));

    cross.setAttribute('x1', p.x);
    cross.setAttribute('x2', p.x);
    cross.setAttribute('visibility', 'visible');
    hover.setAttribute('cx', p.x);
    hover.setAttribute('cy', p.y);
    hover.setAttribute('visibility', 'visible');

    tooltip.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = longDate.format(p.date);
    const value = document.createElement('span');
    value.textContent = `${METRICS[metric].title}: ${number.format(p.value)} ${unitOf(metric)}`;
    const entries = document.createElement('span');
    entries.className = 'muted';
    entries.textContent = p.session.entries.map(e => formatEntry(e, selected)).join(', ');
    tooltip.append(title, value, entries);
    tooltip.hidden = false;

    const tipWidth = tooltip.offsetWidth;
    const left = Math.min(Math.max(p.x - tipWidth / 2, 0), width - tipWidth);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(p.y - tooltip.offsetHeight - 14, 0)}px`;
  };
  const hide = () => {
    cross.setAttribute('visibility', 'hidden');
    hover.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  };
  overlay.addEventListener('pointermove', show);
  overlay.addEventListener('pointerdown', show);
  overlay.addEventListener('pointerleave', hide);
}

appReady.then(() => {
  const first = buildPicker();
  if (!first) {
    // Nenhum registro ainda: só a mensagem
    emptyMessage.textContent = 'Nenhum treino registrado ainda. Registre séries no Painel para ver a evolução.';
    emptyMessage.hidden = false;
    detail.hidden = true;
    return;
  }

  unitListeners.push(render);
  select(first);

  // Redesenha só quando a largura muda de fato (girar o celular, redimensionar)
  let lastWidth = chart.clientWidth;
  new ResizeObserver(() => {
    if (chart.clientWidth !== lastWidth) {
      lastWidth = chart.clientWidth;
      drawChart(sessionsOf(selected));
    }
  }).observe(chart);
});

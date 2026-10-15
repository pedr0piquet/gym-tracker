// Código compartilhado entre as páginas: configurações, preferências, dados,
// unidade, tema, busca, favoritos, formatação e o seletor de exercícios.
// Depende de catalog.js e mock_user.js.

// ---------- Configurações (ajuste aqui) ----------
const SETTINGS = {
  restSeconds: 30,         // descanso recomendado (o exercício pode sobrescrever com `rest`)
  lbPerKg: 2.20462,
  maxFavorites: 3,
  maxPresets: 5,           // treinos fixos por usuário
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ---------- Preferências ----------
function loadPref(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function savePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* sem storage: vale só nesta visita */ }
}
function loadJSON(key) {
  try { return JSON.parse(loadPref(key)); } catch { return null; }
}
const saveJSON = (key, value) => savePref(key, JSON.stringify(value));

// ---------- Datas ----------
const parseDate = iso => new Date(iso + 'T00:00:00');

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Exercícios (catálogo do site + criados pelo usuário) ----------
const allExercises = [...CATALOG, ...mockCustomExercises];
const exerciseById = id => allExercises.find(ex => ex.id === id);
const historyOf = id => mockHistory[id] ?? [];
const musclesLabel = ex => ex.muscles.map(m => MUSCLES[m]).join(' · ');

// Sem acento e minúsculo: "elevacao" encontra "Elevação"
const normalize = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Busca por nome ou por músculo ("peito", "triceps", "posterior"…)
function matchesQuery(ex, query) {
  if (!query) return true;
  return normalize(ex.name).includes(query) || ex.muscles.some(m => normalize(MUSCLES[m]).includes(query));
}

// Animação de 2 quadros, ou o ícone de halter quando não há imagem
function fillThumb(thumb, ex) {
  if (!ex.media) return;
  thumb.querySelector('.frame-start').src = `media/${ex.media}-0.jpg`;
  thumb.querySelector('.frame-end').src = `media/${ex.media}-1.jpg`;
}

function thumbElement(ex, className = 'thumb') {
  const thumb = document.createElement('span');
  thumb.className = className;
  thumb.innerHTML = `
    <svg class="thumb-fallback" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
      <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>
    </svg>
    <img class="frame frame-start" alt="" loading="lazy">
    <img class="frame frame-end" alt="" loading="lazy">`;
  fillThumb(thumb, ex);
  return thumb;
}

// ---------- Treinos fixos (máx. SETTINGS.maxPresets) ----------
let presets = loadJSON('presets') ?? structuredClone(mockPresets);
const savePresets = () => saveJSON('presets', presets);
const presetById = id => presets.find(p => p.id === id);
const describeDays = days => (days.length ? [...days].sort().map(d => DAYS[d]).join(' · ') : 'Sem dia fixo');

// ---------- Treino de hoje (vale só para a data de hoje) ----------
// { date, presetId, extras: [ids avulsos], entries: { id: [registros] } }
let today = loadJSON('today');
if (today?.date !== todayISO()) {
  const weekday = new Date().getDay();
  today = {
    date: todayISO(),
    presetId: presets.find(p => p.days.includes(weekday))?.id ?? null,
    ...structuredClone(mockToday),
  };
  saveJSON('today', today);
}
const saveToday = () => saveJSON('today', today);
const todayEntries = id => today.entries[id] ?? [];

// Treino fixo escolhido + avulsos + o que já tem registro hoje, sem repetir
function todayExerciseIds() {
  const fromPreset = presetById(today.presetId)?.exercises ?? [];
  return [...new Set([...fromPreset, ...today.extras, ...Object.keys(today.entries)])]
    .filter(id => exerciseById(id));
}

function addToToday(id) {
  if (todayExerciseIds().includes(id)) return false;
  today.extras.push(id);
  saveToday();
  return true;
}

// ---------- Unidade (kg / lb) ----------
// Cargas são sempre guardadas em kg; lb é só exibição/entrada.
let unit = loadPref('unit') === 'lb' ? 'lb' : 'kg';
const unitListeners = []; // páginas registram aqui o que re-renderizar

const toUnit = kgValue => (unit === 'lb' ? kgValue * SETTINGS.lbPerKg : kgValue);
const fromUnit = value => (unit === 'lb' ? value / SETTINGS.lbPerKg : value);

const unitButtons = document.querySelectorAll('.unit-toggle button');

function applyUnitButtons() {
  unitButtons.forEach(btn => btn.setAttribute('aria-pressed', btn.dataset.unit === unit));
}

unitButtons.forEach(btn => btn.addEventListener('click', () => {
  if (btn.dataset.unit === unit) return;
  unit = btn.dataset.unit;
  savePref('unit', unit);
  applyUnitButtons();
  unitListeners.forEach(fn => fn());
}));
applyUnitButtons();

// ---------- Formatação ----------
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });

const formatLoad = kgValue => number.format(toUnit(kgValue));
const withUnit = kgValue => `${formatLoad(kgValue)} ${unit}`;
const maxWeight = entries => Math.max(...entries.map(e => e.weight));
const describeEntry = e => `${e.sets} × ${e.reps}`;

// ---------- Favoritos (máx. SETTINGS.maxFavorites) ----------
let favorites = (loadJSON('favorites') ?? [])
  .filter(id => exerciseById(id))
  .slice(0, SETTINGS.maxFavorites);

const isFavorite = id => favorites.includes(id);

// Retorna false quando o limite impede favoritar
function toggleFavorite(id) {
  if (isFavorite(id)) {
    favorites = favorites.filter(f => f !== id);
  } else if (favorites.length >= SETTINGS.maxFavorites) {
    showToast(`Máximo de ${SETTINGS.maxFavorites} favoritos. Desmarque um para trocar.`);
    return false;
  } else {
    favorites.push(id);
  }
  saveJSON('favorites', favorites);
  return true;
}

// Favoritos primeiro, mantendo a ordem original no resto
function sortByFavorite(exercises) {
  return [...exercises].sort((a, b) => isFavorite(b.id) - isFavorite(a.id));
}

// ---------- Aviso rápido ----------
let toastTimer;
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
}

// Roda do mouse rola listas horizontais (no celular já rolam com o dedo)
function enableWheelScroll(el) {
  el.addEventListener('wheel', event => {
    if (el.scrollWidth <= el.clientWidth || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    event.preventDefault();
    el.scrollLeft += event.deltaY;
  }, { passive: false });
}

// ---------- Seletor de exercícios (busca + filtro por músculo) ----------
// Usado no Painel (adicionar ao treino de hoje) e no editor de treinos.
// isAdded(id) → já está na lista; onToggle(id) → adicionar/remover
function createExercisePicker({ isAdded, onToggle }) {
  const wrap = document.createElement('div');
  wrap.className = 'ex-picker';

  const search = document.createElement('input');
  search.type = 'search';
  search.placeholder = 'Buscar por nome ou músculo…';
  search.setAttribute('aria-label', 'Buscar exercício por nome ou músculo');
  search.className = 'ex-picker-search';

  const chips = document.createElement('div');
  chips.className = 'picker';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Filtrar por músculo');
  enableWheelScroll(chips);

  const results = document.createElement('ul');
  results.className = 'ex-results';

  const empty = document.createElement('p');
  empty.className = 'empty';
  empty.textContent = 'Nenhum exercício encontrado.';
  empty.hidden = true;

  let muscle = null;
  for (const [key, label] of [[null, 'Todos'], ...Object.entries(MUSCLES)]) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pick';
    chip.textContent = label;
    chip.setAttribute('aria-pressed', key === muscle);
    chip.addEventListener('click', () => {
      muscle = key;
      chips.querySelectorAll('.pick').forEach(c => c.setAttribute('aria-pressed', c === chip));
      render();
    });
    chips.append(chip);
  }

  function render() {
    const query = normalize(search.value);
    const list = allExercises.filter(ex => matchesQuery(ex, query) && (!muscle || ex.muscles.includes(muscle)));
    results.replaceChildren();
    for (const ex of list) {
      const li = document.createElement('li');
      li.className = 'ex-result';

      const info = document.createElement('span');
      info.className = 'ex-result-info';
      const name = document.createElement('strong');
      name.textContent = ex.name;
      const muscles = document.createElement('span');
      muscles.className = 'muscles';
      muscles.textContent = musclesLabel(ex);
      info.append(name, muscles);

      const added = isAdded(ex.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${added ? 'btn-added' : 'btn-primary'} btn-small`;
      btn.textContent = added ? '✓' : '+';
      btn.setAttribute('aria-label', added ? `Remover ${ex.name}` : `Adicionar ${ex.name}`);
      btn.addEventListener('click', () => {
        onToggle(ex.id);
        render();
      });

      li.append(thumbElement(ex, 'thumb thumb-small'), info, btn);
      results.append(li);
    }
    empty.hidden = list.length > 0;
  }

  search.addEventListener('input', render);
  wrap.append(search, chips, results, empty);
  render();
  return { element: wrap, render, focus: () => search.focus() };
}

// ---------- Busca (lupa do topo) ----------
const searchListeners = []; // páginas registram aqui como filtrar

const searchToggle = document.getElementById('search-toggle');
const searchBar = document.getElementById('search-bar');
const searchInput = document.getElementById('search-input');

function setSearchOpen(open) {
  searchBar.hidden = !open;
  searchToggle.setAttribute('aria-expanded', open);
  if (open) {
    searchInput.focus();
  } else if (searchInput.value) {
    searchInput.value = '';
    searchListeners.forEach(fn => fn(''));
  }
}

searchToggle.addEventListener('click', () => setSearchOpen(searchBar.hidden));
searchInput.addEventListener('input', () => {
  const query = normalize(searchInput.value);
  searchListeners.forEach(fn => fn(query));
});
searchInput.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setSearchOpen(false);
    searchToggle.focus();
  }
});

// ---------- Tema claro / escuro ----------
const root = document.documentElement;
const themeButton = document.getElementById('theme-toggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function isDark() {
  const chosen = root.dataset.theme;
  return chosen ? chosen === 'dark' : systemDark.matches;
}

function applyTheme() {
  const dark = isDark();
  root.classList.toggle('dark', dark);
  themeButton.setAttribute('aria-label', dark ? 'Mudar para modo claro' : 'Mudar para modo escuro');
}

const savedTheme = loadPref('theme');
if (savedTheme === 'light' || savedTheme === 'dark') root.dataset.theme = savedTheme;

themeButton.addEventListener('click', () => {
  root.dataset.theme = isDark() ? 'light' : 'dark';
  savePref('theme', root.dataset.theme);
  applyTheme();
});
systemDark.addEventListener('change', applyTheme);
applyTheme();

// ---------- Saudação ----------
const greeting = document.getElementById('greeting');
if (greeting) greeting.textContent = `Olá, ${mockUser.name}. `;

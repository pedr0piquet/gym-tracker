// Código compartilhado entre as páginas: configurações, preferências, dados,
// unidade, tema, busca, favoritos, formatação e o seletor de exercícios.
// Depende de catalog.js. Os dados do usuário vêm da API (/api/state); cada página
// começa a desenhar em appReady.then(...).

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

// ---------- API ----------
const OFFLINE_MESSAGE = 'Não foi possível conectar ao servidor no momento. Tente de novo mais tarde.';

class ApiError extends Error {}

// Sem login → vai para login.html. Sem servidor (ou resposta que não é JSON, como
// no GitHub Pages) → ApiError com OFFLINE_MESSAGE.
async function api(method, path, body) {
  let res;
  try {
    res = await fetch(`api/${path}`, {
      method,
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(OFFLINE_MESSAGE);
  }
  if (res.status === 401) {
    location.href = 'login.html';
    return new Promise(() => {}); // a página vai ser trocada; nada mais roda
  }
  if (res.status === 204) return null;
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  if (!data) throw new ApiError(OFFLINE_MESSAGE);
  if (!res.ok) throw new ApiError(data.error ?? 'Não foi possível salvar.');
  return data;
}

// Para escritas: avisa o erro e devolve false, sem quebrar a página
async function save(method, path, body) {
  try {
    return (await api(method, path, body)) ?? true;
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
    showToast(err.message === OFFLINE_MESSAGE ? 'Não foi possível salvar no momento. Tente de novo.' : err.message);
    return false;
  }
}

// ---------- Dados do usuário (preenchidos por loadApp) ----------
let currentUser = null;
let exerciseHistory = {}; // { exId: [{ date, entries }] }, do mais recente para o mais antigo
let presets = [];   // [{ id, name, days, exercises }]
let today = null;   // { date, presetId, extras: [ids], entries: { id: [registros] } }

// ---------- Exercícios (catálogo do site + criados pelo usuário) ----------
const allExercises = [...CATALOG];
const exerciseById = id => allExercises.find(ex => ex.id === id);
const historyOf = id => exerciseHistory[id] ?? [];
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
const presetById = id => presets.find(p => p.id === id);
const describeDays = days => (days.length ? [...days].sort().map(d => DAYS[d]).join(' · ') : 'Sem dia fixo');

// ---------- Treino de hoje ----------
const todayEntries = id => today.entries[id] ?? [];
const todayPath = () => `days/${today.date}`;

// Escolher o treino fixo do dia (null = livre)
async function setTodayPreset(presetId) {
  if (!(await save('PUT', `${todayPath()}/preset`, { presetId }))) return false;
  today.presetId = presetId;
  return true;
}

async function addTodaySet(id, entry) {
  if (!(await save('POST', `${todayPath()}/sets`, { exerciseId: id, ...entry }))) return false;
  (today.entries[id] ??= []).push(entry);
  if (!today.extras.includes(id)) today.extras.push(id);
  return true;
}

async function removeFromToday(id) {
  if (!(await save('DELETE', `${todayPath()}/exercises/${encodeURIComponent(id)}`))) return false;
  today.extras = today.extras.filter(x => x !== id);
  return true;
}

// Treino fixo escolhido + avulsos + o que já tem registro hoje, sem repetir
function todayExerciseIds() {
  const fromPreset = presetById(today.presetId)?.exercises ?? [];
  return [...new Set([...fromPreset, ...today.extras, ...Object.keys(today.entries)])]
    .filter(id => exerciseById(id));
}

// Retorna 'added', 'exists' ou 'error' (o erro já foi avisado)
async function addToToday(id) {
  if (todayExerciseIds().includes(id)) return 'exists';
  if (!(await save('POST', `${todayPath()}/exercises`, { exerciseId: id }))) return 'error';
  today.extras.push(id);
  return 'added';
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

// "45 s", "1 min 30 s"
function formatSeconds(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

// ---------- Como cada exercício é medido (campo `measure` do catálogo) ----------
// Todo registro é { weight (kg), sets, reps }. Em 'time', reps guarda os segundos.
// Em 'bodyweight' e 'time' a carga é opcional (0 = sem carga).
const MEASURES = {
  load:       { weightLabel: 'Carga',  weightOptional: false, repsLabel: 'Reps' },
  bodyweight: { weightLabel: 'Lastro', weightOptional: true,  repsLabel: 'Reps' },
  time:       { weightLabel: 'Carga',  weightOptional: true,  repsLabel: 'Segundos' },
};
const measureOf = ex => (MEASURES[ex.measure] ? ex.measure : 'load');

// "3 × 12" ou, em tempo, "3 × 45 s"
const describeEntry = (e, ex) => `${e.sets} × ${measureOf(ex) === 'time' ? formatSeconds(e.reps) : e.reps}`;

// Carga de um registro: "40 kg"; lastro "+10 kg"; sem carga → ''
function describeWeight(e, ex) {
  const measure = measureOf(ex);
  if (measure === 'load') return withUnit(e.weight);
  if (!e.weight) return '';
  return measure === 'bodyweight' ? `+${withUnit(e.weight)}` : withUnit(e.weight);
}

// "40 kg · 3 × 12", "3 × 12", "+10 kg · 3 × 8", "3 × 45 s"
const formatEntry = (e, ex) => [describeWeight(e, ex), describeEntry(e, ex)].filter(Boolean).join(' · ');

// ---------- Favoritos (máx. SETTINGS.maxFavorites) ----------
// Ficam neste navegador, separados por usuário (carregados em loadApp)
let favorites = [];
const favoritesKey = () => `favorites:${currentUser.id}`;

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
  saveJSON(favoritesKey(), favorites);
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
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        await onToggle(ex.id);
        render();
      });

      li.append(thumbElement(ex, 'thumb thumb-small'), info, btn);
      results.append(li);
    }
    empty.hidden = list.length > 0;
  }

  // A lista só é desenhada ao abrir (render()), quando os dados já chegaram
  search.addEventListener('input', render);
  wrap.append(search, chips, results, empty);
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

// ---------- Conta (menu do usuário) e saudação ----------
async function logout() {
  try {
    await fetch('api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  } finally {
    location.href = 'login.html';
  }
}

// O espaço do botão já existe antes da resposta, para o topo não pular
const accountSlot = document.createElement('div');
accountSlot.className = 'account';
document.querySelector('.topbar-row')?.append(accountSlot);

function renderAccount(user) {
  accountSlot.innerHTML = `
    <button type="button" class="account-btn" popovertarget="account-menu"></button>
    <div class="account-menu" id="account-menu" popover>
      <p class="account-name"></p>
      <p class="account-email"></p>
      <button type="button" class="btn btn-block" id="logout-btn">Sair</button>
    </div>`;
  const button = accountSlot.querySelector('.account-btn');
  button.textContent = user.name.trim().charAt(0).toUpperCase();
  button.setAttribute('aria-label', `Conta de ${user.name}`);
  accountSlot.querySelector('.account-name').textContent = user.name;
  accountSlot.querySelector('.account-email').textContent = user.email;
  accountSlot.querySelector('#logout-btn').addEventListener('click', logout);
}

// ---------- Carregamento ----------
// Enquanto carrega (ou se o servidor estiver fora), só o título da página aparece,
// com o aviso em .app-status. Sem login, api() leva para login.html.
const appStatus = document.createElement('div');
appStatus.className = 'app-status';
appStatus.setAttribute('role', 'status');
appStatus.textContent = 'Carregando…';
const pageHead = document.querySelector('.page-head');
if (pageHead) pageHead.after(appStatus);
else document.querySelector('main')?.prepend(appStatus);
document.body.classList.add('app-pending');

async function loadApp() {
  let state;
  try {
    state = await api('GET', `state?today=${todayISO()}`);
  } catch (err) {
    appStatus.replaceChildren(err.message || OFFLINE_MESSAGE);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-small';
    retry.textContent = 'Tentar de novo';
    retry.addEventListener('click', () => location.reload());
    appStatus.append(retry);
    appStatus.classList.add('app-status-error');
    return new Promise(() => {}); // as páginas não desenham nada sem os dados
  }

  currentUser = state.user;
  allExercises.push(...state.customExercises);
  exerciseHistory = state.history;
  presets = state.presets;
  today = state.today;
  favorites = (loadJSON(favoritesKey()) ?? []).filter(id => exerciseById(id)).slice(0, SETTINGS.maxFavorites);

  renderAccount(currentUser);
  const greeting = document.getElementById('greeting');
  if (greeting) greeting.textContent = `Olá, ${currentUser.name.trim().split(/\s+/)[0]}. `;

  appStatus.remove();
  document.body.classList.remove('app-pending');
}

// Só resolve quando os dados chegam; sem servidor fica pendente (o aviso já está na tela)
const appReady = loadApp();

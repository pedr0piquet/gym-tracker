// Código compartilhado entre as páginas: configurações, preferências,
// unidade, tema, busca, favoritos e formatação.

// ---------- Configurações (ajuste aqui) ----------
const SETTINGS = {
  restSeconds: 30,         // descanso recomendado (o exercício pode sobrescrever com `rest`)
  lbPerKg: 2.20462,
  maxFavorites: 3,
};

// ---------- Preferências ----------
function loadPref(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function savePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* sem storage: vale só nesta visita */ }
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

const parseDate = iso => new Date(iso + 'T00:00:00');
const formatLoad = kgValue => number.format(toUnit(kgValue));
const withUnit = kgValue => `${formatLoad(kgValue)} ${unit}`;
const maxWeight = entries => Math.max(...entries.map(e => e.weight));
const describeEntry = e => `${e.sets} × ${e.reps}`;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- Favoritos (máx. SETTINGS.maxFavorites) ----------
let favorites = (() => {
  try {
    const saved = JSON.parse(loadPref('favorites'));
    return Array.isArray(saved) ? saved.slice(0, SETTINGS.maxFavorites) : [];
  } catch { return []; }
})();

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
  savePref('favorites', JSON.stringify(favorites));
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

// ---------- Busca (lupa do topo) ----------
// Sem acento e minúsculo: "elevacao" encontra "Elevação"
const normalize = text => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
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

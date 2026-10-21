// Página pública de entrada: login e cadastro pela API (/api/auth).
// Não depende de common.js (que carrega os dados de exemplo do app).

const AFTER_LOGIN = 'index.html';

const form = document.getElementById('auth-form');
const title = document.getElementById('auth-title');
const nameField = document.getElementById('name-field');
const passwordInput = form.elements.password;
const passwordHint = document.getElementById('password-hint');
const passwordToggle = document.getElementById('password-toggle');
const errorBox = document.getElementById('form-error');
const submitButton = document.getElementById('submit-btn');
const modeButtons = document.querySelectorAll('.auth-mode button');

let mode = 'login';

// ---------- Tema (mesma preferência das outras páginas) ----------
const root = document.documentElement;
const themeButton = document.getElementById('theme-toggle');
const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

function loadPref(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function savePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* sem storage: vale só nesta visita */ }
}

const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : systemDark.matches);

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

// ---------- API ----------
async function api(path, body) {
  const options = body
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    : {};
  const res = await fetch(`api/auth/${path}`, options);
  const data = res.headers.get('content-type')?.includes('application/json') ? await res.json() : null;
  // Sem JSON = não há servidor (ex.: GitHub Pages, que só tem os arquivos estáticos)
  if (!data) throw new Error('offline');
  return { ok: res.ok, status: res.status, data };
}

// ---------- Modo: entrar / criar conta ----------
function setMode(next) {
  mode = next;
  const register = mode === 'register';
  modeButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  title.textContent = register ? 'Criar conta' : 'Entrar';
  document.title = `${title.textContent} · Gym Tracker`;
  submitButton.textContent = register ? 'Criar conta' : 'Entrar';
  nameField.hidden = !register;
  form.elements.name.required = register;
  passwordHint.hidden = !register;
  passwordInput.autocomplete = register ? 'new-password' : 'current-password';
  showError('');
  history.replaceState(null, '', register ? '#criar' : location.pathname + location.search);
}

modeButtons.forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
if (location.hash === '#criar') setMode('register');

passwordToggle.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  passwordToggle.textContent = show ? 'Ocultar' : 'Mostrar';
  passwordToggle.setAttribute('aria-pressed', String(show));
});

// ---------- Envio ----------
function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = !message;
}

// Checagem rápida no navegador; a regra que vale é a do servidor
function validate({ name, email, password }) {
  if (mode === 'register' && !name) return ['name', 'Informe seu nome'];
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ['email', 'Informe um e-mail válido'];
  if (!password) return ['password', 'Informe a senha'];
  if (mode === 'register' && password.length < 8) return ['password', 'A senha precisa ter pelo menos 8 caracteres'];
  return null;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const values = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    password: passwordInput.value,
  };

  const problem = validate(values);
  if (problem) {
    showError(problem[1]);
    form.elements[problem[0]].focus();
    return;
  }

  showError('');
  submitButton.disabled = true;
  const label = submitButton.textContent;
  submitButton.textContent = mode === 'register' ? 'Criando conta…' : 'Entrando…';

  try {
    const body = mode === 'register' ? values : { email: values.email, password: values.password };
    const { ok, data } = await api(mode, body);
    if (ok) {
      location.href = AFTER_LOGIN;
      return;
    }
    showError(data.error ?? 'Não foi possível continuar');
  } catch {
    showError('Servidor indisponível. O login só funciona com o servidor do app (./run.sh).');
  }
  submitButton.disabled = false;
  submitButton.textContent = label;
});

// Já logado? Vai direto para o app
api('me').then(({ ok }) => { if (ok) location.replace(AFTER_LOGIN); }).catch(() => {});

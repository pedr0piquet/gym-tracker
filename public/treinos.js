// Página "Treino" (treinos fixos / rotina). Depende de catalog.js, mock_user.js e common.js.

const presetList = document.getElementById('presets');
const counter = document.getElementById('preset-counter');
const emptyMessage = document.getElementById('empty');
const newButton = document.getElementById('new-preset');
let searchQuery = '';

const presetMuscles = p => [...new Set(p.exercises.flatMap(id => exerciseById(id)?.muscles ?? []))];

// Busca por nome do treino, nome de exercício ou músculo
function presetMatches(p, query) {
  if (!query) return true;
  return normalize(p.name).includes(query) || p.exercises.some(id => matchesQuery(exerciseById(id), query));
}

// ---------- Lista ----------
function createPresetCard(p) {
  const card = document.createElement('article');
  card.className = 'preset';

  const head = document.createElement('div');
  head.className = 'preset-head';
  const title = document.createElement('h2');
  title.textContent = p.name;
  head.append(title);
  if (p.days.includes(new Date().getDay())) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = 'hoje';
    head.append(badge);
  }

  const days = document.createElement('div');
  days.className = 'day-row';
  DAYS.forEach((label, d) => {
    const day = document.createElement('span');
    day.className = p.days.includes(d) ? 'day day-on' : 'day';
    day.textContent = label[0];
    day.title = label;
    days.append(day);
  });
  days.setAttribute('aria-label', `Dias: ${describeDays(p.days)}`);

  const exercises = document.createElement('ol');
  exercises.className = 'preset-exercises';
  for (const id of p.exercises) {
    const ex = exerciseById(id);
    if (!ex) continue;
    const li = document.createElement('li');
    li.textContent = ex.name;
    exercises.append(li);
  }

  const muscles = document.createElement('p');
  muscles.className = 'muscles';
  muscles.textContent = presetMuscles(p).map(m => MUSCLES[m]).join(' · ');

  const actions = document.createElement('div');
  actions.className = 'preset-actions';

  const start = document.createElement('button');
  start.type = 'button';
  start.className = 'btn btn-primary btn-small';
  start.textContent = 'Treinar hoje';
  start.addEventListener('click', () => {
    today.presetId = p.id;
    saveToday();
    location.href = 'index.html';
  });

  const edit = document.createElement('button');
  edit.type = 'button';
  edit.className = 'btn btn-small';
  edit.textContent = 'Editar';
  edit.addEventListener('click', () => openEditor(p));

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'link-button danger';
  remove.textContent = 'Excluir';
  remove.addEventListener('click', () => {
    if (!confirm(`Excluir o treino "${p.name}"? O histórico dos exercícios não é apagado.`)) return;
    presets = presets.filter(x => x !== p);
    savePresets();
    if (today.presetId === p.id) {
      today.presetId = null;
      saveToday();
    }
    render();
  });

  actions.append(start, edit, remove);
  card.append(head, days, exercises, muscles, actions);
  return card;
}

function render() {
  const visible = presets.filter(p => presetMatches(p, searchQuery));
  presetList.replaceChildren(...visible.map(createPresetCard));

  counter.textContent = `${presets.length} de ${SETTINGS.maxPresets} treinos`;
  const full = presets.length >= SETTINGS.maxPresets;
  newButton.setAttribute('aria-disabled', full);
  newButton.textContent = full ? `Limite de ${SETTINGS.maxPresets} treinos` : '+ Novo treino';

  emptyMessage.hidden = visible.length > 0;
  emptyMessage.textContent = presets.length
    ? 'Nenhum treino encontrado.'
    : 'Você ainda não tem treinos. Crie um para repetir sua rotina toda semana.';
}

newButton.addEventListener('click', () => {
  if (presets.length >= SETTINGS.maxPresets) {
    showToast(`Máximo de ${SETTINGS.maxPresets} treinos. Exclua um para criar outro.`);
    return;
  }
  openEditor(null);
});

searchListeners.push(query => {
  searchQuery = query;
  render();
});

// ---------- Editor ----------
const editor = document.getElementById('editor');
const form = document.getElementById('editor-form');
const dayPicker = document.getElementById('day-picker');
const selectedList = document.getElementById('selected-list');
let editing = null;          // treino sendo editado (null = novo)
let draft = { days: [], exercises: [] };

DAYS.forEach((label, d) => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'day-toggle';
  btn.textContent = label;
  btn.addEventListener('click', () => {
    draft.days = draft.days.includes(d) ? draft.days.filter(x => x !== d) : [...draft.days, d];
    renderDays();
  });
  dayPicker.append(btn);
});

function renderDays() {
  dayPicker.querySelectorAll('.day-toggle').forEach((btn, d) => btn.setAttribute('aria-pressed', draft.days.includes(d)));
}

function moveExercise(index, delta) {
  const target = index + delta;
  if (target < 0 || target >= draft.exercises.length) return;
  [draft.exercises[index], draft.exercises[target]] = [draft.exercises[target], draft.exercises[index]];
  renderSelected();
}

function iconButton(label, path, onClick, disabled = false) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'mini-btn';
  btn.setAttribute('aria-label', label);
  btn.disabled = disabled;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  btn.addEventListener('click', onClick);
  return btn;
}

function renderSelected() {
  selectedList.replaceChildren();
  draft.exercises.forEach((id, i) => {
    const ex = exerciseById(id);
    const li = document.createElement('li');
    li.className = 'selected-item';

    const info = document.createElement('span');
    info.className = 'ex-result-info';
    const name = document.createElement('strong');
    name.textContent = ex.name;
    const muscles = document.createElement('span');
    muscles.className = 'muscles';
    muscles.textContent = musclesLabel(ex);
    info.append(name, muscles);

    li.append(
      thumbElement(ex, 'thumb thumb-small'),
      info,
      iconButton(`Subir ${ex.name}`, 'm6 15 6-6 6 6', () => moveExercise(i, -1), i === 0),
      iconButton(`Descer ${ex.name}`, 'm6 9 6 6 6-6', () => moveExercise(i, 1), i === draft.exercises.length - 1),
      iconButton(`Remover ${ex.name}`, 'M6 6l12 12M18 6 6 18', () => {
        draft.exercises.splice(i, 1);
        renderSelected();
        picker.render();
      }),
    );
    selectedList.append(li);
  });
  document.getElementById('selected-count').textContent = draft.exercises.length ? `(${draft.exercises.length})` : '';
  document.getElementById('selected-empty').hidden = draft.exercises.length > 0;
}

const picker = createExercisePicker({
  isAdded: id => draft.exercises.includes(id),
  onToggle: id => {
    draft.exercises = draft.exercises.includes(id)
      ? draft.exercises.filter(x => x !== id)
      : [...draft.exercises, id];
    renderSelected();
  },
});
document.getElementById('editor-picker').append(picker.element);

function openEditor(preset) {
  editing = preset;
  draft = preset
    ? { days: [...preset.days], exercises: [...preset.exercises] }
    : { days: [], exercises: [] };
  form.name.value = preset?.name ?? '';
  document.getElementById('editor-title').textContent = preset ? 'Editar treino' : 'Novo treino';
  renderDays();
  renderSelected();
  picker.render();
  editor.showModal();
  if (!preset) form.name.focus();
}

form.addEventListener('submit', event => {
  const name = form.name.value.trim();
  if (!draft.exercises.length) {
    event.preventDefault();
    showToast('Adicione pelo menos um exercício ao treino.');
    return;
  }
  if (editing) {
    Object.assign(editing, { name, days: draft.days, exercises: draft.exercises });
  } else {
    presets.push({ id: `treino-${Date.now()}`, name, days: draft.days, exercises: draft.exercises });
  }
  savePresets();
  render();
  showToast(editing ? 'Treino atualizado.' : 'Treino criado.');
});

editor.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => editor.close()));

render();

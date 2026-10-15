// Página "Painel" (treino de hoje). Depende de catalog.js, mock_user.js e common.js.

// ---------- Regras de progressão (ajuste aqui) ----------
const PROGRESSION = {
  sessionsAtSameLoad: 3,   // nº de treinos seguidos com a mesma carga
  targetSets: 3,           // séries que precisam atingir targetReps no último treino
  targetReps: 12,          // reps por série para considerar a carga "dominada"
  weightIncrement: 2.5,    // kg a somar ao subir a carga (idealmente +10%)
  repsAfterIncrease: [6, 8], // faixa de reps ao voltar com a carga nova
};

function formatRest(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return sec ? `${min} min ${sec} s` : `${min} min`;
}

// "3 × 12" para um registro; "2 × 12 + 1 × 8" para vários
function describeReps(entries) {
  return entries.map(describeEntry).join(' + ');
}

// "40 kg" quando a carga é a mesma; senão "até 80 kg"
function describeLoad(entries) {
  if (!entries.length) return '';
  const max = maxWeight(entries);
  return entries.every(e => e.weight === max) ? withUnit(max) : `até ${withUnit(max)}`;
}

// Retorna a carga a subir, ou null se ainda não é hora.
// Regra: os últimos N treinos usaram a mesma carga e o mais recente
// atingiu targetSets séries de targetReps nessa carga.
function progressionLoad(history) {
  const recent = history.slice(0, PROGRESSION.sessionsAtSameLoad);
  if (recent.length < PROGRESSION.sessionsAtSameLoad) return null;

  const load = maxWeight(recent[0].entries);
  if (!recent.every(session => maxWeight(session.entries) === load)) return null;

  const doneSets = recent[0].entries
    .filter(e => e.weight === load && e.reps >= PROGRESSION.targetReps)
    .reduce((total, e) => total + e.sets, 0);
  return doneSets >= PROGRESSION.targetSets ? load : null;
}

// ---------- Escolha do treino de hoje ----------
const presetSelect = document.getElementById('preset-select');

function renderPresetSelect() {
  presetSelect.replaceChildren();
  for (const p of presets) {
    presetSelect.add(new Option(`${p.name} (${describeDays(p.days)})`, p.id));
  }
  presetSelect.add(new Option('Livre — sem treino fixo', ''));
  presetSelect.value = today.presetId ?? '';
}

presetSelect.addEventListener('change', () => {
  today.presetId = presetSelect.value || null;
  saveToday();
  renderList();
});

// ---------- Cards ----------
const list = document.getElementById('exercises');
const emptyMessage = document.getElementById('empty');
const cardTemplate = document.getElementById('card-template');
const setTemplate = document.getElementById('set-template');
let cards = []; // { card, ex }
let searchQuery = '';

// Preenche tudo que depende dos registros ou da unidade
function renderCard(card, ex) {
  const entries = todayEntries(ex.id);
  card.querySelector('.chip.sets').textContent = entries.length ? describeReps(entries) : 'Nenhuma série ainda';
  card.querySelector('.chip.load').textContent = describeLoad(entries);
  card.querySelector('.unit-label').textContent = unit;

  const setList = card.querySelector('.set-list');
  setList.replaceChildren();
  entries.forEach((e, i) => {
    const row = setTemplate.content.cloneNode(true);
    row.querySelector('.set-number').textContent = i + 1;
    row.querySelector('.set-weight').textContent = withUnit(e.weight);
    row.querySelector('.set-reps').textContent = `${describeEntry(e)} reps`;
    setList.append(row);
  });

  const last = historyOf(ex.id)[0];
  card.querySelector('.last-sets').textContent = last
    ? last.entries.map(e => `${withUnit(e.weight)} · ${describeEntry(e)}`).join(', ')
    : 'primeira vez';

  const load = progressionLoad(historyOf(ex.id));
  const progressBtn = card.querySelector('.btn-progress');
  progressBtn.hidden = load === null;
  if (load !== null) {
    const [minReps, maxReps] = PROGRESSION.repsAfterIncrease;
    progressBtn.textContent = `↑ ${withUnit(load + PROGRESSION.weightIncrement)} · ${minReps}–${maxReps} reps`;
  }

  // Só exercícios avulsos e ainda sem registro podem sair do dia
  card.querySelector('.remove-today').hidden = !today.extras.includes(ex.id) || entries.length > 0;
}

function renderFavorite(card, ex) {
  const favBtn = card.querySelector('.fav-btn');
  const fav = isFavorite(ex.id);
  favBtn.setAttribute('aria-pressed', fav);
  favBtn.setAttribute('aria-label', fav ? `Remover ${ex.name} dos favoritos` : `Favoritar ${ex.name}`);
}

// Favoritos no topo da lista
function sortCards() {
  for (const ex of sortByFavorite(cards.map(c => c.ex))) {
    list.append(cards.find(c => c.ex === ex).card);
  }
}

function openForm(card, { weight, count, reps }) {
  const form = card.querySelector('.add-set');
  form.hidden = false;
  card.querySelector('.add-set-toggle').hidden = true;
  form.weight.value = weight != null ? Number(toUnit(weight).toFixed(1)) : '';
  form.count.value = count ?? 1;
  form.reps.value = reps ?? '';
  form.reps.focus();
}

function closeForm(card) {
  card.querySelector('.add-set').hidden = true;
  card.querySelector('.add-set-toggle').hidden = false;
}

function createCard(ex) {
  const card = cardTemplate.content.cloneNode(true).querySelector('.card');
  const last = historyOf(ex.id)[0];

  fillThumb(card.querySelector('.thumb'), ex);
  card.querySelector('.name').textContent = ex.name;
  card.querySelector('.muscles').textContent = musclesLabel(ex);
  card.querySelector('.chip.rest').textContent = `descanso ${formatRest(ex.rest ?? SETTINGS.restSeconds)}`;
  card.querySelector('.last-date').textContent = last ? ` (${shortDate.format(parseDate(last.date))})` : '';
  card.querySelector('.history-link').href = `historico.html?ex=${ex.id}`;

  // Estrela: fica dentro do <summary>, então não pode abrir/fechar o card
  card.querySelector('.fav-btn').addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    if (toggleFavorite(ex.id)) {
      renderFavorite(card, ex);
      sortCards();
    }
  });

  // Subir carga: nova carga, mesma quantidade de séries, topo da faixa de reps
  card.querySelector('.btn-progress').addEventListener('click', () => {
    openForm(card, {
      weight: progressionLoad(historyOf(ex.id)) + PROGRESSION.weightIncrement,
      count: PROGRESSION.targetSets,
      reps: PROGRESSION.repsAfterIncrease[1],
    });
  });

  // Adicionar: repete o último registro de hoje, ou o da última vez
  card.querySelector('.add-set-toggle').addEventListener('click', () => {
    const ref = todayEntries(ex.id).at(-1) ?? last?.entries.at(-1);
    openForm(card, { weight: ref?.weight, count: ref?.sets, reps: ref?.reps });
  });

  card.querySelector('.add-set').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    (today.entries[ex.id] ??= []).push({
      weight: fromUnit(Number(form.weight.value)),
      sets: Number(form.count.value),
      reps: Number(form.reps.value),
    });
    saveToday();
    renderCard(card, ex);
    closeForm(card);
  });

  card.querySelector('.remove-today').addEventListener('click', () => {
    today.extras = today.extras.filter(id => id !== ex.id);
    saveToday();
    renderList();
  });

  renderCard(card, ex);
  renderFavorite(card, ex);
  return card;
}

function renderList() {
  cards = todayExerciseIds().map(id => {
    const ex = exerciseById(id);
    return { card: createCard(ex), ex };
  });
  list.replaceChildren();
  sortCards();
  applySearch();
}

// Busca da lupa: por nome ou músculo
function applySearch() {
  let visible = 0;
  for (const { card, ex } of cards) {
    const match = matchesQuery(ex, searchQuery);
    card.hidden = !match;
    if (match) visible++;
  }
  emptyMessage.hidden = visible > 0;
  emptyMessage.textContent = cards.length
    ? 'Nenhum exercício encontrado.'
    : 'Nenhum exercício para hoje. Escolha um treino acima ou adicione exercícios.';
}

searchListeners.push(query => {
  searchQuery = query;
  applySearch();
});

// Trocar kg/lb: re-renderiza e fecha formulários abertos (estariam na unidade antiga)
unitListeners.push(() => {
  for (const { card, ex } of cards) {
    closeForm(card);
    renderCard(card, ex);
  }
});

// ---------- Adicionar exercício avulso (busca por nome ou músculo) ----------
const addDialog = document.getElementById('add-dialog');
const addPicker = createExercisePicker({
  isAdded: id => todayExerciseIds().includes(id),
  onToggle: id => {
    if (addToToday(id)) {
      renderList();
      showToast(`${exerciseById(id).name} adicionado ao treino de hoje.`);
    } else {
      showToast('Esse exercício já está no treino de hoje.');
    }
  },
});
document.getElementById('add-picker').append(addPicker.element);

document.getElementById('add-exercise').addEventListener('click', () => {
  addPicker.render();
  addDialog.showModal();
  addPicker.focus();
});
addDialog.querySelectorAll('[data-close]').forEach(btn => btn.addEventListener('click', () => addDialog.close()));
// Toque fora do painel fecha
addDialog.addEventListener('click', event => {
  if (event.target === addDialog) addDialog.close();
});

renderPresetSelect();
renderList();

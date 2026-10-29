// Página "Painel" (treino de hoje). Depende de catalog.js e common.js.

// ---------- Regras de progressão (ajuste aqui), por tipo de medida ----------
const PROGRESSION = {
  // Carga: progressão dupla. Os últimos N treinos com a mesma carga e o mais recente
  // com targetSets séries de targetReps → sobe weightIncrement e volta para a faixa de reps.
  load: {
    sessions: 3,             // nº de treinos seguidos com a mesma carga
    targetSets: 3,           // séries que precisam atingir targetReps no último treino
    targetReps: 12,          // reps por série para considerar a carga "dominada"
    weightIncrement: 2.5,    // kg a somar ao subir a carga (idealmente +10%)
    repsAfterIncrease: [6, 8], // faixa de reps ao voltar com a carga nova
  },
  // Peso do corpo / tempo: nos últimos N treinos (mesmo lastro), pelo menos targetSets
  // séries chegaram às mesmas reps (ou segundos) → sugere step a mais.
  bodyweight: { sessions: 2, targetSets: 3, step: 2 },   // +2 reps
  time:       { sessions: 2, targetSets: 3, step: 10 },  // +10 s
};

// "3 × 12" para um registro; "2 × 12 + 1 × 8" para vários
function describeReps(entries, ex) {
  return entries.map(e => describeEntry(e, ex)).join(' + ');
}

// "40 kg" quando a carga é a mesma; senão "até 80 kg". Lastro: "+10 kg". Sem carga: ''
function describeLoad(entries, ex) {
  if (!entries.length) return '';
  const max = maxWeight(entries);
  const label = describeWeight({ weight: max }, ex);
  if (!label) return '';
  return entries.every(e => e.weight === max) ? label : `até ${label}`;
}

// Séries do treino com essa carga e pelo menos `reps` repetições (ou segundos)
const setsReaching = (session, weight, reps) => session.entries
  .filter(e => e.weight === weight && e.reps >= reps)
  .reduce((total, e) => total + e.sets, 0);

// Próximo registro sugerido { weight, sets, reps }, ou null se ainda não é hora
function progressionFor(ex) {
  const measure = measureOf(ex);
  const rule = PROGRESSION[measure];
  const recent = historyOf(ex.id).slice(0, rule.sessions);
  if (recent.length < rule.sessions) return null;

  const weight = maxWeight(recent[0].entries);
  if (!recent.every(session => maxWeight(session.entries) === weight)) return null;

  if (measure === 'load') {
    if (setsReaching(recent[0], weight, rule.targetReps) < rule.targetSets) return null;
    return { weight: weight + rule.weightIncrement, sets: rule.targetSets, reps: rule.repsAfterIncrease[1] };
  }

  // Maior número de reps (ou segundos) que o treino mais recente fez em targetSets séries
  const reps = Math.max(0, ...recent[0].entries
    .filter(e => e.weight === weight)
    .map(e => e.reps)
    .filter(r => setsReaching(recent[0], weight, r) >= rule.targetSets));
  if (!reps || !recent.every(session => setsReaching(session, weight, reps) >= rule.targetSets)) return null;
  return { weight, sets: rule.targetSets, reps: reps + rule.step };
}

// Texto do botão: "↑ 42,5 kg · 6–8 reps", "↑ 3 × 14", "↑ 3 × 55 s"
function progressionLabel(next, ex) {
  if (measureOf(ex) === 'load') {
    const [minReps, maxReps] = PROGRESSION.load.repsAfterIncrease;
    return `↑ ${withUnit(next.weight)} · ${minReps}–${maxReps} reps`;
  }
  return `↑ ${formatEntry(next, ex)}`;
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

presetSelect.addEventListener('change', async () => {
  presetSelect.disabled = true;
  if (await setTodayPreset(presetSelect.value || null)) renderList();
  else presetSelect.value = today.presetId ?? ''; // não salvou: volta a escolha anterior
  presetSelect.disabled = false;
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
  const measure = MEASURES[measureOf(ex)];
  card.querySelector('.chip.sets').textContent = entries.length ? describeReps(entries, ex) : 'Nenhuma série ainda';
  card.querySelector('.chip.load').textContent = describeLoad(entries, ex);
  card.querySelector('.unit-label').textContent = measure.weightOptional ? `${unit}, opcional` : unit;

  const setList = card.querySelector('.set-list');
  setList.replaceChildren();
  entries.forEach((e, i) => {
    const row = setTemplate.content.cloneNode(true);
    row.querySelector('.set-number').textContent = i + 1;
    row.querySelector('.set-weight').textContent = describeWeight(e, ex) || 'Peso do corpo';
    row.querySelector('.set-reps').textContent = measureOf(ex) === 'time' ? describeEntry(e, ex) : `${describeEntry(e, ex)} reps`;
    setList.append(row);
  });

  const last = historyOf(ex.id)[0];
  card.querySelector('.last-sets').textContent = last
    ? last.entries.map(e => formatEntry(e, ex)).join(', ')
    : 'primeira vez';

  const next = progressionFor(ex);
  const progressBtn = card.querySelector('.btn-progress');
  progressBtn.hidden = next === null;
  if (next) progressBtn.textContent = progressionLabel(next, ex);

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
  // Sem carga (peso do corpo / tempo): campo vazio em vez de 0
  form.weight.value = weight ? Number(toUnit(weight).toFixed(1)) : '';
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
  card.querySelector('.chip.rest').textContent = `descanso ${formatSeconds(ex.rest ?? SETTINGS.restSeconds)}`;

  // Formulário conforme a medida: "Lastro (kg, opcional)", "Segundos"…
  const measure = MEASURES[measureOf(ex)];
  const form = card.querySelector('.add-set');
  card.querySelector('.weight-label').textContent = measure.weightLabel;
  card.querySelector('.reps-label').textContent = measure.repsLabel;
  form.weight.required = !measure.weightOptional;
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

  // Progressão: pré-preenche o próximo registro sugerido; o usuário confirma
  card.querySelector('.btn-progress').addEventListener('click', () => {
    const next = progressionFor(ex);
    openForm(card, { weight: next.weight, count: next.sets, reps: next.reps });
  });

  // Adicionar: repete o último registro de hoje, ou o da última vez
  card.querySelector('.add-set-toggle').addEventListener('click', () => {
    const ref = todayEntries(ex.id).at(-1) ?? last?.entries.at(-1);
    openForm(card, { weight: ref?.weight, count: ref?.sets, reps: ref?.reps });
  });

  // Cada série vai para o servidor assim que registrada
  card.querySelector('.add-set').addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const saved = await addTodaySet(ex.id, {
      weight: Number(fromUnit(Number(form.weight.value || 0)).toFixed(2)), // vazio = sem carga
      sets: Number(form.count.value),
      reps: Number(form.reps.value),
    });
    submit.disabled = false;
    if (!saved) return; // o aviso já apareceu; o formulário continua preenchido
    renderCard(card, ex);
    closeForm(card);
  });

  card.querySelector('.remove-today').addEventListener('click', async () => {
    if (await removeFromToday(ex.id)) renderList();
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
  onToggle: async id => {
    const result = await addToToday(id);
    if (result === 'added') {
      renderList();
      showToast(`${exerciseById(id).name} adicionado ao treino de hoje.`);
    } else if (result === 'exists') {
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

appReady.then(() => {
  renderPresetSelect();
  renderList();
});

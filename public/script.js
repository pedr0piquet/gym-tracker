// Página "Treino de hoje". Depende de mock_user.js e common.js.

// ---------- Regras de progressão (ajuste aqui) ----------
const PROGRESSION = {
  sessionsAtSameLoad: 3,   // nº de treinos seguidos com a mesma carga
  targetSets: 3,           // séries que precisam atingir targetReps no último treino
  targetReps: 12,          // reps por série para considerar a carga "dominada"
  weightIncrement: 2.5,    // kg a somar ao subir a carga
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

// ---------- Renderização ----------
const list = document.getElementById('exercises');
const emptyMessage = document.getElementById('empty');
const cardTemplate = document.getElementById('card-template');
const setTemplate = document.getElementById('set-template');
const cards = []; // { card, ex }

// Preenche tudo que depende dos registros ou da unidade
function renderCard(card, ex) {
  card.querySelector('.chip.sets').textContent = ex.entries.length ? describeReps(ex.entries) : 'Nenhuma série ainda';
  card.querySelector('.chip.load').textContent = describeLoad(ex.entries);
  card.querySelector('.unit-label').textContent = unit;

  const setList = card.querySelector('.set-list');
  setList.replaceChildren();
  ex.entries.forEach((e, i) => {
    const row = setTemplate.content.cloneNode(true);
    row.querySelector('.set-number').textContent = i + 1;
    row.querySelector('.set-weight').textContent = withUnit(e.weight);
    row.querySelector('.set-reps').textContent = `${describeEntry(e)} reps`;
    setList.append(row);
  });

  const last = ex.history[0];
  card.querySelector('.last-sets').textContent = last
    ? last.entries.map(e => `${withUnit(e.weight)} · ${describeEntry(e)}`).join(', ')
    : 'primeira vez';

  const load = progressionLoad(ex.history);
  const progressBtn = card.querySelector('.btn-progress');
  progressBtn.hidden = load === null;
  if (load !== null) {
    const [minReps, maxReps] = PROGRESSION.repsAfterIncrease;
    progressBtn.textContent = `↑ ${withUnit(load + PROGRESSION.weightIncrement)} · ${minReps}–${maxReps} reps`;
  }
}

function renderFavorite(card, ex) {
  const favBtn = card.querySelector('.fav-btn');
  const fav = isFavorite(ex.id);
  favBtn.setAttribute('aria-pressed', fav);
  favBtn.setAttribute('aria-label', fav ? `Remover ${ex.name} dos favoritos` : `Favoritar ${ex.name}`);
}

// Favoritos no topo da lista
function sortCards() {
  const order = sortByFavorite(cards.map(c => c.ex));
  for (const ex of order) {
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
  const last = ex.history[0];

  if (ex.media) {
    card.querySelector('.frame-start').src = `media/${ex.media}-0.jpg`;
    card.querySelector('.frame-end').src = `media/${ex.media}-1.jpg`;
  }
  card.querySelector('.name').textContent = ex.name;
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
      weight: progressionLoad(ex.history) + PROGRESSION.weightIncrement,
      count: PROGRESSION.targetSets,
      reps: PROGRESSION.repsAfterIncrease[1],
    });
  });

  // Adicionar: repete o último registro de hoje, ou o da última vez
  card.querySelector('.add-set-toggle').addEventListener('click', () => {
    const ref = ex.entries.at(-1) ?? last?.entries.at(-1);
    openForm(card, { weight: ref?.weight, count: ref?.sets, reps: ref?.reps });
  });

  card.querySelector('.add-set').addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    ex.entries.push({
      weight: fromUnit(Number(form.weight.value)),
      sets: Number(form.count.value),
      reps: Number(form.reps.value),
    });
    renderCard(card, ex);
    closeForm(card);
  });

  renderCard(card, ex);
  renderFavorite(card, ex);
  cards.push({ card, ex });
}

mockExercises.forEach(createCard);
sortCards();

// Trocar kg/lb: re-renderiza e fecha formulários abertos (estariam na unidade antiga)
unitListeners.push(() => {
  for (const { card, ex } of cards) {
    closeForm(card);
    renderCard(card, ex);
  }
});

// Busca: esconde os cards que não batem com o nome
searchListeners.push(query => {
  let visible = 0;
  for (const { card, ex } of cards) {
    const match = normalize(ex.name).includes(query);
    card.hidden = !match;
    if (match) visible++;
  }
  emptyMessage.hidden = visible > 0;
});

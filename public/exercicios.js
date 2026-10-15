// Página "Exercícios" (base do site). Depende de catalog.js, mock_user.js e common.js.

const filter = document.getElementById('muscle-filter');
const catalogList = document.getElementById('catalog');
const counter = document.getElementById('catalog-counter');
const emptyMessage = document.getElementById('empty');

let muscle = new URLSearchParams(location.search).get('musculo');
if (!MUSCLES[muscle]) muscle = null;
let searchQuery = '';

// ---------- Filtro por músculo ----------
for (const [key, label] of [[null, 'Todos'], ...Object.entries(MUSCLES)]) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'pick';
  chip.dataset.muscle = key ?? '';
  chip.textContent = label;
  chip.addEventListener('click', () => {
    muscle = key;
    render();
  });
  filter.append(chip);
}

// ---------- Lista ----------
function createItem(ex) {
  const li = document.createElement('li');
  li.className = 'catalog-item';

  const info = document.createElement('div');
  info.className = 'catalog-info';

  const name = document.createElement('strong');
  name.textContent = ex.name;

  // Tags de músculo: tocar filtra por aquele músculo
  const tags = document.createElement('div');
  tags.className = 'tags';
  ex.muscles.forEach((m, i) => {
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = i === 0 ? 'tag tag-main' : 'tag';
    tag.textContent = MUSCLES[m];
    tag.title = i === 0 ? 'Músculo principal' : 'Músculo secundário';
    tag.addEventListener('click', () => {
      muscle = m;
      render();
    });
    tags.append(tag);
  });

  const actions = document.createElement('div');
  actions.className = 'catalog-actions';

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn btn-small';
  const renderAdd = () => {
    const added = todayExerciseIds().includes(ex.id);
    add.textContent = added ? '✓ No treino de hoje' : '+ Treino de hoje';
    add.disabled = added;
  };
  add.addEventListener('click', () => {
    if (addToToday(ex.id)) showToast(`${ex.name} adicionado ao treino de hoje.`);
    renderAdd();
  });
  renderAdd();
  actions.append(add);

  if (historyOf(ex.id).length || todayEntries(ex.id).length) {
    const link = document.createElement('a');
    link.className = 'link-small';
    link.href = `historico.html?ex=${ex.id}`;
    link.textContent = 'Histórico →';
    actions.append(link);
  }

  info.append(name, tags, actions);
  li.append(thumbElement(ex), info);
  return li;
}

function render() {
  filter.querySelectorAll('.pick').forEach(chip => {
    const active = chip.dataset.muscle === (muscle ?? '');
    chip.setAttribute('aria-pressed', active);
    if (active) chip.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  history.replaceState(null, '', muscle ? `?musculo=${muscle}` : location.pathname);

  const items = CATALOG.filter(ex => matchesQuery(ex, searchQuery) && (!muscle || ex.muscles.includes(muscle)));
  catalogList.replaceChildren(...items.map(createItem));
  counter.textContent = `${items.length} de ${CATALOG.length} exercícios${muscle ? ` · ${MUSCLES[muscle]}` : ''}`;
  emptyMessage.hidden = items.length > 0;
}

enableWheelScroll(filter);

searchListeners.push(query => {
  searchQuery = query;
  render();
});

render();

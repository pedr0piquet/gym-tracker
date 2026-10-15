// Usuário de exemplo até o login/banco existir
const mockUser = {
  id: 1,
  name: 'Gabriel',
  email: 'gabriel@exemplo.com',
};

// Exercícios criados pelo usuário (fora do catálogo do site)
const mockCustomExercises = [
  { id: 'abdominal-polia', name: 'Abdominal na polia', media: null, muscles: ['abdomen'], custom: true },
];

// Treinos fixos (máx. SETTINGS.maxPresets). days: 0 = domingo … 6 = sábado
const mockPresets = [
  {
    id: 'peito-triceps',
    name: 'Peito, ombro e tríceps',
    days: [1, 4],
    exercises: ['supino-reto', 'supino-inclinado', 'crucifixo', 'elevacao-lateral', 'triceps-corda'],
  },
  {
    id: 'pernas',
    name: 'Pernas',
    days: [2, 5],
    exercises: ['agachamento', 'leg-press', 'cadeira-extensora', 'mesa-flexora', 'panturrilha'],
  },
  {
    id: 'costas-biceps',
    name: 'Costas e bíceps',
    days: [3],
    exercises: ['puxada-frontal', 'remada-curvada', 'rosca-direta', 'rosca-martelo'],
  },
];

// Treinos anteriores por exercício, do mais recente para o mais antigo.
// Cada registro é "carga, vezes × reps" (ex.: 40 kg, 3 × 12)
const mockHistory = {
  'supino-reto': [
    { date: '2026-10-12', entries: [{ weight: 40, sets: 3, reps: 12 }] },
    { date: '2026-10-09', entries: [{ weight: 40, sets: 3, reps: 10 }] },
    { date: '2026-10-06', entries: [{ weight: 40, sets: 3, reps: 8 }] },
    { date: '2026-10-02', entries: [{ weight: 37.5, sets: 3, reps: 12 }] },
    { date: '2026-09-28', entries: [{ weight: 37.5, sets: 3, reps: 10 }] },
    { date: '2026-09-24', entries: [{ weight: 37.5, sets: 3, reps: 8 }] },
    { date: '2026-09-21', entries: [{ weight: 35, sets: 3, reps: 12 }] },
    { date: '2026-09-17', entries: [{ weight: 35, sets: 3, reps: 10 }] },
  ],
  'supino-inclinado': [
    { date: '2026-10-12', entries: [{ weight: 30, sets: 3, reps: 10 }] },
    { date: '2026-10-06', entries: [{ weight: 27.5, sets: 3, reps: 12 }] },
    { date: '2026-09-28', entries: [{ weight: 27.5, sets: 3, reps: 10 }] },
  ],
  'triceps-corda': [
    { date: '2026-10-12', entries: [{ weight: 25, sets: 3, reps: 12 }] },
    { date: '2026-10-06', entries: [{ weight: 22.5, sets: 3, reps: 12 }] },
  ],
  'elevacao-lateral': [
    { date: '2026-10-12', entries: [{ weight: 8, sets: 3, reps: 12 }] },
    { date: '2026-10-08', entries: [{ weight: 8, sets: 3, reps: 11 }] },
    { date: '2026-10-02', entries: [{ weight: 8, sets: 3, reps: 10 }] },
    { date: '2026-09-29', entries: [{ weight: 6, sets: 3, reps: 12 }] },
  ],
  'agachamento': [
    { date: '2026-10-10', entries: [{ weight: 60, sets: 2, reps: 12 }, { weight: 75, sets: 1, reps: 8 }] },
    { date: '2026-10-03', entries: [{ weight: 60, sets: 2, reps: 12 }, { weight: 70, sets: 1, reps: 8 }] },
    { date: '2026-09-26', entries: [{ weight: 60, sets: 3, reps: 10 }] },
    { date: '2026-09-19', entries: [{ weight: 55, sets: 3, reps: 10 }] },
    { date: '2026-09-15', entries: [{ weight: 50, sets: 3, reps: 12 }] },
  ],
  'leg-press': [
    { date: '2026-10-10', entries: [{ weight: 140, sets: 3, reps: 12 }] },
    { date: '2026-10-03', entries: [{ weight: 130, sets: 3, reps: 12 }] },
  ],
  'remada-curvada': [
    { date: '2026-10-08', entries: [{ weight: 35, sets: 3, reps: 12 }] },
  ],
  'rosca-direta': [
    { date: '2026-10-10', entries: [{ weight: 20, sets: 3, reps: 10 }] },
    { date: '2026-10-03', entries: [{ weight: 20, sets: 3, reps: 8 }] },
    { date: '2026-09-27', entries: [{ weight: 17.5, sets: 3, reps: 12 }] },
    { date: '2026-09-20', entries: [{ weight: 17.5, sets: 3, reps: 10 }] },
  ],
};

// Estado inicial do treino de hoje (na primeira visita do dia)
const mockToday = {
  extras: ['abdominal-polia'],           // exercícios avulsos, fora do treino fixo
  entries: {
    'supino-inclinado': [{ weight: 30, sets: 3, reps: 10 }],
    'abdominal-polia': [{ weight: 25, sets: 3, reps: 15 }],
  },
};

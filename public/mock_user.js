// Usuário de exemplo até o login/banco existir
const mockUser = {
  id: 1,
  name: 'Gabriel',
  email: 'gabriel@exemplo.com',
};

// Exercícios do Gabriel
// entries: registros de hoje — cada um é "carga, vezes × reps" (ex.: 40 kg, 3 × 12)
// history: treinos anteriores, do mais recente para o mais antigo
const mockExercises = [
  {
    id: 1,
    name: 'Supino reto',
    media: 'supino-reto',
    entries: [],
    history: [
      { date: '2026-10-12', entries: [{ weight: 40, sets: 3, reps: 12 }] },
      { date: '2026-10-09', entries: [{ weight: 40, sets: 3, reps: 10 }] },
      { date: '2026-10-06', entries: [{ weight: 40, sets: 3, reps: 8 }] },
      { date: '2026-10-02', entries: [{ weight: 37.5, sets: 3, reps: 12 }] },
      { date: '2026-09-28', entries: [{ weight: 37.5, sets: 3, reps: 10 }] },
      { date: '2026-09-24', entries: [{ weight: 37.5, sets: 3, reps: 8 }] },
      { date: '2026-09-21', entries: [{ weight: 35, sets: 3, reps: 12 }] },
      { date: '2026-09-17', entries: [{ weight: 35, sets: 3, reps: 10 }] },
    ],
  },
  {
    id: 2,
    name: 'Agachamento',
    media: 'agachamento',
    rest: 90,
    entries: [{ weight: 60, sets: 2, reps: 12 }, { weight: 80, sets: 1, reps: 8 }],
    history: [
      { date: '2026-10-10', entries: [{ weight: 60, sets: 2, reps: 12 }, { weight: 75, sets: 1, reps: 8 }] },
      { date: '2026-10-03', entries: [{ weight: 60, sets: 2, reps: 12 }, { weight: 70, sets: 1, reps: 8 }] },
      { date: '2026-09-26', entries: [{ weight: 60, sets: 3, reps: 10 }] },
      { date: '2026-09-19', entries: [{ weight: 55, sets: 3, reps: 10 }] },
      { date: '2026-09-15', entries: [{ weight: 50, sets: 3, reps: 12 }] },
    ],
  },
  {
    id: 3,
    name: 'Remada curvada',
    media: 'remada-curvada',
    entries: [{ weight: 35, sets: 2, reps: 12 }],
    history: [],
  },
  {
    id: 4,
    name: 'Rosca direta',
    media: 'rosca-direta',
    entries: [],
    history: [
      { date: '2026-10-10', entries: [{ weight: 20, sets: 3, reps: 10 }] },
      { date: '2026-10-03', entries: [{ weight: 20, sets: 3, reps: 8 }] },
      { date: '2026-09-27', entries: [{ weight: 17.5, sets: 3, reps: 12 }] },
      { date: '2026-09-20', entries: [{ weight: 17.5, sets: 3, reps: 10 }] },
    ],
  },
  {
    id: 5,
    name: 'Elevação lateral',
    media: 'elevacao-lateral',
    entries: [{ weight: 8, sets: 3, reps: 12 }],
    history: [
      { date: '2026-10-12', entries: [{ weight: 8, sets: 3, reps: 12 }] },
      { date: '2026-10-08', entries: [{ weight: 8, sets: 3, reps: 11 }] },
      { date: '2026-10-02', entries: [{ weight: 8, sets: 3, reps: 10 }] },
      { date: '2026-09-29', entries: [{ weight: 6, sets: 3, reps: 12 }] },
    ],
  },
  {
    id: 6,
    name: 'Abdominal na polia',          // exercício próprio, sem imagem do catálogo
    media: null,
    entries: [{ weight: 25, sets: 3, reps: 15 }],
    history: [],
  },
];

// Conta de demonstração (gabriel@email.com) com os dados que antes ficavam em
// public/mock_user.js.
// - Conta não existe → é criada com a senha DEMO_PASSWORD (ou 'gabriel123').
// - Conta existe e está vazia (sem treinos) → recebe os dados; a senha não muda.
// - Conta já tem dados → nada é feito.
import { db } from './db.js';
import { hashPassword } from './auth.js';

const DEMO = { name: 'Gabriel', email: 'gabriel@email.com' };

// Exercícios próprios (fora do catálogo). A chave é só para referência neste arquivo.
const customExercises = {
  'abdominal-polia': { name: 'Abdominal na polia', muscles: ['abdomen'] },
};

// days: 0 = domingo … 6 = sábado
const presets = [
  {
    name: 'Peito, ombro e tríceps',
    days: [1, 4],
    exercises: ['supino-reto', 'supino-inclinado', 'crucifixo', 'elevacao-lateral', 'triceps-corda'],
  },
  {
    name: 'Pernas',
    days: [2, 5],
    exercises: ['agachamento', 'leg-press', 'cadeira-extensora', 'mesa-flexora', 'panturrilha'],
  },
  {
    name: 'Costas e bíceps',
    days: [3],
    exercises: ['puxada-frontal', 'remada-curvada', 'rosca-direta', 'rosca-martelo'],
  },
];

// Treinos anteriores por exercício. Cada registro é "carga, vezes × reps".
const history = {
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

// Treino do dia em que o seed roda: um avulso e duas séries já feitas
const today = {
  extras: ['abdominal-polia'],
  entries: {
    'supino-inclinado': [{ weight: 30, sets: 3, reps: 10 }],
    'abdominal-polia': [{ weight: 25, sets: 3, reps: 15 }],
  },
};

function localISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Retorna 'created', 'filled' ou null (nada a fazer)
export async function seedDemo() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO.email);
  if (existing && db.prepare(`
    SELECT 1 FROM workouts WHERE user_id = @id
    UNION ALL SELECT 1 FROM workout_templates WHERE user_id = @id
    UNION ALL SELECT 1 FROM exercises WHERE user_id = @id
  `).get({ id: existing.id })) return null;

  const passwordHash = existing ? null : await hashPassword(process.env.DEMO_PASSWORD ?? 'gabriel123');

  db.transaction(() => {
    const userId = existing?.id ?? db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id')
      .get(DEMO.name, DEMO.email, passwordHash).id;

    // chave (slug do catálogo ou chave de customExercises) → exercises.id
    const exerciseIds = new Map();
    const insertExercise = db.prepare('INSERT INTO exercises (user_id, catalog_id, name) VALUES (?, ?, ?) RETURNING id');
    const findCatalog = db.prepare('SELECT id, name FROM exercise_catalog WHERE slug = ?');
    const exerciseId = key => {
      if (!exerciseIds.has(key)) {
        const catalog = findCatalog.get(key);
        if (!catalog) throw new Error(`Exercício "${key}" não está no catálogo (rode o seed do catálogo antes)`);
        exerciseIds.set(key, insertExercise.get(userId, catalog.id, catalog.name).id);
      }
      return exerciseIds.get(key);
    };

    const addMuscle = db.prepare('INSERT INTO exercise_muscles (exercise_id, muscle_id, is_primary) VALUES (?, ?, ?)');
    for (const [key, ex] of Object.entries(customExercises)) {
      const id = insertExercise.get(userId, null, ex.name).id;
      ex.muscles.forEach((m, i) => addMuscle.run(id, m, i === 0 ? 1 : 0));
      exerciseIds.set(key, id);
    }

    const insertPreset = db.prepare('INSERT INTO workout_templates (user_id, name, days) VALUES (?, ?, ?) RETURNING id');
    const insertPresetExercise = db.prepare('INSERT INTO workout_template_exercises (template_id, exercise_id, position) VALUES (?, ?, ?)');
    let todayTemplate = null; // treino fixo do dia da semana de hoje, como o app escolheria
    for (const p of presets) {
      const templateId = insertPreset.get(userId, p.name, p.days.join(',')).id;
      if (todayTemplate === null && p.days.includes(new Date().getDay())) todayTemplate = templateId;
      p.exercises.forEach((key, i) => insertPresetExercise.run(templateId, exerciseId(key), i));
    }

    // Reagrupa por data: um treino por dia, com os exercícios daquele dia
    const byDate = new Map();
    for (const [key, sessions] of Object.entries(history)) {
      for (const s of sessions) {
        if (!byDate.has(s.date)) byDate.set(s.date, []);
        byDate.get(s.date).push([key, s.entries]);
      }
    }
    const todayDate = localISO();
    byDate.set(todayDate, [
      ...today.extras.filter(key => !today.entries[key]).map(key => [key, []]),
      ...Object.entries(today.entries),
    ]);

    const insertWorkout = db.prepare('INSERT INTO workouts (user_id, date, template_id) VALUES (?, ?, ?) RETURNING id');
    const insertWorkoutExercise = db.prepare('INSERT INTO workout_exercises (workout_id, exercise_id, position) VALUES (?, ?, ?) RETURNING id');
    const insertSet = db.prepare('INSERT INTO sets (workout_exercise_id, set_number, weight, sets_count, reps) VALUES (?, ?, ?, ?, ?)');
    for (const date of [...byDate.keys()].sort()) {
      const workoutId = insertWorkout.get(userId, date, date === todayDate ? todayTemplate : null).id;
      byDate.get(date).forEach(([key, entries], position) => {
        const weId = insertWorkoutExercise.get(workoutId, exerciseId(key), position).id;
        entries.forEach((e, i) => insertSet.run(weId, i + 1, e.weight, e.sets, e.reps));
      });
    }
  })();
  return existing ? 'filled' : 'created';
}

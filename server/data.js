// Dados do usuário logado: estado completo, treinos fixos, treino do dia e séries.
// Toda consulta filtra por req.user.id.
//
// Ids que o frontend usa para exercícios:
//   exercício do catálogo   → slug ('supino-reto')
//   exercício próprio       → 'u' + exercises.id ('u12')
// Treinos fixos usam o id numérico como texto ('3').
import express from 'express';
import { db } from './db.js';
import { requireAuth } from './auth.js';

export const MAX_PRESETS = 5; // SETTINGS.maxPresets no frontend

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

const weekdayOf = date => new Date(`${date}T00:00:00Z`).getUTCDay();
const parseDays = text => (text ? text.split(',').map(Number) : []);

function requireDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new HttpError(400, 'Data inválida (use AAAA-MM-DD)');
  }
  return value;
}

// ---------- Exercícios: id do frontend ↔ exercises.id ----------
const clientExerciseId = row => row.slug ?? `u${row.exercise_id}`;

const findOwnExercise = db.prepare('SELECT id FROM exercises WHERE id = ? AND user_id = ?');
const findCatalog = db.prepare('SELECT id, name FROM exercise_catalog WHERE slug = ?');
const findFromCatalog = db.prepare('SELECT id FROM exercises WHERE user_id = ? AND catalog_id = ?');
const insertFromCatalog = db.prepare('INSERT INTO exercises (user_id, catalog_id, name) VALUES (?, ?, ?) RETURNING id');

// Exercício do catálogo vira linha em `exercises` no primeiro uso
function resolveExercise(userId, clientId) {
  if (typeof clientId !== 'string') throw new HttpError(400, 'Exercício inválido');

  const own = /^u(\d+)$/.exec(clientId);
  if (own) {
    const row = findOwnExercise.get(Number(own[1]), userId);
    if (!row) throw new HttpError(404, 'Exercício não encontrado');
    return row.id;
  }

  const catalog = findCatalog.get(clientId);
  if (!catalog) throw new HttpError(404, 'Exercício não encontrado');
  const existing = findFromCatalog.get(userId, catalog.id);
  if (existing) return existing.id;
  try {
    return insertFromCatalog.get(userId, catalog.id, catalog.name).id;
  } catch (err) {
    // O usuário já tem um exercício próprio com esse nome
    if (err.code !== 'SQLITE_CONSTRAINT_UNIQUE') throw err;
    return insertFromCatalog.get(userId, catalog.id, `${catalog.name} (catálogo)`).id;
  }
}

// ---------- Leitura ----------
const selectCustomExercises = db.prepare(`
  SELECT e.id, e.name, em.muscle_id
  FROM exercises e
  LEFT JOIN exercise_muscles em ON em.exercise_id = e.id
  WHERE e.user_id = ? AND e.catalog_id IS NULL
  ORDER BY e.name, em.is_primary DESC, em.muscle_id`);

const selectPresets = db.prepare(`
  SELECT id, name, days FROM workout_templates WHERE user_id = ? ORDER BY created_at, id`);

const selectPresetExercises = db.prepare(`
  SELECT te.template_id, te.exercise_id, c.slug
  FROM workout_template_exercises te
  JOIN workout_templates t ON t.id = te.template_id
  JOIN exercises e         ON e.id = te.exercise_id
  LEFT JOIN exercise_catalog c ON c.id = e.catalog_id
  WHERE t.user_id = ?
  ORDER BY te.template_id, te.position`);

// Todas as séries antes de hoje, do treino mais recente para o mais antigo
const selectHistory = db.prepare(`
  SELECT w.date, we.exercise_id, c.slug, s.weight, s.sets_count, s.reps
  FROM workouts w
  JOIN workout_exercises we ON we.workout_id = w.id
  JOIN exercises e          ON e.id = we.exercise_id
  LEFT JOIN exercise_catalog c ON c.id = e.catalog_id
  JOIN sets s               ON s.workout_exercise_id = we.id
  WHERE w.user_id = ? AND w.date < ?
  ORDER BY w.date DESC, s.set_number`);

const selectWorkout = db.prepare('SELECT id, template_id FROM workouts WHERE user_id = ? AND date = ?');

const selectWorkoutExercises = db.prepare(`
  SELECT we.id, we.exercise_id, c.slug
  FROM workout_exercises we
  JOIN exercises e ON e.id = we.exercise_id
  LEFT JOIN exercise_catalog c ON c.id = e.catalog_id
  WHERE we.workout_id = ?
  ORDER BY we.position`);

const selectSetsOf = db.prepare(`
  SELECT weight, sets_count, reps FROM sets WHERE workout_exercise_id = ? ORDER BY set_number`);

const toEntry = s => ({ weight: s.weight, sets: s.sets_count, reps: s.reps });

function loadPresets(userId) {
  const presets = selectPresets.all(userId).map(t => ({
    id: String(t.id), name: t.name, days: parseDays(t.days), exercises: [],
  }));
  const byId = new Map(presets.map(p => [p.id, p]));
  for (const row of selectPresetExercises.all(userId)) {
    byId.get(String(row.template_id))?.exercises.push(clientExerciseId(row));
  }
  return presets;
}

// Sem treino salvo no dia: sugere o primeiro treino fixo daquele dia da semana
function defaultPresetId(presets, date) {
  return presets.find(p => p.days.includes(weekdayOf(date)))?.id ?? null;
}

function loadState(user, date) {
  const customs = new Map();
  for (const row of selectCustomExercises.all(user.id)) {
    const id = `u${row.id}`;
    if (!customs.has(id)) customs.set(id, { id, name: row.name, media: null, muscles: [], custom: true });
    if (row.muscle_id) customs.get(id).muscles.push(row.muscle_id);
  }

  const presets = loadPresets(user.id);

  // history: { exId: [{ date, entries }] }, do mais recente para o mais antigo
  const history = {};
  for (const row of selectHistory.all(user.id, date)) {
    const sessions = (history[clientExerciseId(row)] ??= []);
    if (sessions.at(-1)?.date !== row.date) sessions.push({ date: row.date, entries: [] });
    sessions.at(-1).entries.push(toEntry(row));
  }

  const workout = selectWorkout.get(user.id, date);
  const today = { date, presetId: defaultPresetId(presets, date), extras: [], entries: {} };
  if (workout) {
    today.presetId = workout.template_id === null ? null : String(workout.template_id);
    for (const row of selectWorkoutExercises.all(workout.id)) {
      const exId = clientExerciseId(row);
      today.extras.push(exId);
      const sets = selectSetsOf.all(row.id);
      if (sets.length) today.entries[exId] = sets.map(toEntry);
    }
  }

  return { user, customExercises: [...customs.values()], presets, history, today };
}

// ---------- Treino do dia (escrita) ----------
const insertWorkout = db.prepare(`
  INSERT INTO workouts (user_id, date, template_id) VALUES (?, ?, ?)
  ON CONFLICT (user_id, date) DO NOTHING`);
const setWorkoutTemplate = db.prepare('UPDATE workouts SET template_id = ? WHERE id = ?');
const findTemplate = db.prepare('SELECT id FROM workout_templates WHERE id = ? AND user_id = ?');

function getOrCreateWorkout(userId, date) {
  const existing = selectWorkout.get(userId, date);
  if (existing) return existing.id;
  const preset = defaultPresetId(loadPresets(userId), date);
  insertWorkout.run(userId, date, preset === null ? null : Number(preset));
  return selectWorkout.get(userId, date).id;
}

const findWorkoutExercise = db.prepare('SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?');
const insertWorkoutExercise = db.prepare(`
  INSERT INTO workout_exercises (workout_id, exercise_id, position)
  VALUES (?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM workout_exercises WHERE workout_id = ?))
  RETURNING id`);

function getOrCreateWorkoutExercise(workoutId, exerciseId) {
  return findWorkoutExercise.get(workoutId, exerciseId)?.id
    ?? insertWorkoutExercise.get(workoutId, exerciseId, workoutId).id;
}

const insertSet = db.prepare(`
  INSERT INTO sets (workout_exercise_id, set_number, weight, sets_count, reps)
  VALUES (?, (SELECT COALESCE(MAX(set_number), 0) + 1 FROM sets WHERE workout_exercise_id = ?), ?, ?, ?)`);
const countSets = db.prepare('SELECT COUNT(*) AS n FROM sets WHERE workout_exercise_id = ?');
const deleteWorkoutExercise = db.prepare('DELETE FROM workout_exercises WHERE id = ?');

// ---------- Treinos fixos (escrita) ----------
const countPresets = db.prepare('SELECT COUNT(*) AS n FROM workout_templates WHERE user_id = ?');
const insertPreset = db.prepare('INSERT INTO workout_templates (user_id, name, days) VALUES (?, ?, ?) RETURNING id');
const updatePreset = db.prepare('UPDATE workout_templates SET name = ?, days = ? WHERE id = ?');
const clearPresetExercises = db.prepare('DELETE FROM workout_template_exercises WHERE template_id = ?');
const insertPresetExercise = db.prepare('INSERT INTO workout_template_exercises (template_id, exercise_id, position) VALUES (?, ?, ?)');
const deletePreset = db.prepare('DELETE FROM workout_templates WHERE id = ?');

function readPreset(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 60) throw new HttpError(400, 'Informe um nome de até 60 caracteres');

  const days = body.days ?? [];
  if (!Array.isArray(days) || !days.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) {
    throw new HttpError(400, 'Dias inválidos');
  }

  const exercises = body.exercises;
  if (!Array.isArray(exercises) || !exercises.length || exercises.length > 50) {
    throw new HttpError(400, 'Adicione de 1 a 50 exercícios ao treino');
  }
  return { name, days: [...new Set(days)].sort().join(','), exercises: [...new Set(exercises)] };
}

function writePresetExercises(userId, templateId, exercises) {
  clearPresetExercises.run(templateId);
  exercises.forEach((clientId, position) => {
    insertPresetExercise.run(templateId, resolveExercise(userId, clientId), position);
  });
}

function ownTemplate(userId, id) {
  const row = /^\d+$/.test(String(id)) && findTemplate.get(Number(id), userId);
  if (!row) throw new HttpError(404, 'Treino não encontrado');
  return row.id;
}

const presetOut = (userId, id) => loadPresets(userId).find(p => p.id === String(id));

// ---------- Rotas (/api) ----------
export const dataRoutes = express.Router();
dataRoutes.use(requireAuth);

dataRoutes.get('/state', (req, res) => {
  res.json(loadState(req.user, requireDate(req.query.today)));
});

dataRoutes.post('/presets', (req, res) => {
  const preset = readPreset(req.body);
  const id = db.transaction(() => {
    if (countPresets.get(req.user.id).n >= MAX_PRESETS) {
      throw new HttpError(409, `Máximo de ${MAX_PRESETS} treinos. Exclua um para criar outro.`);
    }
    const { id } = insertPreset.get(req.user.id, preset.name, preset.days);
    writePresetExercises(req.user.id, id, preset.exercises);
    return id;
  })();
  res.status(201).json({ preset: presetOut(req.user.id, id) });
});

dataRoutes.put('/presets/:id', (req, res) => {
  const preset = readPreset(req.body);
  const id = ownTemplate(req.user.id, req.params.id);
  db.transaction(() => {
    updatePreset.run(preset.name, preset.days, id);
    writePresetExercises(req.user.id, id, preset.exercises);
  })();
  res.json({ preset: presetOut(req.user.id, id) });
});

dataRoutes.delete('/presets/:id', (req, res) => {
  deletePreset.run(ownTemplate(req.user.id, req.params.id)); // workouts.template_id vira NULL
  res.status(204).end();
});

// Escolher o treino fixo do dia (presetId null = livre)
dataRoutes.put('/days/:date/preset', (req, res) => {
  const date = requireDate(req.params.date);
  const presetId = req.body?.presetId ?? null;
  const templateId = presetId === null ? null : ownTemplate(req.user.id, presetId);
  db.transaction(() => setWorkoutTemplate.run(templateId, getOrCreateWorkout(req.user.id, date)))();
  res.status(204).end();
});

// Adicionar exercício avulso ao dia
dataRoutes.post('/days/:date/exercises', (req, res) => {
  const date = requireDate(req.params.date);
  db.transaction(() => {
    const exerciseId = resolveExercise(req.user.id, req.body?.exerciseId);
    getOrCreateWorkoutExercise(getOrCreateWorkout(req.user.id, date), exerciseId);
  })();
  res.status(204).end();
});

// Tirar exercício avulso do dia (só se ainda não tem série)
dataRoutes.delete('/days/:date/exercises/:exerciseId', (req, res) => {
  const date = requireDate(req.params.date);
  const workout = selectWorkout.get(req.user.id, date);
  const exerciseId = resolveExercise(req.user.id, req.params.exerciseId);
  const row = workout && findWorkoutExercise.get(workout.id, exerciseId);
  if (row) {
    if (countSets.get(row.id).n) throw new HttpError(409, 'Esse exercício já tem séries registradas hoje');
    deleteWorkoutExercise.run(row.id);
  }
  res.status(204).end();
});

// Registrar série: { exerciseId, weight (kg), sets, reps }
dataRoutes.post('/days/:date/sets', (req, res) => {
  const date = requireDate(req.params.date);
  const { weight, sets, reps } = req.body ?? {};
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0 || weight > 2000) {
    throw new HttpError(400, 'Carga inválida');
  }
  if (!Number.isInteger(sets) || sets < 1 || sets > 50) throw new HttpError(400, 'Número de séries inválido');
  if (!Number.isInteger(reps) || reps < 1 || reps > 1000) throw new HttpError(400, 'Número de reps inválido');

  db.transaction(() => {
    const exerciseId = resolveExercise(req.user.id, req.body.exerciseId);
    const weId = getOrCreateWorkoutExercise(getOrCreateWorkout(req.user.id, date), exerciseId);
    insertSet.run(weId, weId, weight, sets, reps);
  })();
  res.status(201).json({ entry: { weight, sets, reps } });
});

-- Schema do Diário de Cargas (ver docs/requisitos.md, "Modelo de dados").
-- Roda uma vez, quando o banco é criado (PRAGMA user_version = 0).
-- Mudanças futuras entram como migrações em db.js, sem editar o que já rodou.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_sessions (
  id         TEXT PRIMARY KEY,               -- token aleatório
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE exercise_catalog (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,         -- 'supino-reto' (o mesmo id de public/catalog.js)
  name         TEXT NOT NULL UNIQUE,         -- pt-BR
  image_start  TEXT,                         -- caminho local, ex.: media/supino-reto-0.jpg
  image_end    TEXT,
  rest_seconds INTEGER NOT NULL DEFAULT 30,  -- descanso recomendado
  source       TEXT NOT NULL,                -- ex.: 'free-exercise-db'
  license      TEXT NOT NULL                 -- ex.: 'Unlicense'
);

CREATE TABLE muscles (
  id   TEXT PRIMARY KEY,                     -- 'peito', 'triceps', 'posterior'…
  name TEXT NOT NULL                         -- 'Peito', 'Tríceps', 'Posterior de coxa'
);

CREATE TABLE catalog_muscles (
  catalog_id INTEGER NOT NULL REFERENCES exercise_catalog(id) ON DELETE CASCADE,
  muscle_id  TEXT    NOT NULL REFERENCES muscles(id),
  is_primary INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (catalog_id, muscle_id)
);

CREATE TABLE exercises (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id INTEGER REFERENCES exercise_catalog(id),
  name       TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE exercise_muscles (
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  muscle_id   TEXT    NOT NULL REFERENCES muscles(id),
  is_primary  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (exercise_id, muscle_id)
);

CREATE TABLE workout_templates (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  days       TEXT NOT NULL DEFAULT '',       -- '1,4' = segunda e quinta
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workout_template_exercises (
  template_id INTEGER NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position    INTEGER NOT NULL,
  PRIMARY KEY (template_id, exercise_id)
);

CREATE TABLE workouts (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date    TEXT NOT NULL,                     -- YYYY-MM-DD
  notes   TEXT
);

CREATE TABLE workout_exercises (
  id          INTEGER PRIMARY KEY,
  workout_id  INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position    INTEGER NOT NULL
);

CREATE TABLE sets (
  id                  INTEGER PRIMARY KEY,
  workout_exercise_id INTEGER NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
  set_number          INTEGER NOT NULL,
  weight              REAL    NOT NULL CHECK (weight >= 0),           -- kg
  sets_count          INTEGER NOT NULL DEFAULT 1 CHECK (sets_count > 0), -- "vezes": 3 em 3 × 12
  reps                INTEGER NOT NULL CHECK (reps > 0),
  created_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user      ON auth_sessions(user_id);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_catalog_muscles    ON catalog_muscles(muscle_id);
CREATE INDEX idx_we_workout         ON workout_exercises(workout_id);
CREATE INDEX idx_we_exercise        ON workout_exercises(exercise_id);
CREATE INDEX idx_sets_we            ON sets(workout_exercise_id);

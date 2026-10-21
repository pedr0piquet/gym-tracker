// Conexão única com o SQLite e migrações por PRAGMA user_version.
import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = process.env.DB_PATH ?? join(here, '..', 'data', 'gym.db');

// Cada item roda uma vez, em ordem. Para mudar o schema, adicione um item no fim
// (nunca edite um que já rodou em produção).
const MIGRATIONS = [
  db => db.exec(readFileSync(join(here, 'schema.sql'), 'utf8')),

  // 2: treino fixo escolhido no dia; um treino por dia; cada exercício uma vez por dia;
  //    cada exercício do catálogo vira no máximo um exercício por usuário
  db => db.exec(`
    ALTER TABLE workouts ADD COLUMN template_id INTEGER REFERENCES workout_templates(id) ON DELETE SET NULL;
    DROP INDEX idx_workouts_user_date;
    CREATE UNIQUE INDEX ux_workouts_user_date     ON workouts(user_id, date);
    CREATE UNIQUE INDEX ux_we_workout_exercise    ON workout_exercises(workout_id, exercise_id);
    CREATE UNIQUE INDEX ux_exercises_user_catalog ON exercises(user_id, catalog_id);
  `),
];

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');   // leituras não travam durante escrita
db.pragma('foreign_keys = ON');    // SQLite vem com FKs desligadas
db.pragma('busy_timeout = 5000');

const version = db.pragma('user_version', { simple: true });
for (let i = version; i < MIGRATIONS.length; i++) {
  db.transaction(() => {
    MIGRATIONS[i](db);
    db.pragma(`user_version = ${i + 1}`);
  })();
  console.log(`[db] migração ${i + 1} aplicada`);
}

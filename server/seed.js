// Popula muscles e exercise_catalog a partir de public/catalog.js (fonte única do catálogo)
// e cria a conta de demonstração (server/demo.js).
// Pode rodar de novo: atualiza o que mudou e não duplica.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { db } from './db.js';
import { seedDemo } from './demo.js';

const DEFAULT_REST = 30; // SETTINGS.restSeconds no frontend

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '..', 'public', 'catalog.js'), 'utf8');
const { MUSCLES, CATALOG } = vm.runInNewContext(`${source}\n;({ MUSCLES, CATALOG })`);

const upsertMuscle = db.prepare(`
  INSERT INTO muscles (id, name) VALUES (?, ?)
  ON CONFLICT (id) DO UPDATE SET name = excluded.name`);

const upsertExercise = db.prepare(`
  INSERT INTO exercise_catalog (slug, name, image_start, image_end, rest_seconds, source, license)
  VALUES (@slug, @name, @image_start, @image_end, @rest_seconds, 'free-exercise-db', 'Unlicense')
  ON CONFLICT (slug) DO UPDATE SET
    name = excluded.name, image_start = excluded.image_start, image_end = excluded.image_end,
    rest_seconds = excluded.rest_seconds
  RETURNING id`);

const clearMuscles = db.prepare('DELETE FROM catalog_muscles WHERE catalog_id = ?');
const addMuscle = db.prepare('INSERT INTO catalog_muscles (catalog_id, muscle_id, is_primary) VALUES (?, ?, ?)');

db.transaction(() => {
  for (const [id, name] of Object.entries(MUSCLES)) upsertMuscle.run(id, name);

  for (const ex of CATALOG) {
    const { id } = upsertExercise.get({
      slug: ex.id,
      name: ex.name,
      image_start: ex.media ? `media/${ex.media}-0.jpg` : null,
      image_end: ex.media ? `media/${ex.media}-1.jpg` : null,
      rest_seconds: ex.rest ?? DEFAULT_REST,
    });
    clearMuscles.run(id);
    ex.muscles.forEach((m, i) => addMuscle.run(id, m, i === 0 ? 1 : 0));
  }
})();

console.log(`[seed] ${Object.keys(MUSCLES).length} músculos, ${CATALOG.length} exercícios no catálogo`);

const demo = await seedDemo();
if (demo === 'created') {
  console.log('[seed] conta de demonstração criada: gabriel@email.com (senha: DEMO_PASSWORD ou gabriel123)');
} else if (demo === 'filled') {
  console.log('[seed] dados de demonstração carregados na conta gabriel@email.com (senha mantida)');
}

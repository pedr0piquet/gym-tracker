// Baixa as fotos (início e fim do movimento) dos exercícios de public/catalog.js
// que ainda não estão em public/media/. Fonte: free-exercise-db (domínio público).
// Cada exercício do catálogo indica o item de origem em `src`.
//   npm run media
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

const here = dirname(fileURLToPath(import.meta.url));
const mediaDir = join(here, '..', 'public', 'media');
const source = readFileSync(join(here, '..', 'public', 'catalog.js'), 'utf8');
const { CATALOG } = vm.runInNewContext(`${source}\n;({ CATALOG })`);

// Até 3 tentativas: a conexão com o GitHub às vezes cai no meio de muitos downloads
async function download(url) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      return { status: res.status, ok: res.ok, data: Buffer.from(await res.arrayBuffer()) };
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
}

let downloaded = 0;
const missingSrc = [];

for (const ex of CATALOG) {
  for (const frame of [0, 1]) {
    const file = join(mediaDir, `${ex.media}-${frame}.jpg`);
    if (existsSync(file)) continue;
    if (!ex.src) {
      missingSrc.push(ex.id);
      break;
    }
    const res = await download(`${BASE}/${encodeURIComponent(ex.src)}/${frame}.jpg`);
    const { data } = res;
    // Só grava se for mesmo um JPEG (começa com FF D8)
    if (!res.ok || data[0] !== 0xff || data[1] !== 0xd8) {
      throw new Error(`${ex.id}: não foi possível baixar ${ex.src}/${frame}.jpg (HTTP ${res.status})`);
    }
    writeFileSync(file, data);
    downloaded++;
  }
}

console.log(`[media] ${downloaded} imagens baixadas; ${CATALOG.length} exercícios no catálogo`);
if (missingSrc.length) console.log(`[media] sem imagem e sem src: ${missingSrc.join(', ')}`);

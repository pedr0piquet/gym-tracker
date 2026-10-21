// Servidor: entrega o frontend (public/) e a API em /api, no mesmo endereço
// (sem CORS e com cookie de sessão SameSite=Lax).
import express from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { authRoutes, loadUser } from './auth.js';
import { dataRoutes } from './data.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1'; // só local; o acesso externo vem pelo túnel

const here = dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

// ---------- API ----------
const api = express.Router();

// Contra CSRF: toda escrita (inclusive sem corpo, como o logout) vem com
// Content-Type: application/json. Um formulário de outro site não consegue mandar
// esse cabeçalho sem passar pelo CORS, que aqui não está liberado.
api.use((req, res, next) => {
  const isWrite = req.method !== 'GET' && req.method !== 'HEAD';
  if (isWrite && !(req.headers['content-type'] ?? '').startsWith('application/json')) {
    return res.status(415).json({ error: 'Envie o corpo como application/json' });
  }
  next();
});

api.use(loadUser);
api.use('/auth', authRoutes);

// A página do GitHub Pages consulta esta rota antes de redirecionar para cá.
// Só ela libera CORS, e sem cookies (o resto da API continua só para o mesmo endereço).
const PAGES_ORIGIN = process.env.PAGES_ORIGIN ?? 'https://pedr0piquet.github.io';

api.get('/health', (req, res) => {
  res.set('Access-Control-Allow-Origin', PAGES_ORIGIN);
  db.prepare('SELECT 1').get();
  res.json({ ok: true });
});

api.get('/muscles', (req, res) => {
  res.json(db.prepare('SELECT id, name FROM muscles ORDER BY name').all());
});

api.use(dataRoutes); // exige login daqui em diante

api.use((req, res) => res.status(404).json({ error: 'Rota não encontrada' }));

app.use('/api', api);

// ---------- Frontend ----------
app.use(express.static(join(here, '..', 'public'), { extensions: ['html'] }));

// ---------- Erros ----------
app.use((err, req, res, next) => {
  const status = err.status ?? 500;
  if (status >= 500) console.error(err); // 4xx são erros do pedido (dado inválido etc.)
  res.status(status).json({ error: err.expose ? err.message : 'Erro interno' });
});

app.listen(PORT, HOST, () => console.log(`[server] http://${HOST}:${PORT}`));

// Cadastro, login e sessão (cookie httpOnly com token aleatório).
import express from 'express';
import { argon2, createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './db.js';

const argon2Async = promisify(argon2);

const COOKIE = 'sid';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

// Parâmetros mínimos recomendados pela OWASP para argon2id (19 MiB, 2 passadas)
const ARGON = { memory: 19456, passes: 2, parallelism: 1, tagLength: 32 };

// ---------- Senhas ----------
// Formato guardado: argon2id$m=19456,t=2,p=1$<salt b64>$<hash b64>
export async function hashPassword(password) {
  const nonce = randomBytes(16);
  const hash = await argon2Async('argon2id', { message: password, nonce, ...ARGON });
  const params = `m=${ARGON.memory},t=${ARGON.passes},p=${ARGON.parallelism}`;
  return ['argon2id', params, nonce.toString('base64'), hash.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [alg, params, salt, hash] = stored.split('$');
  const { m, t, p } = Object.fromEntries(params.split(',').map(kv => kv.split('=')));
  const expected = Buffer.from(hash, 'base64');
  const actual = await argon2Async(alg, {
    message: password, nonce: Buffer.from(salt, 'base64'),
    memory: Number(m), passes: Number(t), parallelism: Number(p), tagLength: expected.length,
  });
  return timingSafeEqual(actual, expected);
}

// Usado quando o e-mail não existe, para o tempo de resposta não denunciar quem tem conta
const DUMMY_HASH = await hashPassword(randomBytes(16).toString('hex'));

// ---------- Sessões ----------
// O cookie leva o token; o banco guarda só o SHA-256 dele (vazar o .db não entrega sessões).
const tokenId = token => createHash('sha256').update(token).digest('hex');

const insertSession = db.prepare('INSERT INTO auth_sessions (id, user_id, expires_at) VALUES (?, ?, ?)');
const findSession = db.prepare(`
  SELECT s.id, s.expires_at, u.id AS user_id, u.name, u.email
  FROM auth_sessions s JOIN users u ON u.id = s.user_id
  WHERE s.id = ?`);
const renewSession = db.prepare('UPDATE auth_sessions SET expires_at = ? WHERE id = ?');
const deleteSession = db.prepare('DELETE FROM auth_sessions WHERE id = ?');
const deleteExpired = db.prepare('DELETE FROM auth_sessions WHERE expires_at < ?');

const expiryFromNow = () => new Date(Date.now() + SESSION_DAYS * DAY_MS).toISOString();

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', // HTTPS via túnel; em dev é http://localhost
    path: '/',
    maxAge: SESSION_DAYS * DAY_MS,
  };
}

function startSession(res, userId) {
  const token = randomBytes(32).toString('base64url');
  insertSession.run(tokenId(token), userId, expiryFromNow());
  res.cookie(COOKIE, token, cookieOptions());
}

function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

// Preenche req.user quando há sessão válida. Renova o prazo quando passou da metade.
export function loadUser(req, res, next) {
  const token = readCookie(req, COOKIE);
  if (!token) return next();

  const session = findSession.get(tokenId(token));
  const expiresAt = session && Date.parse(session.expires_at);
  if (!session || expiresAt < Date.now()) {
    if (session) deleteSession.run(session.id);
    res.clearCookie(COOKIE, { path: '/' });
    return next();
  }

  if (expiresAt - Date.now() < (SESSION_DAYS / 2) * DAY_MS) {
    renewSession.run(expiryFromNow(), session.id);
    res.cookie(COOKIE, token, cookieOptions());
  }
  req.sessionId = session.id;
  req.user = { id: session.user_id, name: session.name, email: session.email };
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Faça login para continuar' });
  next();
}

// Limpeza das sessões vencidas (no início e a cada hora)
const purgeExpired = () => deleteExpired.run(new Date().toISOString());
purgeExpired();
setInterval(purgeExpired, 60 * 60 * 1000).unref();

// ---------- Limite de tentativas de login ----------
// Em memória: 10 falhas por e-mail a cada 15 min. (Atrás do túnel todo mundo chega
// como 127.0.0.1, por isso a chave é o e-mail e não o IP.)
const MAX_FAILURES = 10;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map(); // email → { count, resetAt }

function isLocked(email) {
  const entry = failures.get(email);
  if (entry && entry.resetAt < Date.now()) failures.delete(email);
  return (failures.get(email)?.count ?? 0) >= MAX_FAILURES;
}

function recordFailure(email) {
  const entry = failures.get(email) ?? { count: 0, resetAt: Date.now() + WINDOW_MS };
  entry.count++;
  failures.set(email, entry);
}

// ---------- Validação ----------
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function badRequest(res, error) {
  return res.status(400).json({ error });
}

const cleanEmail = email => (typeof email === 'string' ? email.trim().toLowerCase() : '');

// ---------- Rotas (/api/auth) ----------
const findUserByEmail = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?) RETURNING id, name, email');

export const authRoutes = express.Router();

authRoutes.post('/register', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;

  if (!name || name.length > 80) return badRequest(res, 'Informe um nome de até 80 caracteres');
  if (!EMAIL_RE.test(email) || email.length > 254) return badRequest(res, 'E-mail inválido');
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return badRequest(res, 'A senha precisa ter de 8 a 128 caracteres');
  }

  const hash = await hashPassword(password);
  let user;
  try {
    user = insertUser.get(name, email, hash);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Este e-mail já tem cadastro' });
    }
    throw err;
  }

  startSession(res, user.id);
  res.status(201).json({ user });
});

authRoutes.post('/login', async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const password = req.body?.password;
  if (!email || typeof password !== 'string') return badRequest(res, 'Informe e-mail e senha');

  if (isLocked(email)) {
    return res.status(429).json({ error: 'Muitas tentativas. Tente de novo em alguns minutos' });
  }

  const user = findUserByEmail.get(email);
  const ok = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) {
    recordFailure(email);
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });
  }

  failures.delete(email);
  startSession(res, user.id);
  res.json({ user: { id: user.id, name: user.name, email: user.email } });
});

authRoutes.post('/logout', (req, res) => {
  if (req.sessionId) deleteSession.run(req.sessionId);
  res.clearCookie(COOKIE, { path: '/' });
  res.status(204).end();
});

authRoutes.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

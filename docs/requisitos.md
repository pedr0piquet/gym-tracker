# Diário de Cargas — Requisitos e Modelo de Dados

Web app para registrar exercícios, cargas e repetições ao longo das semanas e acompanhar a progressão.

## Decisões de escopo

- O app é um **diário de cargas**: o usuário registra o que fez, na ordem que quiser.
- **Treinos fixos** opcionais: o usuário monta até **5** rotinas próprias (ex.: segunda = pernas). Não há fichas prontas do app.
- **Sem** metas de séries/reps. Tempo de descanso aparece só como recomendação.
- Única sugestão automática: **progressão dupla** (ver "Sugestão de progressão").
- O usuário decide a rotina e a sequência dos exercícios.
- O app só cataloga **carga e volume** de cada exercício e mostra a evolução.
- Volume, carga máxima e recordes são **calculados** a partir das séries, não armazenados.

## Requisitos funcionais

### Login simples
- Cadastro com nome, e-mail e senha.
- Login/logout com sessão persistente (cookie httpOnly).
- Cada usuário vê apenas os próprios dados.

### Exercícios (catálogo)
- **Catálogo pronto** de exercícios, compartilhado por todos os usuários, com animação instrutiva.
- O usuário escolhe do catálogo ou cria e nomeia os próprios exercícios.
- Cada exercício tem **tags de músculo** (um ou mais; o primeiro é o principal):
  peito, costas, ombros, bíceps, tríceps, antebraço, abdômen, quadríceps, posterior de coxa, glúteos, panturrilha.
- As tags servem para **filtrar e buscar**: na página Exercícios, na busca do topo,
  ao adicionar exercício no Painel e ao montar um treino ("tríceps" encontra tudo que trabalha tríceps).
- Descanso recomendado por exercício (padrão 30 s; ex.: 90 s em agachamento, leg press, stiff).

### Treinos fixos (rotina)
- Até **5** treinos por usuário (configurável: `SETTINGS.maxPresets`).
- Cada treino tem nome, dias da semana (opcional) e lista ordenada de exercícios.
- Montagem: busca por nome ou músculo + filtro por músculo; reordenar (subir/descer) e remover.
- No Painel, o treino do dia é escolhido automaticamente pelo dia da semana; o usuário pode trocar
  ou treinar "livre". Exercícios avulsos podem ser adicionados só para hoje.
- Excluir um treino **não** apaga o histórico dos exercícios.

### Registro
- Iniciar o treino do dia.
- Adicionar qualquer exercício, em qualquer ordem.
- Registrar cada exercício como **um registro**: carga (kg), vezes (séries) e reps — ex.: 40 kg · 3 × 12.
- Vários registros no mesmo exercício quando a carga ou as reps mudam (ex.: 60 kg · 2 × 12 + 80 kg · 1 × 8).
- Ao adicionar um exercício, mostrar o que foi feito na última vez (apenas referência).
- Salvar cada série assim que registrada (não perder dados se a página fechar).

### Card do exercício (treino atual)
- Animação instrutiva do exercício (catálogo) ou ícone genérico (exercício próprio).
- Nome do exercício.
- Resumo das séries **do treino atual**:
  - séries iguais: `3 × 12 · 40 kg`
  - séries diferentes: `3 séries · 12/10/8 · até 45 kg`
- Expandido: lista das séries (nº, carga, reps), botão "Adicionar série" e a referência da última vez.

### Tipos de medida (`measure` no catálogo)
| Tipo | Registro | Carga | Exemplos |
|---|---|---|---|
| `load` (padrão) | carga · vezes × reps | obrigatória | supino, rosca, leg press |
| `bodyweight` | vezes × reps | lastro opcional | flexão, barra fixa, paralelas, abdominais |
| `time` | vezes × segundos | opcional | prancha, prancha lateral, caminhada do fazendeiro |

No banco é o mesmo registro (`sets.weight`, `sets_count`, `reps`); em `time`, `reps` guarda segundos.
O Histórico muda conforme o tipo: carga/1RM/volume, reps máx./reps totais, ou maior tempo/tempo total.

### Sugestão de progressão
- Se os últimos **N** treinos do exercício usaram a mesma carga e o mais recente atingiu **3 × 12** nessa carga,
  aparece um botão ao lado de "Última vez": subir **+2,5 kg** e voltar para **6–8 reps**.
- O botão só pré-preenche a próxima série; o usuário confirma.
- Peso do corpo: com o mesmo lastro, se os 2 últimos treinos fizeram 3 séries com as mesmas reps → sugere **+2 reps**.
- Tempo: mesma regra → sugere **+10 s**.
- Valores configuráveis (`PROGRESSION` no frontend, por tipo): treinos seguidos, séries, reps-alvo, incremento, faixa de reps.

### Acompanhamento
- Histórico por exercício, semana a semana: carga máxima, volume total, reps totais.
- Gráfico de evolução.
- Destaque de recordes pessoais (maior carga / maior volume).

### Frontpage / navegação
- Página inicial pública com acesso a login/cadastro.
- Telas do usuário logado (abas fixas embaixo no celular, links no topo em telas largas):
  - **Painel**: treino de hoje (cards, registro de séries, adicionar exercício avulso).
  - **Treino**: treinos fixos (criar, editar, excluir, "treinar hoje").
  - **Exercícios**: catálogo com filtro por músculo.
  - **Histórico**: gráfico e tabela de evolução por exercício.
- Lupa no topo: busca por nome ou músculo na página atual.

## Requisitos não funcionais

- **Mobile-first**: uso no celular entre séries; botões grandes, poucos toques por série.
- Senhas com hash **argon2id** (`crypto.argon2` do próprio Node ≥ 24.7, parâmetros mínimos da OWASP).
- Sessão: cookie `sid` httpOnly, `SameSite=Lax`, 30 dias, renovado quando passa da metade; `Secure` com `NODE_ENV=production`.
- Toda escrita na API exige `Content-Type: application/json` (proteção contra CSRF).
- Login bloqueado após 10 falhas no mesmo e-mail em 15 min.
- Unidade padrão: kg.

## Catálogo de exercícios e direitos de imagem

- Fonte base: **free-exercise-db** (github.com/yuhonas/free-exercise-db), domínio público (Unlicense).
  Cada exercício tem 2 fotos (início e fim do movimento); a "animação" alterna as duas via CSS.
- Imagens **hospedadas no próprio servidor**, não por hotlink.
- Importar uma seleção de ~100–150 exercícios comuns, com nomes traduzidos para pt-BR.
  **Feito: 109 exercícios** em `public/catalog.js`; cada um tem `src` (id no free-exercise-db).
  Para incluir outro: adicionar a linha no catálogo e rodar `npm run media` (baixa as fotos) e `npm run seed`.
- GIFs de verdade: não há base aberta (em 10/2026). ExerciseDB tem GIFs, mas é paga (licença comercial);
  imagens de sites de terceiros não podem ser usadas sem autorização.
- Cada item registra `source` e `license`, para permitir outras fontes no futuro
  (ex.: wger com crédito CC-BY-SA, ExerciseDB pago, ou GIFs com autorização escrita).
- **Não** usar imagens de sites de terceiros sem licença ou autorização.

## Modelo de dados

| Tabela | Campos | Papel |
|---|---|---|
| `users` | id, name, email, password_hash, created_at | Contas |
| `auth_sessions` | id (SHA-256 do token), user_id, expires_at | Login |
| `exercise_catalog` | id, slug, name, image_start, image_end, rest_seconds, source, license | Catálogo compartilhado |
| `muscles` | id (slug), name | Tags de músculo (peito, tríceps…) |
| `catalog_muscles` | catalog_id, muscle_id, is_primary | Músculos de cada exercício do catálogo |
| `exercises` | id, user_id, catalog_id, name | Exercícios do usuário |
| `exercise_muscles` | exercise_id, muscle_id, is_primary | Músculos de exercícios criados pelo usuário |
| `workout_templates` | id, user_id, name, days, created_at | Treinos fixos (máx. 5 por usuário) |
| `workout_template_exercises` | template_id, exercise_id, position | Exercícios do treino fixo, em ordem |
| `workouts` | id, user_id, date, notes | Um dia de treino |
| `workout_exercises` | id, workout_id, exercise_id, position | Exercícios feitos no dia, na ordem do usuário |
| `sets` | id, workout_exercise_id, set_number, weight, sets_count, reps | Cada registro (carga, vezes × reps) |

`exercises.catalog_id` é opcional: preenchido quando o exercício vem do catálogo, vazio quando o usuário cria o próprio.
O usuário pode renomear o exercício sem alterar o catálogo. Exercícios do catálogo usam `catalog_muscles`;
os criados pelo usuário usam `exercise_muscles`.

`workout_templates.days` guarda os dias como texto, ex.: `'1,4'` (0 = domingo … 6 = sábado).
O limite de 5 treinos é checado na API ao criar.

### Schema (SQLite)

Fonte da verdade: `server/schema.sql` (o bloco abaixo é um resumo; o arquivo também tem `CHECK`s e índices extras).

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE auth_sessions (
  id         TEXT PRIMARY KEY,               -- SHA-256 do token do cookie (o token em si não fica no banco)
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE exercise_catalog (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,         -- 'supino-reto' (o mesmo id de public/catalog.js)
  name         TEXT NOT NULL UNIQUE,         -- pt-BR
  image_start  TEXT,                         -- caminho local, ex.: /media/supino-reto-0.jpg
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
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id   INTEGER REFERENCES exercise_catalog(id),
  name         TEXT NOT NULL,
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
  weight              REAL    NOT NULL,      -- kg
  sets_count          INTEGER NOT NULL DEFAULT 1,  -- "vezes": 3 em 3 × 12
  reps                INTEGER NOT NULL,
  created_at          TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_catalog_muscles    ON catalog_muscles(muscle_id);
CREATE INDEX idx_we_exercise        ON workout_exercises(exercise_id);
```

### Consultas principais

Evolução semanal de um exercício:

```sql
SELECT strftime('%Y-%W', w.date)  AS semana,
       MAX(s.weight)              AS carga_max,
       SUM(s.weight * s.sets_count * s.reps) AS volume,
       SUM(s.sets_count * s.reps)            AS reps_total
FROM sets s
JOIN workout_exercises we ON we.id = s.workout_exercise_id
JOIN workouts w           ON w.id = we.workout_id
WHERE w.user_id = ? AND we.exercise_id = ?
GROUP BY semana
ORDER BY semana;
```

Exercícios do catálogo que trabalham um músculo (filtro / busca):

```sql
SELECT c.id, c.name, cm.is_primary
FROM exercise_catalog c
JOIN catalog_muscles cm ON cm.catalog_id = c.id
WHERE cm.muscle_id = ?
ORDER BY cm.is_primary DESC, c.name;
```

Última vez que o exercício foi feito:

```sql
SELECT s.set_number, s.weight, s.sets_count, s.reps
FROM sets s
JOIN workout_exercises we ON we.id = s.workout_exercise_id
WHERE we.id = (
  SELECT we2.id
  FROM workout_exercises we2
  JOIN workouts w2 ON w2.id = we2.workout_id
  WHERE w2.user_id = ? AND we2.exercise_id = ?
  ORDER BY w2.date DESC, we2.id DESC
  LIMIT 1
)
ORDER BY s.set_number;
```

### Cálculos (não armazenados)
- **Volume** = Σ(carga × vezes × reps)
- **Progressão** = carga máxima ou volume da semana > semana anterior
- **Recorde** = maior carga / maior volume do exercício até a data

## Integração (visão geral)

Frontend (HTML/CSS/JS) → API REST → SQLite

Endpoints (todos sob o prefixo `/api`, ex.: `POST /api/auth/login`; o resto do caminho serve o `public/`).
Tudo fora de `/auth`, `/health` e `/muscles` exige login e só enxerga os dados do próprio usuário.

**Implementados** (`server/auth.js`, `server/data.js`):
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`
- `GET /muscles`
- `GET /state?today=AAAA-MM-DD` — tudo que as páginas usam, de uma vez: usuário, exercícios próprios,
  treinos fixos, histórico (antes de `today`) e o treino de `today`. Com poucos usuários e poucos dados,
  uma leitura só é mais simples que vários endpoints; dá para quebrar quando o histórico crescer.
- `POST /presets`, `PUT /presets/:id`, `DELETE /presets/:id` — treinos fixos (`POST` recusa acima de 5)
- `PUT /days/:date/preset` `{ presetId }` — treino fixo escolhido no dia (`null` = livre)
- `POST /days/:date/exercises` `{ exerciseId }` — exercício avulso no dia
- `DELETE /days/:date/exercises/:exerciseId` — tira o avulso (só se ainda não tem série)
- `POST /days/:date/sets` `{ exerciseId, weight, sets, reps }` — registra uma série (carga em kg)

Ids de exercício na API: slug do catálogo (`supino-reto`) ou `u` + id para exercício próprio (`u12`).
O exercício do catálogo vira linha em `exercises` no primeiro uso.
A data do dia vem do navegador (fuso do usuário). Sem treino salvo no dia, o treino fixo sugerido é o do dia da semana.

**Ainda não feitos** (a interface ainda não precisa): criar exercício próprio, editar/apagar série,
`GET /catalog` (o catálogo vem de `public/catalog.js`), estatísticas calculadas no servidor.

**Conta de demonstração:** `npm run seed` cria `gabriel@email.com` (senha `DEMO_PASSWORD` ou `gabriel123`)
com os dados que eram do `mock_user.js` (`server/demo.js`). Se a conta já existir e estiver vazia, só recebe os dados.

**Migrações:** `server/schema.sql` é a migração 1; as seguintes ficam em `server/db.js`
(2: `workouts.template_id`, um treino por usuário e dia, cada exercício uma vez por treino).

## Stack e hospedagem

Contexto: uso pessoal + alguns amigos, custo zero por enquanto, e o objetivo é **aprender a montar o backend**
(nada de backend pronto tipo Supabase/Firebase).

### Decisão
- **Stack:** Node + Express + SQLite (`better-sqlite3`), login próprio (hash argon2/bcrypt + sessão em cookie `httpOnly`).
- **Servidor:** o **laptop Linux**, rodando 24h com `systemd`.
- **Acesso externo:** **Tailscale Funnel** (grátis, HTTPS, endereço fixo `*.ts.net`, sem abrir porta no roteador
  e funciona atrás de CGNAT). Alternativa futura: Cloudflare Tunnel com domínio próprio (~R$ 50/ano).
- **Backup:** cópia diária do `.db` **fora do laptop** — `sqlite3 .backup` via cron ou Litestream → Cloudflare R2 (grátis até 10 GB).
- **Desenvolvimento:** no laptop (mesmo sistema da produção). Código versionado no GitHub.

### Frontend: GitHub Pages × Express
O **Express serve o `public/`** no mesmo endereço do túnel (sem CORS e sem cookie entre domínios).
O GitHub Pages publica só `pages/index.html` (também como `404.html`), uma página de entrada que:
1. consulta `APP_URL/api/health` (única rota com CORS, liberada só para `https://pedr0piquet.github.io`);
2. se responder, redireciona para o mesmo caminho no servidor (`/gym-tracker/historico.html` → `APP_URL/historico.html`);
3. se não, mostra "Não foi possível conectar ao servidor no momento" com "Tentar de novo".

`APP_URL` é o endereço do Tailscale Funnel, gravado pelo `./tunnel.sh`.

Para subir: `./run.sh prod` (servidor) + `./tunnel.sh` (Funnel; na primeira vez instala o Tailscale e pede login).

### Cuidados com o laptop como servidor
- Não suspender (inclusive com tampa fechada: `HandleLidSwitch=ignore`), na tomada, de preferência no cabo.
- Fica fora do ar se faltar luz/internet — aceitável para o público atual.
- Expor só a porta do app pelo túnel; manter o sistema atualizado; limitar tentativas de login; não rodar como root.
- Maior risco: perder o disco → por isso o backup externo é obrigatório.

### Alternativas avaliadas
| Opção | Por que não agora |
|---|---|
| Cloudflare Pages + Workers + D1 | Grátis e SQLite, mas troca Express por Hono; menos aprendizado de servidor |
| Supabase / Firebase | Backend pronto (contra o objetivo); Firebase é NoSQL e complica histórico/gráficos |
| Fly.io / Railway / Render / VPS | Pagos (alguns US$/mês) ou plano grátis que dorme |
| Oracle Cloud Always Free (São Paulo) | Grátis, mas cadastro com cartão costuma ser recusado, máquina ARM vive esgotada e instâncias ociosas podem ser desligadas — **plano B** se o laptop virar problema |

O mesmo código (Node + SQLite) migra para Oracle/Fly.io/VPS sem mudanças.

### Ordem de implementação
1. ~~Express servindo `public/`.~~ ✔
2. ~~SQLite com o schema deste documento.~~ ✔
3. ~~Cadastro/login/logout com sessão.~~ ✔ (`public/login.html`)
4. ~~Endpoints da API (sempre filtrando pelo usuário logado).~~ ✔
5. ~~Trocar `mock_user.js` e `localStorage` por chamadas à API.~~ ✔ (no navegador ficam só tema, unidade e favoritos)
6. `systemd` (reinício automático e no boot).
7. Tailscale Funnel (`./tunnel.sh`; o GitHub Pages redireciona para ele).
8. Backup externo.

## Pendente
- Dois treinos fixos no mesmo dia: hoje o Painel pega o primeiro; decidir se pergunta.

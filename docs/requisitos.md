# Diário de Cargas — Requisitos e Modelo de Dados

Web app para registrar exercícios, cargas e repetições ao longo das semanas e acompanhar a progressão.

## Decisões de escopo

- O app é um **diário de cargas**: o usuário registra o que fez, na ordem que quiser.
- **Sem** fichas/rotinas pré-definidas, metas de séries/reps ou tempo de descanso.
- Única sugestão automática: **progressão dupla** (ver "Sugestão de progressão").
- O usuário decide a rotina e a sequência dos exercícios.
- O app só cataloga **carga e volume** de cada exercício e mostra a evolução.
- Volume, carga máxima e recordes são **calculados** a partir das séries, não armazenados.

## Requisitos funcionais

### Login simples
- Cadastro com nome, e-mail e senha.
- Login/logout com sessão persistente (cookie httpOnly).
- Cada usuário vê apenas os próprios dados.

### Exercícios
- **Catálogo pronto** de exercícios, compartilhado por todos os usuários, com animação instrutiva.
- O usuário escolhe do catálogo ou cria e nomeia os próprios exercícios.
- Grupo muscular opcional (apenas para filtrar).

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

### Sugestão de progressão
- Se os últimos **N** treinos do exercício usaram a mesma carga e o mais recente atingiu **3 × 12** nessa carga,
  aparece um botão ao lado de "Última vez": subir **+2,5 kg** e voltar para **6–8 reps**.
- O botão só pré-preenche a próxima série; o usuário confirma.
- Valores configuráveis (`PROGRESSION` no frontend): treinos seguidos, séries, reps-alvo, incremento, faixa de reps.

### Acompanhamento
- Histórico por exercício, semana a semana: carga máxima, volume total, reps totais.
- Gráfico de evolução.
- Destaque de recordes pessoais (maior carga / maior volume).

### Frontpage / navegação
- Página inicial pública com acesso a login/cadastro.
- Painel do usuário logado: últimos treinos e recordes recentes.
- Telas: Painel → Treino do dia → Histórico/gráfico por exercício.

## Requisitos não funcionais

- **Mobile-first**: uso no celular entre séries; botões grandes, poucos toques por série.
- Senhas com hash (bcrypt ou argon2).
- Unidade padrão: kg.

## Catálogo de exercícios e direitos de imagem

- Fonte base: **free-exercise-db** (github.com/yuhonas/free-exercise-db), domínio público (Unlicense).
  Cada exercício tem 2 fotos (início e fim do movimento); a "animação" alterna as duas via CSS.
- Imagens **hospedadas no próprio servidor**, não por hotlink.
- Importar uma seleção de ~100–150 exercícios comuns, com nomes traduzidos para pt-BR.
- Cada item registra `source` e `license`, para permitir outras fontes no futuro
  (ex.: wger com crédito CC-BY-SA, ExerciseDB pago, ou GIFs com autorização escrita).
- **Não** usar imagens de sites de terceiros sem licença ou autorização.

## Modelo de dados

| Tabela | Campos | Papel |
|---|---|---|
| `users` | id, name, email, password_hash, created_at | Contas |
| `auth_sessions` | id (token), user_id, expires_at | Login |
| `exercise_catalog` | id, name, muscle_group, image_start, image_end, source, license | Catálogo compartilhado |
| `exercises` | id, user_id, catalog_id, name, muscle_group | Exercícios do usuário |
| `workouts` | id, user_id, date, notes | Um dia de treino |
| `workout_exercises` | id, workout_id, exercise_id, position | Exercícios feitos no dia, na ordem do usuário |
| `sets` | id, workout_exercise_id, set_number, weight, sets_count, reps | Cada registro (carga, vezes × reps) |

`exercises.catalog_id` é opcional: preenchido quando o exercício vem do catálogo, vazio quando o usuário cria o próprio.
O usuário pode renomear o exercício sem alterar o catálogo.

### Schema (SQLite)

```sql
CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
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
  name         TEXT NOT NULL UNIQUE,         -- pt-BR
  muscle_group TEXT,
  image_start  TEXT,                         -- caminho local, ex.: /media/supino-reto-0.jpg
  image_end    TEXT,
  source       TEXT NOT NULL,                -- ex.: 'free-exercise-db'
  license      TEXT NOT NULL                 -- ex.: 'Unlicense'
);

CREATE TABLE exercises (
  id           INTEGER PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_id   INTEGER REFERENCES exercise_catalog(id),
  name         TEXT NOT NULL,
  muscle_group TEXT,
  UNIQUE (user_id, name)
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

Endpoints previstos:
- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `GET /catalog` (catálogo, com busca por nome/grupo muscular)
- `GET/POST /exercises` (`POST` aceita `catalog_id` ou `name` livre)
- `GET/POST /workouts`, `GET /workouts/:id`
- `POST /workouts/:id/exercises`
- `POST /sets`, `PATCH /sets/:id`, `DELETE /sets/:id`
- `GET /stats/:exerciseId` (evolução semanal)
- `GET /exercises/:id/last` (última vez)

## Pendente
- Definir a stack (sugestão: Node + Express + SQLite).
- Definir hospedagem.
- Selecionar e traduzir os exercícios do catálogo.

// Base de exercícios do site (vira a tabela exercise_catalog pelo `npm run seed`).
// Imagens: free-exercise-db (domínio público), 2 quadros por exercício em media/<id>-0/1.jpg.
// `src` = id do exercício no free-exercise-db; `npm run media` baixa as imagens que faltam.
// Não mude o `id` de um exercício existente: treinos e histórico dos usuários apontam para ele.

// Grupos musculares usados como tag e filtro
const MUSCLES = {
  peito: 'Peito',
  costas: 'Costas',
  ombros: 'Ombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebraco: 'Antebraço',
  abdomen: 'Abdômen',
  quadriceps: 'Quadríceps',
  posterior: 'Posterior de coxa',
  gluteos: 'Glúteos',
  panturrilha: 'Panturrilha',
};

// muscles: o primeiro é o principal · rest: descanso recomendado em s (padrão SETTINGS.restSeconds)
// measure: como o exercício é medido (padrão 'load'; ver MEASURES em common.js)
//   'load'       carga · vezes × reps
//   'bodyweight' vezes × reps, com lastro opcional (flexão, barra fixa, abdominais…)
//   'time'       vezes × segundos, com carga opcional (prancha, caminhada do fazendeiro)
const CATALOG = [
  // ---------- Peito ----------
  { id: 'supino-reto',             name: 'Supino reto',                    muscles: ['peito', 'triceps', 'ombros'], src: 'Barbell_Bench_Press_-_Medium_Grip' },
  { id: 'supino-inclinado',        name: 'Supino inclinado',               muscles: ['peito', 'ombros', 'triceps'], src: 'Barbell_Incline_Bench_Press_-_Medium_Grip' },
  { id: 'crucifixo',               name: 'Crucifixo',                      muscles: ['peito'], src: 'Dumbbell_Flyes' },
  { id: 'crossover',               name: 'Crossover',                      muscles: ['peito'], src: 'Cable_Crossover' },
  { id: 'supino-reto-halteres',    name: 'Supino reto com halteres',       muscles: ['peito', 'triceps', 'ombros'], src: 'Dumbbell_Bench_Press' },
  { id: 'supino-inclinado-halteres', name: 'Supino inclinado com halteres', muscles: ['peito', 'ombros', 'triceps'], src: 'Incline_Dumbbell_Press' },
  { id: 'supino-declinado',        name: 'Supino declinado',               muscles: ['peito', 'triceps'], src: 'Decline_Barbell_Bench_Press' },
  { id: 'supino-maquina',          name: 'Supino na máquina',              muscles: ['peito', 'triceps', 'ombros'], src: 'Machine_Bench_Press' },
  { id: 'supino-inclinado-smith',  name: 'Supino inclinado no Smith',      muscles: ['peito', 'ombros', 'triceps'], src: 'Smith_Machine_Incline_Bench_Press' },
  { id: 'voador',                  name: 'Voador (peck deck)',             muscles: ['peito'], src: 'Butterfly' },
  { id: 'crucifixo-inclinado',     name: 'Crucifixo inclinado',            muscles: ['peito', 'ombros'], src: 'Incline_Dumbbell_Flyes' },
  { id: 'crossover-baixo',         name: 'Crossover polia baixa',          muscles: ['peito', 'ombros'], src: 'Low_Cable_Crossover' },
  { id: 'pullover',                name: 'Pullover com halter',            muscles: ['peito', 'costas'], src: 'Straight-Arm_Dumbbell_Pullover' },
  { id: 'flexao',                  name: 'Flexão de braço',                muscles: ['peito', 'triceps', 'ombros'], measure: 'bodyweight', src: 'Pushups' },
  { id: 'paralelas-peito',         name: 'Paralelas (ênfase no peito)',    muscles: ['peito', 'triceps', 'ombros'], measure: 'bodyweight', src: 'Dips_-_Chest_Version' },

  // ---------- Tríceps ----------
  { id: 'triceps-corda',           name: 'Tríceps corda',                  muscles: ['triceps'], src: 'Triceps_Pushdown_-_Rope_Attachment' },
  { id: 'paralelas',               name: 'Paralelas',                      muscles: ['triceps', 'peito'], measure: 'bodyweight', src: 'Dips_-_Triceps_Version' },
  { id: 'triceps-pulley',          name: 'Tríceps pulley (barra)',         muscles: ['triceps'], src: 'Triceps_Pushdown' },
  { id: 'triceps-barra-v',         name: 'Tríceps pulley com barra V',     muscles: ['triceps'], src: 'Triceps_Pushdown_-_V-Bar_Attachment' },
  { id: 'triceps-inverso',         name: 'Tríceps pulley inverso',         muscles: ['triceps'], src: 'Reverse_Grip_Triceps_Pushdown' },
  { id: 'triceps-testa',           name: 'Tríceps testa',                  muscles: ['triceps'], src: 'EZ-Bar_Skullcrusher' },
  { id: 'triceps-frances',         name: 'Tríceps francês com halter',     muscles: ['triceps'], src: 'Standing_Dumbbell_Triceps_Extension' },
  { id: 'triceps-frances-corda',   name: 'Tríceps francês na corda',       muscles: ['triceps'], src: 'Triceps_Overhead_Extension_with_Rope' },
  { id: 'triceps-coice',           name: 'Tríceps coice',                  muscles: ['triceps'], src: 'Tricep_Dumbbell_Kickback' },
  { id: 'supino-fechado',          name: 'Supino pegada fechada',          muscles: ['triceps', 'peito', 'ombros'], src: 'Close-Grip_Barbell_Bench_Press' },
  { id: 'mergulho-banco',          name: 'Mergulho no banco',              muscles: ['triceps', 'peito', 'ombros'], measure: 'bodyweight', src: 'Bench_Dips' },
  { id: 'triceps-maquina',         name: 'Tríceps na máquina (mergulho)',  muscles: ['triceps', 'peito'], src: 'Dip_Machine' },

  // ---------- Pernas: quadríceps ----------
  { id: 'agachamento',             name: 'Agachamento',                    muscles: ['quadriceps', 'gluteos', 'posterior'], rest: 90, src: 'Barbell_Full_Squat' },
  { id: 'leg-press',               name: 'Leg press',                      muscles: ['quadriceps', 'gluteos'], rest: 90, src: 'Leg_Press' },
  { id: 'cadeira-extensora',       name: 'Cadeira extensora',              muscles: ['quadriceps'], src: 'Leg_Extensions' },
  { id: 'afundo',                  name: 'Afundo',                         muscles: ['quadriceps', 'gluteos'], src: 'Dumbbell_Lunges' },
  { id: 'agachamento-hack',        name: 'Agachamento hack',               muscles: ['quadriceps', 'gluteos'], rest: 90, src: 'Hack_Squat' },
  { id: 'agachamento-frontal',     name: 'Agachamento frontal',            muscles: ['quadriceps', 'gluteos'], rest: 90, src: 'Front_Squat_Clean_Grip' },
  { id: 'agachamento-smith',       name: 'Agachamento no Smith',           muscles: ['quadriceps', 'gluteos'], rest: 90, src: 'Smith_Machine_Squat' },
  { id: 'agachamento-goblet',      name: 'Agachamento goblet',             muscles: ['quadriceps', 'gluteos'], src: 'Goblet_Squat' },
  { id: 'agachamento-livre',       name: 'Agachamento livre (peso do corpo)', muscles: ['quadriceps', 'gluteos'], measure: 'bodyweight', src: 'Bodyweight_Squat' },
  { id: 'afundo-estatico',         name: 'Afundo estático com halteres',   muscles: ['quadriceps', 'gluteos'], src: 'Split_Squat_with_Dumbbells' },
  { id: 'passada',                 name: 'Passada com barra',              muscles: ['quadriceps', 'gluteos'], src: 'Barbell_Walking_Lunge' },
  { id: 'subida-banco',            name: 'Subida no banco (step-up)',      muscles: ['quadriceps', 'gluteos'], src: 'Dumbbell_Step_Ups' },
  { id: 'cadeira-adutora',         name: 'Cadeira adutora',                muscles: ['quadriceps'], src: 'Thigh_Adductor' },

  // ---------- Pernas: posterior e glúteos ----------
  { id: 'mesa-flexora',            name: 'Mesa flexora',                   muscles: ['posterior'], src: 'Lying_Leg_Curls' },
  { id: 'stiff',                   name: 'Stiff',                          muscles: ['posterior', 'gluteos'], rest: 90, src: 'Stiff-Legged_Barbell_Deadlift' },
  { id: 'elevacao-pelvica',        name: 'Elevação pélvica',               muscles: ['gluteos', 'posterior'], src: 'Barbell_Hip_Thrust' },
  { id: 'cadeira-flexora',         name: 'Cadeira flexora',                muscles: ['posterior'], src: 'Seated_Leg_Curl' },
  { id: 'flexora-em-pe',           name: 'Flexora em pé',                  muscles: ['posterior'], src: 'Standing_Leg_Curl' },
  { id: 'terra-romeno',            name: 'Levantamento terra romeno',      muscles: ['posterior', 'gluteos', 'costas'], rest: 90, src: 'Romanian_Deadlift' },
  { id: 'terra-sumo',              name: 'Levantamento terra sumô',        muscles: ['gluteos', 'quadriceps', 'posterior', 'costas'], rest: 90, src: 'Sumo_Deadlift' },
  { id: 'bom-dia',                 name: 'Bom dia (good morning)',         muscles: ['posterior', 'costas', 'gluteos'], src: 'Good_Morning' },
  { id: 'ponte-gluteo',            name: 'Ponte de glúteo com barra',      muscles: ['gluteos', 'posterior'], src: 'Barbell_Glute_Bridge' },
  { id: 'coice-gluteo',            name: 'Coice de glúteo (quatro apoios)', muscles: ['gluteos', 'posterior'], measure: 'bodyweight', src: 'Glute_Kickback' },
  { id: 'gluteo-polia',            name: 'Glúteo na polia',                muscles: ['gluteos'], src: 'One-Legged_Cable_Kickback' },
  { id: 'cadeira-abdutora',        name: 'Cadeira abdutora',               muscles: ['gluteos'], src: 'Thigh_Abductor' },

  // ---------- Panturrilha ----------
  { id: 'panturrilha',             name: 'Panturrilha em pé',              muscles: ['panturrilha'], src: 'Standing_Calf_Raises' },
  { id: 'panturrilha-sentado',     name: 'Panturrilha sentado',            muscles: ['panturrilha'], src: 'Seated_Calf_Raise' },
  { id: 'panturrilha-leg-press',   name: 'Panturrilha no leg press',       muscles: ['panturrilha'], src: 'Calf_Press_On_The_Leg_Press_Machine' },

  // ---------- Costas ----------
  { id: 'puxada-frontal',          name: 'Puxada frontal',                 muscles: ['costas', 'biceps'], src: 'Wide-Grip_Lat_Pulldown' },
  { id: 'remada-curvada',          name: 'Remada curvada',                 muscles: ['costas', 'biceps'], src: 'Bent_Over_Barbell_Row' },
  { id: 'remada-baixa',            name: 'Remada baixa',                   muscles: ['costas', 'biceps'], src: 'Seated_Cable_Rows' },
  { id: 'barra-fixa',              name: 'Barra fixa',                     muscles: ['costas', 'biceps'], measure: 'bodyweight', src: 'Pullups' },
  { id: 'barra-supinada',          name: 'Barra fixa supinada',            muscles: ['costas', 'biceps'], measure: 'bodyweight', src: 'Chin-Up' },
  { id: 'puxada-fechada',          name: 'Puxada com pegada fechada',      muscles: ['costas', 'biceps'], src: 'Close-Grip_Front_Lat_Pulldown' },
  { id: 'puxada-triangulo',        name: 'Puxada com triângulo',           muscles: ['costas', 'biceps'], src: 'V-Bar_Pulldown' },
  { id: 'pulldown',                name: 'Pulldown (braços estendidos)',   muscles: ['costas'], src: 'Straight-Arm_Pulldown' },
  { id: 'serrote',                 name: 'Remada unilateral (serrote)',    muscles: ['costas', 'biceps'], src: 'One-Arm_Dumbbell_Row' },
  { id: 'remada-curvada-halteres', name: 'Remada curvada com halteres',    muscles: ['costas', 'biceps'], src: 'Bent_Over_Two-Dumbbell_Row' },
  { id: 'remada-cavalinho',        name: 'Remada cavalinho (T-bar)',       muscles: ['costas', 'biceps'], src: 'T-Bar_Row_with_Handle' },
  { id: 'remada-maquina',          name: 'Remada na máquina',              muscles: ['costas', 'biceps'], src: 'Leverage_High_Row' },
  { id: 'levantamento-terra',      name: 'Levantamento terra',             muscles: ['costas', 'posterior', 'gluteos', 'quadriceps'], rest: 90, src: 'Barbell_Deadlift' },
  { id: 'hiperextensao',           name: 'Hiperextensão lombar',           muscles: ['costas', 'gluteos', 'posterior'], measure: 'bodyweight', src: 'Hyperextensions_Back_Extensions' },
  { id: 'encolhimento',            name: 'Encolhimento com barra',         muscles: ['costas', 'ombros'], src: 'Barbell_Shrug' },
  { id: 'encolhimento-halteres',   name: 'Encolhimento com halteres',      muscles: ['costas', 'ombros'], src: 'Dumbbell_Shrug' },

  // ---------- Ombros ----------
  { id: 'desenvolvimento',         name: 'Desenvolvimento',                muscles: ['ombros', 'triceps'], src: 'Dumbbell_Shoulder_Press' },
  { id: 'elevacao-lateral',        name: 'Elevação lateral',               muscles: ['ombros'], src: 'Side_Lateral_Raise' },
  { id: 'desenvolvimento-barra',   name: 'Desenvolvimento com barra',      muscles: ['ombros', 'triceps'], src: 'Barbell_Shoulder_Press' },
  { id: 'desenvolvimento-arnold',  name: 'Desenvolvimento Arnold',         muscles: ['ombros', 'triceps'], src: 'Arnold_Dumbbell_Press' },
  { id: 'desenvolvimento-maquina', name: 'Desenvolvimento na máquina',     muscles: ['ombros', 'triceps'], src: 'Machine_Shoulder_Military_Press' },
  { id: 'elevacao-lateral-polia',  name: 'Elevação lateral na polia',      muscles: ['ombros'], src: 'Cable_Seated_Lateral_Raise' },
  { id: 'elevacao-frontal',        name: 'Elevação frontal',               muscles: ['ombros'], src: 'Front_Dumbbell_Raise' },
  { id: 'crucifixo-inverso',       name: 'Crucifixo inverso com halteres', muscles: ['ombros', 'costas'], src: 'Reverse_Flyes' },
  { id: 'crucifixo-inverso-maquina', name: 'Crucifixo inverso na máquina', muscles: ['ombros', 'costas'], src: 'Reverse_Machine_Flyes' },
  { id: 'face-pull',               name: 'Face pull',                      muscles: ['ombros', 'costas'], src: 'Face_Pull' },
  { id: 'remada-alta',             name: 'Remada alta',                    muscles: ['ombros', 'costas'], src: 'Upright_Barbell_Row' },

  // ---------- Bíceps ----------
  { id: 'rosca-direta',            name: 'Rosca direta',                   muscles: ['biceps', 'antebraco'], src: 'Barbell_Curl' },
  { id: 'rosca-martelo',           name: 'Rosca martelo',                  muscles: ['biceps', 'antebraco'], src: 'Hammer_Curls' },
  { id: 'rosca-alternada',         name: 'Rosca alternada',                muscles: ['biceps', 'antebraco'], src: 'Dumbbell_Alternate_Bicep_Curl' },
  { id: 'rosca-w',                 name: 'Rosca com barra W',              muscles: ['biceps', 'antebraco'], src: 'EZ-Bar_Curl' },
  { id: 'rosca-scott',             name: 'Rosca Scott',                    muscles: ['biceps'], src: 'Preacher_Curl' },
  { id: 'rosca-concentrada',       name: 'Rosca concentrada',              muscles: ['biceps'], src: 'Concentration_Curls' },
  { id: 'rosca-inclinada',         name: 'Rosca inclinada',                muscles: ['biceps'], src: 'Incline_Dumbbell_Curl' },
  { id: 'rosca-polia',             name: 'Rosca na polia',                 muscles: ['biceps', 'antebraco'], src: 'Standing_Biceps_Cable_Curl' },
  { id: 'rosca-martelo-corda',     name: 'Rosca martelo na corda',         muscles: ['biceps', 'antebraco'], src: 'Cable_Hammer_Curls_-_Rope_Attachment' },
  { id: 'rosca-maquina',           name: 'Rosca na máquina',               muscles: ['biceps'], src: 'Machine_Bicep_Curl' },

  // ---------- Antebraço ----------
  { id: 'rosca-punho',             name: 'Rosca de punho',                 muscles: ['antebraco'], src: 'Palms-Up_Barbell_Wrist_Curl_Over_A_Bench' },
  { id: 'rosca-punho-inversa',     name: 'Rosca de punho inversa',         muscles: ['antebraco'], src: 'Palms-Down_Wrist_Curl_Over_A_Bench' },
  { id: 'rosca-inversa',           name: 'Rosca inversa',                  muscles: ['antebraco', 'biceps'], src: 'Reverse_Barbell_Curl' },
  { id: 'caminhada-fazendeiro',    name: 'Caminhada do fazendeiro',        muscles: ['antebraco', 'costas', 'ombros'], measure: 'time', src: 'Farmers_Walk' },

  // ---------- Abdômen ----------
  { id: 'abdominal',               name: 'Abdominal',                      muscles: ['abdomen'], measure: 'bodyweight', src: 'Crunches' },
  { id: 'prancha',                 name: 'Prancha',                        muscles: ['abdomen'], measure: 'time', src: 'Plank' },
  { id: 'prancha-lateral',         name: 'Prancha lateral',                muscles: ['abdomen'], measure: 'time', src: 'Side_Bridge' },
  { id: 'abdominal-infra',         name: 'Abdominal infra (reverso)',      muscles: ['abdomen'], measure: 'bodyweight', src: 'Reverse_Crunch' },
  { id: 'abdominal-obliquo',       name: 'Abdominal oblíquo',              muscles: ['abdomen'], measure: 'bodyweight', src: 'Oblique_Crunches_-_On_The_Floor' },
  { id: 'abdominal-polia-ajoelhado', name: 'Abdominal na polia ajoelhado', muscles: ['abdomen'], src: 'Cable_Crunch' },
  { id: 'abdominal-maquina',       name: 'Abdominal na máquina',           muscles: ['abdomen'], src: 'Ab_Crunch_Machine' },
  { id: 'elevacao-pernas',         name: 'Elevação de pernas no banco',    muscles: ['abdomen'], measure: 'bodyweight', src: 'Flat_Bench_Lying_Leg_Raise' },
  { id: 'elevacao-pernas-barra',   name: 'Elevação de pernas na barra',    muscles: ['abdomen'], measure: 'bodyweight', src: 'Hanging_Leg_Raise' },
  { id: 'giro-russo',              name: 'Giro russo',                     muscles: ['abdomen'], measure: 'bodyweight', src: 'Russian_Twist' },
  { id: 'rollout',                 name: 'Rollout com barra',              muscles: ['abdomen', 'ombros'], measure: 'bodyweight', src: 'Barbell_Ab_Rollout' },
  { id: 'dead-bug',                name: 'Dead bug',                       muscles: ['abdomen'], measure: 'bodyweight', src: 'Dead_Bug' },
  { id: 'pallof',                  name: 'Pallof press',                   muscles: ['abdomen'], src: 'Pallof_Press' },
].map(ex => ({ ...ex, media: ex.id }));

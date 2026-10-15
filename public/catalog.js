// Base de exercícios do site (vira a tabela exercise_catalog quando houver banco).
// Imagens: free-exercise-db (domínio público), 2 quadros por exercício em media/<id>-0/1.jpg

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
const CATALOG = [
  { id: 'supino-reto',       name: 'Supino reto',        muscles: ['peito', 'triceps', 'ombros'] },
  { id: 'supino-inclinado',  name: 'Supino inclinado',   muscles: ['peito', 'ombros', 'triceps'] },
  { id: 'crucifixo',         name: 'Crucifixo',          muscles: ['peito'] },
  { id: 'crossover',         name: 'Crossover',          muscles: ['peito'] },
  { id: 'triceps-corda',     name: 'Tríceps corda',      muscles: ['triceps'] },
  { id: 'paralelas',         name: 'Paralelas',          muscles: ['triceps', 'peito'] },
  { id: 'agachamento',       name: 'Agachamento',        muscles: ['quadriceps', 'gluteos', 'posterior'], rest: 90 },
  { id: 'leg-press',         name: 'Leg press',          muscles: ['quadriceps', 'gluteos'], rest: 90 },
  { id: 'cadeira-extensora', name: 'Cadeira extensora',  muscles: ['quadriceps'] },
  { id: 'mesa-flexora',      name: 'Mesa flexora',       muscles: ['posterior'] },
  { id: 'stiff',             name: 'Stiff',              muscles: ['posterior', 'gluteos'], rest: 90 },
  { id: 'afundo',            name: 'Afundo',             muscles: ['quadriceps', 'gluteos'] },
  { id: 'elevacao-pelvica',  name: 'Elevação pélvica',   muscles: ['gluteos', 'posterior'] },
  { id: 'panturrilha',       name: 'Panturrilha em pé',  muscles: ['panturrilha'] },
  { id: 'puxada-frontal',    name: 'Puxada frontal',     muscles: ['costas', 'biceps'] },
  { id: 'remada-curvada',    name: 'Remada curvada',     muscles: ['costas', 'biceps'] },
  { id: 'remada-baixa',      name: 'Remada baixa',       muscles: ['costas', 'biceps'] },
  { id: 'barra-fixa',        name: 'Barra fixa',         muscles: ['costas', 'biceps'] },
  { id: 'desenvolvimento',   name: 'Desenvolvimento',    muscles: ['ombros', 'triceps'] },
  { id: 'elevacao-lateral',  name: 'Elevação lateral',   muscles: ['ombros'] },
  { id: 'rosca-direta',      name: 'Rosca direta',       muscles: ['biceps', 'antebraco'] },
  { id: 'rosca-martelo',     name: 'Rosca martelo',      muscles: ['biceps', 'antebraco'] },
  { id: 'rosca-punho',       name: 'Rosca de punho',     muscles: ['antebraco'] },
  { id: 'abdominal',         name: 'Abdominal',          muscles: ['abdomen'] },
  { id: 'prancha',           name: 'Prancha',            muscles: ['abdomen'] },
].map(ex => ({ ...ex, media: ex.id }));

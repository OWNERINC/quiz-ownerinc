export const AFFINITY_QUESTIONS = [
  {
    id: "acomodacao",
    prompt: "Quando imagina sua estadia em Gramado, qual configuração mais combina com você?",
    options: [
      { value: "owntime", label: "A amplitude e a sensação de casa, com ambientes pensados para reunir diferentes gerações." },
      { value: "nest", label: "A praticidade de um apartamento contemporâneo, integrado à atmosfera de um Mountain Lodge." }
    ]
  },
  {
    id: "atmosfera",
    prompt: "Qual atmosfera você prefere encontrar ao chegar?",
    options: [
      { value: "owntime", label: "Um refúgio conectado ao bosque, com natureza e convivência marcando o ritmo dos dias." },
      { value: "nest", label: "Um refúgio de montanha orgânico e intimista, voltado ao conforto sensorial e à contemplação." }
    ]
  },
  {
    id: "convivencia",
    prompt: "Qual ritmo de convivência mais combina com você?",
    options: [
      { value: "owntime", label: "Alternar momentos em família com experiências compartilhadas e atividades para diferentes idades." },
      { value: "nest", label: "Equilibrar momentos de lazer com pausas de autocuidado, silêncio e bem-estar." }
    ]
  },
  {
    id: "localizacao",
    prompt: "Que relação com Gramado você deseja viver?",
    options: [
      { value: "owntime", label: "Sentir-se em meio à natureza, mantendo acesso às experiências da cidade." },
      { value: "nest", label: "Estar próximo à vida urbana, preservando a relação com a paisagem e o vale." }
    ]
  },
  {
    id: "experiencia",
    prompt: "Qual experiência você mais deseja levar das suas férias?",
    options: [
      { value: "owntime", label: "Criar memórias em família, com espaço, acolhimento e tempo para estar junto." },
      { value: "nest", label: "Desacelerar em uma experiência contemporânea, sensorial e contemplativa." }
    ]
  }
];

export const PROFILE_QUESTIONS = [
  {
    id: "companhia",
    prompt: "Quando imagina uma pausa em Gramado, quem costuma estar com você?",
    options: [
      { value: "proprio-ritmo", label: "Comigo mesmo, no meu próprio ritmo." },
      { value: "casal", label: "Em casal, com tempo para nós dois." },
      { value: "familia", label: "Com filhos e família próxima." },
      { value: "geracoes", label: "Com diferentes gerações da família." }
    ]
  },
  {
    id: "momento",
    prompt: "O que você gostaria de cultivar nessa experiência?",
    options: [
      { value: "desacelerar", label: "Tempo para desacelerar e me cuidar." },
      { value: "descobertas-a-dois", label: "Conversas e descobertas a dois." },
      { value: "memorias-em-familia", label: "Memórias para construir em família." },
      { value: "pessoas-queridas", label: "Encontros para compartilhar com pessoas queridas." }
    ]
  },
  {
    id: "viagem",
    prompt: "Como você costuma viver uma viagem?",
    options: [
      { value: "liberdade", label: "Prefiro liberdade para decidir cada dia." },
      { value: "planejamento-a-dois", label: "Gosto de planejar momentos especiais a dois." },
      { value: "conforto-familiar", label: "Organizo tudo pensando no conforto da família." },
      { value: "reunir-pessoas", label: "Valorizo um lugar que possa reunir pessoas importantes." }
    ]
  }
];

export const QUESTIONS = [...AFFINITY_QUESTIONS, ...PROFILE_QUESTIONS];

export function shuffleQuestions(questions, random = Math.random) {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function classifyAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== AFFINITY_QUESTIONS.length ||
      answers.some((answer) => answer !== "owntime" && answer !== "nest")) {
    throw new TypeError("Respostas inválidas.");
  }

  const owntime = answers.filter((answer) => answer === "owntime").length;
  const nest = answers.length - owntime;
  return { result: owntime > nest ? "owntime" : "nest", scores: { owntime, nest } };
}

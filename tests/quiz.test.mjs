import assert from "node:assert/strict";
import test from "node:test";
import { AFFINITY_QUESTIONS, PROFILE_QUESTIONS, QUESTIONS, classifyAnswers, shuffleQuestions } from "../public/quiz.js";

test("publishes the five approved binary questions exactly", () => {
  assert.deepEqual(AFFINITY_QUESTIONS, [
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
  ]);
});

test("publishes three profile questions with stable ids and four options", () => {
  assert.deepEqual(PROFILE_QUESTIONS.map(({ id, options }) => ({
    id,
    options: options.map(({ value }) => value)
  })), [
    { id: "companhia", options: ["proprio-ritmo", "casal", "familia", "geracoes"] },
    { id: "momento", options: ["desacelerar", "descobertas-a-dois", "memorias-em-familia", "pessoas-queridas"] },
    { id: "viagem", options: ["liberdade", "planejamento-a-dois", "conforto-familiar", "reunir-pessoas"] }
  ]);
});

test("shuffles all eight questions without changing the catalog", () => {
  const shuffled = shuffleQuestions(QUESTIONS, () => 0);
  assert.equal(shuffled.length, QUESTIONS.length);
  assert.deepEqual(new Set(shuffled.map(({ id }) => id)), new Set(QUESTIONS.map(({ id }) => id)));
  assert.notDeepEqual(shuffled.map(({ id }) => id), QUESTIONS.map(({ id }) => id));
});

test("returns the simple majority for every possible score", () => {
  assert.deepEqual(classifyAnswers(Array(5).fill("owntime")), { result: "owntime", scores: { owntime: 5, nest: 0 } });
  assert.deepEqual(classifyAnswers(["owntime", "owntime", "owntime", "owntime", "nest"]), { result: "owntime", scores: { owntime: 4, nest: 1 } });
  assert.deepEqual(classifyAnswers(["owntime", "owntime", "owntime", "nest", "nest"]), { result: "owntime", scores: { owntime: 3, nest: 2 } });
  assert.deepEqual(classifyAnswers(["nest", "nest", "nest", "owntime", "owntime"]), { result: "nest", scores: { owntime: 2, nest: 3 } });
  assert.deepEqual(classifyAnswers(["nest", "nest", "nest", "nest", "owntime"]), { result: "nest", scores: { owntime: 1, nest: 4 } });
  assert.deepEqual(classifyAnswers(Array(5).fill("nest")), { result: "nest", scores: { owntime: 0, nest: 5 } });
});

test("rejects incomplete or unknown answers", () => {
  assert.throws(() => classifyAnswers(["owntime"]), /Respostas inválidas/);
  assert.throws(() => classifyAnswers(["owntime", "nest", "other", "nest", "owntime"]), /Respostas inválidas/);
});

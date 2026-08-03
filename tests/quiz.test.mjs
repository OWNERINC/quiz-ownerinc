import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, classifyAnswers } from "../public/quiz.js";

test("publishes the five approved binary questions exactly", () => {
  assert.deepEqual(QUESTIONS, [
    {
      id: "essencia",
      prompt: "A essencia do seu refugio ideal na Serra Gaucha esta em:",
      options: [
        { value: "owntime", label: "Um ambiente amplo, conectado ao bosque e pensado para a convivencia." },
        { value: "nest", label: "Uma arquitetura organica e contemporanea, concebida como um refugio de montanha." }
      ]
    },
    {
      id: "ferias",
      prompt: "Ao imaginar suas ferias em Gramado, o que mais chama sua atencao?",
      options: [
        { value: "owntime", label: "O aconchego de uma casa espacosa, com ambientes para diferentes geracoes e servicos de hospitalidade." },
        { value: "nest", label: "Uma experiencia voltada ao wellness, ao autocuidado e ao conforto sensorial." }
      ]
    },
    {
      id: "convivencia",
      prompt: "Qual estilo de convivencia mais combina com voce?",
      options: [
        { value: "owntime", label: "Casas, areas abertas e espacos de convivencia onde o paisagismo acompanha a vida em familia." },
        { value: "nest", label: "Arquitetura integrada a natureza, apartamentos contemporaneos e areas de lazer reunidas em um Mountain Lodge." }
      ]
    },
    {
      id: "localizacao",
      prompt: "Como voce imagina a localizacao perfeita para seu refugio?",
      options: [
        { value: "owntime", label: "Cercada pela natureza, com atmosfera de bosque e acesso as experiencias de Gramado." },
        { value: "nest", label: "Na Avenida Borges de Medeiros, combinando proximidade urbana e vista para o vale." }
      ]
    },
    {
      id: "fim-de-tarde",
      prompt: "O fim de tarde perfeito com a familia termina com:",
      options: [
        { value: "owntime", label: "Um passeio entre areas verdes e espacos de convivencia, aproveitando a tranquilidade da Serra." },
        { value: "nest", label: "Momentos nas areas de lazer seguidos pela contemplacao do vale em um refugio de montanha." }
      ]
    }
  ]);
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
  assert.throws(() => classifyAnswers(["owntime"]), /Respostas invalidas/);
  assert.throws(() => classifyAnswers(["owntime", "nest", "other", "nest", "owntime"]), /Respostas invalidas/);
});

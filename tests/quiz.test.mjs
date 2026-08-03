import assert from "node:assert/strict";
import test from "node:test";
import { QUESTIONS, classifyAnswers } from "../public/quiz.js";

test("publishes exactly five binary questions", () => {
  assert.equal(QUESTIONS.length, 5);
  for (const question of QUESTIONS) {
    assert.deepEqual(question.options.map(({ value }) => value), ["owntime", "nest"]);
  }
});

test("returns the simple majority for every possible score", () => {
  assert.equal(classifyAnswers(["owntime", "owntime", "owntime", "nest", "nest"]).result, "owntime");
  assert.equal(classifyAnswers(["nest", "nest", "nest", "owntime", "owntime"]).result, "nest");
  assert.equal(classifyAnswers(Array(5).fill("owntime")).result, "owntime");
  assert.equal(classifyAnswers(Array(5).fill("nest")).result, "nest");
});

test("rejects incomplete or unknown answers", () => {
  assert.throws(() => classifyAnswers(["owntime"]), /Respostas invalidas/);
  assert.throws(() => classifyAnswers(["owntime", "nest", "other", "nest", "owntime"]), /Respostas invalidas/);
});

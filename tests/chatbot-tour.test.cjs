const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateTours, getTourById, getTourStep, getPreviousIndex, getNextIndex } = require("../assets/chatbot/tour-core.js");

const root = path.resolve(__dirname, "..");
const knowledge = JSON.parse(fs.readFileSync(path.join(root, "assets/chatbot/knowledge.json"), "utf8"));
const tour = getTourById(knowledge.tours, "recommended");

test("recommended tour is valid and follows the agreed seven-step order", () => {
  assert.deepEqual(validateTours(knowledge.tours, knowledge.intents), { ok: true });
  assert.deepEqual(tour.steps.map((step) => step.intentId), ["profile-overview", "vtuber-history", "representative-works", "digital-education", "digital-fabrication", "v-culture", "events-awards"]);
  assert.equal(tour.steps[2].note.includes("Unity"), true);
  assert.equal(tour.steps[5].note.includes("TED世界共創計画"), true);
});

test("tour boundaries are explicit", () => {
  assert.equal(getTourStep(tour, 0).heading, "まず、うのっちについて");
  assert.equal(getPreviousIndex(0), null);
  assert.equal(getPreviousIndex(3), 2);
  assert.equal(getNextIndex(tour, 5), 6);
  assert.equal(getNextIndex(tour, 6), null);
  assert.equal(getTourStep(tour, 7), null);
});

test("tour link and identity wording stay within the public copy boundary", () => {
  const event = knowledge.intents.find((intent) => intent.id === "events-awards");
  assert.equal(event.links[0].url, "https://www.youtube.com/watch?v=ZgVxVa9wKUo&t=101s");
  for (const phrase of ["実写", "顔出し", "中の人"]) assert.equal(JSON.stringify(knowledge).includes(phrase), false, phrase);
});

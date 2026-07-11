(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.UnotchiNavTour = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function validateTours(tours, intents) {
    if (!Array.isArray(tours) || !Array.isArray(intents)) return { ok: false, error: "toursとintentsは配列である必要があります。" };
    const intentIds = new Set(intents.map((intent) => intent && intent.id));
    const ids = new Set();
    for (const tour of tours) {
      if (!tour || typeof tour.id !== "string" || ids.has(tour.id)) return { ok: false, error: "ツアーIDが不正または重複しています。" };
      ids.add(tour.id);
      if (!Array.isArray(tour.steps) || tour.steps.length === 0) return { ok: false, error: "ツアーのstepが空です。" };
      for (const step of tour.steps) {
        if (!step || typeof step.heading !== "string" || !step.heading.trim() || !intentIds.has(step.intentId)) return { ok: false, error: "ツアーstepの参照が不正です。" };
      }
    }
    const recommended = tours.find((tour) => tour.id === "recommended");
    if (!recommended || recommended.steps.length !== 7) return { ok: false, error: "recommendedツアーは7step必要です。" };
    return { ok: true };
  }

  function getTourById(tours, tourId) { return Array.isArray(tours) ? tours.find((tour) => tour.id === tourId) || null : null; }
  function getTourStep(tour, index) { return tour && Array.isArray(tour.steps) && Number.isInteger(index) ? tour.steps[index] || null : null; }
  function getPreviousIndex(index) { return Number.isInteger(index) && index > 0 ? index - 1 : null; }
  function getNextIndex(tour, index) { return tour && Number.isInteger(index) && index >= 0 && index < tour.steps.length - 1 ? index + 1 : null; }

  return { validateTours, getTourById, getTourStep, getPreviousIndex, getNextIndex };
});

(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.UnotchiNavSearch = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_OPTIONS = {
    includeScore: true,
    threshold: 0.42,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: "title", weight: 0.25 },
      { name: "keywords", weight: 0.3 },
      { name: "questions", weight: 0.35 },
      { name: "facts", weight: 0.1 }
    ]
  };

  const GENERIC_KEYWORDS = new Set([
    "活動", "実績", "作品", "動画", "発信", "経験", "できること", "教える", "制作"
  ]);

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s　、。！？!?・「」『』（）()／/・:：\-]/g, "");
  }

  function includesMeaningfulTerm(query, intent) {
    const normalizedQuery = normalizeText(query);
    const candidates = [intent.title, ...(intent.keywords || [])];

    return candidates.some((candidate) => {
      const normalizedCandidate = normalizeText(candidate);
      if (normalizedCandidate.length < 2) return false;
      return normalizedQuery.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedQuery);
    });
  }

  function closelyMatchesRegisteredQuestion(query, intent) {
    const normalizedQuery = normalizeText(query);
    const candidates = [intent.title, ...(intent.questions || [])];

    return candidates.some((candidate) => {
      const normalizedCandidate = normalizeText(candidate);
      if (!normalizedCandidate || !normalizedQuery) return false;
      return normalizedQuery.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedQuery);
    });
  }

  function findKeywordMatch(query, intents) {
    const normalizedQuery = normalizeText(query);
    const ranked = [];

    intents.forEach((intent) => {
      const normalizedTitle = normalizeText(intent.title);
      let score = 0;

      (intent.keywords || []).forEach((keyword) => {
        const term = normalizeText(keyword);
        if (term.length < 2 || GENERIC_KEYWORDS.has(term) || !normalizedQuery.includes(term)) return;
        score += 1 + Math.min(term.length, 10) / 10;
        if (normalizedTitle.includes(term)) score += 3;
        if (normalizedQuery === term) score += 5;
        score += (normalizedQuery.lastIndexOf(term) / normalizedQuery.length) * 3;
      });

      if (score > 0) {
        ranked.push({ intent, score, priority: Number(intent.priority) || 0 });
      }
    });

    ranked.sort((a, b) => b.score - a.score || b.priority - a.priority);
    return ranked[0] || null;
  }

  function createSearchEngine(FuseConstructor, intents, options = {}) {
    if (typeof FuseConstructor !== "function") {
      throw new TypeError("Fuse.jsを読み込めませんでした。");
    }

    const fuse = new FuseConstructor(intents, { ...DEFAULT_OPTIONS, ...options });

    return {
      search(query) {
        const normalizedQuery = normalizeText(query);
        if (normalizedQuery.length < 2) return null;

        const keywordMatch = findKeywordMatch(query, intents);
        if (keywordMatch) {
          return { intent: keywordMatch.intent, score: 0 };
        }

        const results = fuse.search(String(query).trim(), { limit: 5 });
        for (const result of results) {
          const score = typeof result.score === "number" ? result.score : 1;
          const hasKnownTerm = includesMeaningfulTerm(query, result.item);
          const closelyMatches = closelyMatchesRegisteredQuestion(query, result.item);

          // Common question endings such as "教えて" must not make an unrelated
          // question look valid. A known term, a registered phrasing, or a very
          // strong Fuse match is required before returning an intent.
          if (score <= 0.42 && (hasKnownTerm || closelyMatches || score <= 0.18)) {
            return { intent: result.item, score };
          }
        }

        return null;
      }
    };
  }

  function chooseAnswer(intent, previousAnswerId, random = Math.random) {
    const answers = Array.isArray(intent?.answers) ? intent.answers : [];
    if (answers.length === 0) return null;

    const candidates = answers.length > 1
      ? answers.filter((answer) => answer.id !== previousAnswerId)
      : answers;
    const index = Math.min(candidates.length - 1, Math.floor(random() * candidates.length));
    return candidates[index];
  }

  return {
    DEFAULT_OPTIONS,
    chooseAnswer,
    createSearchEngine,
    normalizeText
  };
});

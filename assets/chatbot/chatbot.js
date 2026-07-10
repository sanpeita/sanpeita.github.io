(function () {
  "use strict";

  const INITIAL_QUESTIONS = [
    "うのっちは何をしている人？",
    "VTuberとしての強みは？",
    "Unityでは何をしている？",
    "代表作品を見せて",
    "チームに加わると何ができる？"
  ];

  function createElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function installAvatarFallback(image) {
    const fallback = image.parentElement?.querySelector(".un-nav-avatar-fallback");
    if (!fallback) return;
    const showFallback = () => {
      image.hidden = true;
      fallback.classList.add("is-visible");
    };
    image.addEventListener("error", showFallback, { once: true });
    if (image.complete && image.naturalWidth === 0) showFallback();
  }

  function createAvatar(avatarPath, sizeClass) {
    const wrapper = createElement("span", `un-nav-avatar-wrap ${sizeClass || ""}`.trim());
    const image = createElement("img", "un-nav-avatar");
    image.src = avatarPath;
    image.alt = "うのっちナビ";
    const fallback = createElement("span", "un-nav-avatar-fallback", "UNO");
    fallback.setAttribute("aria-hidden", "true");
    wrapper.append(image, fallback);
    installAvatarFallback(image);
    return wrapper;
  }

  function initializeWidget() {
    const widget = document.querySelector("[data-unotchi-nav]");
    if (!widget) return;

    const launcher = widget.querySelector("[data-un-nav-launcher]");
    const panel = widget.querySelector("[data-un-nav-panel]");
    const closeButton = widget.querySelector("[data-un-nav-close]");
    const messageLog = widget.querySelector("[data-un-nav-log]");
    const form = widget.querySelector("[data-un-nav-form]");
    const input = widget.querySelector("[data-un-nav-input]");
    const submitButton = widget.querySelector("[data-un-nav-submit]");
    const knowledgeUrl = widget.dataset.knowledgeUrl;
    const searchApi = window.UnotchiNavSearch;
    const lastAnswers = new Map();

    let knowledge = null;
    let searchEngine = null;

    widget.querySelectorAll(".un-nav-avatar").forEach(installAvatarFallback);

    function setReadyState(isReady) {
      input.disabled = !isReady;
      submitButton.disabled = !isReady;
      input.placeholder = isReady ? "気になることを入力" : "読み込み中…";
    }

    function scrollToLatest() {
      requestAnimationFrame(() => {
        messageLog.scrollTop = messageLog.scrollHeight;
      });
    }

    function createQuestionButton(question, variant = "suggestion") {
      const button = createElement("button", `un-nav-question un-nav-question-${variant}`, question);
      button.type = "button";
      button.addEventListener("click", () => submitQuestion(question));
      return button;
    }

    function createWelcomeCard() {
      const card = createElement("section", "un-nav-card un-nav-welcome");
      const identity = createElement("div", "un-nav-card-identity");
      identity.append(
        createAvatar(knowledge.bot.avatar, "un-nav-avatar-small"),
        createElement("strong", "", knowledge.bot.name)
      );
      const greeting = createElement(
        "p",
        "un-nav-answer-text",
        "こんにちは！ うのっちのVTuber活動、制作、教育、技術についてご案内します。気になることを聞いてみてください。"
      );
      const heading = createElement("p", "un-nav-section-label", "おすすめの質問");
      const questions = createElement("div", "un-nav-question-list");
      INITIAL_QUESTIONS.forEach((question) => questions.append(createQuestionButton(question, "initial")));
      card.append(identity, greeting, heading, questions);
      return card;
    }

    function renderWelcome() {
      messageLog.replaceChildren(createWelcomeCard());
      scrollToLatest();
    }

    function createUserMessage(question) {
      const message = createElement("p", "un-nav-user-message", question);
      message.setAttribute("aria-label", `質問: ${question}`);
      return message;
    }

    function createRelatedLinks(links) {
      const section = createElement("div", "un-nav-answer-section");
      section.append(createElement("p", "un-nav-section-label", "関連作品・記事"));
      const list = createElement("div", "un-nav-link-list");

      links.forEach((link) => {
        const anchor = createElement("a", "un-nav-related-link", link.label);
        anchor.href = link.url;
        if (link.type === "external") {
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          anchor.append(createElement("span", "un-nav-external-mark", "↗"));
        } else {
          anchor.addEventListener("click", closePanel);
        }
        list.append(anchor);
      });

      section.append(list);
      return section;
    }

    function createSuggestions(suggestions) {
      const section = createElement("div", "un-nav-answer-section");
      section.append(createElement("p", "un-nav-section-label", "次におすすめ"));
      const list = createElement("div", "un-nav-question-list");
      suggestions.forEach((question) => list.append(createQuestionButton(question)));
      section.append(list);
      return section;
    }

    function createAnswerCard(text, intent) {
      const card = createElement("article", "un-nav-card un-nav-answer-card");
      const identity = createElement("div", "un-nav-card-identity");
      identity.append(
        createAvatar(knowledge.bot.avatar, "un-nav-avatar-small"),
        createElement("strong", "", knowledge.bot.name)
      );
      card.append(identity, createElement("p", "un-nav-answer-text", text));

      const links = Array.isArray(intent?.links) ? intent.links.filter((link) => link.url) : [];
      const suggestions = Array.isArray(intent?.suggestions) ? intent.suggestions : [];
      if (links.length || suggestions.length) {
        card.append(createElement("hr", "un-nav-divider"));
      }
      if (links.length) card.append(createRelatedLinks(links));
      if (suggestions.length) card.append(createSuggestions(suggestions));
      return card;
    }

    function pickFallback() {
      const fallbacks = knowledge?.fallbacks?.unknown || [
        "まだその質問に対応する情報が登録されていません。おすすめの質問から選んでみてください。"
      ];
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    function submitQuestion(rawQuestion) {
      if (!searchEngine || !knowledge) return;
      const question = String(rawQuestion || "").trim();
      if (!question) {
        input.setCustomValidity(knowledge.fallbacks?.empty || "質問を入力してください。");
        input.reportValidity();
        return;
      }

      input.setCustomValidity("");
      input.value = "";
      const result = searchEngine.search(question);
      messageLog.append(createUserMessage(question));

      if (!result) {
        messageLog.append(createAnswerCard(pickFallback(), null));
      } else {
        const previousAnswerId = lastAnswers.get(result.intent.id);
        const answer = searchApi.chooseAnswer(result.intent, previousAnswerId);
        if (answer) lastAnswers.set(result.intent.id, answer.id);
        messageLog.append(createAnswerCard(answer?.text || pickFallback(), result.intent));
      }
      scrollToLatest();
    }

    function openPanel() {
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      widget.classList.add("is-open");
      input.focus({ preventScroll: true });
    }

    function closePanel() {
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      widget.classList.remove("is-open");
      launcher.focus({ preventScroll: true });
    }

    launcher.addEventListener("click", () => {
      if (panel.hidden) openPanel();
      else closePanel();
    });
    closeButton.addEventListener("click", closePanel);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitQuestion(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.isComposing) {
        event.preventDefault();
        submitQuestion(input.value);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) closePanel();
    });

    setReadyState(false);

    if (!searchApi || typeof window.Fuse !== "function") {
      messageLog.textContent = "うのっちナビを読み込めませんでした。ページを再読み込みしてください。";
      return;
    }

    fetch(knowledgeUrl, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`knowledge.json: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        knowledge = data;
        searchEngine = searchApi.createSearchEngine(window.Fuse, data.intents);
        setReadyState(true);
        renderWelcome();

        // Read-only inspection surface for local acceptance tests.
        window.UnotchiNav = Object.freeze({
          version: data.version,
          intentCount: data.intents.length,
          findIntent: (query) => searchEngine.search(query)?.intent.id || null
        });
      })
      .catch((error) => {
        console.error("うのっちナビの初期化に失敗しました。", error);
        messageLog.textContent = "うのっちナビを読み込めませんでした。ページを再読み込みしてください。";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWidget, { once: true });
  } else {
    initializeWidget();
  }
})();

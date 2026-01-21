(() => {
  const supportedLanguages = ["en", "fr", "ru"];

  const normalizeLanguage = (lang) => {
    if (!lang) {
      return "en";
    }
    const normalized = lang.toLowerCase();
    if (supportedLanguages.includes(normalized)) {
      return normalized;
    }
    const short = normalized.split("-")[0];
    return supportedLanguages.includes(short) ? short : "en";
  };

  const getLanguage = () => {
    const stored = localStorage.getItem("lang");
    if (stored) {
      return normalizeLanguage(stored);
    }
    return normalizeLanguage(navigator.language || navigator.userLanguage || "en");
  };

  const setLanguage = (lang) => {
    const normalized = normalizeLanguage(lang);
    localStorage.setItem("lang", normalized);
    location.reload();
  };

  const applyTranslations = (translations) => {
    const elements = document.querySelectorAll("[data-i18n]");
    elements.forEach((element) => {
      const key = element.dataset.i18n;
      if (key && Object.prototype.hasOwnProperty.call(translations, key)) {
        element.textContent = translations[key];
      }
    });
  };

  const loadTranslations = async (lang, page) => {
    const commonPath = `i18n/${lang}/common.json`;
    const pagePath = `i18n/${lang}/${page}.json`;

    const [commonResult, pageResult] = await Promise.allSettled([
      fetch(commonPath).then((response) => (response.ok ? response.json() : {})),
      fetch(pagePath).then((response) => (response.ok ? response.json() : {})),
    ]);

    const commonTranslations =
      commonResult.status === "fulfilled" ? commonResult.value : {};
    const pageTranslations =
      pageResult.status === "fulfilled" ? pageResult.value : {};

    return { ...commonTranslations, ...pageTranslations };
  };

  const currentLang = getLanguage();
  window.setLanguage = setLanguage;
  window.APP_LANG = currentLang;
  document.documentElement.lang = currentLang;

  const page = document.body?.dataset?.page;
  if (!page) {
    return;
  }

  loadTranslations(currentLang, page)
    .then((translations) => {
      applyTranslations(translations);
    })
    .catch(() => {
      // Fail silently to avoid breaking the page if translations cannot load.
    });
})();

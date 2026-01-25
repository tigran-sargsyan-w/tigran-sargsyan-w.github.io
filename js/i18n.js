(() => {
  const supportedLangs = ["en", "fr", "ru"];
  const localeMap = {
    en: "en",
    fr: "fr",
    ru: "ru",
  };
  const presentLabels = {
    en: "Present",
    fr: "Présent",
    ru: "Наст. время",
  };

  const getLang = () => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang && supportedLangs.includes(storedLang)) {
      return storedLang;
    }

    const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
    if (supportedLangs.includes(browserLang)) {
      return browserLang;
    }

    return "en";
  };

  const setLang = (lang) => {
    if (!supportedLangs.includes(lang)) {
      return;
    }
    localStorage.setItem("lang", lang);
    location.reload();
  };

  window.setLanguage = setLang;

  const lang = getLang();
  window.APP_LANG = lang;
  window.I18N_CONFIG = {
    localeMap,
    presentLabels,
  };
  window.getLocaleFromLang = (value = lang) =>
    localeMap[value] || localeMap.en;
  window.getPresentLabel = (value = lang) =>
    presentLabels[value] || presentLabels.en;
  const page = document.body?.dataset?.page || "index";
  document.documentElement.lang = lang;
  console.info("[i18n] lang=", lang, "page=", page);

  const loadJson = async (url, allowNotFound = false) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        if (allowNotFound && response.status === 404) {
          return null;
        }
        console.error("[i18n] Failed to load", url, "status=", response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("[i18n] Fetch error", url, error);
      return null;
    }
  };

  const applyTranslations = async () => {
    const common = await loadJson(`i18n/${lang}/common.json`);
    if (!common) {
      return;
    }

    const pageDict = await loadJson(`i18n/${lang}/${page}.json`, true);
    const dict = {
      ...common,
      ...(pageDict || {})
    };

    console.info("[i18n] loaded keys", Object.keys(dict).length);

    const titleEl = document.querySelector("title[data-i18n]");
    if (titleEl) {
      const titleKey = titleEl.dataset.i18n;
      if (typeof dict[titleKey] === "string") {
        titleEl.textContent = dict[titleKey];
      }
    }

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (typeof dict[key] === "string") {
        el.textContent = dict[key];
      }
    });
  };

  applyTranslations();
})();

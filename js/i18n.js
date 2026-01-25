(() => {
  const DEFAULT_LANG = "en";
  const CONFIG_URL = "i18n/config.json";
  const langCache = {
    supportedLangs: [],
    localeMap: {},
  };

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

  const parseLangConfig = (config) => {
    if (!config || !Array.isArray(config.languages)) {
      return {
        supportedLangs: [DEFAULT_LANG],
        localeMap: { [DEFAULT_LANG]: DEFAULT_LANG },
        languages: [
          { code: DEFAULT_LANG, label: "English", locale: DEFAULT_LANG },
        ],
      };
    }

    const languages = config.languages
      .filter((lang) => lang && typeof lang.code === "string")
      .map((lang) => ({
        code: lang.code,
        label: lang.label || lang.code.toUpperCase(),
        locale: lang.locale || lang.code,
      }));

    if (languages.length === 0) {
      return {
        supportedLangs: [DEFAULT_LANG],
        localeMap: { [DEFAULT_LANG]: DEFAULT_LANG },
        languages: [
          { code: DEFAULT_LANG, label: "English", locale: DEFAULT_LANG },
        ],
      };
    }

    const supportedLangs = languages.map((lang) => lang.code);
    const localeMap = languages.reduce((acc, lang) => {
      acc[lang.code] = lang.locale || lang.code;
      return acc;
    }, {});

    return { supportedLangs, localeMap, languages };
  };

  const getLang = (supportedLangs) => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang && supportedLangs.includes(storedLang)) {
      return storedLang;
    }

    const browserLang = (navigator.language || "").slice(0, 2).toLowerCase();
    if (supportedLangs.includes(browserLang)) {
      return browserLang;
    }

    return DEFAULT_LANG;
  };

  const setLang = (lang) => {
    if (!langCache.supportedLangs.includes(lang)) {
      return;
    }
    localStorage.setItem("lang", lang);
    location.reload();
  };

  const applyLanguageSwitcher = (languages, currentLang, dict = {}) => {
    const containers = document.querySelectorAll("[data-lang-switcher]");
    if (!containers.length) {
      return;
    }

    containers.forEach((container) => {
      container.innerHTML = "";
      languages.forEach((language) => {
        const button = document.createElement("button");
        button.className = "lang-btn";
        button.type = "button";
        button.dataset.lang = language.code;
        const translatedLabel =
          typeof dict[`lang.${language.code}`] === "string"
            ? dict[`lang.${language.code}`]
            : language.label;
        button.textContent = translatedLabel;
        if (language.code === currentLang) {
          button.setAttribute("aria-current", "true");
        }
        button.addEventListener("click", () => setLang(language.code));
        container.appendChild(button);
      });
    });
  };

  const applyTranslations = async (lang, page) => {
    const common = await loadJson(`i18n/${lang}/common.json`);
    if (!common) {
      return;
    }

    const pageDict = await loadJson(`i18n/${lang}/${page}.json`, true);
    const dict = {
      ...common,
      ...(pageDict || {}),
    };

    console.info("[i18n] loaded keys", Object.keys(dict).length);
    window.I18N_DICT = dict;
    window.getI18nValue = (key, fallback = "", variables = {}) => {
      const value = typeof dict[key] === "string" ? dict[key] : fallback;
      if (!variables || typeof variables !== "object") {
        return value;
      }
      return Object.entries(variables).reduce((result, [varKey, varValue]) => {
        return result.replaceAll(`{${varKey}}`, String(varValue));
      }, value);
    };

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
    document.dispatchEvent(new CustomEvent("i18n:loaded"));
  };

  const initI18n = async () => {
    const config = await loadJson(CONFIG_URL, true);
    const { supportedLangs, localeMap, languages } = parseLangConfig(config);
    langCache.supportedLangs = supportedLangs;
    langCache.localeMap = localeMap;
    window.I18N_CONFIG = {
      localeMap,
      languages,
    };

    const lang = getLang(supportedLangs);
    window.APP_LANG = lang;
    window.getLocaleFromLang = (value = lang) =>
      localeMap[value] || localeMap[DEFAULT_LANG] || DEFAULT_LANG;
    const page = document.body?.dataset?.page || "index";
    document.documentElement.lang = lang;
    console.info("[i18n] lang=", lang, "page=", page);

    await applyTranslations(lang, page);
    applyLanguageSwitcher(languages, lang, window.I18N_DICT || {});
  };

  initI18n();
})();

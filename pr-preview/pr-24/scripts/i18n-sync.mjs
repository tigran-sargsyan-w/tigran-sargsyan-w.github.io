import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";

const CONFIG_PATH = path.resolve("i18n.deepl.config.json");

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const readJsonIfExists = async (filePath) => {
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
};

const readJsonAtRef = (ref, filePath) => {
  try {
    const raw = execSync(`git show ${ref}:${filePath}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

const parseChangedFiles = () => {
  const raw = process.env.CHANGED_FILES || "";
  return raw.split(/\s+/).filter(Boolean);
};

const shouldSkipTranslation = (text, skipPatterns = {}) => {
  if (!text || typeof text !== "string") {
    return true;
  }
  const indicators = skipPatterns.urlOrEmailIndicators || [];
  if (indicators.some((indicator) => text.includes(indicator))) {
    return true;
  }
  if (skipPatterns.codeLike) {
    const regex = new RegExp(skipPatterns.codeLike);
    const hasCodeMarkers = /[0-9._/\\-]/.test(text);
    if (regex.test(text) && hasCodeMarkers) {
      return true;
    }
  }
  return false;
};

const protectTerms = (text, protectedTerms = []) => {
  let updated = text;
  const replacements = [];
  protectedTerms.forEach((term, index) => {
    const token = `__TERM${index}__`;
    if (updated.includes(term)) {
      updated = updated.split(term).join(token);
      replacements.push({ token, term });
    }
  });
  return { text: updated, replacements };
};

const restoreTerms = (text, replacements) => {
  return replacements.reduce((acc, { token, term }) => {
    return acc.split(token).join(term);
  }, text);
};

const translateBatch = async ({
  texts,
  targetLang,
  sourceLang,
  endpoint,
  authKey,
  protectedTerms,
}) => {
  const prepared = texts.map((text) => protectTerms(text, protectedTerms));
  const params = new URLSearchParams();
  params.set("source_lang", sourceLang);
  params.set("target_lang", targetLang);
  prepared.forEach((item) => {
    params.append("text", item.text);
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepL error ${response.status}: ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.translations)) {
    throw new Error("DeepL response missing translations");
  }

  return data.translations.map((item, index) => {
    const translated = item.text || "";
    return restoreTerms(translated, prepared[index].replacements);
  });
};

const translateTexts = async ({
  texts,
  targetLang,
  sourceLang,
  endpoint,
  authKey,
  maxBatchChars,
  protectedTerms,
}) => {
  if (!texts.length) {
    return [];
  }
  const results = [];
  let batch = [];
  let batchLength = 0;

  const flush = async () => {
    if (!batch.length) {
      return;
    }
    const batchTexts = batch.map((item) => item.text);
    const translated = await translateBatch({
      texts: batchTexts,
      targetLang,
      sourceLang,
      endpoint,
      authKey,
      protectedTerms,
    });
    translated.forEach((text, index) => {
      results.push({ value: text, meta: batch[index].meta });
    });
    batch = [];
    batchLength = 0;
  };

  for (const item of texts) {
    const length = item.text.length;
    if (batchLength + length > maxBatchChars && batch.length) {
      await flush();
    }
    batch.push(item);
    batchLength += length;
  }

  await flush();
  return results;
};

const listJsonFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(dir, entry.name));
};

const collectStringKeys = (obj = {}) => {
  return Object.keys(obj).filter((key) => typeof obj[key] === "string");
};

const parseJsonPath = (rule) => {
  const trimmed = rule.replace(/^\$\./, "");
  return trimmed.split(".").map((segment) => {
    if (segment.endsWith("[*]")) {
      return { key: segment.slice(0, -3), wildcard: true };
    }
    return { key: segment, wildcard: false };
  });
};

const collectEntriesByPath = (obj, tokens, prefix = []) => {
  if (!tokens.length) {
    return [];
  }
  const [token, ...rest] = tokens;
  if (token.wildcard) {
    const target = obj?.[token.key];
    if (!Array.isArray(target)) {
      return [];
    }
    return target.flatMap((item, index) => {
      if (!rest.length) {
        return [{ path: [...prefix, token.key, index], value: item }];
      }
      return collectEntriesByPath(item, rest, [...prefix, token.key, index]);
    });
  }
  const next = obj?.[token.key];
  if (!rest.length) {
    return [{ path: [...prefix, token.key], value: next }];
  }
  return collectEntriesByPath(next, rest, [...prefix, token.key]);
};

const getValueAtPath = (obj, pathParts) => {
  let current = obj;
  for (const part of pathParts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[part];
  }
  return current;
};

const setValueAtPath = (obj, pathParts, value) => {
  let current = obj;
  pathParts.forEach((part, index) => {
    const isLast = index === pathParts.length - 1;
    if (isLast) {
      current[part] = value;
      return;
    }
    const nextPart = pathParts[index + 1];
    if (current[part] === undefined) {
      current[part] = typeof nextPart === "number" ? [] : {};
    }
    current = current[part];
  });
};

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const writeJsonFile = async (filePath, data) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
};

const main = async () => {
  const config = await readJson(CONFIG_PATH);
  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) {
    throw new Error("DEEPL_AUTH_KEY is required");
  }

  const endpoint = process.env.DEEPL_ENDPOINT || config.translate?.endpoint;
  const maxBatchChars = config.translate?.maxBatchChars || 12000;
  const sourceLang = config.sourceLang;
  const targetLangs = config.targetLangs || [];
  const diffBase = process.env.DIFF_BASE || "HEAD~1";
  const skipPatterns = config.skipPatterns || {};
  const protectedTerms = config.protectedTerms || [];

  if (!endpoint) {
    throw new Error("DeepL endpoint is not configured");
  }

  const changedFiles = parseChangedFiles();
  const fullRun =
    !changedFiles.length || changedFiles.includes("i18n.deepl.config.json");

  const uiFiles = fullRun
    ? await listJsonFiles(config.ui.sourceDir)
    : changedFiles
        .filter((file) => file.startsWith("i18n/en/") && file.endsWith(".json"))
        .map((file) => path.resolve(file));

  const dataFiles = fullRun
    ? await listJsonFiles(config.data.sourceDir)
    : changedFiles
        .filter((file) => file.startsWith("data/en/") && file.endsWith(".json"))
        .map((file) => path.resolve(file));

  const uiFileSet = new Set(uiFiles.map((file) => path.resolve(file)));
  const dataFileSet = new Set(dataFiles.map((file) => path.resolve(file)));

  if (!uiFileSet.size && !dataFileSet.size) {
    console.info("[i18n-sync] No relevant files changed.");
    return;
  }

  for (const filePath of uiFileSet) {
    const relativePath = path.relative(process.cwd(), filePath);
    const current = await readJson(filePath);
    const previous = readJsonAtRef(diffBase, relativePath) || {};
    const currentKeys = collectStringKeys(current);
    const changedKeys = new Set();

    currentKeys.forEach((key) => {
      if (typeof previous[key] !== "string" || previous[key] !== current[key]) {
        changedKeys.add(key);
      }
    });

    for (const targetLang of targetLangs) {
      const langDir = path.join(config.ui.targetDir, targetLang.toLowerCase());
      const autoFile = path.join(
        langDir,
        path.basename(filePath).replace(/\.json$/, ".auto.json")
      );
      const existingAuto = (await readJsonIfExists(autoFile)) || {};
      const translatedMap = new Map();
      const pending = [];
      let updatedCount = 0;

      currentKeys.forEach((key) => {
        const value = current[key];
        const existingValue = existingAuto[key];
        const shouldTranslate =
          changedKeys.has(key) || typeof existingValue !== "string";

        if (shouldTranslate) {
          updatedCount += 1;
          if (shouldSkipTranslation(value, skipPatterns)) {
            translatedMap.set(key, value);
          } else {
            pending.push({
              text: value,
              meta: { key },
            });
          }
          return;
        }
        translatedMap.set(key, existingValue);
      });

      if (pending.length) {
        const translated = await translateTexts({
          texts: pending,
          targetLang,
          sourceLang,
          endpoint,
          authKey,
          maxBatchChars,
          protectedTerms,
        });
        translated.forEach(({ value, meta }) => {
          translatedMap.set(meta.key, value);
        });
      }

      const result = {};
      currentKeys.forEach((key) => {
        if (translatedMap.has(key)) {
          result[key] = translatedMap.get(key);
        }
      });

      await writeJsonFile(autoFile, result);
      console.info(
        `[UI] ${targetLang.toLowerCase()}/${path.basename(
          autoFile
        )} updated (${updatedCount} strings)`
      );
    }
  }

  for (const filePath of dataFileSet) {
    const relativePath = path.relative(process.cwd(), filePath);
    const fileName = path.basename(filePath);
    const rules = config.data.translateRules?.[fileName];
    if (!rules) {
      continue;
    }

    const current = await readJson(filePath);
    const previous = readJsonAtRef(diffBase, relativePath) || {};
    const entries = rules.flatMap((rule) => {
      const tokens = parseJsonPath(rule);
      return collectEntriesByPath(current, tokens).filter(
        ({ value }) => typeof value === "string"
      );
    });

    for (const targetLang of targetLangs) {
      const langDir = path.join(config.data.targetDir, targetLang.toLowerCase());
      const autoFile = path.join(
        langDir,
        fileName.replace(/\.json$/, ".auto.json")
      );
      const existingAuto = (await readJsonIfExists(autoFile)) || {};
      const result = {};
      const pending = [];
      let updatedCount = 0;

      entries.forEach(({ path: entryPath, value }) => {
        const previousValue = getValueAtPath(previous, entryPath);
        const existingValue = getValueAtPath(existingAuto, entryPath);
        const shouldTranslate =
          typeof existingValue !== "string" || previousValue !== value;

        if (shouldTranslate) {
          updatedCount += 1;
          if (shouldSkipTranslation(value, skipPatterns)) {
            setValueAtPath(result, entryPath, value);
          } else {
            pending.push({
              text: value,
              meta: { path: entryPath },
            });
          }
        } else {
          setValueAtPath(result, entryPath, existingValue);
        }
      });

      if (pending.length) {
        const translated = await translateTexts({
          texts: pending,
          targetLang,
          sourceLang,
          endpoint,
          authKey,
          maxBatchChars,
          protectedTerms,
        });
        translated.forEach(({ value, meta }) => {
          setValueAtPath(result, meta.path, value);
        });
      }

      await writeJsonFile(autoFile, result);
      console.info(
        `[DATA] ${targetLang.toLowerCase()}/${path.basename(
          autoFile
        )} updated (${updatedCount} strings)`
      );
    }
  }
};

main().catch((error) => {
  console.error("[i18n-sync] Failed:", error.message);
  process.exit(1);
});

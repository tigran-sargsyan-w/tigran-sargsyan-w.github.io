import { promises as fs } from "fs";
import path from "path";

const CONFIG_PATH = path.resolve("i18n.config.json");

const readJson = async (filePath) => {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
};

const writeJson = async (filePath, data) => {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  await fs.writeFile(filePath, content, "utf8");
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const normalizeLanguage = (lang) => lang.toUpperCase();

const flatten = (obj, prefix = "") => {
  const result = {};
  if (Array.isArray(obj)) {
    obj.forEach((value, index) => {
      const key = prefix ? `${prefix}.${index}` : String(index);
      if (value && typeof value === "object") {
        Object.assign(result, flatten(value, key));
      } else {
        result[key] = value;
      }
    });
    return result;
  }

  if (obj && typeof obj === "object") {
    Object.entries(obj).forEach(([key, value]) => {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (value && typeof value === "object") {
        Object.assign(result, flatten(value, nextKey));
      } else {
        result[nextKey] = value;
      }
    });
    return result;
  }

  if (prefix) {
    result[prefix] = obj;
  }
  return result;
};

const unflatten = (flat) => {
  let result = {};

  const setValue = (parts, value) => {
    let cursor = result;
    let parent = null;
    let parentKey = null;

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const isIndex = Number.isInteger(Number(part));

      if (isIndex && !Array.isArray(cursor)) {
        const replacement = [];
        if (parent) {
          parent[parentKey] = replacement;
        } else {
          result = replacement;
        }
        cursor = replacement;
      }

      if (isLast) {
        if (isIndex) {
          cursor[Number(part)] = value;
        } else {
          cursor[part] = value;
        }
        return;
      }

      const nextPart = parts[index + 1];
      const nextIsIndex = Number.isInteger(Number(nextPart));

      if (isIndex) {
        const idx = Number(part);
        if (!cursor[idx] || typeof cursor[idx] !== "object") {
          cursor[idx] = nextIsIndex ? [] : {};
        }
        parent = cursor;
        parentKey = idx;
        cursor = cursor[idx];
      } else {
        if (!cursor[part] || typeof cursor[part] !== "object") {
          cursor[part] = nextIsIndex ? [] : {};
        }
        parent = cursor;
        parentKey = part;
        cursor = cursor[part];
      }
    });
  };

  Object.entries(flat).forEach(([key, value]) => {
    const parts = key.split(".");
    setValue(parts, value);
  });

  return result;
};

const isUrlOrEmail = (value) => /https?:|www\.|mailto:|@/i.test(value);

const isCodeLike = (value) => {
  if (value.includes(" ")) {
    return false;
  }
  if (value.length > 40) {
    return false;
  }
  return /^[A-Za-z0-9._\-/]+$/.test(value);
};

const protectTerms = (text, terms) => {
  let output = text;
  const replacements = new Map();
  let index = 0;
  terms.forEach((term) => {
    if (!term) {
      return;
    }
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    if (regex.test(output)) {
      const token = `__TERM${index}__`;
      output = output.replace(regex, token);
      replacements.set(token, term);
      index += 1;
    }
  });
  return { text: output, replacements };
};

const restoreTerms = (text, replacements) => {
  let output = text;
  for (const [token, term] of replacements.entries()) {
    output = output.split(token).join(term);
  }
  return output;
};

const chunkTexts = (texts, maxChars) => {
  const batches = [];
  let current = [];
  let count = 0;
  texts.forEach((text) => {
    const length = text.length;
    if (current.length > 0 && count + length > maxChars) {
      batches.push(current);
      current = [];
      count = 0;
    }
    current.push(text);
    count += length;
  });
  if (current.length > 0) {
    batches.push(current);
  }
  return batches;
};

const translateBatch = async ({ endpoint, authKey, sourceLang, targetLang, texts }) => {
  const params = new URLSearchParams();
  params.append("source_lang", normalizeLanguage(sourceLang));
  params.append("target_lang", normalizeLanguage(targetLang));
  texts.forEach((text) => params.append("text", text));

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `DeepL-Auth-Key ${authKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`DeepL request failed: ${response.status} ${body}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.translations)) {
    throw new Error("Unexpected DeepL response format.");
  }

  return data.translations.map((item) => item.text);
};

const translateTexts = async ({ endpoint, authKey, sourceLang, targetLang, texts, maxBatchChars, protectedTerms }) => {
  const prepared = texts.map((text) => protectTerms(text, protectedTerms));
  const protectedTexts = prepared.map((item) => item.text);

  const batches = chunkTexts(protectedTexts, maxBatchChars);
  const results = [];

  for (const batch of batches) {
    const translated = await translateBatch({
      endpoint,
      authKey,
      sourceLang,
      targetLang,
      texts: batch,
    });
    results.push(...translated);
  }

  if (results.length !== protectedTexts.length) {
    throw new Error("DeepL response count mismatch.");
  }

  return results.map((text, index) => restoreTerms(text, prepared[index].replacements));
};

const shouldTranslateValue = (value) => {
  if (typeof value !== "string") {
    return false;
  }
  if (!value.trim()) {
    return false;
  }
  if (isUrlOrEmail(value)) {
    return false;
  }
  if (isCodeLike(value)) {
    return false;
  }
  return true;
};

const parsePathTokens = (pathValue) => {
  const trimmed = pathValue.replace(/^\$\.?/, "");
  if (!trimmed) {
    return [];
  }
  return trimmed.split(".");
};

const traversePath = (data, pathValue) => {
  const tokens = parsePathTokens(pathValue);
  let nodes = [{ parent: null, key: null, value: data }];

  for (const token of tokens) {
    const nextNodes = [];
    if (token === "[*]") {
      nodes.forEach((node) => {
        if (Array.isArray(node.value)) {
          node.value.forEach((item, index) => {
            nextNodes.push({ parent: node.value, key: index, value: item });
          });
        }
      });
    } else if (token.endsWith("[*]")) {
      const prop = token.slice(0, -3);
      nodes.forEach((node) => {
        if (node.value && typeof node.value === "object" && prop in node.value) {
          const value = node.value[prop];
          if (Array.isArray(value)) {
            value.forEach((item, index) => {
              nextNodes.push({ parent: value, key: index, value: item });
            });
          }
        }
      });
    } else {
      nodes.forEach((node) => {
        if (node.value && typeof node.value === "object" && token in node.value) {
          nextNodes.push({ parent: node.value, key: token, value: node.value[token] });
        }
      });
    }
    nodes = nextNodes;
  }

  return nodes;
};

const syncUi = async (config, translateConfig) => {
  const sourceDir = path.resolve(config.ui.sourceDir);
  const files = await fs.readdir(sourceDir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    const sourcePath = path.join(sourceDir, file);
    const sourceData = await readJson(sourcePath);
    const sourceFlat = flatten(sourceData);

    for (const lang of config.targetLangs) {
      const targetDir = path.resolve(config.ui.targetDir, lang);
      await ensureDir(targetDir);
      const targetPath = path.join(targetDir, file);
      let targetData = {};
      try {
        targetData = await readJson(targetPath);
      } catch (error) {
        if (error.code !== "ENOENT") {
          throw error;
        }
      }

      const targetFlat = flatten(targetData);
      const missingKeys = Object.keys(sourceFlat).filter((key) => !(key in targetFlat));
      console.log(`[UI] ${lang}/${file} missing keys: ${missingKeys.length}`);

      if (missingKeys.length === 0) {
        continue;
      }

      const valuesToTranslate = [];
      const translationKeys = [];

      missingKeys.forEach((key) => {
        const value = sourceFlat[key];
        if (shouldTranslateValue(value)) {
          valuesToTranslate.push(value);
          translationKeys.push(key);
        } else if (typeof value !== "undefined") {
          targetFlat[key] = value;
        }
      });

      if (valuesToTranslate.length > 0) {
        const translated = await translateTexts({
          ...translateConfig,
          targetLang: lang,
          texts: valuesToTranslate,
        });
        translated.forEach((text, index) => {
          targetFlat[translationKeys[index]] = text;
        });
      }

      const mergedFlat = { ...sourceFlat, ...targetFlat };
      const output = unflatten(mergedFlat);
      await writeJson(targetPath, output);
    }
  }
};

const syncData = async (config, translateConfig) => {
  const sourceDir = path.resolve(config.data.sourceDir);
  const files = await fs.readdir(sourceDir);

  for (const file of files) {
    if (!file.endsWith(".json")) {
      continue;
    }
    if (!config.data.translateRules[file]) {
      continue;
    }

    const sourcePath = path.join(sourceDir, file);
    const sourceData = await readJson(sourcePath);
    const rules = config.data.translateRules[file].paths || [];

    for (const lang of config.targetLangs) {
      const targetDir = path.resolve(config.data.targetDir, lang);
      await ensureDir(targetDir);
      const targetPath = path.join(targetDir, file);
      let targetData;

      try {
        targetData = await readJson(targetPath);
      } catch (error) {
        if (error.code === "ENOENT") {
          targetData = JSON.parse(JSON.stringify(sourceData));
        } else {
          throw error;
        }
      }

      let filledCount = 0;
      const valuesToTranslate = [];
      const targets = [];

      rules.forEach((rulePath) => {
        const sourceNodes = traversePath(sourceData, rulePath);
        const targetNodes = traversePath(targetData, rulePath);
        const count = Math.min(sourceNodes.length, targetNodes.length);
        for (let i = 0; i < count; i += 1) {
          const sourceNode = sourceNodes[i];
          const targetNode = targetNodes[i];
          const sourceValue = sourceNode.value;
          const targetValue = targetNode.value;
          if (typeof sourceValue !== "string") {
            continue;
          }
          if (typeof targetValue !== "string") {
            continue;
          }
          if (sourceValue !== targetValue) {
            continue;
          }
          if (!shouldTranslateValue(sourceValue)) {
            continue;
          }
          valuesToTranslate.push(sourceValue);
          targets.push(targetNode);
        }
      });

      if (valuesToTranslate.length > 0) {
        const translated = await translateTexts({
          ...translateConfig,
          targetLang: lang,
          texts: valuesToTranslate,
        });
        translated.forEach((text, index) => {
          const targetNode = targets[index];
          targetNode.parent[targetNode.key] = text;
          filledCount += 1;
        });
      }

      console.log(`[DATA] ${lang}/${file} filled: ${filledCount}`);
      await writeJson(targetPath, targetData);
    }
  }
};

const main = async () => {
  const authKey = process.env.DEEPL_AUTH_KEY;
  if (!authKey) {
    throw new Error("DEEPL_AUTH_KEY is required.");
  }

  const config = await readJson(CONFIG_PATH);
  const endpointOverride = process.env.DEEPL_ENDPOINT;
  const translateConfig = {
    endpoint: endpointOverride || config.translate.endpoint,
    authKey,
    sourceLang: config.sourceLang,
    maxBatchChars: config.translate.maxBatchChars,
    protectedTerms: config.protectedTerms || [],
  };

  await syncUi(config, translateConfig);
  await syncData(config, translateConfig);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

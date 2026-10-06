import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JA } from "../src/i18n/ja.js";
import { ZH } from "../src/i18n/zh.js";
import { EMBED_JA } from "../src/i18n/embed/ja.js";
import { EMBED_ZH } from "../src/i18n/embed/zh.js";
import { RAG_JA } from "../src/i18n/rag/ja.js";
import { RAG_ZH } from "../src/i18n/rag/zh.js";
import { voHash } from "./vo-hash.mjs";
import { PAGES } from "../src/i18n/skeleton.js";
import { RAG_END, RAG_PAGES, RAG_TITLE } from "../src/i18n/rag/skeleton.js";
import { EMBED_END, EMBED_PAGES, EMBED_TITLE } from "../src/i18n/embed/skeleton.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PACKS = { zh: ZH, ja: JA };

export function checkVoFiles() {
  const errors = [];
  const manifestPath = join(root, "src/audio/vo-manifest.json");
  if (!existsSync(manifestPath)) {
    return ["missing src/audio/vo-manifest.json"];
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const lang of ["zh", "ja"]) {
    const pack = PACKS[lang];
    const voKeys = Object.keys(pack).filter((key) => key.endsWith(".vo")).sort();
    const table = manifest[lang] || {};
    const manifestKeys = Object.keys(table).sort();
    if (manifestKeys.join("\n") !== voKeys.join("\n")) {
      errors.push(`vo manifest keys differ for ${lang}`);
    }
    const dir = join(root, "public/audio/vo", lang);
    if (!existsSync(dir)) {
      errors.push(`missing audio dir ${lang}`);
      continue;
    }
    const expected = new Set();
    for (const key of voKeys) {
      const hash = voHash(pack[key]);
      if (!/^[0-9a-f]{12}$/.test(hash)) errors.push(`bad hash ${lang} ${key}`);
      if (table[key] !== hash) {
        errors.push(`stale vo ${lang} ${key} file-hash=${table[key] || ""} text-hash=${hash}`);
      }
      const name = `${key}.${hash}.mp3`;
      expected.add(name);
      const file = join(dir, name);
      if (!existsSync(file)) {
        errors.push(`missing vo file ${lang}/${name}`);
        continue;
      }
      const size = statSync(file).size;
      if (size < 500) errors.push(`tiny vo file ${lang}/${name} (${size} B)`);
    }
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".mp3")) {
        errors.push(`unexpected file in vo/${lang}: ${name}`);
        continue;
      }
      if (!expected.has(name)) errors.push(`stale vo file ${lang}/${name}`);
    }
  }
  return errors;
}

export function checkRagVoFiles() {
  const errors = [];
  const manifestPath = join(root, "src/audio/rag-vo-manifest.json");
  if (!existsSync(manifestPath)) return ["missing src/audio/rag-vo-manifest.json"];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const packs = { zh: RAG_ZH, ja: RAG_JA };
  for (const lang of ["zh", "ja"]) {
    const voKeys = Object.keys(packs[lang]).filter((key) => key.endsWith(".vo")).sort();
    const table = manifest[lang] || {};
    const manifestKeys = Object.keys(table).sort();
    if (manifestKeys.join("\n") !== voKeys.join("\n")) errors.push(`rag vo manifest keys differ for ${lang}`);
    const dir = join(root, "public/audio/vo-rag", lang);
    if (!existsSync(dir)) {
      errors.push(`missing rag audio dir ${lang}`);
      continue;
    }
    const expected = new Set();
    for (const key of voKeys) {
      const hash = voHash(packs[lang][key]);
      if (table[key] !== hash) errors.push(`stale rag vo ${lang} ${key}`);
      const name = `${key}.${hash}.mp3`;
      expected.add(name);
      const file = join(dir, name);
      if (!existsSync(file)) {
        errors.push(`missing rag vo file ${lang}/${name}`);
        continue;
      }
      if (statSync(file).size < 500) errors.push(`tiny rag vo file ${lang}/${name}`);
    }
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".mp3")) {
        errors.push(`unexpected file in vo-rag/${lang}: ${name}`);
        continue;
      }
      if (!expected.has(name)) errors.push(`stale rag vo file ${lang}/${name}`);
    }
  }
  return errors;
}

export function checkEmbedVoFiles() {
  const errors = [];
  const manifestPath = join(root, "src/audio/embed-vo-manifest.json");
  if (!existsSync(manifestPath)) return ["missing src/audio/embed-vo-manifest.json"];
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const packs = { zh: EMBED_ZH, ja: EMBED_JA };
  for (const lang of ["zh", "ja"]) {
    const voKeys = Object.keys(packs[lang]).filter((key) => key.endsWith(".vo")).sort();
    const table = manifest[lang] || {};
    const manifestKeys = Object.keys(table).sort();
    if (manifestKeys.join("\n") !== voKeys.join("\n")) errors.push(`embed vo manifest keys differ for ${lang}`);
    const dir = join(root, "public/audio/vo-embed", lang);
    if (!existsSync(dir)) {
      errors.push(`missing embed audio dir ${lang}`);
      continue;
    }
    const expected = new Set();
    for (const key of voKeys) {
      const hash = voHash(packs[lang][key]);
      if (table[key] !== hash) errors.push(`stale embed vo ${lang} ${key}`);
      const name = `${key}.${hash}.mp3`;
      expected.add(name);
      const file = join(dir, name);
      if (!existsSync(file)) {
        errors.push(`missing embed vo file ${lang}/${name}`);
        continue;
      }
      if (statSync(file).size < 500) errors.push(`tiny embed vo file ${lang}/${name}`);
    }
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".mp3")) {
        errors.push(`unexpected file in vo-embed/${lang}: ${name}`);
        continue;
      }
      if (!expected.has(name)) errors.push(`stale embed vo file ${lang}/${name}`);
    }
  }
  return errors;
}

/**
 * Every narrated kid beat (each page, title and end) must play a pre-generated
 * clip in both languages. There is no Web Speech fallback list for kid lines:
 * a beat whose `.vo` key, manifest hash or mp3 is missing fails here.
 */
export function checkBeatClips() {
  const errors = [];
  const courses = [
    ["nanogpt", ["title", "end", ...PAGES.map((page) => page.id)], { zh: ZH, ja: JA }, "src/audio/vo-manifest.json", "vo"],
    ["rag", [RAG_TITLE.id, RAG_END.id, ...RAG_PAGES.map((page) => page.id)], { zh: RAG_ZH, ja: RAG_JA }, "src/audio/rag-vo-manifest.json", "vo-rag"],
    ["embed", [EMBED_TITLE.id, EMBED_END.id, ...EMBED_PAGES.map((page) => page.id)], { zh: EMBED_ZH, ja: EMBED_JA }, "src/audio/embed-vo-manifest.json", "vo-embed"],
  ];
  let clips = 0;
  for (const [course, ids, packs, manifestFile, folder] of courses) {
    const manifest = JSON.parse(readFileSync(join(root, manifestFile), "utf8"));
    for (const lang of ["zh", "ja"]) {
      for (const id of ids) {
        const key = `${id}.vo`;
        const text = packs[lang][key];
        if (!text) {
          errors.push(`${course} ${lang} beat ${id} has no ${key} line`);
          continue;
        }
        const hash = manifest[lang]?.[key];
        if (hash !== voHash(text)) {
          errors.push(`${course} ${lang} ${key} has no clip for its current text`);
          continue;
        }
        if (!existsSync(join(root, "public/audio", folder, lang, `${key}.${hash}.mp3`))) {
          errors.push(`${course} ${lang} ${key} mp3 missing`);
          continue;
        }
        clips += 1;
      }
    }
  }
  if (existsSync(join(root, "src/audio/speech-fallbacks.json"))) {
    errors.push("src/audio/speech-fallbacks.json must not exist: kid lines always play their clip");
  }
  return { errors, clips };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const beats = checkBeatClips();
  const errors = [...checkVoFiles(), ...checkRagVoFiles(), ...checkEmbedVoFiles(), ...beats.errors];
  if (errors.length) {
    for (const error of errors) console.error(`VO_FAIL ${error}`);
    process.exit(1);
  }
  const count = (file) => {
    const manifest = JSON.parse(readFileSync(join(root, file), "utf8"));
    return Object.keys(manifest.zh || {}).length + Object.keys(manifest.ja || {}).length;
  };
  console.log(
    `VO_OK nanogpt=${count("src/audio/vo-manifest.json")} rag=${count("src/audio/rag-vo-manifest.json")} embed=${count("src/audio/embed-vo-manifest.json")} beats=${beats.clips} missing=0 fallbacks=0`,
  );
}

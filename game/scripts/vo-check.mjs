import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JA } from "../src/i18n/ja.js";
import { ZH } from "../src/i18n/zh.js";
import { voHash } from "./vo-hash.mjs";

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

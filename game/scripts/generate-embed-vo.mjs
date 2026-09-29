/**
 * Record embed .vo lines with the same edge-tts settings as the RAG lesson.
 * Files live under public/audio/vo-embed.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EMBED_JA } from "../src/i18n/embed/ja.js";
import { EMBED_ZH } from "../src/i18n/embed/zh.js";
import { spokenVo, voHash } from "./vo-hash.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const packs = { zh: EMBED_ZH, ja: EMBED_JA };
const jobs = [];
const manifest = {
  algo: "sha256-12",
  voices: {
    zh: "zh-CN-XiaoxiaoNeural",
    ja: "ja-JP-NanamiNeural",
  },
  rates: { zh: "-8%", ja: "-8%" },
  pitches: { zh: "+6Hz", ja: "+0Hz" },
  zh: {},
  ja: {},
};

for (const lang of ["zh", "ja"]) {
  const dir = join(root, "public/audio/vo-embed", lang);
  mkdirSync(dir, { recursive: true });
  const expected = new Set();
  const keys = Object.keys(packs[lang]).filter((key) => key.endsWith(".vo")).sort();
  for (const key of keys) {
    const text = spokenVo(packs[lang][key]);
    const hash = voHash(text);
    manifest[lang][key] = hash;
    const name = `${key}.${hash}.mp3`;
    expected.add(name);
    jobs.push({ lang, key, hash, text, out: join(dir, name) });
  }
  for (const name of readdirSync(dir)) {
    if (!expected.has(name)) rmSync(join(dir, name));
  }
}

writeFileSync(join(root, "src/audio/embed-vo-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
const jobsPath = "/tmp/embed-vo-jobs.json";
writeFileSync(jobsPath, JSON.stringify(jobs));
const py = spawnSync("python3", [join(root, "scripts/generate-audio.py"), "--lesson-vo", jobsPath], {
  stdio: "inherit",
});
if (py.status !== 0) {
  console.error("EMBED_VO_FAIL generate-audio.py");
  process.exit(py.status || 1);
}

for (const lang of ["zh", "ja"]) {
  const dir = join(root, "public/audio/vo-embed", lang);
  const files = readdirSync(dir).filter((name) => name.endsWith(".mp3"));
  const bytes = files.reduce((sum, name) => sum + statSync(join(dir, name)).size, 0);
  console.log(`EMBED_VO_LOCALE ${lang} files=${files.length} bytes=${bytes}`);
}
console.log("EMBED_VO_OK");

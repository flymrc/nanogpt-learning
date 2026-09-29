import manifest from "./vo-manifest.json";
import ragManifest from "./rag-vo-manifest.json";

function clipOf(lang, key, hash, folder) {
  return {
    cacheKey: `vo:${lang}:${key}:${hash}`,
    url: `audio/${folder}/${lang}/${key}.${hash}.mp3`,
  };
}

export function voCacheKey(lang, id) {
  if (!id) return null;
  const key = `${id}.vo`;
  const hash = manifest?.[lang]?.[key] || ragManifest?.[lang]?.[key];
  if (!hash) return null;
  return `vo:${lang}:${key}:${hash}`;
}

export function eachVoClip() {
  const clips = [];
  for (const lang of ["zh", "ja"]) {
    for (const [key, hash] of Object.entries(manifest[lang] || {})) {
      if (typeof hash !== "string" || !/^[0-9a-f]{12}$/.test(hash)) continue;
      clips.push(clipOf(lang, key, hash, "vo"));
    }
    for (const [key, hash] of Object.entries(ragManifest[lang] || {})) {
      if (typeof hash !== "string" || !/^[0-9a-f]{12}$/.test(hash)) continue;
      clips.push(clipOf(lang, key, hash, "vo-rag"));
    }
  }
  return clips;
}

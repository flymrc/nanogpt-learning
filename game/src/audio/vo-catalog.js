import manifest from "./vo-manifest.json";

export function voCacheKey(lang, id) {
  if (!id) return null;
  const key = `${id}.vo`;
  const hash = manifest?.[lang]?.[key];
  if (!hash) return null;
  return `vo:${lang}:${key}:${hash}`;
}

export function eachVoClip() {
  const clips = [];
  for (const lang of ["zh", "ja"]) {
    const table = manifest[lang] || {};
    for (const [key, hash] of Object.entries(table)) {
      if (typeof hash !== "string" || !/^[0-9a-f]{12}$/.test(hash)) continue;
      clips.push({
        cacheKey: `vo:${lang}:${key}:${hash}`,
        url: `audio/vo/${lang}/${key}.${hash}.mp3`,
      });
    }
  }
  return clips;
}

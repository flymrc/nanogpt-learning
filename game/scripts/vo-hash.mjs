import { createHash } from "node:crypto";
import { present } from "../src/i18n/locale.js";

/** Spoken line for a .vo value. Same cleanup the game uses before playback. */
export function spokenVo(value) {
  return present(typeof value === "string" ? value : "");
}

/** First 12 hex chars of sha256(spoken text). The filename must include this. */
export function voHash(value) {
  return createHash("sha256").update(spokenVo(value), "utf8").digest("hex").slice(0, 12);
}

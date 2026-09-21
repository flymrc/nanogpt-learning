let mounted = false;
let hoverCount = 0;

export function mountGameCursor(getGame) {
  if (mounted) return;
  const root = document.getElementById("game-cursor");
  if (!root || !canUseCustomCursor()) return;
  mounted = true;
  document.documentElement.classList.add("has-game-cursor");
  root.hidden = false;

  const move = (event) => {
    root.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    if (!event.buttons) root.classList.remove("is-down");
  };
  const down = () => root.classList.add("is-down");
  const up = () => root.classList.remove("is-down");
  const leave = () => {
    root.classList.add("is-away");
  };
  const enter = () => root.classList.remove("is-away");

  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerdown", down, { passive: true });
  window.addEventListener("pointerup", up, { passive: true });
  window.addEventListener("pointerleave", leave, { passive: true });
  document.documentElement.addEventListener("mouseenter", enter);

  const hot = "a, button, [data-note], .notes-term, .mute-toggle, .notes-toggle, .book-toggle, .notes-close";
  document.addEventListener(
    "pointerover",
    (event) => {
      if (event.target?.closest?.(hot)) setCursorHover(true);
    },
    true,
  );
  document.addEventListener(
    "pointerout",
    (event) => {
      if (event.target?.closest?.(hot)) setCursorHover(false);
    },
    true,
  );

  const attachScene = (scene) => {
    if (!scene?.input || typeof scene.input.on !== "function" || scene.__nanoGPTCursorBound) return;
    scene.__nanoGPTCursorBound = true;
    scene.input.on("gameobjectover", () => setCursorHover(true));
    scene.input.on("gameobjectout", () => setCursorHover(false));
    scene.input.on("pointerdown", () => root.classList.add("is-down"));
    scene.input.on("pointerup", () => root.classList.remove("is-down"));
  };

  const watch = () => {
    const game = getGame?.() ?? window.__nanoGPTGame;
    if (!game?.events || typeof game.events.on !== "function") return;
    game.scene?.getScenes?.(true)?.forEach(attachScene);
    if (game.__nanoGPTCursorWatch) return;
    game.__nanoGPTCursorWatch = true;
    game.events.on("step", () => {
      game.scene?.getScenes?.(true)?.forEach(attachScene);
    });
  };

  try {
    watch();
    window.setTimeout(watch, 400);
  } catch {
    /* DOM pointer already follows; Phaser hover is optional. */
  }
}

export function setCursorHover(on) {
  const root = document.getElementById("game-cursor");
  if (!root) return;
  hoverCount = Math.max(0, hoverCount + (on ? 1 : -1));
  root.classList.toggle("is-hover", hoverCount > 0);
}

function canUseCustomCursor() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

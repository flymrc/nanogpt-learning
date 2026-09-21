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

  const hot = "a, button, [data-note], .notes-term, .mute-toggle, .notes-toggle, .notes-close";
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

  const bindGame = () => {
    const game = getGame?.() ?? window.__nanoGPTGame;
    if (!game?.input || game.__nanoGPTCursorBound) return;
    game.__nanoGPTCursorBound = true;
    game.input.on("gameobjectover", () => setCursorHover(true));
    game.input.on("gameobjectout", () => setCursorHover(false));
    game.input.on("pointerdown", () => root.classList.add("is-down"));
    game.input.on("pointerup", () => root.classList.remove("is-down"));
  };
  bindGame();
  window.setTimeout(bindGame, 400);
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

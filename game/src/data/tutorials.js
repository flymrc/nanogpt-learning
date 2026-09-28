/**
 * Tutorial hub cards. Add an object to show another lesson on Home.
 * `status: "ready"` opens `scene`. Anything else is shown and does not navigate.
 */
export const TUTORIALS = [
  {
    id: "nanogpt",
    titleKey: "hub.nanogpt.title",
    blurbKey: "hub.nanogpt.blurb",
    actionKey: "hub.enter",
    status: "ready",
    scene: "Title",
    art: "tape",
  },
  {
    id: "rag",
    titleKey: "hub.rag.title",
    blurbKey: "hub.rag.blurb",
    actionKey: "hub.enter",
    status: "ready",
    scene: "RagTitle",
    art: "desk",
  },
];

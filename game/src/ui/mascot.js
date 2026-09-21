import { C, displayText } from "./theme.js";

export function addRobot(scene, x, y, { scale = 1, mood = "idle" } = {}) {
  const root = scene.add.container(x, y);
  const key = mood === "wow" && scene.textures.exists("deco-robot-wow") ? "deco-robot-wow" : "deco-robot";

  if (scene.textures.exists(key)) {
    const img = scene.add.image(0, 0, key);
    img.setScale(scale);
    root.add(img);
    root.setData("sprite", img);
  } else {
    root.add(drawRobotFallback(scene, mood));
  }

  root.setSize(160 * scale, 200 * scale);
  bob(scene, root);
  return root;
}

export function addScrollBuddy(scene, x, y, { scale = 0.92 } = {}) {
  const root = scene.add.container(x, y);
  if (scene.textures.exists("deco-scroll")) {
    const img = scene.add.image(0, 0, "deco-scroll");
    img.setScale(scale);
    root.add(img);
  } else {
    const g = scene.add.graphics();
    g.fillStyle(C.gold, 1);
    g.lineStyle(5, C.stroke, 1);
    g.fillRoundedRect(-40, -52, 80, 104, 12);
    g.strokeRoundedRect(-40, -52, 80, 104, 12);
    root.add(g);
  }
  bob(scene, root, 5, 1400);
  return root;
}

export function addSpeechBubble(scene, x, y, text, { pointer = "left", maxWidth = 260 } = {}) {
  const box = scene.add.container(x, y);
  const label = scene.add
    .text(0, -2, text, displayText(26, { align: "center", wordWrap: { width: maxWidth - 24 } }))
    .setOrigin(0.5);

  const padX = 28;
  const padY = 18;
  const w = Math.max(120, Math.min(maxWidth, label.width + padX * 2));
  const h = Math.max(56, label.height + padY * 2);

  const g = scene.add.graphics();
  paintBubble(g, w, h, pointer);
  box.add([g, label]);
  box.setSize(w, h);
  box.setData("label", label);
  box.setData("graphics", g);
  box.setData("pointer", pointer);
  box.setData("maxWidth", maxWidth);
  box.refresh = (next) => {
    label.setText(next);
    const nw = Math.max(120, Math.min(maxWidth, label.width + padX * 2));
    const nh = Math.max(56, label.height + padY * 2);
    paintBubble(g, nw, nh, pointer);
    box.setSize(nw, nh);
    label.setAlpha(0);
    scene.tweens.add({ targets: label, alpha: 1, duration: 160 });
    scene.tweens.add({
      targets: box,
      scale: 1.06,
      duration: 90,
      yoyo: true,
    });
  };
  return box;
}

export function setSpeech(bubble, text) {
  if (!bubble?.refresh) return;
  bubble.refresh(text);
}

function paintBubble(g, w, h, pointer) {
  g.clear();
  g.fillStyle(C.stroke, 0.16);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 22);
  g.fillStyle(C.white, 1);
  g.lineStyle(5, C.stroke, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);

  if (pointer === "none") return;
  const tipX = pointer === "left" ? -w / 2 + 28 : pointer === "right" ? w / 2 - 28 : 0;
  const tipY = h / 2;
  g.fillTriangle(tipX - 12, tipY - 2, tipX + 12, tipY - 2, tipX - 18, tipY + 18);
  g.lineStyle(5, C.stroke, 1);
  g.strokeTriangle(tipX - 12, tipY - 2, tipX + 12, tipY - 2, tipX - 18, tipY + 18);
  g.fillStyle(C.white, 1);
  g.fillTriangle(tipX - 10, tipY - 6, tipX + 10, tipY - 6, tipX - 16, tipY + 14);
}

function bob(scene, target, amp = 7, duration = 1600) {
  scene.tweens.add({
    targets: target,
    y: target.y - amp,
    duration,
    yoyo: true,
    repeat: -1,
    ease: "Sine.InOut",
  });
}

function drawRobotFallback(scene, mood) {
  const g = scene.add.graphics();
  g.lineStyle(6, C.stroke, 1);
  g.fillStyle(C.teal, 1);
  g.fillRoundedRect(-52, -70, 104, 86, 32);
  g.strokeRoundedRect(-52, -70, 104, 86, 32);
  g.fillStyle(C.cream, 1);
  g.fillRoundedRect(-38, -52, 76, 52, 20);
  g.strokeRoundedRect(-38, -52, 76, 52, 20);
  g.fillStyle(C.stroke, 1);
  g.fillEllipse(-14, -30, 16, 20);
  g.fillEllipse(14, -30, 16, 20);
  g.fillStyle(C.white, 1);
  g.fillCircle(-11, -34, 4);
  g.fillCircle(17, -34, 4);
  if (mood === "wow") {
    g.fillStyle(C.stroke, 1);
    g.fillCircle(0, -8, 8);
  } else {
    g.lineStyle(5, C.stroke, 1);
    g.beginPath();
    g.arc(0, -10, 12, 0.2, Math.PI - 0.2);
    g.strokePath();
  }
  g.fillStyle(C.teal, 1);
  g.lineStyle(6, C.stroke, 1);
  g.fillRoundedRect(-40, 18, 80, 56, 24);
  g.strokeRoundedRect(-40, 18, 80, 56, 24);
  return g;
}

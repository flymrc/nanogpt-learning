/** Sticker placement for the word map. Pure geometry so label gaps can be tested without Phaser. */

export function rectsOverlap(a, b, gap = 0) {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
}

export function rectInside(a, bounds) {
  return a.x >= bounds.x - 0.5 && a.y >= bounds.y - 0.5 && a.x + a.w <= bounds.x + bounds.w + 0.5 && a.y + a.h <= bounds.y + bounds.h + 0.5;
}

function pointIn(x, y, rect, pad = 0) {
  return x >= rect.x - pad && x <= rect.x + rect.w + pad && y >= rect.y - pad && y <= rect.y + rect.h + pad;
}

/**
 * Place one rectangle per item so boxes do not overlap each other or obstacles.
 * items: { ax, ay, w, h }
 * Returns rects in the same order, with ok:false when a box could not be seated.
 */
export function placeStickers(items, bounds, obstacles = [], gap = 4) {
  const density = items.map((item) => {
    let near = 0;
    for (const other of items) {
      if (other !== item && Math.hypot(other.ax - item.ax, other.ay - item.ay) < 52) near += 1;
    }
    return near;
  });
  const order = items
    .map((_, index) => index)
    .sort((a, b) => density[b] - density[a] || items[b].w - items[a].w);
  const placed = [];
  const result = new Array(items.length);
  for (const index of order) {
    const item = items[index];
    const neighbors = items.filter((other) => other !== item && Math.hypot(other.ax - item.ax, other.ay - item.ay) < 64);
    let bias = -Math.PI / 2;
    if (neighbors.length) {
      const cx = neighbors.reduce((sum, other) => sum + other.ax, item.ax) / (neighbors.length + 1);
      const cy = neighbors.reduce((sum, other) => sum + other.ay, item.ay) / (neighbors.length + 1);
      bias = Math.atan2(item.ay - cy, item.ax - cx);
    }
    let best = null;
    const consider = (rect, score) => {
      if (!rectInside(rect, bounds)) return;
      if (obstacles.some((ob) => rectsOverlap(rect, ob, gap))) return;
      if (placed.some((ob) => rectsOverlap(rect, ob, gap))) return;
      if (!best || score < best.score) best = { rect, score };
    };
    for (let ring = 0; ring < 16; ring += 1) {
      const dist = 8 + ring * 14;
      const count = 12 + ring * 2;
      for (let k = 0; k < count; k += 1) {
        const ang = bias + (k / count) * Math.PI * 2;
        const cx = item.ax + Math.cos(ang) * dist;
        const cy = item.ay + Math.sin(ang) * dist;
        const rect = { x: cx - item.w / 2, y: cy - item.h / 2, w: item.w, h: item.h };
        const covers = items.some((other) => other !== item && pointIn(other.ax, other.ay, rect, 1));
        const turn = Math.abs(Math.atan2(Math.sin(ang - bias), Math.cos(ang - bias)));
        consider(rect, dist + turn * 18 + (covers ? 70 : 0));
      }
    }
    if (!best) {
      const step = Math.max(6, Math.min(10, Math.round(Math.min(item.w, item.h) / 4)));
      for (let y = bounds.y; y + item.h <= bounds.y + bounds.h + 0.5; y += step) {
        for (let x = bounds.x; x + item.w <= bounds.x + bounds.w + 0.5; x += step) {
          const rect = { x, y, w: item.w, h: item.h };
          const d = Math.hypot(x + item.w / 2 - item.ax, y + item.h / 2 - item.ay);
          consider(rect, d + 200);
        }
      }
    }
    if (!best) {
      result[index] = null;
    } else {
      result[index] = { ...best.rect, ok: true };
      placed.push(best.rect);
    }
  }
  if (result.some((rect) => !rect)) return shelfPack(items, bounds, obstacles, gap);
  return result;
}

function shelfPack(items, bounds, obstacles, gap) {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.ay - b.item.ay || a.item.ax - b.item.ax || b.item.w - a.item.w);
  const placed = [];
  const result = new Array(items.length);
  let y = bounds.y;
  let cursor = 0;
  while (cursor < order.length && y < bounds.y + bounds.h - 1) {
    let x = bounds.x;
    let rowH = 0;
    let guard = 0;
    while (cursor < order.length && guard < 4000) {
      guard += 1;
      const { item, index } = order[cursor];
      if (y + item.h > bounds.y + bounds.h + 0.5) break;
      if (x + item.w > bounds.x + bounds.w + 0.5) break;
      const rect = { x, y, w: item.w, h: item.h };
      const blocked = obstacles.some((ob) => rectsOverlap(rect, ob, gap)) || placed.some((ob) => rectsOverlap(rect, ob, gap));
      if (blocked) {
        x += 6;
        continue;
      }
      result[index] = { ...rect, ok: true };
      placed.push(rect);
      rowH = Math.max(rowH, item.h);
      x += item.w + gap;
      cursor += 1;
    }
    if (rowH < 1) {
      y += 6;
      x = bounds.x;
      if (guard > 3990) break;
      continue;
    }
    y += rowH + gap;
  }
  for (let index = 0; index < items.length; index += 1) {
    if (!result[index]) result[index] = { x: bounds.x, y: bounds.y, w: items[index].w, h: items[index].h, ok: false };
  }
  return result;
}

/** Uniform PCA plot. Y grows upward in data and downward on the page. */
export function projectMap(coords, area, inset = 18) {
  const words = Object.keys(coords);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  words.forEach((word) => {
    const [x, y] = coords[word];
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const inner = {
    x: area.x + inset,
    y: area.y + inset,
    w: Math.max(20, area.w - inset * 2),
    h: Math.max(20, area.h - inset * 2),
  };
  const scale = (Math.min(inner.w, inner.h) * 0.92) / span;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const originX = inner.x + inner.w / 2;
  const originY = inner.y + inner.h / 2;
  const dots = {};
  words.forEach((word) => {
    const [x, y] = coords[word];
    dots[word] = {
      x: originX + (x - midX) * scale,
      y: originY - (y - midY) * scale,
    };
  });
  return dots;
}

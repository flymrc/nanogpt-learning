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

/**
 * Seat each sticker within maxDist of its anchor. A miss stays unplaced (ok:false)
 * instead of sliding onto a reading-order shelf.
 */
export function placeNear(items, bounds, obstacles = [], gap = 4, maxDist = 96) {
  const density = items.map((item) => items.filter((other) => other !== item && Math.hypot(other.ax - item.ax, other.ay - item.ay) < 80).length);
  const order = items
    .map((_, index) => index)
    .sort((a, b) => density[b] - density[a] || items[b].w * items[b].h - items[a].w * items[a].h);
  const placed = [];
  const result = new Array(items.length);
  for (const index of order) {
    const item = items[index];
    let best = null;
    const consider = (cx, cy) => {
      const rect = { x: cx - item.w / 2, y: cy - item.h / 2, w: item.w, h: item.h };
      if (!rectInside(rect, bounds)) return;
      if (obstacles.some((ob) => rectsOverlap(rect, ob, gap))) return;
      if (placed.some((ob) => rectsOverlap(rect, ob, gap))) return;
      const dist = Math.hypot(cx - item.ax, cy - item.ay);
      if (dist > maxDist) return;
      let cover = 0;
      for (const other of items) {
        if (other === item) continue;
        if (pointIn(other.ax, other.ay, rect, 1)) cover += 50;
      }
      const score = dist + cover;
      if (!best || score < best.score) best = { rect, score, dist };
    };
    consider(item.ax, item.ay);
    const rings = Math.ceil(maxDist / 4);
    for (let ring = 0; ring <= rings; ring += 1) {
      const dist = 6 + ring * 4;
      if (dist > maxDist) break;
      const count = 14 + Math.floor(ring / 2);
      for (let k = 0; k < count; k += 1) {
        const ang = -Math.PI / 2 + (k / count) * Math.PI * 2;
        consider(item.ax + Math.cos(ang) * dist, item.ay + Math.sin(ang) * dist);
      }
    }
    if (!best) {
      result[index] = { x: item.ax, y: item.ay, w: item.w, h: item.h, ok: false };
    } else {
      result[index] = { ...best.rect, ok: true };
      placed.push(best.rect);
    }
  }
  return result;
}

/** Data window around a cluster, padded so labels have room after projection. */
export function mapFrame(coords, words, pad = 0.75) {
  const pts = words.map((word) => coords[word]).filter((pt) => Array.isArray(pt) && pt.length >= 2);
  if (!pts.length) return null;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  pts.forEach(([x, y]) => {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });
  const spanX = Math.max(maxX - minX, 0.05);
  const spanY = Math.max(maxY - minY, 0.05);
  const padX = Math.max(0.1, spanX * pad);
  const padY = Math.max(0.1, spanY * pad);
  return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
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
export function projectMap(coords, area, inset = 18, frame = null) {
  const words = Object.keys(coords);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  if (frame) {
    minX = frame.minX;
    maxX = frame.maxX;
    minY = frame.minY;
    maxY = frame.maxY;
  } else {
    words.forEach((word) => {
      const [x, y] = coords[word];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });
  }
  const spanX = Math.max(maxX - minX, 0.001);
  const spanY = Math.max(maxY - minY, 0.001);
  const padX = Math.min(inset, Math.max(6, area.w * 0.012));
  const padY = Math.min(inset, Math.max(6, area.h * 0.02));
  const inner = {
    x: area.x + padX,
    y: area.y + padY,
    w: Math.max(20, area.w - padX * 2),
    h: Math.max(20, area.h - padY * 2),
  };
  const scaleX = (inner.w * 0.98) / spanX;
  const scaleY = (inner.h * 0.98) / spanY;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const originX = inner.x + inner.w / 2;
  const originY = inner.y + inner.h / 2;
  const dots = {};
  words.forEach((word) => {
    const [x, y] = coords[word];
    dots[word] = {
      x: originX + (x - midX) * scaleX,
      y: originY - (y - midY) * scaleY,
    };
  });
  return dots;
}

import { COLORS } from './config.js?v=build-v100';

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a, b, p) {
  return a + (b - a) * p;
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

export function pixel(g, x, y, color, alpha = 1) {
  g.rect(Math.round(x), Math.round(y), 1, 1).fill({
    color,
    alpha: Math.min(1, Math.max(0, Number(alpha) || 0)),
  });
}

export function rect(g, x, y, w, h, color, alpha = 1) {
  g.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).fill({
    color,
    alpha: Math.min(1, Math.max(0, Number(alpha) || 0)),
  });
}

export function line(g, x0, y0, x1, y1, color, alpha = 1) {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const endX = Math.round(x1);
  const endY = Math.round(y1);
  const dx = Math.abs(endX - x);
  const sx = x < endX ? 1 : -1;
  const dy = -Math.abs(endY - y);
  const sy = y < endY ? 1 : -1;
  let err = dx + dy;

  for (;;) {
    pixel(g, x, y, color, alpha);
    if (x === endX && y === endY) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

export function polyline(g, points, color, alpha = 1) {
  for (let i = 1; i < points.length; i++) {
    line(g, points[i - 1].x, points[i - 1].y, points[i].x, points[i].y, color, alpha);
  }
}

export function curve(g, start, control, end, color, alpha = 1) {
  const points = [];
  for (let i = 0; i <= 36; i++) {
    const p = i / 36;
    const inv = 1 - p;
    points.push({
      x: inv * inv * start.x + 2 * inv * p * control.x + p * p * end.x,
      y: inv * inv * start.y + 2 * inv * p * control.y + p * p * end.y,
    });
  }
  polyline(g, points, color, alpha);
}

export function drawGrid(g, w, h) {
  for (let x = 0; x <= w; x += 4) rect(g, x, 0, 1, h, COLORS.grid, x % 16 === 0 ? 0.14 : 0.06);
  for (let y = 0; y <= h; y += 4) rect(g, 0, y, w, 1, COLORS.grid, y % 16 === 0 ? 0.14 : 0.06);
}

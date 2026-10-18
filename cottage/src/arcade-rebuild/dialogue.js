import { COLORS } from './config.js?v=build-v100';
import { rect, pixel } from './pixels.js?v=build-v100';
export { FISHING_OUTCOMES, FISHING_SCRIPTS } from './fishing-scripts.js?v=commentary-v113';
import { FISHING_OUTCOMES, FISHING_SCRIPTS } from './fishing-scripts.js?v=commentary-v113';

const FONT = {
  A: ['01110', '10001', '11111', '10001', '10001'],
  B: ['11110', '10001', '11110', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '11110', '10000', '11111'],
  F: ['11111', '10000', '11110', '10000', '10000'],
  G: ['01111', '10000', '10011', '10001', '01111'],
  H: ['10001', '10001', '11111', '10001', '10001'],
  I: ['111', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '11100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '11110', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10011', '01111'],
  R: ['11110', '10001', '11110', '10010', '10001'],
  S: ['01111', '10000', '01110', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10101', '11011', '10001'],
  X: ['10001', '01010', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00010', '00100', '01000', '11111'],
  '!': ['1', '1', '1', '0', '1'],
  '.': ['0', '0', '0', '0', '1'],
  ',': ['0', '0', '0', '1', '1'],
  "'": ['1', '1', '0', '0', '0'],
  '-': ['0', '0', '111', '0', '0'],
};

function measureWord(word) {
  let width = 0;
  for (const char of word) {
    if (char === ' ') width += 4;
    else width += (FONT[char]?.[0]?.length || 3) + 1;
  }
  return width;
}

function wrapText(text, maxWidth) {
  const words = text.toUpperCase().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (line && measureWord(test) > maxWidth) {
      lines.push(line);
      line = '';
    }
    let remaining = word;
    while (measureWord(remaining) > maxWidth) {
      let end = 1;
      while (end < remaining.length && measureWord(remaining.slice(0, end + 1)) <= maxWidth) end += 1;
      const hyphen = remaining.lastIndexOf('-', end - 1);
      if (hyphen > 0) end = hyphen + 1;
      lines.push(remaining.slice(0, end));
      remaining = remaining.slice(end);
    }
    line = line ? `${line} ${remaining}` : remaining;
  }
  if (line) lines.push(line);
  return lines;
}

function drawText(g, text, x, y, color) {
  let cursor = Math.round(x);
  for (const char of text.toUpperCase()) {
    if (char === ' ') {
      cursor += 4;
      continue;
    }
    const glyph = FONT[char] || FONT['.'];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '1') pixel(g, cursor + col, y + row, color);
      }
    }
    cursor += glyph[0].length + 1;
  }
}

function formatLine(line, species) {
  if (!line) return '';
  return line.replaceAll('{fish}', species?.label || 'FISH');
}

export function fishingLineForPhase(script, phase, species) {
  if (!phase || !script?.lines) return '';
  const lines = script.lines;
  if (phase.name === 'windup' || phase.name === 'cast' || phase.name === 'settle' || phase.name === 'wait') {
    return formatLine(lines.cast ?? '', species);
  }
  if (phase.name === 'tease') return formatLine(lines.tease ?? '', species);
  if (phase.name === 'bite') return formatLine(lines.bite ?? '', species);
  if (phase.name === 'reel') {
    return formatLine(phase.p < 0.72 ? lines.reel : (lines.emerge ?? lines.reel ?? ''), species);
  }
  if (phase.name === 'hold') {
    return formatLine(phase.p < 0.5 ? lines.holdStart : lines.holdEnd, species);
  }
  if (phase.name === 'throwBack') {
    return formatLine(phase.p >= 0.5 && lines.throwBackEnd ? lines.throwBackEnd : lines.throwBack, species);
  }
  if (phase.name === 'splash') {
    return formatLine(lines.throwBackEnd ?? lines.throwBack ?? '', species);
  }
  return '';
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function chatboxLayout(nativeW, nativeH, message, origin = null) {
  if (!message) return null;
  const margin = nativeW < 120 ? 4 : 8;
  const maxW = origin
    ? Math.min(nativeW - margin * 2, nativeW < 140 ? 90 : 128)
    : nativeW - margin * 2;
  const wrapped = wrapText(message, maxW - 14);
  const boxH = Math.max(30, 12 + wrapped.length * 9);
  const measuredW = wrapped.reduce((max, line) => Math.max(max, measureWord(line) + 14), 0);
  const minW = origin ? (nativeW < 140 ? 64 : 72) : maxW;
  const w = origin ? clamp(measuredW, minW, maxW) : maxW;
  let x = margin;
  let y = nativeH - boxH - margin;
  if (origin?.placement === 'above') {
    const leftPreferred = origin.x - w - 10;
    const centered = origin.x - w / 2;
    x = Math.round(clamp(leftPreferred >= margin ? leftPreferred : centered, margin, nativeW - margin - w));
    y = Math.round(clamp(origin.y - boxH - 6, margin, nativeH - boxH - margin));
  } else if (origin) {
    const preferredX = origin.x + 12;
    const fitsRight = preferredX + w <= nativeW - margin;
    x = Math.round(fitsRight ? preferredX : clamp(origin.x - w - 12, margin, nativeW - margin - w));
    y = Math.round(clamp(origin.y - boxH - 16, margin, nativeH - boxH - margin));
  }

  return { x, y, width: w, height: boxH, lines: wrapped };
}

export function drawChatbox(g, nativeW, nativeH, message, now, origin = null) {
  const layout = chatboxLayout(nativeW, nativeH, message, origin);
  if (!layout) return;
  const { x, y, width: w, height: boxH, lines: wrapped } = layout;

  rect(g, x + 1, y + 1, w, boxH, COLORS.chatShadow, 1);
  rect(g, x, y, w, boxH, COLORS.chatBorder, 1);
  rect(g, x + 1, y + 1, w - 2, boxH - 2, COLORS.chatFill, 1);
  rect(g, x + 2, y, w - 4, 1, COLORS.chatFill, 1);
  rect(g, x + 2, y + boxH - 1, w - 4, 1, COLORS.chatFill, 1);
  if (origin) {
    const tx = Math.round(clamp(origin.x, x + 8, x + w - 8));
    rect(g, tx - 2, y + boxH - 1, 5, 1, COLORS.chatBorder, 1);
    rect(g, tx - 1, y + boxH, 3, 1, COLORS.chatFill, 1);
    pixel(g, tx, y + boxH + 1, COLORS.chatBorder, 1);
  }

  for (let i = 0; i < wrapped.length; i++) {
    drawText(g, wrapped[i], x + 7, y + 7 + i * 9, COLORS.chatText);
  }

}

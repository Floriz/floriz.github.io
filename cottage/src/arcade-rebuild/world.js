import { selectAssets, textureEntries } from './asset-selection.js?v=build-v100';
import { ANIMAL_LAB_DEFAULTS, ANIMAL_LAB_FAMILIES, ANIMAL_LAB_RECOMMENDED_VARIANTS, ANIMAL_LAB_STATES, ANIMAL_LAB_VARIANTS, ASSETS, BOBBER_VARIANTS, CLOUD_BLEND_MODES, COLORS, DOG_EASTER_EGG_DEFAULTS, ENTITY_DEFAULTS, FISH_DISPLAY_DEFAULTS, FISHING_TIMELINE, FOREGROUND_DOCK_SURFACE, HERON_DEFAULTS, LAYERS, LAYER_ASSETS, LAYOUT_DEFAULTS, REFLECTION_BLEND_MODES, REFLECTION_DEFAULTS, REFLECTION_DEPTH_ORDER, REFLECTION_SOURCE_OPTIONS, REFLECTION_VARIANT_PROFILES, RIG_DEFAULTS, SHIMMER_STYLES, VERSION, WATER_DEFAULTS, WILDLIFE_ACTIVE_FRAMES, WILDLIFE_FORCE_OPTIONS, WILDLIFE_TUNING_DEFAULTS } from './config.js?v=build-v100';
import { FISHING_OUTCOMES, FISHING_SCRIPTS, chatboxLayout, drawChatbox, fishingLineForPhase } from './dialogue.js?v=commentary-v113';
import { clamp, curve, drawGrid, easeInOut, easeOut, lerp, line, pixel, rect } from './pixels.js?v=build-v100';

const SOURCE_W = 418;
const WATER_ANCHOR_Y = 121;
const DEFAULT_FOREGROUND_SURFACE = { y: 184, avatarAnchorX: 195 };
const FISH_HANG_ROTATION = -Math.PI / 2;
const FISH_PADDING = 20;
const WATER_OCCLUDING_LAYERS = [...REFLECTION_SOURCE_OPTIONS].reverse();
const WATER_OCCLUDER_ALPHA_THRESHOLD = 32;
const WATERLINE_NEIGHBOR_RADIUS = 2;
const WATERLINE_LOCAL_VARIATION = 4;
const FAR_BIRD_CROPS = [
  { x: 88, y: 28, width: 9, height: 7 },
  { x: 200, y: 25, width: 9, height: 7 },
  { x: 328, y: 32, width: 9, height: 7 },
  { x: 506, y: 28, width: 9, height: 7 },
  { x: 618, y: 25, width: 9, height: 7 },
  { x: 746, y: 32, width: 9, height: 7 },
];
const FAR_BIRD_HOP_DURATION = 1000;
const FAR_BIRD_HOP_HEIGHT = 2;
const TORONTO_TIMELINE = Object.freeze({
  arrival: 1200,
  'beam-in': 800,
  depart: 700,
  'tower-visible': 5000,
  return: 1000,
  'beam-out': 800,
  exit: 700,
});
const DOG_WALK_FRAME_MS = 150;
const DOG_WALK_FRAME_COUNT = 2;
const WILDLIFE_SPECS = {
  mink: { label: 'Mink', speedPxPerSec: 6.5, minDuration: 45000, maxDuration: 78000, frameMs: 560, frameKeys: WILDLIFE_ACTIVE_FRAMES.mink, yBand: 0.06, direction: 1, alpha: 1 },
  moose: { label: 'Moose', speedPxPerSec: 6.5, minDuration: 52000, maxDuration: 82000, frameMs: 650, frameKeys: WILDLIFE_ACTIVE_FRAMES.moose, yBand: 0, direction: 1, alpha: 1 },
};
const WILDLIFE_KINDS = Object.keys(WILDLIFE_SPECS);
const SHIMMER_STYLE_CONFIG = {
  quiet_glints: { bands: 5, density: 0.62, intensity: 0.48, local: 0.62, lenMin: 1, lenMax: 2, dockBias: 0.15, alphaCap: 0.14 },
  steady_sparkle: { bands: 8, density: 0.86, intensity: 0.74, local: 0.82, lenMin: 1, lenMax: 3, dockBias: 0.2, alphaCap: 0.18 },
  dock_ripples: { bands: 6, density: 0.82, intensity: 0.7, local: 1.35, lenMin: 2, lenMax: 4, dockBias: 0.58, alphaCap: 0.18 },
  bright_threads: { bands: 9, density: 1.02, intensity: 0.94, local: 0.92, lenMin: 2, lenMax: 5, dockBias: 0.28, alphaCap: 0.22 },
  calm_dark: { bands: 4, density: 0.5, intensity: 0.42, local: 0.38, lenMin: 1, lenMax: 2, dockBias: 0.08, alphaCap: 0.12 },
};

const FISH_OPTIONS = [
  { key: 'bass', variant: 'bass', label: 'BASS', weight: 28, fight: 2.2, sizeClass: 'medium', sizeRank: 4 },
  { key: 'walleye', variant: 'walleye', label: 'WALLEYE', weight: 24, fight: 1.8, sizeClass: 'medium-large', sizeRank: 5 },
  { key: 'perch', variant: 'perch', label: 'PERCH', weight: 20, fight: 1.4, sizeClass: 'small', sizeRank: 2 },
  { key: 'trout', variant: 'trout', label: 'TROUT', weight: 13, fight: 1.6, sizeClass: 'medium', sizeRank: 3 },
  { key: 'bluegill', variant: 'bluegill', label: 'BLUEGILL', weight: 10, fight: 1.1, sizeClass: 'tiny', sizeRank: 1 },
  { key: 'musky', variant: 'musky', label: 'MUSKY', weight: 5, fight: 3.5, sizeClass: 'large', sizeRank: 6 },
];

const SPECIAL_CATCHES = {
  weeds: { key: 'weeds', variant: 'weeds', label: 'WEEDS', fight: 0 },
};
const FISH_SIZE_KEYS = ['regular', 'large'];
const ACTIVE_CATCH_VARIANTS = [
  ...FISH_OPTIONS.flatMap((option) => FISH_SIZE_KEYS.map((sizeKey) => `${option.variant}_${sizeKey}`)),
  SPECIAL_CATCHES.weeds.variant,
];

const DEFAULT_OUTCOME = FISHING_OUTCOMES.find((outcome) => outcome.key === 'normal') || FISHING_OUTCOMES[0];
const DEFAULT_SCRIPT = FISHING_SCRIPTS.normal?.[0] || { key: 'default', lines: { cast: '...' } };

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseHexColor(value, fallback = COLORS.veilDusk) {
  if (typeof value !== 'string') return fallback;
  const clean = value.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return fallback;
  return Number.parseInt(clean, 16);
}

function pseudoRandom(index, salt = 0) {
  return (Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453) % 1;
}

function wrappedTileStart(x, width) {
  let start = ((x % width) + width) % width;
  if (start > 0) start -= width;
  return start;
}

function normalizeFarWaterRise(value) {
  return clamp(Math.round(Number(value || 0) / 4) * 4, 0, 64);
}

function pingPongFrameIndex(elapsed, frameMs, frameCount) {
  if (frameCount <= 1) return 0;
  const period = frameCount * 2 - 2;
  const index = Math.floor(elapsed / frameMs) % period;
  return index < frameCount ? index : period - index;
}

function heronFlightFrame(elapsed) {
  const frames = ['flight_up', 'flight_mid', 'flight_down', 'flight_mid'];
  return frames[Math.floor(elapsed / 180) % frames.length];
}

function setNearest(texture) {
  if (texture?.source) texture.source.scaleMode = 'nearest';
}

function makeSprite(texture) {
  const sprite = new window.PIXI.Sprite(texture);
  sprite.anchor.set(0.5, 1);
  sprite.roundPixels = true;
  return sprite;
}

const FISH_EMERGE_PROGRESS = 0.72;
const FISH_SPLASH_START_PROGRESS = 0.68;
const FISH_SPLASH_END_PROGRESS = 0.86;

function fishStateForPhase(phase) {
  const phaseName = typeof phase === 'string' ? phase : phase?.name;
  const progress = typeof phase === 'object' ? Number(phase?.p || 0) : 0;
  if (phaseName === 'throwBack') return 'free';
  if (phaseName === 'reel') return progress >= FISH_EMERGE_PROGRESS ? 'hang' : 'fight';
  if (phaseName === 'hold') return 'held';
  return 'hang';
}

function reelStageForPhase(phase) {
  if (phase?.name !== 'reel') return phase?.name || 'idle';
  return phase.p < FISH_EMERGE_PROGRESS ? 'submerged' : 'lift';
}

function surfaceBreakProgress(phase) {
  if (phase?.name !== 'reel') return 0;
  return clamp(
    (phase.p - FISH_SPLASH_START_PROGRESS)
      / (FISH_SPLASH_END_PROGRESS - FISH_SPLASH_START_PROGRESS),
    0,
    1,
  );
}

function fishTextureFor(textures, variant, phase) {
  const state = fishStateForPhase(phase);
  return textures[`fish:${variant}_${state}`]
    || textures[`fish:${variant}_hang`]
    || textures[`fish:${variant}`]
    || textures['fish:bass_regular'];
}

async function loadTextures(selection) {
  const entries = textureEntries(selection);
  const textures = {};
  await Promise.all(entries.map(async ([key, path]) => {
    const texture = await window.PIXI.Assets.load(path);
    setNearest(texture);
    textures[key] = texture;
  }));
  return textures;
}

async function loadFishMetadata() {
  try {
    const [response, legacyResponse] = await Promise.all([
      fetch(`./assets/arcade-rebuild/current/metadata/fish-v073.json?v=${VERSION}`),
      fetch(`./assets/arcade-rebuild/current/metadata/fish.json?v=${VERSION}`),
    ]);
    const metadata = response.ok ? await response.json() : {};
    metadata.legacy = legacyResponse.ok ? await legacyResponse.json() : {};
    return metadata;
  } catch {
    return {};
  }
}

async function loadAnimalLabMetadata() {
  try {
    const response = await fetch(`./assets/arcade-rebuild/current/metadata/animal-lab.json?v=${VERSION}`);
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

async function loadLakePixelSamplers(layerAssets) {
  const samplers = {};
  await Promise.all(Object.entries(layerAssets.lake_base || {}).map(async ([variant, path]) => {
    try {
      const response = await fetch(path);
      if (!response.ok) return;
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, 0, 0);
      const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const topEdge = Array.from({ length: bitmap.width }, (_, x) => {
        for (let y = 0; y < bitmap.height; y += 1) {
          const index = (y * bitmap.width + x) * 4;
          if (data[index + 3] >= WATER_OCCLUDER_ALPHA_THRESHOLD) {
            return { y, color: rgbColor(data[index], data[index + 1], data[index + 2]) };
          }
        }
        return null;
      });
      samplers[variant] = { width: bitmap.width, height: bitmap.height, data, topEdge };
      bitmap.close();
    } catch {
      // The renderer keeps a dusk-lake fallback if browser pixel reads are unavailable.
    }
  }));
  return samplers;
}

async function loadReflectionAlphaSamplers(layerAssets) {
  const samplers = {};
  const entries = REFLECTION_SOURCE_OPTIONS.flatMap((sourceLayer) => (
    Object.entries(layerAssets[sourceLayer] || {}).map(([variant, path]) => ({
      key: `${sourceLayer}:${variant}`,
      path,
    }))
  ));
  await Promise.all(entries.map(async ({ key, path }) => {
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${response.status} ${path}`);
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, 0, 0);
      const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const alpha = new Uint8Array(bitmap.width * bitmap.height);
      for (let index = 0; index < alpha.length; index += 1) {
        alpha[index] = rgba[index * 4 + 3];
      }
      samplers[key] = {
        status: 'ready',
        width: bitmap.width,
        height: bitmap.height,
        rgba: new Uint8ClampedArray(rgba),
        alpha,
      };
      bitmap.close();
    } catch (error) {
      samplers[key] = {
        status: 'missing',
        error: error?.message || String(error),
      };
    }
  }));
  return samplers;
}

async function loadWildlifeAlphaSamplers() {
  const samplers = {};
  await Promise.all(Object.entries(ASSETS.wildlife || {}).map(async ([frameKey, path]) => {
    try {
      const response = await fetch(path);
      if (!response.ok) return;
      const bitmap = await createImageBitmap(await response.blob());
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      context.drawImage(bitmap, 0, 0);
      const rgba = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const alpha = new Uint8Array(bitmap.width * bitmap.height);
      for (let index = 0; index < alpha.length; index += 1) alpha[index] = rgba[index * 4 + 3];
      samplers[frameKey] = { width: bitmap.width, height: bitmap.height, alpha };
      bitmap.close();
    } catch {
      // Wildlife falls back to its registered alpha bounds if pixel reads are unavailable.
    }
  }));
  return samplers;
}

function rgbColor(r, g, b) {
  return (r << 16) | (g << 8) | b;
}

function colorChannels(color) {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  };
}

function mixColor(first, second, amount) {
  const a = colorChannels(first);
  const b = colorChannels(second);
  const p = clamp(amount, 0, 1);
  return rgbColor(
    Math.round(lerp(a.r, b.r, p)),
    Math.round(lerp(a.g, b.g, p)),
    Math.round(lerp(a.b, b.b, p)),
  );
}

function colorString(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function layerTextureKey(layer, variant, now = 0, frameOffset = 0, frameMs = 320) {
  const asset = LAYER_ASSETS[layer]?.[variant];
  if (Array.isArray(asset)) {
    const frame = (Math.floor(now / frameMs) + frameOffset) % asset.length;
    return `layer:${layer}:${variant}:${frame}`;
  }
  if (asset) return `layer:${layer}:${variant}`;
  return null;
}

function makeLayerState(layer) {
  return {
    name: layer.name,
    label: layer.label,
    variant: layer.variants[0],
    variants: layer.variants,
    visible: layer.visible !== false,
    opacity: layer.opacity,
    speed: layer.speed || 0,
    blendMode: layer.blendMode || 'normal',
    blendModes: layer.blendModes || [],
    x: layer.x || 0,
    y: layer.y || 0,
    screenX: layer.screenX || 0,
    screenY: layer.screenY || 0,
    color: layer.color,
    studio: layer.studio !== false,
    export: layer.export !== false,
    fillViewport: Boolean(layer.fillViewport),
    looping: Boolean(layer.looping),
    traverse: Boolean(layer.traverse),
    waterAnchored: Boolean(layer.waterAnchored),
    dockAnchored: Boolean(layer.dockAnchored),
    rightViewportAnchored: Boolean(layer.rightViewportAnchored),
    compositionAnchorX: Number.isFinite(layer.compositionAnchorX) ? Number(layer.compositionAnchorX) : null,
    compositionScreenX: Number.isFinite(layer.compositionScreenX) ? Number(layer.compositionScreenX) : null,
    compositionBaselineScreenX: Number.isFinite(layer.compositionBaselineScreenX) ? Number(layer.compositionBaselineScreenX) : null,
    compositionMinNativeW: Number.isFinite(layer.compositionMinNativeW) ? Number(layer.compositionMinNativeW) : 0,
    traverseCopies: layer.traverseCopies || 3,
    traverseMobileCopies: layer.traverseMobileCopies || layer.traverseCopies || 2,
    traverseWideCopies: layer.traverseWideCopies || layer.traverseCopies || 4,
    frameMs: layer.frameMs || 320,
    zIndex: layer.zIndex || 0,
  };
}

function responsiveLayout(nativeW, nativeH, layoutState, safeArea = {}) {
  const safe = Object.fromEntries(['top', 'right', 'bottom', 'left'].map((edge) => [edge, Math.max(0, Math.ceil(Number(safeArea[edge]) || 0))]));
  const compact = nativeW < 130 || nativeH < 130;
  if (compact) {
    const left = safe.left;
    const right = nativeW - safe.right;
    const bottom = nativeH - safe.bottom;
    const dockSurfaceY = Math.max(safe.top + 70, bottom - Math.min(22, Math.round(nativeH * 0.12)));
    const avatarX = Math.round(left + Math.min(60, (right - left) * 0.42));
    const dockTipX = avatarX + 5;
    const waterY = Math.min(dockSurfaceY - 36, Math.max(safe.top + 18, Math.round(nativeH * 0.43)));
    return {
      nativeW, nativeH, compact, safeArea: safe, waterY,
      dockY: dockSurfaceY, dockSurfaceY,
      dockBaselinePercentFromBottom: Number(layoutState.dockBaselinePercentFromBottom),
      avatar: { x: avatarX, y: dockSurfaceY },
      dog: { x: Math.max(left + 11, avatarX - 28), y: dockSurfaceY },
      dockTipX, dockPlateX: dockTipX - 237,
      castTarget: { x: right - 25, y: dockSurfaceY - 25 },
      dockStart: left, dockEnd: dockTipX,
    };
  }
  const waterY = clamp(112 + Math.round((nativeH - 193) * 0.18), 96, nativeH - 72);
  const baselinePercent = clamp(Number(layoutState.dockBaselinePercentFromBottom), 5, 60);
  const dockSurfaceY = clamp(Math.round(nativeH * (1 - baselinePercent / 100)), waterY + 24, nativeH - 8);
  const actorY = dockSurfaceY;
  let avatarX = clamp(
    Math.round(nativeW * Number(layoutState.actorScreenX.avatar) / 100),
    nativeW < 130 ? 30 : 40,
    nativeW - 14,
  );
  let dogX = clamp(
    Math.round(nativeW * Number(layoutState.actorScreenX.dog) / 100),
    14,
    nativeW - 20,
  );
  if (nativeW < 130 && avatarX - dogX < 28) {
    dogX = clamp(avatarX - 28, 14, nativeW - 20);
  }
  const castMin = Math.min(nativeW - 14, avatarX + (nativeW < 130 ? 8 : 42));
  const castX = clamp(avatarX + Math.round(nativeW * (nativeW < 130 ? 0.24 : 0.34)), castMin, nativeW - 14);
  const castY = clamp(dockSurfaceY - 18, waterY + 10, nativeH - 12);
  return {
    nativeW,
    nativeH,
    waterY,
    dockY: dockSurfaceY,
    dockSurfaceY,
    dockBaselinePercentFromBottom: baselinePercent,
    avatar: { x: avatarX, y: actorY },
    dog: { x: dogX, y: actorY },
    castTarget: { x: castX, y: castY },
    dockStart: Math.max(-20, dogX - 34),
    dockEnd: nativeW + 48,
  };
}

function foregroundWaterY(layout) {
  return clamp(layout.dockSurfaceY - 10, layout.waterY + 10, layout.nativeH - 10);
}

function drawPine(g, x, baseY, h, trunk = true) {
  rect(g, x, baseY - h, 1, h, COLORS.pineDark, 1);
  for (let y = 0; y < h; y += 5) {
    const width = Math.max(2, Math.round((h - y) / 5));
    rect(g, x - width, baseY - y - 5, width * 2 + 1, 2, COLORS.pineDark, 1);
    rect(g, x - width + 1, baseY - y - 4, Math.max(1, width * 2 - 1), 1, COLORS.pine, 0.9);
  }
  if (trunk) rect(g, x, baseY - 5, 1, 6, COLORS.bark, 1);
}

function drawBird(g, x, y, flap, alpha) {
  if (flap === 0) {
    pixel(g, x, y, COLORS.ink, alpha);
    pixel(g, x - 1, y + 1, COLORS.ink, alpha);
    pixel(g, x + 1, y + 1, COLORS.ink, alpha);
  } else {
    pixel(g, x, y + 1, COLORS.ink, alpha);
    pixel(g, x - 1, y, COLORS.ink, alpha);
    pixel(g, x + 1, y, COLORS.ink, alpha);
  }
}

function drawSplash(g, x, y, p, scale = 1) {
  const a = 1 - p;
  const lift = Math.round(2 + 10 * p * scale);
  const near = Math.max(1, Math.round(2 * scale));
  const far = Math.max(2, Math.round(4 * scale));
  pixel(g, x, y - lift, COLORS.splash, a);
  pixel(g, x - near, y - Math.round(lift * 0.75), COLORS.splash, a * 0.9);
  pixel(g, x + near, y - Math.round(lift * 0.75), COLORS.splash, a * 0.9);
  pixel(g, x - far, y - Math.round(lift * 0.42), COLORS.splash, a * 0.75);
  pixel(g, x + far, y - Math.round(lift * 0.42), COLORS.splash, a * 0.75);
  rect(g, x - 1, y - 1, 3, 2, COLORS.splash, a * 0.65);
  line(g, x - Math.round((5 + 11 * p) * scale), y + 2, x - 2, y + 2, COLORS.lakeLight, a * 0.8);
  line(g, x + 2, y + 2, x + Math.round((5 + 11 * p) * scale), y + 2, COLORS.lakeLight, a * 0.8);
  line(g, x - Math.round((3 + 7 * p) * scale), y + 4, x + Math.round((3 + 7 * p) * scale), y + 4, COLORS.splash, a * 0.45);
}

function lineWaterContactPoint(rodTip, hookTarget, waterY) {
  const deltaY = hookTarget.y - rodTip.y;
  if (Math.abs(deltaY) < 0.001) return { x: hookTarget.x, y: waterY };
  const p = clamp((waterY - rodTip.y) / deltaY, 0, 1);
  return { x: lerp(rodTip.x, hookTarget.x, p), y: waterY };
}

function reelContactSplashFor(phase, rodTip, anchors, species) {
  const visible = phase?.name === 'reel' && phase.p < FISH_SPLASH_START_PROGRESS;
  return {
    visible,
    point: lineWaterContactPoint(rodTip, anchors.hookTarget, anchors.retrieveTarget.y),
    intensity: clamp(Number(species?.fight || 1.5) / 3.5, 0.35, 1),
  };
}

function drawReelContactSplash(g, contact, now) {
  if (!contact.visible) return;
  const x = Math.round(contact.point.x);
  const y = Math.round(contact.point.y);
  const frame = Math.floor(now / 130) % 4;
  const alpha = 0.48 + contact.intensity * 0.28;
  pixel(g, x, y - 1, COLORS.splash, alpha);
  if (frame === 0 || frame === 3) pixel(g, x - 1, y, COLORS.lakeLight, alpha * 0.72);
  if (frame === 1 || frame === 2) pixel(g, x + 1, y, COLORS.lakeLight, alpha * 0.72);
  if (frame === 2 && contact.intensity > 0.7) pixel(g, x, y - 2, COLORS.splash, alpha * 0.62);
  line(g, x - 1, y + 1, x + 1, y + 1, COLORS.splash, alpha * 0.32);
}

function drawBobber(g, x, y) {
  const px = Math.round(x);
  const py = Math.round(y);
  pixel(g, px, py - 3, COLORS.bobberDark, 1);
  rect(g, px - 1, py - 2, 3, 1, COLORS.bobberDark, 1);
  pixel(g, px - 2, py - 1, COLORS.bobberDark, 1);
  rect(g, px - 1, py - 1, 3, 2, COLORS.bobberRed, 1);
  pixel(g, px + 2, py - 1, COLORS.bobberDark, 1);
  pixel(g, px - 2, py, COLORS.bobberDark, 1);
  rect(g, px - 1, py + 1, 3, 1, COLORS.bobberCream, 1);
  pixel(g, px + 2, py, COLORS.bobberDark, 1);
  rect(g, px - 1, py + 2, 3, 1, COLORS.bobberDark, 1);
}

function bobberRigFor(phase, hookTarget, dip, outcome) {
  const visible = ['cast', 'settle', 'wait', 'tease', 'bite'].includes(phase.name)
    || (phase.name === 'reel' && outcomeReelsEmpty(outcome));
  const bobber = visible
    ? { x: Math.round(hookTarget.x), y: Math.round(hookTarget.y + dip) }
    : null;
  return {
    bobber,
    lineEnd: bobber ? { x: bobber.x, y: bobber.y - 3 } : hookTarget,
  };
}

function bobberRippleProgress(phase, teaseCount) {
  if (phase.name === 'tease') return (phase.p * teaseCount * 2) % 1;
  if (phase.name !== 'wait') return null;
  const centers = teaseCount === 1 ? [0.68] : [0.42, 0.72];
  for (const center of centers) {
    const p = (phase.p - (center - 0.075)) / 0.26;
    if (p >= 0 && p < 1) return p;
  }
  return null;
}

function drawBobberWaterMovement(g, phase, hookTarget, outcome, teaseCount) {
  const x = Math.round(hookTarget.x);
  const y = Math.round(hookTarget.y);
  if (phase.name === 'bite' && outcome.catchType !== 'weeds') {
    drawSplash(g, x, y, (phase.p * 3) % 1, 0.4);
  }
  const p = bobberRippleProgress(phase, teaseCount);
  if (p === null) return;
  const radius = 3 + Math.round(p * 3);
  const alpha = (1 - p) * 0.5;
  line(g, x - radius, y + 1, x - 3, y + 1, COLORS.lakeLight, alpha);
  line(g, x + 3, y + 1, x + radius, y + 1, COLORS.lakeLight, alpha);
  line(g, x - radius + 1, y + 3, x + radius - 1, y + 3, COLORS.lakeLight, alpha * 0.5);
}

function phaseAt(elapsed, timeline = FISHING_TIMELINE) {
  let cursor = 0;
  for (const [name, duration] of Object.entries(timeline)) {
    const end = cursor + duration;
    if (elapsed < end) {
      return { name, p: clamp((elapsed - cursor) / duration, 0, 1), start: cursor, end };
    }
    cursor = end;
  }
  return { name: 'done', p: 1, start: cursor, end: cursor };
}

function timelineTotal(timeline = FISHING_TIMELINE) {
  return Object.values(timeline).reduce((sum, value) => sum + value, 0);
}

function timelineCursorFor(name, timeline) {
  let cursor = 0;
  for (const [phaseName, duration] of Object.entries(timeline)) {
    if (phaseName === name) return { start: cursor, duration };
    cursor += duration;
  }
  return { start: 0, duration: 1 };
}

function outcomeHasCatch(outcome) {
  return outcome?.catchType === 'fish' || outcome?.catchType === 'weeds';
}

function outcomeReelsEmpty(outcome) {
  return outcome?.catchType === 'empty';
}

function lineAttachedForPhase(phaseName, outcome) {
  if (outcomeReelsEmpty(outcome)) return ['cast', 'settle', 'wait', 'tease', 'bite', 'reel'].includes(phaseName);
  if (!outcomeHasCatch(outcome)) return ['cast', 'settle', 'wait', 'tease', 'bite'].includes(phaseName);
  return ['cast', 'settle', 'wait', 'tease', 'bite', 'reel', 'hold'].includes(phaseName);
}

function lineIsTautForPhase(phase) {
  return phase?.name === 'hold' || phase?.name === 'reel';
}

function buildFishingTimeline(teaseCount, outcome = DEFAULT_OUTCOME) {
  const timeline = {
    ...FISHING_TIMELINE,
    wait: FISHING_TIMELINE.wait + teaseCount * 180,
    tease: FISHING_TIMELINE.tease + (teaseCount - 1) * 220,
  };
  if (outcome?.noBite) {
    timeline.bite = 0;
    timeline.reel = 3200;
    timeline.splash = 0;
    timeline.hold = 3600;
    timeline.throwBack = 0;
  } else if (outcomeReelsEmpty(outcome)) {
    timeline.splash = 0;
    timeline.hold = 3600;
    timeline.throwBack = 0;
  } else if (!outcomeHasCatch(outcome)) {
    timeline.reel = 0;
    timeline.splash = 0;
    timeline.hold = 1700;
    timeline.throwBack = 900;
  }
  return timeline;
}

function chooseWeightedOption(options, previousKey = null) {
  const pool = options.filter((option) => option.key !== previousKey);
  const total = pool.reduce((sum, option) => sum + option.weight, 0);
  let ticket = Math.random() * total;
  for (const option of pool) {
    ticket -= option.weight;
    if (ticket <= 0) return option;
  }
  return pool[0] || options[0];
}

function chooseWeightedSpecies(previousKey) {
  return chooseWeightedOption(FISH_OPTIONS, previousKey) || FISH_OPTIONS[0];
}

function outcomeByKey(key) {
  return FISHING_OUTCOMES.find((outcome) => outcome.key === key) || DEFAULT_OUTCOME;
}

function chooseFishingOutcome(previousKey) {
  const selected = chooseWeightedOption(FISHING_OUTCOMES, null) || DEFAULT_OUTCOME;
  if (selected.key !== 'normal' && selected.key === previousKey) {
    return chooseWeightedOption(FISHING_OUTCOMES, previousKey) || DEFAULT_OUTCOME;
  }
  return selected;
}

function scriptsForOutcome(outcomeKey, speciesKey = null, sizeKey = null) {
  const scripts = FISHING_SCRIPTS[outcomeKey] || FISHING_SCRIPTS.normal || [DEFAULT_SCRIPT];
  if (outcomeKey !== 'normal' || !speciesKey) return scripts;
  const speciesScripts = scripts.filter((script) => (
    script.speciesKey === speciesKey && (!sizeKey || script.sizeKey === sizeKey)
  ));
  return speciesScripts.length ? speciesScripts : scripts;
}

function chooseFishingScript(outcomeKey, speciesKey, sizeKey, previousKey) {
  const scripts = scriptsForOutcome(outcomeKey, speciesKey, sizeKey);
  return chooseWeightedOption(scripts.map((script) => ({ ...script, weight: Number(script.weight ?? 1) })), previousKey) || scripts[0] || DEFAULT_SCRIPT;
}

function speciesForOutcome(outcome, previousSpeciesKey) {
  if (outcome?.catchType === 'weeds') return SPECIAL_CATCHES.weeds;
  if (outcome?.speciesKey) {
    return FISH_OPTIONS.find((option) => option.key === outcome.speciesKey) || FISH_OPTIONS[0];
  }
  if (!outcomeHasCatch(outcome)) return FISH_OPTIONS[0];
  return chooseWeightedSpecies(previousSpeciesKey);
}

function pointOnArc(start, control, end, p) {
  const inv = 1 - p;
  return {
    x: inv * inv * start.x + 2 * inv * p * control.x + p * p * end.x,
    y: inv * inv * start.y + 2 * inv * p * control.y + p * p * end.y,
  };
}

function returnPointFor(layout, hand) {
  if (layout.compact) return { ...layout.castTarget };
  return {
    x: clamp(hand.x + 54, hand.x + 28, layout.nativeW - 12),
    y: foregroundWaterY(layout),
  };
}

function holdPointFor(hand) {
  return { x: hand.x + 8, y: hand.y + 6 };
}

function heldFishMouthPointFor(hand) {
  return { x: hand.x + 8, y: hand.y + 3 };
}

function fallbackFishAnchor(texture, state) {
  const width = Math.max(1, texture?.width || 1);
  const height = Math.max(1, texture?.height || 1);
  if (state === 'fight') return { x: (width - FISH_PADDING - 1) / width, y: 0.5 };
  if (state === 'hang' || state === 'held') {
    return {
      x: (FISH_PADDING + (width - FISH_PADDING * 2) * 0.55) / width,
      y: (FISH_PADDING + 1) / height,
    };
  }
  return { x: 0.5, y: 0.5 };
}

function fallbackFishBodyLength(texture, state) {
  const width = Math.max(1, (texture?.width || 16) - FISH_PADDING * 2);
  const height = Math.max(1, (texture?.height || 16) - FISH_PADDING * 2);
  if (state === 'fight') return Math.max(6, Math.round(width * 0.56));
  if (state === 'hang' || state === 'held') return Math.max(5, Math.round(height * 0.72));
  return Math.max(5, Math.round(Math.max(width, height) * 0.45));
}

function fishBodyPointFromMouth(mouth, texture, state, meta, rotation = 0) {
  const bodyLength = Math.max(5, Math.round(meta?.bodyLength ?? fallbackFishBodyLength(texture, state)));
  const baseAngle = Number(meta?.bodyAngle ?? (state === 'free' ? 0 : Math.PI / 2));
  const bodyAngle = baseAngle + (state === 'fight' ? (rotation - Number(meta?.rotation ?? FISH_HANG_ROTATION)) * 0.35 : 0);
  return {
    x: Math.round(mouth.x + Math.cos(bodyAngle) * bodyLength),
    y: Math.round(mouth.y + Math.sin(bodyAngle) * bodyLength),
  };
}

function fightOffset(species, phase, now, strength = 1) {
  if (!phase || phase.name !== 'reel') return { x: 0, y: 0 };
  const remaining = 1 - easeInOut(phase.p);
  const amp = (species?.fight || 1.5) * remaining * Number(strength || 0);
  return {
    x: Math.round(Math.sin(now / 72) * amp + Math.sin(now / 37) * amp * 0.55),
    y: Math.round(Math.cos(now / 84) * amp * 0.6),
  };
}

function hookTargetFor(layout, hand, phase, rig, now = 0, species = FISH_OPTIONS[0], fightWiggle = 1, holdTarget = null) {
  const water = {
    x: layout.castTarget.x + rig.castTargetOffset.x,
    y: layout.castTarget.y + rig.castTargetOffset.y,
  };
  const hold = holdTarget || heldFishMouthPointFor(hand);
  if (phase.name === 'cast') {
    const p = easeOut(phase.p);
    return pointOnArc(
      { x: hand.x + 5, y: hand.y - 4 },
      { x: hand.x + 36, y: hand.y - 54 },
      water,
      p,
    );
  }
  if (phase.name === 'reel') {
    const retrieveTarget = returnPointWithRig(layout, hand, rig);
    if (phase.p < FISH_EMERGE_PROGRESS) {
      const retrieveP = easeInOut(clamp(phase.p / FISH_EMERGE_PROGRESS, 0, 1));
      const point = {
        x: lerp(water.x, retrieveTarget.x, retrieveP),
        y: lerp(water.y, retrieveTarget.y, retrieveP),
      };
      const fight = fightOffset(species, { name: 'reel', p: retrieveP }, now, fightWiggle);
      return { x: point.x + fight.x, y: point.y + fight.y };
    }
    const liftP = easeOut(clamp(
      (phase.p - FISH_EMERGE_PROGRESS) / (1 - FISH_EMERGE_PROGRESS),
      0,
      1,
    ));
    return {
      x: lerp(retrieveTarget.x, hold.x, liftP),
      y: lerp(retrieveTarget.y, hold.y, liftP),
    };
  }
  if (phase.name === 'hold') return hold;
  return water;
}

function returnPointWithRig(layout, hand, rig) {
  const base = returnPointFor(layout, hand);
  return {
    x: base.x + rig.returnTargetOffset.x,
    y: base.y + rig.returnTargetOffset.y,
  };
}

function throwFishPointFor(layout, hand, phase, rig, heldBody = null) {
  const end = returnPointWithRig(layout, hand, rig);
  if (phase.name === 'throwBack') {
    const p = clamp(phase.p, 0, 1);
    const bodyHold = heldBody || { x: hand.x + 14, y: hand.y + 14 };
    const arcHeight = Math.max(14, Math.min(26, Math.abs(end.x - bodyHold.x) * 0.42));
    return {
      x: lerp(bodyHold.x, end.x, p),
      y: lerp(bodyHold.y, end.y, p) - arcHeight * 4 * p * (1 - p),
    };
  }
  return end;
}

function offsetPoint(point, offset) {
  return { x: point.x + offset.x, y: point.y + offset.y };
}

function rodTipFor(hand, phase, rig) {
  const idle = offsetPoint(hand, rig.rodTipOffsets.idle);
  const back = offsetPoint(hand, rig.rodTipOffsets.back);
  const forward = offsetPoint(hand, rig.rodTipOffsets.forward);
  const low = offsetPoint(hand, rig.rodTipOffsets.low);
  if (!phase || phase.name === 'idle') return idle;
  if (phase.name === 'windup') {
    const p = easeInOut(phase.p);
    return { x: lerp(idle.x, back.x, p), y: lerp(idle.y, back.y, p) };
  }
  if (phase.name === 'cast') {
    const p = easeOut(phase.p);
    return { x: lerp(back.x, forward.x, p), y: lerp(back.y, forward.y, p) };
  }
  if (phase.name === 'reel') {
    const p = easeInOut(phase.p);
    return { x: lerp(forward.x, low.x, p), y: lerp(forward.y, low.y, p) };
  }
  if (phase.name === 'hold') return low;
  if (phase.name === 'throwBack') {
    const p = easeOut(clamp(phase.p / 0.32, 0, 1));
    return { x: lerp(low.x, idle.x, p), y: lerp(low.y, idle.y, p) };
  }
  if (phase.name === 'splash' || phase.name === 'reset' || phase.name === 'done') {
    return idle;
  }
  return forward;
}

function messageForPhase(phase, species, script) {
  return fishingLineForPhase(script, phase, species);
}

export async function createWorld(root, renderer, audio, { development = false } = {}) {
  const selection = selectAssets(development);
  let dialogueBounds = null;
  const { Container, Graphics, Sprite, Texture, Rectangle } = window.PIXI;
  const [textures, fishMetadata, animalLabMetadata, lakePixelSamplers, reflectionAlphaSamplers, wildlifeAlphaSamplers] = await Promise.all([
    loadTextures(selection),
    loadFishMetadata(),
    loadAnimalLabMetadata(),
    loadLakePixelSamplers(selection.layers),
    loadReflectionAlphaSamplers(selection.layers),
    loadWildlifeAlphaSamplers(),
  ]);
  const layerStates = Object.fromEntries(LAYERS.map((layer) => [layer.name, makeLayerState(layer)]));
  const entityStates = clone(ENTITY_DEFAULTS);
  const layoutState = clone(LAYOUT_DEFAULTS);
  const rigState = clone(RIG_DEFAULTS);
  const waterState = clone(WATER_DEFAULTS);
  const reflectionState = clone(REFLECTION_DEFAULTS);
  const reflectionTextureIds = new WeakMap();
  const reflectionTextureCache = new Map();
  const reflectionFootprintCache = new Map();
  let reflectionTextureId = 0;
  let reflectionMaskRenderKey = '';
  let reflectionCompositionRuntime = {
    compositionOrder: [...REFLECTION_DEPTH_ORDER],
    occluders: {},
    footprints: {},
    backFarOverlapPixels: 0,
    samplerStatus: {},
    degraded: false,
  };
  let waterlineMaskRenderKey = '';
  let waterlineMaskRuntime = {
    status: 'pending',
    riseScreenPx: normalizeFarWaterRise(waterState.farWaterRiseScreenPx),
    riseNativePx: normalizeFarWaterRise(waterState.farWaterRiseScreenPx) / 4,
    minY: null,
    maxY: null,
    runCount: 0,
  };
  const animalLabState = clone(ANIMAL_LAB_DEFAULTS);
  let animalLabAnimationEpoch = performance.now();
  let animalLabContactRuntime = null;
  const fishDisplayState = clone(FISH_DISPLAY_DEFAULTS);
  const wildlifeTuningState = clone(WILDLIFE_TUNING_DEFAULTS);
  let wildlifeContactRuntime = null;
  const farBirdReactions = new Map();
  let farBirdHitTargets = [];

  const layerContainers = {};
  const layerGraphics = {};
  const layerSprites = {};
  const farBirdSprites = [];
  const farBirdTextures = {};
  for (const [variant, frames] of Object.entries(LAYER_ASSETS.far_birds || {})) {
    if (!Array.isArray(frames)) continue;
    frames.forEach((_path, frameIndex) => {
      const plate = textures[`layer:far_birds:${variant}:${frameIndex}`];
      if (!plate) return;
      FAR_BIRD_CROPS.forEach((crop, slotIndex) => {
        const texture = new Texture({
          source: plate.source,
          frame: new Rectangle(crop.x, crop.y, crop.width, crop.height),
        });
        setNearest(texture);
        farBirdTextures[`${variant}:${frameIndex}:${slotIndex}`] = texture;
      });
    });
  }
  root.sortableChildren = true;
  for (const [index, layer] of LAYERS.entries()) {
    const container = new Container();
    container.label = layer.name;
    container.zIndex = layer.zIndex ?? index;
    const graphics = new Graphics();
    if (layer.name === 'lake_base') container.addChild(graphics);
    else if (layer.name !== 'lake_shimmer') container.addChild(graphics);
    const layerAsset = selection.layers[layer.name]?.[layer.variants[0]];
    if (layerAsset) {
      if (layer.name === 'far_birds') {
        for (let birdIndex = 0; birdIndex < 4; birdIndex += 1) {
          const slotIndex = birdIndex % 3;
          const sprite = new Sprite(farBirdTextures[`${layer.variants[0]}:0:${slotIndex}`]);
          sprite.roundPixels = true;
          sprite.visible = false;
          container.addChild(sprite);
          farBirdSprites.push({ sprite, birdIndex, slotIndex });
        }
      } else {
      const sprites = [];
      const spriteCount = layer.traverse ? 8 : 4;
      for (let index = 0; index < spriteCount; index += 1) {
        const sprite = new window.PIXI.Sprite(textures[layerTextureKey(layer.name, layer.variants[0], 0)]);
        sprite.roundPixels = true;
        sprite.texture.source.scaleMode = 'nearest';
        sprite.visible = index === 0;
        container.addChild(sprite);
        sprites.push(sprite);
      }
      layerSprites[layer.name] = sprites;
      }
    }
    if (layer.name === 'lake_shimmer') container.addChild(graphics);
    root.addChild(container);
    layerContainers[layer.name] = container;
    layerGraphics[layer.name] = graphics;
  }

  const waterlineMasks = ['lake_base', 'lake_shimmer'].map((layerName) => {
    const mask = new Graphics();
    mask.label = `${layerName}_shoreline_mask`;
    layerContainers[layerName].addChild(mask);
    layerContainers[layerName].mask = mask;
    return mask;
  });

  const dockBankFill = new window.PIXI.TilingSprite({ texture: textures['terrain:dock_bank'], width: 1, height: 1 });
  dockBankFill.roundPixels = true;
  dockBankFill.visible = false;
  dockBankFill.mask = layerGraphics.foreground_dock_shore;
  layerContainers.foreground_dock_shore.addChildAt(dockBankFill, 0);

  const avatar = makeSprite(textures['avatar:current']);
  const dog = makeSprite(textures['dog:idle']);
  const fish = makeSprite(textures['fish:bass_regular']);
  fish.anchor.set(0.5, 0.5);
  const heron = makeSprite(textures['heron:idle']);
  heron.anchor.set(0.5, 1);
  const animalLabSprite = makeSprite(textures['animalLab:heron_b_grey_white_01_idle'] || textures['heron:idle']);
  animalLabSprite.anchor.set(0.5, 1);
  const wildlifeSprites = Object.fromEntries(WILDLIFE_KINDS.map((kind) => {
    const sprite = makeSprite(textures[`wildlife:${kind}_f0`]);
    sprite.visible = false;
    layerContainers.wildlife_cameos.addChild(sprite);
    return [kind, sprite];
  }));
  const wildlifeContactFront = new Graphics();
  layerContainers.wildlife_cameos.addChild(wildlifeContactFront);
  const wildlifeContactAccents = new Graphics();
  layerContainers.wildlife_cameos.addChild(wildlifeContactAccents);
  const reflectionMirrorSourceContainers = {};
  const reflectionMirrorMasks = {};
  const reflectionMirrorShadows = {};
  const reflectionMirrorSprites = Object.fromEntries(REFLECTION_SOURCE_OPTIONS.map((sourceLayer) => {
    const sourceContainer = new Container();
    sourceContainer.label = `reflection_${sourceLayer}`;
    layerContainers.reflection_mirror.addChild(sourceContainer);
    reflectionMirrorSourceContainers[sourceLayer] = sourceContainer;
    const contactShadow = new Graphics();
    sourceContainer.addChild(contactShadow);
    reflectionMirrorShadows[sourceLayer] = contactShadow;
    const sprites = Array.from({ length: 8 }, () => {
      const sprite = new window.PIXI.Sprite();
      sprite.roundPixels = true;
      sprite.visible = false;
      sourceContainer.addChild(sprite);
      return sprite;
    });
    const sourceMask = new Graphics();
    layerContainers.reflection_mirror.addChild(sourceMask);
    sourceContainer.mask = sourceMask;
    reflectionMirrorMasks[sourceLayer] = sourceMask;
    return [sourceLayer, sprites];
  }));
  const reflectionCompositeSprite = new Sprite();
  reflectionCompositeSprite.roundPixels = true;
  reflectionCompositeSprite.visible = false;
  layerContainers.reflection_mirror.addChild(reflectionCompositeSprite);
  let reflectionCompositeTexture = null;
  const reflectionMirrorMask = new Graphics();
  layerContainers.reflection_mirror.addChild(reflectionMirrorMask);
  layerContainers.reflection_mirror.mask = reflectionMirrorMask;
  layerContainers.actors.addChild(dog, avatar);
  layerContainers.heron.addChild(heron);
  layerContainers.animal_lab_preview.addChild(animalLabSprite);
  const animalLabContactFront = new Graphics();
  layerContainers.animal_lab_preview.addChild(animalLabContactFront);
  layerContainers.line_and_interactions.addChild(fish);
  const torontoTower = makeSprite(textures['toronto:cn_tower']);
  const torontoUfo = makeSprite(textures['toronto:ufo']);
  torontoTower.anchor.set(0.5, 1);
  torontoUfo.anchor.set(0.5, 0.5);
  torontoTower.visible = false;
  torontoUfo.visible = false;
  const torontoTowerMask = new Graphics();
  layerContainers.toronto_easter_egg.addChild(torontoTower, torontoUfo, torontoTowerMask);
  torontoTower.mask = torontoTowerMask;

  const fishing = {
    active: false,
    start: 0,
    phase: null,
    barked: false,
    audioPhase: null,
    emergeSplashPlayed: false,
    total: timelineTotal(),
    timeline: clone(FISHING_TIMELINE),
    teaseCount: 1,
    species: FISH_OPTIONS[0],
    sizeKey: 'regular',
    outcome: DEFAULT_OUTCOME,
    script: DEFAULT_SCRIPT,
    currentLine: '',
  };
  let lastSpeciesKey = null;
  let lastOutcomeKey = null;
  const lastScriptByPool = new Map();

  function scriptPoolKey(outcome, species, sizeKey = fishing.sizeKey) {
    return outcome?.catchType === 'fish'
      ? `fish:${species?.key || 'bass'}:${sizeKey || 'regular'}`
      : `outcome:${outcome?.key || 'normal'}`;
  }

  function activeCatchVariant() {
    if (!fishing.active) return `${entityStates.fish.variant}_regular`;
    return fishing.outcome.catchType === 'fish'
      ? `${fishing.species.variant}_${fishing.sizeKey}`
      : fishing.species.variant;
  }
  const dogState = {
    wagUntil: 0,
    barkUntil: 0,
    clickCount: 0,
    mode: 'idle',
    modeStart: 0,
    awayUntil: 0,
  };
  const heronState = {
    mode: 'idle',
    modeStart: 0,
    goneUntil: 0,
    visible: HERON_DEFAULTS.visible,
    facing: 1,
  };
  const torontoState = {
    active: false,
    start: 0,
    phase: 'idle',
    audioPhase: null,
  };
  const waterPlops = [];
  const wildlife = {
    active: false,
    kind: null,
    start: 0,
    duration: 0,
    seed: 0.5,
    force: 'none',
    catchCount: 0,
    swimmerSeen: false,
    mooseSeen: false,
    nextSwimmerAt: performance.now() + 5000 + Math.random() * 5000,
    nextMooseAt: performance.now() + 10000 + Math.random() * 10000,
  };
  const flags = { paused: false, grid: false, bounds: false, forceShimmer: false, sampleChat: false };
  let lastNow = 0;
  let fishingTargetCache = null;
  let fishingWaterMaskCache = null;

  function currentLayout() {
    const base = responsiveLayout(renderer.nativeViewW, renderer.nativeViewH, layoutState, renderer.safeArea);
    const foreground = layerStates.foreground_dock_shore;
    const dockGroupOffsetY = foreground && !base.compact
      ? Math.round(Number(foreground.y || 0) + base.nativeH * Number(foreground.screenY || 0) / 100)
      : 0;
    const maxDockSurfaceY = base.compact ? base.nativeH - base.safeArea.bottom - 4 : base.nativeH - 6;
    const dockSurfaceY = clamp(base.dockSurfaceY + dockGroupOffsetY, base.waterY + 24, maxDockSurfaceY);
    const layoutNow = {
      ...base,
      baseDockSurfaceY: base.dockSurfaceY,
      dockGroupOffsetY,
      dockY: dockSurfaceY,
      dockSurfaceY,
      avatar: { ...base.avatar, y: dockSurfaceY },
      dog: { ...base.dog, y: dockSurfaceY },
      castTarget: base.compact ? base.castTarget : { ...base.castTarget, y: foregroundWaterY({ ...base, dockSurfaceY }) + 2 },
    };
    const key = JSON.stringify([layoutNow, WATER_OCCLUDING_LAYERS.map((name) => layerStates[name])]);
    if (fishingTargetCache?.key !== key) {
      fishingTargetCache = { key, target: resolveFishingTarget(layoutNow, lastNow || performance.now()) };
    }
    layoutNow.fishingWaterAvailable = Boolean(fishingTargetCache.target);
    if (fishingTargetCache.target) layoutNow.castTarget = { ...fishingTargetCache.target };
    return layoutNow;
  }

  function torontoPhaseAt(now) {
    if (!torontoState.active) return { name: 'idle', p: 0, start: 0, end: 0 };
    return phaseAt(Math.max(0, now - torontoState.start), TORONTO_TIMELINE);
  }

  function treelineSkylineYAt(layoutNow, screenX) {
    const treeline = layerStates.back_treeline;
    const sampler = reflectionAlphaSamplers[`back_treeline:${treeline.variant}`];
    const textureKey = layerTextureKey('back_treeline', treeline.variant, 0, 0, treeline.frameMs)
      || layerTextureKey('back_treeline', treeline.variants[0], 0, 0, treeline.frameMs);
    const texture = textureKey ? textures[textureKey] : null;
    if (!texture || sampler?.status !== 'ready') return layoutNow.waterY;
    const position = spritePositionsFor('back_treeline', treeline, texture, layoutNow, 0).find((candidate) => (
      screenX >= candidate.x && screenX < candidate.x + sampler.width
    ));
    if (!position) return layoutNow.waterY;
    const sourceX = clamp(Math.round(screenX - position.x), 0, sampler.width - 1);
    for (let sourceY = 0; sourceY < sampler.height; sourceY += 1) {
      if ((sampler.alpha[sourceY * sampler.width + sourceX] || 0) >= WATER_OCCLUDER_ALPHA_THRESHOLD) {
        return Math.round(position.y + sourceY);
      }
    }
    return layoutNow.waterY;
  }

  function torontoPlacement(layoutNow) {
    const towerWidth = Math.max(1, Math.round(torontoTower.texture.width || 6));
    const towerHeight = Math.max(1, Math.round(torontoTower.texture.height || 35));
    const rightSearchStart = layoutNow.nativeW < 120 ? 0.3 : 0.64;
    const minX = clamp(Math.round(layoutNow.nativeW * rightSearchStart), 18, layoutNow.nativeW - 16);
    const maxX = clamp(Math.round(layoutNow.nativeW * 0.92), minX, layoutNow.nativeW - 16);
    const preferredX = Math.round(layoutNow.nativeW * 0.82);
    let targetX = minX;
    let skylineY = 0;
    let bestScore = -Infinity;
    for (let candidateX = minX; candidateX <= maxX; candidateX += 1) {
      let candidateSkyline = layoutNow.waterY;
      for (let dx = -Math.floor(towerWidth / 2); dx <= Math.ceil(towerWidth / 2); dx += 1) {
        candidateSkyline = Math.min(candidateSkyline, treelineSkylineYAt(layoutNow, candidateX + dx));
      }
      const score = candidateSkyline - Math.abs(candidateX - preferredX) * 0.18;
      if (score > bestScore) {
        bestScore = score;
        targetX = candidateX;
        skylineY = candidateSkyline;
      }
    }
    const towerBaseY = clamp(
      Math.min(
        Math.round(layoutNow.waterY - 7),
        Math.round(skylineY + towerHeight - 10),
      ),
      towerHeight + 2,
      Math.round(layoutNow.waterY - 7),
    );
    return {
      targetX,
      offscreenX: layoutNow.nativeW + 18,
      ufoY: clamp(Math.round(layoutNow.nativeH * 0.15), 16, 38),
      towerBaseY,
      skylineY,
      towerClearance: Math.max(0, skylineY - (towerBaseY - towerHeight)),
    };
  }

  function torontoRuntime(now = lastNow || performance.now(), layoutNow = currentLayout()) {
    const phase = torontoPhaseAt(now);
    const placement = torontoPlacement(layoutNow);
    let ufoX = placement.targetX;
    if (phase.name === 'arrival') ufoX = lerp(placement.offscreenX, placement.targetX, easeOut(phase.p));
    if (phase.name === 'depart' || phase.name === 'exit') ufoX = lerp(placement.targetX, placement.offscreenX, easeInOut(phase.p));
    if (phase.name === 'return') ufoX = lerp(placement.offscreenX, placement.targetX, easeInOut(phase.p));
    const towerVisible = ['beam-in', 'depart', 'tower-visible', 'return', 'beam-out'].includes(phase.name);
    const ufoVisible = !['idle', 'tower-visible', 'done'].includes(phase.name);
    const towerReveal = phase.name === 'beam-in'
      ? phase.p
      : phase.name === 'beam-out'
        ? 1 - phase.p
        : towerVisible ? 1 : 0;
    return {
      active: torontoState.active,
      phase: phase.name,
      progress: phase.p,
      elapsedMs: Math.max(0, Math.round(now - torontoState.start)),
      nativeView: { width: layoutNow.nativeW, height: layoutNow.nativeH },
      ufo: {
        visible: ufoVisible,
        x: Math.round(ufoX),
        y: placement.ufoY,
        width: torontoUfo.texture.width,
        height: torontoUfo.texture.height,
      },
      tower: {
        visible: towerVisible,
        x: placement.targetX,
        y: placement.towerBaseY,
        reveal: clamp(towerReveal, 0, 1),
        width: torontoTower.texture.width,
        height: torontoTower.texture.height,
        skylineY: placement.skylineY,
        visibleClearance: placement.towerClearance,
      },
      beamVisible: phase.name === 'beam-in' || phase.name === 'beam-out',
    };
  }

  function triggerToronto(now = performance.now()) {
    if (torontoState.active) return false;
    torontoState.active = true;
    torontoState.start = now;
    torontoState.phase = 'arrival';
    torontoState.audioPhase = null;
    draw(now);
    return true;
  }

  function drawTorontoEasterEgg(g, layoutNow, now) {
    const runtime = torontoRuntime(now, layoutNow);
    torontoTowerMask.clear();
    if (runtime.phase === 'done') {
      torontoState.active = false;
      torontoState.phase = 'idle';
      torontoState.audioPhase = null;
      torontoTower.visible = false;
      torontoUfo.visible = false;
      return;
    }
    torontoState.phase = runtime.phase;
    if (runtime.phase !== torontoState.audioPhase) {
      if (runtime.phase === 'beam-in') audio.play('ufo_beam_in');
      if (runtime.phase === 'beam-out') audio.play('ufo_beam_out');
      torontoState.audioPhase = runtime.phase;
    }

    torontoUfo.visible = runtime.ufo.visible;
    torontoUfo.position.set(runtime.ufo.x, runtime.ufo.y);
    torontoTower.visible = runtime.tower.visible;
    torontoTower.position.set(runtime.tower.x, runtime.tower.y);
    if (runtime.tower.visible) {
      const revealHeight = Math.max(1, Math.round(torontoTower.texture.height * runtime.tower.reveal));
      rect(
        torontoTowerMask,
        Math.round(runtime.tower.x - torontoTower.texture.width / 2),
        Math.round(runtime.tower.y - revealHeight),
        Math.round(torontoTower.texture.width),
        revealHeight,
        0xffffff,
        1,
      );
    }
    if (runtime.beamVisible) {
      const beamAlpha = 0.18 + Math.sin(runtime.progress * Math.PI) * 0.34;
      for (let y = runtime.ufo.y + 5; y < runtime.tower.y; y += 4) {
        const jitter = ((y + Math.floor(runtime.progress * 10)) % 3) - 1;
        pixel(g, runtime.tower.x + jitter, y, COLORS.sparklePeach, beamAlpha);
      }
      pixel(g, runtime.tower.x - 1, runtime.ufo.y + 5, COLORS.sparkleLavender, beamAlpha);
      pixel(g, runtime.tower.x + 1, runtime.ufo.y + 5, COLORS.sparkleLavender, beamAlpha);
    }
  }

  function entityPoint(name, layoutNow) {
    const state = entityStates[name];
    const defaults = ENTITY_DEFAULTS[name];
    const base = layoutNow[name];
    if (!state || !defaults || !base) return { x: state?.x || 0, y: state?.y || 0 };
    return {
      x: base.x + (state.x - defaults.x),
      y: base.y + (state.y - defaults.y),
    };
  }

  function handPoint(layoutNow) {
    const avatarPoint = entityPoint('avatar', layoutNow);
    return {
      x: Math.round(avatarPoint.x + rigState.rodBaseOffset.x),
      y: Math.round(avatarPoint.y + rigState.rodBaseOffset.y),
    };
  }

  function chatOriginPoint(layoutNow) {
    const avatarPoint = entityPoint('avatar', layoutNow);
    return {
      x: Math.round(avatarPoint.x + 2),
      y: Math.round(avatarPoint.y - 47),
      placement: 'above',
    };
  }

  function dogOffset(now, layoutNow) {
    const travel = Math.max(52, layoutNow.dog.x + 34);
    if (dogState.mode === 'walkOff') {
      const p = clamp((now - dogState.modeStart) / DOG_EASTER_EGG_DEFAULTS.walkDuration, 0, 1);
      return { x: -Math.round(travel * easeInOut(p)), y: 0, p };
    }
    if (dogState.mode === 'away') {
      return { x: -travel, y: 0, p: 1 };
    }
    if (dogState.mode === 'return') {
      const p = clamp((now - dogState.modeStart) / DOG_EASTER_EGG_DEFAULTS.returnDuration, 0, 1);
      return { x: -Math.round(travel * (1 - easeInOut(p))), y: 0, p };
    }
    return { x: 0, y: 0, p: 0 };
  }

  function updateDogEasterEgg(now) {
    if (dogState.mode === 'walkOff' && now - dogState.modeStart >= DOG_EASTER_EGG_DEFAULTS.walkDuration) {
      dogState.mode = 'away';
      dogState.modeStart = now;
      dogState.awayUntil = now + DOG_EASTER_EGG_DEFAULTS.awayDuration;
    }
    if (dogState.mode === 'away' && now >= dogState.awayUntil && !fishing.active) {
      dogState.mode = 'return';
      dogState.modeStart = now;
    }
    if (dogState.mode === 'return' && now - dogState.modeStart >= DOG_EASTER_EGG_DEFAULTS.returnDuration) {
      dogState.mode = 'idle';
      dogState.modeStart = 0;
      dogState.clickCount = 0;
      dogState.awayUntil = 0;
    }
  }

  function triggerDogClick(now) {
    if (dogState.mode !== 'idle') return false;
    dogState.clickCount += 1;
    dogState.wagUntil = now + 1200;
    if (dogState.clickCount >= DOG_EASTER_EGG_DEFAULTS.clickThreshold && !fishing.active) {
      dogState.mode = 'walkOff';
      dogState.modeStart = now;
      dogState.wagUntil = 0;
    }
    return true;
  }

  function heronBasePoint(layoutNow) {
    const x = clamp(layoutNow.nativeW - 82, Math.round(layoutNow.avatar.x + 68), layoutNow.nativeW - 18);
    return { x, y: Math.round(layoutNow.waterY + (layoutNow.compact ? -11 : 43)) };
  }

  function heronRuntimeState(layoutNow, now) {
    if (!heronState.visible) return { visible: false, mode: 'hidden', texture: 'idle', x: 0, y: 0, progress: 0, scaleX: 1 };
    const base = heronBasePoint(layoutNow);
    const rightExit = layoutNow.nativeW + 36;
    const elapsed = now - heronState.modeStart;
    if (heronState.mode === 'alert') {
      const p = clamp(elapsed / HERON_DEFAULTS.alertDuration, 0, 1);
      if (p >= 1) {
        heronState.mode = 'takeoff';
        heronState.modeStart = now;
      }
      return { visible: true, mode: 'alert', texture: 'alert', x: base.x, y: base.y, progress: p, scaleX: 1 };
    }
    if (heronState.mode === 'takeoff') {
      const p = clamp(elapsed / HERON_DEFAULTS.takeoffDuration, 0, 1);
      if (p >= 1) {
        heronState.mode = 'flyAway';
        heronState.modeStart = now;
      }
      return { visible: true, mode: 'takeoff', texture: p < 0.5 ? 'takeoff_1' : 'takeoff_2', x: base.x + Math.round(p * 8), y: base.y - 2 - Math.round(p * 14), progress: p, scaleX: 1 };
    }
    if (heronState.mode === 'flyAway') {
      const p = clamp(elapsed / HERON_DEFAULTS.flyDuration, 0, 1);
      if (p >= 1) {
        heronState.mode = 'gone';
        heronState.modeStart = now;
        heronState.goneUntil = now + HERON_DEFAULTS.returnDelay;
      }
      return { visible: true, mode: 'flyAway', texture: heronFlightFrame(elapsed), x: Math.round(lerp(base.x + 8, rightExit, easeInOut(p))), y: Math.round(base.y - 16 - Math.sin(p * Math.PI) * 10), progress: p, scaleX: 1 };
    }
    if (heronState.mode === 'gone') {
      if (now >= heronState.goneUntil && !fishing.active) {
        heronState.mode = 'return';
        heronState.modeStart = now;
      }
      return { visible: false, mode: 'gone', texture: 'flight_mid', x: rightExit, y: base.y, progress: 1, scaleX: -1 };
    }
    if (heronState.mode === 'return') {
      const p = clamp(elapsed / HERON_DEFAULTS.returnDuration, 0, 1);
      if (p >= 1) {
        heronState.mode = 'land';
        heronState.modeStart = now;
        heronState.facing = -1;
      }
      return { visible: true, mode: 'return', texture: heronFlightFrame(elapsed), x: Math.round(lerp(rightExit, base.x, easeInOut(p))), y: Math.round(base.y - 16 - Math.sin(p * Math.PI) * 8), progress: p, scaleX: -1 };
    }
    if (heronState.mode === 'land') {
      const p = clamp(elapsed / HERON_DEFAULTS.landDuration, 0, 1);
      if (p >= 1) {
        heronState.mode = 'idle';
        heronState.modeStart = 0;
        heronState.facing = -1;
      }
      return {
        visible: true,
        mode: 'land',
        texture: p < 0.52 ? 'land_1' : 'land_2',
        x: base.x,
        y: base.y - Math.round((1 - p) * 12),
        progress: p,
        scaleX: -1,
      };
    }
    return { visible: true, mode: 'idle', texture: 'idle', x: base.x, y: base.y, progress: 0, scaleX: heronState.facing };
  }

  function triggerHeron(now) {
    if (heronState.mode !== 'idle') return false;
    heronState.facing = 1;
    heronState.mode = 'takeoff';
    heronState.modeStart = now;
    return true;
  }

  function foregroundDockSurface(state) {
    return FOREGROUND_DOCK_SURFACE[state?.variant] || DEFAULT_FOREGROUND_SURFACE;
  }

  function layerBaseX(name, state, layoutNow) {
    if (name === 'foreground_dock_shore') {
      return layoutNow.compact ? layoutNow.dockPlateX : layoutNow.avatar.x - foregroundDockSurface(state).avatarAnchorX;
    }
    if (
      state.compositionAnchorX !== null
      && state.compositionScreenX !== null
      && layoutNow.nativeW >= state.compositionMinNativeW
    ) {
      const baseline = state.compositionBaselineScreenX || 0;
      return layoutNow.nativeW * state.compositionScreenX
        - state.compositionAnchorX
        - layoutNow.nativeW * baseline / 100;
    }
    return 0;
  }

  function layerBaseY(name, layoutNow) {
    const state = layerStates[name];
    if (name === 'foreground_dock_shore') return layoutNow.dockSurfaceY - foregroundDockSurface(state).y;
    if (state?.dockAnchored) return layoutNow.dockSurfaceY;
    if (state?.waterAnchored) {
      const waterRise = name === 'lake_base' || name === 'lake_shimmer'
        ? normalizeFarWaterRise(waterState.farWaterRiseScreenPx) / 4
        : 0;
      const compactRise = layoutNow.compact ? (name === 'right_land_perch' ? 54 : name === 'far_shore' ? 16 : 0) : 0;
      return layoutNow.waterY - WATER_ANCHOR_Y - waterRise - compactRise;
    }
    return 0;
  }

  function layerPosition(name, state, layoutNow) {
    const yPx = name === 'foreground_dock_shore' ? 0 : state.y;
    const screenY = name === 'foreground_dock_shore' ? 0 : layoutNow.nativeH * state.screenY / 100;
    return {
      x: Math.round(layerBaseX(name, state, layoutNow) + state.x + (layoutNow.nativeW * state.screenX / 100)),
      y: Math.round(yPx + layerBaseY(name, layoutNow) + screenY),
    };
  }

  function traverseCopyCount(state, layoutNow) {
    if (layoutNow.nativeW < 130) return state.traverseMobileCopies;
    if (layoutNow.nativeW >= 480) return state.traverseWideCopies;
    return state.traverseCopies;
  }

  function loopOffset(state, now, width = SOURCE_W) {
    if (!state.speed) return 0;
    const raw = Math.round(now * state.speed);
    return ((raw % width) + width) % width;
  }

  function shimmerStyle() {
    return SHIMMER_STYLE_CONFIG[waterState.shimmerStyle] || SHIMMER_STYLE_CONFIG.steady_sparkle;
  }

  function shimmerPulse(state, now) {
    const speed = Number(waterState.pulseSpeed || state.speed || 0.00008);
    const wave = (Math.sin(now * speed * Math.PI * 2) + 1) / 2;
    const config = shimmerStyle();
    return 0.78 + wave * 0.22 * config.intensity;
  }

  function shimmerOscillation(state, now) {
    const speed = Number(waterState.pulseSpeed || state.speed || 0.00008);
    return {
      x: Math.round(Math.sin(now * speed * Math.PI * 2) * (waterState.shimmerStyle === 'bright_threads' ? 1 : 0.5)),
      y: 0,
    };
  }

  function spritePositionsFor(name, state, texture, layoutNow, now) {
    const offset = layerPosition(name, state, layoutNow);
    const width = Math.max(1, Math.round(texture.width || SOURCE_W));
    if (state.rightViewportAnchored) {
      return [{ x: Math.round(layoutNow.nativeW - width + offset.x), y: offset.y }];
    }
    if (state.traverse) {
      const path = layoutNow.nativeW + width + 96;
      const copies = traverseCopyCount(state, layoutNow);
      return Array.from({ length: copies }, (_, index) => ({
        x: Math.round(
          layoutNow.nativeW
          + 48
          - ((now * state.speed * (0.82 + Math.abs(pseudoRandom(index, 1)) * 0.36) + ((index * 0.61803398875 + Math.abs(pseudoRandom(index, 2)) * 0.18) % 1) * path) % path)
          + offset.x,
        ),
        y: Math.round(offset.y + Math.sin(now / (2600 + index * 370) + index * 1.9) * 2),
      }));
    }
    if (state.fillViewport || state.looping) {
      const lakeOscillation = name === 'lake_shimmer' ? shimmerOscillation(state, now) : { x: 0, y: 0 };
      const drift = state.looping && name !== 'lake_shimmer' ? loopOffset(state, now, width) : 0;
      const start = wrappedTileStart(offset.x + lakeOscillation.x - drift, width);
      const positions = [];
      for (let x = start; x < layoutNow.nativeW + width; x += width) {
        positions.push({ x: Math.round(x), y: Math.round(offset.y + lakeOscillation.y) });
      }
      return positions;
    }
    return [{ x: offset.x, y: offset.y }];
  }

  function shorelineBoundaryAt(sourceX, sampler, profile) {
    const contactY = Math.round(Number(profile?.contactY ?? WATER_ANCHOR_Y));
    if (!sampler?.alpha || !sampler.width || !sampler.height) return contactY;
    const minY = Math.max(0, contactY - 28);
    const maxY = Math.min(sampler.height - 1, contactY - 1);
    let bottom = -1;
    for (let dx = -WATERLINE_NEIGHBOR_RADIUS; dx <= WATERLINE_NEIGHBOR_RADIUS; dx += 1) {
      const x = clamp(Math.round(sourceX + dx), 0, sampler.width - 1);
      for (let y = maxY; y >= minY; y -= 1) {
        if ((sampler.alpha[y * sampler.width + x] || 0) < WATER_OCCLUDER_ALPHA_THRESHOLD) continue;
        bottom = Math.max(bottom, y);
        break;
      }
    }
    return bottom < 0 ? contactY : Math.max(contactY - WATERLINE_LOCAL_VARIATION, bottom);
  }

  function waterlineMaskKey(layoutNow) {
    const treeline = layerStates.back_treeline;
    return JSON.stringify({
      width: layoutNow.nativeW,
      height: layoutNow.nativeH,
      waterY: layoutNow.waterY,
      variant: treeline.variant,
      visible: treeline.visible,
      x: treeline.x,
      y: treeline.y,
      screenX: treeline.screenX,
      screenY: treeline.screenY,
      riseScreenPx: normalizeFarWaterRise(waterState.farWaterRiseScreenPx),
    });
  }

  function updateWaterlineMasks(layoutNow) {
    const renderKey = waterlineMaskKey(layoutNow);
    if (renderKey === waterlineMaskRenderKey) return;
    waterlineMaskRenderKey = renderKey;

    const treeline = layerStates.back_treeline;
    const profile = reflectionProfile('back_treeline', treeline.variant);
    const sampler = reflectionAlphaSamplers[`back_treeline:${treeline.variant}`];
    const textureKey = layerTextureKey('back_treeline', treeline.variant, 0, 0, treeline.frameMs)
      || layerTextureKey('back_treeline', treeline.variants[0], 0, 0, treeline.frameMs);
    const texture = textureKey ? textures[textureKey] : null;
    const positions = texture ? spritePositionsFor('back_treeline', treeline, texture, layoutNow, 0) : [];
    const riseScreenPx = normalizeFarWaterRise(waterState.farWaterRiseScreenPx);
    const riseNativePx = riseScreenPx / 4;
    const fallbackContactY = layoutNow.waterY - (WATER_ANCHOR_Y - Number(profile?.contactY ?? WATER_ANCHOR_Y));
    const boundaries = [];

    for (let x = 0; x < layoutNow.nativeW; x += 1) {
      const position = positions.find((candidate) => (
        x >= candidate.x && x < candidate.x + Math.max(1, Math.round(texture?.width || 0))
      ));
      if (!position || !sampler || sampler.status !== 'ready') {
        boundaries.push(Math.round(fallbackContactY - riseNativePx));
        continue;
      }
      const sourceX = x - position.x;
      const localContact = shorelineBoundaryAt(sourceX, sampler, profile);
      boundaries.push(Math.round(position.y + localContact - riseNativePx));
    }

    const runs = [];
    let startX = 0;
    for (let x = 1; x <= boundaries.length; x += 1) {
      if (x < boundaries.length && boundaries[x] === boundaries[startX]) continue;
      runs.push({ x: startX, y: boundaries[startX], width: x - startX });
      startX = x;
    }
    for (const mask of waterlineMasks) {
      mask.clear();
      for (const run of runs) {
        const y = clamp(run.y, 0, layoutNow.nativeH);
        rect(mask, run.x, y, run.width, layoutNow.nativeH - y, 0xffffff, 1);
      }
    }
    waterlineMaskRuntime = {
      status: sampler?.status === 'ready' ? 'ready' : 'fallback',
      variant: treeline.variant,
      riseScreenPx,
      riseNativePx,
      minY: boundaries.length ? Math.min(...boundaries) : null,
      maxY: boundaries.length ? Math.max(...boundaries) : null,
      runCount: runs.length,
      fallbackContactY,
    };
  }

  function farBirdHopOffset(id, now) {
    const startedAt = farBirdReactions.get(id);
    if (startedAt === undefined) return 0;
    const progress = clamp((now - startedAt) / FAR_BIRD_HOP_DURATION, 0, 1);
    if (progress >= 1) {
      farBirdReactions.delete(id);
      return 0;
    }
    return -Math.round(Math.sin(progress * Math.PI) * FAR_BIRD_HOP_HEIGHT);
  }

  function updateFarBirdSprites(state, layoutNow, now) {
    const frames = LAYER_ASSETS.far_birds?.[state.variant] || [];
    const count = traverseCopyCount(state, layoutNow);
    const offset = layerPosition('far_birds', state, layoutNow);
    const pathWidth = Math.max(36, layoutNow.nativeW + 9);
    const spacing = pathWidth / count;
    const travel = now * Math.abs(Number(state.speed || 0.008));
    const lanes = [28, 38, 23, 33];
    farBirdHitTargets = [];
    for (const record of farBirdSprites) {
      const active = record.birdIndex < count;
      const crop = FAR_BIRD_CROPS[record.slotIndex];
      if (!active || !crop || !frames.length) {
        record.sprite.visible = false;
        continue;
      }
      const frameIndex = (
        Math.floor(now / Math.max(1, state.frameMs))
        + record.birdIndex
        + record.slotIndex * 2
      ) % frames.length;
      const texture = farBirdTextures[`${state.variant}:${frameIndex}:${record.slotIndex}`];
      if (!texture) {
        record.sprite.visible = false;
        continue;
      }
      const id = `bird-${record.birdIndex}`;
      const hopOffset = farBirdHopOffset(id, now);
      const x = Math.round(
        layoutNow.nativeW
        - ((travel + record.birdIndex * spacing) % pathWidth)
        + offset.x,
      );
      const y = Math.round(lanes[record.birdIndex] + offset.y + hopOffset);
      const visible = x + crop.width >= 0
        && x <= layoutNow.nativeW
        && y + crop.height >= 0
        && y <= layoutNow.nativeH;
      record.sprite.texture = texture;
      record.sprite.position.set(x, y);
      record.sprite.visible = visible;
      if (!visible) continue;
      farBirdHitTargets.push({
        id,
        birdIndex: record.birdIndex,
        slotIndex: record.slotIndex,
        frameIndex,
        x,
        y,
        width: crop.width,
        height: crop.height,
        hopOffset,
      });
    }
  }

  function farBirdAtPoint(worldPoint) {
    return farBirdHitTargets.find((target) => (
      worldPoint.x >= target.x - 1
      && worldPoint.x <= target.x + target.width + 1
      && worldPoint.y >= target.y - 1
      && worldPoint.y <= target.y + target.height + 1
    )) || null;
  }

  function triggerFarBird(target, now) {
    if (!target) return false;
    farBirdReactions.set(target.id, now);
    draw(now);
    return true;
  }

  function farBirdRuntime() {
    return {
      hopDurationMs: FAR_BIRD_HOP_DURATION,
      hopHeight: FAR_BIRD_HOP_HEIGHT,
      targets: clone(farBirdHitTargets),
      reactingIds: [...farBirdReactions.keys()],
    };
  }

  function lakePixelAt(layoutNow, x, y, now) {
    const state = layerStates.lake_base;
    const sampler = lakePixelSamplers[state.variant];
    const textureKey = layerTextureKey('lake_base', state.variant, now, 0, state.frameMs)
      || layerTextureKey('lake_base', state.variants[0], now, 0, state.frameMs);
    const texture = textures[textureKey];
    if (!sampler || !texture) {
      return { color: COLORS.lake, alpha: 255, sampled: false, variant: state.variant, source: null };
    }
    const positions = spritePositionsFor('lake_base', state, texture, layoutNow, now);
    const position = positions.find((entry) => (
      x >= entry.x
      && x < entry.x + sampler.width
      && y >= entry.y
      && y < entry.y + sampler.height
    ));
    if (!position) {
      return { color: COLORS.lake, alpha: 255, sampled: false, variant: state.variant, source: null };
    }
    const sourceX = clamp(Math.floor(x - position.x), 0, sampler.width - 1);
    const sourceY = clamp(Math.floor(y - position.y), 0, sampler.height - 1);
    const read = (sampleX, sampleY) => {
      const index = (sampleY * sampler.width + sampleX) * 4;
      return {
        color: rgbColor(sampler.data[index], sampler.data[index + 1], sampler.data[index + 2]),
        alpha: sampler.data[index + 3],
        source: { x: sampleX, y: sampleY },
      };
    };
    let sample = read(sourceX, sourceY);
    if (sample.alpha === 0) {
      for (let radius = 1; radius <= 4 && sample.alpha === 0; radius += 1) {
        const candidates = [
          [sourceX, clamp(sourceY + radius, 0, sampler.height - 1)],
          [sourceX, clamp(sourceY - radius, 0, sampler.height - 1)],
          [clamp(sourceX + radius, 0, sampler.width - 1), sourceY],
          [clamp(sourceX - radius, 0, sampler.width - 1), sourceY],
        ];
        for (const [candidateX, candidateY] of candidates) {
          const candidate = read(candidateX, candidateY);
          if (candidate.alpha > 0) {
            sample = candidate;
            break;
          }
        }
      }
    }
    return {
      ...sample,
      sampled: sample.alpha > 0,
      variant: state.variant,
    };
  }

  function drawLocalAnimalWater({
    back,
    front,
    accents = front,
    layoutNow,
    now,
    kind,
    frame,
    direction,
    opacity,
    contactX,
    contactY,
    bodyLeft,
    bodyRight,
    submergePx,
    wakeLength,
    ripplePhase,
    contactProfile,
  }) {
    const palette = new Set();
    const phase = frame + Math.round(ripplePhase * 10);
    const occlusionHeight = Math.max(0, Math.round(submergePx));
    const surfaceY = Math.round(contactY - occlusionHeight);
    for (let y = surfaceY; y < Math.round(contactY); y += 1) {
      for (let x = Math.round(bodyLeft); x < Math.round(bodyRight); x += 1) {
        const sample = lakePixelAt(layoutNow, x, y, now);
        pixel(front, x, y, sample.color, sample.alpha / 255);
        palette.add(colorString(sample.color));
      }
    }
    const wakePoints = [];
    for (let index = 0; index < wakeLength; index += 1) {
      if ((index + phase) % 3 === 1) continue;
      const x = Math.round(contactX - direction * (4 + index));
      const y = surfaceY + (kind !== 'moose' && (index + frame) % 5 === 0 ? 1 : 0);
      const sample = lakePixelAt(layoutNow, x, y, now);
      const accentAmount = contactProfile.includes('rings') ? 0.14 : 0.09;
      const color = mixColor(sample.color, COLORS.sparklePeach, accentAmount);
      pixel(kind === 'moose' ? accents : back, x, y, color, 0.46 * opacity);
      palette.add(colorString(sample.color));
      wakePoints.push({ x, y, color: colorString(color) });
    }

    const rippleReach = contactProfile.includes('rings') ? 4 : (contactProfile.includes('wake') ? 3 : 2);
    const rippleShift = Math.round(Math.sin(now * 0.00065 + ripplePhase * Math.PI * 2));
    const ripplePoints = [];
    const candidates = [
      Math.round(bodyLeft - rippleReach + rippleShift),
      Math.round(bodyLeft - 1),
      Math.round(bodyRight),
      Math.round(bodyRight + rippleReach + rippleShift),
    ];
    candidates.forEach((x, index) => {
      if ((index + phase) % 3 === 1) return;
      const sample = lakePixelAt(layoutNow, x, surfaceY, now);
      const color = mixColor(sample.color, COLORS.sparklePeach, kind === 'moose' ? 0.12 : 0.08);
      pixel(accents, x, surfaceY, color, 0.42 * opacity);
      palette.add(colorString(sample.color));
      ripplePoints.push({ x, y: surfaceY, color: colorString(color) });
    });

    const centerSample = lakePixelAt(layoutNow, contactX, surfaceY, now);
    palette.add(colorString(centerSample.color));
    return {
      mode: 'runtime-local-lake-sampling',
      sampledFromLake: centerSample.sampled,
      lakeVariant: centerSample.variant,
      sourcePixel: centerSample.source,
      surfaceY,
      sampledPalette: [...palette],
      wakeStyle: 'local-broken-native-pixels',
      wakePoints,
      ripplePoints,
      occlusionBounds: {
        x: Math.round(bodyLeft),
        y: Math.round(contactY - occlusionHeight),
        width: Math.max(1, Math.round(bodyRight - bodyLeft)),
        height: occlusionHeight,
      },
    };
  }

  function reflectionMirrorOffset(layoutNow) {
    return {
      x: Math.round(Number(reflectionState.x || 0) + layoutNow.nativeW * Number(reflectionState.screenX || 0) / 100),
      y: Math.round(Number(reflectionState.y || 0) + layoutNow.nativeH * Number(reflectionState.screenY || 0) / 100),
    };
  }

  function reflectionBlendMode() {
    return REFLECTION_BLEND_MODES.includes(reflectionState.blendMode) ? reflectionState.blendMode : 'normal';
  }

  function reflectionSamplerRuntimeStatus() {
    return Object.fromEntries(REFLECTION_SOURCE_OPTIONS.map((sourceLayer) => {
      const sourceState = layerStates[sourceLayer];
      const key = `${sourceLayer}:${sourceState?.variant || ''}`;
      const sampler = reflectionAlphaSamplers[key];
      return [sourceLayer, {
        variant: sourceState?.variant || null,
        status: sampler?.status || 'missing',
        error: sampler?.error || null,
      }];
    }));
  }

  function clearReflectionMirrorSprites() {
    for (const sprites of Object.values(reflectionMirrorSprites)) {
      for (const sprite of sprites) sprite.visible = false;
    }
    for (const shadow of Object.values(reflectionMirrorShadows)) shadow.clear();
  }

  function reflectionProfile(sourceLayer, variant) {
    return REFLECTION_VARIANT_PROFILES[sourceLayer]?.[variant] || null;
  }

  function reflectionTextureKey(texture, profile, targetHeight) {
    if (!reflectionTextureIds.has(texture)) {
      reflectionTextureId += 1;
      reflectionTextureIds.set(texture, reflectionTextureId);
    }
    const [cropX, cropY, cropW] = profile.crop;
    return `${reflectionTextureIds.get(texture)}:${cropX}:${cropY}:${cropW}:${profile.contactY}:${targetHeight}`;
  }

  function reflectionTextureFor(texture, sampler, profile, targetHeight) {
    if (!sampler || sampler.status !== 'ready') return null;
    const [cropX, cropY, cropW] = profile.crop;
    const width = Math.max(1, Math.min(sampler.width - cropX, cropW));
    const sourceHeight = Math.max(1, Math.min(sampler.height - cropY, profile.contactY - cropY));
    const height = Math.max(1, Math.round(targetHeight));
    const key = reflectionTextureKey(texture, profile, height);
    if (reflectionTextureCache.has(key)) return reflectionTextureCache.get(key);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    const image = context.createImageData(width, height);
    const alpha = new Uint8Array(width * height);
    for (let y = 0; y < height; y += 1) {
      const sourceOffset = Math.min(
        sourceHeight - 1,
        Math.floor(y * sourceHeight / height),
      );
      const sourceY = cropY + sourceHeight - 1 - sourceOffset;
      for (let x = 0; x < width; x += 1) {
        const sourceIndex = (sourceY * sampler.width + cropX + x) * 4;
        const targetIndex = (y * width + x) * 4;
        image.data[targetIndex] = sampler.rgba[sourceIndex];
        image.data[targetIndex + 1] = sampler.rgba[sourceIndex + 1];
        image.data[targetIndex + 2] = sampler.rgba[sourceIndex + 2];
        image.data[targetIndex + 3] = sampler.rgba[sourceIndex + 3];
        alpha[y * width + x] = sampler.rgba[sourceIndex + 3];
      }
    }
    context.putImageData(image, 0, 0);
    const reflected = Texture.from(canvas);
    if (reflected?.source) reflected.source.scaleMode = 'nearest';
    const raster = {
      texture: reflected,
      width,
      height,
      rgba: new Uint8ClampedArray(image.data),
      alpha,
    };
    if (reflectionTextureCache.size >= 48) {
      const oldestKey = reflectionTextureCache.keys().next().value;
      const oldest = reflectionTextureCache.get(oldestKey);
      reflectionTextureCache.delete(oldestKey);
      oldest?.texture?.destroy?.(true);
    }
    reflectionTextureCache.set(key, raster);
    return raster;
  }

  function reflectionMirrorEntries(layoutNow, now, includeDisabled = false) {
    const offset = reflectionMirrorOffset(layoutNow);
    const scaleY = clamp(Math.abs(Number(reflectionState.scaleY || 0.42)), 0.05, 1.4);
    return REFLECTION_SOURCE_OPTIONS.map((sourceLayer) => {
      const drawEnabled = Boolean(reflectionState.sources?.[sourceLayer]);
      if (!drawEnabled && !includeDisabled) return null;
      const sourceState = layerStates[sourceLayer];
      if (!sourceState?.visible) return null;
      const profile = reflectionProfile(sourceLayer, sourceState.variant);
      if (!profile) return null;
      const textureKey = layerTextureKey(sourceLayer, sourceState.variant, now, 0, sourceState.frameMs)
        || layerTextureKey(sourceLayer, sourceState.variants?.[0], now, 0, sourceState.frameMs);
      const texture = textureKey ? textures[textureKey] : null;
      if (!texture) return null;
      const tuning = reflectionState.sourceTuning?.[sourceLayer] || {};
      const sampler = reflectionAlphaSamplers[`${sourceLayer}:${sourceState.variant}`] || null;
      const cropHeight = Math.max(1, Number(profile.contactY) - Number(profile.crop[1]));
      const authoredScaleY = Number(profile.reflectionDepth) > 0
        ? Number(profile.reflectionDepth) / cropHeight
        : REFLECTION_DEFAULTS.scaleY;
      const displayScaleY = clamp(
        authoredScaleY * scaleY / Math.max(0.05, REFLECTION_DEFAULTS.scaleY),
        0.05,
        2,
      );
      const sourcePositions = spritePositionsFor(sourceLayer, sourceState, texture, layoutNow, now);
      const reflectionStartY = sourcePositions.length
        ? Math.min(...sourcePositions.map((position) => Math.round(
          position.y
          + profile.contactY
          + offset.y
          + Number(tuning.y || 0),
        )))
        : layoutNow.nativeH;
      const authoredTargetHeight = Math.max(1, Math.round(cropHeight * displayScaleY));
      const tunedTargetHeight = Math.max(
        1,
        Math.round(authoredTargetHeight * clamp(Number(tuning.height ?? 100), 10, 300) / 100),
      );
      const targetHeight = profile.fitVisibleDepth
        ? Math.max(1, Math.min(tunedTargetHeight, layoutNow.nativeH - reflectionStartY))
        : tunedTargetHeight;
      const reflectedRaster = reflectionTextureFor(texture, sampler, profile, targetHeight);
      if (!reflectedRaster) return null;
      const positions = sourcePositions.map((position) => {
        const x = Math.round(
          position.x
          + profile.crop[0]
          + offset.x
          + Number(tuning.x || 0),
        );
        const y = Math.round(
          position.y
          + profile.contactY
          + offset.y
          + Number(tuning.y || 0),
        );
        return {
          x,
          y,
          width: reflectedRaster.width,
          height: reflectedRaster.height,
        };
      });
      return {
        sourceLayer,
        sourceVariant: sourceState.variant,
        drawEnabled,
        profile: clone(profile),
        sourceTuning: clone(tuning),
        texture: reflectedRaster.texture,
        rasterRgba: reflectedRaster.rgba,
        rasterAlpha: reflectedRaster.alpha,
        samplerStatus: sampler?.status || 'missing',
        sourceTextureSize: { width: Math.round(texture.width || 0), height: Math.round(texture.height || 0) },
        textureSize: { width: reflectedRaster.width, height: reflectedRaster.height },
        displayScale: { x: 1, y: 1 },
        opacity: clamp(
          Number(reflectionState.opacity || 0)
          * Number(profile.opacity ?? 1)
          * Number(tuning.opacity ?? 1),
          0,
          1,
        ),
        positions,
      };
    }).filter(Boolean);
  }

  function mergeIntervals(intervals) {
    if (!intervals.length) return [];
    const ordered = [...intervals].sort((first, second) => first.start - second.start);
    const merged = [{ ...ordered[0] }];
    for (let index = 1; index < ordered.length; index += 1) {
      const current = ordered[index];
      const previous = merged[merged.length - 1];
      if (current.start <= previous.end) previous.end = Math.max(previous.end, current.end);
      else merged.push({ ...current });
    }
    return merged;
  }

  function subtractIntervals(intervals, blockers) {
    if (!blockers.length) return intervals;
    let remaining = intervals.map((interval) => ({ ...interval }));
    for (const blocker of blockers) {
      const next = [];
      for (const interval of remaining) {
        if (blocker.end <= interval.start || blocker.start >= interval.end) {
          next.push(interval);
          continue;
        }
        if (blocker.start > interval.start) {
          next.push({ ...interval, end: blocker.start });
        }
        if (blocker.end < interval.end) {
          next.push({ ...interval, start: blocker.end });
        }
      }
      remaining = next;
      if (!remaining.length) break;
    }
    return remaining;
  }

  function intervalOverlapPixels(first, second) {
    let overlap = 0;
    for (const a of first) {
      for (const b of second) {
        overlap += Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
      }
    }
    return overlap;
  }

  function reflectionSourceAlpha(entry, position, x, y) {
    const localX = Math.floor(x - position.x);
    const localY = Math.floor(y - position.y);
    if (localX < 0 || localY < 0 || localX >= position.width || localY >= position.height) return 0;
    return entry.rasterAlpha?.[localY * entry.textureSize.width + localX] || 0;
  }

  function reflectionFadeAlpha(position, y) {
    const breakup = clamp(Number(reflectionState.breakup || 0), 0, 1);
    const requestedFadeHeight = Math.max(8, Math.round(Number(reflectionState.fadeHeight || 0)));
    const endY = position.y + Math.min(position.height, requestedFadeHeight);
    const p = (y - position.y) / Math.max(1, endY - position.y);
    const rowSeed = Math.abs(pseudoRandom(y + position.x, 301));
    const breakupFactor = 1 - breakup * (0.04 + rowSeed * 0.12);
    return clamp((1 - p * p * 0.96) * breakupFactor, 0, 1);
  }

  function reflectionFootprintKey(entry, layoutNow) {
    return JSON.stringify({
      sourceLayer: entry.sourceLayer,
      sourceVariant: entry.sourceVariant,
      positions: entry.positions,
      crop: entry.profile.crop,
      contactY: entry.profile.contactY,
      texture: entry.textureSize,
      native: [layoutNow.nativeW, layoutNow.nativeH],
      fadeHeight: Math.round(Number(reflectionState.fadeHeight || 0)),
      breakup: Number(reflectionState.breakup || 0),
    });
  }

  function reflectionFootprintRows(entry, layoutNow) {
    const key = reflectionFootprintKey(entry, layoutNow);
    if (reflectionFootprintCache.has(key)) return reflectionFootprintCache.get(key);
    const rows = new Map();
    const requestedFadeHeight = Math.max(8, Math.round(Number(reflectionState.fadeHeight || 0)));
    for (const position of entry.positions) {
      const startY = clamp(position.y, 0, layoutNow.nativeH);
      const endY = clamp(
        startY + Math.min(position.height, requestedFadeHeight),
        startY,
        layoutNow.nativeH,
      );
      const startX = clamp(position.x, 0, layoutNow.nativeW);
      const endX = clamp(position.x + position.width, startX, layoutNow.nativeW);
      for (let y = startY; y < endY; y += 1) {
        const alpha = reflectionFadeAlpha(position, y);
        if (alpha <= 0.006) continue;
        const intervals = rows.get(y) || [];
        let runStart = null;
        for (let x = startX; x < endX; x += 1) {
          const occupied = reflectionSourceAlpha(entry, position, x, y) > 0;
          if (occupied && runStart === null) runStart = x;
          if ((!occupied || x === endX - 1) && runStart !== null) {
            const runEnd = occupied && x === endX - 1 ? x + 1 : x;
            intervals.push({ start: runStart, end: runEnd, alpha });
            runStart = null;
          }
        }
        if (intervals.length) rows.set(y, intervals);
      }
    }
    const footprint = {
      key,
      rows,
      pixelCount: [...rows.values()].reduce(
        (sum, intervals) => sum + intervals.reduce((rowSum, interval) => rowSum + interval.end - interval.start, 0),
        0,
      ),
    };
    if (reflectionFootprintCache.size >= 96) {
      const oldestKey = reflectionFootprintCache.keys().next().value;
      reflectionFootprintCache.delete(oldestKey);
    }
    reflectionFootprintCache.set(key, footprint);
    return footprint;
  }

  function contactShadowIntervals(entry, position, row, layoutNow) {
    const profile = entry.profile.contactShadow;
    if (!profile) return [];
    const intervals = [];
    const bandDepth = Math.max(1, Math.round(Number(profile.bandDepth ?? profile.depth ?? 1)));
    if (row < bandDepth) {
      const inset = Math.floor(row / 3);
      const start = clamp(
        Math.round(position.x + Number(profile.x || 0) + inset),
        0,
        layoutNow.nativeW,
      );
      const width = Math.max(1, Math.round(Number(profile.width || 1) - inset * 2));
      const end = clamp(start + width, start, layoutNow.nativeW);
      if (end > start) {
        const gap = row % 3 === 2 ? 2 + Math.floor(Math.abs(pseudoRandom(row + start, 719)) * 3) : 0;
        if (!gap) intervals.push({ start, end, alpha: 1 });
        else {
          const leftEnd = Math.min(end, start + Math.max(1, Math.floor(width * 0.62) - gap));
          const rightStart = Math.min(end, leftEnd + gap);
          if (leftEnd > start) intervals.push({ start, end: leftEnd, alpha: 1 });
          if (end > rightStart) intervals.push({ start: rightStart, end, alpha: 0.82 });
        }
      }
    }
    const supportWidth = Math.max(1, Math.round(Number(profile.supportWidth || 2)));
    for (const supportX of profile.supports || []) {
      const sway = row < 4 ? 0 : Math.round(pseudoRandom(row + supportX, 811));
      const start = clamp(Math.round(position.x + Number(supportX) + sway), 0, layoutNow.nativeW);
      const end = clamp(start + Math.max(1, supportWidth - Math.floor(row / 8)), start, layoutNow.nativeW);
      if (end > start) intervals.push({ start, end, alpha: row % 4 === 3 ? 0.72 : 0.9 });
    }
    return intervals;
  }

  function contactShadowRows(entry, layoutNow) {
    const rows = new Map();
    const profile = entry.profile.contactShadow;
    if (!profile || !entry.drawEnabled) return rows;
    for (const position of entry.positions) {
      const depth = Math.max(1, Math.round(Number(profile.depth || 1)));
      for (let row = 0; row < depth; row += 1) {
        const y = Math.round(position.y + row);
        if (y < 0 || y >= layoutNow.nativeH) continue;
        const fade = 1 - row / depth;
        const shadowAlpha = clamp(
          entry.opacity
          * Number(profile.opacity ?? 1)
          * Number(profile.gain ?? 1)
          * fade
          * 0.7,
          0,
          1,
        );
        const intervals = contactShadowIntervals(entry, position, row, layoutNow).map((interval) => ({
          ...interval,
          alpha: shadowAlpha * Number(interval.alpha ?? 1),
        }));
        if (intervals.length) rows.set(y, mergeIntervals([...(rows.get(y) || []), ...intervals]));
      }
    }
    return rows;
  }

  function reflectionOcclusionFootprint(entry, layoutNow) {
    const reflection = reflectionFootprintRows(entry, layoutNow);
    const shadow = contactShadowRows(entry, layoutNow);
    const rows = new Map();
    for (const y of new Set([...reflection.rows.keys(), ...shadow.keys()])) {
      const intervals = mergeIntervals([
        ...(reflection.rows.get(y) || []),
        ...(shadow.get(y) || []),
      ]);
      if (intervals.length) rows.set(y, intervals);
    }
    return {
      rows,
      pixelCount: [...rows.values()].reduce(
        (sum, intervals) => sum + intervals.reduce((rowSum, interval) => rowSum + interval.end - interval.start, 0),
        0,
      ),
    };
  }

  function allowedReflectionRows(entry, entries, footprints, layoutNow, sourceRows = null) {
    const own = sourceRows || reflectionFootprintRows(entry, layoutNow).rows;
    const ownRows = new Map();
    const sourceDepth = REFLECTION_DEPTH_ORDER.indexOf(entry.sourceLayer);
    const nearerEntries = reflectionState.solo
      ? []
      : entries.filter((candidate) => REFLECTION_DEPTH_ORDER.indexOf(candidate.sourceLayer) > sourceDepth);
    for (const [y, sourceIntervals] of own.entries()) {
      const blockers = mergeIntervals(nearerEntries.flatMap((candidate) => (
        (footprints[candidate.sourceLayer]?.rows.get(y) || []).map(({ start, end }) => ({ start, end }))
      )));
      const allowed = subtractIntervals(sourceIntervals, blockers);
      if (allowed.length) ownRows.set(y, allowed);
    }
    return ownRows;
  }

  function footprintBounds(footprint) {
    const ys = [...footprint.rows.keys()];
    if (!ys.length) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    for (const intervals of footprint.rows.values()) {
      for (const interval of intervals) {
        minX = Math.min(minX, interval.start);
        maxX = Math.max(maxX, interval.end);
      }
    }
    return { x: minX, y: Math.min(...ys), width: maxX - minX, height: Math.max(...ys) - Math.min(...ys) + 1 };
  }

  function reflectionMaskKey(layoutNow, entries) {
    return JSON.stringify({
      visible: reflectionState.visible,
      solo: reflectionState.solo,
      fadeHeight: reflectionState.fadeHeight,
      breakup: reflectionState.breakup,
      native: [layoutNow.nativeW, layoutNow.nativeH],
      entries: entries.map((entry) => ({
        sourceLayer: entry.sourceLayer,
        sourceVariant: entry.sourceVariant,
        drawEnabled: entry.drawEnabled,
        positions: entry.positions,
        scale: entry.displayScale,
        opacity: entry.opacity,
        textureSize: entry.textureSize,
      })),
    });
  }

  function reflectionRgbaAt(entry, x, y) {
    for (const position of entry.positions) {
      const localX = x - position.x;
      const localY = y - position.y;
      if (
        localX < 0
        || localY < 0
        || localX >= position.width
        || localY >= position.height
      ) continue;
      const index = (localY * entry.textureSize.width + localX) * 4;
      if (!entry.rasterRgba?.[index + 3]) continue;
      return [
        entry.rasterRgba[index],
        entry.rasterRgba[index + 1],
        entry.rasterRgba[index + 2],
        entry.rasterRgba[index + 3],
      ];
    }
    return null;
  }

  function blendReflectionPixel(data, index, red, green, blue, alpha) {
    const sourceAlpha = clamp(alpha, 0, 1);
    if (sourceAlpha <= 0) return;
    const targetAlpha = data[index + 3] / 255;
    const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);
    if (outputAlpha <= 0) return;
    data[index] = Math.round((red * sourceAlpha + data[index] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
    data[index + 1] = Math.round((green * sourceAlpha + data[index + 1] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
    data[index + 2] = Math.round((blue * sourceAlpha + data[index + 2] * targetAlpha * (1 - sourceAlpha)) / outputAlpha);
    data[index + 3] = Math.round(outputAlpha * 255);
  }

  function drawReflectionRowsToImage(image, layoutNow, entry, rows) {
    for (const [y, intervals] of rows.entries()) {
      for (const interval of intervals) {
        for (let x = interval.start; x < interval.end; x += 1) {
          const source = reflectionRgbaAt(entry, x, y);
          if (!source) continue;
          const index = (y * layoutNow.nativeW + x) * 4;
          blendReflectionPixel(
            image.data,
            index,
            source[0],
            source[1],
            source[2],
            source[3] / 255 * Number(interval.alpha ?? 1) * entry.opacity,
          );
        }
      }
    }
  }

  function drawShadowRowsToImage(image, layoutNow, rows) {
    for (const [y, intervals] of rows.entries()) {
      for (const interval of intervals) {
        for (let x = interval.start; x < interval.end; x += 1) {
          const index = (y * layoutNow.nativeW + x) * 4;
          blendReflectionPixel(image.data, index, 255, 255, 255, Number(interval.alpha ?? 1));
        }
      }
    }
  }

  function drawReflectionMirrorComposite(layoutNow, entries) {
    const renderKey = reflectionMaskKey(layoutNow, entries);
    if (renderKey === reflectionMaskRenderKey) return;
    for (const mask of Object.values(reflectionMirrorMasks)) mask.clear();
    reflectionMaskRenderKey = renderKey;
    if (!reflectionState.visible) return;
    const footprints = Object.fromEntries(entries.map((entry) => [
      entry.sourceLayer,
      reflectionOcclusionFootprint(entry, layoutNow),
    ]));
    const allowedRows = {};
    const canvas = document.createElement('canvas');
    canvas.width = layoutNow.nativeW;
    canvas.height = layoutNow.nativeH;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    const image = context.createImageData(layoutNow.nativeW, layoutNow.nativeH);
    for (const entry of entries) {
      if (!entry.drawEnabled) continue;
      const shadowRows = allowedReflectionRows(
        entry,
        entries,
        footprints,
        layoutNow,
        contactShadowRows(entry, layoutNow),
      );
      const rows = allowedReflectionRows(
        entry,
        entries,
        footprints,
        layoutNow,
        reflectionFootprintRows(entry, layoutNow).rows,
      );
      allowedRows[entry.sourceLayer] = new Map(
        [...new Set([...rows.keys(), ...shadowRows.keys()])].map((y) => [
          y,
          mergeIntervals([...(rows.get(y) || []), ...(shadowRows.get(y) || [])]),
        ]),
      );
      drawShadowRowsToImage(image, layoutNow, shadowRows);
      drawReflectionRowsToImage(image, layoutNow, entry, rows);
    }
    context.putImageData(image, 0, 0);
    const nextTexture = Texture.from(canvas);
    nextTexture.source.scaleMode = 'nearest';
    const previousTexture = reflectionCompositeTexture;
    reflectionCompositeTexture = nextTexture;
    reflectionCompositeSprite.texture = nextTexture;
    reflectionCompositeSprite.position.set(0, 0);
    reflectionCompositeSprite.scale.set(1, 1);
    reflectionCompositeSprite.alpha = 1;
    reflectionCompositeSprite.visible = true;
    previousTexture?.destroy?.(true);
    let backFarOverlapPixels = 0;
    const backRows = allowedRows.back_treeline || new Map();
    const farFootprint = footprints.far_shore;
    if (farFootprint) {
      for (const [y, intervals] of backRows.entries()) {
        backFarOverlapPixels += intervalOverlapPixels(
          intervals,
          farFootprint.rows.get(y) || [],
        );
      }
    }
    reflectionCompositionRuntime = {
      compositionOrder: [...REFLECTION_DEPTH_ORDER],
      occluders: Object.fromEntries(REFLECTION_DEPTH_ORDER.map((sourceLayer, index) => [
        sourceLayer,
        reflectionState.solo ? [] : REFLECTION_DEPTH_ORDER.slice(index + 1),
      ])),
      footprints: Object.fromEntries(entries.map((entry) => [
        entry.sourceLayer,
        {
          bounds: footprintBounds(footprints[entry.sourceLayer]),
          pixelCount: footprints[entry.sourceLayer]?.pixelCount || 0,
          drawEnabled: entry.drawEnabled,
        },
      ])),
      backFarOverlapPixels,
      samplerStatus: reflectionSamplerRuntimeStatus(),
      degraded: false,
    };
  }

  function drawReflectionMirror(_state, layoutNow, now) {
    clearReflectionMirrorSprites();
    reflectionCompositeSprite.visible = false;
    reflectionMirrorMask.clear();
    if (!reflectionState.visible) {
      reflectionMaskRenderKey = '';
      for (const mask of Object.values(reflectionMirrorMasks)) mask.clear();
      return;
    }
    const samplerStatus = reflectionSamplerRuntimeStatus();
    const missingSampler = Object.entries(samplerStatus).find(([sourceLayer, sampler]) => (
      layerStates[sourceLayer]?.visible && sampler.status !== 'ready'
    ));
    if (missingSampler) {
      reflectionMaskRenderKey = '';
      for (const mask of Object.values(reflectionMirrorMasks)) mask.clear();
      reflectionCompositionRuntime = {
        compositionOrder: [...REFLECTION_DEPTH_ORDER],
        occluders: {},
        footprints: {},
        backFarOverlapPixels: 0,
        samplerStatus,
        degraded: true,
      };
      return;
    }
    rect(reflectionMirrorMask, 0, 0, layoutNow.nativeW, layoutNow.nativeH, 0xffffff, 1);
    const tint = parseHexColor(reflectionState.tint);
    const blendMode = reflectionBlendMode();
    const entries = reflectionMirrorEntries(layoutNow, now, true);
    drawReflectionMirrorComposite(layoutNow, entries);
    reflectionCompositeSprite.tint = tint;
    reflectionCompositeSprite.blendMode = blendMode;
    reflectionCompositeSprite.visible = true;
  }

  function setLayerDisplay() {
    const reflectionSoloLayers = new Set(['sky_base', 'lake_base', 'reflection_mirror', 'lake_shimmer', 'debug_overlay']);
    for (const layer of LAYERS) {
      const state = layerStates[layer.name];
      const container = layerContainers[layer.name];
      const soloVisible = !reflectionState.solo || reflectionSoloLayers.has(layer.name);
      container.visible = soloVisible && (layer.name === 'reflection_mirror' ? reflectionState.visible : state.visible);
      container.alpha = layer.name === 'lake_shimmer'
        ? 1
        : (layer.name === 'reflection_mirror' ? 1 : state.opacity);
      if (layer.name === 'cloud_drift') {
        container.blendMode = state.blendMode === 'lighten' ? 'max' : state.blendMode;
      }
      container.position.set(0, 0);
    }
  }

  function setSprites(layoutNow, now) {
    updateDogEasterEgg(now);
    const avatarPoint = entityPoint('avatar', layoutNow);
    const dogPoint = entityPoint('dog', layoutNow);

    avatar.visible = entityStates.avatar.visible;
    avatar.alpha = entityStates.avatar.opacity;
    avatar.position.set(Math.round(avatarPoint.x), Math.round(avatarPoint.y));
    avatar.scale.set(entityStates.avatar.scale);

    const dogReacting = dogState.mode === 'idle' && (now < dogState.wagUntil || now < dogState.barkUntil);
    let dogVariant = dogReacting ? 'wag' : (entityStates.dog.variant || 'idle');
    const walkFrame = Math.floor(Math.max(0, now - dogState.modeStart) / DOG_WALK_FRAME_MS) % DOG_WALK_FRAME_COUNT;
    if (dogState.mode === 'walkOff') dogVariant = `walk_left_f${walkFrame}`;
    if (dogState.mode === 'return') dogVariant = `walk_right_f${walkFrame}`;
    dog.texture = textures[`dog:${dogVariant}`] || textures['dog:idle'];
    dog.visible = entityStates.dog.visible && dogState.mode !== 'away';
    dog.alpha = entityStates.dog.opacity;
    const dogHop = now < dogState.barkUntil ? -2 : (now < dogState.wagUntil ? Math.sin(now / 70) > 0 ? -1 : 0 : 0);
    const dogMove = dogOffset(now, layoutNow);
    dog.position.set(Math.round(dogPoint.x + dogMove.x), Math.round(dogPoint.y + dogHop + dogMove.y));
    dog.scale.set(entityStates.dog.scale);

    const fishTexture = fishTextureFor(textures, activeCatchVariant(), currentFishingPhase(now));
    fish.texture = fishTexture;
    fish.visible = entityStates.fish.visible && fishing.active;
    fish.alpha = entityStates.fish.opacity;
    fish.scale.set(entityStates.fish.scale);
  }

  function scheduleNextWildlife(kind, now) {
    if (kind === 'moose') {
      wildlife.nextMooseAt = now + 60000 + Math.random() * 60000;
      return;
    }
    wildlife.nextSwimmerAt = now + 60000 + Math.random() * 60000;
  }

  function wildlifePathMargin(kind) {
    return kind === 'moose' ? 26 : 18;
  }

  function wildlifePathLength(kind, layoutNow) {
    return layoutNow.nativeW + wildlifePathMargin(kind) * 2;
  }

  function wildlifeDurationFor(kind, layoutNow) {
    const spec = WILDLIFE_SPECS[kind];
    if (!spec) return 0;
    const tuning = wildlifeTuningState[kind] || {};
    const speedPxPerSec = Math.max(0.5, Number(tuning.speedPxPerSec || spec.speedPxPerSec));
    return Math.round(wildlifePathLength(kind, layoutNow) / speedPxPerSec * 1000);
  }

  function startWildlifeCameo(kind, now = performance.now(), progress = 0, markSeen = false) {
    if (!WILDLIFE_SPECS[kind]) return false;
    const layoutNow = currentLayout();
    wildlife.active = true;
    wildlife.kind = kind;
    wildlife.duration = wildlifeDurationFor(kind, layoutNow);
    wildlife.start = now - wildlife.duration * clamp(Number(progress), 0, 0.95);
    wildlife.seed = Math.random();
    if (markSeen) {
      if (kind === 'moose') wildlife.mooseSeen = true;
      else wildlife.swimmerSeen = true;
    }
    return true;
  }

  function clearWildlifeSprites() {
    for (const sprite of Object.values(wildlifeSprites)) sprite.visible = false;
  }

  function wildlifeBlocked() {
    return fishing.active;
  }

  function updateWildlifeState(now) {
    if (wildlife.force !== 'none') {
      if (!wildlife.active || wildlife.kind !== wildlife.force || now - wildlife.start > wildlife.duration) {
        startWildlifeCameo(wildlife.force, now, 0.36);
      }
      return;
    }
    if (wildlife.active && now - wildlife.start > wildlife.duration) {
      const endedKind = wildlife.kind;
      wildlife.active = false;
      wildlife.kind = null;
      scheduleNextWildlife(endedKind, now);
    }
    if (wildlife.active || wildlifeBlocked()) return;
    if (now >= wildlife.nextMooseAt) {
      startWildlifeCameo('moose', now, 0, true);
      return;
    }
    if (now >= wildlife.nextSwimmerAt) {
      startWildlifeCameo('mink', now, 0, true);
    }
  }

  function wildlifeRenderState(layoutNow, now) {
    if (!wildlife.active || !wildlife.kind) return null;
    const spec = WILDLIFE_SPECS[wildlife.kind];
    const tuning = wildlifeTuningState[wildlife.kind] || {};
    const p = clamp((now - wildlife.start) / wildlife.duration, 0, 1);
    const state = layerStates.wildlife_cameos;
    const offset = layerPosition('wildlife_cameos', state, layoutNow);
    const margin = wildlifePathMargin(wildlife.kind);
    const left = -margin;
    const right = layoutNow.nativeW + margin;
    const x = spec.direction > 0 ? lerp(left, right, p) : lerp(right, left, p);
    const bob = 0;
    const y = wildlife.kind === 'moose'
      ? Math.round(layoutNow.waterY + 19 + bob + offset.y + Number(tuning.yOffset || 0))
      : Math.round(clamp(
        layoutNow.waterY + layoutNow.nativeH * spec.yBand + bob,
        layoutNow.waterY + 9,
        layoutNow.waterY + 15,
      ) + offset.y + Number(tuning.yOffset || 0));
    const frameMs = Math.max(160, Number(tuning.frameMs || spec.frameMs));
    const frame = pingPongFrameIndex(now - wildlife.start, frameMs, spec.frameKeys.length);
    const frameKey = spec.frameKeys[frame] || spec.frameKeys[0];
    return {
      active: true,
      kind: wildlife.kind,
      label: spec.label,
      phase: p >= 1 ? 'done' : (p > 0.78 ? 'exit' : (p > 0.58 ? 'pause' : 'crossing')),
      progress: Number(p.toFixed(3)),
      frame,
      frameKey,
      frameMs,
      x: Math.round(x + offset.x),
      y,
      alpha: clamp(Number(tuning.opacity ?? spec.alpha), 0, 1),
      direction: spec.direction,
      speedPxPerSec: Number(tuning.speedPxPerSec || spec.speedPxPerSec),
      pathPx: wildlifePathLength(wildlife.kind, layoutNow),
    };
  }

  function drawWildlifeCameos(g, state, layoutNow, now) {
    updateWildlifeState(now);
    clearWildlifeSprites();
    wildlifeContactFront.clear();
    wildlifeContactAccents.clear();
    g.blendMode = 'normal';
    wildlifeContactFront.blendMode = 'normal';
    wildlifeContactAccents.blendMode = 'normal';
    wildlifeContactRuntime = null;
    if (animalLabState.visible && (animalLabState.family === 'moose' || animalLabState.family === 'mink')) return;
    const render = wildlifeRenderState(layoutNow, now);
    if (!render || !state.visible) return;
    const sprite = wildlifeSprites[render.kind];
    if (!sprite) return;
    const variant = animalLabMetadata?.selected?.[render.kind]
      || ANIMAL_LAB_RECOMMENDED_VARIANTS[render.kind];
    const metadata = animalLabMetadata?.families?.[render.kind]?.[variant] || {};
    const canvas = metadata.canvas || [Math.round(sprite.texture?.width || 1), Math.round(sprite.texture?.height || 1)];
    const anchor = metadata.anchor || { x: canvas[0] / 2, y: canvas[1] };
    const waterlineY = Number(metadata.waterlineY ?? anchor.y);
    const submergePx = Math.max(0, Math.round(Number(metadata.submergePx || 0)));
    const contactProfile = String(metadata.contactProfile || 'calm');
    sprite.texture = textures[`wildlife:${render.kind}_${render.frameKey}`] || textures[`wildlife:${render.kind}_${WILDLIFE_SPECS[render.kind].frameKeys[0]}`];
    sprite.visible = true;
    sprite.alpha = render.alpha;
    const scaleX = render.kind === 'moose' ? 1 : (render.direction > 0 ? 1 : -1);
    sprite.anchor.set(anchor.x / canvas[0], waterlineY / canvas[1]);
    sprite.scale.set(scaleX, 1);
    sprite.position.set(render.x, render.y);
    const wakeLength = Math.max(3, Math.round(Number(metadata.wakeLength || (render.kind === 'moose' ? 9 : 6))));
    const direction = render.direction || 1;
    const frameMetadata = metadata.frames?.[render.frameKey] || {};
    const bbox = frameMetadata.bbox || [0, 0, canvas[0], waterlineY];
    const bodyLeft = Math.round(render.x + Math.min(
      bbox[0] - anchor.x,
      bbox[2] - anchor.x,
    ) - 1);
    const bodyRight = Math.round(render.x + Math.max(
      bbox[0] - anchor.x,
      bbox[2] - anchor.x,
    ) + 1);
    const ripplePhase = Number(metadata.ripplePhase || 0);
    const contact = drawLocalAnimalWater({
      back: g,
      front: wildlifeContactFront,
      accents: wildlifeContactAccents,
      layoutNow,
      now,
      kind: render.kind,
      frame: render.frame,
      frameKey: render.frameKey,
      direction,
      opacity: render.alpha,
      contactX: render.x,
      contactY: render.y,
      bodyLeft,
      bodyRight,
      submergePx,
      wakeLength,
      ripplePhase,
      contactProfile,
    });
    const contactBlendMode = render.kind === 'moose' ? 'screen' : 'normal';
    g.blendMode = contactBlendMode;
    wildlifeContactAccents.blendMode = contactBlendMode;
    wildlifeContactRuntime = {
      kind: render.kind,
      variant,
      frame: render.frame,
      frameKey: render.frameKey,
      bodyAnchor: { x: anchor.x, y: waterlineY },
      contactPoint: { x: render.x, y: render.y },
      blendMode: contactBlendMode,
      occlusionBlendMode: 'normal',
      ...contact,
      metadata: clone(metadata),
    };
  }

  function wildlifeAtPoint(worldPoint, layoutNow, now) {
    const render = wildlifeRenderState(layoutNow, now);
    if (!render || !layerStates.wildlife_cameos.visible) return null;
    const variant = animalLabMetadata?.selected?.[render.kind]
      || ANIMAL_LAB_RECOMMENDED_VARIANTS[render.kind];
    const metadata = animalLabMetadata?.families?.[render.kind]?.[variant] || {};
    const frameKey = render.frameKey;
    const frameMetadata = metadata.frames?.[frameKey] || {};
    const canvas = metadata.canvas || frameMetadata.size || [1, 1];
    const anchor = metadata.anchor || { x: canvas[0] / 2, y: canvas[1] };
    const waterlineY = Number(metadata.waterlineY ?? anchor.y);
    const direction = render.kind === 'moose' ? 1 : (render.direction > 0 ? 1 : -1);
    const sourceX = Math.floor(anchor.x + (worldPoint.x - render.x) * direction);
    const sourceY = Math.floor(waterlineY + worldPoint.y - render.y);
    if (sourceX < 0 || sourceY < 0 || sourceX >= canvas[0] || sourceY >= canvas[1]) return null;
    const sampler = wildlifeAlphaSamplers[`${render.kind}_${frameKey}`];
    if (sampler) {
      return sampler.alpha[sourceY * sampler.width + sourceX] >= 32 ? render : null;
    }
    const [left, top, right, bottom] = frameMetadata.bbox || [0, 0, canvas[0], canvas[1]];
    return sourceX >= left && sourceX < right && sourceY >= top && sourceY < bottom ? render : null;
  }

  function wildlifeStableHitPoint(render) {
    if (!render) return null;
    const variant = animalLabMetadata?.selected?.[render.kind]
      || ANIMAL_LAB_RECOMMENDED_VARIANTS[render.kind];
    const metadata = animalLabMetadata?.families?.[render.kind]?.[variant] || {};
    const canvas = metadata.canvas || [1, 1];
    const anchor = metadata.anchor || { x: canvas[0] / 2, y: canvas[1] };
    const waterlineY = Number(metadata.waterlineY ?? anchor.y);
    const samplers = (WILDLIFE_SPECS[render.kind]?.frameKeys || []).map((frameKey) => (
      wildlifeAlphaSamplers[`${render.kind}_${frameKey}`]
    )).filter(Boolean);
    if (!samplers.length) return null;
    let best = null;
    for (let sourceY = 0; sourceY < canvas[1]; sourceY += 1) {
      for (let sourceX = 0; sourceX < canvas[0]; sourceX += 1) {
        const opaqueInEveryFrame = samplers.every((sampler) => (
          sourceX < sampler.width
          && sourceY < sampler.height
          && sampler.alpha[sourceY * sampler.width + sourceX] >= 32
        ));
        if (!opaqueInEveryFrame) continue;
        const score = Math.abs(sourceX - anchor.x) + Math.abs(sourceY - (waterlineY - 3)) * 1.5;
        if (!best || score < best.score) best = { sourceX, sourceY, score };
      }
    }
    if (!best) return null;
    const direction = render.kind === 'moose' ? 1 : (render.direction > 0 ? 1 : -1);
    return {
      x: Math.round(render.x + (best.sourceX - anchor.x) * direction),
      y: Math.round(render.y + best.sourceY - waterlineY),
      sourceX: best.sourceX,
      sourceY: best.sourceY,
    };
  }

  function drawSky(g, state, layoutNow) {
    const bands = [
      [0, 0.26, state.variant === 'indigo' ? 0x34395f : COLORS.skyTop],
      [0.26, 0.58, state.variant === 'peach' ? 0xa56f87 : COLORS.skyMid],
      [0.58, 1, COLORS.skyHorizon],
    ];
    for (const [from, to, color] of bands) {
      rect(g, 0, Math.floor(layoutNow.nativeH * from), layoutNow.nativeW + 2, Math.ceil(layoutNow.nativeH * (to - from)), color, 1);
    }
    for (let y = layoutNow.waterY - 26; y < layoutNow.waterY; y += 5) {
      rect(g, 0, y, layoutNow.nativeW, 2, COLORS.peach, 0.18);
    }
  }

  function drawClouds(g, state, layoutNow, now) {
    const drift = Math.round((now * state.speed) % 96);
    const yBase = Math.max(14, Math.round(layoutNow.nativeH * 0.16));
    for (let i = -1; i < Math.ceil(layoutNow.nativeW / 64) + 2; i++) {
      const x = i * 64 - drift;
      const y = yBase + (i % 2) * 9;
      rect(g, x, y, 22, 2, COLORS.cloud, 0.55);
      rect(g, x + 7, y - 2, 13, 2, COLORS.cloud, 0.45);
      rect(g, x + 3, y + 2, 18, 1, COLORS.cloudShadow, 0.35);
      if (state.variant === 'puffs') {
        rect(g, x + 30, y + 7, 10, 2, COLORS.cloud, 0.36);
        rect(g, x + 34, y + 5, 5, 1, COLORS.cloud, 0.28);
      }
    }
  }

  function drawFarBirds(g, state, layoutNow, now) {
    for (let i = 0; i < 7; i++) {
      const x = Math.round((i * 53 + now * 0.004) % (layoutNow.nativeW + 30)) - 15;
      const y = 28 + (i % 3) * 9;
      drawBird(g, x, y, Math.floor(now / 260 + i) % 2, state.opacity);
    }
  }

  function drawTreeline(g, state, layoutNow) {
    const base = layoutNow.waterY - 4;
    rect(g, 0, base - 4, layoutNow.nativeW, 8, COLORS.pineDark, 1);
    for (let x = -8; x < layoutNow.nativeW + 12; x += state.variant === 'mixed' ? 14 : 11) {
      const h = 24 + ((x * 7) % 17 + 17) % 17;
      drawPine(g, x, base, h, false);
      if (state.variant === 'mixed' && x % 28 === 0) {
        rect(g, x + 5, base - 29, 1, 29, COLORS.birch, 1);
        rect(g, x + 4, base - 18, 3, 1, COLORS.pineHi, 0.8);
      }
    }
  }

  function drawLakeBase(g, state, layoutNow) {
    rect(g, 0, layoutNow.waterY, layoutNow.nativeW, layoutNow.nativeH - layoutNow.waterY, state.variant === 'deep' ? COLORS.lakeDark : COLORS.lake, 1);
    for (let y = layoutNow.waterY + 5; y < layoutNow.nativeH; y += 9) {
      rect(g, 0, y, layoutNow.nativeW, 1, COLORS.lakeDark, 0.22);
    }
  }

  function lakeBackfillColor() {
    const sampler = lakePixelSamplers[layerStates.lake_base.variant];
    if (!sampler?.data || !sampler.width || !sampler.height) return COLORS.lake;
    const sampleXs = [0.25, 0.5, 0.75].map((ratio) => Math.floor((sampler.width - 1) * ratio));
    for (let y = sampler.height - 1; y >= Math.max(0, sampler.height - 28); y -= 1) {
      for (const x of sampleXs) {
        const index = (y * sampler.width + x) * 4;
        if (sampler.data[index + 3] < WATER_OCCLUDER_ALPHA_THRESHOLD) continue;
        return rgbColor(sampler.data[index], sampler.data[index + 1], sampler.data[index + 2]);
      }
    }
    return COLORS.lake;
  }

  function drawLakeBackfill(g, layoutNow) {
    rect(g, 0, 0, layoutNow.nativeW, layoutNow.nativeH, lakeBackfillColor(), 1);
    const state = layerStates.lake_base;
    const sampler = lakePixelSamplers[state.variant];
    if (!sampler?.topEdge) return;
    const texture = textures[layerTextureKey('lake_base', state.variant, 0, 0, state.frameMs)];
    if (!texture) return;
    for (const position of spritePositionsFor('lake_base', state, texture, layoutNow, 0)) {
      const left = Math.max(0, -position.x);
      const right = Math.min(sampler.width, layoutNow.nativeW - position.x);
      for (let x = left; x < right;) {
        const edge = sampler.topEdge[x];
        let end = x + 1;
        while (end < right && sampler.topEdge[end]?.y === edge?.y && sampler.topEdge[end]?.color === edge?.color) end += 1;
        if (edge && position.y + edge.y > 0) {
          rect(g, position.x + x, 0, end - x, position.y + edge.y, edge.color, 1);
        }
        x = end;
      }
    }
  }

  function drawDockLandConnection(g, state, layoutNow) {
    const offset = layerPosition('foreground_dock_shore', state, layoutNow);
    dockBankFill.visible = layoutNow.compact || offset.x > 0;
    if (!dockBankFill.visible) return;
    const endX = layoutNow.compact ? layoutNow.safeArea.left + 10 : offset.x + 32;
    const surfaceY = offset.y + foregroundDockSurface(state).y;
    const rise = layoutNow.compact ? 0 : 34 * clamp(offset.x / 24, 0, 1);
    dockBankFill.width = endX;
    dockBankFill.height = layoutNow.nativeH;
    dockBankFill.tilePosition.set(offset.x, surfaceY);
    const bankTop = (x) => {
      const p = clamp((x - endX + 72) / 72, 0, 1);
      return Math.round(surfaceY + (layoutNow.compact ? -1 : 9) - rise * (1 - p * p * (3 - 2 * p)));
    };
    for (let x = 0; x < endX; x += 2) {
      const width = Math.min(2, endX - x);
      const top = bankTop(x) + Math.round(pseudoRandom(Math.floor(x / 4), 178) * 1.5);
      rect(g, x, top, width, Math.max(0, layoutNow.nativeH - top), 0xffffff, 1);
    }
  }

  function drawWaterlineBlend(g, layoutNow, now) {
    const top = layoutNow.waterY - 28;
    const bottom = layoutNow.waterY + 34;
    for (let y = top; y <= bottom; y += 1) {
      const p = clamp((y - top) / Math.max(1, bottom - top), 0, 1);
      const waterline = clamp(1 - Math.abs(p - 0.34) / 0.52, 0, 1);
      const alpha = waterline * (0.105 - p * 0.03);
      const color = p < 0.48 ? COLORS.veilDusk : (p < 0.72 ? COLORS.veilLavender : COLORS.lakeLight);
      rect(g, 0, y, layoutNow.nativeW, 1, color, alpha);
    }
    for (let band = 0; band < 13; band += 1) {
      const y = Math.round(layoutNow.waterY - 22 + band * 4 + Math.abs(pseudoRandom(band, 121)) * 6);
      const drift = Math.round(Math.sin(now * 0.000041 + band * 1.7) * 2);
      for (let x = -48 + drift; x < layoutNow.nativeW + 52; x += 46) {
        const width = 14 + Math.round(Math.abs(pseudoRandom(x + band, 122)) * 58);
        const color = band % 4 === 0 ? COLORS.veilDusk : (band % 3 === 0 ? COLORS.lakeLight : COLORS.veilLavender);
        rect(g, x, y, width, 1, color, 0.038 + Math.abs(pseudoRandom(x + band, 123)) * 0.035);
      }
    }
  }

  function drawLakeShimmer(g, state, layoutNow, now) {
    const pulse = shimmerPulse(state, now);
    const config = shimmerStyle();
    const step = waterState.shimmerStyle === 'bright_threads' ? 8 : 12;
    for (let y = layoutNow.waterY + 9; y < layoutNow.nativeH - 8; y += step) {
      for (let x = -24; x < layoutNow.nativeW + 20; x += Math.round(42 / config.density)) {
        const len = config.lenMin + Math.round(Math.abs(pseudoRandom(x + y, 98)) * (config.lenMax - config.lenMin));
        const nudge = Math.round(Math.sin(now * Number(waterState.pulseSpeed || 0.00008) * Math.PI * 2 + y * 0.37 + x * 0.03));
        const alpha = Math.min(config.alphaCap, 0.09 * pulse * config.intensity * waterState.sparkleIntensity);
        rect(g, x + ((y * 5) % 23) + nudge, y, len, 1, COLORS.lakeLight, alpha);
      }
    }
  }

  function sparkleMarks(layoutNow, now) {
    const marks = [];
    const colors = [COLORS.sparklePeach, COLORS.sparkleCyan, COLORS.sparkleLavender, COLORS.splash];
    const yMin = layoutNow.waterY + 11;
    const yMax = Math.max(yMin + 12, layoutNow.nativeH - 9);
    const config = shimmerStyle();
    const density = Math.max(0.1, Number(waterState.sparkleDensity || 1) * config.density);
    const intensity = Math.max(0, Number(waterState.sparkleIntensity || 1) * config.intensity);
    const bands = Math.max(3, Math.round(config.bands * density));
    let index = 0;
    for (let band = 0; band < bands; band += 1) {
      const bandP = (band + 0.5) / bands;
      const dockP = config.dockBias > 0 ? Math.pow(bandP, 1 + config.dockBias * 2) : bandP;
      const y = Math.round(lerp(yMin, yMax, dockP) + (Math.abs(pseudoRandom(band, 14)) * 5 - 2));
      const spacing = Math.max(13, Math.round((28 + Math.abs(pseudoRandom(band, 8)) * 22) / density));
      const startX = -spacing + Math.round(Math.abs(pseudoRandom(band, 5)) * spacing);
      for (let x = startX; x < layoutNow.nativeW + spacing; x += spacing) {
        const salt = band * 31 + index;
        const seed = Math.abs(pseudoRandom(index, 22));
        const period = 2200 + seed * 3400;
        const phase = ((now + seed * period + band * 173) % period) / period;
        const wave = phase < 0.46 ? Math.sin((phase / 0.46) * Math.PI) : 0;
        const alpha = clamp(wave * (0.18 + Math.abs(pseudoRandom(index, 30)) * 0.24) * intensity, 0, config.alphaCap);
        if (alpha > 0.045) {
          const len = config.lenMin + Math.floor(Math.abs(pseudoRandom(index, 3)) * (config.lenMax - config.lenMin + 1));
          marks.push({
            x: Math.round(x + Math.round((seed - 0.5) * 12)),
            y,
            len,
            color: colors[Math.floor(Math.abs(pseudoRandom(salt, 4)) * colors.length) % colors.length],
            alpha,
          });
        }
        index += 1;
      }
    }
    const minMarks = Math.max(3, Math.round(layoutNow.nativeW / 72));
    for (let extra = marks.length; extra < minMarks; extra += 1) {
      const seed = Math.abs(pseudoRandom(extra, 101));
      const wave = (Math.sin(now * Number(waterState.pulseSpeed || 0.0001) * Math.PI * 2 + extra * 1.7) + 1) / 2;
      marks.push({
        x: Math.round(seed * layoutNow.nativeW),
        y: Math.round(lerp(yMin + 2, yMax - 6, Math.abs(pseudoRandom(extra, 102)))),
        len: 1 + Math.round(Math.abs(pseudoRandom(extra, 103)) * 2),
        color: colors[extra % colors.length],
        alpha: clamp((0.055 + wave * 0.055) * intensity, 0.03, Math.min(0.12, config.alphaCap)),
      });
    }
    return marks;
  }

  function drawWaterSparkles(g, layoutNow, now) {
    const config = shimmerStyle();
    for (const mark of sparkleMarks(layoutNow, now)) {
      rect(g, mark.x, mark.y, mark.len, 1, mark.color, mark.alpha);
      if (mark.len >= 4 && Math.abs(pseudoRandom(mark.x + mark.y, 11)) > 0.62) {
        pixel(g, mark.x + Math.floor(mark.len / 2), mark.y - 1, mark.color, mark.alpha * 0.55);
      }
    }
    const local = [
      { x: layoutNow.castTarget.x, y: foregroundWaterY(layoutNow), salt: 41 },
      { x: layoutNow.avatar.x + 38, y: foregroundWaterY(layoutNow) + 3, salt: 73 },
      { x: layoutNow.dog.x - 22, y: foregroundWaterY(layoutNow) + 1, salt: 97 },
    ];
    for (const spot of local) {
      const wave = (Math.sin(now * 0.0017 + spot.salt) + 1) / 2;
      const alpha = wave > 0.42 ? clamp((wave - 0.42) * 0.16 * Number(waterState.sparkleIntensity || 1) * config.local, 0, Math.min(config.alphaCap, 0.18)) : 0;
      if (alpha <= 0.015) continue;
      const width = 4 + Math.round(wave * 7);
      line(g, spot.x - width, spot.y, spot.x - 2, spot.y, COLORS.sparklePeach, alpha);
      line(g, spot.x + 2, spot.y, spot.x + width, spot.y, COLORS.sparkleCyan, alpha * 0.7);
      if (wave > 0.82) pixel(g, spot.x, spot.y - 1, COLORS.sparkleLavender, alpha);
    }
  }

  function addWaterPlop(x, y, now = performance.now()) {
    waterPlops.push({
      x: Math.round(x),
      y: Math.round(y),
      start: now,
    });
    while (waterPlops.length > 12) waterPlops.shift();
  }

  function waterPlopScale(plop, layoutNow) {
    const farY = layoutNow.waterY + 2;
    const nearY = Math.max(farY + 1, layoutNow.dockSurfaceY - 3);
    const depth = clamp((plop.y - farY) / (nearY - farY), 0, 1);
    return 0.42 + depth * 0.82;
  }

  function waterDepthAt(y, layoutNow) {
    const farY = layoutNow.waterY + 2;
    const nearY = Math.max(farY + 1, layoutNow.dockSurfaceY - 3);
    return clamp((y - farY) / (nearY - farY), 0, 1);
  }

  function opaqueSceneryAt(worldPoint, layoutNow, now) {
    for (const layerName of WATER_OCCLUDING_LAYERS) {
      const state = layerStates[layerName];
      if (!state?.visible || Number(state.opacity) <= 0.02) continue;
      const sampler = reflectionAlphaSamplers[`${layerName}:${state.variant}`];
      if (!sampler || sampler.status !== 'ready') continue;
      const textureKey = layerTextureKey(layerName, state.variant, now, 0, state.frameMs)
        || layerTextureKey(layerName, state.variants?.[0], now, 0, state.frameMs);
      const texture = textureKey ? textures[textureKey] : null;
      if (!texture) continue;
      const positions = spritePositionsFor(layerName, state, texture, layoutNow, now);
      for (const position of positions) {
        const sourceX = Math.floor(worldPoint.x - position.x);
        const sourceY = Math.floor(worldPoint.y - position.y);
        if (
          sourceX < 0
          || sourceY < 0
          || sourceX >= sampler.width
          || sourceY >= sampler.height
        ) continue;
        const alpha = sampler.alpha[sourceY * sampler.width + sourceX] * Number(state.opacity);
        if (alpha >= WATER_OCCLUDER_ALPHA_THRESHOLD) return layerName;
      }
    }
    return null;
  }

  function pointerSurfaceAt(worldPoint, layoutNow = currentLayout(), now = performance.now()) {
    if (
      worldPoint.y < layoutNow.waterY - 8
      || worldPoint.y > layoutNow.nativeH - 8
    ) {
      return { surface: 'outside', occluder: null };
    }
    const occluder = opaqueSceneryAt(worldPoint, layoutNow, now);
    return occluder
      ? { surface: 'scenery', occluder }
      : { surface: 'water', occluder: null };
  }

  function fishingWaterMask(layoutNow, now) {
    const key = JSON.stringify([layoutNow, WATER_OCCLUDING_LAYERS.map((name) => layerStates[name])]);
    if (fishingWaterMaskCache?.key === key) return fishingWaterMaskCache;
    const width = layoutNow.nativeW;
    const height = layoutNow.nativeH;
    const stride = width + 1;
    const sums = new Uint32Array(stride * (height + 1));
    for (let y = 0; y < height; y += 1) {
      let row = 0;
      for (let x = 0; x < width; x += 1) {
        if (pointerSurfaceAt({ x, y }, layoutNow, now).surface !== 'water') row += 1;
        sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + row;
      }
    }
    fishingWaterMaskCache = { key, sums, stride };
    return fishingWaterMaskCache;
  }

  function bobberFootprintIsOpenWater(point, layoutNow, now) {
    if (layoutNow.compact) {
      // Full release splash (16px radius), bite dip and 8 native pixels of clearance.
      const left = Math.round(point.x) - 24;
      const right = Math.round(point.x) + 25;
      const top = Math.round(point.y) - 20;
      const bottom = Math.round(point.y) + 13;
      const safe = layoutNow.safeArea;
      if (left < safe.left || right > layoutNow.nativeW - safe.right || top < safe.top || bottom > layoutNow.nativeH - safe.bottom) return false;
      const { sums, stride } = fishingWaterMask(layoutNow, now);
      return sums[bottom * stride + right] - sums[top * stride + right]
        - sums[bottom * stride + left] + sums[top * stride + left] === 0;
    }
    for (const y of [-4, -2, 0, 2]) {
      for (const x of [-2, 0, 2]) {
        if (pointerSurfaceAt({ x: point.x + x, y: point.y + y }, layoutNow, now).surface !== 'water') return false;
      }
    }
    return true;
  }

  function resolveFishingTarget(layoutNow, now) {
    const preferred = layoutNow.castTarget;
    if (bobberFootprintIsOpenWater(preferred, layoutNow, now)) return preferred;
    const minX = layoutNow.compact ? Math.max(24, layoutNow.avatar.x + 16) : Math.max(14, Math.round(layoutNow.avatar.x + 24));
    const maxX = layoutNow.nativeW - (layoutNow.compact ? 25 + layoutNow.safeArea.right : 14);
    const minY = layoutNow.waterY + (layoutNow.compact ? 20 : 10);
    const maxY = layoutNow.compact ? layoutNow.nativeH - layoutNow.safeArea.bottom - 13 : layoutNow.dockSurfaceY - 4;
    const candidates = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        candidates.push({ x, y });
      }
    }
    candidates.sort((a, b) => Math.hypot(a.x - preferred.x, a.y - preferred.y) - Math.hypot(b.x - preferred.x, b.y - preferred.y));
    return candidates.find((candidate) => bobberFootprintIsOpenWater(candidate, layoutNow, now)) || null;
  }

  function drawWaterPlops(g, now, layoutNow) {
    for (let index = waterPlops.length - 1; index >= 0; index -= 1) {
      const plop = waterPlops[index];
      const p = clamp((now - plop.start) / 820, 0, 1);
      if (p >= 1) {
        waterPlops.splice(index, 1);
        continue;
      }
      const scale = waterPlopScale(plop, layoutNow);
      const alpha = (1 - p) * (0.8 + scale * 0.32);
      const burst = Math.max(1, Math.round(2 * scale));
      if (p < 0.35) {
        rect(g, plop.x - burst, plop.y - 1, burst, 1, COLORS.splash, alpha * 0.72);
        rect(g, plop.x + 1, plop.y - 1, burst, 1, COLORS.lakeLight, alpha * 0.58);
        pixel(g, plop.x - burst, plop.y, COLORS.sparkleCyan, alpha * 0.85);
        pixel(g, plop.x + burst, plop.y, COLORS.sparkleLavender, alpha * 0.8);
      }
      const radius = Math.max(1, Math.round((2 + p * 8) * scale));
      rect(g, plop.x - radius, plop.y + 1, radius, 1, COLORS.sparkleCyan, alpha * 0.9);
      rect(g, plop.x + 1, plop.y + 1, radius, 1, COLORS.sparkleLavender, alpha * 0.8);
      if (p > 0.35) {
        const innerRadius = Math.max(1, Math.round(radius * 0.65));
        rect(g, plop.x - innerRadius, plop.y + 3, innerRadius * 2 + 1, 1, COLORS.splash, alpha * 0.42);
      }
    }
  }

  function drawHeronSprite(layoutNow, now) {
    if (animalLabState.visible && animalLabState.family === 'heron') {
      heron.visible = false;
      return;
    }
    const state = heronRuntimeState(layoutNow, now);
    heron.visible = state.visible;
    if (!state.visible) return;
    heron.texture = textures[`heron:${state.texture}`] || textures['heron:idle'];
    heron.alpha = 1;
    heron.scale.set(state.scaleX || 1, 1);
    heron.position.set(state.x, state.y);
  }

  function animalLabFrameNames() {
    if (animalLabState.family === 'heron') {
      if (animalLabState.state === 'fly') return ['takeoff_1', 'takeoff_2', 'flight_up', 'flight_mid', 'flight_down'];
      if (animalLabState.state === 'land') return ['land_1', 'land_2'];
      return ['idle'];
    }
    const activeFamily = animalLabState.variant === ANIMAL_LAB_RECOMMENDED_VARIANTS[animalLabState.family];
    if (activeFamily) return [...(WILDLIFE_ACTIVE_FRAMES[animalLabState.family] || [])];
    if (animalLabState.family === 'moose') return ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'];
    return ['f0', 'f1', 'f2', 'f3', 'f4'];
  }

  function animalLabVariant() {
    const variants = ANIMAL_LAB_VARIANTS[animalLabState.family] || [];
    return variants.includes(animalLabState.variant) ? animalLabState.variant : variants[0];
  }

  function animalLabFrameName(now) {
    const frames = animalLabFrameNames();
    if (!frames.length) return 'idle';
    const frame = animalLabState.playing
      ? pingPongFrameIndex(now - animalLabAnimationEpoch, Math.max(80, Number(animalLabState.frameMs || 520)), frames.length)
      : clamp(Math.round(Number(animalLabState.frame || 0)), 0, frames.length - 1);
    return frames[frame];
  }

  function animalLabTextureKey(now) {
    return `animalLab:${animalLabVariant()}_${animalLabFrameName(now)}`;
  }

  function animalLabBasePoint(layoutNow) {
    if (animalLabState.family === 'heron') return heronBasePoint(layoutNow);
    if (animalLabState.family === 'moose') {
      return { x: Math.round(layoutNow.nativeW * 0.41), y: Math.round(layoutNow.waterY + 18) };
    }
    return { x: Math.round(layoutNow.nativeW * 0.41), y: Math.round(layoutNow.waterY + 13) };
  }

  function animalLabPoint(layoutNow) {
    const base = animalLabBasePoint(layoutNow);
    const now = lastNow || performance.now();
    const motion = animalLabState.playing && animalLabFrameNames().length > 1
      ? Math.round(Math.sin(now * 0.0011) * Number(animalLabState.speedPxPerSec || 0))
      : 0;
    return {
      x: Math.round(base.x + motion + Number(animalLabState.x || 0) + layoutNow.nativeW * Number(animalLabState.screenX || 0) / 100),
      y: Math.round(base.y + Number(animalLabState.y || 0) + layoutNow.nativeH * Number(animalLabState.screenY || 0) / 100),
    };
  }

  function drawAnimalLabPreview(g, state, layoutNow, now) {
    layerContainers.animal_lab_preview.zIndex = animalLabState.family === 'heron' ? 92 : 66;
    animalLabContactFront.clear();
    animalLabContactRuntime = null;
    animalLabSprite.visible = Boolean(state.visible && animalLabState.visible);
    if (!animalLabSprite.visible) return;
    const variant = animalLabVariant();
    const frameName = animalLabFrameName(now);
    const metadata = animalLabMetadata?.families?.[animalLabState.family]?.[variant] || {};
    const texture = textures[animalLabTextureKey(now)] || textures['animalLab:heron_b_grey_white_01_idle'];
    animalLabSprite.texture = texture;
    animalLabSprite.alpha = clamp(Number(animalLabState.opacity ?? 1), 0, 1);
    const scale = Math.max(1, Math.round(Number(animalLabState.scale || 1)));
    animalLabSprite.scale.set(scale, scale);
    const canvas = metadata.canvas || [Math.round(texture?.width || 1), Math.round(texture?.height || 1)];
    const anchor = metadata.anchor || { x: canvas[0] / 2, y: canvas[1] };
    const waterlineY = Number(metadata.waterlineY ?? anchor.y);
    const submergePx = Math.max(0, Math.round(Number(metadata.submergePx || 0)));
    const contactProfile = String(metadata.contactProfile || 'calm');
    animalLabSprite.anchor.set(anchor.x / canvas[0], waterlineY / canvas[1]);
    const point = animalLabPoint(layoutNow);
    animalLabSprite.position.set(point.x, point.y);
    if (animalLabState.family === 'moose' || animalLabState.family === 'mink') {
      const direction = 1;
      const wakeLength = Math.max(3, Math.round(Number(metadata.wakeLength || 6))) * scale;
      const frameMetadata = metadata.frames?.[frameName] || {};
      const bbox = frameMetadata.bbox || [0, 0, canvas[0], waterlineY];
      const bodyLeft = Math.round(point.x + (bbox[0] - anchor.x) * scale - scale);
      const bodyRight = Math.round(point.x + (bbox[2] - anchor.x) * scale + scale);
      const contact = drawLocalAnimalWater({
        back: g,
        front: animalLabContactFront,
        layoutNow,
        now,
        kind: animalLabState.family,
        frame: Math.max(0, animalLabFrameNames().indexOf(frameName)),
        direction,
        opacity: animalLabSprite.alpha,
        contactX: point.x,
        contactY: point.y,
        bodyLeft,
        bodyRight,
        submergePx: submergePx * scale,
        wakeLength,
        ripplePhase: Number(metadata.ripplePhase || 0),
        contactProfile,
      });
      animalLabContactRuntime = {
        family: animalLabState.family,
        variant,
        frameName,
        bodyAnchor: { x: anchor.x, y: waterlineY },
        contactPoint: { x: point.x, y: point.y },
        ...contact,
        metadata: clone(metadata),
      };
    }
    if (!animalLabState.showBounds) return;
    const w = Math.round(canvas[0] * scale);
    const h = Math.round(canvas[1] * scale);
    const left = Math.round(point.x - anchor.x * scale);
    const top = Math.round(point.y - anchor.y * scale);
    rect(g, left, top, w, h, COLORS.anchorTarget, 0.22);
    line(g, left, point.y, left + w, point.y, COLORS.sparklePeach, 0.7);
    pixel(g, point.x, point.y, COLORS.anchorHook, 0.9);
  }

  function drawFarShore(g, state, layoutNow) {
    const y = layoutNow.waterY - 7;
    rect(g, 0, y + 2, layoutNow.nativeW, 5, COLORS.shore, 1);
    for (let x = state.variant === 'rocky' ? 5 : 0; x < layoutNow.nativeW; x += 17) {
      rect(g, x, y, 9, 2, state.variant === 'rocky' ? COLORS.dockDark : COLORS.pineDark, 1);
    }
  }

  function drawRightLand(g, state, layoutNow) {
    const x = Math.max(layoutNow.nativeW - 62, layoutNow.avatar.x + 62);
    const y = layoutNow.waterY + 18;
    rect(g, x, y, 78, 6, COLORS.shore, 1);
    rect(g, x + 6, y - 5, 34, 5, COLORS.pineDark, 1);
    drawPine(g, x + 54, y - 1, 32, true);
  }

  function drawFog(g, state, layoutNow, now, high = false) {
    const y = high ? layoutNow.waterY - 20 : layoutNow.waterY + 5;
    const color = high ? COLORS.veilLavender : COLORS.veilBlue;
    for (let i = 0; i < Math.ceil(layoutNow.nativeW / 44) + 2; i += 1) {
      const x = i * 44 - 28 + Math.round(Math.abs(pseudoRandom(i, high ? 4 : 9)) * 14);
      const width = 18 + Math.round(Math.abs(pseudoRandom(i, high ? 5 : 10)) * 32);
      const yy = y + Math.round(Math.abs(pseudoRandom(i, high ? 6 : 11)) * (high ? 9 : 14));
      rect(g, x, yy, width, 1 + (i % 3 === 0 ? 1 : 0), color, state.opacity * (high ? 0.18 : 0.24));
    }
  }

  function drawDepthVeil(g, state, layoutNow, now) {
    const opacity = clamp(Number(state.opacity), 0, 1);
    const drift = now / 1000 * Number(waterState.hazeDriftPxPerSec || 0);
    const breathe = 0.96 + 0.04 * Math.sin(now * 0.000018);
    const top = layoutNow.waterY - 62;
    const bottom = layoutNow.waterY + 42;
    for (let y = top; y <= bottom; y += 1) {
      const aboveWater = y < layoutNow.waterY;
      const fromTop = clamp((y - top) / 42, 0, 1);
      const toBottom = clamp((bottom - y) / 58, 0, 1);
      const waterline = clamp(1 - Math.abs(y - (layoutNow.waterY - 5)) / 36, 0, 1);
      const rowNoise = 0.82 + Math.abs(pseudoRandom(y, 71)) * 0.18;
      const strength = Math.max(
        fromTop * toBottom * (aboveWater ? 0.11 : 0.08),
        waterline * (aboveWater ? 0.19 : 0.13),
      ) * rowNoise;
      if (strength > 0.006) {
        const color = aboveWater ? COLORS.veilLavender : COLORS.veilBlue;
        rect(g, 0, y, layoutNow.nativeW, 1, color, opacity * strength * breathe);
      }
    }
    for (let band = 0; band < 11; band += 1) {
      const y = Math.round(layoutNow.waterY - 34 + band * 6 + Math.abs(pseudoRandom(band, 52)) * 8);
      const waterline = clamp(1 - Math.abs(y - (layoutNow.waterY - 2)) / 44, 0.22, 1);
      const bandDrift = Math.round((band % 2 === 0 ? drift : -drift * 0.54) + Math.sin(now * 0.000024 + band) * 3);
      const baseAlpha = opacity * waterline * (0.07 + Math.abs(pseudoRandom(band, 53)) * 0.095) * breathe;
      for (let x = -108 + bandDrift; x < layoutNow.nativeW + 108; x += 48) {
        const width = 28 + Math.round(Math.abs(pseudoRandom(x + band, 54)) * 92);
        const yy = y + Math.round((pseudoRandom(x + band, 55)) * 4);
        const color = band % 4 === 0 ? COLORS.veilLavender : COLORS.veilBlue;
        rect(g, x, yy, width, band % 4 === 0 ? 2 : 1, color, baseAlpha);
      }
    }
    for (let x = -70 + Math.round(drift * 0.24); x < layoutNow.nativeW + 70; x += 64) {
      const y = layoutNow.waterY - 40 + Math.round(Math.abs(pseudoRandom(x, 61)) * 17);
      const width = 34 + Math.round(Math.abs(pseudoRandom(x, 62)) * 58);
      rect(g, x + Math.round(Math.abs(pseudoRandom(x, 63)) * 20), y, width, 2, COLORS.veilLavender, opacity * 0.09 * breathe);
    }
  }

  function drawGrade(g, state, layoutNow) {
    rect(g, 0, layoutNow.nativeH - 30, layoutNow.nativeW, 30, COLORS.ink, state.opacity);
  }

  function currentFishingPhase(now = lastNow || performance.now()) {
    if (!fishing.active) return { name: 'idle', p: 0 };
    return phaseAt(now - fishing.start, fishing.timeline);
  }

  function fishingAnchors(layoutNow, phase = currentFishingPhase(), now = lastNow || performance.now()) {
    const hand = handPoint(layoutNow);
    const rodTip = rodTipFor(hand, phase, rigState);
    const holdRodTip = rodTipFor(hand, { name: 'hold', p: 1 }, rigState);
    const variant = activeCatchVariant();
    const gravityHeldMouth = {
      ...heldFishMouthPointFor(hand),
      x: holdRodTip.x,
    };
    const reelMouth = dockClearedMouth(
      layoutNow,
      gravityHeldMouth,
      variant,
      fishStateForPhase(phase),
      fishDisplayState.reelScale,
    );
    const hookTarget = hookTargetFor(
      layoutNow,
      hand,
      phase,
      rigState,
      now,
      fishing.species,
      fishDisplayState.fightWiggle,
      reelMouth,
    );
    if (layoutNow.compact && phase.name === 'reel' && outcomeHasCatch(fishing.outcome) && phase.p >= 0.62) {
      const cleared = dockClearedMouth(layoutNow, hookTarget, variant, fishStateForPhase(phase), fishDisplayState.reelScale);
      hookTarget.y = lerp(hookTarget.y, cleared.y, clamp((phase.p - 0.62) / 0.1, 0, 1));
    }
    const heldMouth = dockClearedMouth(
      layoutNow,
      gravityHeldMouth,
      variant,
      'held',
      fishDisplayState.holdScale,
    );
    const retrieveTarget = returnPointWithRig(layoutNow, hand, rigState);
    return {
      dockSurface: { x: Math.round(layoutNow.avatar.x), y: layoutNow.dockSurfaceY },
      avatarFeet: entityPoint('avatar', layoutNow),
      dogFeet: entityPoint('dog', layoutNow),
      hand,
      rodTip,
      hookTarget,
      ...bobberRigFor(phase, hookTarget, bobberDipFor(phase, now), fishing.outcome),
      retrieveTarget,
      heldMouth,
      returnTarget: retrieveTarget,
      splashTarget: retrieveTarget,
      castTarget: layoutNow.castTarget,
    };
  }

  function bobberDipFor(phase, now) {
    if (fishing.outcome?.catchType === 'weeds' && phase.name === 'bite') return 0;
    if (phase.name === 'bite') return Math.round(Math.sin(now / 55) * 2 + 3);
    if (phase.name === 'tease') return Math.round(Math.sin(phase.p * Math.PI * fishing.teaseCount * 2) * 2 + 1);
    if (phase.name !== 'wait') return 0;
    const centers = fishing.teaseCount === 1 ? [0.68] : [0.42, 0.72];
    let dip = 0;
    for (const center of centers) {
      const distance = Math.abs(phase.p - center);
      if (distance < 0.075) dip = Math.max(dip, Math.round((1 - distance / 0.075) * 2));
    }
    return dip;
  }

  function fishFrameMeta(variant, state) {
    if (variant === 'weeds') return fishMetadata?.legacy?.weeds?.[state] || fishMetadata?.legacy?.weeds?.base || null;
    const match = String(variant).match(/^(.+)_(regular|large)$/);
    if (!match) return fishMetadata?.[variant]?.[state] || fishMetadata?.[variant]?.base || null;
    return fishMetadata?.species?.[match[1]]?.sizes?.[match[2]]?.states?.[state]
      || fishMetadata?.species?.[match[1]]?.sizes?.[match[2]]?.states?.base
      || null;
  }

  function dockClearedMouth(layoutNow, mouth, variant, state, scale = 1) {
    const meta = fishFrameMeta(variant, state);
    const alphaBox = meta?.alphaBBox;
    const textureHeight = Number(meta?.textureSize?.height || 0);
    if (!alphaBox || !textureHeight) return mouth;
    const alphaBottom = Number(alphaBox[3]);
    const anchorY = Number(meta?.anchor?.y || 0) * textureHeight;
    const bottomFromMouth = Math.max(0, alphaBottom - anchorY) * Number(scale || 1);
    return {
      x: mouth.x,
      y: Math.min(mouth.y, Math.floor(layoutNow.dockSurfaceY - 4 - bottomFromMouth)),
    };
  }

  function fishAnchorFor(variant, state, texture) {
    const meta = fishFrameMeta(variant, state);
    if (state === 'free' && meta?.alphaBBox && meta?.textureSize) {
      const [left, top, right, bottom] = meta.alphaBBox.map(Number);
      const textureWidth = Math.max(1, Number(meta.textureSize.width));
      const textureHeight = Math.max(1, Number(meta.textureSize.height));
      return {
        x: ((left + right) / 2) / textureWidth,
        y: ((top + bottom) / 2) / textureHeight,
      };
    }
    return meta?.anchor || fallbackFishAnchor(texture, state);
  }

  function fishVisibleCenterFromMouth(mouth, meta, scale = 1) {
    if (!mouth || !meta?.alphaBBox || !meta?.textureSize) return mouth;
    const [left, top, right, bottom] = meta.alphaBBox.map(Number);
    const textureWidth = Math.max(1, Number(meta.textureSize.width));
    const textureHeight = Math.max(1, Number(meta.textureSize.height));
    const anchor = meta.anchor || { x: 0.5, y: 0.5 };
    return {
      x: mouth.x + ((left + right) / 2 - Number(anchor.x) * textureWidth) * scale,
      y: mouth.y + ((top + bottom) / 2 - Number(anchor.y) * textureHeight) * scale,
    };
  }

  function fishRotationFor(variant, state, phase, now) {
    if (variant === 'weeds') return state === 'free' ? lerp(0, 0.35, easeInOut(phase.p)) : 0;
    const meta = fishFrameMeta(variant, state);
    const base = Number(meta?.rotation ?? (state === 'fight' ? FISH_HANG_ROTATION : 0));
    if (state === 'fight') return base + Math.sin(now / 86) * 0.18 * (1 - phase.p) * fishDisplayState.fightWiggle;
    if (state === 'hang' || state === 'held') return 0;
    if (state === 'free') return lerp(-Math.PI / 2, 1.36, easeInOut(phase.p));
    return base;
  }

  function fishDisplayFor(layoutNow, phase, now, texture) {
    const anchors = fishingAnchors(layoutNow, phase, now);
    const variant = activeCatchVariant();
    const state = fishStateForPhase(phase);
    const meta = fishFrameMeta(variant, state);
    const mouthOffset = {
      x: Number(fishDisplayState.mouthOffset.x || 0),
      y: Number(fishDisplayState.mouthOffset.y || 0),
    };
    if (!outcomeHasCatch(fishing.outcome)) {
      return {
        visible: false,
        mode: 'hidden',
        state,
        anchor: { x: 0.5, y: 0.5 },
        mouth: null,
        body: anchors.hookTarget,
        visibleCenter: null,
        rotation: 0,
        scale: 1,
      };
    }
    if (phase.name === 'reel') {
      const rotation = fishRotationFor(variant, state, phase, now);
      const mouth = {
        x: anchors.hookTarget.x + mouthOffset.x,
        y: anchors.hookTarget.y + mouthOffset.y,
      };
      const scale = Number(fishDisplayState.reelScale || 1);
      return {
        visible: phase.p >= FISH_EMERGE_PROGRESS,
        mode: 'hooked',
        state,
        anchor: fishAnchorFor(variant, state, texture),
        mouth,
        body: fishBodyPointFromMouth(mouth, texture, state, meta, rotation),
        visibleCenter: fishVisibleCenterFromMouth(mouth, meta, scale),
        rotation,
        scale,
      };
    }
    if (phase.name === 'hold') {
      const rotation = fishRotationFor(variant, state, phase, now);
      const mouth = {
        x: anchors.heldMouth.x + mouthOffset.x,
        y: anchors.heldMouth.y + mouthOffset.y + Number(fishDisplayState.heldYOffset || 0),
      };
      const scale = Number(fishDisplayState.holdScale || 1);
      return {
        visible: true,
        mode: 'hanging',
        state,
        anchor: fishAnchorFor(variant, state, texture),
        mouth,
        body: fishBodyPointFromMouth(mouth, texture, state, meta, rotation),
        visibleCenter: fishVisibleCenterFromMouth(mouth, meta, scale),
        rotation,
        scale,
      };
    }
    if (phase.name === 'throwBack') {
      const heldMeta = fishFrameMeta(variant, 'held');
      const heldMouth = {
        x: anchors.heldMouth.x + mouthOffset.x,
        y: anchors.heldMouth.y + mouthOffset.y + Number(fishDisplayState.heldYOffset || 0),
      };
      const scale = Number(fishDisplayState.holdScale || 1);
      const heldCenter = fishVisibleCenterFromMouth(heldMouth, heldMeta, scale);
      const body = throwFishPointFor(layoutNow, anchors.hand, phase, rigState, heldCenter);
      return {
        visible: true,
        mode: 'free',
        state,
        anchor: fishAnchorFor(variant, state, texture),
        mouth: null,
        body,
        visibleCenter: body,
        rotation: fishRotationFor(variant, state, phase, now),
        scale,
      };
    }
    return {
      visible: false,
      mode: 'hidden',
      state,
      anchor: { x: 0.5, y: 0.5 },
      mouth: null,
      body: anchors.hookTarget,
      visibleCenter: null,
      rotation: 0,
      scale: 1,
    };
  }

  function drawAnchorDot(g, point, color) {
    rect(g, Math.round(point.x) - 1, Math.round(point.y) - 1, 3, 3, color, 0.8);
  }

  function drawBounds(g, layoutNow) {
    const avatarPoint = entityPoint('avatar', layoutNow);
    const dogPoint = entityPoint('dog', layoutNow);
    const anchors = fishingAnchors(layoutNow);
    for (const [name, state] of Object.entries(layerStates)) {
      if (!state.visible || name === 'debug_overlay') continue;
      const position = layerPosition(name, state, layoutNow);
      rect(g, position.x, position.y, layoutNow.nativeW, 1, state.color, 0.25);
    }
    rect(g, Math.round(avatarPoint.x - 13), Math.round(avatarPoint.y - 55), 26, 55, COLORS.peach, 0.22);
    rect(g, Math.round(dogPoint.x - 11), Math.round(dogPoint.y - 17), 22, 17, COLORS.peach, 0.22);
    drawAnchorDot(g, anchors.hand, COLORS.anchorHand);
    drawAnchorDot(g, anchors.rodTip, COLORS.rodWarm);
    drawAnchorDot(g, anchors.hookTarget, COLORS.anchorHook);
    drawAnchorDot(g, anchors.heldMouth, COLORS.anchorTarget);
    drawAnchorDot(g, anchors.returnTarget, COLORS.anchorTarget);
  }

  function syncFishingAudio(phase) {
    if (!fishing.active) return;
    if (phase.name !== fishing.audioPhase) {
      fishing.audioPhase = phase.name;
      const audioContext = { phase: phase.name, outcome: fishing.outcome.key };
      if (phase.name === 'cast') audio.play('rod_cast', audioContext);
      if (phase.name === 'bite' && !fishing.outcome.noBark) {
        fishing.barked = true;
        dogState.barkUntil = (lastNow || performance.now()) + 420;
        audio.play('bobber_bite', audioContext);
        audio.play('dog_bite_bark', { ...audioContext, delayMs: 100 });
      }
      if (phase.name === 'reel') audio.play('reel_retrieve', audioContext);
      if (phase.name === 'splash' && outcomeHasCatch(fishing.outcome)) {
        audio.play('release_splash', {
          ...audioContext,
          gain: fishing.outcome.smallSplash ? 0.55 : 1,
        });
      }
    }
    if (
      phase.name === 'reel'
      && outcomeHasCatch(fishing.outcome)
      && fishing.outcome.catchType !== 'weeds'
      && phase.p >= FISH_EMERGE_PROGRESS
      && !fishing.emergeSplashPlayed
    ) {
      fishing.emergeSplashPlayed = true;
      audio.play('fish_emerge_splash', {
        phase: phase.name,
        outcome: fishing.outcome.key,
      });
    }
  }

  function drawRodAndFishing(layoutNow, now) {
    dialogueBounds = null;
    const g = layerGraphics.line_and_interactions;
    const hand = handPoint(layoutNow);
    const elapsed = now - fishing.start;
    const phase = fishing.active ? phaseAt(elapsed, fishing.timeline) : { name: 'idle', p: 0 };
    const rodTip = rodTipFor(hand, phase, rigState);
    const anchors = fishingAnchors(layoutNow, phase, now);
    const hookTarget = anchors.hookTarget;
    const lineEnd = anchors.lineEnd;
    const returnTarget = anchors.returnTarget;
    const fishTexture = fishTextureFor(textures, activeCatchVariant(), phase);
    const fishDisplay = fishDisplayFor(layoutNow, phase, now, fishTexture);
    const reelContactSplash = reelContactSplashFor(phase, rodTip, anchors, fishing.species);
    const chatOrigin = chatOriginPoint(layoutNow);
    syncFishingAudio(phase);

    line(g, hand.x, hand.y, rodTip.x, rodTip.y, COLORS.rodDark, 1);
    line(g, hand.x + 1, hand.y, rodTip.x + 1, rodTip.y, COLORS.rodWarm, 0.72);

    const lineAttached = fishing.active && lineAttachedForPhase(phase.name, fishing.outcome);
    if (lineAttached) {
      const taut = lineIsTautForPhase(phase);
      if (taut) {
        line(g, rodTip.x, rodTip.y, lineEnd.x, lineEnd.y, COLORS.line, 0.9);
      } else {
        const slack = phase.name === 'reel'
          ? (rigState.lineSlack * 0.66) * (1 - phase.p)
          : rigState.lineSlack;
        const control = {
          x: (rodTip.x + lineEnd.x) / 2,
          y: Math.max(rodTip.y, lineEnd.y) + slack,
        };
        curve(g, rodTip, control, lineEnd, COLORS.line, 0.9);
      }
      if (anchors.bobber) drawBobber(g, anchors.bobber.x, anchors.bobber.y);
      drawBobberWaterMovement(g, phase, hookTarget, fishing.outcome, fishing.teaseCount);
    }
    drawReelContactSplash(g, reelContactSplash, now);

    if (fishing.active) {
      if (fishDisplay.visible) {
        fish.visible = true;
        fish.texture = fishTexture;
        fish.anchor.set(fishDisplay.anchor.x, fishDisplay.anchor.y);
        const point = fishDisplay.mode === 'free' ? fishDisplay.body : fishDisplay.mouth;
        fish.position.set(Math.round(point.x), Math.round(point.y));
        fish.rotation = fishDisplay.rotation;
        fish.scale.set(entityStates.fish.scale * Number(fishDisplay.scale || 1));
      } else {
        fish.visible = false;
      }
      const splashScale = fishing.outcome.smallSplash ? 0.55 : 1;
      if (phase.name === 'splash' && outcomeHasCatch(fishing.outcome)) drawSplash(g, returnTarget.x, returnTarget.y, phase.p, splashScale);
      if (
        phase.name === 'reel'
        && outcomeHasCatch(fishing.outcome)
        && phase.p >= FISH_SPLASH_START_PROGRESS
        && phase.p <= FISH_SPLASH_END_PROGRESS
      ) {
        drawSplash(g, anchors.retrieveTarget.x, anchors.retrieveTarget.y, surfaceBreakProgress(phase), splashScale);
      }
      const message = messageForPhase(phase, fishing.species, fishing.script);
      fishing.currentLine = message;
      dialogueBounds = chatboxLayout(layoutNow.nativeW, layoutNow.nativeH, message, chatOrigin);
      drawChatbox(g, layoutNow.nativeW, layoutNow.nativeH, message, now, chatOrigin);
    } else if (flags.sampleChat) {
      drawChatbox(g, layoutNow.nativeW, layoutNow.nativeH, fishingLineForPhase(FISHING_SCRIPTS.weeds[0], { name: 'hold', p: 0.65 }, SPECIAL_CATCHES.weeds), now, chatOrigin);
      fish.visible = false;
    } else {
      fish.visible = false;
    }

    if (phase.name === 'done') {
      fishing.active = false;
      fishing.phase = null;
      fishing.barked = false;
      fishing.audioPhase = null;
      fishing.emergeSplashPlayed = false;
      fish.anchor.set(0.5, 0.5);
      wildlife.catchCount += 1;
      if (!wildlife.swimmerSeen) wildlife.nextSwimmerAt = Math.min(wildlife.nextSwimmerAt, now + 5000);
      if (!wildlife.mooseSeen && wildlife.catchCount >= 2) wildlife.nextMooseAt = Math.min(wildlife.nextMooseAt, now + 10000);
    } else {
      fishing.phase = phase;
    }
  }

  function draw(now) {
    const layoutNow = currentLayout();
    setLayerDisplay();
    for (const g of Object.values(layerGraphics)) g.clear();
    updateWaterlineMasks(layoutNow);

    for (const layer of LAYERS) {
      const state = layerStates[layer.name];
      if (
        reflectionState.solo
        && !['sky_base', 'lake_base', 'reflection_mirror', 'lake_shimmer', 'debug_overlay'].includes(layer.name)
      ) {
        continue;
      }
      if (!state.visible) continue;
      const g = layerGraphics[layer.name];
      const sprites = layerSprites[layer.name];
      if (layer.name === 'lake_base') drawLakeBackfill(g, layoutNow);
      if (layer.name === 'foreground_dock_shore') drawDockLandConnection(g, state, layoutNow);
      if (layer.name === 'reflection_mirror') {
        drawReflectionMirror(state, layoutNow, now);
        continue;
      }
      if (layer.name === 'far_birds') {
        updateFarBirdSprites(state, layoutNow, now);
        continue;
      }
      if (layer.name === 'toronto_easter_egg') {
        drawTorontoEasterEgg(g, layoutNow, now);
        continue;
      }
      if (sprites) {
        const asset = LAYER_ASSETS[layer.name]?.[state.variant];
        const textureKey = layerTextureKey(layer.name, state.variant, now, 0, state.frameMs) || layerTextureKey(layer.name, layer.variants[0], now, 0, state.frameMs);
        const fallbackKey = layerTextureKey(layer.name, layer.variants[0], now, 0, state.frameMs);
        const texture = textures[textureKey] || textures[fallbackKey];
        if (texture) {
          const positions = spritePositionsFor(layer.name, state, texture, layoutNow, now);
          sprites.forEach((sprite, index) => {
            const position = positions[index];
            const frameKey = Array.isArray(asset)
              ? layerTextureKey(layer.name, state.variant, now, index, state.frameMs)
              : textureKey;
            sprite.texture = textures[frameKey] || texture;
            sprite.visible = Boolean(position);
            sprite.alpha = layer.name === 'lake_shimmer' && position
              ? (flags.forceShimmer ? 1 : state.opacity * shimmerPulse(state, now))
              : 1;
            if (position) sprite.position.set(position.x, position.y);
          });
        }
      }
      if (sprites) {
        if (layer.name === 'lake_shimmer' && flags.forceShimmer) {
          for (let y = layoutNow.waterY + 8; y < layoutNow.nativeH - 10; y += 7) {
            rect(g, 0, y, layoutNow.nativeW, 1, COLORS.splash, 0.65);
          }
        }
        if (layer.name === 'lake_shimmer') {
          drawWaterlineBlend(g, layoutNow, now);
          drawWaterSparkles(g, layoutNow, now);
          drawWaterPlops(g, now, layoutNow);
        }
        continue;
      }
      if (layer.name === 'sky_base') drawSky(g, state, layoutNow);
      else if (layer.name === 'lake_base') drawLakeBase(g, state, layoutNow);
      else if (!sprites && layer.name === 'cloud_drift') drawClouds(g, state, layoutNow, now);
      else if (layer.name === 'far_birds') drawFarBirds(g, state, layoutNow, now);
      else if (!sprites && layer.name === 'back_treeline') drawTreeline(g, state, layoutNow);
      else if (!sprites && layer.name === 'lake_shimmer') drawLakeShimmer(g, state, layoutNow, now);
      else if (!sprites && layer.name === 'far_shore') drawFarShore(g, state, layoutNow);
      else if (!sprites && layer.name === 'right_land_perch') drawRightLand(g, state, layoutNow);
      else if (layer.name === 'heron') drawHeronSprite(layoutNow, now);
      else if (layer.name === 'animal_lab_preview') drawAnimalLabPreview(g, state, layoutNow, now);
      else if (layer.name === 'wildlife_cameos') drawWildlifeCameos(g, state, layoutNow, now);
      else if (!sprites && layer.name === 'fog_low') drawFog(g, state, layoutNow, now, false);
      else if (!sprites && layer.name === 'fog_high') drawFog(g, state, layoutNow, now, true);
      else if (layer.name === 'depth_veil') drawDepthVeil(g, state, layoutNow, now);
      else if (layer.name === 'foreground_grade') drawGrade(g, state, layoutNow);
    }

    setSprites(layoutNow, now);
    drawRodAndFishing(layoutNow, now);
    if (flags.grid) drawGrid(layerGraphics.debug_overlay, layoutNow.nativeW, layoutNow.nativeH);
    if (flags.bounds) drawBounds(layerGraphics.debug_overlay, layoutNow);
  }

  function startFishing(now = performance.now(), requestedOutcomeKey = null, requestedSpeciesKey = null, requestedSizeKey = null) {
    if (fishing.active || !currentLayout().fishingWaterAvailable) return false;
    fishing.outcome = requestedOutcomeKey
      ? outcomeByKey(requestedOutcomeKey)
      : chooseFishingOutcome(lastOutcomeKey);
    const requestedSpecies = FISH_OPTIONS.find((option) => option.key === requestedSpeciesKey);
    fishing.species = fishing.outcome.speciesKey
      ? speciesForOutcome(fishing.outcome, lastSpeciesKey)
      : requestedSpecies && fishing.outcome.catchType === 'fish'
        ? requestedSpecies
        : speciesForOutcome(fishing.outcome, lastSpeciesKey);
    fishing.sizeKey = fishing.outcome.catchType === 'fish'
      ? (FISH_SIZE_KEYS.includes(requestedSizeKey) ? requestedSizeKey : (Math.random() < 0.5 ? 'regular' : 'large'))
      : 'regular';
    const historyKey = scriptPoolKey(fishing.outcome, fishing.species, fishing.sizeKey);
    fishing.script = chooseFishingScript(
      fishing.outcome.key,
      fishing.species.key,
      fishing.sizeKey,
      lastScriptByPool.get(historyKey) || null,
    );
    lastOutcomeKey = fishing.outcome.key;
    lastScriptByPool.set(historyKey, fishing.script.key);
    if (fishing.outcome.catchType === 'fish') lastSpeciesKey = fishing.species.key;
    fishing.teaseCount = Math.random() < 0.42 ? 2 : 1;
    fishing.timeline = buildFishingTimeline(fishing.teaseCount, fishing.outcome);
    fishing.total = timelineTotal(fishing.timeline);
    fishing.active = true;
    fishing.start = now;
    fishing.barked = false;
    fishing.audioPhase = null;
    fishing.emergeSplashPlayed = false;
    fishing.currentLine = '';
    flags.sampleChat = false;
    return true;
  }

  function forceFishingPhase(name, progress = 0.5, speciesKey = 'bass', outcomeKeyOrNow = 'normal', maybeNow = performance.now(), sizeKey = 'regular') {
    const outcomeKey = typeof outcomeKeyOrNow === 'string' ? outcomeKeyOrNow : 'normal';
    const now = typeof outcomeKeyOrNow === 'number' ? outcomeKeyOrNow : maybeNow;
    fishing.outcome = outcomeByKey(outcomeKey);
    const forcedSpecies = FISH_OPTIONS.find((option) => option.key === speciesKey) || FISH_OPTIONS[0];
    fishing.species = fishing.outcome.catchType === 'weeds'
      ? SPECIAL_CATCHES.weeds
      : fishing.outcome.speciesKey
        ? speciesForOutcome(fishing.outcome, null)
        : forcedSpecies;
    fishing.sizeKey = fishing.outcome.catchType === 'fish' && FISH_SIZE_KEYS.includes(sizeKey) ? sizeKey : 'regular';
    fishing.script = scriptsForOutcome(fishing.outcome.key, fishing.species.key, fishing.sizeKey)[0] || DEFAULT_SCRIPT;
    lastOutcomeKey = fishing.outcome.key;
    lastScriptByPool.set(scriptPoolKey(fishing.outcome, fishing.species), fishing.script.key);
    if (fishing.outcome.catchType === 'fish') lastSpeciesKey = fishing.species.key;
    fishing.teaseCount = name === 'tease' ? 2 : 1;
    fishing.timeline = buildFishingTimeline(fishing.teaseCount, fishing.outcome);
    fishing.total = timelineTotal(fishing.timeline);
    const cursor = timelineCursorFor(name, fishing.timeline);
    fishing.active = true;
    fishing.start = now - cursor.start - cursor.duration * clamp(Number(progress), 0, 0.98);
    fishing.barked = fishing.outcome.noBark ? false : name !== 'bite';
    fishing.audioPhase = name;
    fishing.emergeSplashPlayed = name === 'reel' && Number(progress) >= FISH_EMERGE_PROGRESS;
    fishing.currentLine = '';
    flags.sampleChat = false;
    lastNow = now;
    draw(now);
    return true;
  }

  function handlePointer(worldPoint, now = performance.now()) {
    const layoutNow = currentLayout();
    const avatarPoint = entityPoint('avatar', layoutNow);
    const dogPoint = entityPoint('dog', layoutNow);
    const heronStateNow = heronRuntimeState(layoutNow, now);
    const ax = avatarPoint.x;
    const ay = avatarPoint.y;
    const hitAvatar = (
      worldPoint.x >= ax - (layoutNow.compact ? 12 : 16)
      && worldPoint.x <= ax + (layoutNow.compact ? 4 : 18)
      && worldPoint.y >= ay - 58
      && worldPoint.y <= ay + 5
    );
    if (hitAvatar) {
      return fishing.active ? null : startFishing(now) ? 'fishing' : null;
    }
    const dogMove = dogOffset(now, layoutNow);
    const dx = Math.abs(worldPoint.x - (dogPoint.x + dogMove.x));
    const dy = Math.abs(worldPoint.y - (dogPoint.y - 8));
    if (dx <= 14 && dy <= 13 && dogState.mode !== 'away') {
      if (triggerDogClick(now)) {
        audio.play('dog_click_woof');
        return 'dog';
      }
      return null;
    }
    if (
      heronStateNow.visible
      && worldPoint.x >= heronStateNow.x - 13
      && worldPoint.x <= heronStateNow.x + 13
      && worldPoint.y >= heronStateNow.y - 24
      && worldPoint.y <= heronStateNow.y + 3
    ) {
      if (triggerHeron(now)) {
        audio.play('heron_takeoff');
        return 'heron';
      }
      return null;
    }
    const farBirdTarget = farBirdAtPoint(worldPoint);
    if (triggerFarBird(farBirdTarget, now)) {
      audio.play('far_bird_squawk');
      return 'far_bird';
    }
    const wildlifeTarget = wildlifeAtPoint(worldPoint, layoutNow, now);
    if (wildlifeTarget) {
      audio.play(`${wildlifeTarget.kind}_call`);
      return wildlifeTarget.kind;
    }
    if (pointerSurfaceAt(worldPoint, layoutNow, now).surface === 'water') {
      const y = Math.max(worldPoint.y, layoutNow.waterY + 2);
      addWaterPlop(worldPoint.x, y, now);
      audio.play('water_plop', { depth: waterDepthAt(y, layoutNow) });
      return 'water';
    }
    return null;
  }

  function exportConfig() {
    const layers = {};
    for (const [name, state] of Object.entries(layerStates)) {
      if (!state.export) continue;
      layers[name] = {
        variant: state.variant,
        visible: state.visible,
        opacity: Number(state.opacity),
        x: Number(state.x),
        y: Number(state.y),
        screenX: Number(state.screenX),
        screenY: Number(state.screenY),
        speed: Number(state.speed),
        ...(state.blendModes.length ? { blendMode: state.blendMode } : {}),
      };
    }
    const entities = {};
    for (const [name, state] of Object.entries(entityStates)) {
      entities[name] = {
        variant: state.variant,
        visible: state.visible,
        opacity: Number(state.opacity),
        scale: Number(state.scale),
        x: Number(state.x),
        y: Number(state.y),
      };
    }
    return {
      version: VERSION,
      layout: clone(layoutState),
      layers,
      entities,
      rig: clone(rigState),
      water: clone(waterState),
      reflection: clone(reflectionState),
      animalLab: clone(animalLabState),
      fishDisplay: clone(fishDisplayState),
      wildlife: {
        force: wildlife.force,
        tuning: clone(wildlifeTuningState),
      },
      dogEasterEgg: {
        clickThreshold: DOG_EASTER_EGG_DEFAULTS.clickThreshold,
      },
      heron: {
        visible: heronState.visible,
      },
      audio: {
        muted: audio.debug.muted,
        masterGain: audio.debug.masterGain,
      },
    };
  }

  function importConfig(config) {
    if (fishing.active) {
      fishing.active = false;
      fishing.currentLine = '';
      fishing.audioPhase = null;
      fishing.emergeSplashPlayed = false;
      fishing.barked = false;
    }
    if (config.layout) {
      layoutState.dockBaselinePercentFromBottom = Number(
        config.layout.dockBaselinePercentFromBottom ?? layoutState.dockBaselinePercentFromBottom,
      );
      for (const name of Object.keys(layoutState.actorScreenX)) {
        layoutState.actorScreenX[name] = Number(
          config.layout.actorScreenX?.[name] ?? layoutState.actorScreenX[name],
        );
      }
    }
    for (const [name, next] of Object.entries(config.layers || {})) {
      if (!Object.hasOwn(layerStates, name)) continue;
      Object.assign(layerStates[name], {
        variant: next.variant || layerStates[name].variant,
        visible: next.visible !== false,
        opacity: Number(next.opacity ?? layerStates[name].opacity),
        x: Number(next.x ?? layerStates[name].x),
        y: Number(next.y ?? layerStates[name].y),
        screenX: Number(next.screenX ?? layerStates[name].screenX),
        screenY: Number(next.screenY ?? layerStates[name].screenY),
        speed: Number(next.speed ?? layerStates[name].speed),
        blendMode: layerStates[name].blendModes.includes(next.blendMode)
          ? next.blendMode
          : (layerStates[name].blendModes.length
            ? (LAYERS.find((layer) => layer.name === name)?.blendMode || 'normal')
            : layerStates[name].blendMode),
      });
    }
    const legacyEntityPositions = !config.layout;
    for (const [name, next] of Object.entries(config.entities || {})) {
      if (!Object.hasOwn(entityStates, name)) continue;
      const keepLayoutOffset = legacyEntityPositions && (name === 'avatar' || name === 'dog');
      const requestedVariant = name === 'fish' && !ACTIVE_CATCH_VARIANTS.includes(next.variant)
        ? ENTITY_DEFAULTS.fish.variant
        : next.variant;
      Object.assign(entityStates[name], {
        variant: requestedVariant || entityStates[name].variant,
        visible: next.visible !== false,
        opacity: Number(next.opacity ?? entityStates[name].opacity),
        scale: Number(next.scale ?? entityStates[name].scale),
        x: keepLayoutOffset ? entityStates[name].x : Number(next.x ?? entityStates[name].x),
        y: keepLayoutOffset ? entityStates[name].y : Number(next.y ?? entityStates[name].y),
      });
    }
    if (config.rig) {
      if (config.rig.rodBaseOffset) Object.assign(rigState.rodBaseOffset, {
        x: Number(config.rig.rodBaseOffset.x ?? rigState.rodBaseOffset.x),
        y: Number(config.rig.rodBaseOffset.y ?? rigState.rodBaseOffset.y),
      });
      for (const name of Object.keys(rigState.rodTipOffsets)) {
        if (!config.rig.rodTipOffsets?.[name]) continue;
        Object.assign(rigState.rodTipOffsets[name], {
          x: Number(config.rig.rodTipOffsets[name].x ?? rigState.rodTipOffsets[name].x),
          y: Number(config.rig.rodTipOffsets[name].y ?? rigState.rodTipOffsets[name].y),
        });
      }
      if (config.rig.castTargetOffset) Object.assign(rigState.castTargetOffset, {
        x: Number(config.rig.castTargetOffset.x ?? rigState.castTargetOffset.x),
        y: Number(config.rig.castTargetOffset.y ?? rigState.castTargetOffset.y),
      });
      if (config.rig.returnTargetOffset) Object.assign(rigState.returnTargetOffset, {
        x: Number(config.rig.returnTargetOffset.x ?? rigState.returnTargetOffset.x),
        y: Number(config.rig.returnTargetOffset.y ?? rigState.returnTargetOffset.y),
      });
      rigState.lineSlack = Number(config.rig.lineSlack ?? rigState.lineSlack);
      rigState.bobberVariant = 'classic_red_white';
    }
    if (config.water) {
      if (config.water.shimmerStyle && SHIMMER_STYLES.includes(config.water.shimmerStyle)) {
        waterState.shimmerStyle = config.water.shimmerStyle;
      }
      waterState.sparkleIntensity = Number(config.water.sparkleIntensity ?? waterState.sparkleIntensity);
      waterState.sparkleDensity = Number(config.water.sparkleDensity ?? waterState.sparkleDensity);
      waterState.pulseSpeed = Number(config.water.pulseSpeed ?? waterState.pulseSpeed);
      waterState.hazeDriftPxPerSec = Number(config.water.hazeDriftPxPerSec ?? waterState.hazeDriftPxPerSec);
      waterState.farWaterRiseScreenPx = normalizeFarWaterRise(
        config.water.farWaterRiseScreenPx ?? waterState.farWaterRiseScreenPx,
      );
      waterlineMaskRenderKey = '';
    }
    if (config.reflection) {
      const next = config.reflection;
      const legacySchema = Number(next.schemaVersion || 1) < 2;
      reflectionState.schemaVersion = REFLECTION_DEFAULTS.schemaVersion;
      if (Object.hasOwn(next, 'visible')) reflectionState.visible = next.visible !== false;
      reflectionState.x = Number(next.x ?? reflectionState.x);
      reflectionState.y = legacySchema
        ? Number(next.y ?? 8) - 8
        : Number(next.y ?? reflectionState.y);
      reflectionState.screenX = Number(next.screenX ?? reflectionState.screenX);
      reflectionState.screenY = Number(next.screenY ?? reflectionState.screenY);
      reflectionState.scaleY = clamp(Number(next.scaleY ?? reflectionState.scaleY), 0.05, 1.4);
      reflectionState.opacity = clamp(Number(next.opacity ?? reflectionState.opacity), 0, 1);
      reflectionState.fadeHeight = clamp(Number(next.fadeHeight ?? reflectionState.fadeHeight), 8, 260);
      reflectionState.breakup = clamp(Number(next.breakup ?? reflectionState.breakup), 0, 1);
      if (typeof next.tint === 'string' && /^#[0-9a-f]{6}$/i.test(next.tint)) reflectionState.tint = next.tint;
      if (REFLECTION_BLEND_MODES.includes(next.blendMode)) reflectionState.blendMode = next.blendMode;
      if (Object.hasOwn(next, 'solo')) reflectionState.solo = Boolean(next.solo);
      if (next.sources) {
        for (const sourceLayer of REFLECTION_SOURCE_OPTIONS) {
          if (Object.hasOwn(next.sources, sourceLayer)) {
            reflectionState.sources[sourceLayer] = Boolean(next.sources[sourceLayer]);
          }
        }
      }
      if (next.sourceTuning) {
        for (const sourceLayer of REFLECTION_SOURCE_OPTIONS) {
          const tuning = next.sourceTuning[sourceLayer];
          if (!tuning) continue;
          reflectionState.sourceTuning[sourceLayer].opacity = clamp(
            Number(tuning.opacity ?? reflectionState.sourceTuning[sourceLayer].opacity),
            0,
            2,
          );
          reflectionState.sourceTuning[sourceLayer].x = Number(
            tuning.x ?? reflectionState.sourceTuning[sourceLayer].x ?? 0,
          );
          reflectionState.sourceTuning[sourceLayer].y = Number(
            tuning.y ?? reflectionState.sourceTuning[sourceLayer].y,
          );
          reflectionState.sourceTuning[sourceLayer].height = clamp(
            Number(tuning.height ?? reflectionState.sourceTuning[sourceLayer].height ?? 100),
            10,
            300,
          );
        }
      }
    }
    if (config.animalLab) {
      const next = config.animalLab;
      animalLabState.visible = Boolean(next.visible);
      if (ANIMAL_LAB_FAMILIES.includes(next.family)) {
        animalLabState.family = next.family;
        animalLabState.variant = ANIMAL_LAB_RECOMMENDED_VARIANTS[next.family] || ANIMAL_LAB_VARIANTS[next.family][0];
        animalLabState.state = ANIMAL_LAB_STATES[next.family][0];
      }
      if (ANIMAL_LAB_VARIANTS[animalLabState.family]?.includes(next.variant)) animalLabState.variant = next.variant;
      if (ANIMAL_LAB_STATES[animalLabState.family]?.includes(next.state)) animalLabState.state = next.state;
      animalLabState.playing = next.playing !== false;
      animalLabState.frame = Number(next.frame ?? animalLabState.frame);
      animalLabState.frameMs = Math.max(80, Number(next.frameMs ?? animalLabState.frameMs));
      animalLabAnimationEpoch = (lastNow || performance.now()) - Math.max(0, animalLabState.frame) * animalLabState.frameMs;
      animalLabState.speedPxPerSec = Number(next.speedPxPerSec ?? animalLabState.speedPxPerSec);
      animalLabState.opacity = clamp(Number(next.opacity ?? animalLabState.opacity), 0, 1);
      animalLabState.scale = Math.max(1, Math.round(Number(next.scale ?? animalLabState.scale)));
      animalLabState.x = Number(next.x ?? animalLabState.x);
      animalLabState.y = Number(next.y ?? animalLabState.y);
      animalLabState.screenX = Number(next.screenX ?? animalLabState.screenX);
      animalLabState.screenY = Number(next.screenY ?? animalLabState.screenY);
      animalLabState.showBounds = next.showBounds !== false;
    }
    if (config.fishDisplay) {
      fishDisplayState.reelScale = Number(config.fishDisplay.reelScale ?? fishDisplayState.reelScale);
      fishDisplayState.holdScale = Number(config.fishDisplay.holdScale ?? fishDisplayState.holdScale);
      fishDisplayState.heldYOffset = Number(config.fishDisplay.heldYOffset ?? fishDisplayState.heldYOffset);
      fishDisplayState.fightWiggle = Number(config.fishDisplay.fightWiggle ?? fishDisplayState.fightWiggle);
      if (config.fishDisplay.mouthOffset) Object.assign(fishDisplayState.mouthOffset, {
        x: Number(config.fishDisplay.mouthOffset.x ?? fishDisplayState.mouthOffset.x),
        y: Number(config.fishDisplay.mouthOffset.y ?? fishDisplayState.mouthOffset.y),
      });
    }
    if (config.wildlife?.tuning) {
      for (const kind of Object.keys(wildlifeTuningState)) {
        const next = config.wildlife.tuning[kind];
        if (!next) continue;
        Object.assign(wildlifeTuningState[kind], {
          speedPxPerSec: Number(next.speedPxPerSec ?? wildlifeTuningState[kind].speedPxPerSec),
          frameMs: Math.max(160, Number(next.frameMs ?? wildlifeTuningState[kind].frameMs)),
          opacity: Number(next.opacity ?? wildlifeTuningState[kind].opacity),
          yOffset: Number(next.yOffset ?? wildlifeTuningState[kind].yOffset),
        });
      }
    }
    if (config.wildlife?.force && WILDLIFE_FORCE_OPTIONS.includes(config.wildlife.force)) {
      wildlife.force = config.wildlife.force;
      if (wildlife.force === 'none') {
        wildlife.active = false;
        wildlife.kind = null;
        clearWildlifeSprites();
      } else {
        startWildlifeCameo(wildlife.force, performance.now(), 0.36);
      }
    }
    if (config.heron) {
      heronState.visible = config.heron.visible !== false;
    }
    if (config.audio) {
      if (Object.hasOwn(config.audio, 'muted')) audio.setMuted(Boolean(config.audio.muted));
      if (Object.hasOwn(config.audio, 'masterGain')) audio.setMasterGain(Number(config.audio.masterGain));
    }
  }

  const initialConfig = exportConfig();

  function resetLayer(name) {
    const layer = LAYERS.find((entry) => entry.name === name);
    if (!layer) return;
    layerStates[name] = makeLayerState(layer);
  }

  function resetEntity(name) {
    const current = exportConfig();
    const initial = initialConfig.entities[name];
    if (!initial) return;
    current.entities[name] = initial;
    importConfig(current);
  }

  function layerRuntime(name) {
    const state = layerStates[name];
    if (!state) return null;
    const layoutNow = currentLayout();
    const now = lastNow || performance.now();
    if (name === 'reflection_mirror') {
      return reflectionRuntime();
    }
    const textureKey = layerTextureKey(name, state.variant, now, 0, state.frameMs)
      || layerTextureKey(name, state.variants[0], now, 0, state.frameMs);
    const texture = textureKey ? textures[textureKey] : null;
    return {
      offset: layerPosition(name, state, layoutNow),
      texture: texture ? { width: Math.round(texture.width || 0), height: Math.round(texture.height || 0) } : null,
      nativeView: { width: layoutNow.nativeW, height: layoutNow.nativeH },
      zIndex: layerContainers[name]?.zIndex ?? state.zIndex,
      blendMode: state.blendMode,
      effectiveBlendMode: name === 'cloud_drift'
        ? (state.blendMode === 'lighten' ? 'max' : state.blendMode)
        : state.blendMode,
      positions: texture ? spritePositionsFor(name, state, texture, layoutNow, now) : [],
    };
  }

  function layerOrderRuntime() {
    return Object.fromEntries(Object.entries(layerContainers).map(([name, container]) => [name, container.zIndex]));
  }

  function layoutRuntime() {
    const layoutNow = currentLayout();
    const foreground = layerStates.foreground_dock_shore;
    const foregroundOffset = foreground ? layerPosition('foreground_dock_shore', foreground, layoutNow) : null;
    const foregroundSurface = foreground ? foregroundDockSurface(foreground) : null;
    const hand = handPoint(layoutNow);
    const idleRodTip = rodTipFor(hand, { name: 'idle', p: 0 }, rigState);
    const anchors = fishingAnchors(layoutNow, currentFishingPhase());
    return {
      nativeView: { width: layoutNow.nativeW, height: layoutNow.nativeH },
      waterY: layoutNow.waterY,
      compact: Boolean(layoutNow.compact),
      safeArea: layoutNow.safeArea || null,
      fishingWaterAvailable: layoutNow.fishingWaterAvailable,
      dockTipX: layoutNow.dockTipX ?? null,
      baseDockSurfaceY: layoutNow.baseDockSurfaceY,
      dockGroupOffsetY: layoutNow.dockGroupOffsetY,
      dockSurfaceY: layoutNow.dockSurfaceY,
      dockBaselinePercentFromBottom: Number(layoutState.dockBaselinePercentFromBottom),
      effectiveDockPercentFromBottom: Number(((layoutNow.nativeH - layoutNow.dockSurfaceY) / layoutNow.nativeH * 100).toFixed(3)),
      layout: clone(layoutState),
      avatar: entityPoint('avatar', layoutNow),
      dog: entityPoint('dog', layoutNow),
      hand,
      idleRodTip,
      anchors,
      castTarget: layoutNow.castTarget,
      returnTarget: returnPointWithRig(layoutNow, hand, rigState),
      sparkleSample: sparkleMarks(layoutNow, lastNow || performance.now()).slice(0, 16),
      foregroundDockShore: foreground && foregroundOffset && foregroundSurface ? {
        variant: foreground.variant,
        offset: foregroundOffset,
        surface: foregroundSurface,
        surfaceScreenY: foregroundOffset.y + foregroundSurface.y,
        avatarAnchorScreenX: foregroundOffset.x + foregroundSurface.avatarAnchorX,
      } : null,
    };
  }

  function fishingRuntime() {
    const now = lastNow || performance.now();
    const layoutNow = currentLayout();
    const phase = currentFishingPhase(now);
    const hand = handPoint(layoutNow);
    const anchors = fishingAnchors(layoutNow, phase, now);
    const activeVariant = activeCatchVariant();
    const fishTexture = fishTextureFor(textures, activeVariant, phase);
    const display = fishDisplayFor(layoutNow, phase, now, fishTexture);
    const frameMeta = fishFrameMeta(activeVariant, display.state);
    const lineAttached = fishing.active && lineAttachedForPhase(phase.name, fishing.outcome);
    const currentLine = messageForPhase(phase, fishing.species, fishing.script);
    const reelContactSplash = reelContactSplashFor(phase, anchors.rodTip, anchors, fishing.species);
    const chatOrigin = chatOriginPoint(layoutNow);
    const textureHeight = Number(frameMeta?.textureSize?.height || fishTexture?.height || 0);
    const alphaBox = frameMeta?.alphaBBox;
    const alphaBottomY = display.mouth && alphaBox && textureHeight
      ? display.mouth.y + (
        Number(alphaBox[3])
        - Number(display.anchor?.y || 0) * textureHeight
      ) * display.scale
      : null;
    return {
      active: fishing.active,
      phase: phase.name,
      progress: Number(phase.p || 0),
      outcomeKey: fishing.outcome.key,
      catchType: fishing.outcome.catchType,
      noBark: Boolean(fishing.outcome.noBark),
      smallSplash: Boolean(fishing.outcome.smallSplash),
      barked: Boolean(fishing.barked),
      scriptKey: fishing.script.key,
      hasCatch: outcomeHasCatch(fishing.outcome),
      currentLine,
      nativeView: { width: layoutNow.nativeW, height: layoutNow.nativeH },
      species: fishing.species.label,
      speciesKey: fishing.species.key,
      fishSizeClass: fishing.species.sizeClass || 'special',
      fishSizeRank: Number(fishing.species.sizeRank || 0),
      fishSizeKey: fishing.sizeKey,
      fishVariant: activeVariant,
      fishState: fishStateForPhase(phase),
      fishTextureSize: fishTexture ? { width: fishTexture.width, height: fishTexture.height } : null,
      fishAlphaBBox: frameMeta?.alphaBBox || (fishTexture ? [0, 0, fishTexture.width, fishTexture.height] : null),
      teaseCount: fishing.teaseCount,
      lineAttached,
      lineMode: lineAttached ? (lineIsTautForPhase(phase) ? 'taut' : 'slack') : 'detached',
      fishVisible: display.visible,
      fishMode: display.mode,
      fishMouth: display.mouth,
      fishBody: display.body,
      fishVisibleCenter: display.visibleCenter,
      fishRotation: display.rotation,
      fishAnchor: display.anchor,
      fishScale: display.scale * Number(entityStates.fish.scale || 1),
      fishAlphaBottomY: alphaBottomY,
      fishDisplay: clone(fishDisplayState),
      reelStage: reelStageForPhase(phase),
      surfaceBreakProgress: surfaceBreakProgress(phase),
      reelContactSplash,
      bobberDip: bobberDipFor(phase, now),
      anchors: fishingAnchors(layoutNow, phase, now),
      hand,
      chatOrigin,
      chatbox: chatboxLayout(layoutNow.nativeW, layoutNow.nativeH, currentLine, chatOrigin),
      timeline: clone(fishing.timeline),
    };
  }

  function wildlifeRuntime() {
    const now = lastNow || performance.now();
    const layoutNow = currentLayout();
    const state = layerStates.wildlife_cameos;
    const render = wildlifeRenderState(layoutNow, now);
    const sprite = render ? wildlifeSprites[render.kind] : null;
    return {
      force: wildlife.force,
      active: wildlife.active,
      kind: wildlife.kind,
      visible: Boolean(render && state.visible),
      phase: render?.phase || 'idle',
      progress: render?.progress || 0,
      frame: render?.frame ?? null,
      frameKey: render?.frameKey ?? null,
      alpha: render?.alpha ?? null,
      position: render ? { x: render.x, y: render.y } : null,
      direction: render?.direction ?? null,
      textureSize: sprite?.texture ? { width: Math.round(sprite.texture.width), height: Math.round(sprite.texture.height) } : null,
      durationMs: wildlife.duration || (wildlife.kind ? wildlifeDurationFor(wildlife.kind, layoutNow) : null),
      pathPx: render?.pathPx || (wildlife.kind ? wildlifePathLength(wildlife.kind, layoutNow) : null),
      speedPxPerSec: render?.speedPxPerSec || (wildlife.kind ? wildlifeTuningState[wildlife.kind]?.speedPxPerSec : null),
      frameMs: render?.frameMs || (wildlife.kind ? wildlifeTuningState[wildlife.kind]?.frameMs : null),
      spriteScaleX: sprite ? Number(sprite.scale.x) : null,
      fishingBlocked: wildlifeBlocked(),
      catchCount: wildlife.catchCount,
      swimmerSeen: wildlife.swimmerSeen,
      mooseSeen: wildlife.mooseSeen,
      nextSwimmerInMs: Math.max(0, Math.round(wildlife.nextSwimmerAt - now)),
      nextMooseInMs: Math.max(0, Math.round(wildlife.nextMooseAt - now)),
      layerVisible: state.visible,
      layerOpacity: Number(state.opacity),
      tuning: clone(wildlifeTuningState),
      waterContact: wildlifeContactRuntime,
      stableHitPoint: wildlifeStableHitPoint(render),
    };
  }

  function waterRuntime() {
    const layoutNow = currentLayout();
    const now = lastNow || performance.now();
    return {
      ...clone(waterState),
      depthVeilOpacity: Number(layerStates.depth_veil?.opacity ?? 0),
      lakeShimmerOpacity: Number(layerStates.lake_shimmer?.opacity ?? 0),
      shimmerPulse: shimmerPulse(layerStates.lake_shimmer || {}, now),
      hazeDriftPx: Number((now / 1000 * Number(waterState.hazeDriftPxPerSec || 0)).toFixed(3)),
      sparkleSample: sparkleMarks(layoutNow, now).slice(0, 20),
      sparkleCount: sparkleMarks(layoutNow, now).length,
      plopCount: waterPlops.length,
      plops: waterPlops.map((plop) => ({
        x: plop.x,
        y: plop.y,
        scale: Number(waterPlopScale(plop, layoutNow).toFixed(3)),
      })),
      shorelineMask: clone(waterlineMaskRuntime),
      nativeView: { width: layoutNow.nativeW, height: layoutNow.nativeH },
    };
  }

  function reflectionRuntime() {
    const layoutNow = currentLayout();
    const now = lastNow || performance.now();
    const entries = reflectionMirrorEntries(layoutNow, now);
    const occlusionEntries = reflectionMirrorEntries(layoutNow, now, true);
    return {
      ...clone(reflectionState),
      offset: reflectionMirrorOffset(layoutNow),
      blendMode: reflectionBlendMode(),
      nativeView: { width: layoutNow.nativeW, height: layoutNow.nativeH },
      zIndex: layerContainers.reflection_mirror?.zIndex ?? null,
      compositionOrder: [...reflectionCompositionRuntime.compositionOrder],
      occluders: clone(reflectionCompositionRuntime.occluders),
      footprints: clone(reflectionCompositionRuntime.footprints),
      backFarOverlapPixels: reflectionCompositionRuntime.backFarOverlapPixels,
      samplerStatus: clone(reflectionCompositionRuntime.samplerStatus),
      degraded: Boolean(reflectionCompositionRuntime.degraded),
      occlusionSources: occlusionEntries.map((entry) => ({
        sourceLayer: entry.sourceLayer,
        sourceVariant: entry.sourceVariant,
        drawEnabled: entry.drawEnabled,
        positions: entry.positions,
      })),
      activeSources: entries.map((entry) => ({
        sourceLayer: entry.sourceLayer,
        sourceVariant: entry.sourceVariant,
        profile: entry.profile,
        sourceTuning: entry.sourceTuning,
        opacity: entry.opacity,
        sourceTexture: entry.sourceTextureSize,
        texture: entry.textureSize,
        displayScale: entry.displayScale,
        samplerStatus: entry.samplerStatus,
        positions: entry.positions,
      })),
    };
  }

  function animalLabRuntime() {
    const layoutNow = currentLayout();
    const now = lastNow || performance.now();
    const variant = animalLabVariant();
    const frameName = animalLabFrameName(now);
    const texture = textures[`animalLab:${variant}_${frameName}`];
    const point = animalLabPoint(layoutNow);
    return {
      ...clone(animalLabState),
      variant,
      variants: clone(ANIMAL_LAB_VARIANTS),
      states: clone(ANIMAL_LAB_STATES),
      frameName,
      frameNames: animalLabFrameNames(),
      position: point,
      layerZIndex: layerContainers.animal_lab_preview?.zIndex ?? null,
      textureSize: texture ? { width: Math.round(texture.width), height: Math.round(texture.height) } : null,
      metadata: animalLabMetadata?.families?.[animalLabState.family]?.[variant] || null,
      waterContact: animalLabContactRuntime,
    };
  }

  function dogRuntime() {
    const now = lastNow || performance.now();
    const layoutNow = currentLayout();
    const point = entityPoint('dog', layoutNow);
    const move = dogOffset(now, layoutNow);
    const walkFrame = Math.floor(Math.max(0, now - dogState.modeStart) / DOG_WALK_FRAME_MS) % DOG_WALK_FRAME_COUNT;
    const textureFrame = dogState.mode === 'walkOff'
      ? `walk_left_f${walkFrame}`
      : (dogState.mode === 'return' ? `walk_right_f${walkFrame}` : (now < dogState.wagUntil ? 'wag' : entityStates.dog.variant));
    return {
      mode: dogState.mode,
      clickCount: dogState.clickCount,
      visible: entityStates.dog.visible && dogState.mode !== 'away',
      position: { x: Math.round(point.x + move.x), y: Math.round(point.y + move.y) },
      travelDirection: dogState.mode === 'walkOff' ? -1 : (dogState.mode === 'return' ? 1 : 0),
      textureVariant: dogState.mode === 'walkOff'
        ? 'walk_left'
        : (dogState.mode === 'return' ? 'walk_right' : 'idle'),
      textureFrame,
      awayInMs: Math.max(0, Math.round(dogState.awayUntil - now)),
      defaults: clone(DOG_EASTER_EGG_DEFAULTS),
    };
  }

  function heronRuntime() {
    const now = lastNow || performance.now();
    return heronRuntimeState(currentLayout(), now);
  }

  function retimeActiveWildlife(kind, now = performance.now()) {
    if (!wildlife.active || wildlife.kind !== kind) return;
    const progress = clamp((now - wildlife.start) / Math.max(1, wildlife.duration), 0, 0.95);
    wildlife.duration = wildlifeDurationFor(kind, currentLayout());
    wildlife.start = now - wildlife.duration * progress;
  }

  function update(now) {
    if (flags.paused) return;
    lastNow = now;
    draw(now);
  }

  draw(performance.now());

  return {
    update,
    get dialogueBounds() { return dialogueBounds; },
    handlePointer,
    startFishing,
    triggerToronto,
    renderer,
    debug: {
      get scaleReport() { return renderer.scaleReport; },
      get layers() { return Object.values(layerStates).filter((state) => state.studio); },
      get entities() { return Object.values(entityStates).map((state, index) => ({ ...state, name: Object.keys(entityStates)[index] })); },
      get layout() { return clone(layoutState); },
      get rig() { return clone(rigState); },
      get water() { return waterRuntime(); },
      get reflection() { return reflectionRuntime(); },
      get animalLab() { return animalLabRuntime(); },
      get fishDisplay() { return clone(fishDisplayState); },
      get wildlife() { return wildlifeRuntime(); },
      get dogEasterEgg() { return dogRuntime(); },
      get heron() { return heronRuntime(); },
      get farBirds() { return farBirdRuntime(); },
      get toronto() { return torontoRuntime(); },
      get audio() { return clone(audio.debug); },
      get fishingScripts() { return clone(FISHING_SCRIPTS); },
      get fishingOutcomes() { return clone(FISHING_OUTCOMES); },
      get fishOptions() { return clone(FISH_OPTIONS); },
      get fishingTimelineDefaults() { return clone(FISHING_TIMELINE); },
      chooseFishingScriptKey(outcomeKey = 'normal', speciesKey = 'bass', sizeKey = 'regular', previousKey = null) {
        return chooseFishingScript(outcomeKey, speciesKey, sizeKey, previousKey)?.key || null;
      },
      redraw() { draw(lastNow || performance.now()); },
      fishingTimelineForOutcome(outcomeKey = 'normal') {
        return buildFishingTimeline(1, outcomeByKey(outcomeKey));
      },
      layerOrder: layerOrderRuntime,
      layerRuntime,
      layoutRuntime,
      get fishingState() {
        const state = fishingRuntime();
        return {
          active: state.active,
          phase: state.phase,
          progress: state.progress,
          outcomeKey: state.outcomeKey,
          scriptKey: state.scriptKey,
          currentLine: state.currentLine,
          species: state.species,
          sizeKey: state.fishSizeKey,
          fishMode: state.fishMode,
          lineAttached: state.lineAttached,
        };
      },
      fishingRuntime,
      pointerSurfaceAt(x, y) {
        return pointerSurfaceAt(
          { x: Number(x), y: Number(y) },
          currentLayout(),
          lastNow || performance.now(),
        );
      },
      exportConfig,
      importConfig,
      setPaused(value) { flags.paused = value; },
      setGrid(value) { flags.grid = value; draw(lastNow || performance.now()); },
      setBounds(value) { flags.bounds = value; draw(lastNow || performance.now()); },
      setForceShimmer(value) { flags.forceShimmer = value; draw(lastNow || performance.now()); },
      setSampleChat(value) { flags.sampleChat = value; draw(lastNow || performance.now()); },
      setLayerVisible(name, value) { if (layerStates[name]) layerStates[name].visible = value; },
      setLayerOpacity(name, value) { if (layerStates[name]) layerStates[name].opacity = Number(value); },
      setLayerOffset(name, x, y) { if (layerStates[name]) Object.assign(layerStates[name], { x: Number(x), y: Number(y) }); },
      setLayerRelativeOffset(name, x, y) { if (layerStates[name]) Object.assign(layerStates[name], { screenX: Number(x), screenY: Number(y) }); },
      setLayerSpeed(name, value) { if (layerStates[name]) layerStates[name].speed = Number(value); },
      setLayerBlendMode(name, value) {
        if (layerStates[name]?.blendModes.includes(value)) layerStates[name].blendMode = value;
        draw(lastNow || performance.now());
      },
      setLayerVariant(name, value) { if (layerStates[name]) layerStates[name].variant = value; },
      resetLayer,
      setDockBaselinePercent(value) { layoutState.dockBaselinePercentFromBottom = Number(value); },
      setActorScreenX(name, value) {
        if (layoutState.actorScreenX[name] !== undefined) layoutState.actorScreenX[name] = Number(value);
      },
      resetLayout() {
        layoutState.dockBaselinePercentFromBottom = LAYOUT_DEFAULTS.dockBaselinePercentFromBottom;
        Object.assign(layoutState.actorScreenX, clone(LAYOUT_DEFAULTS.actorScreenX));
      },
      setEntityVisible(name, value) { if (entityStates[name]) entityStates[name].visible = value; },
      setEntityOpacity(name, value) { if (entityStates[name]) entityStates[name].opacity = Number(value); },
      setEntityScale(name, value) { if (entityStates[name]) entityStates[name].scale = Number(value); },
      setEntityOffset(name, x, y) { if (entityStates[name]) Object.assign(entityStates[name], { x: Number(x), y: Number(y) }); },
      setEntityVariant(name, value) {
        if (!entityStates[name]) return;
        if (name === 'fish' && !ACTIVE_CATCH_VARIANTS.includes(value)) return;
        entityStates[name].variant = value;
      },
      resetEntity,
      setRigPoint(group, axis, value) {
        const next = Number(value);
        if (group === 'rodBaseOffset') rigState.rodBaseOffset[axis] = next;
        else if (group === 'castTargetOffset') rigState.castTargetOffset[axis] = next;
        else if (group === 'returnTargetOffset') rigState.returnTargetOffset[axis] = next;
      },
      setRigTip(name, axis, value) {
        if (rigState.rodTipOffsets[name]) rigState.rodTipOffsets[name][axis] = Number(value);
      },
      setLineSlack(value) { rigState.lineSlack = Number(value); },
      setBobberVariant() { rigState.bobberVariant = 'classic_red_white'; },
      setWaterField(name, value) {
        if (name === 'shimmerStyle') {
          if (SHIMMER_STYLES.includes(value)) waterState.shimmerStyle = value;
        } else if (name === 'farWaterRiseScreenPx') {
          waterState.farWaterRiseScreenPx = normalizeFarWaterRise(value);
          waterlineMaskRenderKey = '';
        } else if (waterState[name] !== undefined) {
          waterState[name] = Number(value);
        }
        draw(lastNow || performance.now());
      },
      resetWater() {
        Object.assign(waterState, clone(WATER_DEFAULTS));
        waterlineMaskRenderKey = '';
        const depthLayer = LAYERS.find((entry) => entry.name === 'depth_veil');
        if (depthLayer && layerStates.depth_veil) layerStates.depth_veil.opacity = depthLayer.opacity;
        draw(lastNow || performance.now());
      },
      setReflectionField(name, value) {
        if (name === 'visible' || name === 'solo') {
          reflectionState[name] = Boolean(value);
        } else if (name === 'tint') {
          if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) reflectionState.tint = value;
        } else if (name === 'blendMode') {
          if (REFLECTION_BLEND_MODES.includes(value)) reflectionState.blendMode = value;
        } else if (reflectionState[name] !== undefined) {
          const next = Number(value);
          if (name === 'opacity') reflectionState.opacity = clamp(next, 0, 1);
          else if (name === 'scaleY') reflectionState.scaleY = clamp(next, 0.05, 1.4);
          else if (name === 'fadeHeight') reflectionState.fadeHeight = clamp(next, 8, 260);
          else if (name === 'breakup') reflectionState.breakup = clamp(next, 0, 1);
          else reflectionState[name] = next;
        }
        draw(lastNow || performance.now());
      },
      setReflectionSource(sourceLayer, value) {
        if (!REFLECTION_SOURCE_OPTIONS.includes(sourceLayer)) return;
        reflectionState.sources[sourceLayer] = Boolean(value);
        draw(lastNow || performance.now());
      },
      setReflectionSourceTuning(sourceLayer, field, value) {
        if (!REFLECTION_SOURCE_OPTIONS.includes(sourceLayer)) return;
        if (!reflectionState.sourceTuning[sourceLayer]) {
          reflectionState.sourceTuning[sourceLayer] = { opacity: 1, x: 0, y: 0, height: 100 };
        }
        const next = Number(value);
        if (field === 'opacity') reflectionState.sourceTuning[sourceLayer].opacity = clamp(next, 0, 2);
        else if (field === 'x') reflectionState.sourceTuning[sourceLayer].x = next;
        else if (field === 'y') reflectionState.sourceTuning[sourceLayer].y = next;
        else if (field === 'height') reflectionState.sourceTuning[sourceLayer].height = clamp(next, 10, 300);
        draw(lastNow || performance.now());
      },
      resetReflection() {
        Object.assign(reflectionState, clone(REFLECTION_DEFAULTS));
        draw(lastNow || performance.now());
      },
      setAnimalLabField(name, value) {
        const now = lastNow || performance.now();
        if (name === 'family') {
          if (!ANIMAL_LAB_FAMILIES.includes(value)) return;
          animalLabState.family = value;
          animalLabState.variant = ANIMAL_LAB_RECOMMENDED_VARIANTS[value] || ANIMAL_LAB_VARIANTS[value][0];
          animalLabState.state = ANIMAL_LAB_STATES[value][0];
          animalLabState.frame = 0;
          animalLabAnimationEpoch = now;
        } else if (name === 'variant') {
          if (ANIMAL_LAB_VARIANTS[animalLabState.family]?.includes(value)) {
            animalLabState.variant = value;
            animalLabState.frame = 0;
            animalLabAnimationEpoch = now;
          }
        } else if (name === 'state') {
          if (ANIMAL_LAB_STATES[animalLabState.family]?.includes(value)) {
            animalLabState.state = value;
            animalLabState.frame = 0;
            animalLabAnimationEpoch = now;
          }
        } else if (name === 'playing') {
          const playing = Boolean(value);
          if (animalLabState.playing && !playing) {
            const frames = animalLabFrameNames();
            animalLabState.frame = pingPongFrameIndex(now - animalLabAnimationEpoch, Math.max(80, Number(animalLabState.frameMs || 520)), frames.length);
          } else if (!animalLabState.playing && playing) {
            animalLabAnimationEpoch = now - Math.max(0, animalLabState.frame) * Math.max(80, Number(animalLabState.frameMs || 520));
          }
          animalLabState.playing = playing;
        } else if (name === 'visible' || name === 'showBounds') {
          animalLabState[name] = Boolean(value);
        } else if (animalLabState[name] !== undefined) {
          const next = Number(value);
          if (name === 'opacity') animalLabState.opacity = clamp(next, 0, 1);
          else if (name === 'scale') animalLabState.scale = Math.max(1, Math.round(next));
          else if (name === 'frameMs') {
            const currentFrame = animalLabState.playing
              ? pingPongFrameIndex(now - animalLabAnimationEpoch, Math.max(80, Number(animalLabState.frameMs || 520)), animalLabFrameNames().length)
              : animalLabState.frame;
            animalLabState.frameMs = Math.max(80, next);
            animalLabAnimationEpoch = now - currentFrame * animalLabState.frameMs;
          }
          else animalLabState[name] = next;
        }
        draw(lastNow || performance.now());
      },
      stepAnimalLabFrame() {
        const frames = animalLabFrameNames();
        animalLabState.playing = false;
        animalLabState.frame = (Math.round(Number(animalLabState.frame || 0)) + 1) % Math.max(1, frames.length);
        animalLabAnimationEpoch = lastNow || performance.now();
        draw(lastNow || performance.now());
      },
      forceAnimalLab(family, state = null) {
        if (!ANIMAL_LAB_FAMILIES.includes(family)) return;
        animalLabState.visible = true;
        animalLabState.family = family;
        animalLabState.variant = ANIMAL_LAB_RECOMMENDED_VARIANTS[family] || ANIMAL_LAB_VARIANTS[family][0];
        animalLabState.state = state && ANIMAL_LAB_STATES[family].includes(state) ? state : ANIMAL_LAB_STATES[family][0];
        animalLabState.playing = true;
        animalLabState.frame = 0;
        animalLabAnimationEpoch = lastNow || performance.now();
        draw(lastNow || performance.now());
      },
      resetAnimalLab() {
        Object.assign(animalLabState, clone(ANIMAL_LAB_DEFAULTS));
        animalLabAnimationEpoch = lastNow || performance.now();
        draw(lastNow || performance.now());
      },
      setFishDisplayField(name, value) {
        if (name === 'mouthOffsetX') fishDisplayState.mouthOffset.x = Number(value);
        else if (name === 'mouthOffsetY') fishDisplayState.mouthOffset.y = Number(value);
        else if (fishDisplayState[name] !== undefined) fishDisplayState[name] = Number(value);
        draw(lastNow || performance.now());
      },
      resetFishDisplay() {
        Object.assign(fishDisplayState, clone(FISH_DISPLAY_DEFAULTS));
        draw(lastNow || performance.now());
      },
      setWildlifeTuning(kind, field, value) {
        if (!wildlifeTuningState[kind] || wildlifeTuningState[kind][field] === undefined) return;
        wildlifeTuningState[kind][field] = Number(value);
        if (field === 'speedPxPerSec') retimeActiveWildlife(kind);
        draw(lastNow || performance.now());
      },
      resetWildlifeTuning() {
        for (const kind of Object.keys(wildlifeTuningState)) {
          Object.assign(wildlifeTuningState[kind], clone(WILDLIFE_TUNING_DEFAULTS[kind]));
          retimeActiveWildlife(kind);
        }
        draw(lastNow || performance.now());
      },
      setForceWildlifeCameo(value, progress = 0.36) {
        if (!WILDLIFE_FORCE_OPTIONS.includes(value)) return;
        wildlife.force = value;
        if (value === 'none') {
          wildlife.active = false;
          wildlife.kind = null;
          clearWildlifeSprites();
        } else {
          startWildlifeCameo(value, performance.now(), clamp(Number(progress), 0, 0.9));
        }
        draw(lastNow || performance.now());
      },
      resetWildlifeSchedule() {
        const now = performance.now();
        wildlife.active = false;
        wildlife.kind = null;
        wildlife.force = 'none';
        wildlife.swimmerSeen = false;
        wildlife.mooseSeen = false;
        wildlife.nextSwimmerAt = now + 5000 + Math.random() * 5000;
        wildlife.nextMooseAt = now + 10000 + Math.random() * 10000;
        clearWildlifeSprites();
        draw(lastNow || performance.now());
      },
      forceWaterPlop(x = null, y = null) {
        const layoutNow = currentLayout();
        addWaterPlop(
          x ?? Math.round(layoutNow.avatar.x + 48),
          y ?? foregroundWaterY(layoutNow),
          performance.now(),
        );
        draw(lastNow || performance.now());
      },
      forceDogWalkOff() {
        dogState.clickCount = DOG_EASTER_EGG_DEFAULTS.clickThreshold;
        dogState.mode = 'walkOff';
        dogState.modeStart = performance.now();
        dogState.awayUntil = 0;
        draw(lastNow || performance.now());
      },
      forceDogReturn() {
        dogState.mode = 'return';
        dogState.modeStart = performance.now();
        draw(lastNow || performance.now());
      },
      forceDogIdle() {
        dogState.mode = 'idle';
        dogState.clickCount = 0;
        dogState.modeStart = 0;
        dogState.awayUntil = 0;
        draw(lastNow || performance.now());
      },
      forceHeron(mode = 'flyAway') {
        if (mode === 'idle') {
          heronState.mode = 'idle';
          heronState.modeStart = 0;
          heronState.visible = true;
        } else if (mode === 'gone') {
          heronState.mode = 'gone';
          heronState.modeStart = performance.now();
          heronState.goneUntil = performance.now() + HERON_DEFAULTS.returnDelay;
        } else if (['alert', 'takeoff', 'flyAway', 'return', 'land'].includes(mode)) {
          heronState.mode = mode;
          heronState.modeStart = performance.now();
          heronState.visible = true;
        }
        draw(lastNow || performance.now());
      },
      forceTorontoPhase(name, progress = 0.5) {
        if (name === 'idle') {
          torontoState.active = false;
          torontoState.phase = 'idle';
          torontoState.audioPhase = null;
          draw(lastNow || performance.now());
          return true;
        }
        const timing = timelineCursorFor(name, TORONTO_TIMELINE);
        if (!Object.prototype.hasOwnProperty.call(TORONTO_TIMELINE, name)) return false;
        const now = performance.now();
        torontoState.active = true;
        torontoState.start = now - timing.start - timing.duration * clamp(Number(progress), 0, 1);
        torontoState.phase = name;
        torontoState.audioPhase = null;
        draw(now);
        return true;
      },
      resetRig() { Object.assign(rigState, clone(RIG_DEFAULTS)); },
      resetAll() { importConfig(initialConfig); },
      forceFishing() { startFishing(performance.now()); },
      startFishingOutcome(outcomeKey = 'normal', speciesKey = 'bass', sizeKey = null) {
        return startFishing(performance.now(), outcomeKey, speciesKey, sizeKey);
      },
      clearFishing() {
        fishing.active = false;
        fishing.currentLine = '';
        fishing.audioPhase = null;
        fishing.emergeSplashPlayed = false;
        entityStates.fish.visible = false;
        draw(lastNow || performance.now());
      },
      forceFishingPhase,
      forceFishingPhaseAudio(name, progress = 0.5, speciesKey = 'bass', outcomeKey = 'normal', sizeKey = 'regular') {
        forceFishingPhase(name, progress, speciesKey, outcomeKey, performance.now(), sizeKey);
        fishing.audioPhase = null;
        syncFishingAudio(currentFishingPhase(lastNow || performance.now()));
        return true;
      },
      forceFishingOutcome(outcomeKey, phaseName = 'hold', progress = 0.65, speciesKey = 'bass', sizeKey = 'regular') {
        return forceFishingPhase(phaseName, progress, speciesKey, outcomeKey, performance.now(), sizeKey);
      },
      forceFishingScript(outcomeKey, scriptKey, phaseName = 'bite', progress = 0.5, speciesKey = 'bass', sizeKey = 'regular') {
        const ok = forceFishingPhase(phaseName, progress, speciesKey, outcomeKey, performance.now(), sizeKey);
        const script = scriptsForOutcome(fishing.outcome.key, fishing.species.key, fishing.sizeKey).find((item) => item.key === scriptKey);
        if (script) {
          fishing.script = script;
          lastScriptByPool.set(scriptPoolKey(fishing.outcome, fishing.species), script.key);
          draw(lastNow || performance.now());
          return true;
        }
        return ok;
      },
      forceWildlifeCameo(kind, progress = 0.36) {
        if (!WILDLIFE_FORCE_OPTIONS.includes(kind) || kind === 'none') return false;
        wildlife.force = kind;
        startWildlifeCameo(kind, performance.now(), progress);
        draw(lastNow || performance.now());
        return true;
      },
      forceNaturalWildlifeEnd(kind) {
        if (!WILDLIFE_FORCE_OPTIONS.includes(kind) || kind === 'none') return false;
        wildlife.force = 'none';
        if (kind === 'moose') wildlife.mooseSeen = true;
        else wildlife.swimmerSeen = true;
        wildlife.active = false;
        wildlife.kind = null;
        scheduleNextWildlife(kind, performance.now());
        clearWildlifeSprites();
        draw(lastNow || performance.now());
        return true;
      },
    },
  };
}

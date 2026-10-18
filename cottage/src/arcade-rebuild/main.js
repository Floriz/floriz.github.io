import { createAudioController } from './audio.js?v=mobile-v116';
import { createIdentityController } from './identity.js?v=build-v100';
import { createRenderer } from './renderer.js?v=mobile-v116';
import { isDevelopment } from './mode.js?v=build-v100';
import { createWorld } from './world.js?v=mobile-v116';

const canvas = document.getElementById('rebuild-stage');
const development = isDevelopment(location);
let renderer;
let failed = false;

function showFallback(error) {
  if (failed) return;
  failed = true;
  renderer?.app.stop();
  document.documentElement.dataset.sceneState = 'fallback';
  document.getElementById('site-identity').classList.remove('is-obscured');
  document.querySelector('[data-toronto-easter-egg]').disabled = true;
  document.getElementById('rebuild-audio-toggle').disabled = true;
  console.warn('[arcade-rebuild] showing static lake', error);
}


function bindScenePointer(canvas, renderer, world, audio) {
  let press = null;
  const activate = event => {
    audio.unlock();
    world.handlePointer(renderer.screenToWorld(event.clientX, event.clientY), performance.now());
  };
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') {
      if (event.button === 0) activate(event);
    } else if (event.isPrimary !== false && !press) {
      press = { id: event.pointerId, x: event.clientX, y: event.clientY };
    } else {
      press = null;
    }
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType === 'mouse') return;
    const start = press;
    press = null;
    if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 12) {
      activate(event);
    }
  });
  canvas.addEventListener('pointermove', event => {
    if (press?.id === event.pointerId && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 12) {
      press = null;
    }
  });
  canvas.addEventListener('pointercancel', () => { press = null; });
}

function audioNeedsEnable({ muted, playbackState }) {
  return muted || !['ready', 'loading'].includes(playbackState);
}

async function boot() {
  if (!window.PIXI) throw new Error('PixiJS failed to load');
  renderer = await createRenderer(canvas);
  const audio = createAudioController();
  const identity = createIdentityController(document.getElementById('site-identity'), { development });
  const world = await createWorld(renderer.root, renderer, audio, { development });

  const loadStatus = document.getElementById('rebuild-load-status');
  if (loadStatus) loadStatus.remove();
  document.documentElement.dataset.sceneState = 'ready';
  document.querySelector('[data-toronto-easter-egg]').disabled = false;
  document.getElementById('rebuild-audio-toggle').disabled = false;

  renderer.app.ticker.add(() => {
    try {
      world.update(performance.now());
      identity.setDialogueBounds(world.dialogueBounds);
    } catch (error) {
      showFallback(error);
    }
  });
  canvas.addEventListener('webglcontextlost', () => showFallback(new Error('Graphics context lost')));
  document.addEventListener('visibilitychange', () => {
    audio.setPageVisible(!document.hidden);
    if (document.hidden) renderer.app.stop();
    else if (!failed) renderer.app.start();
  });
  if (document.hidden) {
    renderer.app.stop();
    audio.setPageVisible(false);
  }
  bindScenePointer(canvas, renderer, world, audio);

  document.querySelector('[data-toronto-easter-egg]')?.addEventListener('click', () => {
    audio.unlock();
    world.triggerToronto(performance.now());
  });

  const audioToggle = document.getElementById('rebuild-audio-toggle');
  const updateAudioToggle = () => {
    if (!audioToggle) return;
    const { muted, playbackState } = audio.debug;
    const needsEnable = audioNeedsEnable(audio.debug);
    const label = needsEnable ? 'Enable scene sounds' : 'Mute scene sounds';
    audioToggle.classList.toggle('is-muted', needsEnable);
    audioToggle.dataset.audioState = playbackState;
    audioToggle.setAttribute('aria-label', label);
    audioToggle.title = playbackState === 'loading' ? 'Loading scene sounds' : label;
    audioToggle.setAttribute('aria-pressed', String(muted));
  };
  audioToggle?.addEventListener('click', () => {
    const nextMuted = !audioNeedsEnable(audio.debug);
    audio.setMuted(nextMuted);
    updateAudioToggle();
    if (!nextMuted) audio.unlock();
  });
  window.addEventListener('arcade-rebuild-audio-change', updateAudioToggle);
  updateAudioToggle();
  audio.prewarm();

  window.addEventListener('resize', renderer.resize);
  window.visualViewport?.addEventListener('resize', renderer.resize);
  window.visualViewport?.addEventListener('scroll', renderer.resize);
  window.addEventListener('pageshow', () => {
    renderer.resize();
    audio.setPageVisible(!document.hidden);
  });
  const stageObserver = new ResizeObserver(renderer.resize);
  stageObserver.observe(canvas.parentElement);
}

boot().catch(showFallback);

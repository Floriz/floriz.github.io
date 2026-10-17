import { createAudioController } from './audio.js?v=build-v100';
import { createIdentityController } from './identity.js?v=build-v100';
import { createRenderer } from './renderer.js?v=build-v100';
import { isDevelopment } from './mode.js?v=build-v100';
import { createWorld } from './world.js?v=build-v100';

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
    if (document.hidden) renderer.app.stop();
    else if (!failed) renderer.app.start();
  });
  if (document.hidden) renderer.app.stop();

  canvas.addEventListener('pointerdown', (event) => {
    audio.unlock();
    world.handlePointer(renderer.screenToWorld(event.clientX, event.clientY), performance.now());
  });

  document.querySelector('[data-toronto-easter-egg]')?.addEventListener('click', () => {
    audio.unlock();
    world.triggerToronto(performance.now());
  });

  const audioToggle = document.getElementById('rebuild-audio-toggle');
  const updateAudioToggle = () => {
    if (!audioToggle) return;
    const { muted } = audio.debug;
    audioToggle.classList.toggle('is-muted', muted);
    audioToggle.setAttribute('aria-label', muted ? 'Unmute scene sounds' : 'Mute scene sounds');
    audioToggle.title = muted ? 'Unmute scene sounds' : 'Mute scene sounds';
    audioToggle.setAttribute('aria-pressed', String(muted));
  };
  audioToggle?.addEventListener('click', () => {
    const nextMuted = !audio.debug.muted;
    audio.setMuted(nextMuted);
    updateAudioToggle();
    if (!nextMuted) audio.unlock();
  });
  window.addEventListener('arcade-rebuild-audio-change', updateAudioToggle);
  updateAudioToggle();

  window.addEventListener('resize', () => {
    renderer.resize();
  });
}

boot().catch(showFallback);

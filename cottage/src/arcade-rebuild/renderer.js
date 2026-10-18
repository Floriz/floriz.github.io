import { PIXEL_SCALE } from './config.js?v=build-v100';

function viewportSize(canvas) {
  const bounds = canvas.parentElement.getBoundingClientRect();
  const visible = window.visualViewport?.scale === 1 ? window.visualViewport : null;
  return {
    width: Math.max(1, Math.floor(Math.min(bounds.width, visible?.width || window.innerWidth))),
    height: Math.max(1, Math.floor(Math.min(bounds.height, visible?.height || window.innerHeight))),
  };
}

export async function createRenderer(canvas) {
  const { Application, Container } = window.PIXI;
  const app = new Application();
  const initial = viewportSize(canvas);
  await app.init({
    canvas,
    width: initial.width,
    height: initial.height,
    background: 0x11182a,
    antialias: false,
    autoDensity: false,
    resolution: 1,
    roundPixels: true,
    preference: 'webgl',
  });

  const root = new Container();
  root.scale.set(PIXEL_SCALE);
  app.stage.addChild(root);

  let nativeViewW = Math.ceil(initial.width / PIXEL_SCALE);
  let nativeViewH = Math.ceil(initial.height / PIXEL_SCALE);
  let safeArea = { top: 0, right: 0, bottom: 0, left: 0 };

  function resize() {
    const size = viewportSize(canvas);
    const style = window.getComputedStyle(canvas);
    safeArea = Object.fromEntries(['top', 'right', 'bottom', 'left'].map(edge => [
      edge, Math.ceil((parseFloat(style.getPropertyValue(`--scene-safe-${edge}`)) || 0) / PIXEL_SCALE),
    ]));
    nativeViewW = Math.ceil(size.width / PIXEL_SCALE);
    nativeViewH = Math.ceil(size.height / PIXEL_SCALE);
    root.scale.set(PIXEL_SCALE);
    root.position.set(0, 0);
    app.renderer.resize(size.width, size.height);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  }

  function screenToWorld(clientX, clientY) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: Math.floor((clientX - bounds.left) * app.renderer.width / bounds.width / PIXEL_SCALE),
      y: Math.floor((clientY - bounds.top) * app.renderer.height / bounds.height / PIXEL_SCALE),
    };
  }

  resize();

  return {
    app,
    root,
    resize,
    screenToWorld,
    get nativeViewW() { return nativeViewW; },
    get nativeViewH() { return nativeViewH; },
    get safeArea() { return safeArea; },
    get scaleReport() { return `${PIXEL_SCALE} CSS px / native pixel`; },
  };
}

import { PIXEL_SCALE } from './config.js?v=build-v100';

function viewportSize() {
  return {
    width: Math.max(1, Math.floor(window.innerWidth)),
    height: Math.max(1, Math.floor(window.innerHeight)),
  };
}

export async function createRenderer(canvas) {
  const { Application, Container } = window.PIXI;
  const app = new Application();
  const initial = viewportSize();
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

  function resize() {
    const size = viewportSize();
    nativeViewW = Math.ceil(size.width / PIXEL_SCALE);
    nativeViewH = Math.ceil(size.height / PIXEL_SCALE);
    root.scale.set(PIXEL_SCALE);
    root.position.set(0, 0);
    app.renderer.resize(size.width, size.height);
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;
  }

  function screenToWorld(clientX, clientY) {
    return {
      x: Math.floor(clientX / PIXEL_SCALE),
      y: Math.floor(clientY / PIXEL_SCALE),
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
    get scaleReport() { return `${PIXEL_SCALE} CSS px / native pixel`; },
  };
}

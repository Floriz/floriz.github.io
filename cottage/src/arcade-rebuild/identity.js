import { PIXEL_SCALE } from './config.js?v=build-v100';

export const IDENTITY_VARIANTS = ['editorial', 'sky_letters', 'pixel_16', 'quiet_wordmark'];

const DEFAULTS = {
  visible: true,
  variant: 'editorial',
  opacity: 1,
  y: 0,
};

export function createIdentityController(element, { development = false } = {}) {
  const state = { ...DEFAULTS };

  const apply = () => {
    element.hidden = !state.visible;
    element.dataset.identityVariant = state.variant;
    element.style.setProperty('--identity-opacity', String(state.opacity));
    element.style.setProperty('--identity-y', `${state.y}px`);
  };

  const setField = (field, value) => {
    if (field === 'visible') state.visible = Boolean(value);
    if (field === 'variant' && IDENTITY_VARIANTS.includes(value)) state.variant = value;
    if (field === 'opacity') state.opacity = Math.max(0, Math.min(1, Number(value)));
    if (field === 'y') state.y = Math.max(-160, Math.min(240, Number(value)));
    apply();
  };

  const reset = () => {
    Object.assign(state, DEFAULTS);
    apply();
  };

  const importConfig = (config = {}) => {
    if (typeof config.visible === 'boolean') state.visible = config.visible;
    if (IDENTITY_VARIANTS.includes(config.variant)) state.variant = config.variant;
    if (Number.isFinite(Number(config.opacity))) state.opacity = Math.max(0, Math.min(1, Number(config.opacity)));
    if (Number.isFinite(Number(config.y))) state.y = Math.max(-160, Math.min(240, Number(config.y)));
    apply();
  };

  const requestedVariant = new URLSearchParams(window.location.search).get('identity');
  if (development && IDENTITY_VARIANTS.includes(requestedVariant)) state.variant = requestedVariant;
  apply();

  return {
    setDialogueBounds(bounds) {
      const title = element.querySelector('.site-identity-lockup').getBoundingClientRect();
      const overlaps = Boolean(bounds
        && bounds.x * PIXEL_SCALE < title.right
        && (bounds.x + bounds.width) * PIXEL_SCALE > title.left
        && bounds.y * PIXEL_SCALE < title.bottom
        && (bounds.y + bounds.height) * PIXEL_SCALE > title.top);
      element.classList.toggle('is-obscured', overlaps);
    },
    debug: {
      get state() { return { ...state }; },
      setField,
      reset,
      importConfig,
      exportConfig: () => ({ ...state }),
    },
  };
}

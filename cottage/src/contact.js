import { isDevelopment } from './arcade-rebuild/mode.js?v=build-v100';

const development = isDevelopment(location);
const dialog = document.createElement('dialog');
dialog.id = 'email-dialog';
dialog.className = 'email-dialog';
const contactParams = new URLSearchParams(location.search);
dialog.dataset.wood = development && ['pine', 'oak', 'cedar'].includes(contactParams.get('wood')) ? contactParams.get('wood') : 'pine';
dialog.setAttribute('aria-labelledby', 'email-dialog-title');
dialog.innerHTML = `
  <div class="email-dialog-heading">
    <h2 id="email-dialog-title" class="email-dialog-title">Pull up a chair</h2>
    <button type="button" class="email-dialog-close" aria-label="Close email popup">
      <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M0 0h4v4H0ZM24 0h4v4h-4ZM4 4h4v4H4ZM20 4h4v4h-4ZM8 8h4v4H8ZM16 8h4v4h-4ZM12 12h4v4h-4ZM8 16h4v4H8ZM16 16h4v4h-4ZM4 20h4v4H4ZM20 20h4v4h-4ZM0 24h4v4H0ZM24 24h4v4h-4Z"/></svg>
    </button>
  </div>
  <div class="email-dialog-address">
    <span class="email-dialog-value" tabindex="-1"></span>
    <button type="button" class="email-dialog-copy" aria-label="Copy email address" autofocus>
      <svg class="email-copy-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M0 0h16v8h8v16H8v-8H0ZM4 4v8h4V8h4V4Zm8 8v8h8v-8Z"/></svg>
      <svg class="email-copied-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4h4v4h-4v4h-4v4h-4v4H8v-4H4v-4H0V8h4v4h4v4h4v-4h4V8h4Z"/></svg>
    </button>
  </div>
  <p class="email-dialog-status" role="status" aria-live="polite"></p>
`;
document.body.append(dialog);

const address = dialog.querySelector('.email-dialog-value');
const copyButton = dialog.querySelector('.email-dialog-copy');
const status = dialog.querySelector('.email-dialog-status');
let opening = 0;
function positionEmailDialog() {
  if (!dialog.open) return;
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  const style = getComputedStyle(dialog);
  const topInset = Math.max(16, Math.ceil(parseFloat(style.getPropertyValue('--safe-top')) / 4) * 4);
  const bottomInset = Math.max(16, Math.ceil(parseFloat(style.getPropertyValue('--safe-bottom')) / 4) * 4);
  const availableHeight = height - topInset - bottomInset;
  dialog.style.width = `${Math.min(420, Math.floor((width - 32) / 4) * 4)}px`;
  dialog.style.maxHeight = `${Math.floor(availableHeight / 4) * 4}px`;
  address.style.width = '';
  address.style.width = `${Math.ceil(address.getBoundingClientRect().width / 4) * 4}px`;
  const bounds = dialog.getBoundingClientRect();
  dialog.style.left = `${Math.round((width - bounds.width) / 8) * 4}px`;
  dialog.style.top = `${topInset + Math.max(0, Math.round((availableHeight - bounds.height) / 8) * 4)}px`;
}
window.addEventListener('resize', positionEmailDialog);

export function openEmailDialog() {
  if (dialog.open) return;
  // Obfuscation deters basic harvesters; this public code is not a human-verification gate.
  address.textContent = [63, 62, 48, 48, 62, 41, 117, 61, 55, 52, 41, 50, 40, 27, 60, 54, 58, 50, 55, 117, 56, 52, 54]
    .map(value => String.fromCharCode(value ^ 91)).join('');
  status.textContent = '';
  dialog.showModal();
  positionEmailDialog();
}

document.querySelectorAll('[data-email-open]').forEach(button => {
  button.disabled = false;
  button.addEventListener('click', openEmailDialog);
});

copyButton.addEventListener('click', async () => {
  const currentOpening = opening;
  copyButton.classList.remove('is-copied');
  status.classList.remove('is-error');
  status.textContent = '';
  positionEmailDialog();
  try {
    await navigator.clipboard.writeText(address.textContent);
    if (!dialog.open || currentOpening !== opening) return;
    copyButton.classList.add('is-copied');
    status.textContent = 'Email address copied.';
  } catch {
    if (!dialog.open || currentOpening !== opening) return;
    address.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(address);
    selection.removeAllRanges();
    selection.addRange(range);
    status.classList.add('is-error');
    status.textContent = 'Select and copy the address manually.';
    positionEmailDialog();
  }
});

dialog.querySelector('.email-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => {
  opening += 1;
  address.textContent = '';
  status.textContent = '';
  status.classList.remove('is-error');
  copyButton.classList.remove('is-copied');
});

if (development && contactParams.get('wood-options') === '1') {
  import('./contact-wood-options.js?v=email-v092').then(({ showWoodOptions }) => showWoodOptions(dialog, openEmailDialog));
}

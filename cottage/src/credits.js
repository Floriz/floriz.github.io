import { isDevelopment } from './arcade-rebuild/mode.js?v=build-v100';

const tools = [
  { name: 'sharp', url: 'https://sharp.pixelplumbing.com/', license: 'Apache-2.0', licenseUrl: 'https://github.com/lovell/sharp/blob/main/LICENSE' },
  { name: 'pngjs', url: 'https://github.com/pngjs/pngjs', license: 'MIT', licenseUrl: 'https://github.com/pngjs/pngjs/blob/main/LICENSE' },
  { name: 'Pillow', url: 'https://python-pillow.org/', license: 'MIT-CMU', licenseUrl: 'https://pillow.readthedocs.io/en/stable/about.html#license' },
  { name: 'NumPy', url: 'https://numpy.org/', license: 'BSD-3-Clause', licenseUrl: 'https://numpy.org/doc/stable/license.html' },
  { name: 'FFmpeg', url: 'https://ffmpeg.org/', license: 'License details', licenseUrl: 'https://ffmpeg.org/legal.html' },
];
const cc0 = { license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/' };
const sounds = [
  { title: 'Dog Barks.wav', creator: 'UnderlinedDesigns', url: 'https://freesound.org/s/191687/', ...cc0 },
  { title: 'pebbles tossed into water in woodsy lake', creator: 'lukiacostello', url: 'https://freesound.org/s/534193/', ...cc0 },
  { title: 'Woosh (stick swung in the air)', creator: 'Dalesome', url: 'https://freesound.org/s/352719/', ...cc0 },
  { title: 'Water Drop 01.wav', creator: 'LilMati', url: 'https://freesound.org/s/348022/', ...cc0 },
  { title: 'Fishing Reel', creator: 'mwchristian95', url: 'https://freesound.org/s/725424/', ...cc0 },
  { title: 'Fish Being Netted on River.wav', creator: 'paulprit', url: 'https://freesound.org/s/581580/', ...cc0 },
  { title: 'water splash- small', creator: 'morganveilleux', url: 'https://freesound.org/s/390005/', ...cc0 },
  { title: 'Great Blue Heron.ogg', creator: 'US National Park Service', url: 'https://commons.wikimedia.org/wiki/File:Great_Blue_Heron.ogg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File:Great_Blue_Heron.ogg#Licensing' },
  { title: 'Gull 2.ogg', creator: 'avphillips / PDSounds', url: 'https://commons.wikimedia.org/wiki/File:Gull_2.ogg', license: 'Public domain', licenseUrl: 'https://commons.wikimedia.org/wiki/File:Gull_2.ogg#Licensing' },
  { title: 'Cow Moose field recording', creator: '© Linda Lötjönen', url: 'https://www.inaturalist.org/observations/228107348', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/' },
];
const link = (url, label) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`;
const trigger = document.querySelector('[data-credits-open]');
const dialog = document.createElement('dialog');
dialog.id = 'credits-dialog';
dialog.className = 'email-dialog credits-dialog';
const wood = new URLSearchParams(location.search).get('wood');
dialog.dataset.wood = isDevelopment(location) && ['pine', 'oak', 'cedar'].includes(wood) ? wood : 'pine';
dialog.setAttribute('aria-labelledby', 'credits-dialog-title');
dialog.innerHTML = `
  <div class="email-dialog-heading">
    <h2 id="credits-dialog-title" class="email-dialog-title">Credits</h2>
    <button type="button" class="email-dialog-close" aria-label="Close credits" autofocus>
      <svg viewBox="0 0 28 28" aria-hidden="true"><path d="M0 0h4v4H0ZM24 0h4v4h-4ZM4 4h4v4H4ZM20 4h4v4h-4ZM8 8h4v4H8ZM16 8h4v4h-4ZM12 12h4v4h-4ZM8 16h4v4H8ZM16 16h4v4h-4ZM4 20h4v4H4ZM20 20h4v4h-4ZM0 24h4v4H0ZM24 24h4v4h-4Z"/></svg>
    </button>
  </div>
  <div class="credits-content">
    <section aria-labelledby="credits-code-title">
      <h3 id="credits-code-title">Open source</h3>
      <p>${link('https://pixijs.com/', 'PixiJS 8.6.6')} · ${link('https://github.com/pixijs/pixijs/blob/v8.6.6/LICENSE', 'MIT')}</p>
      <p class="credits-detail">Brings this little lake to life.</p>
    </section>
    <section aria-labelledby="credits-sounds-title">
      <h3 id="credits-sounds-title">Sounds</h3>
      <ul>${sounds.map(sound => `
        <li>${link(sound.url, sound.title)}<span class="credits-detail">${sound.creator} · ${link(sound.licenseUrl, sound.license)}</span></li>`).join('')}
      </ul>
      <p class="credits-note">Recordings trimmed, filtered and mixed for the scene. Mink squeaks and UFO tones made here.</p>
    </section>
    <section aria-labelledby="credits-tools-title">
      <h3 id="credits-tools-title">Art &amp; audio tools</h3>
      <ul>${tools.map(tool => `<li>${link(tool.url, tool.name)} · ${link(tool.licenseUrl, tool.license)}</li>`).join('')}</ul>
    </section>
  </div>
`;
document.body.append(dialog);

function positionDialog() {
  if (!dialog.open) return;
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  const style = getComputedStyle(dialog);
  const topInset = Math.max(16, Math.ceil(parseFloat(style.getPropertyValue('--safe-top')) / 4) * 4);
  const bottomInset = Math.max(16, Math.ceil(parseFloat(style.getPropertyValue('--safe-bottom')) / 4) * 4);
  const availableHeight = height - topInset - bottomInset;
  dialog.style.width = `${Math.min(420, Math.floor((width - 32) / 4) * 4)}px`;
  dialog.style.maxHeight = `${Math.min(600, Math.floor(availableHeight / 4) * 4)}px`;
  const bounds = dialog.getBoundingClientRect();
  dialog.style.left = `${Math.round((width - bounds.width) / 8) * 4}px`;
  dialog.style.top = `${topInset + Math.max(0, Math.round((availableHeight - bounds.height) / 8) * 4)}px`;
}

trigger.disabled = false;
trigger.addEventListener('click', () => {
  dialog.showModal();
  dialog.querySelector('.credits-content').scrollTop = 0;
  positionDialog();
});
window.addEventListener('resize', positionDialog);
dialog.querySelector('.email-dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => trigger.focus({ preventScroll: true }));

const MANIFEST_URL = './assets/arcade-rebuild/current/audio/manifest.json';
const CACHE_TOKEN = 'rebuild-v112-moose-raspberry';
const MUTE_STORAGE_KEY = 'arcade-rebuild-audio-muted';
const MAX_PENDING_AGE_MS = 700;
const PRELOAD_CUE_ORDER = [
  'water_plop',
  'dog_click_woof',
  'heron_takeoff',
  'far_bird_squawk',
  'rod_cast',
  'bobber_bite',
  'dog_bite_bark',
  'reel_retrieve',
  'fish_emerge_splash',
  'release_splash',
  'mink_call',
  'moose_call',
  'ufo_beam_in',
  'ufo_beam_out',
];

const CUE_SETTINGS = {
  dog_click_woof: { label: 'Dog: soft woof', gain: 0.42, minInterval: 500, group: 'dog_click', maxVoices: 1, rateRange: [0.99, 1.01] },
  dog_bite_bark: { label: 'Dog: bite alert', gain: 0.46, minInterval: 500, group: 'dog_alert', maxVoices: 1, rateRange: [0.99, 1.01] },
  water_plop: { label: 'Water: quiet lake plop', gain: 0.28, minInterval: 160, group: 'water_plop', maxVoices: 2, rateRange: [0.99, 1.01] },
  heron_takeoff: { label: 'Heron: Great Blue Heron call', gain: 0.4, minInterval: 1800, group: 'heron', maxVoices: 1, rateRange: [1, 1] },
  far_bird_squawk: { label: 'Far bird: Herring Gull squawk', gain: 0.24, minInterval: 450, group: 'far_birds', maxVoices: 2, rateRange: [1, 1] },
  rod_cast: { label: 'Fishing: rod cast', gain: 0.42, minInterval: 600, group: 'fishing', maxVoices: 2, rateRange: [0.99, 1.01] },
  bobber_bite: { label: 'Fishing: bobber bite', gain: 0.42, minInterval: 500, group: 'fishing', maxVoices: 2, rateRange: [0.99, 1.01] },
  reel_retrieve: { label: 'Fishing: reel retrieve', gain: 0.38, minInterval: 1200, group: 'reel', maxVoices: 1, rateRange: [0.99, 1.01] },
  fish_emerge_splash: { label: 'Fishing: fish emerges', gain: 0.5, minInterval: 800, group: 'water_event', maxVoices: 1, rateRange: [0.99, 1.01] },
  release_splash: { label: 'Fishing: release splash', gain: 0.48, minInterval: 800, group: 'water_event', maxVoices: 1, rateRange: [0.99, 1.01] },
  mink_call: { label: 'Mink: playful double squeak', gain: 0.38, minInterval: 1200, group: 'wildlife_mink', maxVoices: 1, rateRange: [0.98, 1.02] },
  moose_call: { label: 'Moose: big mouth raspberry', gain: 0.3, minInterval: 1800, group: 'wildlife_moose', maxVoices: 1, rateRange: [0.98, 1.02] },
  ufo_beam_in: { label: 'Toronto: UFO beam in', gain: 0.22, minInterval: 700, group: 'ufo', maxVoices: 1, rateRange: [1, 1] },
  ufo_beam_out: { label: 'Toronto: UFO beam out', gain: 0.2, minInterval: 700, group: 'ufo', maxVoices: 1, rateRange: [1, 1] },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function storedMuted() {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function createAudioController() {
  let context = null;
  let masterNode = null;
  let manifest = null;
  let preloadPromise = null;
  let preloadFailed = false;
  let initialSuspendPromise = null;
  let unlocked = false;
  let muted = storedMuted();
  let masterGain = 0.72;
  let status = 'idle';
  let warningSent = false;
  let eventId = 0;
  const buffers = new Map();
  const pending = [];
  const voices = new Set();
  const lastPlayedAt = new Map();
  const lastVariant = new Map();
  const eventLog = [];
  const errors = [];

  function warnOnce(message, error = null) {
    errors.push(error ? `${message}: ${error.message || error}` : message);
    status = 'degraded';
    if (warningSent) return;
    warningSent = true;
    console.warn('[arcade-rebuild/audio]', message, error || '');
  }

  function ensureContext() {
    if (context) return context;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      status = 'unavailable';
      return null;
    }
    context = new AudioContextClass();
    masterNode = context.createGain();
    masterNode.gain.value = muted ? 0 : masterGain;
    masterNode.connect(context.destination);
    if (!unlocked && context.state === 'running') {
      initialSuspendPromise = context.suspend().catch(() => null);
    }
    return context;
  }

  async function preload(retry = false) {
    if (preloadPromise && !(retry && preloadFailed)) return preloadPromise;
    const audioContext = ensureContext();
    if (!audioContext) return null;
    preloadFailed = false;
    let failed = false;
    status = 'loading';
    preloadPromise = (async () => {
      try {
        if (!manifest) {
          const response = await fetch(`${MANIFEST_URL}?v=${CACHE_TOKEN}`);
          if (!response.ok) throw new Error(`manifest ${response.status}`);
          manifest = await response.json();
        }
        const loadEntry = async (entry) => {
          if (buffers.has(`${entry.cue}:${entry.variant}`)) return;
          try {
            const assetResponse = await fetch(`${entry.path}?v=${CACHE_TOKEN}`);
            if (!assetResponse.ok) throw new Error(`${entry.path} ${assetResponse.status}`);
            const buffer = await audioContext.decodeAudioData(await assetResponse.arrayBuffer());
            buffers.set(`${entry.cue}:${entry.variant}`, buffer);
            if (unlocked) drainPending();
          } catch (error) {
            failed = true;
            errors.push(`${entry.cue}:${entry.variant}: ${error.message || error}`);
          }
        };
        const primaryEntries = PRELOAD_CUE_ORDER
          .map((cue) => manifest.entries.find((entry) => entry.cue === cue))
          .filter(Boolean);
        const primaryKeys = new Set(primaryEntries.map((entry) => `${entry.cue}:${entry.variant}`));
        const secondaryEntries = manifest.entries.filter(
          (entry) => !primaryKeys.has(`${entry.cue}:${entry.variant}`),
        );
        await Promise.all(primaryEntries.map(loadEntry));
        await Promise.all(secondaryEntries.map(loadEntry));
        status = failed ? 'degraded' : 'ready';
      } catch (error) {
        failed = true;
        warnOnce('Audio assets could not be loaded; interactions remain visual.', error);
      }
      return manifest;
    })().then((result) => {
      preloadFailed = failed;
      return result;
    });
    return preloadPromise;
  }

  function entriesFor(cue) {
    return manifest?.entries?.filter((entry) => entry.cue === cue) || [];
  }

  function chooseEntry(cue) {
    const entries = entriesFor(cue).filter((entry) => buffers.has(`${entry.cue}:${entry.variant}`));
    if (!entries.length) return null;
    if (entries.length === 1) return entries[0];
    const previous = lastVariant.get(cue);
    const choices = entries.filter((entry) => entry.variant !== previous);
    const entry = choices[Math.floor(Math.random() * choices.length)] || entries[0];
    lastVariant.set(cue, entry.variant);
    return entry;
  }

  function recordEvent(event) {
    eventId += 1;
    const entry = { id: eventId, at: Math.round(performance.now()), ...event };
    eventLog.push(entry);
    while (eventLog.length > 80) eventLog.shift();
    return entry;
  }

  function activeVoicesFor(group) {
    return [...voices].filter((voice) => voice.group === group);
  }

  function stopGroup(group) {
    for (const voice of activeVoicesFor(group)) {
      try {
        voice.source.stop();
      } catch {
        // A voice may have naturally ended between selection and stop.
      }
    }
  }

  function stopAllVoices() {
    for (const voice of [...voices]) {
      try {
        voice.source.stop();
      } catch {
        // The source already ended.
      }
    }
  }

  function startPlayback(request) {
    const audioContext = ensureContext();
    const setting = CUE_SETTINGS[request.cue];
    const entry = request.entry || chooseEntry(request.cue);
    const buffer = entry ? buffers.get(`${entry.cue}:${entry.variant}`) : null;
    if (!audioContext || !masterNode || !entry || !buffer) {
      recordEvent({
        cue: request.cue,
        state: 'missing',
        reason: entry ? 'buffer' : 'manifest-entry',
      });
      return false;
    }
    if (muted) {
      recordEvent({ cue: request.cue, variant: entry.variant, state: 'muted' });
      return false;
    }
    if (setting.maxVoices === 1) stopGroup(setting.group);
    const active = activeVoicesFor(setting.group);
    while (active.length >= setting.maxVoices) {
      const oldest = active.shift();
      try {
        oldest.source.stop();
      } catch {
        // The source already ended.
      }
    }
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const depth = clamp(Number(request.options.depth ?? 1), 0, 1);
    const depthGain = request.cue === 'water_plop' ? 0.45 + depth * 0.55 : 1;
    const requestedGain = clamp(Number(request.options.gain ?? 1), 0, 2);
    const [rateMin, rateMax] = setting.rateRange;
    const rate = clamp(
      Number(request.options.rate ?? (rateMin + Math.random() * (rateMax - rateMin))),
      0.75,
      1.25,
    );
    gainNode.gain.value = setting.gain * requestedGain * depthGain;
    source.playbackRate.value = rate;
    source.buffer = buffer;
    source.connect(gainNode);
    let tailNode = gainNode;
    if (request.cue === 'water_plop') {
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2600 + depth * 4400;
      gainNode.connect(filter);
      tailNode = filter;
    }
    tailNode.connect(masterNode);
    const voice = {
      source,
      group: setting.group,
      cue: request.cue,
      variant: entry.variant,
      startedAt: performance.now(),
    };
    voices.add(voice);
    source.addEventListener('ended', () => voices.delete(voice), { once: true });
    const delayMs = clamp(Number(request.options.delayMs ?? 0), 0, 1000);
    source.start(audioContext.currentTime + delayMs / 1000);
    if (!request.options.preview) lastPlayedAt.set(request.cue, performance.now());
    recordEvent({
      cue: request.cue,
      variant: entry.variant,
      group: setting.group,
      state: 'played',
      gain: Number((gainNode.gain.value * masterGain).toFixed(3)),
      requestedGain,
      rate: Number(rate.toFixed(3)),
      depth: Number(depth.toFixed(3)),
      preview: Boolean(request.options.preview),
      phase: request.options.phase || null,
      outcome: request.options.outcome || null,
      bucket: Number.isInteger(request.options.bucket) ? request.options.bucket : null,
      delayMs,
    });
    return true;
  }

  function expirePending(now = performance.now()) {
    for (let index = pending.length - 1; index >= 0; index -= 1) {
      const request = pending[index];
      if (now - request.queuedAt <= MAX_PENDING_AGE_MS) continue;
      pending.splice(index, 1);
      recordEvent({
        cue: request.cue,
        variant: request.entry?.variant || null,
        group: request.group,
        state: 'expired',
      });
    }
  }

  function queuePlayback(request) {
    expirePending(request.queuedAt);
    const existing = pending.find((candidate) => candidate.group === request.group);
    if (existing) {
      recordEvent({
        cue: request.cue,
        variant: request.entry?.variant || null,
        group: request.group,
        state: 'coalesced',
        retainedCue: existing.cue,
      });
      return true;
    }
    pending.push(request);
    recordEvent({
      cue: request.cue,
      variant: request.entry?.variant || null,
      group: request.group,
      state: 'queued',
      requestedGain: clamp(Number(request.options.gain ?? 1), 0, 2),
    });
    return true;
  }

  function drainPending() {
    const now = performance.now();
    expirePending(now);
    const queued = pending.splice(0);
    for (const request of queued) {
      if (now - request.queuedAt > MAX_PENDING_AGE_MS) {
        recordEvent({
          cue: request.cue,
          variant: request.entry?.variant || null,
          group: request.group,
          state: 'expired',
        });
        continue;
      }
      const entry = request.entry || chooseEntry(request.cue);
      if (!entry || !buffers.has(`${entry.cue}:${entry.variant}`)) {
        pending.push(request);
        continue;
      }
      startPlayback({ ...request, entry });
    }
  }

  async function unlock() {
    if (muted) return false;
    try {
      const audioContext = ensureContext();
      if (!audioContext) return false;
      preload(true);
      if (initialSuspendPromise) await initialSuspendPromise;
      if (audioContext.state !== 'running') await audioContext.resume();
      unlocked = audioContext.state === 'running';
      await preloadPromise;
      if (unlocked) drainPending();
      return unlocked;
    } catch (error) {
      warnOnce('Audio could not be unlocked; interactions remain visual.', error);
      return false;
    }
  }

  function play(cue, options = {}) {
    if (muted || !context) return false;
    const setting = CUE_SETTINGS[cue];
    if (!setting) {
      recordEvent({ cue, state: 'unknown' });
      return false;
    }
    const now = performance.now();
    const last = lastPlayedAt.get(cue) || -Infinity;
    if (!options.preview && now - last < setting.minInterval) {
      recordEvent({ cue, state: 'rate-limited' });
      return false;
    }
    const request = {
      cue,
      options: { ...options },
      entry: chooseEntry(cue),
      group: setting.group,
      queuedAt: now,
    };
    if (!unlocked || context?.state !== 'running' || status === 'loading') {
      queuePlayback(request);
      preload();
      return true;
    }
    return startPlayback(request);
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) {
      const cancelled = pending.splice(0);
      for (const request of cancelled) {
        recordEvent({
          cue: request.cue,
          variant: request.entry?.variant || null,
          group: request.group,
          state: 'cancelled',
          reason: 'muted',
        });
      }
      stopAllVoices();
    }
    if (masterNode) masterNode.gain.value = muted ? 0 : masterGain;
    try {
      window.localStorage.setItem(MUTE_STORAGE_KEY, String(muted));
    } catch {
      // Storage is optional.
    }
    recordEvent({ cue: 'master', state: muted ? 'muted' : 'unmuted' });
    window.dispatchEvent(new CustomEvent('arcade-rebuild-audio-change'));
  }

  function setMasterGain(value) {
    masterGain = clamp(Number(value), 0, 1);
    if (masterNode && !muted) masterNode.gain.value = masterGain;
    window.dispatchEvent(new CustomEvent('arcade-rebuild-audio-change'));
  }

  function debugState() {
    return {
      status,
      unlocked,
      contextState: context?.state || 'none',
      muted,
      masterGain,
      decodedCount: buffers.size,
      manifestCount: manifest?.entries?.length || 0,
      manifestEntries: (manifest?.entries || []).map((entry) => ({
        cue: entry.cue,
        variant: entry.variant,
        label: entry.label,
        path: entry.path,
        sourceKey: entry.sourceKey,
        sourceTitle: entry.sourceTitle,
        license: entry.license,
      })),
      cueNames: Object.keys(CUE_SETTINGS),
      cueOptions: Object.entries(CUE_SETTINGS).map(([value, setting]) => ({
        value,
        label: setting.label,
      })),
      activeVoiceCount: voices.size,
      activeVoices: [...voices].map((voice) => ({
        cue: voice.cue,
        variant: voice.variant,
        group: voice.group,
      })),
      pendingCount: pending.length,
      pending: pending.map((request) => ({
        cue: request.cue,
        group: request.group,
        ageMs: Math.round(performance.now() - request.queuedAt),
      })),
      maxPendingAgeMs: MAX_PENDING_AGE_MS,
      errors: [...errors],
      lastEvent: eventLog[eventLog.length - 1] || null,
      eventLog: eventLog.map((event) => ({ ...event })),
    };
  }

  return {
    preload,
    unlock,
    play,
    setMuted,
    setMasterGain,
    stopGroup,
    get debug() {
      return debugState();
    },
  };
}

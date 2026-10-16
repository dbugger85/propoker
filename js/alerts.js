// Sounds, vibration and keeping the screen on.

let audio = null;
let wakeLock = null;

// Browsers only allow sound after the user has tapped something, so this is
// called on every tap.
export function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {}
}

// Notes as [frequency, start in seconds, length in seconds].
function play(notes, type = 'sine', volume = 0.35) {
  if (!audio) return;
  const start = audio.currentTime + 0.02;
  for (const [freq, at, len] of notes) {
    const t = start + at;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + len);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + len + 0.02);
  }
}

export const SOUNDS = {
  // One minute left: two short beeps
  warning: { notes: [[880, 0, 0.15], [880, 0.25, 0.15]], type: 'square', volume: 0.25, vibrate: [200, 100, 200] },
  // New level: three rising tones
  level: { notes: [[660, 0, 0.3], [880, 0.22, 0.3], [1175, 0.44, 0.5]], type: 'triangle', volume: 0.45, vibrate: [300, 100, 300] },
  // A break starts or ends: a longer, softer chime
  break: { notes: [[523, 0, 0.6], [659, 0.3, 0.6], [784, 0.6, 0.6], [1047, 0.9, 1]], type: 'sine', volume: 0.4, vibrate: [500, 150, 500] },
};

export function alert(name, { sound = true, vibrate = true } = {}) {
  const s = SOUNDS[name];
  if (sound) play(s.notes, s.type, s.volume);
  // Phones only allow vibration after the page has been tapped
  if (vibrate && navigator.userActivation?.hasBeenActive !== false) navigator.vibrate?.(s.vibrate);
}

// The browser drops the lock when the page is hidden, so this is called
// again whenever the page becomes visible.
export async function keepScreenOn() {
  if (wakeLock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => (wakeLock = null));
  } catch {
    wakeLock = null;
  }
}

export async function releaseScreen() {
  try {
    await wakeLock?.release();
  } catch {}
  wakeLock = null;
}

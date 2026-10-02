// Native Web Audio Synthesizer

const FREQUENCIES: Record<string, number> = {
  'C4': 261.63,
  'C#4': 277.18,
  'Db4': 277.18,
  'D4': 293.66,
  'D#4': 311.13,
  'Eb4': 311.13,
  'E4': 329.63,
  'F4': 349.23,
  'F#4': 369.99,
  'Gb4': 369.99,
  'G4': 392.00,
  'G#4': 415.30,
  'Ab4': 415.30,
  'A4': 440.00,
  'A#4': 466.16,
  'Bb4': 466.16,
  'B4': 493.88,
  'C5': 523.25,
};

let audioCtx: AudioContext | null = null;

let unlocked = false;

function initAudioContext() {
  // Recreate if it was closed or garbage collected by mobile OS
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      unlocked = false; // Need to unlock the new context
    }
  }
  return audioCtx;
}

export function unlockAudio() {
  if (unlocked) return;
  const ctx = initAudioContext();
  if (!ctx) return;
  
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  
  // Play silent buffer to unlock iOS Safari audio engine
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  
  unlocked = true;
}

export async function playPitch(noteName: string, duration: number = 1.2) {
  const ctx = initAudioContext();
  if (!ctx) return;

  // Crucial for mobile Chrome/Safari when returning from background:
  // We must explicitly await the resume before scheduling nodes, 
  // otherwise the time scheduling gets botched.
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Resolve note, defaulting to 4th octave if no octave specified
  let lookupName = noteName;
  if (!/\d$/.test(lookupName)) {
    lookupName += '4';
  }

  const freq = FREQUENCIES[lookupName];
  if (!freq) {
    console.warn('Unknown pitch note:', lookupName);
    return;
  }

  const t = ctx.currentTime;
  
  // Create primary oscillator (triangle for warmth)
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t);

  // Create a subtle sub-oscillator (sine) for roundness
  const subOsc = ctx.createOscillator();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(freq / 2, t); // One octave down

  // Envelope control
  const gainNode = ctx.createGain();
  
  // Attack & Decay Envelope
  gainNode.gain.setValueAtTime(0, t);
  gainNode.gain.linearRampToValueAtTime(0.5, t + 0.02); // Quick attack
  gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration); // Smooth decay

  osc.connect(gainNode);
  subOsc.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start(t);
  subOsc.start(t);
  
  osc.stop(t + duration);
  subOsc.stop(t + duration);
}


// Handle mobile browser backgrounding/foregrounding
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioCtx?.state === 'suspended') {
      // We don't await this because we aren't in a direct user gesture,
      // but it hints the browser to wake up the engine if possible.
      audioCtx.resume().catch(() => {});
    }
  });
}

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

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx?.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playPitch(noteName: string, duration: number = 1.2) {
  const ctx = initAudioContext();
  if (!ctx) return;

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

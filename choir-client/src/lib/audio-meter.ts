/**
 * Web Audio API Volume Meter, Voice Activity Detection, and Subtle Notification Sounds.
 * Shares a single AudioContext across all meters and UI chimes to avoid mobile hardware
 * AudioContext limits and eliminate per-stream audio session glitches.
 */
export interface AudioMeterController {
  stop: () => void;
}

let sharedAudioContext: AudioContext | null = null;
let lastNotificationPlayedAt = 0;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    sharedAudioContext = new AudioContextClass();
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

function scheduleNotificationChime(ctx: AudioContext): void {
  const t0 = ctx.currentTime + 0.01;

  // Gentle two-note Google Meet-inspired chime (D5 -> A5)
  const notes = [
    { freq: 587.33, start: 0, duration: 0.11 },
    { freq: 880.0, start: 0.075, duration: 0.16 },
  ];

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.freq, t0 + note.start);

    gain.gain.setValueAtTime(0.0001, t0 + note.start);
    gain.gain.exponentialRampToValueAtTime(0.045, t0 + note.start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + note.start + note.duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t0 + note.start);
    osc.stop(t0 + note.start + note.duration + 0.02);
  }
}

export function playChatNotificationSound(): void {
  const nowMs = Date.now();
  if (nowMs - lastNotificationPlayedAt < 1000) return;

  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    lastNotificationPlayedAt = nowMs;
    if (ctx.state === 'running') {
      scheduleNotificationChime(ctx);
    } else if (ctx.state === 'suspended') {
      ctx
        .resume()
        .then(() => {
          if (ctx.state === 'running') {
            scheduleNotificationChime(ctx);
          }
        })
        .catch(() => {});
    }
  } catch {
    // Ignore audio context restriction errors silently
  }
}

export function createAudioMeter(
  stream: MediaStream,
  onVolumeChange: (volume: number, isSpeaking: boolean) => void,
  speakingThreshold = 12
): AudioMeterController {
  let isRunning = true;
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let analyser: AnalyserNode | null = null;
  let lastHeardAt = 0;
  let lastReportedSpeaking = false;

  const audioTracks = stream.getAudioTracks();
  if (!audioTracks.length) {
    onVolumeChange(0, false);
    return { stop: () => {} };
  }

  try {
    const audioContext = getSharedAudioContext();
    if (!audioContext) {
      onVolumeChange(0, false);
      return { stop: () => {} };
    }

    source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const HOLD_MS = 350;
    const POLL_MS = 65;

    const checkVolume = () => {
      if (!isRunning || !analyser) return;

      const track = stream.getAudioTracks()[0];
      if (!track || !track.enabled || track.readyState === 'ended') {
        if (lastReportedSpeaking) {
          lastReportedSpeaking = false;
          onVolumeChange(0, false);
        }
        timerId = setTimeout(checkVolume, POLL_MS);
        return;
      }

      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const volume = Math.min(100, Math.round((average / 255) * 100 * 2.5));
      const now = Date.now();
      const rawSpeaking = volume >= speakingThreshold;
      if (rawSpeaking) {
        lastHeardAt = now;
      }
      const isSpeaking = rawSpeaking || now - lastHeardAt < HOLD_MS;

      if (isSpeaking !== lastReportedSpeaking || isSpeaking) {
        lastReportedSpeaking = isSpeaking;
        onVolumeChange(volume, isSpeaking);
      }

      timerId = setTimeout(checkVolume, POLL_MS);
    };

    checkVolume();
  } catch (err) {
    console.warn('AudioContext volume meter failed to initialize:', err);
    onVolumeChange(0, false);
  }

  return {
    stop: () => {
      isRunning = false;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      try {
        source?.disconnect();
        analyser?.disconnect();
      } catch {
        // Ignore already disconnected nodes
      }
      source = null;
      analyser = null;
      onVolumeChange(0, false);
    },
  };
}

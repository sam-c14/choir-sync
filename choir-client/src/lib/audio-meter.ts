/**
 * Web Audio API Volume Meter & Voice Activity Detection
 */
export interface AudioMeterController {
  stop: () => void;
}

export function createAudioMeter(
  stream: MediaStream,
  onVolumeChange: (volume: number, isSpeaking: boolean) => void,
  speakingThreshold = 12
): AudioMeterController {
  let isRunning = true;
  let audioContext: AudioContext | null = null;
  let animationFrameId: number | null = null;

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioContext = new AudioContextClass();

    // Check if the stream has active audio tracks
    const audioTracks = stream.getAudioTracks();
    if (!audioTracks.length || !audioTracks[0].enabled) {
      onVolumeChange(0, false);
      return { stop: () => {} };
    }

    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const checkVolume = () => {
      if (!isRunning) return;

      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      // Normalize to 0 - 100 scale
      const volume = Math.min(100, Math.round((average / 255) * 100 * 2.5));
      const isSpeaking = volume >= speakingThreshold;

      onVolumeChange(volume, isSpeaking);

      animationFrameId = requestAnimationFrame(checkVolume);
    };

    checkVolume();
  } catch (err) {
    console.warn('AudioContext volume meter failed to initialize:', err);
    onVolumeChange(0, false);
  }

  return {
    stop: () => {
      isRunning = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
      onVolumeChange(0, false);
    },
  };
}

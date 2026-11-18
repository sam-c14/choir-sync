import { Capacitor, registerPlugin } from '@capacitor/core';

interface RoomPermissionStatus {
  microphoneGranted: boolean;
  bluetoothGranted: boolean;
  notificationsGranted: boolean;
}

interface AudioRoomNativePlugin {
  startSession(options: {
    roomTitle?: string;
    isMuted?: boolean;
    includeMicrophonePermission?: boolean;
  }): Promise<RoomPermissionStatus>;
  ensureMicrophonePermission(): Promise<{ granted: boolean }>;
  updateSessionState(options: { roomTitle?: string; isMuted?: boolean }): Promise<void>;
  setSpeakerphone(options: { enabled: boolean }): Promise<void>;
  stopSession(): Promise<void>;
}

const AudioRoomNative = registerPlugin<AudioRoomNativePlugin>('AudioRoomNative');

function isCapacitorAndroid(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}

export async function startNativeAudioRoomSession(
  roomTitle: string,
  isMuted: boolean,
  includeMicrophonePermission: boolean
): Promise<RoomPermissionStatus | null> {
  if (!isCapacitorAndroid()) return null;
  try {
    return await AudioRoomNative.startSession({
      roomTitle,
      isMuted,
      includeMicrophonePermission,
    });
  } catch (err) {
    console.warn('[AudioRoomNative] Failed to start native audio room session:', err);
    return null;
  }
}

export async function ensureNativeMicrophonePermission(): Promise<boolean> {
  if (!isCapacitorAndroid()) return true;
  try {
    const res = await AudioRoomNative.ensureMicrophonePermission();
    return Boolean(res?.granted);
  } catch (err) {
    console.warn('[AudioRoomNative] Microphone permission check failed:', err);
    return false;
  }
}

export async function updateNativeAudioRoomSession(
  roomTitle: string,
  isMuted: boolean
): Promise<void> {
  if (!isCapacitorAndroid()) return;
  try {
    await AudioRoomNative.updateSessionState({ roomTitle, isMuted });
  } catch (err) {
    console.warn('[AudioRoomNative] Failed to update native audio room state:', err);
  }
}

export async function stopNativeAudioRoomSession(): Promise<void> {
  if (!isCapacitorAndroid()) return;
  try {
    await AudioRoomNative.stopSession();
  } catch (err) {
    console.warn('[AudioRoomNative] Failed to stop native audio room session:', err);
  }
}

/**
 * Shared client configuration constants and device utilities
 */

export const ANDROID_APK_DOWNLOAD_URL: string =
  import.meta.env.VITE_ANDROID_APK_URL ||
  import.meta.env.VITE_APK_DOWNLOAD_URL ||
  '';

/**
 * Returns true only if the user is visiting from an Android device
 * (browser on Android phone/tablet) and is not already running inside a native app.
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const userAgent = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
  return /android/i.test(userAgent);
}

/**
 * Shared client configuration constants
 */

export const ANDROID_APK_DOWNLOAD_URL: string =
  import.meta.env.VITE_ANDROID_APK_URL ||
  import.meta.env.VITE_APK_DOWNLOAD_URL ||
  '';

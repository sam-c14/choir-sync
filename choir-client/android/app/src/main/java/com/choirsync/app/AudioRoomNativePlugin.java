package com.choirsync.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioDeviceCallback;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "AudioRoomNative",
    permissions = {
        @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }),
        @Permission(alias = "bluetooth", strings = { "android.permission.BLUETOOTH_CONNECT" }),
        @Permission(alias = "notifications", strings = { "android.permission.POST_NOTIFICATIONS" })
    }
)
public class AudioRoomNativePlugin extends Plugin {

    private boolean isSessionActive = false;
    private String currentRoomTitle = "Live Fellowship Room";
    private boolean currentIsMuted = true;
    private Boolean speakerphoneOverride = null;
    private AudioManager audioManager;
    private AudioDeviceCallback audioDeviceCallback;

    @Override
    public void load() {
        super.load();
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
    }

    @PluginMethod
    public void startSession(PluginCall call) {
        String roomTitle = call.getString("roomTitle", "Live Fellowship Room");
        boolean isMuted = Boolean.TRUE.equals(call.getBoolean("isMuted", true));
        boolean includeMic = Boolean.TRUE.equals(call.getBoolean("includeMicrophonePermission", false));

        isSessionActive = true;
        currentRoomTitle = (roomTitle != null && !roomTitle.trim().isEmpty()) ? roomTitle : "Live Fellowship Room";
        currentIsMuted = isMuted;
        speakerphoneOverride = null;

        setKeepScreenOn(true);
        configureAudioSession();
        registerDeviceCallback();
        startOrUpdateForegroundService(currentRoomTitle, currentIsMuted);

        List<String> aliasesToRequest = new ArrayList<>();
        if (includeMic && !hasPermission(Manifest.permission.RECORD_AUDIO)) {
            aliasesToRequest.add("microphone");
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasPermission("android.permission.BLUETOOTH_CONNECT")) {
            aliasesToRequest.add("bluetooth");
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !hasPermission("android.permission.POST_NOTIFICATIONS")) {
            aliasesToRequest.add("notifications");
        }

        if (!aliasesToRequest.isEmpty()) {
            requestPermissionForAliases(aliasesToRequest.toArray(new String[0]), call, "roomPermissionsCallback");
            return;
        }

        call.resolve(buildPermissionStatusResult());
    }

    @PluginMethod
    public void ensureMicrophonePermission(PluginCall call) {
        if (hasPermission(Manifest.permission.RECORD_AUDIO) || getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
            return;
        }

        requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
    }

    @PluginMethod
    public void updateSessionState(PluginCall call) {
        String roomTitle = call.getString("roomTitle");
        if (roomTitle != null && !roomTitle.trim().isEmpty()) {
            currentRoomTitle = roomTitle;
        }
        if (call.getData().has("isMuted")) {
            currentIsMuted = Boolean.TRUE.equals(call.getBoolean("isMuted", currentIsMuted));
        }

        if (isSessionActive) {
            startOrUpdateForegroundService(currentRoomTitle, currentIsMuted);
            updateAudioRouting();
        }
        call.resolve();
    }

    @PluginMethod
    public void setSpeakerphone(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", true));
        speakerphoneOverride = enabled;
        updateAudioRouting();
        call.resolve();
    }

    @PluginMethod
    public void stopSession(PluginCall call) {
        cleanupSession();
        call.resolve();
    }

    @PermissionCallback
    private void roomPermissionsCallback(PluginCall call) {
        if (isSessionActive) {
            updateAudioRouting();
            startOrUpdateForegroundService(currentRoomTitle, currentIsMuted);
        }
        call.resolve(buildPermissionStatusResult());
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        boolean granted =
            hasPermission(Manifest.permission.RECORD_AUDIO) || getPermissionState("microphone") == PermissionState.GRANTED;
        if (granted && isSessionActive) {
            updateAudioRouting();
            startOrUpdateForegroundService(currentRoomTitle, currentIsMuted);
        }
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    private JSObject buildPermissionStatusResult() {
        JSObject result = new JSObject();
        result.put("microphoneGranted", hasPermission(Manifest.permission.RECORD_AUDIO));
        result.put(
            "bluetoothGranted",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.S || hasPermission("android.permission.BLUETOOTH_CONNECT")
        );
        result.put(
            "notificationsGranted",
            Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || hasPermission("android.permission.POST_NOTIFICATIONS")
        );
        return result;
    }

    private boolean hasPermission(String permission) {
        return ContextCompat.checkSelfPermission(getContext(), permission) == PackageManager.PERMISSION_GRANTED;
    }

    private void setKeepScreenOn(boolean keepOn) {
        Activity activity = getActivity();
        if (activity == null) return;
        activity.runOnUiThread(() -> {
            if (keepOn) {
                activity.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            } else {
                activity.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            }
        });
    }

    private void configureAudioSession() {
        if (audioManager == null) return;
        try {
            audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        } catch (Exception ignored) {
        }
        updateAudioRouting();
    }

    private void updateAudioRouting() {
        if (audioManager == null || !isSessionActive) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                List<AudioDeviceInfo> devices = audioManager.getAvailableCommunicationDevices();
                AudioDeviceInfo wiredHeadset = null;
                AudioDeviceInfo bluetoothDevice = null;
                AudioDeviceInfo builtinSpeaker = null;

                for (AudioDeviceInfo device : devices) {
                    int type = device.getType();
                    if (
                        type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                        type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                        type == AudioDeviceInfo.TYPE_USB_HEADSET ||
                        type == AudioDeviceInfo.TYPE_USB_DEVICE
                    ) {
                        wiredHeadset = device;
                    } else if (type == AudioDeviceInfo.TYPE_BLE_HEADSET || type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO) {
                        bluetoothDevice = device;
                    } else if (type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER) {
                        builtinSpeaker = device;
                    }
                }

                AudioDeviceInfo preferred = null;
                if (Boolean.TRUE.equals(speakerphoneOverride) && builtinSpeaker != null) {
                    preferred = builtinSpeaker;
                } else if (wiredHeadset != null) {
                    preferred = wiredHeadset;
                } else if (bluetoothDevice != null && hasPermission("android.permission.BLUETOOTH_CONNECT")) {
                    preferred = bluetoothDevice;
                } else if (!Boolean.FALSE.equals(speakerphoneOverride) && builtinSpeaker != null) {
                    preferred = builtinSpeaker;
                }

                if (preferred != null) {
                    audioManager.setCommunicationDevice(preferred);
                }
            } catch (Exception ignored) {
            }
            return;
        }

        // Fallback routing for Android 7–11 (API 24–30)
        try {
            boolean hasWired = false;
            boolean hasBluetooth = false;
            AudioDeviceInfo[] outputs = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS);
            for (AudioDeviceInfo device : outputs) {
                int type = device.getType();
                if (
                    type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                    type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES ||
                    type == AudioDeviceInfo.TYPE_USB_DEVICE ||
                    (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && type == AudioDeviceInfo.TYPE_USB_HEADSET)
                ) {
                    hasWired = true;
                } else if (type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO || type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP) {
                    hasBluetooth = true;
                }
            }

            if (Boolean.TRUE.equals(speakerphoneOverride)) {
                stopBluetoothScoLegacy();
                audioManager.setSpeakerphoneOn(true);
            } else if (hasWired) {
                stopBluetoothScoLegacy();
                audioManager.setSpeakerphoneOn(false);
            } else if (hasBluetooth) {
                audioManager.setSpeakerphoneOn(false);
                audioManager.setBluetoothScoOn(true);
                audioManager.startBluetoothSco();
            } else {
                stopBluetoothScoLegacy();
                audioManager.setSpeakerphoneOn(!Boolean.FALSE.equals(speakerphoneOverride));
            }
        } catch (Exception ignored) {
        }
    }

    @SuppressWarnings("deprecation")
    private void stopBluetoothScoLegacy() {
        if (audioManager == null) return;
        try {
            if (audioManager.isBluetoothScoOn()) {
                audioManager.stopBluetoothSco();
                audioManager.setBluetoothScoOn(false);
            }
        } catch (Exception ignored) {
        }
    }

    private void registerDeviceCallback() {
        if (audioManager == null || audioDeviceCallback != null) return;
        audioDeviceCallback = new AudioDeviceCallback() {
            @Override
            public void onAudioDevicesAdded(AudioDeviceInfo[] addedDevices) {
                updateAudioRouting();
            }

            @Override
            public void onAudioDevicesRemoved(AudioDeviceInfo[] removedDevices) {
                updateAudioRouting();
            }
        };
        audioManager.registerAudioDeviceCallback(audioDeviceCallback, new Handler(Looper.getMainLooper()));
    }

    private void unregisterDeviceCallback() {
        if (audioManager != null && audioDeviceCallback != null) {
            try {
                audioManager.unregisterAudioDeviceCallback(audioDeviceCallback);
            } catch (Exception ignored) {
            }
            audioDeviceCallback = null;
        }
    }

    private void startOrUpdateForegroundService(String roomTitle, boolean isMuted) {
        Context context = getContext();
        if (context == null) return;
        Intent serviceIntent = new Intent(context, AudioRoomForegroundService.class);
        serviceIntent.setAction(AudioRoomForegroundService.ACTION_START);
        serviceIntent.putExtra(AudioRoomForegroundService.EXTRA_ROOM_TITLE, roomTitle);
        serviceIntent.putExtra(AudioRoomForegroundService.EXTRA_IS_MUTED, isMuted);
        try {
            ContextCompat.startForegroundService(context, serviceIntent);
        } catch (Exception ignored) {
        }
    }

    private void stopForegroundService() {
        Context context = getContext();
        if (context == null) return;
        try {
            Intent stopIntent = new Intent(context, AudioRoomForegroundService.class);
            context.stopService(stopIntent);
        } catch (Exception ignored) {
        }
    }

    private void cleanupSession() {
        isSessionActive = false;
        speakerphoneOverride = null;
        setKeepScreenOn(false);
        unregisterDeviceCallback();
        stopForegroundService();

        if (audioManager != null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    audioManager.clearCommunicationDevice();
                } else {
                    stopBluetoothScoLegacy();
                    audioManager.setSpeakerphoneOn(false);
                }
                audioManager.setMode(AudioManager.MODE_NORMAL);
            } catch (Exception ignored) {
            }
        }
    }

    @Override
    protected void handleOnDestroy() {
        cleanupSession();
        super.handleOnDestroy();
    }
}

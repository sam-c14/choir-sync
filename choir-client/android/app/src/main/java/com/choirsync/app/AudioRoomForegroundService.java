package com.choirsync.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class AudioRoomForegroundService extends Service {

    public static final String ACTION_START = "com.choirsync.app.action.START_AUDIO_ROOM";
    public static final String ACTION_UPDATE = "com.choirsync.app.action.UPDATE_AUDIO_ROOM";
    public static final String ACTION_STOP = "com.choirsync.app.action.STOP_AUDIO_ROOM";

    public static final String EXTRA_ROOM_TITLE = "roomTitle";
    public static final String EXTRA_IS_MUTED = "isMuted";

    private static final String CHANNEL_ID = "choir_audio_room_live";
    private static final int NOTIFICATION_ID = 4102;
    private static final long WAKELOCK_TIMEOUT_MS = 4L * 60L * 60L * 1000L;

    private PowerManager.WakeLock wakeLock;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "choirsync:AudioRoomWakeLock");
            wakeLock.setReferenceCounted(false);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopServiceSafely();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopServiceSafely();
            return START_NOT_STICKY;
        }

        String roomTitle = intent.getStringExtra(EXTRA_ROOM_TITLE);
        if (roomTitle == null || roomTitle.trim().isEmpty()) {
            roomTitle = "Live Fellowship Room";
        }
        boolean isMuted = intent.getBooleanExtra(EXTRA_IS_MUTED, true);

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(WAKELOCK_TIMEOUT_MS);
        }

        Notification notification = buildNotification(roomTitle, isMuted);
        startForegroundCompat(notification, isMuted);
        return START_NOT_STICKY;
    }

    private void startForegroundCompat(Notification notification, boolean isMuted) {
        boolean hasMicPermission =
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            int serviceType = ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK;
            if (!isMuted && hasMicPermission && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                serviceType |= ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE;
            }
            try {
                startForeground(NOTIFICATION_ID, notification, serviceType);
            } catch (SecurityException ex) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            }
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String roomTitle, boolean isMuted) {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setAction(Intent.ACTION_MAIN);
        openIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent contentIntent = PendingIntent.getActivity(this, 0, openIntent, pendingFlags);

        String statusText = isMuted
            ? "Connected (Muted) • Tap to return to room"
            : "Microphone Active • Tap to return to room";

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(roomTitle)
            .setContentText(statusText)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(contentIntent)
            .build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;
            NotificationChannel existing = manager.getNotificationChannel(CHANNEL_ID);
            if (existing != null) return;

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Live Audio Rooms",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Keeps live choir audio rooms active in the background");
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }
    }

    private void stopServiceSafely() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopServiceSafely();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}

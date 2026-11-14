import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { RoomTelemetry, ConnectionStatus } from '../../hooks/use-audio-room';

interface NetworkQualityBadgeProps {
  telemetry: RoomTelemetry;
  connectionStatus: ConnectionStatus;
}

export function NetworkQualityBadge({ telemetry, connectionStatus }: NetworkQualityBadgeProps) {
  if (connectionStatus === 'disconnected') {
    return null;
  }

  if (connectionStatus === 'reconnecting') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
        <Wifi className="w-3.5 h-3.5" />
        <span>Reconnecting...</span>
      </div>
    );
  }

  if (connectionStatus === 'failed') {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Connection Failed</span>
      </div>
    );
  }

  const { rttMs, packetLossPercent, quality } = telemetry;

  const colorClasses = {
    excellent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    good: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    poor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  }[quality];

  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses}`}
      title={`Round Trip: ${rttMs}ms | Packet Loss: ${packetLossPercent}% | Jitter: ${telemetry.jitterMs}ms`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
            quality === 'excellent'
              ? 'bg-emerald-400'
              : quality === 'good'
              ? 'bg-amber-400'
              : 'bg-red-400'
          }`}
        />
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            quality === 'excellent'
              ? 'bg-emerald-500'
              : quality === 'good'
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
        />
      </span>
      <span>{rttMs > 0 ? `${rttMs}ms` : 'Connected'}</span>
      {packetLossPercent > 0 && <span className="opacity-75">({packetLossPercent}% loss)</span>}
    </div>
  );
}

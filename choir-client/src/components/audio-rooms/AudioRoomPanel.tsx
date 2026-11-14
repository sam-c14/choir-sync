import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Mic,
  MicOff,
  Hand,
  Volume2,
  Users,
  Radio,
  LogOut,
  Shield,
  VolumeX,
  UserCheck,
  UserX,
  AlertCircle,
  Headphones,
  PhoneOff,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { UserAvatar } from '../ui/user-avatar';
import { NetworkQualityBadge } from './NetworkQualityBadge';
import {
  useAudioRoom,
  RoomParticipantState,
  RemoteAudioStream,
} from '../../hooks/use-audio-room';
import { createAudioMeter } from '../../lib/audio-meter';
import { useAuth } from '../../auth/auth-context';

interface AudioRoomPanelProps {
  roomId: string;
  roomTitle: string;
  roomDescription?: string | null;
  hostId: string;
  onLeave: () => void;
}

export function AudioRoomPanel({
  roomId,
  roomTitle,
  roomDescription,
  hostId,
  onLeave,
}: AudioRoomPanelProps) {
  const { user } = useAuth();
  const isHost = user?.id === hostId;
  const initialRole = isHost ? 'host' : 'listener';

  const {
    connectionStatus,
    role,
    isMuted,
    handRaised,
    participants,
    remoteStreams,
    localStream,
    telemetry,
    error,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleHandRaise,
    promoteToSpeaker,
    demoteToListener,
    muteAll,
  } = useAudioRoom({ roomId, initialRole });

  const [activeSpeakingUsers, setActiveSpeakingUsers] = useState<Set<string>>(new Set());

  // Automatically join conference audio immediately on mount (no intermediate splash page)
  useEffect(() => {
    let active = true;
    joinRoom().catch((err) => {
      if (active) {
        console.warn('Auto-join conference room warning:', err);
      }
    });
    return () => {
      active = false;
    };
  }, [joinRoom]);

  // Handle local speaking meter
  useEffect(() => {
    if (!localStream || isMuted) {
      setActiveSpeakingUsers((prev) => {
        const next = new Set(prev);
        if (user?.id) next.delete(user.id);
        return next;
      });
      return;
    }

    const meter = createAudioMeter(localStream, (_vol, isSpeaking) => {
      setActiveSpeakingUsers((prev) => {
        const next = new Set(prev);
        if (user?.id) {
          if (isSpeaking) next.add(user.id);
          else next.delete(user.id);
        }
        return next;
      });
    });

    return () => {
      meter.stop();
    };
  }, [localStream, isMuted, user]);

  const handleLeave = async () => {
    await leaveRoom();
    onLeave();
  };

  // Compute live participant list ensuring current user state is represented even before presence sync
  const localParticipantInList = participants.some((p) => p.userId === user?.id);
  const baseParticipants: RoomParticipantState[] = [...participants];
  if (!localParticipantInList && user) {
    baseParticipants.push({
      userId: user.id,
      name: user.name || user.email || 'You',
      avatarUrl: user.avatarUrl,
      role,
      isMuted,
      handRaised,
    });
  }

  const liveParticipants = baseParticipants.map((p) => {
    if (p.userId === user?.id) {
      return {
        ...p,
        role,
        isMuted,
        handRaised,
      };
    }
    return p;
  });

  // Google Meet / Zoom style ordered grid:
  // 1. Actively speaking participants
  // 2. Participants with hand raised
  // 3. Current User (You)
  // 4. Role (Host > Speaker > Listener)
  // 5. Unmuted before Muted
  // 6. Alphabetical by name
  const sortedParticipants = useMemo(() => {
    return [...liveParticipants].sort((a, b) => {
      const aSpeaking = activeSpeakingUsers.has(a.userId) ? 1 : 0;
      const bSpeaking = activeSpeakingUsers.has(b.userId) ? 1 : 0;
      if (aSpeaking !== bSpeaking) return bSpeaking - aSpeaking;

      const aHand = a.handRaised ? 1 : 0;
      const bHand = b.handRaised ? 1 : 0;
      if (aHand !== bHand) return bHand - aHand;

      const aIsSelf = a.userId === user?.id ? 1 : 0;
      const bIsSelf = b.userId === user?.id ? 1 : 0;
      if (aIsSelf !== bIsSelf) return bIsSelf - aIsSelf;

      const rolePriority: Record<string, number> = { host: 3, speaker: 2, listener: 1 };
      const aRole = rolePriority[a.role] || 0;
      const bRole = rolePriority[b.role] || 0;
      if (aRole !== bRole) return bRole - aRole;

      const aMuted = a.isMuted ? 0 : 1;
      const bMuted = b.isMuted ? 0 : 1;
      if (aMuted !== bMuted) return bMuted - aMuted;

      return a.name.localeCompare(b.name);
    });
  }, [liveParticipants, activeSpeakingUsers, user?.id]);

  const handRaisers = liveParticipants.filter((p) => p.handRaised);
  const speakersCount = liveParticipants.filter((p) => p.role === 'host' || p.role === 'speaker').length;

  // Responsive Google Meet / Zoom grid layout class
  const getGridClass = (count: number) => {
    if (count <= 1) return 'grid-cols-1 max-w-2xl mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto';
    if (count <= 6) return 'grid-cols-2 sm:grid-cols-3';
    return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
  };

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto p-3 sm:p-4 space-y-4">
      {/* Hidden audio elements for incoming WebRTC speaker streams */}
      {Array.from(remoteStreams.entries()).map(([trackId, remote]) => (
        <RemoteAudioPlayer
          key={trackId}
          remote={remote}
          onSpeakingChange={(isSpeaking) => {
            setActiveSpeakingUsers((prev) => {
              const next = new Set(prev);
              if (remote.userId) {
                if (isSpeaking) next.add(remote.userId);
                else next.delete(remote.userId);
              }
              return next;
            });
          }}
        />
      ))}

      {/* Conference Room Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-card border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate">
                {roomTitle}
              </h2>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Call
              </span>
              {connectionStatus === 'connecting' && (
                <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Connecting...
                </span>
              )}
            </div>
            {roomDescription && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{roomDescription}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <NetworkQualityBadge telemetry={telemetry} connectionStatus={connectionStatus} />
          <Button
            variant="destructive"
            size="sm"
            onClick={handleLeave}
            className="h-8 gap-1.5 text-xs rounded-lg shadow-sm"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave</span>
          </Button>
        </div>
      </div>

      {/* Error alert banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hands Raised Queue Banner (Visible to all participants like Google Meet) */}
      {handRaisers.length > 0 && (
        <div className="p-3 sm:p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-2 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Hand className="w-4 h-4 animate-bounce" />
              <h4 className="text-xs font-bold uppercase tracking-wider">
                Hands Raised ({handRaisers.length})
              </h4>
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              {isHost ? 'Promote members to invite them to speak' : 'Participants requesting to speak'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {handRaisers.map((raiser) => {
              const isSelf = raiser.userId === user?.id;
              return (
                <div
                  key={raiser.userId}
                  className="flex items-center gap-2 px-3 py-1 rounded-xl bg-card border border-amber-500/25 shadow-sm text-xs"
                >
                  <UserAvatar
                    name={raiser.name}
                    email={raiser.name}
                    src={raiser.avatarUrl || null}
                    className="w-5 h-5"
                  />
                  <span className="font-medium text-foreground">
                    {raiser.name} {isSelf && '(You)'}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-full font-medium">
                    <Hand className="w-3 h-3 text-amber-500" /> Raised
                  </span>
                  {isHost && !isSelf && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-6 px-2 text-[10px] gap-1 ml-1 hover:bg-emerald-500/10 hover:text-emerald-600"
                      onClick={() => promoteToSpeaker(raiser.userId)}
                    >
                      <UserCheck className="w-3 h-3 text-emerald-500" />
                      Promote
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Google Meet / Zoom Conference Video/Audio Grid */}
      <div className="flex-1 min-h-[420px] flex flex-col justify-center">
        <div className={`grid gap-3.5 sm:gap-4 w-full ${getGridClass(sortedParticipants.length)}`}>
          {sortedParticipants.map((p) => {
            const isSpeaking = activeSpeakingUsers.has(p.userId);
            const isSelf = p.userId === user?.id;

            return (
              <div
                key={p.userId}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl bg-zinc-900 border transition-all duration-300 shadow-md aspect-[4/3] sm:aspect-[16/10] p-3 sm:p-4 ${
                  isSpeaking
                    ? 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                    : p.handRaised
                    ? 'border-amber-500/80 ring-2 ring-amber-500/30'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Top Overlay Row inside Participant Tile */}
                <div className="flex items-center justify-between w-full z-10">
                  {/* Left: Role / Hand Raised Status */}
                  <div className="flex items-center gap-1.5">
                    {p.handRaised ? (
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold text-[10px] shadow-lg animate-bounce">
                        <Hand className="w-3 h-3 fill-white" />
                        <span>Hand Raised</span>
                      </span>
                    ) : p.role === 'host' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
                        <Shield className="w-2.5 h-2.5" />
                        <span>Host</span>
                      </span>
                    ) : p.role === 'speaker' ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-semibold">
                        <span>Speaker</span>
                      </span>
                    ) : null}
                  </div>

                  {/* Right: Audio / Mic status badge */}
                  <div>
                    {p.role === 'listener' ? (
                      <span
                        className="p-1.5 rounded-full bg-black/60 backdrop-blur-md text-zinc-400 border border-white/10 flex items-center justify-center"
                        title="Listener (Audio Only)"
                      >
                        <Headphones className="w-3.5 h-3.5" />
                      </span>
                    ) : p.isMuted ? (
                      <span
                        className="p-1.5 rounded-full bg-red-500/90 text-white shadow-sm flex items-center justify-center"
                        title="Muted"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                      </span>
                    ) : isSpeaking ? (
                      <span
                        className="p-1.5 rounded-full bg-emerald-500 text-white shadow animate-pulse flex items-center justify-center"
                        title="Speaking Live"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span
                        className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md flex items-center justify-center"
                        title="Microphone Active"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>

                {/* Center: Large Avatar with Speaking Equalizer Ring */}
                <div className="flex-1 flex items-center justify-center relative my-1">
                  <div className="relative">
                    <UserAvatar
                      name={p.name}
                      email={p.name}
                      src={p.avatarUrl || null}
                      className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 transition-transform duration-300 border-2 border-white/10 shadow-xl ${
                        isSpeaking ? 'scale-110 ring-4 ring-emerald-500/50 border-emerald-500' : ''
                      }`}
                    />
                    {isSpeaking && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 items-center justify-center text-[8px] text-white font-bold">
                          ♪
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Overlay Row (Google Meet style name pill + host controls) */}
                <div className="flex items-center justify-between gap-2 z-10 w-full">
                  <div className="bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl flex items-center gap-1.5 max-w-[80%] min-w-0">
                    {isSpeaking && (
                      <div className="flex items-end gap-0.5 h-3 shrink-0">
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-2" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-3" />
                        <span className="w-0.5 bg-emerald-400 rounded-full animate-pulse h-1.5" />
                      </div>
                    )}
                    <span className="text-xs sm:text-sm font-medium text-white truncate">
                      {p.name} {isSelf && <span className="text-zinc-400 font-normal">(You)</span>}
                    </span>
                  </div>

                  {/* Host Moderation Controls */}
                  {isHost && !isSelf && (
                    <div className="shrink-0">
                      {p.role === 'listener' ? (
                        <Button
                          size="sm"
                          className="h-6 px-2 text-[10px] bg-primary/90 hover:bg-primary text-white shadow-sm gap-1"
                          onClick={() => promoteToSpeaker(p.userId)}
                          title="Invite to Speak"
                        >
                          <UserCheck className="w-3 h-3" />
                          <span className="hidden sm:inline">Invite</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => demoteToListener(p.userId)}
                          title="Demote to Listener"
                        >
                          <UserX className="w-3 h-3" />
                          <span className="hidden sm:inline">To Listener</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Google Meet / Zoom Bottom Call Control Bar */}
      <div className="sticky bottom-4 left-0 right-0 p-3 rounded-2xl bg-zinc-950/90 backdrop-blur-lg border border-zinc-800 shadow-2xl flex items-center justify-center gap-4 z-20">
        {/* Mute / Unmute Button */}
        {role === 'host' || role === 'speaker' ? (
          <Button
            variant={isMuted ? 'destructive' : 'default'}
            size="lg"
            className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0 shadow-lg"
            onClick={toggleMute}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5 sm:w-6 sm:h-6" /> : <Mic className="w-5 h-5 sm:w-6 sm:h-6" />}
          </Button>
        ) : (
          <div className="text-center" title="Listeners cannot speak. Raise hand to request permission.">
            <Button
              variant="outline"
              size="lg"
              disabled
              className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0 opacity-40 cursor-not-allowed border-zinc-700 bg-zinc-900"
            >
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
            </Button>
          </div>
        )}

        {/* Raise Hand Button */}
        <Button
          variant={handRaised ? 'default' : 'secondary'}
          size="lg"
          className={`rounded-full h-11 sm:h-12 px-5 gap-2 shadow-sm ${
            handRaised
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
          }`}
          onClick={toggleHandRaise}
        >
          <Hand className="w-5 h-5" />
          <span className="text-xs font-semibold">
            {handRaised ? 'Hand Raised' : 'Raise Hand'}
          </span>
        </Button>

        {/* Host Mute All Action */}
        {isHost && speakersCount > 1 && (
          <Button
            variant="outline"
            size="lg"
            className="rounded-full h-11 sm:h-12 px-4 gap-1.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
            onClick={muteAll}
            title="Mute all other speakers"
          >
            <VolumeX className="w-4 h-4" />
            <span className="hidden sm:inline">Mute All</span>
          </Button>
        )}

        {/* End / Leave Call Button */}
        <Button
          variant="destructive"
          size="lg"
          className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0 shadow-lg bg-red-600 hover:bg-red-700"
          onClick={handleLeave}
          title="Leave Audio Conference"
        >
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
        </Button>
      </div>
    </div>
  );
}

// Sub-component to attach WebRTC MediaStream to hidden HTMLAudioElement with voice meter
function RemoteAudioPlayer({
  remote,
  onSpeakingChange,
}: {
  remote: RemoteAudioStream;
  onSpeakingChange: (isSpeaking: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current && remote.stream) {
      audioRef.current.srcObject = remote.stream;
      audioRef.current.play().catch((err) => {
        console.warn('Autoplay audio stream handled:', err);
      });
    }

    const meter = createAudioMeter(remote.stream, (_vol, isSpeaking) => {
      onSpeakingChange(isSpeaking);
    });

    return () => {
      meter.stop();
    };
  }, [remote.stream, onSpeakingChange]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

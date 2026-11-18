import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  BookOpen,
  MessageSquare,
  Smile,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { UserAvatar } from '../ui/user-avatar';
import { NetworkQualityBadge } from './NetworkQualityBadge';
import { BibleReaderPanel } from './BibleReaderPanel';
import { RoomChatPanel } from './RoomChatPanel';
import { EmojiReactionsOverlay } from './EmojiReactionsOverlay';
import {
  useAudioRoom,
  RoomParticipantState,
  RemoteAudioStream,
} from '../../hooks/use-audio-room';
import { createAudioMeter } from '../../lib/audio-meter';
import { formatReferenceLabel, BibleVersion } from '../../lib/bible';
import { useAuth } from '../../auth/auth-context';
import { toast } from 'sonner';

interface AudioRoomPanelProps {
  roomId: string;
  roomTitle: string;
  roomDescription?: string | null;
  hostId: string;
  onLeave: () => void;
}

const REACTION_EMOJIS = ['💖', '👍', '🎉', '👏', '😂', '🙏', '🙌', '🔥'] as const;

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
    activeBibleReference,
    chatMessages,
    error,
    joinRoom,
    leaveRoom,
    toggleMute,
    toggleHandRaise,
    promoteToSpeaker,
    demoteToListener,
    muteAll,
    shareBibleReference,
    sendChatMessage,
    sendEmojiReaction,
    subscribeToEmojiReactions,
  } = useAudioRoom({
    roomId,
    initialRole,
    onRoomEnded: () => {
      toast.info('This room has been closed.');
      onLeave();
    },
  });

  const [activeSpeakingUsers, setActiveSpeakingUsers] = useState<Set<string>>(new Set());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [unlockTick, setUnlockTick] = useState(0);
  const [activePanel, setActivePanel] = useState<'none' | 'bible' | 'chat'>('none');
  const [hasUnreadBibleCall, setHasUnreadBibleCall] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [dismissedBibleCalledAt, setDismissedBibleCalledAt] = useState<number | null>(null);
  const [bibleJumpTarget, setBibleJumpTarget] = useState<{
    bookId: string;
    chapter: number;
    verseStart?: number;
    verseEnd?: number;
    version?: BibleVersion;
    nonce: number;
  } | null>(null);
  const lastSeenBibleCallRef = useRef<number | undefined>(undefined);
  const prevChatCountRef = useRef<number>(0);
  const emojiBarRef = useRef<HTMLDivElement | null>(null);

  const isSidePanelOpen = activePanel !== 'none';
  const isBibleOpen = activePanel === 'bible';
  const isChatOpen = activePanel === 'chat';

  useEffect(() => {
    if (activeBibleReference?.calledAt && activeBibleReference.calledAt !== lastSeenBibleCallRef.current) {
      lastSeenBibleCallRef.current = activeBibleReference.calledAt;
      setDismissedBibleCalledAt(null);
      if (activePanel !== 'bible') {
        setHasUnreadBibleCall(true);
      }
    }
  }, [activeBibleReference, activePanel]);

  useEffect(() => {
    if (activePanel === 'chat') {
      prevChatCountRef.current = chatMessages.length;
      setUnreadChatCount(0);
      return;
    }
    if (chatMessages.length > prevChatCountRef.current) {
      const added = chatMessages.length - prevChatCountRef.current;
      prevChatCountRef.current = chatMessages.length;
      setUnreadChatCount((c) => c + added);
    } else {
      prevChatCountRef.current = chatMessages.length;
    }
  }, [chatMessages.length, activePanel]);

  useEffect(() => {
    if (!isEmojiPickerOpen) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (emojiBarRef.current && !emojiBarRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isEmojiPickerOpen]);

  useEffect(() => {
    if (!isSidePanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePanel('none');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSidePanelOpen]);

  const handleRemoteSpeakingChange = useCallback((speakerUserId: string, isSpeaking: boolean) => {
    if (!speakerUserId) return;
    setActiveSpeakingUsers((prev) => {
      if (prev.has(speakerUserId) === isSpeaking) return prev;
      const next = new Set(prev);
      if (isSpeaking) next.add(speakerUserId);
      else next.delete(speakerUserId);
      return next;
    });
  }, []);

  const handleAutoplayBlockedChange = useCallback((blocked: boolean) => {
    setAutoplayBlocked(blocked);
  }, []);

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
  }, []);

  // Handle local speaking meter
  useEffect(() => {
    const uid = user?.id;
    if (!localStream || isMuted || !uid) {
      if (uid) {
        setActiveSpeakingUsers((prev) => {
          if (!prev.has(uid)) return prev;
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }
      return;
    }

    const meter = createAudioMeter(localStream, (_vol, isSpeaking) => {
      setActiveSpeakingUsers((prev) => {
        if (prev.has(uid) === isSpeaking) return prev;
        const next = new Set(prev);
        if (isSpeaking) next.add(uid);
        else next.delete(uid);
        return next;
      });
    });

    return () => {
      meter.stop();
    };
  }, [localStream, isMuted, user?.id]);

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  const openBibleToCalled = () => {
    if (activeBibleReference) {
      setBibleJumpTarget({
        bookId: activeBibleReference.bookId,
        chapter: activeBibleReference.chapter,
        verseStart: activeBibleReference.verseStart,
        verseEnd: activeBibleReference.verseEnd,
        version: activeBibleReference.version,
        nonce: Date.now(),
      });
    }
    setActivePanel('bible');
    setHasUnreadBibleCall(false);
  };

  const toggleBiblePanel = () => {
    setActivePanel((prev) => {
      const next = prev === 'bible' ? 'none' : 'bible';
      if (next === 'bible') setHasUnreadBibleCall(false);
      return next;
    });
  };

  const toggleChatPanel = () => {
    setActivePanel((prev) => {
      const next = prev === 'chat' ? 'none' : 'chat';
      if (next === 'chat') setUnreadChatCount(0);
      return next;
    });
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
  const activeSpeakersList = liveParticipants.filter((p) => activeSpeakingUsers.has(p.userId));
  const showCalledBibleBanner = Boolean(
    activeBibleReference && activeBibleReference.calledAt !== dismissedBibleCalledAt
  );

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
      {/* Isolated GPU-composited floating emoji reactions overlay */}
      <EmojiReactionsOverlay currentUserId={user?.id} subscribe={subscribeToEmojiReactions} />

      {/* Hidden audio elements for incoming WebRTC speaker streams */}
      {Array.from(remoteStreams.entries()).map(([trackId, remote]) => (
        <RemoteAudioPlayer
          key={trackId}
          remote={remote}
          unlockTick={unlockTick}
          onSpeakingChange={handleRemoteSpeakingChange}
          onAutoplayBlockedChange={handleAutoplayBlockedChange}
        />
      ))}

      {autoplayBlocked && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>Sound was paused by your browser. Tap Enable Sound to listen.</span>
          </div>
          <Button
            size="sm"
            variant="default"
            onClick={() => {
              setUnlockTick((t) => t + 1);
              setAutoplayBlocked(false);
            }}
          >
            Enable Sound
          </Button>
        </div>
      )}

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
                Live Room
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
              {isHost ? 'Tap Allow to invite someone to speak' : 'Waiting to speak'}
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
                      Allow
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Called Scripture Alert Banner */}
      {showCalledBibleBanner && activeBibleReference && (
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl bg-primary/10 border border-primary/25 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300 shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                Scripture Called:{' '}
                <span className="text-purple-700 dark:text-purple-300">
                  {formatReferenceLabel(
                    activeBibleReference.bookName,
                    activeBibleReference.chapter,
                    activeBibleReference.verseStart,
                    activeBibleReference.verseEnd,
                    activeBibleReference.version
                  )}
                </span>
              </p>
              {activeBibleReference.sharedByName && (
                <p className="text-[11px] text-muted-foreground truncate">
                  Shared by {activeBibleReference.sharedByName}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="default" className="h-7 px-3 text-xs" onClick={openBibleToCalled}>
              {isBibleOpen ? 'Jump' : 'Open Bible'}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              onClick={() => setDismissedBibleCalledAt(activeBibleReference.calledAt ?? null)}
              aria-label="Dismiss scripture notice"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Google Meet / Zoom Conference Video/Audio Grid */}
      <div className="flex-1 min-h-[380px] flex flex-col justify-center">
        <div className={`grid gap-3.5 sm:gap-4 w-full ${getGridClass(sortedParticipants.length)}`}>
          {sortedParticipants.map((p) => {
            const isSpeaking = activeSpeakingUsers.has(p.userId);
            const isSelf = p.userId === user?.id;

            return (
              <div
                key={p.userId}
                className={`relative isolate z-0 flex flex-col justify-between overflow-hidden rounded-2xl bg-zinc-900 border transition-all duration-300 shadow-md aspect-[4/3] sm:aspect-[16/10] p-3 sm:p-4 ${
                  isSpeaking
                    ? 'border-emerald-500 ring-4 ring-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                    : p.handRaised
                    ? 'border-amber-500/80 ring-2 ring-amber-500/30'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {/* Top Overlay Row inside Participant Tile */}
                <div className="relative z-[1] flex items-center justify-between w-full">
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
                        title="Listening"
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
                <div className="relative z-[1] flex items-center justify-between gap-2 w-full">
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
                          title="Move back to listeners"
                        >
                          <UserX className="w-3 h-3" />
                          <span className="hidden sm:inline">Listener</span>
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

      {/* Responsive Slide-Over Drawer for Chat & Bible (Portaled above Navbar, Call Bar, and Mobile BottomNav) */}
      {isSidePanelOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/45 backdrop-blur-[1px] animate-in fade-in duration-150"
              onClick={() => setActivePanel('none')}
              aria-hidden="true"
            />

            {/* Drawer Surface */}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={isBibleOpen ? 'Scripture Reader' : 'Room Chat'}
              className="relative z-10 w-full h-[100dvh] sm:w-[440px] md:w-[480px] bg-card sm:border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
            >
              {/* Drawer Live Call Strip + Chat/Bible Switcher */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-950 text-white border-b border-zinc-800 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-medium truncate">
                    {activeSpeakersList.length > 0
                      ? activeSpeakersList.map((s) => s.name).join(', ')
                      : `${liveParticipants.length} in room`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="inline-flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setActivePanel('chat')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        isChatOpen ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Chat{unreadChatCount > 0 && !isChatOpen ? ` (${unreadChatCount})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePanel('bible')}
                      className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                        isBibleOpen ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      Bible
                    </button>
                  </div>

                  {(role === 'host' || role === 'speaker') && (
                    <Button
                      type="button"
                      size="icon"
                      variant={isMuted ? 'destructive' : 'secondary'}
                      className="h-7 w-7 rounded-full sm:hidden"
                      onClick={toggleMute}
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant={handRaised ? 'default' : 'ghost'}
                    className={`h-7 w-7 rounded-full sm:hidden ${
                      handRaised ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-zinc-300'
                    }`}
                    onClick={toggleHandRaise}
                    aria-label="Toggle raise hand"
                  >
                    <Hand className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    onClick={() => setActivePanel('none')}
                  >
                    <span className="sm:hidden">Call</span>
                    <span className="hidden sm:inline">Close</span>
                  </Button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {isBibleOpen ? (
                  <BibleReaderPanel
                    onClose={() => setActivePanel('none')}
                    canBroadcast={role === 'host' || role === 'speaker'}
                    calledReference={activeBibleReference}
                    jumpTarget={bibleJumpTarget}
                    onShareReference={shareBibleReference}
                  />
                ) : (
                  <RoomChatPanel
                    messages={chatMessages}
                    currentUserId={user?.id}
                    onSendMessage={sendChatMessage}
                    onClose={() => setActivePanel('none')}
                  />
                )}
              </div>
            </aside>
          </div>,
          document.body
        )}

      {/* Google Meet / Zoom Bottom Call Control Bar */}
      <div className="sticky bottom-4 left-0 right-0 flex flex-col items-center z-20" ref={emojiBarRef}>
        {/* Floating Google Meet Emoji Picker Bar */}
        {isEmojiPickerOpen && (
          <div className="mb-2.5 px-2.5 py-1.5 rounded-full bg-zinc-900/95 backdrop-blur-lg border border-zinc-700/80 shadow-2xl flex items-center gap-1 sm:gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => sendEmojiReaction(emoji)}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xl sm:text-2xl hover:bg-zinc-800 active:scale-125 transition-transform select-none"
                title={`React with ${emoji}`}
                aria-label={`Send ${emoji} reaction`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-zinc-950/90 backdrop-blur-lg border border-zinc-800 shadow-2xl flex items-center justify-center flex-wrap gap-2 sm:gap-3.5">
          {/* Mute / Unmute Button */}
          {role === 'host' || role === 'speaker' ? (
            <Button
              variant={isMuted ? 'destructive' : 'default'}
              size="lg"
              className="rounded-full w-11 h-11 sm:w-13 sm:h-13 p-0 shadow-lg"
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
                className="rounded-full w-11 h-11 sm:w-13 sm:h-13 p-0 opacity-40 cursor-not-allowed border-zinc-700 bg-zinc-900"
              >
                <MicOff className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
              </Button>
            </div>
          )}

          {/* Emoji Reaction Button (Google Meet style) */}
          <Button
            variant={isEmojiPickerOpen ? 'default' : 'secondary'}
            size="lg"
            className={`rounded-full w-11 h-11 sm:w-12 sm:h-12 p-0 shadow-sm ${
              isEmojiPickerOpen
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            onClick={() => setIsEmojiPickerOpen((o) => !o)}
            title="Send a reaction"
            aria-label="Send a reaction"
          >
            <Smile className="w-5 h-5" />
          </Button>

          {/* Raise Hand Button */}
          <Button
            variant={handRaised ? 'default' : 'secondary'}
            size="lg"
            className={`rounded-full h-11 sm:h-12 px-3.5 sm:px-4 gap-2 shadow-sm ${
              handRaised
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            onClick={toggleHandRaise}
            title={handRaised ? 'Lower Hand' : 'Raise Hand'}
          >
            <Hand className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">
              {handRaised ? 'Raised' : 'Raise Hand'}
            </span>
          </Button>

          {/* In-Call Chat Toggle Button */}
          <Button
            variant={isChatOpen ? 'default' : 'secondary'}
            size="lg"
            className={`relative rounded-full h-11 sm:h-12 px-3.5 sm:px-4 gap-2 shadow-sm ${
              isChatOpen
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            onClick={toggleChatPanel}
            title="Chat with everyone"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">Chat</span>
            {unreadChatCount > 0 && !isChatOpen && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-zinc-950">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            )}
          </Button>

          {/* Bible Reader Toggle Button */}
          <Button
            variant={isBibleOpen ? 'default' : 'secondary'}
            size="lg"
            className={`relative rounded-full h-11 sm:h-12 px-3.5 sm:px-4 gap-2 shadow-sm ${
              isBibleOpen
                ? 'bg-primary text-primary-foreground'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700'
            }`}
            onClick={toggleBiblePanel}
            title="Open KJV / BSB Bible Reader"
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-semibold hidden sm:inline">Bible</span>
            {hasUnreadBibleCall && !isBibleOpen && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-400 ring-2 ring-zinc-950 animate-pulse" />
            )}
          </Button>

          {/* Host Mute All Action */}
          {isHost && speakersCount > 1 && (
            <Button
              variant="outline"
              size="lg"
              className="rounded-full h-11 sm:h-12 px-3.5 gap-1.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200"
              onClick={muteAll}
              title="Mute all other speakers"
            >
              <VolumeX className="w-4 h-4" />
              <span className="hidden md:inline">Mute All</span>
            </Button>
          )}

          {/* End / Leave Call Button */}
          <Button
            variant="destructive"
            size="lg"
            className="rounded-full w-11 h-11 sm:w-13 sm:h-13 p-0 shadow-lg bg-red-600 hover:bg-red-700"
            onClick={handleLeave}
            title="Leave Room"
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Sub-component to attach WebRTC MediaStream to invisible HTMLAudioElement with voice meter
function RemoteAudioPlayer({
  remote,
  unlockTick,
  onSpeakingChange,
  onAutoplayBlockedChange,
}: {
  remote: RemoteAudioStream;
  unlockTick: number;
  onSpeakingChange: (userId: string, isSpeaking: boolean) => void;
  onAutoplayBlockedChange: (blocked: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onSpeakingRef = useRef(onSpeakingChange);
  onSpeakingRef.current = onSpeakingChange;
  const onBlockedRef = useRef(onAutoplayBlockedChange);
  onBlockedRef.current = onAutoplayBlockedChange;
  const userIdRef = useRef(remote.userId);
  userIdRef.current = remote.userId;

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !remote.stream) return;

    el.srcObject = remote.stream;
    el.muted = false;
    el.volume = 1.0;

    const tryPlay = () => {
      el.play()
        .then(() => {
          onBlockedRef.current(false);
        })
        .catch((err) => {
          console.warn('[Audio] Autoplay pending user interaction:', err);
          if (err?.name === 'NotAllowedError') {
            onBlockedRef.current(true);
          }
        });
    };

    tryPlay();

    // Listen on audio tracks in case they unmute after SDP negotiation
    const tracks = remote.stream.getAudioTracks();
    tracks.forEach((track) => {
      track.enabled = true;
      track.addEventListener('unmute', tryPlay);
    });

    const unlock = () => {
      el.play()
        .then(() => {
          onBlockedRef.current(false);
        })
        .catch(() => {});
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);

    const meter = createAudioMeter(remote.stream, (_vol, isSpeaking) => {
      if (userIdRef.current) {
        onSpeakingRef.current(userIdRef.current, isSpeaking);
      }
    });

    return () => {
      tracks.forEach((track) => {
        track.removeEventListener('unmute', tryPlay);
      });
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
      meter.stop();
      if (userIdRef.current) {
        onSpeakingRef.current(userIdRef.current, false);
      }
    };
  }, [remote.stream]);

  // Retry play when user explicitly clicks the Enable Audio banner
  useEffect(() => {
    if (unlockTick === 0) return;
    const el = audioRef.current;
    if (!el) return;
    el.play()
      .then(() => onBlockedRef.current(false))
      .catch(() => {});
  }, [unlockTick]);

  return (
    <audio
      ref={audioRef}
      autoPlay
      playsInline
      controls={false}
      style={{
        position: 'absolute',
        width: '1px',
        height: '1px',
        padding: 0,
        margin: '-1px',
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        border: 0,
        opacity: 0,
        pointerEvents: 'none',
      }}
    />
  );
}

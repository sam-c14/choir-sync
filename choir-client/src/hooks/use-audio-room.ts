import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { cloudflareSfuClient, SfuSessionResponse } from '../lib/cloudflare-sfu-client';
import { optimizeOpusSdp } from '../lib/sdp-utils';
import { useAuth } from '../auth/auth-context';
import type { AudioRoomRole } from '@choir-workspace/shared-validation';

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'poor'
  | 'failed';

export interface RoomParticipantState {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  role: AudioRoomRole;
  isMuted: boolean;
  handRaised: boolean;
  sessionId?: string | null;
  trackName?: string | null;
  speakingVolume?: number;
  isSpeaking?: boolean;
}

export interface RemoteAudioStream {
  stream: MediaStream;
  userId: string;
  sessionId: string;
  trackName: string;
}

export interface RoomTelemetry {
  rttMs: number;
  jitterMs: number;
  packetLossPercent: number;
  quality: 'excellent' | 'good' | 'poor';
}

interface UseAudioRoomOptions {
  roomId: string;
  initialRole?: AudioRoomRole;
}

export function useAudioRoom({ roomId, initialRole = 'listener' }: UseAudioRoomOptions) {
  const { user } = useAuth();

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [role, setRole] = useState<AudioRoomRole>(initialRole);
  const [isMuted, setIsMuted] = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [participants, setParticipants] = useState<RoomParticipantState[]>([]);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, RemoteAudioStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [telemetry, setTelemetry] = useState<RoomTelemetry>({
    rttMs: 0,
    jitterMs: 0,
    packetLossPercent: 0,
    quality: 'excellent',
  });
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const localTrackNameRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const subscribedTracksRef = useRef<Set<string>>(new Set());
  const realtimeChannelRef = useRef<any>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isJoinedRef = useRef(false);

  // Sync state with refs for listeners
  const roleRef = useRef<AudioRoomRole>(role);
  roleRef.current = role;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;
  const handRaisedRef = useRef<boolean>(handRaised);
  handRaisedRef.current = handRaised;

  // Clean up WebRTC peer connection
  const cleanupPeerConnection = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    subscribedTracksRef.current.clear();
    sessionIdRef.current = null;
    localTrackNameRef.current = null;
    setRemoteStreams(new Map());
    setConnectionStatus('disconnected');
  }, []);

  // Poll RTCPeerConnection statistics every 3 seconds for telemetry
  const startTelemetryMonitoring = useCallback((pc: RTCPeerConnection) => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);

    statsIntervalRef.current = setInterval(async () => {
      if (!pc || pc.connectionState === 'closed') return;

      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let jitter = 0;
        let packetsLost = 0;
        let packetsReceived = 0;

        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
          }
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            jitter = Math.round((report.jitter || 0) * 1000);
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
        });

        const totalPackets = packetsReceived + packetsLost;
        const lossPercent = totalPackets > 0 ? Math.round((packetsLost / totalPackets) * 100) : 0;

        let quality: 'excellent' | 'good' | 'poor' = 'excellent';
        if (rtt > 300 || lossPercent > 5 || jitter > 60) {
          quality = 'poor';
        } else if (rtt > 150 || lossPercent > 2 || jitter > 30) {
          quality = 'good';
        }

        setTelemetry({
          rttMs: rtt,
          jitterMs: jitter,
          packetLossPercent: lossPercent,
          quality,
        });

        if (quality === 'poor' && pc.connectionState === 'connected') {
          setConnectionStatus('poor');
        } else if (pc.connectionState === 'connected') {
          setConnectionStatus('connected');
        }
      } catch {
        // Silently tolerate closed peer connection state
      }
    }, 3000);
  }, []);

  // Subscribe to remote speaker tracks announced via Supabase Realtime
  const subscribeToRemoteTrack = useCallback(
    async (speakerSessionId: string, trackName: string, speakerUserId: string) => {
      const pc = pcRef.current;
      const sessionId = sessionIdRef.current;
      if (!pc || !sessionId || !speakerSessionId || !trackName) return;

      const trackKey = `${speakerSessionId}:${trackName}`;
      if (subscribedTracksRef.current.has(trackKey)) {
        return;
      }
      subscribedTracksRef.current.add(trackKey);

      try {
        // Create an offer to pull the remote track
        const offer = await pc.createOffer();
        const optimizedOffer = optimizeOpusSdp(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp: optimizedOffer });

        const answerRes = await cloudflareSfuClient.subscribeRemoteTracks(
          roomId,
          sessionId,
          optimizedOffer,
          [{ sessionId: speakerSessionId, trackName }]
        );

        if (answerRes.sessionDescription) {
          await pc.setRemoteDescription(answerRes.sessionDescription);
        }
      } catch (err: any) {
        subscribedTracksRef.current.delete(trackKey);
        console.warn(`Failed to subscribe to remote track ${trackKey}:`, err);
      }
    },
    [roomId]
  );

  // Trigger automated ICE restart with exponential backoff on network drop
  const triggerIceRestart = useCallback(async () => {
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;
    if (!pc || !sessionId) return;

    reconnectAttemptsRef.current += 1;
    setConnectionStatus('reconnecting');

    try {
      pc.restartIce();
      const offer = await pc.createOffer({ iceRestart: true });
      const optimizedOffer = optimizeOpusSdp(offer.sdp || '');
      await pc.setLocalDescription({ type: 'offer', sdp: optimizedOffer });

      const renegotiateRes = await cloudflareSfuClient.renegotiate(roomId, sessionId, optimizedOffer);
      if (renegotiateRes.sessionDescription) {
        await pc.setRemoteDescription(renegotiateRes.sessionDescription);
      }
      reconnectAttemptsRef.current = 0;
      setConnectionStatus('connected');
    } catch (err) {
      console.warn('ICE restart attempt failed:', err);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
      reconnectTimeoutRef.current = setTimeout(triggerIceRestart, delay);
    }
  }, [roomId]);

  // Publish local microphone track (strict publish-on-speak for speakers/hosts)
  const publishMicrophoneTrack = useCallback(async () => {
    setError(null);

    // 1. Acquire mono audio with speech optimizations and fallback
    let stream: MediaStream;
    try {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: { ideal: 1 },
            sampleRate: { ideal: 48000 },
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
      } catch (advancedErr) {
        console.warn('Advanced audio constraints not supported, falling back to standard audio:', advancedErr);
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }
    } catch (micErr: any) {
      console.error('Microphone access denied or unavailable:', micErr);
      setError('Could not access microphone. Please check your browser audio permissions.');
      setIsMuted(true);
      return;
    }

    localStreamRef.current = stream;
    setLocalStream(stream);

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = true;
    }
    setIsMuted(false);

    // Immediately update local participant state so UI updates
    if (user?.id) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, isMuted: false } : p))
      );
    }

    // 2. Publish to SFU peer connection if active
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;
    if (pc && sessionId && audioTrack) {
      try {
        const trackName = `mic-${user?.id || 'unknown'}-${Date.now()}`;
        localTrackNameRef.current = trackName;

        // Check if an audio sender already exists on the peer connection
        const senders = pc.getSenders();
        const existingSender = senders.find((s) => s.track?.kind === 'audio');
        let sender: RTCRtpSender;
        if (existingSender) {
          await existingSender.replaceTrack(audioTrack);
          sender = existingSender;
        } else {
          sender = pc.addTrack(audioTrack, stream);
        }

        // Create offer with Opus bandwidth & FEC tuning
        const offer = await pc.createOffer();
        const optimizedOffer = optimizeOpusSdp(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp: optimizedOffer });

        // Negotiate track publishing with Cloudflare Calls via backend proxy
        const answerRes = await cloudflareSfuClient.publishLocalTrack(
          roomId,
          sessionId,
          optimizedOffer,
          trackName,
          sender.track?.id
        );

        if (answerRes?.sessionDescription) {
          try {
            await pc.setRemoteDescription(answerRes.sessionDescription);
          } catch (sdpErr) {
            console.warn('SFU setRemoteDescription warning (non-fatal):', sdpErr);
          }
        }

        // Broadcast track announcement to all listeners via Supabase Realtime
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'track-published',
            payload: {
              userId: user?.id,
              sessionId,
              trackName,
            },
          });
        }
      } catch (sfuErr) {
        console.warn('SFU track publishing failed (audio remains active locally):', sfuErr);
      }
    }

    // Broadcast mute status and track presence
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'mute-updated',
        payload: {
          targetUserId: user?.id,
          isMuted: false,
        },
      });

      realtimeChannelRef.current.track({
        userId: user?.id,
        name: user?.name || user?.email || 'Chorister',
        avatarUrl: user?.avatarUrl,
        role: roleRef.current,
        isMuted: false,
        handRaised: handRaisedRef.current,
        sessionId: sessionIdRef.current,
        trackName: localTrackNameRef.current,
      });
    }

    // Persist mute state in DB
    if (user?.id) {
      cloudflareSfuClient
        .updateParticipantRole(roomId, user.id, { isMuted: false })
        .catch(() => {});
    }
  }, [roomId, user]);

  // Unpublish local microphone track when demoted or muted
  const unpublishMicrophoneTrack = useCallback(async () => {
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;
    const trackName = localTrackNameRef.current;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    if (pc) {
      const senders = pc.getSenders();
      senders.forEach((sender) => {
        if (sender.track?.kind === 'audio') {
          pc.removeTrack(sender);
        }
      });
    }

    if (sessionId && trackName) {
      await cloudflareSfuClient.closeTracks(roomId, sessionId, [trackName]).catch(() => {});
    }

    localTrackNameRef.current = null;
    setIsMuted(true);

    if (user?.id) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, isMuted: true } : p))
      );
    }

    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'track-unpublished',
        payload: {
          userId: user?.id,
          sessionId,
          trackName,
        },
      });

      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'mute-updated',
        payload: {
          targetUserId: user?.id,
          isMuted: true,
        },
      });

      realtimeChannelRef.current.track({
        userId: user?.id,
        name: user?.name || user?.email || 'Chorister',
        avatarUrl: user?.avatarUrl,
        role: roleRef.current,
        isMuted: true,
        handRaised: handRaisedRef.current,
        sessionId,
        trackName: null,
      });
    }

    if (user?.id) {
      cloudflareSfuClient
        .updateParticipantRole(roomId, user.id, { isMuted: true })
        .catch(() => {});
    }
  }, [roomId, user]);

  // Initialize and connect to the conference room
  const joinRoom = useCallback(async () => {
    if (isJoinedRef.current) return;
    isJoinedRef.current = true;
    setError(null);
    setConnectionStatus('connecting');

    try {
      // 1. Register participant in backend database
      try {
        await cloudflareSfuClient.joinRoom(roomId);
      } catch (joinErr) {
        console.warn('Backend joinRoom registration warning:', joinErr);
      }

      // 2. Seed participants from backend database so initial statuses are present immediately
      try {
        const roomData = await cloudflareSfuClient.getRoom(roomId);
        if (roomData?.participants) {
          const initialList: RoomParticipantState[] = roomData.participants.map((p: any) => ({
            userId: p.userId,
            name: p.user?.name || p.user?.email || 'Chorister',
            avatarUrl: p.user?.avatarUrl,
            role: p.role || 'listener',
            isMuted: p.isMuted ?? true,
            handRaised: p.handRaised ?? false,
          }));
          setParticipants(initialList);
        }
      } catch (fetchErr) {
        console.warn('Could not fetch initial room participants:', fetchErr);
      }

      // 3. Initialize SFU session with Cloudflare via backend proxy
      const sessionData: SfuSessionResponse = await cloudflareSfuClient.createSession(roomId);
      sessionIdRef.current = sessionData.sessionId;

      // 4. Instantiate single RTCPeerConnection with STUN/TURN servers
      const pc = new RTCPeerConnection({
        iceServers: sessionData.iceServers,
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      });
      pcRef.current = pc;

      // Listen for incoming remote tracks from subscribed speakers
      pc.ontrack = (event) => {
        const stream = event.streams[0] || new MediaStream([event.track]);
        const trackId = event.track.id;

        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(trackId, {
            stream,
            userId: 'remote-speaker',
            sessionId: '',
            trackName: trackId,
          });
          return next;
        });

        event.track.onended = () => {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(trackId);
            return next;
          });
        };
      };

      // Auto-recovery connection state listeners
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
          triggerIceRestart();
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnectionStatus('connected');
        } else if (pc.connectionState === 'failed') {
          triggerIceRestart();
        }
      };

      // Start live telemetry polling
      startTelemetryMonitoring(pc);

      // 4. Connect to Supabase Realtime channel for presence and signaling
      if (isSupabaseConfigured) {
        const channel = supabase.channel(`audio-room:${roomId}`, {
          config: { presence: { key: user?.id || `anon-${Date.now()}` } },
        });
        realtimeChannelRef.current = channel;

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const presenceMap = new Map<string, RoomParticipantState>();

            Object.values(state).forEach((presences: any) => {
              presences.forEach((p: any) => {
                if (p.userId) {
                  presenceMap.set(p.userId, {
                    userId: p.userId,
                    name: p.name || 'Chorister',
                    avatarUrl: p.avatarUrl,
                    role: p.role || 'listener',
                    isMuted: p.isMuted ?? true,
                    handRaised: p.handRaised ?? false,
                    sessionId: p.sessionId,
                    trackName: p.trackName,
                  });
                }
              });
            });

            // If active presence exists, presence state is the live ground truth
            if (presenceMap.size > 0) {
              setParticipants((prev) => {
                const nextList: RoomParticipantState[] = [];
                presenceMap.forEach((pres, uId) => {
                  const existing = prev.find((p) => p.userId === uId);
                  nextList.push({
                    ...existing,
                    ...pres,
                    handRaised: pres.handRaised !== undefined ? pres.handRaised : (existing?.handRaised ?? false),
                  });
                });
                return nextList;
              });

              // Subscribe to any active speaker tracks not yet subscribed to
              presenceMap.forEach((p) => {
                if (
                  (p.role === 'host' || p.role === 'speaker') &&
                  p.sessionId &&
                  p.trackName &&
                  p.userId !== user?.id
                ) {
                  subscribeToRemoteTrack(p.sessionId, p.trackName, p.userId);
                }
              });
            }
          })
          .on('presence', { event: 'join' }, ({ newPresences }) => {
            if (!newPresences) return;
            newPresences.forEach((p: any) => {
              if (!p?.userId) return;
              const newParticipant: RoomParticipantState = {
                userId: p.userId,
                name: p.name || 'Chorister',
                avatarUrl: p.avatarUrl,
                role: p.role || 'listener',
                isMuted: p.isMuted ?? true,
                handRaised: p.handRaised ?? false,
                sessionId: p.sessionId,
                trackName: p.trackName,
              };

              setParticipants((prev) => {
                const exists = prev.some((item) => item.userId === p.userId);
                if (exists) {
                  return prev.map((item) => (item.userId === p.userId ? { ...item, ...newParticipant } : item));
                }
                return [...prev, newParticipant];
              });

              if (
                (p.role === 'host' || p.role === 'speaker') &&
                p.sessionId &&
                p.trackName &&
                p.userId !== user?.id
              ) {
                subscribeToRemoteTrack(p.sessionId, p.trackName, p.userId);
              }
            });
          })
          .on('presence', { event: 'leave' }, ({ leftPresences }) => {
            if (!leftPresences) return;
            const leftIds = new Set(leftPresences.map((p: any) => p.userId).filter(Boolean));
            setParticipants((prev) => prev.filter((p) => !leftIds.has(p.userId)));
          })
          .on('broadcast', { event: 'participant-joined' }, ({ payload }) => {
            if (payload?.participant?.userId) {
              setParticipants((prev) => {
                const exists = prev.some((p) => p.userId === payload.participant.userId);
                if (exists) {
                  return prev.map((p) =>
                    p.userId === payload.participant.userId ? { ...p, ...payload.participant } : p
                  );
                }
                return [...prev, payload.participant];
              });

              if (
                (payload.participant.role === 'host' || payload.participant.role === 'speaker') &&
                payload.participant.sessionId &&
                payload.participant.trackName &&
                payload.participant.userId !== user?.id
              ) {
                subscribeToRemoteTrack(
                  payload.participant.sessionId,
                  payload.participant.trackName,
                  payload.participant.userId
                );
              }
            }
          })
          .on('broadcast', { event: 'participant-left' }, ({ payload }) => {
            if (payload?.userId) {
              setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
            }
          })
          .on('broadcast', { event: 'hand-raised' }, ({ payload }) => {
            if (payload?.userId) {
              setParticipants((prev) =>
                prev.map((p) =>
                  p.userId === payload.userId ? { ...p, handRaised: payload.handRaised } : p
                )
              );
            }
          })
          .on('broadcast', { event: 'track-published' }, ({ payload }) => {
            if (payload.userId !== user?.id && payload.sessionId && payload.trackName) {
              subscribeToRemoteTrack(payload.sessionId, payload.trackName, payload.userId);
            }
          })
          .on('broadcast', { event: 'track-unpublished' }, ({ payload }) => {
            if (payload.trackName) {
              setRemoteStreams((prev) => {
                const next = new Map(prev);
                for (const [key, val] of next.entries()) {
                  if (val.trackName === payload.trackName) {
                    next.delete(key);
                  }
                }
                return next;
              });
            }
          })
          .on('broadcast', { event: 'role-updated' }, ({ payload }) => {
            if (payload?.targetUserId && payload?.newRole) {
              setParticipants((prev) =>
                prev.map((p) =>
                  p.userId === payload.targetUserId
                    ? {
                        ...p,
                        role: payload.newRole,
                        handRaised: payload.newRole === 'speaker' ? false : p.handRaised,
                      }
                    : p
                )
              );
            }
            if (payload?.targetUserId === user?.id) {
              setRole(payload.newRole);
              if (payload.newRole === 'listener') {
                unpublishMicrophoneTrack();
              } else if (payload.newRole === 'speaker') {
                publishMicrophoneTrack();
              }
            }
          })
          .on('broadcast', { event: 'mute-updated' }, ({ payload }) => {
            if (payload?.targetUserId) {
              setParticipants((prev) =>
                prev.map((p) =>
                  p.userId === payload.targetUserId ? { ...p, isMuted: payload.isMuted } : p
                )
              );
            }
            if (payload?.targetUserId === user?.id && payload.isMuted) {
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((track) => {
                  track.enabled = false;
                });
              }
              setIsMuted(true);
            }
          })
          .on('broadcast', { event: 'mute-all' }, () => {
            if (roleRef.current !== 'host') {
              if (localStreamRef.current) {
                localStreamRef.current.getAudioTracks().forEach((track) => {
                  track.enabled = false;
                });
              }
              setIsMuted(true);
            }
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              const participantData: RoomParticipantState = {
                userId: user?.id || `anon-${Date.now()}`,
                name: user?.name || user?.email || 'Chorister',
                avatarUrl: user?.avatarUrl,
                role: roleRef.current,
                isMuted: isMutedRef.current,
                handRaised: handRaisedRef.current,
                sessionId: sessionIdRef.current,
                trackName: localTrackNameRef.current,
              };

              await channel.track(participantData);

              channel.send({
                type: 'broadcast',
                event: 'participant-joined',
                payload: { participant: participantData },
              });
            }
          });
      }

      setConnectionStatus('connected');

      // If user joined directly as host or speaker, publish microphone immediately
      if (role === 'host' || role === 'speaker') {
        publishMicrophoneTrack();
      }
    } catch (err: any) {
      console.error('Failed to join audio room:', err);
      setError(err.message || 'Failed to connect to conference room.');
      setConnectionStatus('failed');
      isJoinedRef.current = false;
    }
  }, [
    roomId,
    user,
    role,
    publishMicrophoneTrack,
    unpublishMicrophoneTrack,
    subscribeToRemoteTrack,
    triggerIceRestart,
    startTelemetryMonitoring,
  ]);

  // Leave room and notify peers
  const leaveRoom = useCallback(async () => {
    isJoinedRef.current = false;

    if (realtimeChannelRef.current) {
      try {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'participant-left',
          payload: { userId: user?.id },
        });
        await realtimeChannelRef.current.untrack();
      } catch (untrackErr) {
        console.warn('Presence untrack warning:', untrackErr);
      }
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    cleanupPeerConnection();

    try {
      await cloudflareSfuClient.leaveRoom(roomId);
    } catch {
      // Ignore exit failure
    }
  }, [roomId, user?.id, cleanupPeerConnection]);

  // Toggle microphone mute/unmute
  const toggleMute = useCallback(() => {
    if (role === 'listener') return;

    // If active stream already exists, toggle enabled state instantly
    if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
      const nextMuted = !isMuted;
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
      setIsMuted(nextMuted);

      if (user?.id) {
        setParticipants((prev) =>
          prev.map((p) => (p.userId === user.id ? { ...p, isMuted: nextMuted } : p))
        );
      }

      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.send({
          type: 'broadcast',
          event: 'mute-updated',
          payload: {
            targetUserId: user?.id,
            isMuted: nextMuted,
          },
        });

        realtimeChannelRef.current.track({
          userId: user?.id,
          name: user?.name || user?.email || 'Chorister',
          avatarUrl: user?.avatarUrl,
          role: roleRef.current,
          isMuted: nextMuted,
          handRaised: handRaisedRef.current,
          sessionId: sessionIdRef.current,
          trackName: localTrackNameRef.current,
        });
      }

      if (user?.id) {
        cloudflareSfuClient
          .updateParticipantRole(roomId, user.id, { isMuted: nextMuted })
          .catch(() => {});
      }
      return;
    }

    // If no stream exists yet and user wants to unmute, acquire track
    if (isMuted) {
      publishMicrophoneTrack();
    }
  }, [roomId, role, isMuted, user, publishMicrophoneTrack]);

  // Hand raise toggle
  const toggleHandRaise = useCallback(() => {
    const nextState = !handRaised;
    setHandRaised(nextState);

    // Update local participant state immediately
    if (user?.id) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, handRaised: nextState } : p))
      );
    }

    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'hand-raised',
        payload: { userId: user?.id, handRaised: nextState },
      });

      realtimeChannelRef.current.track({
        userId: user?.id,
        name: user?.name || user?.email || 'Chorister',
        avatarUrl: user?.avatarUrl,
        role: roleRef.current,
        isMuted: isMutedRef.current,
        handRaised: nextState,
        sessionId: sessionIdRef.current,
        trackName: localTrackNameRef.current,
      });
    }

    if (user?.id) {
      cloudflareSfuClient
        .updateParticipantRole(roomId, user.id, { handRaised: nextState })
        .catch((err) => console.warn('Failed to persist hand raise state:', err));
    }
  }, [roomId, handRaised, user]);

  // Host moderation: Promote listener to speaker
  const promoteToSpeaker = useCallback(
    async (targetUserId: string) => {
      try {
        await cloudflareSfuClient.updateParticipantRole(roomId, targetUserId, {
          role: 'speaker',
          handRaised: false,
        });

        // Update local state immediately
        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === targetUserId ? { ...p, role: 'speaker', handRaised: false } : p
          )
        );

        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'role-updated',
            payload: { targetUserId, newRole: 'speaker' },
          });
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'hand-raised',
            payload: { userId: targetUserId, handRaised: false },
          });
        }
      } catch (err: any) {
        console.error('Failed to promote user:', err);
      }
    },
    [roomId]
  );

  // Host moderation: Demote speaker to listener
  const demoteToListener = useCallback(
    async (targetUserId: string) => {
      try {
        await cloudflareSfuClient.updateParticipantRole(roomId, targetUserId, {
          role: 'listener',
          isMuted: true,
        });

        // Update local state immediately
        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === targetUserId ? { ...p, role: 'listener', isMuted: true } : p
          )
        );

        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'role-updated',
            payload: { targetUserId, newRole: 'listener' },
          });
          realtimeChannelRef.current.send({
            type: 'broadcast',
            event: 'mute-updated',
            payload: { targetUserId, isMuted: true },
          });
        }
      } catch (err: any) {
        console.error('Failed to demote user:', err);
      }
    },
    [roomId]
  );

  // Host moderation: Mute all speakers
  const muteAll = useCallback(async () => {
    if (realtimeChannelRef.current) {
      realtimeChannelRef.current.send({
        type: 'broadcast',
        event: 'mute-all',
        payload: {},
      });
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveRoom();
    };
  }, [leaveRoom]);

  return {
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
  };
}

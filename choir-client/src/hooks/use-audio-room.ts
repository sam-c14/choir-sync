import { useState, useEffect, useRef, useCallback } from 'react';
import { cloudflareSfuClient, SfuSessionResponse } from '../lib/cloudflare-sfu-client';
import { optimizeOpusSdp } from '../lib/sdp-utils';
import { AudioRoomSocket } from '../lib/audio-room-socket';
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

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
  { urls: ['stun:stun.cloudflare.com:3478'] },
];

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
  const p2pConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const socketRef = useRef<AudioRoomSocket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const localTrackNameRef = useRef<string | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isJoinedRef = useRef(false);

  // Sync state with refs for event listeners
  const roleRef = useRef<AudioRoomRole>(role);
  roleRef.current = role;
  const isMutedRef = useRef<boolean>(isMuted);
  isMutedRef.current = isMuted;
  const handRaisedRef = useRef<boolean>(handRaised);
  handRaisedRef.current = handRaised;
  const participantsRef = useRef<RoomParticipantState[]>(participants);
  participantsRef.current = participants;

  // Clean up all WebRTC connections and sockets
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

    p2pConnectionsRef.current.forEach((pc) => {
      pc.ontrack = null;
      pc.close();
    });
    p2pConnectionsRef.current.clear();
    pendingIceCandidatesRef.current.clear();

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    sessionIdRef.current = null;
    localTrackNameRef.current = null;
    setRemoteStreams(new Map());
    setConnectionStatus('disconnected');
  }, []);

  // Poll RTCPeerConnection statistics for telemetry
  const startTelemetryMonitoring = useCallback(() => {
    if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);

    statsIntervalRef.current = setInterval(async () => {
      const pcs = [pcRef.current, ...Array.from(p2pConnectionsRef.current.values())].filter(
        (p): p is RTCPeerConnection => Boolean(p && p.connectionState !== 'closed')
      );

      if (pcs.length === 0) return;

      try {
        let maxRtt = 0;
        let maxJitter = 0;
        let totalLost = 0;
        let totalPackets = 0;

        for (const pc of pcs) {
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'candidate-pair' && report.state === 'succeeded') {
              const rtt = Math.round((report.currentRoundTripTime || 0) * 1000);
              if (rtt > maxRtt) maxRtt = rtt;
            }
            if (report.type === 'inbound-rtp' && report.kind === 'audio') {
              const jitter = Math.round((report.jitter || 0) * 1000);
              if (jitter > maxJitter) maxJitter = jitter;
              const lost = report.packetsLost || 0;
              const received = report.packetsReceived || 0;
              totalLost += lost;
              totalPackets += lost + received;
            }
          });
        }

        const lossPercent = totalPackets > 0 ? Math.round((totalLost / totalPackets) * 100) : 0;
        let quality: 'excellent' | 'good' | 'poor' = 'excellent';
        if (maxRtt > 300 || lossPercent > 5 || maxJitter > 60) {
          quality = 'poor';
        } else if (maxRtt > 150 || lossPercent > 2 || maxJitter > 30) {
          quality = 'good';
        }

        setTelemetry({
          rttMs: maxRtt,
          jitterMs: maxJitter,
          packetLossPercent: lossPercent,
          quality,
        });
      } catch {
        // Silently tolerate closed connections
      }
    }, 3000);
  }, []);

  // Flush any pending ICE candidates queued before remote description was ready
  const flushPendingIceCandidates = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = pendingIceCandidatesRef.current.get(peerId);
    if (!queue || queue.length === 0) return;
    for (const cand of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(cand));
      } catch (err) {
        console.warn(`Buffered ICE candidate warning for ${peerId}:`, err);
      }
    }
    pendingIceCandidatesRef.current.delete(peerId);
  }, []);

  // Initiate direct WebRTC P2P audio offer to target peer
  const sendP2pOffer = useCallback(
    async (targetUserId: string) => {
      if (!localStreamRef.current || targetUserId === user?.id) return;
      const socket = socketRef.current;
      if (!socket) return;

      try {
        const existing = p2pConnectionsRef.current.get(targetUserId);
        if (existing) {
          existing.close();
        }

        const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
        p2pConnectionsRef.current.set(targetUserId, pc);

        // Listen for inbound audio from peer on this connection as well
        pc.ontrack = (event) => {
          const stream = event.streams[0] || new MediaStream([event.track]);
          const trackId = event.track.id;

          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetUserId, {
              stream,
              userId: targetUserId,
              sessionId: '',
              trackName: trackId,
            });
            return next;
          });

          event.track.onended = () => {
            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.delete(targetUserId);
              return next;
            });
          };
        };

        localStreamRef.current.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.send('webrtc-signal', {
              targetUserId,
              signal: { type: 'candidate', candidate: event.candidate },
            });
          }
        };

        const offer = await pc.createOffer();
        const optimizedOffer = optimizeOpusSdp(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp: optimizedOffer });

        socket.send('webrtc-signal', {
          targetUserId,
          signal: { type: 'offer', sdp: optimizedOffer },
        });
      } catch (err) {
        console.warn(`Failed to send P2P offer to ${targetUserId}:`, err);
      }
    },
    [user?.id]
  );

  // Handle incoming direct WebRTC P2P audio signal (offer/answer/ice-candidate)
  const handleP2pSignal = useCallback(
    async (fromUserId: string, signal: any) => {
      const socket = socketRef.current;
      if (!socket || fromUserId === user?.id) return;

      try {
        if (signal.type === 'offer') {
          const existing = p2pConnectionsRef.current.get(fromUserId);
          if (existing) {
            existing.close();
          }

          const pc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
          p2pConnectionsRef.current.set(fromUserId, pc);

          // Add our local audio track if microphone is currently active
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          pc.ontrack = (event) => {
            const stream = event.streams[0] || new MediaStream([event.track]);
            const trackId = event.track.id;

            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.set(fromUserId, {
                stream,
                userId: fromUserId,
                sessionId: '',
                trackName: trackId,
              });
              return next;
            });

            event.track.onended = () => {
              setRemoteStreams((prev) => {
                const next = new Map(prev);
                next.delete(fromUserId);
                return next;
              });
            };
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.send('webrtc-signal', {
                targetUserId: fromUserId,
                signal: { type: 'candidate', candidate: event.candidate },
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          await flushPendingIceCandidates(fromUserId, pc);

          const answer = await pc.createAnswer();
          const optimizedAnswer = optimizeOpusSdp(answer.sdp || '');
          await pc.setLocalDescription({ type: 'answer', sdp: optimizedAnswer });

          socket.send('webrtc-signal', {
            targetUserId: fromUserId,
            signal: { type: 'answer', sdp: optimizedAnswer },
          });
        } else if (signal.type === 'answer') {
          const pc = p2pConnectionsRef.current.get(fromUserId);
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
            await flushPendingIceCandidates(fromUserId, pc);
          }
        } else if (signal.type === 'candidate' && signal.candidate) {
          const pc = p2pConnectionsRef.current.get(fromUserId);
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
          } else {
            if (!pendingIceCandidatesRef.current.has(fromUserId)) {
              pendingIceCandidatesRef.current.set(fromUserId, []);
            }
            pendingIceCandidatesRef.current.get(fromUserId)!.push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn(`P2P signaling error with ${fromUserId}:`, err);
      }
    },
    [user?.id, flushPendingIceCandidates]
  );

  // Publish local microphone track
  const publishMicrophoneTrack = useCallback(async () => {
    setError(null);

    // 1. Acquire microphone audio
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
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      }
    } catch (micErr: any) {
      console.error('Microphone access denied:', micErr);
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

    if (user?.id) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, isMuted: false } : p))
      );
    }

    // 2. Broadcast unmuted state & track announcement through native WebSocket
    if (socketRef.current) {
      socketRef.current.send('mute-updated', { isMuted: false });
      socketRef.current.send('track-published', { trackName: `mic-${user?.id}` });
    }

    // 3. Send direct WebRTC P2P audio offer to all other participants in the room
    participantsRef.current.forEach((p) => {
      if (p.userId !== user?.id) {
        sendP2pOffer(p.userId);
      }
    });

    // 4. Also negotiate with Cloudflare SFU if available
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;
    if (pc && sessionId && audioTrack) {
      try {
        const trackName = `mic-${user?.id || 'unknown'}-${Date.now()}`;
        localTrackNameRef.current = trackName;

        const senders = pc.getSenders();
        const existingSender = senders.find((s) => s.track?.kind === 'audio');
        let sender: RTCRtpSender;
        if (existingSender) {
          await existingSender.replaceTrack(audioTrack);
          sender = existingSender;
        } else {
          sender = pc.addTrack(audioTrack, stream);
        }

        const offer = await pc.createOffer();
        const optimizedOffer = optimizeOpusSdp(offer.sdp || '');
        await pc.setLocalDescription({ type: 'offer', sdp: optimizedOffer });

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
      } catch (sfuErr) {
        console.warn('SFU track publishing warning (direct P2P remains active):', sfuErr);
      }
    }
  }, [roomId, user?.id, sendP2pOffer]);

  // Unpublish local microphone track when demoted or muted
  const unpublishMicrophoneTrack = useCallback(async () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }

    p2pConnectionsRef.current.forEach((pc) => {
      pc.getSenders().forEach((s) => {
        if (s.track?.kind === 'audio') pc.removeTrack(s);
      });
    });

    if (pcRef.current) {
      pcRef.current.getSenders().forEach((s) => {
        if (s.track?.kind === 'audio') pcRef.current?.removeTrack(s);
      });
    }

    setIsMuted(true);

    if (user?.id) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, isMuted: true } : p))
      );
    }

    if (socketRef.current) {
      socketRef.current.send('mute-updated', { isMuted: true });
      socketRef.current.send('track-unpublished', { trackName: localTrackNameRef.current });
    }
  }, [user?.id]);

  // Initialize and connect to the conference room
  const joinRoom = useCallback(async () => {
    if (isJoinedRef.current) return;
    isJoinedRef.current = true;
    setError(null);
    setConnectionStatus('connecting');

    try {
      // 1. Register in backend database and fetch initial metadata
      try {
        await cloudflareSfuClient.joinRoom(roomId);
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
      } catch (dbErr) {
        console.warn('Database room join warning:', dbErr);
      }

      // 2. Connect to Native WebSocket Signaling Server on choir-api
      const token = localStorage.getItem('token') || '';
      const socket = new AudioRoomSocket(roomId, token);
      socketRef.current = socket;

      socket.on('connected', () => {
        setConnectionStatus('connected');
      });

      socket.on('room-roster', (payload: any) => {
        if (Array.isArray(payload?.participants)) {
          setParticipants(payload.participants);

          // If local user has an active microphone, offer audio to remote participants
          if (localStreamRef.current && (roleRef.current === 'host' || roleRef.current === 'speaker')) {
            payload.participants.forEach((p: any) => {
              if (p.userId !== user?.id) {
                sendP2pOffer(p.userId);
              }
            });
          }
        }
      });

      socket.on('participant-joined', (payload: any) => {
        if (payload?.participant?.userId) {
          const newP = payload.participant;
          setParticipants((prev) => {
            const exists = prev.some((p) => p.userId === newP.userId);
            if (exists) {
              return prev.map((p) => (p.userId === newP.userId ? { ...p, ...newP } : p));
            }
            return [...prev, newP];
          });

          // Offer P2P audio to newly joined attendee if we are speaking
          if (localStreamRef.current && (roleRef.current === 'host' || roleRef.current === 'speaker')) {
            sendP2pOffer(newP.userId);
          }
        }
      });

      socket.on('participant-left', (payload: any) => {
        if (payload?.userId) {
          setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));

          const pc = p2pConnectionsRef.current.get(payload.userId);
          if (pc) {
            pc.close();
            p2pConnectionsRef.current.delete(payload.userId);
          }
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(payload.userId);
            return next;
          });
        }
      });

      socket.on('hand-raised', (payload: any) => {
        if (payload?.userId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.userId === payload.userId ? { ...p, handRaised: payload.handRaised } : p
            )
          );
        }
      });

      socket.on('mute-updated', (payload: any) => {
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
      });

      socket.on('role-updated', (payload: any) => {
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
      });

      socket.on('mute-all', () => {
        if (roleRef.current !== 'host') {
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              track.enabled = false;
            });
          }
          setIsMuted(true);
        }
      });

      socket.on('track-published', (payload: any) => {
        if (payload?.userId && payload.userId !== user?.id) {
          if (localStreamRef.current && !p2pConnectionsRef.current.has(payload.userId)) {
            sendP2pOffer(payload.userId);
          }
        }
      });

      socket.on('webrtc-signal', (payload: any) => {
        if (payload?.fromUserId && payload.signal) {
          handleP2pSignal(payload.fromUserId, payload.signal);
        }
      });

      socket.connect();

      // 3. Initialize Cloudflare Calls SFU session as secondary high-scale router
      try {
        const sessionData: SfuSessionResponse = await cloudflareSfuClient.createSession(roomId);
        sessionIdRef.current = sessionData.sessionId;

        const pc = new RTCPeerConnection({
          iceServers: sessionData.iceServers?.length ? sessionData.iceServers : DEFAULT_ICE_SERVERS,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
          const stream = event.streams[0] || new MediaStream([event.track]);
          const trackId = event.track.id;

          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(trackId, {
              stream,
              userId: 'sfu-speaker',
              sessionId: '',
              trackName: trackId,
            });
            return next;
          });
        };
      } catch (sfuErr) {
        console.warn('Cloudflare SFU initialization warning (direct WebSockets P2P active):', sfuErr);
      }

      startTelemetryMonitoring();

      // If joining directly as host or speaker, activate microphone immediately
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
    user?.id,
    role,
    publishMicrophoneTrack,
    unpublishMicrophoneTrack,
    sendP2pOffer,
    handleP2pSignal,
    startTelemetryMonitoring,
  ]);

  // Leave room and notify peers
  const leaveRoom = useCallback(async () => {
    isJoinedRef.current = false;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    cleanupPeerConnection();

    try {
      await cloudflareSfuClient.leaveRoom(roomId);
    } catch {
      // Ignore exit failure
    }
  }, [roomId, cleanupPeerConnection]);

  // Toggle microphone mute/unmute
  const toggleMute = useCallback(() => {
    if (role === 'listener') return;

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

      if (!nextMuted) {
        participantsRef.current.forEach((p) => {
          if (p.userId !== user?.id && !p2pConnectionsRef.current.has(p.userId)) {
            sendP2pOffer(p.userId);
          }
        });
      }

      if (socketRef.current) {
        socketRef.current.send('mute-updated', { isMuted: nextMuted });
      }

      if (user?.id) {
        cloudflareSfuClient
          .updateParticipantRole(roomId, user.id, { isMuted: nextMuted })
          .catch(() => {});
      }
      return;
    }

    if (isMuted) {
      publishMicrophoneTrack();
    }
  }, [roomId, role, isMuted, user?.id, publishMicrophoneTrack]);

  // Hand raise toggle
  const toggleHandRaise = useCallback(() => {
    const nextState = !handRaised;
    setHandRaised(nextState);

    // Update local state immediately
    if (user?.id) {
      setParticipants((prev) =>
        prev.map((p) => (p.userId === user.id ? { ...p, handRaised: nextState } : p))
      );
    }

    // Broadcast in real-time over native WebSocket
    if (socketRef.current) {
      socketRef.current.send('hand-raised', { handRaised: nextState });
    }

    if (user?.id) {
      cloudflareSfuClient
        .updateParticipantRole(roomId, user.id, { handRaised: nextState })
        .catch(() => {});
    }
  }, [roomId, handRaised, user?.id]);

  // Host moderation: Promote listener to speaker
  const promoteToSpeaker = useCallback(
    async (targetUserId: string) => {
      try {
        await cloudflareSfuClient.updateParticipantRole(roomId, targetUserId, {
          role: 'speaker',
          handRaised: false,
        });

        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === targetUserId ? { ...p, role: 'speaker', handRaised: false } : p
          )
        );

        if (socketRef.current) {
          socketRef.current.send('role-updated', { targetUserId, newRole: 'speaker' });
          socketRef.current.send('hand-raised', { userId: targetUserId, handRaised: false });
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

        setParticipants((prev) =>
          prev.map((p) =>
            p.userId === targetUserId ? { ...p, role: 'listener', isMuted: true } : p
          )
        );

        if (socketRef.current) {
          socketRef.current.send('role-updated', { targetUserId, newRole: 'listener' });
          socketRef.current.send('mute-updated', { targetUserId, isMuted: true });
        }
      } catch (err: any) {
        console.error('Failed to demote user:', err);
      }
    },
    [roomId]
  );

  // Host moderation: Mute all speakers
  const muteAll = useCallback(async () => {
    if (socketRef.current) {
      socketRef.current.send('mute-all', {});
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

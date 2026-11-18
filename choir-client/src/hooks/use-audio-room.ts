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

export interface CalledBibleReference {
  bookId: string;
  bookName: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  version: 'BSB' | 'eng_kjv';
  sharedByUserId?: string;
  sharedByName?: string;
  calledAt?: number;
}

export interface RoomChatMessage {
  id: string;
  userId: string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  timestamp: number;
}

export interface EmojiReactionEvent {
  id: string;
  emoji: string;
  userId: string;
  senderName: string;
  timestamp: number;
}

interface UseAudioRoomOptions {
  roomId: string;
  initialRole?: AudioRoomRole;
}

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  { urls: ['stun:stun.cloudflare.com:3478'] },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

function waitForIceGatheringComplete(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceGatheringState === 'complete') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener('icegatheringstatechange', handler);
      clearTimeout(timer);
      resolve();
    };
    const handler = () => {
      if (pc.iceGatheringState === 'complete') {
        finish();
      }
    };
    pc.addEventListener('icegatheringstatechange', handler);
    const timer = setTimeout(finish, timeoutMs);
  });
}

function waitForIceConnected(pc: RTCPeerConnection, timeoutMs = 4000): Promise<void> {
  if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pc.removeEventListener('iceconnectionstatechange', handler);
      clearTimeout(timer);
      resolve();
    };
    const handler = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        finish();
      }
    };
    pc.addEventListener('iceconnectionstatechange', handler);
    const timer = setTimeout(finish, timeoutMs);
  });
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
  const [activeBibleReference, setActiveBibleReference] = useState<CalledBibleReference | null>(null);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const p2pConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const iceServersRef = useRef<RTCIceServer[]>(DEFAULT_ICE_SERVERS);
  const socketRef = useRef<AudioRoomSocket | null>(null);
  const emojiListenersRef = useRef<Set<(reaction: EmojiReactionEvent) => void>>(new Set());
  const sessionIdRef = useRef<string | null>(null);
  const isSfuActiveRef = useRef<boolean>(false);
  const sfuQueueRef = useRef<Promise<void>>(Promise.resolve());
  const localTrackNameRef = useRef<string | null>(null);
  const subscribedTracksRef = useRef<Set<string>>(new Set());
  const trackMidToUserMapRef = useRef<Map<string, string>>(new Map());
  const pendingSubscriberUserIdRef = useRef<string | null>(null);
  const retryTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isJoinedRef = useRef(false);

  // Serialize Cloudflare Calls SFU session mutations to avoid concurrent SDP negotiation collisions
  const enqueueSfuOp = useCallback(<T,>(op: () => Promise<T>): Promise<T> => {
    const next = sfuQueueRef.current.then(op, op);
    sfuQueueRef.current = next.then(
      () => undefined,
      () => undefined
    );
    return next;
  }, []);

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
    retryTimeoutsRef.current.forEach((t) => clearTimeout(t));
    retryTimeoutsRef.current.clear();

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
    isSfuActiveRef.current = false;
    sfuQueueRef.current = Promise.resolve();
    localTrackNameRef.current = null;
    pendingSubscriberUserIdRef.current = null;
    subscribedTracksRef.current.clear();
    trackMidToUserMapRef.current.clear();
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
        await pc.addIceCandidate(cand);
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

        const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
        p2pConnectionsRef.current.set(targetUserId, pc);

        pc.oniceconnectionstatechange = () => {
          console.log(`[WebRTC] ICE connection state with ${targetUserId}: ${pc.iceConnectionState}`);
        };
        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC] Peer connection state with ${targetUserId}: ${pc.connectionState}`);
        };

        // Listen for inbound audio from peer on this connection as well
        pc.ontrack = (event) => {
          console.log(`[WebRTC] Received remote audio track from ${targetUserId}`);
          const stream = event.streams[0] || new MediaStream([event.track]);
          event.track.enabled = true;

          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetUserId, {
              stream,
              userId: targetUserId,
              sessionId: '',
              trackName: event.track.id,
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
              signal: { type: 'candidate', candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate },
            });
          }
        };

        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(offer);

        socket.send('webrtc-signal', {
          targetUserId,
          signal: { type: 'offer', sdp: offer.sdp },
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

          const pc = new RTCPeerConnection({ iceServers: iceServersRef.current });
          p2pConnectionsRef.current.set(fromUserId, pc);

          pc.oniceconnectionstatechange = () => {
            console.log(`[WebRTC] ICE connection state with ${fromUserId}: ${pc.iceConnectionState}`);
          };
          pc.onconnectionstatechange = () => {
            console.log(`[WebRTC] Peer connection state with ${fromUserId}: ${pc.connectionState}`);
          };

          // Add our local audio track if microphone is currently active
          if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach((track) => {
              pc.addTrack(track, localStreamRef.current!);
            });
          }

          pc.ontrack = (event) => {
            console.log(`[WebRTC] Listener received remote audio track from ${fromUserId}`);
            const stream = event.streams[0] || new MediaStream([event.track]);
            event.track.enabled = true;

            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.set(fromUserId, {
                stream,
                userId: fromUserId,
                sessionId: '',
                trackName: event.track.id,
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
                signal: { type: 'candidate', candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate },
              });
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          await flushPendingIceCandidates(fromUserId, pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.send('webrtc-signal', {
            targetUserId: fromUserId,
            signal: { type: 'answer', sdp: answer.sdp },
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
            await pc.addIceCandidate(signal.candidate).catch(() => {});
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

  // Subscribe to a remote participant's track via Cloudflare Calls SFU (serialized + auto-retry)
  const subscribeToRemoteTrack = useCallback(
    async (
      remoteSessionId: string,
      remoteTrackName: string,
      publisherUserId?: string,
      attempt = 0
    ): Promise<void> => {
      if (!isJoinedRef.current || !remoteSessionId || !remoteTrackName) return;
      if (subscribedTracksRef.current.has(remoteTrackName)) {
        return;
      }

      const scheduleRetry = () => {
        if (!isJoinedRef.current || attempt >= 4) return;
        const delays = [1200, 2000, 3500, 5000];
        const delay = delays[attempt] ?? 5000;
        console.log(`[SFU] Scheduling retry #${attempt + 1} for track ${remoteTrackName} in ${delay}ms`);
        const timer = setTimeout(() => {
          retryTimeoutsRef.current.delete(timer);
          subscribeToRemoteTrack(remoteSessionId, remoteTrackName, publisherUserId, attempt + 1);
        }, delay);
        retryTimeoutsRef.current.add(timer);
      };

      let shouldRetry = false;

      await enqueueSfuOp(async () => {
        const pc = pcRef.current;
        const mySessionId = sessionIdRef.current;
        if (!pc || !mySessionId || !isJoinedRef.current) return;
        if (subscribedTracksRef.current.has(remoteTrackName)) return;

        try {
          console.log(`[SFU] Subscribing to track ${remoteTrackName} from session ${remoteSessionId} (attempt ${attempt + 1})`);
          pendingSubscriberUserIdRef.current = publisherUserId || null;

          const res = await cloudflareSfuClient.subscribeRemoteTracks(
            roomId,
            mySessionId,
            [{ sessionId: remoteSessionId, trackName: remoteTrackName }]
          );

          const trackErr = res?.tracks?.find((t) => t.errorCode);
          if (trackErr) {
            console.warn(
              `[SFU] Track subscription warning for ${remoteTrackName}: ${trackErr.errorCode} - ${trackErr.errorDescription || ''}`
            );
            shouldRetry = true;
            return;
          }

          if (res?.tracks && Array.isArray(res.tracks)) {
            res.tracks.forEach((t) => {
              if (t.mid && publisherUserId) {
                trackMidToUserMapRef.current.set(t.mid, publisherUserId);
              }
            });
          }

          if (!res?.sessionDescription) {
            console.warn(`[SFU] Missing sessionDescription when subscribing to ${remoteTrackName}`);
            shouldRetry = true;
            return;
          }

          // 1. Cloudflare sends an offer to the subscriber
          await pc.setRemoteDescription(new RTCSessionDescription(res.sessionDescription));

          // 2. Generate local answer
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          // 3. Wait for ICE gathering on answer
          await waitForIceGatheringComplete(pc, 4000);

          // 4. Submit answer to /renegotiate
          await cloudflareSfuClient.renegotiate(
            roomId,
            mySessionId,
            pc.localDescription?.sdp || answer.sdp || ''
          );

          subscribedTracksRef.current.add(remoteTrackName);
          console.log(`[SFU] Subscribed to track ${remoteTrackName} successfully!`);
        } catch (err) {
          subscribedTracksRef.current.delete(remoteTrackName);
          console.warn(`[SFU] Failed to subscribe to track ${remoteTrackName}:`, err);
          shouldRetry = true;
        } finally {
          pendingSubscriberUserIdRef.current = null;
        }
      });

      if (shouldRetry) {
        scheduleRetry();
      }
    },
    [roomId, enqueueSfuOp]
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

    // 2. Broadcast unmuted state through native WebSocket (queued automatically if connecting)
    if (socketRef.current) {
      socketRef.current.send('mute-updated', { isMuted: false });
    }

    // 3. Negotiate with Cloudflare SFU if active; otherwise use direct WebRTC P2P fallback
    let publishedToSfu = false;
    if (isSfuActiveRef.current && pcRef.current && sessionIdRef.current && audioTrack) {
      publishedToSfu = await enqueueSfuOp(async () => {
        const pc = pcRef.current;
        const sessionId = sessionIdRef.current;
        if (!pc || !sessionId || !isJoinedRef.current) return false;

        try {
          const trackName = `mic-${user?.id || 'unknown'}-${Date.now()}`;
          localTrackNameRef.current = trackName;

          let transceiver = pc.getTransceivers().find((t) => t.sender.track === audioTrack);
          if (!transceiver) {
            transceiver = pc.addTransceiver(audioTrack, { direction: 'sendonly' });
          } else {
            transceiver.direction = 'sendonly';
            await transceiver.sender.replaceTrack(audioTrack);
          }

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          // Wait for ICE gathering to complete so all candidates are in offer.sdp
          await waitForIceGatheringComplete(pc, 4000);

          const mid = transceiver.mid;

          const answerRes = await cloudflareSfuClient.publishLocalTrack(
            roomId,
            sessionId,
            pc.localDescription?.sdp || offer.sdp!,
            trackName,
            mid || undefined
          );

          const trackErr = answerRes?.tracks?.find((t) => t.errorCode);
          if (trackErr) {
            console.warn(`[SFU] Local publish track error: ${trackErr.errorCode} - ${trackErr.errorDescription || ''}`);
          }

          if (answerRes?.sessionDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(answerRes.sessionDescription));

            // Wait for ICE connection + brief packet ramp so Cloudflare receives RTP packets before subscribers pull
            await waitForIceConnected(pc, 4000);
            await new Promise((r) => setTimeout(r, 250));

            if (socketRef.current && isJoinedRef.current) {
              socketRef.current.send('track-published', {
                sessionId,
                trackName,
                userId: user?.id,
              });
            }
            console.log(`[SFU] Successfully published track to Cloudflare: ${trackName}`);
            return true;
          }
          return false;
        } catch (sfuErr) {
          console.warn('SFU track publishing warning (activating P2P fallback):', sfuErr);
          return false;
        }
      });
    }

    if (!publishedToSfu) {
      participantsRef.current.forEach((p) => {
        if (p.userId !== user?.id) {
          sendP2pOffer(p.userId);
        }
      });
    }
  }, [roomId, user?.id, sendP2pOffer, enqueueSfuOp]);

  // Unpublish local microphone track when demoted or muted
  const unpublishMicrophoneTrack = useCallback(async () => {
    const prevTrackName = localTrackNameRef.current;
    localTrackNameRef.current = null;

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

    if (prevTrackName && isSfuActiveRef.current && sessionIdRef.current) {
      const sid = sessionIdRef.current;
      enqueueSfuOp(async () => {
        await cloudflareSfuClient.closeTracks(roomId, sid, [prevTrackName]).catch(() => {});
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
      socketRef.current.send('track-unpublished', { trackName: prevTrackName });
    }
  }, [roomId, user?.id, enqueueSfuOp]);

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
        if (roomData?.participants && participantsRef.current.length === 0) {
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

      // 2. Initialize Cloudflare Calls SFU session as primary router
      try {
        const sessionData: SfuSessionResponse = await cloudflareSfuClient.createSession(roomId);
        sessionIdRef.current = sessionData.sessionId;
        isSfuActiveRef.current = Boolean(
          sessionData.sessionId && !sessionData.sessionId.startsWith('mock-')
        );

        if (sessionData.iceServers && sessionData.iceServers.length > 0) {
          iceServersRef.current = sessionData.iceServers;
          console.log('[WebRTC] Active ICE servers from Cloudflare TURN:', sessionData.iceServers);
        }

        const pc = new RTCPeerConnection({
          iceServers: iceServersRef.current,
          bundlePolicy: 'max-bundle',
          rtcpMuxPolicy: 'require',
        });
        pcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
          console.log(`[SFU] ICE connection state: ${pc.iceConnectionState}`);
        };
        pc.onconnectionstatechange = () => {
          console.log(`[SFU] Peer connection state: ${pc.connectionState}`);
        };

        pc.ontrack = (event) => {
          console.log('[SFU] Inbound remote track from Cloudflare Calls SFU:', event.track.kind, 'mid:', event.transceiver?.mid);
          const stream = event.streams[0] || new MediaStream([event.track]);
          event.track.enabled = true;
          const trackId = event.track.id;
          const mid = event.transceiver?.mid;
          const associatedUserId =
            (mid ? trackMidToUserMapRef.current.get(mid) : undefined) ||
            pendingSubscriberUserIdRef.current ||
            'sfu-speaker';

          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(`sfu-${trackId}`, {
              stream,
              userId: associatedUserId,
              sessionId: '',
              trackName: trackId,
            });
            return next;
          });

          event.track.onended = () => {
            setRemoteStreams((prev) => {
              const next = new Map(prev);
              next.delete(`sfu-${trackId}`);
              return next;
            });
          };
        };
      } catch (sfuErr) {
        isSfuActiveRef.current = false;
        console.warn('Cloudflare SFU session error (direct WebSockets P2P active):', sfuErr);
      }

      // 3. Connect to Native WebSocket Signaling Server on choir-api
      const token = localStorage.getItem('token') || '';
      const socket = new AudioRoomSocket(roomId, token);
      socketRef.current = socket;

      socket.on('connected', () => {
        setConnectionStatus('connected');
      });

      socket.on('room-roster', (payload: any) => {
        if (payload?.activeBibleReference) {
          setActiveBibleReference(payload.activeBibleReference);
        }
        if (Array.isArray(payload?.chatMessages)) {
          setChatMessages(payload.chatMessages);
        }
        if (Array.isArray(payload?.participants)) {
          setParticipants(payload.participants);

          // Sync role if server already has us promoted (e.g., speaker rejoined after refresh)
          const selfEntry = payload.participants.find((p: any) => p.userId === user?.id);
          if (selfEntry?.role && selfEntry.role !== roleRef.current) {
            setRole(selfEntry.role);
            if ((selfEntry.role === 'host' || selfEntry.role === 'speaker') && !localStreamRef.current) {
              publishMicrophoneTrack();
            }
          }

          // Subscribe immediately to any participant who has an active SFU track
          payload.participants.forEach((p: any) => {
            if (p.sessionId && p.trackName && p.sessionId !== sessionIdRef.current && p.userId !== user?.id) {
              subscribeToRemoteTrack(p.sessionId, p.trackName, p.userId);
            }
          });

          // If in P2P fallback mode and local user has an active microphone, offer audio to remote participants
          if (
            !isSfuActiveRef.current &&
            localStreamRef.current &&
            (roleRef.current === 'host' || roleRef.current === 'speaker')
          ) {
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

          if (newP.sessionId && newP.trackName && newP.sessionId !== sessionIdRef.current && newP.userId !== user?.id) {
            subscribeToRemoteTrack(newP.sessionId, newP.trackName, newP.userId);
          }

          // Offer P2P audio to newly joined attendee only when SFU is inactive
          if (
            !isSfuActiveRef.current &&
            localStreamRef.current &&
            (roleRef.current === 'host' || roleRef.current === 'speaker')
          ) {
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
            for (const [key, val] of next.entries()) {
              if (val.userId === payload.userId) {
                next.delete(key);
              }
            }
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
        if (payload?.userId) {
          setParticipants((prev) =>
            prev.map((p) =>
              p.userId === payload.userId
                ? { ...p, sessionId: payload.sessionId, trackName: payload.trackName, isMuted: false }
                : p
            )
          );
        }
        if (payload?.sessionId && payload?.trackName && payload.sessionId !== sessionIdRef.current && payload.userId !== user?.id) {
          subscribeToRemoteTrack(payload.sessionId, payload.trackName, payload.userId);
        }
        if (!isSfuActiveRef.current && payload?.userId && payload.userId !== user?.id) {
          if (localStreamRef.current && !p2pConnectionsRef.current.has(payload.userId)) {
            sendP2pOffer(payload.userId);
          }
        }
      });

      socket.on('track-unpublished', (payload: any) => {
        if (payload?.trackName) {
          subscribedTracksRef.current.delete(payload.trackName);
        }
        if (payload?.userId) {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            for (const [key, val] of next.entries()) {
              if (val.userId === payload.userId) {
                next.delete(key);
              }
            }
            return next;
          });
        }
      });

      socket.on('bible-reference', (payload: CalledBibleReference) => {
        if (payload?.bookId && payload?.chapter) {
          setActiveBibleReference(payload);
        }
      });

      socket.on('chat-message', (payload: RoomChatMessage) => {
        if (payload?.id && payload?.text) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            const next = [...prev, payload];
            return next.length > 150 ? next.slice(next.length - 150) : next;
          });
        }
      });

      socket.on('emoji-reaction', (payload: EmojiReactionEvent) => {
        if (payload?.emoji) {
          emojiListenersRef.current.forEach((fn) => fn(payload));
        }
      });

      socket.on('webrtc-signal', (payload: any) => {
        if (payload?.fromUserId && payload.signal) {
          handleP2pSignal(payload.fromUserId, payload.signal);
        }
      });

      socket.connect();

      startTelemetryMonitoring();

      // If joining directly as host or speaker, activate microphone immediately
      if (roleRef.current === 'host' || roleRef.current === 'speaker') {
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
    publishMicrophoneTrack,
    unpublishMicrophoneTrack,
    sendP2pOffer,
    handleP2pSignal,
    subscribeToRemoteTrack,
    startTelemetryMonitoring,
  ]);

  // Leave room and notify peers immediately
  const leaveRoom = useCallback(async () => {
    const wasJoined = isJoinedRef.current;
    isJoinedRef.current = false;

    if (socketRef.current) {
      socketRef.current.disconnect(true);
      socketRef.current = null;
    }

    cleanupPeerConnection();

    if (wasJoined) {
      cloudflareSfuClient.leaveRoom(roomId).catch(() => {});
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

      if (!nextMuted && !isSfuActiveRef.current) {
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
  }, [roomId, role, isMuted, user?.id, publishMicrophoneTrack, sendP2pOffer]);

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

  // Broadcast called scripture reference to everyone in the room
  const shareBibleReference = useCallback(
    (ref: Omit<CalledBibleReference, 'sharedByUserId' | 'sharedByName' | 'calledAt'>) => {
      if (socketRef.current) {
        socketRef.current.send('bible-reference', ref);
      }
    },
    []
  );

  // Send in-call chat message with 0ms optimistic render
  const sendChatMessage = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || !user?.id) return;

      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const msg: RoomChatMessage = {
        id,
        userId: user.id,
        senderName: user.name || user.email || 'You',
        senderAvatar: user.avatarUrl || null,
        text: text.slice(0, 1000),
        timestamp: Date.now(),
      };

      setChatMessages((prev) => {
        const next = [...prev, msg];
        return next.length > 150 ? next.slice(next.length - 150) : next;
      });

      if (socketRef.current) {
        socketRef.current.send('chat-message', { id, text: msg.text });
      }
    },
    [user?.id, user?.name, user?.email, user?.avatarUrl]
  );

  // Subscribe to floating emoji reactions without re-rendering the room stage
  const subscribeToEmojiReactions = useCallback(
    (handler: (reaction: EmojiReactionEvent) => void) => {
      emojiListenersRef.current.add(handler);
      return () => {
        emojiListenersRef.current.delete(handler);
      };
    },
    []
  );

  // Send floating emoji reaction (0ms local emit + WebSocket broadcast)
  const sendEmojiReaction = useCallback(
    (emoji: string) => {
      if (!emoji || !user?.id) return;
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const event: EmojiReactionEvent = {
        id,
        emoji,
        userId: user.id,
        senderName: user.name || user.email || 'You',
        timestamp: Date.now(),
      };

      emojiListenersRef.current.forEach((fn) => fn(event));

      if (socketRef.current) {
        socketRef.current.send('emoji-reaction', { id, emoji });
      }
    },
    [user?.id, user?.name, user?.email]
  );

  const leaveRoomRef = useRef(leaveRoom);
  leaveRoomRef.current = leaveRoom;

  // Instant leave notification when closing tab/app or navigating away
  useEffect(() => {
    const handlePageExit = () => {
      if (!isJoinedRef.current) return;
      isJoinedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect(true);
        socketRef.current = null;
      }
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      if (token) {
        fetch(`${baseUrl}/audio-rooms/${roomId}/leave`, {
          method: 'POST',
          keepalive: true,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {});
      }
    };

    window.addEventListener('pagehide', handlePageExit);
    window.addEventListener('beforeunload', handlePageExit);
    return () => {
      window.removeEventListener('pagehide', handlePageExit);
      window.removeEventListener('beforeunload', handlePageExit);
      leaveRoomRef.current();
    };
  }, [roomId]);

  return {
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
  };
}

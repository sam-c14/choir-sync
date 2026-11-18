import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { AudioRoomRole } from '@choir-workspace/shared-validation';

export interface RoomClient {
  connectionId: string;
  ws: WebSocket;
  userId: string;
  roomId: string;
  name: string;
  avatarUrl?: string | null;
  role: AudioRoomRole;
  isMuted: boolean;
  handRaised: boolean;
  sessionId?: string | null;
  trackName?: string | null;
  lastSeen: number;
}

export interface RoomChatMessage {
  id: string;
  userId: string;
  senderName: string;
  senderAvatar?: string | null;
  text: string;
  timestamp: number;
}

const MAX_ROOM_CHAT_HISTORY = 100;

// Map<roomId, Map<connectionId, RoomClient>>
const rooms = new Map<string, Map<string, RoomClient>>();
// Map<roomId, active called scripture reference>
const activeBibleReferences = new Map<string, any>();
// Map<roomId, recent in-call chat messages>
const roomChatHistory = new Map<string, RoomChatMessage[]>();

function removeConnectionFromRoom(roomId: string, connectionId: string, userId: string) {
  const roomClients = rooms.get(roomId);
  if (!roomClients || !roomClients.has(connectionId)) return;

  roomClients.delete(connectionId);
  logger.info(
    `WebSocket: Connection ${connectionId.slice(0, 8)} left room ${roomId} (user=${userId}). Remaining sockets: ${roomClients.size}`
  );

  // Check if user still has other active sockets (e.g. multiple tabs)
  const hasOtherSockets = Array.from(roomClients.values()).some((c) => c.userId === userId);

  if (!hasOtherSockets) {
    broadcastToRoom(roomId, null, {
      type: 'participant-left',
      payload: { userId },
    });

    prisma.audioRoomParticipant
      .deleteMany({
        where: { roomId, userId },
      })
      .catch(() => {});
  }

  if (roomClients.size === 0) {
    rooms.delete(roomId);
    activeBibleReferences.delete(roomId);
    roomChatHistory.delete(roomId);
  }
}

export function notifyRoomParticipantLeft(roomId: string, userId: string) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  const matchingConnections: Array<{ connectionId: string; ws: WebSocket }> = [];
  roomClients.forEach((c, connId) => {
    if (c.userId === userId) {
      matchingConnections.push({ connectionId: connId, ws: c.ws });
    }
  });

  matchingConnections.forEach(({ connectionId, ws }) => {
    removeConnectionFromRoom(roomId, connectionId, userId);
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      try {
        ws.close(1000, 'Participant left room');
      } catch {
        // Ignore close errors
      }
    }
  });
}

export function setupAudioRoomsWebSocketServer(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    try {
      const parsedUrl = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;

      if (
        pathname === '/ws/audio-rooms' ||
        pathname === '/api/v1/audio-rooms/ws' ||
        pathname === '/api/audio-rooms/ws'
      ) {
        const token = parsedUrl.searchParams.get('token');
        const roomId = parsedUrl.searchParams.get('roomId');

        if (!token || !roomId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
          socket.destroy();
          return;
        }

        let decoded: any;
        try {
          decoded = jwt.verify(token, jwtSecret);
        } catch {
          socket.write('HTTP/1.1 401 Unauthorized: Invalid Token\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request, { userId: decoded.id, roomId });
        });
      }
    } catch (err) {
      logger.error('WebSocket upgrade error:', err);
      socket.destroy();
    }
  });

  wss.on('connection', async (ws: WebSocket, _request: any, info: { userId: string; roomId: string }) => {
    const { userId, roomId } = info;
    const connectionId = crypto.randomUUID();
    // Buffer frames arriving while async DB initialization runs so early messages aren't dropped
    const earlyMessageQueue: Array<Buffer | string> = [];
    let isInitialized = false;
    let isClosed = false;
    let handleIncomingMessage: ((data: Buffer | string) => Promise<void>) | null = null;

    ws.on('message', (data: Buffer | string) => {
      if (!isInitialized || !handleIncomingMessage) {
        earlyMessageQueue.push(data);
        return;
      }
      handleIncomingMessage(data);
    });

    ws.on('error', (err) => {
      logger.warn(`WebSocket error for user ${userId} (${connectionId.slice(0, 8)}):`, err);
    });

    const earlyCloseHandler = () => {
      isClosed = true;
    };
    ws.once('close', earlyCloseHandler);

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, avatarUrl: true },
      });

      const room = await prisma.audioRoom.findUnique({
        where: { id: roomId },
      });

      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        ws.close();
        return;
      }

      const isSocketClosingOrClosed = () =>
        isClosed || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING;

      if (isSocketClosingOrClosed()) {
        return;
      }

      const isHost = room.hostId === userId;
      const initialRole: AudioRoomRole = isHost ? 'host' : 'listener';

      const participant = await prisma.audioRoomParticipant.upsert({
        where: { roomId_userId: { roomId, userId } },
        update: { updatedAt: new Date(), ...(isHost ? { role: 'host' } : {}) },
        create: {
          roomId,
          userId,
          role: initialRole,
          isMuted: true,
          handRaised: false,
        },
      });

      if (isSocketClosingOrClosed()) {
        return;
      }

      const clientRole = (participant.role as AudioRoomRole) || initialRole;

      const client: RoomClient = {
        connectionId,
        ws,
        userId,
        roomId,
        name: user?.name || user?.email || 'Chorister',
        avatarUrl: user?.avatarUrl,
        role: clientRole,
        isMuted: participant.isMuted,
        handRaised: participant.handRaised,
        lastSeen: Date.now(),
      };

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const roomClients = rooms.get(roomId)!;
      roomClients.set(connectionId, client);

      logger.info(
        `WebSocket: User ${userId} (${client.name}, conn=${connectionId.slice(0, 8)}) connected to room ${roomId}. Total sockets: ${roomClients.size}`
      );

      // Build unique participant roster across all connections in the room (prefer active SFU track metadata)
      const uniqueParticipantsMap = new Map<string, any>();
      roomClients.forEach((c) => {
        const existing = uniqueParticipantsMap.get(c.userId);
        if (!existing || (!existing.trackName && c.trackName)) {
          uniqueParticipantsMap.set(c.userId, {
            userId: c.userId,
            name: c.name,
            avatarUrl: c.avatarUrl,
            role: c.role,
            isMuted: c.isMuted,
            handRaised: c.handRaised,
            sessionId: c.sessionId || existing?.sessionId,
            trackName: c.trackName || existing?.trackName,
          });
        }
      });

      // Send roster + active called scripture + recent chat history to newly joined socket
      ws.send(
        JSON.stringify({
          type: 'room-roster',
          payload: {
            participants: Array.from(uniqueParticipantsMap.values()),
            activeBibleReference: activeBibleReferences.get(roomId) || null,
            chatMessages: roomChatHistory.get(roomId) || [],
          },
        })
      );

      // Broadcast participant-joined to other clients in the room
      broadcastToRoom(roomId, connectionId, {
        type: 'participant-joined',
        payload: {
          participant: {
            userId: client.userId,
            name: client.name,
            avatarUrl: client.avatarUrl,
            role: client.role,
            isMuted: client.isMuted,
            handRaised: client.handRaised,
            sessionId: client.sessionId,
            trackName: client.trackName,
          },
        },
      });

      handleIncomingMessage = async (data: Buffer | string) => {
        client.lastSeen = Date.now();
        try {
          const msg = JSON.parse(data.toString());
          const type = msg.type;
          const payload = msg.payload || {};

          switch (type) {
            case 'ping': {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'pong' }));
              }
              break;
            }

            case 'pong': {
              client.lastSeen = Date.now();
              break;
            }

            case 'hand-raised': {
              const nextRaised = Boolean(payload.handRaised);
              const targetUserId = (client.role === 'host' && payload.userId) ? payload.userId : userId;
              // Update state for all connections of this user
              roomClients.forEach((c) => {
                if (c.userId === targetUserId) c.handRaised = nextRaised;
              });

              broadcastToRoom(roomId, null, {
                type: 'hand-raised',
                payload: { userId: targetUserId, handRaised: nextRaised },
              });

              await prisma.audioRoomParticipant
                .update({
                  where: { roomId_userId: { roomId, userId: targetUserId } },
                  data: { handRaised: nextRaised },
                })
                .catch(() => {});
              break;
            }

            case 'mute-updated': {
              const nextMuted = Boolean(payload.isMuted);
              const targetUserId = (client.role === 'host' && payload.targetUserId) ? payload.targetUserId : userId;
              roomClients.forEach((c) => {
                if (c.userId === targetUserId) c.isMuted = nextMuted;
              });

              broadcastToRoom(roomId, null, {
                type: 'mute-updated',
                payload: { targetUserId, isMuted: nextMuted },
              });

              await prisma.audioRoomParticipant
                .update({
                  where: { roomId_userId: { roomId, userId: targetUserId } },
                  data: { isMuted: nextMuted },
                })
                .catch(() => {});
              break;
            }

            case 'role-updated': {
              const targetUserId = payload.targetUserId;
              const newRole = payload.newRole as AudioRoomRole;

              roomClients.forEach((c) => {
                if (c.userId === targetUserId) {
                  c.role = newRole;
                  if (newRole === 'speaker') c.handRaised = false;
                }
              });

              broadcastToRoom(roomId, null, {
                type: 'role-updated',
                payload: { targetUserId, newRole },
              });

              await prisma.audioRoomParticipant
                .update({
                  where: { roomId_userId: { roomId, userId: targetUserId } },
                  data: { role: newRole, ...(newRole === 'speaker' ? { handRaised: false } : {}) },
                })
                .catch(() => {});
              break;
            }

            case 'mute-all': {
              roomClients.forEach((c) => {
                if (c.role !== 'host') c.isMuted = true;
              });
              broadcastToRoom(roomId, null, { type: 'mute-all', payload: {} });
              break;
            }

            case 'track-published': {
              roomClients.forEach((c) => {
                if (c.userId === userId) {
                  c.trackName = payload.trackName;
                  c.sessionId = payload.sessionId;
                  c.isMuted = false;
                }
              });
              broadcastToRoom(roomId, connectionId, {
                type: 'track-published',
                payload: {
                  userId,
                  sessionId: payload.sessionId,
                  trackName: payload.trackName,
                },
              });
              break;
            }

            case 'track-unpublished': {
              roomClients.forEach((c) => {
                if (c.userId === userId) {
                  c.trackName = null;
                }
              });
              broadcastToRoom(roomId, connectionId, {
                type: 'track-unpublished',
                payload: { userId, trackName: payload.trackName },
              });
              break;
            }

            case 'bible-reference': {
              const refPayload = {
                bookId: payload.bookId,
                bookName: payload.bookName,
                chapter: Number(payload.chapter),
                verseStart: payload.verseStart ? Number(payload.verseStart) : undefined,
                verseEnd: payload.verseEnd ? Number(payload.verseEnd) : undefined,
                version: payload.version || 'BSB',
                sharedByUserId: userId,
                sharedByName: client.name,
                calledAt: Date.now(),
              };
              if (refPayload.bookId && refPayload.chapter) {
                activeBibleReferences.set(roomId, refPayload);
                broadcastToRoom(roomId, null, {
                  type: 'bible-reference',
                  payload: refPayload,
                });
              }
              break;
            }

            case 'chat-message': {
              const rawText = typeof payload.text === 'string' ? payload.text.trim() : '';
              if (!rawText) break;

              const chatMsg: RoomChatMessage = {
                id: typeof payload.id === 'string' && payload.id ? payload.id : crypto.randomUUID(),
                userId,
                senderName: client.name,
                senderAvatar: client.avatarUrl || null,
                text: rawText.slice(0, 1000),
                timestamp: Date.now(),
              };

              const history = roomChatHistory.get(roomId) || [];
              history.push(chatMsg);
              if (history.length > MAX_ROOM_CHAT_HISTORY) {
                history.splice(0, history.length - MAX_ROOM_CHAT_HISTORY);
              }
              roomChatHistory.set(roomId, history);

              broadcastToRoom(roomId, connectionId, {
                type: 'chat-message',
                payload: chatMsg,
              });
              break;
            }

            case 'emoji-reaction': {
              const emoji = typeof payload.emoji === 'string' ? payload.emoji.trim().slice(0, 16) : '';
              if (!emoji) break;

              broadcastToRoom(roomId, connectionId, {
                type: 'emoji-reaction',
                payload: {
                  id: typeof payload.id === 'string' && payload.id ? payload.id : crypto.randomUUID(),
                  emoji,
                  userId,
                  senderName: client.name,
                  timestamp: Date.now(),
                },
              });
              break;
            }

            case 'leave-room': {
              removeConnectionFromRoom(roomId, connectionId, userId);
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(1000, 'Left room');
              }
              break;
            }

            case 'webrtc-signal': {
              const targetUserId = payload.targetUserId;
              if (targetUserId) {
                // Forward signal to target user's connections
                roomClients.forEach((targetClient) => {
                  if (targetClient.userId === targetUserId && targetClient.connectionId !== connectionId) {
                    if (targetClient.ws.readyState === WebSocket.OPEN) {
                      targetClient.ws.send(
                        JSON.stringify({
                          type: 'webrtc-signal',
                          payload: {
                            fromUserId: userId,
                            signal: payload.signal,
                          },
                        })
                      );
                    }
                  }
                });
              }
              break;
            }
          }
        } catch (err) {
          logger.error('Error processing WebSocket message:', err);
        }
      };

      ws.removeListener('close', earlyCloseHandler);
      ws.on('close', () => {
        removeConnectionFromRoom(roomId, connectionId, userId);
      });

      isInitialized = true;
      for (const queued of earlyMessageQueue) {
        await handleIncomingMessage(queued);
      }
      earlyMessageQueue.length = 0;
    } catch (connErr) {
      logger.error('WebSocket connection setup error:', connErr);
      ws.close();
    }
  });

  // Application-level JSON heartbeat every 25 seconds; tolerates up to 90s of silence
  const heartbeatInterval = setInterval(() => {
    const now = Date.now();
    rooms.forEach((roomClients, roomId) => {
      roomClients.forEach((client, connectionId) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.send(JSON.stringify({ type: 'ping' }));
          } catch {
            // Socket write failed
          }
        }

        // Only terminate if completely unresponsive for 90 seconds
        if (now - client.lastSeen > 90000) {
          logger.info(`Terminating timed-out socket for user ${client.userId} (${connectionId.slice(0, 8)})`);
          client.ws.terminate();
        }
      });
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function broadcastToRoom(roomId: string, excludeConnectionId: string | null, message: any) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  const data = JSON.stringify(message);
  roomClients.forEach((client, connId) => {
    if (excludeConnectionId && connId === excludeConnectionId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

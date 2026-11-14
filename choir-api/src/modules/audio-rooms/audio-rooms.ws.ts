import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import type { AudioRoomRole } from '@choir-workspace/shared-validation';

export interface RoomClient {
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
  isAlive: boolean;
}

// Map<roomId, Map<userId, RoomClient>>
const rooms = new Map<string, Map<string, RoomClient>>();

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

      const clientRole = (participant.role as AudioRoomRole) || initialRole;

      const client: RoomClient = {
        ws,
        userId,
        roomId,
        name: user?.name || user?.email || 'Chorister',
        avatarUrl: user?.avatarUrl,
        role: clientRole,
        isMuted: participant.isMuted,
        handRaised: participant.handRaised,
        isAlive: true,
      };

      if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map());
      }
      const roomClients = rooms.get(roomId)!;
      roomClients.set(userId, client);

      logger.info(`WebSocket: User ${userId} (${client.name}) connected to room ${roomId}. Total clients: ${roomClients.size}`);

      // Send full room roster to the connected client
      const currentRoster = Array.from(roomClients.values()).map((c) => ({
        userId: c.userId,
        name: c.name,
        avatarUrl: c.avatarUrl,
        role: c.role,
        isMuted: c.isMuted,
        handRaised: c.handRaised,
        sessionId: c.sessionId,
        trackName: c.trackName,
      }));

      ws.send(JSON.stringify({ type: 'room-roster', payload: { participants: currentRoster } }));

      // Broadcast participant-joined to other clients in this room
      broadcastToRoom(roomId, userId, {
        type: 'participant-joined',
        payload: {
          participant: {
            userId: client.userId,
            name: client.name,
            avatarUrl: client.avatarUrl,
            role: client.role,
            isMuted: client.isMuted,
            handRaised: client.handRaised,
          },
        },
      });

      ws.on('message', async (data: Buffer | string) => {
        try {
          const msg = JSON.parse(data.toString());
          const type = msg.type;
          const payload = msg.payload || {};

          switch (type) {
            case 'hand-raised': {
              const nextRaised = Boolean(payload.handRaised);
              client.handRaised = nextRaised;
              broadcastToRoom(roomId, null, {
                type: 'hand-raised',
                payload: { userId, handRaised: nextRaised },
              });
              await prisma.audioRoomParticipant
                .update({
                  where: { roomId_userId: { roomId, userId } },
                  data: { handRaised: nextRaised },
                })
                .catch(() => {});
              break;
            }

            case 'mute-updated': {
              const nextMuted = Boolean(payload.isMuted);
              client.isMuted = nextMuted;
              broadcastToRoom(roomId, null, {
                type: 'mute-updated',
                payload: { targetUserId: userId, isMuted: nextMuted },
              });
              await prisma.audioRoomParticipant
                .update({
                  where: { roomId_userId: { roomId, userId } },
                  data: { isMuted: nextMuted },
                })
                .catch(() => {});
              break;
            }

            case 'role-updated': {
              const targetUserId = payload.targetUserId;
              const newRole = payload.newRole as AudioRoomRole;
              const targetClient = roomClients.get(targetUserId);
              if (targetClient) {
                targetClient.role = newRole;
                if (newRole === 'speaker') targetClient.handRaised = false;
              }
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
              client.trackName = payload.trackName;
              client.sessionId = payload.sessionId;
              broadcastToRoom(roomId, userId, {
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
              client.trackName = null;
              broadcastToRoom(roomId, userId, {
                type: 'track-unpublished',
                payload: { userId, trackName: payload.trackName },
              });
              break;
            }

            case 'webrtc-signal': {
              const targetUserId = payload.targetUserId;
              if (targetUserId) {
                const target = roomClients.get(targetUserId);
                if (target && target.ws.readyState === WebSocket.OPEN) {
                  target.ws.send(
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
              break;
            }

            case 'ping': {
              client.isAlive = true;
              ws.send(JSON.stringify({ type: 'pong' }));
              break;
            }
          }
        } catch (err) {
          logger.error('Error processing WebSocket message:', err);
        }
      });

      ws.on('pong', () => {
        client.isAlive = true;
      });

      ws.on('close', async () => {
        roomClients.delete(userId);
        logger.info(`WebSocket: User ${userId} disconnected from room ${roomId}. Remaining: ${roomClients.size}`);

        if (roomClients.size === 0) {
          rooms.delete(roomId);
        } else {
          broadcastToRoom(roomId, userId, {
            type: 'participant-left',
            payload: { userId },
          });
        }

        await prisma.audioRoomParticipant
          .deleteMany({
            where: { roomId, userId },
          })
          .catch(() => {});
      });

      ws.on('error', (err) => {
        logger.warn(`WebSocket error for user ${userId}:`, err);
      });
    } catch (connErr) {
      logger.error('WebSocket connection setup error:', connErr);
      ws.close();
    }
  });

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = findClientBySocket(ws);
      if (client) {
        if (!client.isAlive) {
          logger.info(`Terminating inactive socket for user ${client.userId}`);
          return ws.terminate();
        }
        client.isAlive = false;
        ws.ping();
      }
    });
  }, 25000);

  wss.on('close', () => {
    clearInterval(heartbeatInterval);
  });

  return wss;
}

function broadcastToRoom(roomId: string, excludeUserId: string | null, message: any) {
  const roomClients = rooms.get(roomId);
  if (!roomClients) return;

  const data = JSON.stringify(message);
  roomClients.forEach((client, uId) => {
    if (excludeUserId && uId === excludeUserId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function findClientBySocket(ws: WebSocket): RoomClient | undefined {
  for (const roomClients of rooms.values()) {
    for (const client of roomClients.values()) {
      if (client.ws === ws) return client;
    }
  }
  return undefined;
}

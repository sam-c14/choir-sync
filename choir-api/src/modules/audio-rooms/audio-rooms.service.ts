import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import {
  CreateAudioRoomDto,
  UpdateAudioRoomDto,
  UpdateParticipantRoleDto,
  AudioRoomTrackRequestDto,
} from '@choir-workspace/shared-validation';

interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export class AudioRoomsService {
  private getCloudflareConfig() {
    const appId = process.env.CLOUDFLARE_APP_ID;
    const appSecret = process.env.CLOUDFLARE_APP_SECRET;
    const turnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID;
    const turnApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN;

    return { appId, appSecret, turnKeyId, turnApiToken };
  }

  // --- Database Operations ---

  async listRooms() {
    return prisma.audioRoom.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        host: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
        },
      },
    });
  }

  async getRoomById(roomId: string) {
    const room = await prisma.audioRoom.findUnique({
      where: { id: roomId },
      include: {
        host: {
          select: { id: true, name: true, email: true, avatarUrl: true, role: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true, role: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    if (!room) {
      throw new Error('Audio room not found');
    }
    return room;
  }

  async createRoom(hostId: string, data: CreateAudioRoomDto) {
    return prisma.audioRoom.create({
      data: {
        title: data.title,
        description: data.description,
        hostId,
        participants: {
          create: {
            userId: hostId,
            role: 'host',
            isMuted: false,
          },
        },
      },
      include: {
        host: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        participants: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
  }

  async updateRoom(roomId: string, data: UpdateAudioRoomDto) {
    return prisma.audioRoom.update({
      where: { id: roomId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status && { status: data.status }),
      },
    });
  }

  async joinRoom(roomId: string, userId: string) {
    const room = await prisma.audioRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new Error('Audio room not found');
    }
    if (room.status === 'ENDED') {
      throw new Error('Audio room has already ended');
    }

    const isHost = room.hostId === userId;
    const defaultRole = isHost ? 'host' : 'listener';

    return prisma.audioRoomParticipant.upsert({
      where: {
        roomId_userId: { roomId, userId },
      },
      update: {
        updatedAt: new Date(),
        ...(isHost ? { role: 'host' } : {}),
      },
      create: {
        roomId,
        userId,
        role: defaultRole,
        isMuted: true,
        handRaised: false,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  async leaveRoom(roomId: string, userId: string) {
    await prisma.audioRoomParticipant.deleteMany({
      where: { roomId, userId },
    });
  }

  async updateParticipantRole(
    roomId: string,
    targetUserId: string,
    data: UpdateParticipantRoleDto
  ) {
    return prisma.audioRoomParticipant.update({
      where: {
        roomId_userId: { roomId, userId: targetUserId },
      },
      data: {
        ...(data.role && { role: data.role }),
        ...(data.isMuted !== undefined && { isMuted: data.isMuted }),
        ...(data.handRaised !== undefined && { handRaised: data.handRaised }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });
  }

  // --- Cloudflare Calls SFU REST Proxy Operations ---

  async getTurnCredentials(): Promise<IceServerConfig[]> {
    const { turnKeyId, turnApiToken } = this.getCloudflareConfig();
    const defaultIceServers: IceServerConfig[] = [
      { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
    ];

    if (!turnKeyId || !turnApiToken) {
      return defaultIceServers;
    }

    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${turnKeyId}/credentials/generate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${turnApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: 86400 }),
        }
      );

      if (!response.ok) {
        logger.warn(`Cloudflare TURN generation returned ${response.status}. Using fallback STUN.`);
        return defaultIceServers;
      }

      const data = (await response.json()) as any;
      if (data?.iceServers?.length) {
        return data.iceServers;
      }
      return defaultIceServers;
    } catch (err: any) {
      logger.warn(`Cloudflare TURN generation failed: ${err.message}. Using fallback STUN.`);
      return defaultIceServers;
    }
  }

  async createSfuSession(roomId: string, userId: string) {
    await this.joinRoom(roomId, userId);

    const { appId, appSecret } = this.getCloudflareConfig();
    const iceServers = await this.getTurnCredentials();

    if (!appId || !appSecret) {
      logger.warn(
        'CLOUDFLARE_APP_ID or CLOUDFLARE_APP_SECRET is not set. Generating mock SFU session ID for local testing.'
      );
      const mockSessionId = `mock-sfu-session-${roomId.slice(0, 8)}-${userId.slice(0, 8)}`;
      return { sessionId: mockSessionId, iceServers };
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/new`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appSecret}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Cloudflare SFU create session error (${response.status}): ${errorText}`);
      throw new Error(`Failed to initialize Cloudflare Realtime SFU session: ${errorText}`);
    }

    const data = (await response.json()) as { sessionId: string };
    return {
      sessionId: data.sessionId,
      iceServers,
    };
  }

  async proxyTrackNegotiation(
    sessionId: string,
    body: AudioRoomTrackRequestDto
  ) {
    const { appId, appSecret } = this.getCloudflareConfig();

    if (!appId || !appSecret) {
      logger.warn('Mocking Cloudflare track negotiation response.');
      const offerSdp = body.sessionDescription.sdp;
      const answerSdp = offerSdp
        .replace(/a=setup:actpass/g, 'a=setup:active')
        .replace(/a=sendrecv/g, 'a=recvonly');

      return {
        sessionDescription: {
          type: 'answer',
          sdp: answerSdp,
        },
        tracks: body.tracks.map((t) => ({
          ...t,
          status: 'active',
        })),
      };
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/${sessionId}/tracks/new`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${appSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Cloudflare track negotiation error (${response.status}): ${errorText}`);
      throw new Error(`Cloudflare track negotiation failed: ${errorText}`);
    }

    return response.json();
  }

  async proxyRenegotiation(
    sessionId: string,
    body: { sessionDescription: { type: 'offer' | 'answer'; sdp: string } }
  ) {
    const { appId, appSecret } = this.getCloudflareConfig();

    if (!appId || !appSecret) {
      const offerSdp = body.sessionDescription.sdp;
      const answerSdp = offerSdp
        .replace(/a=setup:actpass/g, 'a=setup:active')
        .replace(/a=sendrecv/g, 'a=recvonly');
      return {
        sessionDescription: {
          type: 'answer',
          sdp: answerSdp,
        },
      };
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/${sessionId}/renegotiate`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${appSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`Cloudflare renegotiation error (${response.status}): ${errorText}`);
      throw new Error(`Cloudflare renegotiation failed: ${errorText}`);
    }

    return response.json();
  }

  async proxyCloseTracks(sessionId: string, trackNames: string[]) {
    const { appId, appSecret } = this.getCloudflareConfig();

    if (!appId || !appSecret) {
      return { success: true };
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${appId}/sessions/${sessionId}/tracks/close`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${appSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tracks: trackNames.map((name) => ({ trackName: name })),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn(`Cloudflare close tracks error (${response.status}): ${errorText}`);
    }

    return { success: true };
  }
}

export const audioRoomsService = new AudioRoomsService();

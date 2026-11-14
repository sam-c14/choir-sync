import { Request, Response } from 'express';
import {
  CreateAudioRoomSchema,
  UpdateAudioRoomSchema,
  UpdateParticipantRoleSchema,
  AudioRoomTrackRequestSchema,
} from '@choir-workspace/shared-validation';
import { audioRoomsService } from './audio-rooms.service';
import { handleControllerError, sendError } from '../../lib/errors';
import { z } from 'zod';

const RenegotiateSchema = z.object({
  sessionDescription: z.object({
    type: z.enum(['offer', 'answer']),
    sdp: z.string().min(1),
  }),
});

const CloseTracksSchema = z.object({
  trackNames: z.array(z.string().min(1)),
});

export class AudioRoomsController {
  async listRooms(req: Request, res: Response) {
    try {
      const rooms = await audioRoomsService.listRooms();
      res.json(rooms);
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch audio rooms', req);
    }
  }

  async getRoom(req: Request, res: Response) {
    try {
      const room = await audioRoomsService.getRoomById(req.params.id as string);
      res.json(room);
    } catch (error) {
      handleControllerError(res, error, 'Failed to fetch audio room details', req);
    }
  }

  async createRoom(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 401, 'Unauthorized', undefined, 'UNAUTHORIZED');
      }

      const validated = CreateAudioRoomSchema.parse(req.body);
      const room = await audioRoomsService.createRoom(req.user.id, validated);
      res.status(201).json(room);
    } catch (error) {
      handleControllerError(res, error, 'Failed to create audio room', req);
    }
  }

  async updateRoom(req: Request, res: Response) {
    try {
      const roomId = req.params.id as string;
      const room = await audioRoomsService.getRoomById(roomId);

      const isHost = room.hostId === req.user?.id;
      const isDirector = req.user?.role === 'DIRECTOR' || req.user?.role === 'ADMIN';

      if (!isHost && !isDirector) {
        return sendError(res, 403, 'Forbidden: Only the host or director can update the room', undefined, 'FORBIDDEN');
      }

      const validated = UpdateAudioRoomSchema.parse(req.body);
      const updated = await audioRoomsService.updateRoom(roomId, validated);
      res.json(updated);
    } catch (error) {
      handleControllerError(res, error, 'Failed to update audio room', req);
    }
  }

  async joinRoom(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 401, 'Unauthorized', undefined, 'UNAUTHORIZED');
      }

      const participant = await audioRoomsService.joinRoom(req.params.id as string, req.user.id);
      res.json(participant);
    } catch (error) {
      handleControllerError(res, error, 'Failed to join audio room', req);
    }
  }

  async leaveRoom(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 401, 'Unauthorized', undefined, 'UNAUTHORIZED');
      }

      await audioRoomsService.leaveRoom(req.params.id as string, req.user.id);
      res.json({ success: true });
    } catch (error) {
      handleControllerError(res, error, 'Failed to leave audio room', req);
    }
  }

  async updateParticipantRole(req: Request, res: Response) {
    try {
      const roomId = req.params.id as string;
      const targetUserId = req.params.userId as string;
      const currentUserId = req.user?.id;

      const room = await audioRoomsService.getRoomById(roomId);
      const isHost = room.hostId === currentUserId;
      const isDirector = req.user?.role === 'DIRECTOR' || req.user?.role === 'ADMIN';
      const isSelf = currentUserId === targetUserId;

      const validated = UpdateParticipantRoleSchema.parse(req.body);

      // Only host or director can change roles to speaker or host
      if (!isHost && !isDirector && !isSelf && validated.role !== 'listener') {
        return sendError(res, 403, 'Forbidden: Only the host or director can promote participants', undefined, 'FORBIDDEN');
      }

      const updated = await audioRoomsService.updateParticipantRole(roomId, targetUserId, validated);
      res.json(updated);
    } catch (error) {
      handleControllerError(res, error, 'Failed to update participant role', req);
    }
  }

  async createSession(req: Request, res: Response) {
    try {
      if (!req.user?.id) {
        return sendError(res, 401, 'Unauthorized', undefined, 'UNAUTHORIZED');
      }

      const roomId = req.params.id as string;
      const sessionData = await audioRoomsService.createSfuSession(roomId, req.user.id);
      res.json(sessionData);
    } catch (error) {
      handleControllerError(res, error, 'Failed to initialize SFU session', req);
    }
  }

  async proxyTracks(req: Request, res: Response) {
    try {
      const sessionId = req.headers['x-sfu-session-id'] as string;
      if (!sessionId) {
        return sendError(res, 400, 'Missing x-sfu-session-id header', undefined, 'BAD_REQUEST');
      }

      const validated = AudioRoomTrackRequestSchema.parse(req.body);
      const result = await audioRoomsService.proxyTrackNegotiation(sessionId, validated);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error, 'Failed to negotiate SFU tracks', req);
    }
  }

  async proxyRenegotiation(req: Request, res: Response) {
    try {
      const sessionId = req.headers['x-sfu-session-id'] as string;
      if (!sessionId) {
        return sendError(res, 400, 'Missing x-sfu-session-id header', undefined, 'BAD_REQUEST');
      }

      const validated = RenegotiateSchema.parse(req.body);
      const result = await audioRoomsService.proxyRenegotiation(sessionId, validated);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error, 'Failed to renegotiate SFU session', req);
    }
  }

  async proxyCloseTracks(req: Request, res: Response) {
    try {
      const sessionId = req.headers['x-sfu-session-id'] as string;
      if (!sessionId) {
        return sendError(res, 400, 'Missing x-sfu-session-id header', undefined, 'BAD_REQUEST');
      }

      const validated = CloseTracksSchema.parse(req.body);
      const result = await audioRoomsService.proxyCloseTracks(sessionId, validated.trackNames);
      res.json(result);
    } catch (error) {
      handleControllerError(res, error, 'Failed to close SFU tracks', req);
    }
  }
}

export const audioRoomsController = new AudioRoomsController();

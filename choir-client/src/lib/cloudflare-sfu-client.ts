import { apiClient } from './api-client';
import type {
  CreateAudioRoomDto,
  UpdateAudioRoomDto,
  UpdateParticipantRoleDto,
  AudioRoomTrackRequestDto,
} from '@choir-workspace/shared-validation';

export interface SfuSessionResponse {
  sessionId: string;
  iceServers: RTCIceServer[];
}

export interface TrackNegotiationResponse {
  sessionDescription: {
    type: 'answer' | 'offer';
    sdp: string;
  };
  tracks?: Array<{
    location: 'local' | 'remote';
    mid?: string;
    trackName?: string;
    sessionId?: string;
    status?: string;
  }>;
}

export const cloudflareSfuClient = {
  async listRooms() {
    const res = await apiClient.get('/audio-rooms');
    return res.data;
  },

  async getRoom(roomId: string) {
    const res = await apiClient.get(`/audio-rooms/${roomId}`);
    return res.data;
  },

  async createRoom(data: CreateAudioRoomDto) {
    const res = await apiClient.post('/audio-rooms', data);
    return res.data;
  },

  async updateRoom(roomId: string, data: UpdateAudioRoomDto) {
    const res = await apiClient.patch(`/audio-rooms/${roomId}`, data);
    return res.data;
  },

  async joinRoom(roomId: string) {
    const res = await apiClient.post(`/audio-rooms/${roomId}/join`);
    return res.data;
  },

  async createSession(roomId: string): Promise<SfuSessionResponse> {
    const res = await apiClient.post(`/audio-rooms/${roomId}/session`);
    return res.data;
  },

  async publishLocalTrack(
    roomId: string,
    sessionId: string,
    offerSdp: string,
    trackName = 'microphone-audio',
    mid?: string
  ): Promise<TrackNegotiationResponse> {
    const payload: AudioRoomTrackRequestDto = {
      sessionDescription: {
        type: 'offer',
        sdp: offerSdp,
      },
      tracks: [
        {
          location: 'local',
          trackName,
          mid,
        },
      ],
    };

    const res = await apiClient.post(`/audio-rooms/${roomId}/tracks`, payload, {
      headers: {
        'x-sfu-session-id': sessionId,
      },
    });
    return res.data;
  },

  async subscribeRemoteTracks(
    roomId: string,
    sessionId: string,
    offerSdp: string,
    remoteTracks: Array<{ sessionId: string; trackName: string }>
  ): Promise<TrackNegotiationResponse> {
    const payload: AudioRoomTrackRequestDto = {
      sessionDescription: {
        type: 'offer',
        sdp: offerSdp,
      },
      tracks: remoteTracks.map((t) => ({
        location: 'remote',
        sessionId: t.sessionId,
        trackName: t.trackName,
      })),
    };

    const res = await apiClient.put(`/audio-rooms/${roomId}/tracks`, payload, {
      headers: {
        'x-sfu-session-id': sessionId,
      },
    });
    return res.data;
  },

  async renegotiate(
    roomId: string,
    sessionId: string,
    offerSdp: string
  ): Promise<{ sessionDescription: { type: 'answer'; sdp: string } }> {
    const res = await apiClient.put(
      `/audio-rooms/${roomId}/renegotiate`,
      {
        sessionDescription: {
          type: 'offer',
          sdp: offerSdp,
        },
      },
      {
        headers: {
          'x-sfu-session-id': sessionId,
        },
      }
    );
    return res.data;
  },

  async closeTracks(roomId: string, sessionId: string, trackNames: string[]) {
    const res = await apiClient.put(
      `/audio-rooms/${roomId}/tracks/close`,
      { trackNames },
      {
        headers: {
          'x-sfu-session-id': sessionId,
        },
      }
    );
    return res.data;
  },

  async updateParticipantRole(
    roomId: string,
    userId: string,
    data: UpdateParticipantRoleDto
  ) {
    const res = await apiClient.patch(
      `/audio-rooms/${roomId}/participants/${userId}`,
      data
    );
    return res.data;
  },

  async leaveRoom(roomId: string) {
    const res = await apiClient.post(`/audio-rooms/${roomId}/leave`);
    return res.data;
  },
};

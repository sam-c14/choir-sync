export interface SocketParticipant {
  userId: string;
  name: string;
  avatarUrl?: string | null;
  role: 'host' | 'speaker' | 'listener';
  isMuted: boolean;
  handRaised: boolean;
  sessionId?: string | null;
  trackName?: string | null;
}

export type SocketEventHandler = (data: any) => void;

export function getAudioRoomsWebSocketUrl(roomId: string, token: string): string {
  const envApiUrl = import.meta.env.VITE_API_URL;
  let wsOrigin = '';

  if (envApiUrl && envApiUrl.startsWith('http')) {
    try {
      const parsed = new URL(envApiUrl);
      const protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
      wsOrigin = `${protocol}//${parsed.host}`;
    } catch {
      wsOrigin = window.location.protocol === 'https:' ? 'wss://' + window.location.host : 'ws://' + window.location.host;
    }
  } else if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsOrigin = `${protocol}//${window.location.host}`;
  } else {
    wsOrigin = 'ws://localhost:3333';
  }

  return `${wsOrigin}/ws/audio-rooms?roomId=${encodeURIComponent(roomId)}&token=${encodeURIComponent(token)}`;
}

export class AudioRoomSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<SocketEventHandler>>();
  private reconnectTimeout: any = null;
  private pingInterval: any = null;
  private isIntentionallyClosed = false;
  private roomId: string;
  private token: string;

  constructor(roomId: string, token: string) {
    this.roomId = roomId;
    this.token = token;
  }

  connect() {
    this.isIntentionallyClosed = false;
    const url = getAudioRoomsWebSocketUrl(this.roomId, this.token);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.emit('connected', {});

        if (this.pingInterval) clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => {
          this.send('ping', {});
        }, 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type) {
            this.emit(msg.type, msg.payload);
          }
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onclose = () => {
        this.emit('disconnected', {});
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        if (!this.isIntentionallyClosed) {
          this.reconnectTimeout = setTimeout(() => {
            this.connect();
          }, 2000);
        }
      };

      this.ws.onerror = (err) => {
        this.emit('error', err);
      };
    } catch (err) {
      console.warn('WebSocket connection attempt failed:', err);
    }
  }

  send(type: string, payload: any = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(event: string, handler: SocketEventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: SocketEventHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, data: any) {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error(`Error in socket listener for ${event}:`, e);
      }
    });
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
  }
}

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { AudioRoomPanel } from '../components/audio-rooms/AudioRoomPanel';
import { cloudflareSfuClient } from '../lib/cloudflare-sfu-client';

export default function AudioRoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    data: room,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['audio-room', id],
    queryFn: () => cloudflareSfuClient.getRoom(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Joining conference room...</p>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 text-center p-4">
        <div className="p-3 rounded-full bg-red-500/10 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Room Not Found</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This audio room may have ended or the link is invalid.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/rooms', { replace: true })} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rooms</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="py-2 sm:py-4">
      <AudioRoomPanel
        roomId={room.id}
        roomTitle={room.title}
        roomDescription={room.description}
        hostId={room.hostId}
        onLeave={() => navigate('/rooms', { replace: true })}
      />
    </div>
  );
}

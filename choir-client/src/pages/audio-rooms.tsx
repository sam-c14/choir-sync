import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Radio, Plus, Users, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { UserAvatar } from '../components/ui/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { cloudflareSfuClient } from '../lib/cloudflare-sfu-client';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../auth/auth-context';
import { toast } from 'sonner';

export default function AudioRoomsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['audio-rooms'],
    queryFn: () => cloudflareSfuClient.listRooms(),
    refetchInterval: 5000,
  });

  // Real-time synchronization of room creation and participant joins/leaves
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel('audio-rooms-lobby')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audio_rooms' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audio-rooms'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audio_room_participants' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['audio-rooms'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createRoomMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      cloudflareSfuClient.createRoom(data),
    onSuccess: (newRoom) => {
      queryClient.invalidateQueries({ queryKey: ['audio-rooms'] });
      setIsCreateOpen(false);
      setTitle('');
      setDescription('');
      toast.success('Audio room created!');
      navigate(`/rooms/${newRoom.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create room');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createRoomMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Audio Conference Rooms
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time, low-latency sectional rehearsals and voice training powered by Cloudflare Realtime SFU.
          </p>
        </div>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <Plus className="w-4 h-4" />
              <span>Create Room</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Audio Conference Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="room-title">Room Title *</Label>
                <Input
                  id="room-title"
                  placeholder="e.g. Soprano Sectional Rehearsal"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room-desc">Description (optional)</Label>
                <Input
                  id="room-desc"
                  placeholder="e.g. Practicing Sunday setlist parts and transitions"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRoomMutation.isPending || !title.trim()}>
                  {createRoomMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create & Join
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center bg-card border rounded-2xl shadow-sm space-y-4">
          <div className="p-4 rounded-full bg-primary/10 text-primary">
            <Radio className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">No Active Rooms</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              There are no live rehearsal rooms right now. Create one to begin an interactive audio session with your section.
            </p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            <span>Start a Room</span>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room: any) => {
            const isHost = room.hostId === user?.id;
            const participantCount = room.participants?.length || 0;

            return (
              <div
                key={room.id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-foreground line-clamp-1">
                      {room.title}
                    </h3>
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>

                  {room.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {room.description}
                    </p>
                  )}

                  {/* Host info */}
                  <div className="flex items-center gap-2 pt-1">
                    <UserAvatar
                      name={room.host?.name}
                      email={room.host?.email}
                      src={room.host?.avatarUrl || null}
                      className="w-6 h-6"
                    />
                    <span className="text-xs text-muted-foreground">
                      Host: <strong className="text-foreground">{room.host?.name || 'Director'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{participantCount} in room</span>
                  </div>

                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/rooms/${room.id}`)}
                  >
                    <span>{isHost ? 'Resume' : 'Join'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Radio, Plus, Users, Loader2, Trash2 } from 'lucide-react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
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
  const [roomToDelete, setRoomToDelete] = useState<{ id: string; title: string } | null>(null);

  const canCreateRoom = user?.role === 'ADMIN' || user?.role === 'DIRECTOR';
  const canDeleteRoom = user?.role === 'ADMIN';

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
      toast.success('Your room is live!');
      navigate(`/rooms/${newRoom.id}`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Unable to start the room right now');
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => cloudflareSfuClient.deleteRoom(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-rooms'] });
      setRoomToDelete(null);
      toast.success('Room removed');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Unable to delete this room');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !canCreateRoom) return;
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
              Voice & Fellowship Rooms
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gather with the choir for live rehearsals, devotionals, prayer, and voice fellowship.
          </p>
        </div>

        {canCreateRoom && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-sm">
                <Plus className="w-4 h-4" />
                <span>Start a Room</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a New Room</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="room-title">Room Title *</Label>
                  <Input
                    id="room-title"
                    placeholder="e.g. Evening Prayer & Worship Prep"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="room-desc">What is this room for? (optional)</Label>
                  <Input
                    id="room-desc"
                    placeholder="e.g. Going over Sunday's songs and sharing a word"
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
                    Open & Join Room
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
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
            <h3 className="text-lg font-semibold text-foreground">No Live Rooms Right Now</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              {canCreateRoom
                ? 'There are no open rooms at the moment. Start one when you are ready to gather with the choir.'
                : 'No gatherings are live right now. A choir director or admin will open a room when it is time to meet.'}
            </p>
          </div>
          {canCreateRoom && (
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              <span>Start a Room</span>
            </Button>
          )}
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                      {canDeleteRoom && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRoomToDelete({ id: room.id, title: room.title })}
                          title="Delete room"
                          aria-label={`Delete ${room.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
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
                      Hosted by <strong className="text-foreground">{room.host?.name || 'Director'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {participantCount} {participantCount === 1 ? 'person' : 'people'} here
                    </span>
                  </div>

                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => navigate(`/rooms/${room.id}`)}
                  >
                    <span>{isHost ? 'Resume' : 'Join Room'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Delete Confirmation Dialog */}
      <AlertDialog
        open={Boolean(roomToDelete)}
        onOpenChange={(open) => {
          if (!open) setRoomToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">{roomToDelete?.title}</span>? Anyone
              currently inside will be removed and this room cannot be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteRoomMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteRoomMutation.isPending}
              onClick={() => {
                if (roomToDelete) {
                  deleteRoomMutation.mutate(roomToDelete.id);
                }
              }}
            >
              {deleteRoomMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

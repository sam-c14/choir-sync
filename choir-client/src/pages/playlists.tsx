import React, { useState } from 'react';
import { usePlaylists, useCreatePlaylist, useDeletePlaylist } from '../hooks/use-playlists';
import { useAuth } from '../auth/auth-context';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Loader2, Plus, ListMusic, Calendar, Trash2, Sparkles } from 'lucide-react';
import { AiCuratorDialog } from '../components/playlists/ai-curator-dialog';
import { format } from 'date-fns';
import { Skeleton } from '../components/ui/skeleton';

export default function PlaylistsPage() {
  const { data: playlists, isLoading } = usePlaylists();
  const { user } = useAuth();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState('');
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  const isDirector = user?.role === 'DIRECTOR';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { title, description };
      if (serviceDate) {
        payload.serviceDate = new Date(serviceDate);
      }
      const res = await createPlaylist.mutateAsync(payload);
      setIsCreateOpen(false);
      navigate(`/playlists/${res.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          {isDirector && <Skeleton className="h-10 w-32" />}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border rounded-xl p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24 mt-4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Playlists</h1>
        {isDirector && (
          <div className="flex gap-2">
            <AiCuratorDialog 
              trigger={
                <Button variant="secondary" className="min-h-9 pb-0.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30">
                  <Sparkles className="w-4 h-4 mr-2" /> AI Curator
                </Button>
              } 
            />
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="min-h-9 pb-0.5">
                  <Plus className="w-4 h-4 mr-2" /> New Playlist
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Playlist</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-8 pt-4">
                <div className="space-y-4">
                  <label className="text-sm font-medium inline-block mb-2">Title</label>
                  <Input 
                    required 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    placeholder="e.g. Sunday Service - Oct 12" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium inline-block mb-2">Description (Optional)</label>
                  <Input 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder="Theme or notes for the setlist" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium inline-block mb-2">Service Date</label>
                  <Input 
                    type="date"
                    required
                    value={serviceDate} 
                    onChange={e => setServiceDate(e.target.value)} 
                  />
                </div>
                <Button type="submit" disabled={createPlaylist.isPending} className="w-full min-h-10">
                  {createPlaylist.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      {!playlists?.length ? (
        <div className="text-center p-12 border rounded-xl bg-card border-dashed">
          <ListMusic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground">No playlists yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Create a playlist to organize songs for rehearsal or service.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {playlists.map((playlist: any) => (
            <Link 
              key={playlist.id} 
              to={`/playlists/${playlist.id}`}
              className="block group relative bg-card border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary transition-all"
            >
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {playlist.title}
              </h3>
              {playlist.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {format(new Date(playlist.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              
              {isDirector && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    setPlaylistToDelete(playlist.id);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </Link>
          ))}
        </div>
      )}

      <AlertDialog open={!!playlistToDelete} onOpenChange={(open) => !open && setPlaylistToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this playlist? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (playlistToDelete) {
                  deletePlaylist.mutate(playlistToDelete);
                  setPlaylistToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

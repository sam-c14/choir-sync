import React, { useState } from 'react';
import { usePlaylists, useCreatePlaylist, useDeletePlaylist } from '../hooks/use-playlists';
import { useDebounce } from '../hooks/use-debounce';
import { useAuth } from '../auth/auth-context';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Loader2, Plus, ListMusic, Calendar as CalendarIcon, Trash2, Sparkles, Search, X } from 'lucide-react';
import { AiCuratorDialog } from '../components/playlists/ai-curator-dialog';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

export default function PlaylistsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const limit = 12;

  const { data: playlistsResponse, isLoading, isFetching } = usePlaylists({
    page,
    limit,
    search: debouncedSearch.trim() || undefined,
  });
  const playlists = Array.isArray(playlistsResponse) ? playlistsResponse : playlistsResponse?.data ?? [];
  const total = Array.isArray(playlistsResponse) ? playlists.length : playlistsResponse?.total ?? 0;
  const totalPages = Array.isArray(playlistsResponse) ? 1 : playlistsResponse?.totalPages ?? 1;

  const { user } = useAuth();
  const createPlaylist = useCreatePlaylist();
  const deletePlaylist = useDeletePlaylist();
  const navigate = useNavigate();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceDate, setServiceDate] = useState<Date | undefined>(new Date());
  const [playlistToDelete, setPlaylistToDelete] = useState<string | null>(null);

  const canEditPlaylist = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'SECTION_LEADER';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = { title, description };
      if (serviceDate) {
        payload.serviceDate = serviceDate;
      }
      const res = await createPlaylist.mutateAsync(payload);
      setIsCreateOpen(false);
      navigate(`/playlists/${res.id}`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex sm:flex-row flex-col gap-y-5 sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Playlists</h1>
        {canEditPlaylist && (
          <div className="flex gap-2">
            <AiCuratorDialog 
              trigger={
                <Button variant="secondary" className="min-h-9 sm:w-auto w-full pb-0.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-500/30">
                  <Sparkles className="w-4 h-4 mr-2" /> AI Curator
                </Button>
              } 
            />
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild className="w-full">
                <Button className="min-h-9 pb-0.5 sm:w-auto w-full">
                  <Plus className="w-4 h-4 sm:mr-2" /> New Playlist
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
                <div className="space-y-2 flex flex-col">
                  <label className="text-sm font-medium inline-block mb-2">Service Date (Optional)</label>
                  <Popover>
                    <PopoverTrigger>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !serviceDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {serviceDate ? format(serviceDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={serviceDate}
                        onSelect={setServiceDate}
                        
                      />
                    </PopoverContent>
                  </Popover>
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search playlists by title..." 
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 pr-9 h-10 w-full bg-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'playlist' : 'playlists'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card border rounded-xl p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24 mt-4" />
            </div>
          ))}
        </div>
      ) : !playlists?.length ? (
        <div className="text-center p-12 border rounded-xl bg-card border-dashed">
          {debouncedSearch ? (
            <>
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">No playlists found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                No playlists matched &ldquo;{debouncedSearch}&rdquo;.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
              >
                Clear Search
              </Button>
            </>
          ) : (
            <>
              <ListMusic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground">No playlists yet</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Create a playlist to organize songs for rehearsal or service.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className={cn("grid gap-4 sm:grid-cols-2 md:grid-cols-3 transition-opacity", isFetching && "opacity-60")}>
          {playlists.map((playlist: any) => (
            <Link 
              key={playlist.id} 
              to={`/playlists/${playlist.id}`}
              className="block group relative bg-card border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary transition-all"
            >
              <div className="flex items-start justify-between gap-2 pr-8">
                <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                  {playlist.title}
                </h3>
              </div>
              {playlist.isActive && (
                <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                </Badge>
              )}
              {playlist.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center">
                  <CalendarIcon className="w-3.5 h-3.5 mr-1" />
                  {format(new Date(playlist.createdAt), 'MMM d, yyyy')}
                </span>
                {playlist._count?.songs !== undefined && (
                  <span className="flex items-center">
                    <ListMusic className="w-3.5 h-3.5 mr-1" />
                    {playlist._count.songs} {playlist._count.songs === 1 ? 'song' : 'songs'}
                  </span>
                )}
              </div>
              
              {canEditPlaylist && (
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
            {total > 0 && (
              <span className="hidden sm:inline"> ({total} total {total === 1 ? 'playlist' : 'playlists'})</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
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

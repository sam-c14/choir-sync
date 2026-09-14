import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSongSchema, UpdateSongSchema, SongComplexityEnum, SongStatusEnum, type CreateSongDto, type UpdateSongDto } from '@choir-workspace/shared-validation';
import { useCreateSong, useUpdateSong, useSearchExternalMusic } from '../../hooks/use-songs';
import { useDebounce } from '../../hooks/use-debounce';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Song {
  id: string;
  title: string;
  composer: string | null;
  complexity: string;
  status: string;
  tags: string[];
}

interface AddSongDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSong?: Song | null;
}

export function AddSongDialog({ open, onOpenChange, editingSong }: AddSongDialogProps) {
  const isEditing = !!editingSong;
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();

  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showSearch, setShowSearch] = useState(false);
  const { data: searchResults, isLoading: isSearchLoading } = useSearchExternalMusic(debouncedSearch);

  const defaultValues = React.useMemo(() => {
    return editingSong
      ? {
          title: editingSong.title,
          composer: editingSong.composer ?? undefined,
          complexity: editingSong.complexity as CreateSongDto['complexity'],
          status: editingSong.status as CreateSongDto['status'],
          tags: editingSong.tags,
          lyrics: (editingSong as any).lyrics ?? undefined,
          originalKey: (editingSong as any).originalKey ?? undefined,
          tempoBpm: (editingSong as any).tempoBpm ?? undefined,
        }
      : { complexity: 'MODERATE', status: 'ACTIVE_SUNDAY', tags: [], parts: [], links: [] } as any;
  }, [editingSong]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateSongDto | UpdateSongDto>({
    resolver: zodResolver(isEditing ? UpdateSongSchema : CreateSongSchema),
    defaultValues,
  });

  React.useEffect(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  const onSubmit = async (data: CreateSongDto | UpdateSongDto) => {
    if (isEditing) {
      await updateSong.mutateAsync({ id: editingSong.id, data: data as UpdateSongDto });
    } else {
      await createSong.mutateAsync(data as CreateSongDto);
    }
    reset();
    onOpenChange(false);
  };

  const handleSelectTrack = (track: any) => {
    setValue('title', track.title, { shouldValidate: true, shouldDirty: true });
    if (track.composer) setValue('composer', track.composer, { shouldValidate: true, shouldDirty: true });
    if (track.originalKey) setValue('originalKey', track.originalKey, { shouldValidate: true, shouldDirty: true });
    if (track.tempoBpm) setValue('tempoBpm', track.tempoBpm, { shouldValidate: true, shouldDirty: true });
    
    // Add spotify link
    if (track.spotifyUrl) {
      const currentLinks = watch('links') || [];
      if (!currentLinks.find((l: any) => l.platform === 'SPOTIFY')) {
        setValue('links', [...currentLinks, { platform: 'SPOTIFY', url: track.spotifyUrl }], { shouldDirty: true });
      }
    }
    
    setShowSearch(false);
    setSearchQuery('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] sm:max-h-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Song' : 'Add Song'}</DialogTitle>
        </DialogHeader>
        
        {!isEditing && (
          <div className="relative space-y-2 mb-4">
            <Label htmlFor="search">Search External Music (Spotify)</Label>
            <Input 
              id="search" 
              placeholder="Search by title or artist to auto-fill..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearch(true);
              }}
              onFocus={() => {
                if (searchQuery.length >= 2) setShowSearch(true);
              }}
            />
            {showSearch && searchQuery.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
                {isSearchLoading ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                ) : searchResults && searchResults.length > 0 ? (
                  searchResults.map((track: any) => (
                    <div 
                      key={track.spotifyId} 
                      className="p-3 text-sm hover:bg-muted cursor-pointer border-b last:border-0"
                      onClick={() => handleSelectTrack(track)}
                    >
                      <div className="font-medium">{track.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {track.composer} {track.originalKey && ` • ${track.originalKey}`} {track.tempoBpm && ` • ${track.tempoBpm} BPM`}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-sm text-muted-foreground text-center">No results found</div>
                )}
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-3">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="Song title" {...register('title')} aria-invalid={!!errors.title} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message as string}</p>}
          </div>
          <div className="space-y-3">
            <Label htmlFor="composer">Composer</Label>
            <Input id="composer" placeholder="e.g. Handel" {...register('composer')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Label htmlFor="originalKey">Original Key</Label>
              <Input id="originalKey" placeholder="e.g. C Major, Gm, Eb..." {...register('originalKey')} />
            </div>
            <div className="space-y-3">
              <Label htmlFor="tempoBpm">Tempo (BPM)</Label>
              <Input id="tempoBpm" type="number" placeholder="e.g. 120" {...register('tempoBpm', { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-3">
            <Label htmlFor="lyrics">Lyrics</Label>
            <textarea
              id="lyrics"
              className="flex min-h-32 max-h-40 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              placeholder="Song lyrics..."
              {...register('lyrics')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Label>Complexity</Label>
              <Select
                value={watch('complexity')}
                onValueChange={(v) => setValue('complexity', v as CreateSongDto['complexity'], { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SongComplexityEnum.options.map((o: string) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <Label>Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as CreateSongDto['status'], { shouldDirty: true })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SongStatusEnum.options.map((o: string) => (
                    <SelectItem key={o} value={o}>{o.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add song'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

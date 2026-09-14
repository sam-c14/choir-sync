import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateSongSchema, UpdateSongSchema, SongComplexityEnum, SongStatusEnum, type CreateSongDto, type UpdateSongDto } from '@choir-workspace/shared-validation';
import { useCreateSong, useUpdateSong, useSearchExternalMusic, useSong } from '../hooks/use-songs';
import { useDebounce } from '../hooks/use-debounce';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function SongFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  const navigate = useNavigate();

  const { data: song, isLoading: isSongLoading, isError: isSongError } = useSong(id || '');
  const createSong = useCreateSong();
  const updateSong = useUpdateSong();

  const [searchSource, setSearchSource] = useState<'spotify' | 'youtube'>('spotify');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [showSearch, setShowSearch] = useState(false);
  const { data: searchResults, isLoading: isSearchLoading } = useSearchExternalMusic(debouncedSearch, searchSource);

  const defaultValues = useMemo(() => {
    if (isEditing && song) {
      return {
        title: song.title,
        composer: song.composer ?? undefined,
        complexity: song.complexity as CreateSongDto['complexity'],
        status: song.status as CreateSongDto['status'],
        tags: song.tags,
        lyrics: song.lyrics ?? undefined,
        originalKey: song.originalKey ?? undefined,
        tempoBpm: song.tempoBpm ?? undefined,
      };
    }
    return { complexity: 'MODERATE', status: 'ACTIVE_SUNDAY', tags: [], parts: [], links: [] } as any;
  }, [isEditing, song]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateSongDto>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(isEditing ? UpdateSongSchema : CreateSongSchema) as any,
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [reset, defaultValues]);

  const onSubmit = async (data: CreateSongDto | UpdateSongDto) => {
    try {
      if (isEditing && id) {
        await updateSong.mutateAsync({ id, data: data as UpdateSongDto });
        toast.success('Changes saved.');
        navigate(`/songs/${id}`);
      } else {
        const result = await createSong.mutateAsync(data as CreateSongDto);
        toast.success('Song added!');
        navigate(`/songs/${result.id}`);
      }
    } catch (err: any) {
      setError('root', { message: err.message || 'Failed to save song.' });
    }
  };

  const handleSelectTrack = (track: any) => {
    setValue('title', track.title, { shouldValidate: true, shouldDirty: true });
    if (track.composer) setValue('composer', track.composer, { shouldValidate: true, shouldDirty: true });
    if (track.originalKey) setValue('originalKey', track.originalKey, { shouldValidate: true, shouldDirty: true });
    if (track.tempoBpm) setValue('tempoBpm', track.tempoBpm, { shouldValidate: true, shouldDirty: true });
    
    const currentLinks = watch('links') || [];
    if (track.spotifyUrl) {
      if (!currentLinks.find((l: any) => l.platform === 'SPOTIFY' && l.url === track.spotifyUrl)) {
        setValue('links', [...currentLinks, { platform: 'SPOTIFY', url: track.spotifyUrl }], { shouldDirty: true });
      }
    } else if (track.youtubeUrl) {
      if (!currentLinks.find((l: any) => l.platform === 'YOUTUBE' && l.url === track.youtubeUrl)) {
        setValue('links', [...currentLinks, { platform: 'YOUTUBE', url: track.youtubeUrl }], { shouldDirty: true });
      }
    }
    
    setShowSearch(false);
    setSearchQuery('');
  };

  if (isEditing && isSongLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground" disabled>
          <ArrowLeft className="w-4 h-4" /> Back to Library
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Edit Song</h1>
        <div className="space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEditing && (isSongError || !song)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Song not found</h1>
          <p className="text-muted-foreground mb-6">The song you are trying to edit does not exist or has been removed.</p>
          <Button onClick={() => navigate('/')}>Back to Library</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <Button variant="ghost" onClick={() => navigate('/')} className="gap-2 -ml-2 text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Library
      </Button>
      
      <h1 className="text-3xl font-bold tracking-tight">{isEditing ? 'Edit Song' : 'Add Song'}</h1>

      {errors.root && (
        <div className="p-4 bg-destructive/15 text-destructive rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{errors.root.message}</p>
        </div>
      )}

      <div className="bg-card border rounded-xl p-6">
        {!isEditing && (
          <div className="relative space-y-4 mb-6 pb-6 border-b">
            <div className="flex items-center justify-between">
              <Label htmlFor="search">Search External Music</Label>
              <Select value={searchSource} onValueChange={(v) => setSearchSource(v as 'spotify' | 'youtube')}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue className="capitalize" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spotify">Spotify</SelectItem>
                  <SelectItem value="youtube">YouTube</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input 
              id="search" 
              placeholder={`Search by title or artist on ${searchSource === 'spotify' ? 'Spotify' : 'YouTube'}...`}
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
                      key={track.spotifyId || track.youtubeUrl} 
                      className="p-3 text-sm hover:bg-muted cursor-pointer border-b last:border-0 flex gap-3"
                      onClick={() => handleSelectTrack(track)}
                    >
                      {track.thumbnailUrl && (
                        <img src={track.thumbnailUrl} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">{track.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {track.composer} {track.originalKey && ` • ${track.originalKey}`} {track.tempoBpm && ` • ${track.tempoBpm} BPM`}
                        </div>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" placeholder="Song title" {...register('title')} aria-invalid={!!errors.title} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message as string}</p>}
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="composer">Composer</Label>
            <Input id="composer" placeholder="e.g. Handel" {...register('composer')} />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="flex min-h-32 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
              placeholder="Song lyrics..."
              {...register('lyrics')}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate('/')}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : isEditing ? 'Save changes' : 'Add song'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

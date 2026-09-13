import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CreateSongSchema,
  UpdateSongSchema,
  SongComplexityEnum,
  SongStatusEnum,
  type CreateSongDto,
  type UpdateSongDto,
} from '@choir-workspace/shared-validation';
import { useCreateSong, useUpdateSong } from '../../hooks/use-songs';
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

  const defaultValues = React.useMemo(() => {
    return editingSong
      ? {
          title: editingSong.title,
          composer: editingSong.composer ?? undefined,
          complexity: editingSong.complexity as CreateSongDto['complexity'],
          status: editingSong.status as CreateSongDto['status'],
          tags: editingSong.tags,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Song' : 'Add Song'}</DialogTitle>
        </DialogHeader>
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

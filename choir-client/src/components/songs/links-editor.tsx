import React from 'react';
import { useAddSongLink, useDeleteSongLink } from '../../hooks/use-songs';
import { useAuth } from '../../auth/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSongLinkSchema, LinkPlatformEnum, type CreateSongLinkDto } from '@choir-workspace/shared-validation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Music, PlayCircle, Trash2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  SPOTIFY: <Music className="w-4 h-4 text-green-500" />,
  YOUTUBE: <PlayCircle className="w-4 h-4 text-red-500" />,
  AUDIOMACK: <Music className="w-4 h-4 text-orange-500" />,
  OTHER: <LinkIcon className="w-4 h-4 text-slate-500" />,
};

interface SongLink {
  id: string;
  platform: string;
  url: string;
}

interface LinksEditorProps {
  songId: string;
  links: SongLink[];
}

export function LinksEditor({ songId, links }: LinksEditorProps) {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';
  const addLink = useAddSongLink();
  const deleteLink = useDeleteSongLink();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSongLinkDto>({
    resolver: zodResolver(CreateSongLinkSchema),
    defaultValues: { platform: 'YOUTUBE', url: '' },
  });

  const onSubmit = async (data: CreateSongLinkDto) => {
    try {
      await addLink.mutateAsync({ songId, data });
      toast.success('Link added successfully.');
      reset();
    } catch (_err) {
      toast.error('Failed to add link.');
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Reference Links</h3>
      {links.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No links added yet.</p>
      )}
      <div className="space-y-2">
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-2 text-sm">
            {PLATFORM_ICONS[link.platform] ?? PLATFORM_ICONS['OTHER']}
            <Badge variant="secondary" className="shrink-0">{link.platform}</Badge>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[220px]"
            >
              {link.url}
            </a>
            {isDirector && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto shrink-0 text-slate-400 hover:text-destructive"
                onClick={async () => {
                  try {
                    await deleteLink.mutateAsync({ songId, linkId: link.id });
                    toast.success('Link deleted.');
                  } catch {
                    toast.error('Failed to delete link.');
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {isDirector && (
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-end gap-2 pt-1">
          <div className="space-y-1">
            <Label className="text-xs">Platform</Label>
            <Select
              defaultValue="YOUTUBE"
              onValueChange={(v) => setValue('platform', v as CreateSongLinkDto['platform'])}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LinkPlatformEnum.options.map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs">URL</Label>
            <Input
              placeholder="https://…"
              aria-invalid={!!errors.url}
              {...register('url')}
            />
            {errors.url && <p className="text-xs text-red-600">{errors.url.message}</p>}
          </div>
          <Button type="submit" size="sm" disabled={isSubmitting}>Add</Button>
        </form>
      )}
    </div>
  );
}

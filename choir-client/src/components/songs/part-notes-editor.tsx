import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateSongPartSchema, VoicePartTypeEnum, type UpdateSongPartDto } from '@choir-workspace/shared-validation';
import { useUpdatePart } from '../../hooks/use-songs';
import { useAuth } from '../../auth/auth-context';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { toast } from 'sonner';

interface SongPart {
  voicePart: string;
  notes?: string | null;
}

interface PartNotesEditorProps {
  songId: string;
  parts: SongPart[];
}

export function PartNotesEditor({ songId, parts }: PartNotesEditorProps) {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR';

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Voice Parts</h3>
      {VoicePartTypeEnum.options.map((part: string) => {
        const existing = parts.find((p) => p.voicePart === part);
        const canEdit = isDirector || (user?.role === 'SECTION_LEADER' && user?.leadsVoicePart === part);
        return (
          <PartRow
            key={part}
            songId={songId}
            part={part}
            notes={existing?.notes ?? ''}
            canEdit={canEdit}
          />
        );
      })}
    </div>
  );
}

const PART_COLORS: Record<string, string> = {
  SOPRANO: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  ALTO: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800',
  TENOR: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800',
};

function PartRow({
  songId,
  part,
  notes,
  canEdit,
}: {
  songId: string;
  part: string;
  notes: string;
  canEdit: boolean;
}) {
  const updatePart = useUpdatePart();
  const {
    register,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm<UpdateSongPartDto>({
    resolver: zodResolver(UpdateSongPartSchema),
    defaultValues: { notes },
  });

  const onSubmit = async (data: UpdateSongPartDto) => {
    try {
      await updatePart.mutateAsync({ songId, part, data });
      toast.success(`${part} notes updated successfully.`);
    } catch (_err) {
      toast.error(`Failed to update notes for ${part}.`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className={`w-20 justify-center ${PART_COLORS[part] || ''}`}>{part}</Badge>
        {!canEdit && <span className="text-xs text-muted-foreground">Read only</span>}
      </div>
      {canEdit ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Textarea
            rows={2}
            placeholder={`Notes for ${part} section…`}
            className="resize-none text-sm"
            {...register('notes')}
          />
          {isDirty && (
            <Button type="submit" size="sm" variant="secondary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          )}
        </form>
      ) : (
        <p className="text-sm text-foreground bg-slate-100 dark:bg-slate-800 rounded p-2 min-h-[2.5rem]">
          {notes || <span className="text-muted-foreground italic">No notes yet</span>}
        </p>
      )}
    </div>
  );
}

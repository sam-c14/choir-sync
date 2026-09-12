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
      {VoicePartTypeEnum.options.map((part) => {
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
    await updatePart.mutateAsync({ songId, part, data });
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="w-20 justify-center">{part}</Badge>
        {!canEdit && <span className="text-xs text-slate-400">Read only</span>}
      </div>
      {canEdit ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-1">
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
        <p className="text-sm text-slate-600 bg-slate-50 rounded p-2 min-h-[2.5rem]">
          {notes || <span className="text-slate-400 italic">No notes yet</span>}
        </p>
      )}
    </div>
  );
}

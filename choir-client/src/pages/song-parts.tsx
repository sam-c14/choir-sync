import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSong } from '../hooks/use-songs';
import { PartNotesEditor } from '../components/songs/part-notes-editor';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function SongPartsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: song, isLoading, error } = useSong(id!);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-4 bg-destructive/10 text-destructive rounded-md">
          Failed to load song.
        </div>
        <Button variant="link" onClick={() => navigate('/')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Songs
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{song.title}</h1>
          <p className="text-muted-foreground text-sm">Voice Parts Management</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Rehearsal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <PartNotesEditor songId={song.id} parts={song.parts ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

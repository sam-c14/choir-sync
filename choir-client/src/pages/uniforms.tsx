import React, { useState } from 'react';
import { useUniforms, useDeleteUniform } from '../hooks/use-uniforms';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { UniformDialog } from '../components/uniforms/uniform-dialog';
import { format } from 'date-fns';
import { Pencil, Trash } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

export default function UniformsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'current' | 'past'>('current');
  const { data: uniforms, isLoading } = useUniforms(filter);
  const deleteMutation = useDeleteUniform();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUniform, setEditingUniform] = useState<any>(null);

  const isDirector = user?.role === 'DIRECTOR';

  const handleAdd = () => {
    setEditingUniform(null);
    setDialogOpen(true);
  };

  const handleEdit = (u: any) => {
    setEditingUniform(u);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this schedule?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Uniform Schedule</h2>
          <p className="text-muted-foreground">See what to wear for upcoming services.</p>
        </div>
        {isDirector && (
          <Button onClick={handleAdd}>Schedule Uniform</Button>
        )}
      </div>

      <div className="flex gap-4 border-b pb-2">
        <Button
          variant={filter === 'current' ? 'default' : 'ghost'}
          onClick={() => setFilter('current')}
        >
          Upcoming & Current
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'ghost'}
          onClick={() => setFilter('past')}
        >
          Past Entries
        </Button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : uniforms?.length === 0 ? (
        <p className="text-muted-foreground">No uniform schedules found.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {uniforms?.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle>{format(new Date(u.serviceDate), 'EEEE, MMMM do, yyyy')}</CardTitle>
                </div>
                {isDirector && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}>
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Female Outfit</h4>
                  <p>{u.femaleOutfit}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Male Outfit</h4>
                  <p>{u.maleOutfit}</p>
                </div>
                {u.notes && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Notes</h4>
                    <p className="text-sm italic">{u.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <UniformDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingUniform={editingUniform}
      />
    </div>
  );
}

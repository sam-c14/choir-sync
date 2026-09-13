import React, { useState } from 'react';
import { useUniforms } from '../hooks/use-uniforms';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { UniformDialog } from '../components/uniforms/uniform-dialog';
import { DeleteUniformDialog } from '../components/uniforms/delete-uniform-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { format } from 'date-fns';
import { Pencil, Trash } from 'lucide-react';

export default function UniformsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'current' | 'past'>('current');
  const [page, setPage] = useState(1);
  const { data: uniformsData, isLoading } = useUniforms(filter, page, 20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUniform, setEditingUniform] = useState<any>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUniformId, setDeletingUniformId] = useState<string | null>(null);

  const isDirector = user?.role === 'DIRECTOR';

  const handleAdd = () => {
    setEditingUniform(null);
    setDialogOpen(true);
  };

  const handleEdit = (u: any) => {
    setEditingUniform(u);
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingUniformId(id);
    setDeleteDialogOpen(true);
  };

  const uniforms = uniformsData?.data || [];
  const totalPages = uniformsData?.totalPages || 1;

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Uniform Schedule</h2>
          <p className="text-muted-foreground mt-1">See what to wear for upcoming services.</p>
        </div>
        {isDirector && (
          <Button onClick={handleAdd} className="w-full sm:w-auto">Schedule Uniform</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        <Button
          variant={filter === 'current' ? 'default' : 'ghost'}
          onClick={() => { setFilter('current'); setPage(1); }}
        >
          Upcoming & Current
        </Button>
        <Button
          variant={filter === 'past' ? 'default' : 'ghost'}
          onClick={() => { setFilter('past'); setPage(1); }}
        >
          Past Entries
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : uniforms.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center sm:text-left">No uniform schedules found.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {uniforms.map((u) => (
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
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(u.id)}>
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
          
          {filter === 'past' && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <UniformDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingUniform={editingUniform}
      />
      <DeleteUniformDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        uniformId={deletingUniformId}
      />
    </div>
  );
}

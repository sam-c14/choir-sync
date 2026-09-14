import React, { useState } from 'react';
import { useUniforms } from '../hooks/use-uniforms';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { UniformDialog } from '../components/uniforms/uniform-dialog';
import { DeleteUniformDialog } from '../components/uniforms/delete-uniform-dialog';
import { Skeleton } from '../components/ui/skeleton';
import { Label } from '../components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { CalendarIcon, Pencil, Trash, Shirt, SearchX } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function UniformsPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'current' | 'past'>('current');
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  
  const { data: uniformsData, isLoading } = useUniforms({
    filter,
    page,
    limit: 20,
    from: fromDate?.toISOString(),
    to: toDate?.toISOString(),
  });

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
    <div className="sm:max-w-5xl max-w-screen mx-auto space-y-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Uniform Schedule</h2>
          <p className="text-muted-foreground mt-1">See what to wear for upcoming services.</p>
        </div>
        {isDirector && (
          <Button onClick={handleAdd} className="w-full sm:w-auto">Schedule Uniform</Button>
        )}
      </div>

      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b pb-4">
        <div className="flex flex-wrap gap-2">
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

        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Label className="text-sm font-medium whitespace-nowrap sm:min-w-auto min-w-10">From:</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-48 sm:w-48 justify-start text-left font-normal h-9",
                      !fromDate && "text-muted-foreground"
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {fromDate ? format(fromDate, "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => {
                    setFromDate(d);
                    if (d && !toDate) setToDate(new Date());
                    setPage(1);
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Label className="text-sm font-medium whitespace-nowrap sm:min-w-auto min-w-10">To:</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-48 sm:w-48 justify-start text-left font-normal h-9",
                      !toDate && "text-muted-foreground"
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                {toDate ? format(toDate, "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => {
                    setToDate(d);
                    if (d && !fromDate) setFromDate(new Date());
                    setPage(1);
                  }}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {(fromDate || toDate) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setFromDate(undefined); setToDate(undefined); setPage(1); }}
              className="text-muted-foreground hover:text-foreground shrink-0 w-10 font-semibold py-2 px-4!"
            >
              Clear
            </Button>
          )}
        </div>
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
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
          {(!fromDate && !toDate) ? (
            <>
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Shirt className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No uniforms scheduled</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                There are currently no uniform entries in the {filter === 'current' ? 'upcoming' : 'past'} section.
                {isDirector && filter === 'current' && ' Click "Schedule Uniform" above to create one.'}
              </p>
            </>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <SearchX className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">No results found</h3>
              <p className="text-sm text-slate-500 max-w-sm">
                We couldn't find any uniform schedules for the selected date range. Try adjusting your filters.
              </p>
            </>
          )}
        </div>
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

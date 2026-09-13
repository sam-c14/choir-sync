import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateUniformSchema, type CreateUniformDto } from '@choir-workspace/shared-validation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { useCreateUniform, useUpdateUniform } from '../../hooks/use-uniforms';

export function UniformDialog({
  open,
  onOpenChange,
  editingUniform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUniform?: { id: string; serviceDate: string; femaleOutfit: string; maleOutfit: string; notes: string | null } | null;
}) {
  const createMutation = useCreateUniform();
  const updateMutation = useUpdateUniform();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUniformDto>({
    resolver: zodResolver(CreateUniformSchema) as any,
    defaultValues: {
      serviceDate: undefined as any,
      femaleOutfit: '',
      maleOutfit: '',
      notes: '',
    },
  });

  const serviceDate = watch('serviceDate');

  useEffect(() => {
    if (editingUniform && open) {
      reset({
        serviceDate: new Date(editingUniform.serviceDate),
        femaleOutfit: editingUniform.femaleOutfit,
        maleOutfit: editingUniform.maleOutfit,
        notes: editingUniform.notes || '',
      });
    } else if (open) {
      reset({
        serviceDate: undefined as any,
        femaleOutfit: '',
        maleOutfit: '',
        notes: '',
      });
    }
  }, [editingUniform, open, reset]);

  const onSubmit = async (data: CreateUniformDto) => {
    try {
      if (editingUniform) {
        await updateMutation.mutateAsync({ id: editingUniform.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingUniform ? 'Edit Uniform' : 'Add Uniform'}</DialogTitle>
          <DialogDescription>
            Specify what the choir should wear for the upcoming service.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 flex flex-col">
            <Label>Service Date</Label>
            <Popover>
              <PopoverTrigger
                render={
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !serviceDate && "text-muted-foreground"
                    )}
                  />
                }
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {serviceDate ? format(serviceDate, "PPP") : <span>Pick a date</span>}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={serviceDate}
                  onSelect={(date) => date && setValue('serviceDate', date)}
                  autoFocus
                />
              </PopoverContent>
            </Popover>
            {errors.serviceDate && (
              <p className="text-sm text-destructive">{errors.serviceDate.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="femaleOutfit">Female Outfit</Label>
            <Input id="femaleOutfit" {...register('femaleOutfit')} />
            {errors.femaleOutfit && <p className="text-sm text-destructive">{errors.femaleOutfit.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="maleOutfit">Male Outfit</Label>
            <Input id="maleOutfit" {...register('maleOutfit')} />
            {errors.maleOutfit && <p className="text-sm text-destructive">{errors.maleOutfit.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea id="notes" {...register('notes')} />
            {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

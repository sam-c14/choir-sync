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
import { ImagePlus, X, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { apiClient } from '../../lib/api-client';
import { toast } from 'sonner';

export function UniformDialog({
  open,
  onOpenChange,
  editingUniform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingUniform?: { id: string; serviceDate: string; femaleOutfit: string; maleOutfit: string; notes: string | null; imageUrls?: string[] } | null;
}) {
  const createMutation = useCreateUniform();
  const updateMutation = useUpdateUniform();

  const [keptUrls, setKeptUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
        imageUrls: editingUniform.imageUrls || [],
      });
      setKeptUrls(editingUniform.imageUrls || []);
      setNewFiles([]);
    } else if (open) {
      reset({
        serviceDate: undefined as any,
        femaleOutfit: '',
        maleOutfit: '',
        notes: '',
        imageUrls: [],
      });
      setKeptUrls([]);
      setNewFiles([]);
    }
  }, [editingUniform, open, reset]);

  const onSubmit = async (data: CreateUniformDto) => {
    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      
      // Upload new files to Supabase
      for (const file of newFiles) {
        // Get signed URL
        const { data: urlData } = await apiClient.post('/uniforms/upload-url', {
          filename: file.name
        });
        
        // PUT directly to Supabase storage
        await fetch(urlData.signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          }
        });
        
        uploadedUrls.push(urlData.publicUrl);
      }
      
      const finalImageUrls = [...keptUrls, ...uploadedUrls];
      const payload = { ...data, imageUrls: finalImageUrls };

      if (editingUniform) {
        await updateMutation.mutateAsync({ id: editingUniform.id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error('Failed to save uniform details');
    } finally {
      setIsUploading(false);
    }
  };
  
  const totalImages = keptUrls.length + newFiles.length;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArr = Array.from(e.target.files);
      if (totalImages + filesArr.length > 4) {
        toast.error('Maximum 4 inspiration images allowed.');
        return;
      }
      setNewFiles(prev => [...prev, ...filesArr]);
    }
  };

  const removeKeptUrl = (url: string) => {
    setKeptUrls(prev => prev.filter(u => u !== url));
  };
  
  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
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
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label>Inspiration Images (Max 4)</Label>
              <span className="text-xs text-muted-foreground">{totalImages}/4</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {keptUrls.map((url, i) => (
                <div key={url} className="relative w-16 h-16 rounded-md overflow-hidden border">
                  <img src={url} alt="Inspo" className="object-cover w-full h-full" />
                  <button type="button" onClick={() => removeKeptUrl(url)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {newFiles.map((file, i) => (
                <div key={file.name + i} className="relative w-16 h-16 rounded-md overflow-hidden border">
                  <img src={URL.createObjectURL(file)} alt="New Inspo" className="object-cover w-full h-full" />
                  <button type="button" onClick={() => removeNewFile(i)} className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-destructive">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {totalImages < 4 && (
                <Label htmlFor="imageUpload" className="w-16 h-16 rounded-md border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors">
                  <ImagePlus className="w-5 h-5 text-muted-foreground" />
                  <Input 
                    id="imageUpload" 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                </Label>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isUploading}>
              {(isSubmitting || isUploading) ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

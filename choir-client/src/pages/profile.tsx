import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { UpdateProfileSchema, UpdateProfileDto } from '@choir-workspace/shared-validation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../auth/auth-context';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

const MUSICAL_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const queryClient = useQueryClient();
  
  const form = useForm<UpdateProfileDto>({
    resolver: zodResolver(UpdateProfileSchema),
    defaultValues: {
      name: user?.name || '',
      comfortableKey: user?.comfortableKey || '',
      participationType: (user as any)?.participationType || 'VOCALIST',
    },
  });

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const res = await apiClient.get('/users/me');
      return res.data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || '',
        comfortableKey: profile.comfortableKey || '',
        participationType: profile.participationType || 'VOCALIST',
      });
      // Ensure context is synced with latest fetched DB state just in case JWT is old
      if (profile.name !== user?.name || profile.comfortableKey !== user?.comfortableKey || profile.participationType !== (user as any)?.participationType) {
        updateLocalUser({ name: profile.name, comfortableKey: profile.comfortableKey, participationType: profile.participationType });
      }
    }
  }, [profile, form, user, updateLocalUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileDto) => {
      const res = await apiClient.patch('/users/me', data);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('Profile updated successfully');
      updateLocalUser({ name: data.name, comfortableKey: data.comfortableKey });
      
      // Explicitly refetch the profile and any user lists
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['playlist-roster'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to update profile');
    },
  });

  const onSubmit = (data: UpdateProfileDto) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <div className="container mx-auto p-4 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Card className="shadow-lg border-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Your Profile</CardTitle>
          <CardDescription>
            Customize how you appear to your directors and team members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-3">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name"
                placeholder="E.g. Jane Doe" 
                {...form.register('name')} 
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="comfortableKey">Comfortable Key</Label>
              <Controller
                control={form.control}
                name="comfortableKey"
                render={({ field }) => (
                  <Select onValueChange={(val) => field.onChange(val === 'none' ? null : val)} value={field.value || 'none'}>
                    <SelectTrigger id="comfortableKey" className="w-full">
                      <SelectValue placeholder="Select a key (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Clear</SelectItem>
                      {MUSICAL_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.comfortableKey && (
                <p className="text-sm text-destructive">{form.formState.errors.comfortableKey.message}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="participationType">Choir Role</Label>
              <Controller
                control={form.control}
                name="participationType"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'VOCALIST'}>
                    <SelectTrigger id="participationType" className="w-full">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VOCALIST">Vocalist</SelectItem>
                      <SelectItem value="MUSICIAN">Musician</SelectItem>
                      <SelectItem value="BOTH">Vocalist & Musician</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {form.formState.errors.participationType && (
                <p className="text-sm text-destructive">{form.formState.errors.participationType.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full py-4" 
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

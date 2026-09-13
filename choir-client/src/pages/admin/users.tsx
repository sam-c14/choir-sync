import React, { useState } from 'react';
import { useUsers, useUpdateUserRole, useDeleteUser, User } from '../../hooks/use-users';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../components/ui/alert-dialog';
import { Trash } from 'lucide-react';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: usersData, isLoading } = useUsers(page, limit);
  const updateRoleMutation = useUpdateUserRole();
  const deleteMutation = useDeleteUser();

  const handleRoleChange = (userId: string, newRole: string) => {
    updateRoleMutation.mutate({ id: userId, data: { role: newRole as any } });
  };

  const handleVoicePartChange = (userId: string, newPart: string) => {
    updateRoleMutation.mutate({ id: userId, data: { role: 'SECTION_LEADER', leadsVoicePart: newPart as any } });
  };

  const handleDelete = (userId: string) => {
    deleteMutation.mutate(userId);
  };

  if (currentUser?.role !== 'DIRECTOR') {
    return (
      <div className="max-w-5xl mx-auto space-y-6 px-4 py-6">
        <h2 className="text-2xl font-bold text-destructive">Access Denied</h2>
        <p>You must be a Director to view this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4 py-6 sm:px-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Manage Users</h2>
        <p className="text-muted-foreground mt-1">View, promote, and manage choir members.</p>
      </div>

      {isLoading ? (
        <p>Loading users...</p>
      ) : (
        <div className="grid gap-4">
          {usersData?.data.map((u) => (
            <Card key={u.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
              <div className="space-y-1 w-full sm:w-auto">
                <p className="font-medium text-lg leading-none truncate max-w-[250px] sm:max-w-xs">{u.email}</p>
                <div className="flex gap-2 text-sm text-muted-foreground items-center mt-1">
                  <span>{new Date(u.createdAt).toLocaleDateString()}</span>
                  <span>&bull;</span>
                  <Badge variant="outline">{u.provider}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                <Select value={u.role} onValueChange={(v) => handleRoleChange(u.id, v)}>
                  <SelectTrigger className="w-[140px] sm:w-[160px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CHORISTER">Chorister</SelectItem>
                    <SelectItem value="SECTION_LEADER">Section Leader</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                  </SelectContent>
                </Select>

                {u.role === 'SECTION_LEADER' && (
                  <Select value={u.leadsVoicePart || undefined} onValueChange={(v) => handleVoicePartChange(u.id, v)}>
                    <SelectTrigger className="w-[110px] sm:w-[120px]">
                      <SelectValue placeholder="Part" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SOPRANO">Soprano</SelectItem>
                      <SelectItem value="ALTO">Alto</SelectItem>
                      <SelectItem value="TENOR">Tenor</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                {u.role !== 'DIRECTOR' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="ml-auto sm:ml-2">
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the account for <strong className="break-all">{u.email}</strong>.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => handleDelete(u.id)}
                        >
                          Delete User
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </Card>
          ))}
          
          {usersData && usersData.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing page {usersData.page} of {usersData.totalPages}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={usersData.page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(usersData.totalPages, p + 1))}
                  disabled={usersData.page === usersData.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../auth/auth-context';
import { useRoster, useSaveRoster, useDispatchRoster } from '../../hooks/use-rosters';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Users, Send, Loader2, Save, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { cn } from '../../lib/utils';

import { RosterAssignmentDialog } from './RosterAssignmentDialog';

interface UserNode {
  id: string;
  email: string;
  name?: string | null;
  comfortableKey?: string | null;
  avatarUrl?: string | null;
}

export function RosterPanel({ playlistId, serviceDate }: { playlistId: string, serviceDate?: string | Date | null }) {
  const { user } = useAuth();
  const canEditPlaylist = user?.role === 'DIRECTOR' || user?.role === 'ADMIN' || user?.role === 'SECTION_LEADER';
  
  const { data: roster, isLoading: loadingRoster } = useRoster(playlistId);
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 1, 100, true],
    queryFn: async () => {
      const res = await apiClient.get(`/users?page=1&limit=100&assignable=true`);
      return res.data;
    },
    enabled: canEditPlaylist,
  });
  const users = usersData?.data || [];
  
  const saveRoster = useSaveRoster();
  const dispatchRoster = useDispatchRoster();

  // Local state for assignments
  const [assignments, setAssignments] = useState<{userId: string, role: string, notes?: string, notified: boolean, user?: any}[]>([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [activeRoleDialog, setActiveRoleDialog] = useState<string | null>(null);

  useEffect(() => {
    if (roster?.members) {
      setAssignments(roster.members.map((m: { userId: string; assignedRole: string; notes?: string; notified: boolean; user?: any }) => ({
        userId: m.userId,
        role: m.assignedRole,
        notes: m.notes || undefined,
        notified: m.notified,
        user: m.user
      })));
    }
  }, [roster]);

  if (loadingRoster || (canEditPlaylist && loadingUsers)) {
    return (
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="bg-muted/30 border-b px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded-full animate-pulse" />
            <div className="w-32 h-5 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="p-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <div className="w-20 h-5 bg-muted rounded animate-pulse" />
              <div className="w-full h-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleToggleMember = (userId: string, role: string) => {
    setAssignments(prev => {
      const existingInThisRole = prev.findIndex(a => a.userId === userId && a.role === role);
      if (existingInThisRole >= 0) {
        return prev.filter((_, i) => i !== existingInThisRole);
      } else {
        const filtered = prev.filter(a => a.userId !== userId);
        return [...filtered, { userId, role, notified: false }];
      }
    });
  };

  const handleSave = async () => {
    try {
      await saveRoster.mutateAsync({
        playlistId,
        data: {
          members: assignments.map(a => ({
            userId: a.userId,
            assignedRole: a.role as "SOPRANO" | "ALTO" | "TENOR" | "LEAD",
            notes: a.notes
          }))
        }
      });
      toast.success('Roster saved as draft');
    } catch (error) {
      toast.error('Failed to save roster');
    }
  };

  const handleDispatch = async () => {
    try {
      const res = await dispatchRoster.mutateAsync(playlistId);
      const emailCount = res.emailsSentCount !== undefined ? res.emailsSentCount : 0;
      const totalCount = res.notifiedCount !== undefined ? res.notifiedCount : (res.count || 0);
      
      if (totalCount === 0) {
        toast.info('All members have already been notified.');
      } else {
        toast.success(`Notified ${totalCount} choristers (${emailCount} emails sent!)`);
      }
      setDispatchOpen(false);
    } catch (error) {
      toast.error('Failed to notify team');
    }
  };

  const hasChanges = () => {
    if (!roster?.members) return assignments.length > 0;
    if (roster.members.length !== assignments.length) return true;
    
    // Sort and compare
    const current = [...assignments].sort((a, b) => a.userId.localeCompare(b.userId));
    const original = [...roster.members].sort((a, b) => a.userId.localeCompare(b.userId));
    
    for (let i = 0; i < current.length; i++) {
      if (current[i].userId !== original[i].userId) return true;
      if (current[i].role !== original[i].assignedRole) return true;
    }
    
    return false;
  };

  const isChanged = hasChanges();

  const roles = ['SOPRANO', 'ALTO', 'TENOR', 'LEAD'];

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="bg-muted/30 border-b px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground font-semibold shrink-0">
          <Users className="w-4 h-4 text-primary" />
          Sunday Team Roster
        </div>
        {canEditPlaylist && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleSave} disabled={!isChanged || saveRoster.isPending}>
              {saveRoster.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1" />} 
              Save Changes
            </Button>
            <Button size="sm" onClick={() => setDispatchOpen(true)} disabled={assignments.length === 0 || isChanged}>
              <Send className="w-3.5 h-3.5 mr-1" /> Notify Team
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map(role => {
          const assignedInRole = assignments.filter(a => a.role === role);
          const mappedUsers = assignedInRole.map(a => {
            const u = users.find((u: UserNode) => u.id === a.userId) || a.user;
            return { id: a.userId, name: u?.name, email: u?.email, avatarUrl: u?.avatarUrl };
          });
          
          return (
            <div key={role} className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  {role}
                  <Badge variant="secondary" className="text-[10px] px-1.5">{assignedInRole.length}</Badge>
                </h4>
                {canEditPlaylist && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setActiveRoleDialog(role)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>
              
              <div className="min-h-[40px] flex items-center pt-2">
                {assignedInRole.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">No members assigned</div>
                ) : (
                  <div className="flex flex-wrap gap-4">
                    {mappedUsers.map(u => (
                      <div key={u.id} className="flex flex-col items-center gap-1.5 w-14">
                        <div className="relative w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden shadow-sm">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.name || ''} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground uppercase">
                              {(u.name || u.email || 'U').charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center" title={u.name || u.email}>
                          {u.name ? u.name.split(' ')[0] : u.email?.split('@')[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {activeRoleDialog && (
        <RosterAssignmentDialog
          open={!!activeRoleDialog}
          onOpenChange={(open) => !open && setActiveRoleDialog(null)}
          users={users}
          assignments={assignments}
          onToggleMember={handleToggleMember}
          role={activeRoleDialog}
        />
      )}

      {/* Intentional Confirmation Modal */}
      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Sunday Team?</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              This will send <strong>In-App Notifications</strong> and personalized <strong>Emails</strong> to any roster members who have not been notified yet, containing their assigned roles and the service setlist.
            </p>
            <div className="bg-muted/50 p-3 rounded-lg border space-y-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Roster Summary</h5>
              {roles.map(r => {
                const count = assignments.filter(a => a.role === r).length;
                if (count === 0) return null;
                return (
                  <div key={r} className="flex justify-between text-sm">
                    <span className="capitalize">{r.toLowerCase()}s</span>
                    <span className="font-medium">{count} assigned</span>
                  </div>
                );
              })}
              <div className="pt-2 mt-2 border-t flex justify-between text-sm font-bold">
                <span>Total Members</span>
                <span>{assignments.length}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button onClick={handleDispatch} disabled={dispatchRoster.isPending}>
              {dispatchRoster.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Dispatch Notifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

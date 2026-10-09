import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../auth/auth-context';
import { useRoster, useSaveRoster, useDispatchRoster } from '../../hooks/use-rosters';
import { useUsers } from '../../hooks/use-users';
import { Button } from '../ui/button';
import { trackChoirEvent } from '../../lib/analytics';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Users, Send, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { cn } from '../../lib/utils';

interface UserNode {
  id: string;
  email: string;
  name?: string | null;
  comfortableKey?: string | null;
}

export function RosterPanel({ playlistId, serviceDate }: { playlistId: string, serviceDate?: string | Date | null }) {
  const { user } = useAuth();
  const isDirector = user?.role === 'DIRECTOR' || user?.role === 'ADMIN';
  
  const { data: roster, isLoading: loadingRoster } = useRoster(playlistId);
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ['users', 1, 100, true],
    queryFn: async () => {
      const res = await apiClient.get(`/users?page=1&limit=100&assignable=true`);
      return res.data;
    },
    enabled: isDirector,
  });
  const users = usersData?.data || [];
  
  const saveRoster = useSaveRoster();
  const dispatchRoster = useDispatchRoster();

  // Local state for assignments
  const [assignments, setAssignments] = useState<{userId: string, role: string, notes?: string, notified: boolean, user?: any}[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);

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

  if (loadingRoster || (isDirector && loadingUsers)) {
    return (
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="bg-muted/30 border-b px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded-full animate-pulse" />
            <div className="w-32 h-5 bg-muted rounded animate-pulse" />
          </div>
          {isDirector && (
            <div className="flex gap-2">
              <div className="w-20 h-8 bg-muted rounded animate-pulse" />
              <div className="w-24 h-8 bg-muted rounded animate-pulse" />
            </div>
          )}
        </div>
        <div className="p-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-3">
              <div className="w-20 h-5 bg-muted rounded animate-pulse" />
              <div className="space-y-2">
                <div className="w-full h-8 bg-muted rounded animate-pulse" />
                <div className="w-full h-8 bg-muted rounded animate-pulse" />
              </div>
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
        // Remove
        return prev.filter((_, i) => i !== existingInThisRole);
      } else {
        // Add, ensuring they only have ONE role to satisfy database constraints
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
      setIsEditing(false);
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

  const roles = ['SOPRANO', 'ALTO', 'TENOR', 'LEAD'];

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="bg-muted/30 border-b px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-foreground font-semibold shrink-0">
          <Users className="w-4 h-4 text-primary" />
          Sunday Team Roster
        </div>
        {isDirector && (
          <div className="flex flex-wrap gap-2">
            {!isEditing ? (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                Edit Roster
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
            <Button size="sm" onClick={() => setDispatchOpen(true)} disabled={assignments.length === 0}>
              <Send className="w-3.5 h-3.5 mr-1" /> Notify Team
            </Button>
          </div>
        )}
      </div>

      <div className="p-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map(role => {
          const assignedInRole = assignments.filter(a => a.role === role);
          return (
            <div key={role} className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                {role}
                <Badge variant="secondary" className="text-[10px] px-1.5">{assignedInRole.length}</Badge>
              </h4>
              
              <div className="space-y-2">
                {isEditing ? (
                  users.map((u: UserNode) => {
                    const isSelected = assignedInRole.some(a => a.userId === u.id);
                    return (
                      <div 
                        key={u.id}
                        onClick={() => handleToggleMember(u.id, role)}
                        className={cn(
                          "text-sm px-3 py-1.5 rounded-md cursor-pointer transition-colors border text-center truncate",
                          isSelected 
                            ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm" 
                            : "bg-background hover:bg-muted/50 border-border text-muted-foreground"
                        )}
                      >
                        {u.name || u.email.split('@')[0]} {u.comfortableKey && <Badge variant="secondary" className="ml-1 text-[8px] px-1 h-3 leading-none opacity-70">{u.comfortableKey}</Badge>}
                      </div>
                    );
                  })
                ) : (
                  assignedInRole.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic text-center py-2 border rounded-md border-dashed bg-muted/10">Unassigned</div>
                  ) : (
                    assignedInRole.map(a => {
                      const user = users.find((u: UserNode) => u.id === a.userId) || a.user;
                      return (
                        <div key={a.userId} className="text-sm px-3 py-1.5 rounded-md bg-muted/40 border font-medium truncate flex justify-between items-center">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{user?.name || user?.email?.split('@')[0] || 'Unknown'}</span>
                            {user?.comfortableKey && <Badge variant="secondary" className="text-[9px] px-1 h-[14px] leading-none opacity-60 font-medium">{user.comfortableKey}</Badge>}
                          </div>
                          {a.notified && <Check className="w-3 h-3 text-green-500" />}
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="bg-muted/30 border-t p-3 flex justify-end">
          <Button onClick={handleSave} disabled={saveRoster.isPending}>
            {saveRoster.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
        </div>
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

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

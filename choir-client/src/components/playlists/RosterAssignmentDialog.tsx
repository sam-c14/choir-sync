import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';

interface RosterAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: any[];
  assignments: any[];
  onToggleMember: (userId: string, role: string) => void;
  role: string;
}

export function RosterAssignmentDialog({ open, onOpenChange, users, assignments, onToggleMember, role }: RosterAssignmentDialogProps) {
  const [search, setSearch] = useState('');

  const assignedInRole = assignments.filter(a => a.role === role);
  
  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (u.name?.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
  }).sort((a, b) => {
    const aSelected = assignedInRole.some(as => as.userId === a.id);
    const bSelected = assignedInRole.some(as => as.userId === b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    const nameA = (a.name || a.email).toLowerCase();
    const nameB = (b.name || b.email).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Assign {role}s</DialogTitle>
        </DialogHeader>
        
        <div className="relative mt-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search team members..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No members found.</p>
          ) : (
            filteredUsers.map(u => {
              const isSelected = assignedInRole.some(a => a.userId === u.id);
              return (
                <div 
                  key={u.id}
                  onClick={() => onToggleMember(u.id, role)}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    isSelected 
                      ? "bg-primary/10 border-primary shadow-sm" 
                      : "bg-card hover:bg-muted/50 border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted overflow-hidden border">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-muted-foreground text-sm">
                          {(u.name || u.email || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{u.name || u.email.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.comfortableKey && <Badge variant="secondary" className="text-[10px]">{u.comfortableKey}</Badge>}
                    <div className={cn(
                      "w-5 h-5 rounded-full border flex items-center justify-center",
                      isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                    )}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

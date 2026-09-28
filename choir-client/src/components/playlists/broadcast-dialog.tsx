import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Copy, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { formatBroadcastMessage, FormatterInputs } from '../../lib/broadcast-formatter';
import { useUniforms } from '../../hooks/use-uniforms';

export function BroadcastDialog({ 
  playlist, 
  trigger 
}: { 
  playlist: any; 
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [formattedText, setFormattedText] = useState('');

  // Fetch uniform for the playlist's service date
  // Since uniform serviceDate might have time, we can fetch all or just use the filter
  const serviceDate = playlist.serviceDate ? new Date(playlist.serviceDate) : new Date();
  
  // Format to ISO string for YYYY-MM-DD
  const dateStr = serviceDate.toISOString().split('T')[0];
  const { data: uniformData } = useUniforms({ from: dateStr, to: dateStr });
  
  useEffect(() => {
    if (open && playlist) {
      const uniform = uniformData?.data.find(u => u.serviceDate.startsWith(dateStr)) || null;
      
      const rosterGroups: Record<string, string[]> = {
        'Soprano': [],
        'Alto': [],
        'Tenor': [],
        'Lead': []
      };

      if (playlist.roster?.members) {
        playlist.roster.members.forEach((m: any) => {
          let role = m.assignedRole.charAt(0).toUpperCase() + m.assignedRole.slice(1).toLowerCase();
          if (rosterGroups[role]) {
            rosterGroups[role].push(m.user?.email || 'Unknown'); 
            // In a real app you might use m.user.name if available, fallback to email prefix
          }
        });
      }

      const rosterFormatted = Object.keys(rosterGroups)
        .filter(k => rosterGroups[k].length > 0)
        .map(role => ({
          role,
          names: rosterGroups[role].map(email => email.split('@')[0])
        }));

      const inputs: FormatterInputs = {
        serviceDate,
        uniform,
        playlist: { title: playlist.title, description: playlist.description },
        songs: playlist.songs.map((ps: any) => ({
          title: ps.song.title,
          customKey: ps.customKey,
          originalKey: ps.song.originalKey,
          leadSinger: ps.leadSinger,
          songId: ps.songId
        })),
        roster: rosterFormatted
      };

      setFormattedText(formatBroadcastMessage(inputs));
    }
  }, [open, playlist, uniformData, dateStr]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedText);
      toast.success('Copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy text');
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=\${encodeURIComponent(formattedText)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild={true as any}>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" /> Broadcast Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <Textarea 
            readOnly
            className="h-80 sm:h-96 font-mono text-sm resize-none"
            value={formattedText}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button variant="outline" className="flex-1 py-2" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" /> Copy Text
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2" onClick={handleWhatsApp}>
            <MessageCircle className="w-4 h-4 mr-2" /> Send via WhatsApp
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

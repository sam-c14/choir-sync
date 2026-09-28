import { format } from 'date-fns';

export interface FormatterInputs {
  serviceDate: Date;
  uniform: { femaleOutfit: string; maleOutfit: string; notes: string | null } | null;
  playlist: { title: string; description: string | null };
  songs: { title: string; customKey: string | null; originalKey: string | null; leadSinger: string | null; songId: string }[];
  roster: { role: string; names: string[] }[];
}

export function formatBroadcastMessage(inputs: FormatterInputs): string {
  const { serviceDate, uniform, playlist, songs, roster } = inputs;
  
  const dateStr = format(serviceDate, 'MMMM d, yyyy');
  
  let output = `*DGC WORSHIP TEAM BRIEFING — ${dateStr}*\n`;
  output += `----------------------------------------\n`;
  
  if (uniform) {
    output += `👗 *UNIFORM:*\n`;
    output += `• Female: ${uniform.femaleOutfit}\n`;
    output += `• Male: ${uniform.maleOutfit}\n`;
    if (uniform.notes) {
      output += `• Note: ${uniform.notes}\n`;
    }
    output += `\n`;
  }
  
  output += `🎶 *MINISTRATION SETLIST:*\n`;
  songs.forEach((song, idx) => {
    const key = song.customKey || song.originalKey || 'TBD';
    const lead = song.leadSinger ? ` — Lead: ${song.leadSinger}` : '';
    output += `${idx + 1}. ${song.title} (Key: ${key})${lead}\n`;
    output += `   🔗 https://choirsync.app/songs/${song.songId}\n`;
  });
  output += `\n`;
  
  if (roster && roster.length > 0) {
    output += `👥 *ROSTER ASSIGNMENTS:*\n`;
    roster.forEach(r => {
      output += `• ${r.role}: ${r.names.join(', ')}\n`;
    });
    output += `\n`;
  }
  
  output += `Please review your parts on the choir portal before rehearsal!`;
  
  return output;
}

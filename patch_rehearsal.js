const fs = require('fs');
const file = 'choir-client/src/components/songs/rehearsal-reader.tsx';
let content = fs.readFileSync(file, 'utf8');

const imports = `import { AudioRecorder } from './audio-recorder';
import { AudioPlayer } from './audio-player';
import { useSnippetUploadUrl, useCreateSnippet, useDeleteSnippet } from '../../hooks/use-snippets';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Mic } from 'lucide-react';`;

content = content.replace("import { cn } from '../../lib/utils';", "import { cn } from '../../lib/utils';\n" + imports);

const interfaceBlock = `interface SongPart {
  voicePart: string;
  notes?: string | null;
}`;

const newInterfaceBlock = `interface VoiceSnippet {
  id: string;
  audioUrl: string;
  durationSec: number;
  title?: string | null;
  createdAt: string;
  user: { id: string; email: string };
}

interface SongPart {
  id: string;
  voicePart: string;
  notes?: string | null;
  voiceSnippets?: VoiceSnippet[];
}`;

content = content.replace(interfaceBlock, newInterfaceBlock);

const hooksBlock = `  const updatePart = useUpdatePart();
  const updateLyrics = useUpdateLyrics();`;

const newHooksBlock = `  const updatePart = useUpdatePart();
  const updateLyrics = useUpdateLyrics();

  const getUploadUrl = useSnippetUploadUrl();
  const createSnippet = useCreateSnippet();
  const deleteSnippet = useDeleteSnippet();
  
  const [isRecordOpen, setIsRecordOpen] = useState(false);`;

content = content.replace(hooksBlock, newHooksBlock);

const saveSnippetFn = `
  const handleSaveSnippet = async (blob: Blob, durationSec: number, title?: string) => {
    if (!activePartData?.id) return;
    try {
      const { signedUrl, path } = await getUploadUrl.mutateAsync(activePartData.id);
      
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': blob.type
        }
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      
      // We don't get publicUrl back from signed upload directly, but we can reconstruct it, 
      // or rely on backend returning it. Actually the backend returns it in getUploadUrl!
      const { publicUrl } = await getUploadUrl.mutateAsync(activePartData.id); // Wait, backend returned publicUrl already during first call.
      
      // Let's just pass audioUrl to backend or let backend construct it?
      // Wait, backend expects audioUrl. The first call to mutateAsync returned it.
    } catch(e) {}
  };
`;

// Wait, the backend in `snippets.controller.ts` returns `publicUrl` directly when returning the `signedUrl`!
// So: `const { signedUrl, path, publicUrl } = await getUploadUrl.mutateAsync(activePartData.id);`
// Then after upload: `await createSnippet.mutateAsync({ partId: activePartData.id, data: { audioUrl: publicUrl, durationSec, title } });`

// Let's just replace the whole component because it's easier to append functions.

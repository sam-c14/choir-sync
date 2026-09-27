const fs = require('fs');
const file = 'choir-client/src/components/songs/rehearsal-reader.tsx';
let content = fs.readFileSync(file, 'utf8');

const hookFind = `  const setTab = (tab: string) => {`;
const hookReplace = `  const handleSaveSnippet = async (blob: Blob, durationSec: number, snippetTitle?: string) => {
    if (!activePartData?.id) return;
    try {
      const { signedUrl, publicUrl } = await getUploadUrl.mutateAsync(activePartData.id);
      
      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: blob,
        headers: {
          'Content-Type': blob.type
        }
      });
      
      if (!uploadRes.ok) throw new Error('Upload failed');
      
      await createSnippet.mutateAsync({
        partId: activePartData.id,
        data: {
          audioUrl: publicUrl,
          durationSec,
          title: snippetTitle || 'Voice Snippet'
        }
      });
      
      toast.success('Audio snippet saved!');
      setIsRecordOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save audio snippet');
    }
  };

  const handleDeleteSnippet = async (snippetId: string) => {
    try {
      await deleteSnippet.mutateAsync(snippetId);
      toast.success('Snippet deleted');
    } catch (err) {
      toast.error('Failed to delete snippet');
    }
  };

  const setTab = (tab: string) => {`;

content = content.replace(hookFind, hookReplace);

const editToggleFind = `          {canEditCurrentTab() && (
            <div className="flex gap-2">`;
const editToggleReplace = `          <div className="flex items-center gap-2">
            {activeTab !== 'LYRICS' && (
              <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm" className="h-7 px-2">
                    <Mic className="w-3.5 h-3.5 mr-1" /> Record
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Audio Reference</DialogTitle>
                  </DialogHeader>
                  <AudioRecorder onSave={handleSaveSnippet} onCancel={() => setIsRecordOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
            {canEditCurrentTab() && (
              <div className="flex gap-2">`;

content = content.replace(editToggleFind, editToggleReplace);

const closingFind = `              )}
            </div>
          )}
        </div>`;
const closingReplace = `              )}
            </div>
          )}
        </div>
        </div>`; // Match the extra div I added in editToggleReplace
content = content.replace(closingFind, closingReplace);

const snippetsUIFind = `                <div className="font-mono whitespace-pre-wrap text-lg sm:text-xl font-bold tracking-wide leading-loose text-foreground">
                  {activePartData?.notes || <span className="text-muted-foreground italic font-normal text-base">No notes for this part.</span>}
                </div>
              )}`;
const snippetsUIReplace = `                <div className="font-mono whitespace-pre-wrap text-lg sm:text-xl font-bold tracking-wide leading-loose text-foreground">
                  {activePartData?.notes || <span className="text-muted-foreground italic font-normal text-base">No notes for this part.</span>}
                </div>
              )}
              {activeTab !== 'LYRICS' && activePartData?.voiceSnippets && activePartData.voiceSnippets.length > 0 && (
                <div className="mt-8 space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2 mb-4">
                    Audio References
                  </h4>
                  <div className="grid gap-3">
                    {activePartData.voiceSnippets.map((snippet: any) => (
                      <AudioPlayer 
                        key={snippet.id} 
                        snippet={snippet} 
                        onDelete={handleDeleteSnippet}
                        canDelete={isDirector || snippet.user.id === user?.id}
                      />
                    ))}
                  </div>
                </div>
              )}`;
content = content.replace(snippetsUIFind, snippetsUIReplace);

fs.writeFileSync(file, content);
console.log("Success");

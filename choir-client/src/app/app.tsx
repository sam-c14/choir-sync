import { useSongs } from '../hooks/use-songs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export function App() {
  const { data: songs, isLoading, error } = useSongs();

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Choir Sync</h1>
          <Badge variant="outline" className="text-sm">Songs Catalog</Badge>
        </header>

        {isLoading && (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-md">
            Failed to load songs. Are you logged in?
          </div>
        )}

        {songs && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {songs.map((song: any) => (
              <Card key={song.id} className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg line-clamp-1">{song.title}</CardTitle>
                    <Badge variant={song.status === 'ACTIVE_SUNDAY' ? 'default' : 'secondary'} className="shrink-0 text-xs">
                      {song.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-slate-500">{song.composer || 'Unknown Composer'}</div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="bg-slate-50">{song.complexity}</Badge>
                    <div className="text-xs text-slate-500">
                      {song.parts?.length || 0} Parts
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {songs.length === 0 && (
              <div className="col-span-full p-12 text-center text-slate-500 bg-white border border-dashed rounded-lg">
                No songs found in the library.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

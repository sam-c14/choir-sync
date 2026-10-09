import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Music, ListMusic, PlusCircle, Sun, Moon, Shirt, Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useTheme } from '../theme-provider';
import { useAuth } from '../../auth/auth-context';
import { Button } from '../ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../ui/command';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const { updateLocalUser } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: async () => {
      if (!query.trim()) return { songs: [], playlists: [] };
      const res = await apiClient.get(`/search?q=${encodeURIComponent(query)}`);
      return res.data;
    },
    enabled: !!query.trim() && open,
  });

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <Button
        variant="outline"
        className="relative w-32 h-10 md:h-9 justify-start text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64 border-muted/60 bg-muted/20"
        onClick={() => setOpen(true)}
      >
        <span className="hidden lg:inline-flex">Search CSync...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading ? "Searching..." : "No results found."}
          </CommandEmpty>

          {data?.songs?.length > 0 && (
            <CommandGroup heading="Songs">
              {data.songs.map((song: any) => (
                <CommandItem
                  key={song.id}
                  onSelect={() => runCommand(() => navigate(`/songs/${song.id}`))}
                >
                  <Music className="mr-2 h-4 w-4" />
                  <span>{song.title}</span>
                  {song.composer && (
                    <span className="ml-2 text-xs text-muted-foreground truncate max-w-[150px]">
                      {song.composer}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {data?.playlists?.length > 0 && (
            <CommandGroup heading="Playlists">
              {data.playlists.map((pl: any) => (
                <CommandItem
                  key={pl.id}
                  onSelect={() => runCommand(() => navigate(`/playlists/${pl.id}`))}
                >
                  <ListMusic className="mr-2 h-4 w-4" />
                  <span>{pl.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => runCommand(() => navigate('/songs/new'))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Add New Song</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/playlists'))}>
              <PlusCircle className="mr-2 h-4 w-4" />
              <span>Create Playlist</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => navigate('/uniforms'))}>
              <Shirt className="mr-2 h-4 w-4" />
              <span>Check current uniform</span>
            </CommandItem>
    <CommandItem onSelect={() => runCommand(async () => {
      try {
        await apiClient.patch('/users/me', { hasCompletedOnboarding: false });
        if (updateLocalUser) {
          updateLocalUser({ hasCompletedOnboarding: false });
        } else {
          window.location.reload();
        }
      } catch (e) {
        console.error(e);
      }
    })}>
              <Map className="mr-2 h-4 w-4" />
              <span>Restart App Tour</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

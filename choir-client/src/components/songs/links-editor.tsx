import React, { useState, useRef, useEffect } from "react";
import { useAddSongLink, useDeleteSongLink, useSearchExternalMusic } from "../../hooks/use-songs";
import { useAuth } from "../../auth/auth-context";
import { usePlayer } from "../../contexts/player-context";
import { useDebounce } from "../../hooks/use-debounce";
import {
  LinkPlatformEnum,
  type CreateSongLinkDto,
} from "@choir-workspace/shared-validation";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Music, PlayCircle, Trash2, Link as LinkIcon, Search, Loader2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  SPOTIFY: <Music className="w-4 h-4 text-green-500" />,
  YOUTUBE: <PlayCircle className="w-4 h-4 text-red-500" />,
  AUDIOMACK: <Music className="w-4 h-4 text-orange-500" />,
  OTHER: <LinkIcon className="w-4 h-4 text-slate-500" />,
};

/** Platforms that support the search-to-add flow */
const SEARCHABLE_PLATFORMS = new Set(["SPOTIFY", "YOUTUBE"]);

interface SongLink {
  id: string;
  platform: string;
  url: string;
}

interface LinksEditorProps {
  songId: string;
  links: SongLink[];
  songTitle?: string;
}

// ---------------------------------------------------------------------------
// Embed helpers
// ---------------------------------------------------------------------------
function getEmbedUrl(platform: string, url: string): string | null {
  try {
    if (platform === "YOUTUBE") {
      const videoId = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?/\s]{11})/i
      )?.[1];
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    }
    if (platform === "SPOTIFY") {
      const trackId = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/i)?.[1];
      if (trackId)
        return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
    }
    if (platform === "AUDIOMACK") {
      const path = url.match(/audiomack\.com\/(.+)/i)?.[1];
      if (path) return `https://audiomack.com/embed/${path}?background=1`;
    }
  } catch {
    // Return null if parsing fails
  }
  return null;
}

// ---------------------------------------------------------------------------
// Search result row shared between Spotify and YouTube
// ---------------------------------------------------------------------------
interface SearchResult {
  title: string;
  composer?: string;
  thumbnailUrl?: string;
  spotifyUrl?: string;
  youtubeUrl?: string;
  originalKey?: string;
  tempoBpm?: number;
}

// ---------------------------------------------------------------------------
// Search-to-add panel (shown for SPOTIFY and YOUTUBE)
// ---------------------------------------------------------------------------
interface SearchAddPanelProps {
  platform: "SPOTIFY" | "YOUTUBE";
  songId: string;
  onAdded: () => void;
}

import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "../ui/dialog";

function SearchAddPanel({ platform, songId, onAdded }: SearchAddPanelProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 600);
  const addLink = useAddSongLink();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState("");

  const source = platform === "SPOTIFY" ? "spotify" : "youtube";
  const { data: results, isFetching } = useSearchExternalMusic(
    debouncedQuery,
    source
  );

  const handleSelect = (result: SearchResult) => {
    const url = platform === "SPOTIFY" ? result.spotifyUrl : result.youtubeUrl;
    if (url) {
      setSelectedUrl(url);
      setModalOpen(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedUrl) return;
    const data: CreateSongLinkDto = { platform, url: selectedUrl };
    try {
      await addLink.mutateAsync({ songId, data });
      toast.success("Link added.");
      setQuery("");
      setSelectedUrl("");
      onAdded();
    } catch {
      toast.error("Failed to add link.");
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex gap-2 w-full">
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger
            render={
              <div
                className="flex items-center h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors cursor-pointer hover:bg-muted/50 overflow-hidden"
                role="button"
                tabIndex={0}
              />
            }
          >
            <Search className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
            <span className={selectedUrl ? "text-foreground truncate block min-w-0" : "text-muted-foreground truncate block min-w-0"}>
              {selectedUrl || "Search for a Song"}
            </span>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md p-0 overflow-hidden gap-0 rounded-xl" showCloseButton={false}>
            <div className="p-3 border-b">
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                 <Input
                   placeholder={`Search ${platform === "SPOTIFY" ? "Spotify" : "YouTube"}…`}
                   value={query}
                   className="pl-9 pr-9 h-10 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base sm:text-sm"
                   onChange={(e) => setQuery(e.target.value)}
                   autoFocus
                 />
                 {query && !isFetching && (
                   <button
                     type="button"
                     onClick={() => setQuery("")}
                     className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                   >
                     <X className="w-4 h-4" />
                   </button>
                 )}
                 {isFetching && (
                   <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                 )}
               </div>
            </div>
            <div className="h-80 overflow-y-auto p-2">
              {!query ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    {platform === 'SPOTIFY' ? (
                      <Music className="w-8 h-8 text-green-500" />
                    ) : platform === 'YOUTUBE' ? (
                      <PlayCircle className="w-8 h-8 text-red-500" />
                    ) : (
                      PLATFORM_ICONS[platform]
                    )}
                  </div>
                  <p className="text-sm">Type to search for a song</p>
                </div>
              ) : isFetching && !results?.length ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm">Searching...</p>
                </div>
              ) : results && results.length > 0 ? (
                results.map((item: SearchResult) => {
                  const key = item.spotifyUrl ?? item.youtubeUrl ?? item.title;
                  return (
                    <button
                      key={key}
                      type="button"
                      className="w-full flex items-center gap-3 p-3 text-sm text-left hover:bg-muted transition-colors rounded-md focus:outline-none focus:bg-muted"
                      onClick={() => handleSelect(item)}
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          {PLATFORM_ICONS[platform]}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {item.composer}
                          {item.originalKey && ` · ${item.originalKey}`}
                          {item.tempoBpm && ` · ${item.tempoBpm} BPM`}
                        </p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
                   <p className="text-sm">No results found</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        <Button
          type="button"
          size="default"
          className="shrink-0 h-9"
          disabled={addLink.isPending || !selectedUrl}
          onClick={handleAdd}
        >
          {addLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Manual URL input (for AUDIOMACK / OTHER)
// ---------------------------------------------------------------------------
interface ManualUrlInputProps {
  songId: string;
  platform: string;
  onAdded: () => void;
}

function ManualUrlInput({ songId, platform, onAdded }: ManualUrlInputProps) {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const addLink = useAddSongLink();

  const handleAdd = async () => {
    try {
      new URL(url); // basic validation
    } catch {
      setUrlError("Please enter a valid URL.");
      return;
    }
    setUrlError("");

    const data: CreateSongLinkDto = {
      platform: platform as CreateSongLinkDto["platform"],
      url,
    };

    try {
      await addLink.mutateAsync({ songId, data });
      toast.success("Link added.");
      setUrl("");
      onAdded();
    } catch {
      toast.error("Failed to add link.");
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex gap-2">
        <Input
          placeholder="https://…"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setUrlError("");
          }}
          aria-invalid={!!urlError}
          className="w-full"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          size="default"
          className="shrink-0 h-9"
          disabled={addLink.isPending || !url}
          onClick={handleAdd}
        >
          {addLink.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
        </Button>
      </div>
      {urlError && <p className="text-xs text-destructive">{urlError}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function LinksEditor({ songId, links, songTitle }: LinksEditorProps) {
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const isDirector = user?.role === "DIRECTOR";
  const deleteLink = useDeleteSongLink();

  const [platform, setPlatform] = useState<CreateSongLinkDto["platform"]>("YOUTUBE");
  const [addKey, setAddKey] = useState(0); // bump to reset child panels after add

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
        Reference Links
      </h3>

      {links.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No links added yet.</p>
      )}

      {/* Existing links */}
      <div className="space-y-4">
        {links.map((link) => {
          const embedUrl = getEmbedUrl(link.platform, link.url);
          return (
            <div
              key={link.id}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm">
                {PLATFORM_ICONS[link.platform] ?? PLATFORM_ICONS["OTHER"]}
                <Badge variant="secondary" className="shrink-0">
                  {link.platform}
                </Badge>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[155px] sm:max-w-80 flex-1 min-w-0"
                >
                  {link.url}
                </a>
                {isDirector && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="ml-auto shrink-0 text-slate-400 hover:text-destructive h-8 w-8 p-0"
                    onClick={async () => {
                      try {
                        await deleteLink.mutateAsync({ songId, linkId: link.id });
                        toast.success("Link deleted.");
                      } catch {
                        toast.error("Failed to delete link.");
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {embedUrl && link.platform === "YOUTUBE" && (
                <div className="w-full mt-1.5 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full sm:w-auto h-8 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-foreground"
                    onClick={() => playTrack({ platform: link.platform, url: link.url, embedUrl, title: songTitle })}
                  >
                    <PlayCircle className="w-3.5 h-3.5 mr-2 text-primary" />
                    Play in Background
                  </Button>
                </div>
              )}

              {embedUrl && link.platform !== "YOUTUBE" && (
                <div className="w-full mt-2 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {link.platform === "SPOTIFY" && (
                    <iframe
                      className="w-full border-0 rounded-md block"
                      src={embedUrl}
                      height="152"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  )}
                  {link.platform === "AUDIOMACK" && (
                    <iframe
                      className="w-full border-0 block"
                      src={embedUrl}
                      height="252"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add link — directors only */}
      {isDirector && (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 pt-2">
          {/* Platform selector */}
          <div className="space-y-2 w-full sm:w-36 shrink-0">
            <Label className="text-xs">Platform</Label>
            <Select
              value={platform}
              onValueChange={(v) => {
                setPlatform(v as CreateSongLinkDto["platform"]);
                setAddKey((k) => k + 1); // reset whichever panel is active
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LinkPlatformEnum.options.map((o: string) => (
                  <SelectItem key={o} value={o}>
                    <span className="flex items-center gap-2">
                      {PLATFORM_ICONS[o]}
                      {o.charAt(0) + o.slice(1).toLowerCase()}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Search panel or manual URL input */}
          <div className="flex flex-col gap-2 w-full">
            <Label className="text-xs">
              {SEARCHABLE_PLATFORMS.has(platform) ? "Search" : "URL"}
            </Label>
            {SEARCHABLE_PLATFORMS.has(platform) ? (
              <SearchAddPanel
                key={`${platform}-${addKey}`}
                platform={platform as "SPOTIFY" | "YOUTUBE"}
                songId={songId}
                onAdded={() => setAddKey((k) => k + 1)}
              />
            ) : (
              <ManualUrlInput
                key={`manual-${platform}-${addKey}`}
                platform={platform}
                songId={songId}
                onAdded={() => setAddKey((k) => k + 1)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React from "react";
import { useAddSongLink, useDeleteSongLink } from "../../hooks/use-songs";
import { useAuth } from "../../auth/auth-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreateSongLinkSchema,
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
import { Music, PlayCircle, Trash2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  SPOTIFY: <Music className="w-4 h-4 text-green-500" />,
  YOUTUBE: <PlayCircle className="w-4 h-4 text-red-500" />,
  AUDIOMACK: <Music className="w-4 h-4 text-orange-500" />,
  OTHER: <LinkIcon className="w-4 h-4 text-slate-500" />,
};

interface SongLink {
  id: string;
  platform: string;
  url: string;
}

interface LinksEditorProps {
  songId: string;
  links: SongLink[];
}

export function LinksEditor({ songId, links }: LinksEditorProps) {
  const { user } = useAuth();
  const isDirector = user?.role === "DIRECTOR";
  const addLink = useAddSongLink();
  const deleteLink = useDeleteSongLink();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSongLinkDto>({
    resolver: zodResolver(CreateSongLinkSchema),
    defaultValues: { platform: "YOUTUBE", url: "" },
  });

  const onSubmit = async (data: CreateSongLinkDto) => {
    try {
      await addLink.mutateAsync({ songId, data });
      toast.success("Link added successfully.");
      reset();
    } catch (_err) {
      toast.error("Failed to add link.");
    }
  };

  const getEmbedUrl = (platform: string, url: string) => {
    try {
      if (platform === 'YOUTUBE') {
        const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=))([^"&?\/\s]{11})/i)?.[1];
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      }
      if (platform === 'SPOTIFY') {
        const trackId = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/i)?.[1];
        if (trackId) return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
      }
      if (platform === 'AUDIOMACK') {
        const path = url.match(/audiomack\.com\/(.+)/i)?.[1];
        if (path) return `https://audiomack.com/embed/${path}?background=1`;
      }
    } catch (e) {
      // Return null if parsing fails
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
        Reference Links
      </h3>
      {links.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No links added yet.
        </p>
      )}
      <div className="space-y-4">
        {links.map((link) => {
          const embedUrl = getEmbedUrl(link.platform, link.url);
          return (
            <div key={link.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm">
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
              
              {embedUrl && (
                <div className="w-full mt-2 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800">
                  {link.platform === 'YOUTUBE' && (
                    <div className="relative w-full aspect-video">
                      <iframe 
                        className="absolute top-0 left-0 w-full h-full border-0" 
                        src={embedUrl} 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen 
                      />
                    </div>
                  )}
                  {link.platform === 'SPOTIFY' && (
                    <iframe 
                      className="w-full border-0 rounded-md" 
                      src={embedUrl} 
                      height="152" 
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                      loading="lazy"
                    />
                  )}
                  {link.platform === 'AUDIOMACK' && (
                    <iframe 
                      className="w-full border-0" 
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

      {isDirector && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col sm:flex-row sm:items-start gap-3 pt-2"
        >
          <div className="space-y-2 w-full sm:w-32 shrink-0">
            <Label className="text-xs">Platform</Label>
            <Select
              defaultValue="YOUTUBE"
              onValueChange={(v) =>
                setValue("platform", v as CreateSongLinkDto["platform"])
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LinkPlatformEnum.options.map((o: string) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end w-full gap-2">
            <div className="flex flex-col space-y-2 w-full">
              <Label className="text-xs">URL</Label>
              <Input
                placeholder="https://…"
                aria-invalid={!!errors.url}
                {...register("url")}
                className="w-full"
              />
              {errors.url && (
                <p className="text-xs text-red-600">{errors.url.message}</p>
              )}
            </div>
            <Button type="submit" size="default" disabled={isSubmitting} className="shrink-0 h-9">
              Add
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

import { z } from "zod";

export const VoicePartTypeEnum = z.enum(["SOPRANO", "ALTO", "TENOR"]);
export const SongStatusEnum = z.enum([
  "REHEARSAL",
  "ACTIVE_SUNDAY",
  "ARCHIVED",
]);
export const SongComplexityEnum = z.enum(["EASY", "MODERATE", "CHALLENGING"]);
export const LinkPlatformEnum = z.enum([
  "SPOTIFY",
  "YOUTUBE",
  "AUDIOMACK",
  "OTHER",
]);
export const UserRoleEnum = z.enum(["DIRECTOR", "SECTION_LEADER", "CHORISTER"]);

export const CreateSongLinkSchema = z.object({
  platform: LinkPlatformEnum,
  url: z.string().url(),
});

export const CreateSongPartSchema = z.object({
  voicePart: VoicePartTypeEnum,
  notes: z.string().max(1000).optional(),
});

export const CreateSongSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  composer: z.string().max(100).optional(),
  complexity: SongComplexityEnum.default("MODERATE"),
  tags: z.array(z.string()).default([]),
  status: SongStatusEnum.default("ACTIVE_SUNDAY"),
  parts: z.array(CreateSongPartSchema).default([]),
  links: z.array(CreateSongLinkSchema).default([]),
});

export const UpdateSongPartSchema = CreateSongPartSchema.partial();
export const UpdateSongSchema = CreateSongSchema.partial().omit({
  parts: true,
  links: true,
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreateSongDto = z.infer<typeof CreateSongSchema>;
export type UpdateSongDto = z.infer<typeof UpdateSongSchema>;
export type CreateSongPartDto = z.infer<typeof CreateSongPartSchema>;
export type CreateSongLinkDto = z.infer<typeof CreateSongLinkSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
export type UpdateSongPartDto = z.infer<typeof UpdateSongPartSchema>;

export const AuthProviderEnum = z.enum(["LOCAL", "GOOGLE"]);

export const GoogleAuthSchema = z.object({
  idToken: z.string().min(1, "ID token is required"),
});
export type GoogleAuthDto = z.infer<typeof GoogleAuthSchema>;

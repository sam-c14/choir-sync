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
  lyrics: z.string().max(10000).optional().nullable(),
  originalKey: z.string().max(20).optional().nullable(),
  tempoBpm: z.coerce.number().optional().nullable(),
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

export const RefreshTokenSchema = z.object({
  token: z.string().min(1, "Refresh token is required"),
});
export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const CreateUniformSchema = z.object({
  serviceDate: z.coerce.date(),
  femaleOutfit: z.string().min(1, "Female outfit description is required").max(1000),
  maleOutfit: z.string().min(1, "Male outfit description is required").max(1000),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateUniformSchema = CreateUniformSchema.partial();

export const UpdateUserRoleSchema = z
  .object({
    role: UserRoleEnum,
    leadsVoicePart: VoicePartTypeEnum.optional(),
  })
  .refine((data) => data.role !== "SECTION_LEADER" || data.leadsVoicePart !== undefined, {
    message: "leadsVoicePart is required when role is SECTION_LEADER",
    path: ["leadsVoicePart"],
  });

export type CreateUniformDto = z.infer<typeof CreateUniformSchema>;
export type UpdateUniformDto = z.infer<typeof UpdateUniformSchema>;
export type UpdateUserRoleDto = z.infer<typeof UpdateUserRoleSchema>;

export const CreatePlaylistSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  description: z.string().max(1000).optional().nullable(),
  serviceDate: z.coerce.date().optional().nullable(),
});
export const UpdatePlaylistSchema = CreatePlaylistSchema.partial();

export const CreatePlaylistSongSchema = z.object({
  songId: z.string().uuid("Invalid song ID"),
  orderIndex: z.number().int().min(0),
  leadSinger: z.string().max(100).optional().nullable(),
  customKey: z.string().max(20).optional().nullable(),
});
export const UpdatePlaylistSongSchema = CreatePlaylistSongSchema.partial().omit({ songId: true });

export type CreatePlaylistDto = z.infer<typeof CreatePlaylistSchema>;
export type UpdatePlaylistDto = z.infer<typeof UpdatePlaylistSchema>;
export type CreatePlaylistSongDto = z.infer<typeof CreatePlaylistSongSchema>;
export type UpdatePlaylistSongDto = z.infer<typeof UpdatePlaylistSongSchema>;

// Voice Snippet DTOs
export const CreateVoiceSnippetSchema = z.object({
  audioUrl: z.string().url('Must be a valid URL'),
  durationSec: z.number().min(1).max(60),
  title: z.string().optional()
});

export type CreateVoiceSnippetDto = z.infer<typeof CreateVoiceSnippetSchema>;

// Roster and Notification DTOs
export const VoicePartRosterRoleEnum = z.enum(["SOPRANO", "ALTO", "TENOR", "LEAD"]);

export const RosterMemberSchema = z.object({
  userId: z.string().uuid(),
  assignedRole: VoicePartRosterRoleEnum,
  notes: z.string().max(500).optional().nullable()
});

export const CreateRosterSchema = z.object({
  members: z.array(RosterMemberSchema)
});

export type RosterMemberDto = z.infer<typeof RosterMemberSchema>;
export type CreateRosterDto = z.infer<typeof CreateRosterSchema>;

// AI Curator DTOs
export const CurateSetlistSchema = z.object({
  theme: z.string().min(1).max(500),
  serviceType: z.string().optional(),
  targetCount: z.number().min(1).max(10).default(5)
});

export type CurateSetlistDto = z.infer<typeof CurateSetlistSchema>;

export const UpdateProfileSchema = z.object({
  name: z.string().nullable().optional(),
  comfortableKey: z.string().nullable().optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

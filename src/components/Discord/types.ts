
export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
  verified?: boolean;
  mfa_enabled?: boolean;
  premium_type?: number;
  bot?: boolean;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  region: string;
  afk_channel_id: string | null;
  afk_timeout: number;
  verification_level: number;
  default_message_notifications: number;
  explicit_content_filter: number;
  roles: DiscordRole[];
  emojis: DiscordEmoji[];
  features: string[];
  mfa_level: number;
  system_channel_id: string | null;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

export interface DiscordChannel {
  id: string;
  type: number;
  guild_id?: string;
  position?: number;
  permission_overwrites?: DiscordPermissionOverwrite[];
  name?: string;
  topic?: string | null;
  nsfw?: boolean;
  last_message_id?: string | null;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  parent_id?: string | null;
}

export interface DiscordPermissionOverwrite {
  id: string;
  type: number;
  allow: string;
  deny: string;
}

export interface DiscordEmoji {
  id: string | null;
  name: string;
  roles?: string[];
  user?: DiscordUser;
  require_colons?: boolean;
  managed?: boolean;
  animated?: boolean;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  author: DiscordUser;
  content: string;
  timestamp: string;
  edited_timestamp: string | null;
  tts: boolean;
  mention_everyone: boolean;
  mentions: DiscordUser[];
  mention_roles: string[];
  attachments: DiscordAttachment[];
  embeds: DiscordEmbed[];
  reactions?: DiscordReaction[];
}

export interface DiscordAttachment {
  id: string;
  filename: string;
  size: number;
  url: string;
  proxy_url: string;
  height?: number | null;
  width?: number | null;
}

export interface DiscordEmbed {
  title?: string;
  type?: string;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: {
    text: string;
    icon_url?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    url?: string;
    icon_url?: string;
  };
  fields?: {
    name: string;
    value: string;
    inline?: boolean;
  }[];
}

export interface DiscordReaction {
  count: number;
  me: boolean;
  emoji: DiscordEmoji;
}

export interface DiscordWebhook {
  id: string;
  type: number;
  guild_id?: string;
  channel_id: string;
  user?: DiscordUser;
  name: string | null;
  avatar: string | null;
  token?: string;
}

export interface DiscordMember {
  user: DiscordUser;
  nick: string | null;
  roles: string[];
  joined_at: string;
  premium_since?: string | null;
  deaf: boolean;
  mute: boolean;
}

export enum NitroType {
  None = 0,
  Classic = 1,
  Nitro = 2,
  Basic = 3,
}

export const getNitroTypeName = (type: number): string => {
  switch (type) {
    case NitroType.Classic:
      return 'Nitro Classic';
    case NitroType.Nitro:
      return 'Nitro';
    case NitroType.Basic:
      return 'Nitro Basic';
    default:
      return 'None';
  }
};

export interface RateLimitConfig {
  maxRequests: number;
  perSeconds: number;
  delayMs: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  message: { maxRequests: 5, perSeconds: 5, delayMs: 1000 },
  reaction: { maxRequests: 1, perSeconds: 0.25, delayMs: 250 },
  channel_create: { maxRequests: 1, perSeconds: 2, delayMs: 2000 },
  role_create: { maxRequests: 1, perSeconds: 2, delayMs: 2000 },
  guild_update: { maxRequests: 1, perSeconds: 2, delayMs: 2000 },
  member_update: { maxRequests: 10, perSeconds: 10, delayMs: 1000 },
};

export class DiscordAPIError extends Error {
  constructor(
    message: string,
    public code?: number,
    public status?: number
  ) {
    super(message);
    this.name = 'DiscordAPIError';
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
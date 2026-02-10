
import { DEFAULT_RATE_LIMITS } from './types';


export const validateToken = (token: string): boolean => {
  if (!token || token.trim().length === 0) return false;
  
  const cleanToken = token.trim();
  return cleanToken.length >= 50;
};


export const validateSnowflake = (id: string): boolean => {
  if (!id || id.trim().length === 0) return false;
  
  const snowflakeRegex = /^\d{17,19}$/;
  return snowflakeRegex.test(id.trim());
};


export const validateWebhookUrl = (url: string): boolean => {
  if (!url || url.trim().length === 0) return false;
  
  const webhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/\d{17,19}\/[\w-]+$/;
  return webhookRegex.test(url.trim());
};


export const parseWebhookUrl = (url: string): { id: string; token: string } | null => {
  const match = url.match(/^https:\/\/discord\.com\/api\/webhooks\/(\d{17,19})\/([\w-]+)$/);
  
  if (!match) return null;
  
  return {
    id: match[1],
    token: match[2],
  };
};


export const formatAvatarUrl = (
  userId: string,
  avatarHash: string | null,
  size: number = 128,
  format: 'png' | 'jpg' | 'webp' | 'gif' = 'png'
): string => {
  if (!avatarHash) {
    const defaultAvatarNum = (BigInt(userId) >> BigInt(22)) % BigInt(6);
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNum}.png`;
  }

  const ext = avatarHash.startsWith('a_') ? 'gif' : format;
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}?size=${size}`;
};


export const formatGuildIconUrl = (
  guildId: string,
  iconHash: string | null,
  size: number = 128,
  format: 'png' | 'jpg' | 'webp' | 'gif' = 'png'
): string | null => {
  if (!iconHash) return null;

  const ext = iconHash.startsWith('a_') ? 'gif' : format;
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=${size}`;
};


export const parseEmoji = (emoji: string): { unicode: string | null; id: string | null; animated: boolean } => {
  const customEmojiMatch = emoji.match(/^<(a?):(\w+):(\d+)>$/);
  
  if (customEmojiMatch) {
    return {
      unicode: null,
      id: customEmojiMatch[3],
      animated: customEmojiMatch[1] === 'a',
    };
  }
  
  return {
    unicode: emoji,
    id: null,
    animated: false,
  };
};


export const formatEmojiForAPI = (emoji: string): string => {
  const parsed = parseEmoji(emoji);
  
  if (parsed.id) {
    return `${parsed.animated ? 'a:' : ''}emoji_name:${parsed.id}`;
  }
  
  return encodeURIComponent(emoji);
};


export const calculateRateLimitDelay = (
  actionType: string,
  customDelay?: number
): number => {
  if (customDelay !== undefined) return customDelay;
  
  const config = DEFAULT_RATE_LIMITS[actionType];
  return config ? config.delayMs : 1000;
};


export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};


export const addTimestampToLog = (message: string, locale: string = 'tr-TR'): string => {
  const timestamp = new Date().toLocaleTimeString(locale);
  return `[${timestamp}] ${message}`;
};


export const formatLogMessage = (
  type: 'success' | 'error' | 'warning' | 'info' | 'delete',
  message: string,
  includeTimestamp: boolean = true
): string => {
  const icons = {
    success: '[+]',
    error: '[ERROR]',
    warning: '[WARNING]',
    info: '[INFO]',
    delete: '[-]',
  };
  
  const formattedMessage = `${icons[type]} ${message}`;
  
  return includeTimestamp ? addTimestampToLog(formattedMessage) : formattedMessage;
};


export const parseIdList = (input: string): string[] => {
  return input
    .split(',')
    .map(id => id.trim())
    .filter(id => validateSnowflake(id));
};


export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  
  return chunks;
};


export const getPermissionString = (permissions: number): string => {
  const permissionNames: Record<number, string> = {
    0x1: 'Create Instant Invite',
    0x2: 'Kick Members',
    0x4: 'Ban Members',
    0x8: 'Administrator',
    0x10: 'Manage Channels',
    0x20: 'Manage Guild',
    0x40: 'Add Reactions',
    0x80: 'View Audit Log',
    0x400: 'View Channel',
    0x800: 'Send Messages',
    0x1000: 'Send TTS Messages',
    0x2000: 'Manage Messages',
    0x4000: 'Embed Links',
    0x8000: 'Attach Files',
    0x10000: 'Read Message History',
    0x20000: 'Mention Everyone',
    0x40000: 'Use External Emojis',
    0x100000: 'Connect',
    0x200000: 'Speak',
    0x400000: 'Mute Members',
    0x800000: 'Deafen Members',
    0x1000000: 'Move Members',
    0x2000000: 'Use VAD',
    0x4000000: 'Change Nickname',
    0x8000000: 'Manage Nicknames',
    0x10000000: 'Manage Roles',
    0x20000000: 'Manage Webhooks',
    0x40000000: 'Manage Emojis',
  };
  
  const activePermissions: string[] = [];
  
  for (const [flag, name] of Object.entries(permissionNames)) {
    if ((permissions & Number(flag)) === Number(flag)) {
      activePermissions.push(name);
    }
  }
  
  return activePermissions.join(', ') || 'None';
};


export const sanitizeInput = (input: string, maxLength: number = 2000): string => {
  return input.trim().slice(0, maxLength);
};


export const generateRandomString = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
};


export const formatNumber = (num: number, locale: string = 'tr-TR'): string => {
  return new Intl.NumberFormat(locale).format(num);
};


export const calculatePercentage = (current: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};


export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
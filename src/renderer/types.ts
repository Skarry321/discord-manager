export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  memberCount: number;
  permissions: string;
  owner: boolean;
}

const ADMIN_BIT = 8n;

export function hasAdmin(permissions: string): boolean {
  return (BigInt(permissions) & ADMIN_BIT) === ADMIN_BIT;
}

export interface DiscordGuildFull {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  banner: string | null;
  memberCount: number;
  ownerId: string;
  verificationLevel: number;
  explicitContentFilter: number;
  premiumTier: number;
  premiumSubscriberCount: number;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
  topic: string;
  nsfw: boolean;
  bitrate: number | null;
  userLimit: number;
  rateLimitPerUser: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  mentionable: boolean;
  position: number;
  permissions: string;
  icon: string | null;
  managed: boolean;
  tags: any;
}

export interface DiscordMember {
  id: string;
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    bot: boolean;
  };
  nickname: string | null;
  roles: Array<{ id: string; name: string; color: number }>;
  joinedAt: string;
  premiumSince: string | null;
  permissions: string;
  manageable: boolean;
  kickable: boolean;
  bannable: boolean;
}

export interface DiscordBan {
  user: { id: string; username: string; avatar: string | null };
  reason: string | null;
}

export interface PermissionInfo {
  key: string;
  bit: string;
  label: string;
}

declare global {
  interface Window {
    api: {
      connect: (token: string, isBot?: boolean) => Promise<{ success: boolean; error?: string }>;
      disconnect: () => Promise<{ success: boolean }>;
      getStatus: () => Promise<{ connected: boolean }>;

      getSavedToken: () => Promise<{ token: string | null; isBot: boolean }>;
      saveToken: (token: string, isBot?: boolean) => Promise<{ success: boolean }>;
      getPinned: () => Promise<{ pinned: string[] }>;
      togglePin: (serverId: string) => Promise<{ pinned: string[] }>;
      onMemberCounts: (callback: (data: Record<string, number>) => void) => () => void;

      getGuilds: () => Promise<{ success: boolean; data?: DiscordGuild[]; error?: string }>;
      getGuild: (id: string) => Promise<{ success: boolean; data?: DiscordGuildFull; error?: string }>;

      getChannels: (guildId: string) => Promise<{ success: boolean; data?: DiscordChannel[]; error?: string }>;
      createChannel: (guildId: string, name: string, type: number, options?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      editChannel: (channelId: string, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteChannel: (channelId: string) => Promise<{ success: boolean; error?: string }>;
      deleteChannels: (channelIds: string[]) => Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }>;
      bulkEditChannels: (channelIds: string[], data: any) => Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }>;

      getRoles: (guildId: string) => Promise<{ success: boolean; data?: DiscordRole[]; error?: string }>;
      createRole: (guildId: string, data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      editRole: (guildId: string, roleId: string, data: any) => Promise<{ success: boolean; error?: string }>;
      deleteRole: (guildId: string, roleId: string) => Promise<{ success: boolean; error?: string }>;
      deleteRoles: (guildId: string, roleIds: string[]) => Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }>;
      bulkEditRoles: (guildId: string, roleIds: string[], data: any) => Promise<{ success: string[]; failed: Array<{ id: string; error: string }> }>;

      getMembers: (guildId: string) => Promise<{ success: boolean; data?: DiscordMember[]; error?: string }>;
      kickMember: (guildId: string, userId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
      banMember: (guildId: string, userId: string, reason?: string) => Promise<{ success: boolean; error?: string }>;
      unbanMember: (guildId: string, userId: string) => Promise<{ success: boolean; error?: string }>;
      getBans: (guildId: string) => Promise<{ success: boolean; data?: DiscordBan[]; error?: string }>;
      setMemberRoles: (guildId: string, userId: string, roleIds: string[]) => Promise<{ success: boolean; error?: string }>;
      addMemberRole: (guildId: string, userId: string, roleId: string) => Promise<{ success: boolean; error?: string }>;
      removeMemberRole: (guildId: string, userId: string, roleId: string) => Promise<{ success: boolean; error?: string }>;

      editGuild: (guildId: string, data: any) => Promise<{ success: boolean; error?: string }>;
      getPermissionsList: () => Promise<PermissionInfo[]>;
    };
  }
}

export const CHANNEL_TYPES: { [key: number]: string } = {
  0: 'Text',
  2: 'Voice',
  4: 'Category',
  5: 'Announcement',
  13: 'Stage',
  15: 'Forum',
};

export function channelIcon(type: number): string {
  const icons: { [key: number]: string } = {
    0: '\u0023\uFE0F\u20E3',
    2: '\uD83D\uDD0A',
    4: '\uD83D\uDCC1',
    5: '\uD83D\uDCE2',
    13: '\uD83C\uDFA4',
    15: '\uD83D\uDCAC',
  };
  return icons[type] || '\u0023';
}

export type ViewType = 'dashboard' | 'channels' | 'roles' | 'members' | 'settings' | 'bans';

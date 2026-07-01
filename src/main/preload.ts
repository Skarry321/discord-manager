import { contextBridge, ipcRenderer } from 'electron';

const api = {
  connect: (token: string, isBot?: boolean) => ipcRenderer.invoke('connect', token, isBot),
  disconnect: () => ipcRenderer.invoke('disconnect'),
  getStatus: () => ipcRenderer.invoke('get-status'),
  getSavedToken: () => ipcRenderer.invoke('get-saved-token'),
  saveToken: (token: string, isBot?: boolean) => ipcRenderer.invoke('save-token', token, isBot),
  getPinned: () => ipcRenderer.invoke('get-pinned'),
  togglePin: (serverId: string) => ipcRenderer.invoke('toggle-pin', serverId),

  getGuilds: () => ipcRenderer.invoke('get-guilds'),
  getGuild: (id: string) => ipcRenderer.invoke('get-guild', id),

  getChannels: (guildId: string) => ipcRenderer.invoke('get-channels', guildId),
  createChannel: (guildId: string, name: string, type: number, options?: any) => ipcRenderer.invoke('create-channel', guildId, name, type, options),
  editChannel: (channelId: string, data: any) => ipcRenderer.invoke('edit-channel', channelId, data),
  deleteChannel: (channelId: string) => ipcRenderer.invoke('delete-channel', channelId),
  deleteChannels: (channelIds: string[]) => ipcRenderer.invoke('delete-channels', channelIds),
  bulkEditChannels: (channelIds: string[], data: any) => ipcRenderer.invoke('bulk-edit-channels', channelIds, data),

  getRoles: (guildId: string) => ipcRenderer.invoke('get-roles', guildId),
  createRole: (guildId: string, data: any) => ipcRenderer.invoke('create-role', guildId, data),
  editRole: (guildId: string, roleId: string, data: any) => ipcRenderer.invoke('edit-role', guildId, roleId, data),
  deleteRole: (guildId: string, roleId: string) => ipcRenderer.invoke('delete-role', guildId, roleId),
  deleteRoles: (guildId: string, roleIds: string[]) => ipcRenderer.invoke('delete-roles', guildId, roleIds),
  bulkEditRoles: (guildId: string, roleIds: string[], data: any) => ipcRenderer.invoke('bulk-edit-roles', guildId, roleIds, data),

  getMembers: (guildId: string) => ipcRenderer.invoke('get-members', guildId),
  kickMember: (guildId: string, userId: string, reason?: string) => ipcRenderer.invoke('kick-member', guildId, userId, reason),
  banMember: (guildId: string, userId: string, reason?: string) => ipcRenderer.invoke('ban-member', guildId, userId, reason),
  unbanMember: (guildId: string, userId: string) => ipcRenderer.invoke('unban-member', guildId, userId),
  getBans: (guildId: string) => ipcRenderer.invoke('get-bans', guildId),
  setMemberRoles: (guildId: string, userId: string, roleIds: string[]) => ipcRenderer.invoke('set-member-roles', guildId, userId, roleIds),
  addMemberRole: (guildId: string, userId: string, roleId: string) => ipcRenderer.invoke('add-member-role', guildId, userId, roleId),
  removeMemberRole: (guildId: string, userId: string, roleId: string) => ipcRenderer.invoke('remove-member-role', guildId, userId, roleId),

  editGuild: (guildId: string, data: any) => ipcRenderer.invoke('edit-guild', guildId, data),
  getPermissionsList: () => ipcRenderer.invoke('get-permissions-list'),
  getBotStats: (guildId: string) => ipcRenderer.invoke('get-bot-stats', guildId),
  getAllBotStats: () => ipcRenderer.invoke('get-all-bot-stats'),
  isBotRunning: () => ipcRenderer.invoke('is-bot-running'),
  getBotLogs: () => ipcRenderer.invoke('get-bot-logs'),

  onMemberCounts: (callback: (data: Record<string, number>) => void) => {
    const handler = (_event: any, data: Record<string, number>) => callback(data);
    ipcRenderer.on('member-counts', handler);
    return () => ipcRenderer.removeListener('member-counts', handler);
  },
};

contextBridge.exposeInMainWorld('api', api);

import { invoke } from '@tauri-apps/api/core';

export const runPowerShell = async (command: string): Promise<string> => {
  return await invoke<string>('run_powershell', { command });
};

export const startService = async (serviceName: string): Promise<string> => {
  return await invoke<string>('start_service', { serviceName });
};

export const stopService = async (serviceName: string): Promise<string> => {
  return await invoke<string>('stop_service', { serviceName });
};

export const getServiceStatus = async (serviceName: string): Promise<string> => {
  return await invoke<string>('get_service_status', { serviceName });
};

export const listServices = async (): Promise<string> => {
  return await invoke<string>('list_services');
};

export const getServiceDetails = async (serviceName: string): Promise<string> => {
  return await invoke<string>('get_service_details', { serviceName });
};

export const setServiceStartupType = async (serviceName: string, startupType: string): Promise<string> => {
  return await invoke<string>('set_service_startup_type', { serviceName, startupType });
};

export const restartService = async (serviceName: string): Promise<string> => {
  return await invoke<string>('restart_service', { serviceName });
};

export const createRestorePoint = async (): Promise<string> => {
  return await invoke<string>('create_restore_point');
};

export const listRestorePoints = async (): Promise<string> => {
  return await invoke<string>('list_restore_points');
};

export const restoreSystem = async (sequenceNumber: number): Promise<string> => {
  return await invoke<string>('restore_system', { sequenceNumber });
};

export const deleteRestorePoint = async (sequenceNumber: number): Promise<string> => {
  return await invoke<string>('delete_restore_point', { sequenceNumber });
};

export const readRegistry = async (
  hive: string,
  path: string,
  name: string
): Promise<string> => {
  return await invoke<string>('read_registry', { hive, path, name });
};

export const writeRegistry = async (
  hive: string,
  path: string,
  name: string,
  value: string
): Promise<string> => {
  return await invoke<string>('write_registry', { hive, path, name, value });
};

export const getSystemInfo = async (): Promise<string> => {
  return await invoke<string>('get_system_info');
};

export const getDiskUsage = async (): Promise<string> => {
  return await invoke<string>('get_disk_usage');
};

export const clearTempFiles = async (): Promise<string> => {
  return await invoke<string>('clear_temp_files');
};

export const checkWindowsUpdates = async (): Promise<string> => {
  return await invoke<string>('check_windows_updates');
};

export const disableTelemetry = async (): Promise<string> => {
  return await invoke<string>('disable_telemetry');
};

export const getDefenderStatus = async (): Promise<string> => {
  return await invoke<string>('get_defender_status');
};

export const toggleLocationServices = async (enabled: boolean): Promise<string> => {
  return await invoke<string>('toggle_location_services', { enabled });
};

export const toggleCameraAccess = async (enabled: boolean): Promise<string> => {
  return await invoke<string>('toggle_camera_access', { enabled });
};

export const toggleMicrophoneAccess = async (enabled: boolean): Promise<string> => {
  return await invoke<string>('toggle_microphone_access', { enabled });
};

export const clearActivityHistory = async (): Promise<string> => {
  return await invoke<string>('clear_activity_history');
};

export const clearBrowserData = async (browser: string, dataTypes: string[]): Promise<string> => {
  return await invoke<string>('clear_browser_data', { browser, dataTypes });
};

export const disableRecall = async (): Promise<string> => {
  return await invoke<string>('disable_recall');
};

export const disableTelemetryAdvanced = async (): Promise<string> => {
  return await invoke<string>('disable_telemetry_advanced');
};

export const removeOneDrive = async (): Promise<string> => {
  return await invoke<string>('remove_onedrive');
};

export const disableLocationTrackingAdvanced = async (): Promise<string> => {
  return await invoke<string>('disable_location_tracking_advanced');
};

export const removeHomeGallery = async (): Promise<string> => {
  return await invoke<string>('remove_home_gallery');
};

export const disableTeredo = async (): Promise<string> => {
  return await invoke<string>('disable_teredo');
};

export const blockAdobeNetwork = async (): Promise<string> => {
  return await invoke<string>('block_adobe_network');
};

export const debloatAdobe = async (): Promise<string> => {
  return await invoke<string>('debloat_adobe');
};

export const disableConsumerFeatures = async (): Promise<string> => {
  return await invoke<string>('disable_consumer_features');
};

export const disableGameDvr = async (): Promise<string> => {
  return await invoke<string>('disable_game_dvr');
};

export const disableHibernation = async (): Promise<string> => {
  return await invoke<string>('disable_hibernation');
};

export const listStartupPrograms = async (): Promise<string> => {
  return await invoke<string>('list_startup_programs');
};

export const toggleStartupProgram = async (name: string, location: string, command: string, enabled: boolean): Promise<string> => {
  return await invoke<string>('toggle_startup_program', { name, location, command, enabled });
};

export const listNetworkAdapters = async (): Promise<string> => {
  return await invoke<string>('list_network_adapters');
};

export const flushDnsCache = async (): Promise<string> => {
  return await invoke<string>('flush_dns_cache');
};

export const listProcesses = async (): Promise<string> => {
  return await invoke<string>('list_processes');
};

export const killProcess = async (processId: number): Promise<string> => {
  return await invoke<string>('kill_process', { processId });
};

export const getCpuUsage = async (): Promise<string> => {
  return await invoke<string>('get_cpu_usage');
};

export const getMemoryUsage = async (): Promise<string> => {
  return await invoke<string>('get_memory_usage');
};

export const getDiskInfo = async (): Promise<string> => {
  return await invoke<string>('get_disk_info');
};

export const getBatteryStatus = async (): Promise<string> => {
  return await invoke<string>('get_battery_status');
};

export const getNetworkStats = async (): Promise<string> => {
  return await invoke<string>('get_network_stats');
};

export const getUptime = async (): Promise<string> => {
  return await invoke<string>('get_uptime');
};

export const getDetailedSpecs = async () => {
  return await invoke<string>('get_detailed_specs');
};

export const checkSsdHealth = async () => {
  return await invoke<string>('check_ssd_health');
};

export const getFirewallStatus = async (): Promise<string> => {
  return await invoke<string>('get_firewall_status');
};

export const setDns = async (dnsType: string): Promise<string> => {
  return await invoke<string>('set_dns', { dnsType });
};

export const getActiveConnections = async (): Promise<string> => {
  return await invoke<string>('get_active_connections');
};

export const disconnectNetwork = async (connectionName: string, connectionType: string): Promise<string> => {
  return await invoke<string>('disconnect_network', { connectionName, connectionType });
};

export const getRouterInfo = async (): Promise<string> => {
  return await invoke<string>('get_router_info');
};

export const getLastUpdateTime = async (): Promise<string> => {
  return await invoke<string>('get_last_update_time');
};

export const optimizeSsd = async (): Promise<string> => {
  return await invoke<string>('optimize_ssd');
};

export const rebuildSearchIndex = async (): Promise<string> => {
  return await invoke<string>('rebuild_search_index');
};

export const runDiskCleanup = async (): Promise<string> => {
  return await invoke<string>('run_disk_cleanup');
};

export const setPowerPlan = async (highPerformance: boolean): Promise<string> => {
  return await invoke<string>('set_power_plan', { highPerformance });
};

export const getCurrentPowerPlan = async (): Promise<string> => {
  return await invoke<string>('get_current_power_plan');
};

export const addUltimatePowerPlan = async (): Promise<string> => {
  return await invoke<string>('add_ultimate_power_plan');
};

export const removeUltimatePowerPlan = async (): Promise<string> => {
  return await invoke<string>('remove_ultimate_power_plan');
};

export const removeAdobeCreativeCloud = async (): Promise<string> => {
  return await invoke<string>('remove_adobe_creative_cloud');
};

export const resetNetwork = async (): Promise<string> => {
  return await invoke<string>('reset_network');
};

export const resetWindowsUpdate = async (): Promise<string> => {
  return await invoke<string>('reset_windows_update');
};

export const setupAutologin = async (username: string, password: string): Promise<string> => {
  return await invoke<string>('setup_autologin', { username, password });
};

export const runSystemCorruptionScan = async (): Promise<string> => {
  return await invoke<string>('run_system_corruption_scan');
};

export const reinstallWinget = async (): Promise<string> => {
  return await invoke<string>('reinstall_winget');
};

export const setServicesManual = async (): Promise<string> => {
  return await invoke<string>('set_services_manual');
};

export const enableAutostart = async (enabled: boolean): Promise<string> => {
  return await invoke<string>('enable_autostart', { enabled });
};

export const installWingetPackage = async (packageId: string): Promise<string> => {
  return await invoke<string>('install_winget_package', { packageId });
};

export const updateWingetPackage = async (packageId: string): Promise<string> => {
  return await invoke<string>('update_winget_package', { packageId });
};

export const uninstallWingetPackage = async (packageId: string): Promise<string> => {
  return await invoke<string>('uninstall_winget_package', { packageId });
};

export const getInstalledApps = async (): Promise<string> => {
  return await invoke<string>('get_installed_apps');
};

export const getAppxPackages = async (): Promise<string> => {
  return await invoke<string>('get_appx_packages');
};

export const removeAppxPackage = async (packageFullName: string): Promise<string> => {
  return await invoke<string>('remove_appx_package', { packageFullName });
};

export interface CloneOptions {
  serverName: boolean;
  serverIcon: boolean;
  roles: boolean;
  channels: boolean;
  emojis: boolean;
  channelPermissions: boolean;
}

export const cloneDiscordServer = async (
  userToken: string,
  sourceServerId: string,
  targetServerId: string,
  options: CloneOptions
): Promise<string> => {
  return await invoke<string>('clone_discord_server', {
    userToken,
    sourceServerId,
    targetServerId,
    options
  });
};

export interface MessageCloneOptions {
  messageLimit: number;
  cloneEmbeds: boolean;
  cloneAttachments: boolean;
  delayMs: number;
  skipBots: boolean;
  onlyWithAttachments: boolean;
}

export const cloneMessages = async (
  userToken: string,
  sourceChannelId: string,
  webhookUrl: string,
  options: MessageCloneOptions
): Promise<string> => {
  return await invoke<string>('clone_messages', {
    userToken,
    sourceChannelId,
    webhookUrl,
    options
  });
};

export const startLiveMessageCloner = async (
  userToken: string,
  sourceChannelId: string,
  webhookUrl: string
): Promise<string> => {
  return await invoke<string>('start_live_message_cloner', {
    userToken,
    sourceChannelId,
    webhookUrl
  });
};

export const stopLiveMessageCloner = async (): Promise<string> => {
  return await invoke<string>('stop_live_message_cloner');
};

export const cancelMessageClone = async (): Promise<string> => {
  return await invoke<string>('cancel_message_clone');
};

export const cancelDiscordClone = async (): Promise<string> => {
  return await invoke<string>('cancel_discord_clone');
};

export const generateSystemReport = async (): Promise<string> => {
  return await invoke<string>('generate_system_report');
};

export const openSystemInfo = async (): Promise<string> => {
  return await invoke<string>('open_system_info');
};

export const getTokenInfo = async (userToken: string): Promise<string> => {
  return await invoke<string>('get_token_info', { userToken });
};

export const grabAvatar = async (userToken: string, userId: string, size: number = 128): Promise<string> => {
  return await invoke<string>('grab_avatar', { userToken, userId, size });
};

export const checkDiscordToken = async (userToken: string): Promise<string> => {
  return await invoke<string>('check_token', { userToken });
};

export const getDiscordTokenInfo = async (userToken: string): Promise<string> => {
  return await invoke<string>('get_token_info', { userToken });
};

export const grabDiscordAvatar = async (userToken: string, userId: string, size: number = 128): Promise<string> => {
  return await invoke<string>('grab_avatar', { userToken, userId, size });
};

export const scrapeGuildMembers = async (
  userToken: string,
  guildId: string,
  options: any
): Promise<string> => {
  return await invoke<string>('scrape_guild_members', { userToken, guildId, options });
};

export const cancelMemberScraper = async (): Promise<string> => {
  return await invoke<string>('cancel_member_scraper');
};

export const spamReactions = async (
  userToken: string,
  channelId: string,
  messageId: string,
  emojis: string[],
  delayMs: number
): Promise<string> => {
  return await invoke<string>('spam_reactions', { userToken, channelId, messageId, emojis, delayMs });
};

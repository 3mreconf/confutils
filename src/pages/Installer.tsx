import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Download, 
  Loader2, 
  Globe, 
  MessageCircle, 
  Gamepad2, 
  Film, 
  Code2, 
  FileText, 
  Wrench, 
  Cpu, 
  Shield, 
  Palette, 
  Cloud, 
  Box,
  Package,
  RefreshCw,
  Trash2,
  History,
  Search,
  ShieldAlert,
  ShieldCheck,
  FolderSearch,
  HardDrive,
  Monitor,
  AlertTriangle
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  installWingetPackage,
  getInstalledApps,
  updateWingetPackage,
  uninstallWingetPackage,
  listStartupPrograms,
  applyHostsBlocklist,
  removeHostsBlocklist,
  getHostsBlocklistStatus,
  applyPrivacyFirewallRules,
  removePrivacyFirewallRules,
  getPrivacyFirewallStatus,
  openDeviceManager,
  scanDeviceIssues,
  scanAppLeftovers,
  applyStorageSenseProfile,
  runPrivacyAudit,
  disableStorageSense,
  scanHiddenServices,
  analyzeJunkOrigins,
  applyPowerAudioOptimizations,
  revertPowerAudioOptimizations,
  monitorAppUsage
} from '../utils/tauri';
import { UpdateModal } from '../components/Installer/UpdateModal';
import './Installer.css';

const SOFTWARE_LIST = [
  { 
    category: 'Browsers', 
    icon: Globe,
    apps: [
      { id: 'Google.Chrome', name: 'Google Chrome' },
      { id: 'Mozilla.Firefox', name: 'Mozilla Firefox' },
      { id: 'Brave.Brave', name: 'Brave Browser' },
      { id: 'Microsoft.Edge', name: 'Microsoft Edge' },
      { id: 'Opera.Opera', name: 'Opera Browser' },
      { id: 'Opera.OperaGX', name: 'Opera GX' },
      { id: 'Vivaldi.Vivaldi', name: 'Vivaldi' },
      { id: 'LibreWolf.LibreWolf', name: 'LibreWolf' },
      { id: 'TorProject.TorBrowser', name: 'Tor Browser' },
      { id: 'Waterfox.Waterfox', name: 'Waterfox' }
    ]
  },
  {
    category: 'Communication',
    icon: MessageCircle,
    apps: [
      { id: 'Discord.Discord', name: 'Discord' },
      { id: 'Telegram.TelegramDesktop', name: 'Telegram' },
      { id: '9NKSQGP7F2NH', name: 'WhatsApp' },
      { id: 'Zoom.Zoom', name: 'Zoom' },
      { id: 'SlackTechnologies.Slack', name: 'Slack' },
      { id: 'Microsoft.Teams', name: 'Microsoft Teams' },
      { id: 'OpenWhisperSystems.Signal', name: 'Signal' },
      { id: 'Mozilla.Thunderbird', name: 'Thunderbird' },
      { id: 'Microsoft.Skype', name: 'Skype' },
      { id: 'Element.Element', name: 'Element' }
    ]
  },
  { 
    category: 'Gaming', 
    icon: Gamepad2,
    apps: [
      { id: 'Valve.Steam', name: 'Steam' },
      { id: 'EpicGames.EpicGamesLauncher', name: 'Epic Games' },
      { id: 'GOG.Galaxy', name: 'GOG Galaxy' },
      { id: 'Ubisoft.Connect', name: 'Ubisoft Connect' },
      { id: 'ElectronicArts.EADesktop', name: 'EA App' },
      { id: 'Blizzard.BattleNet', name: 'Battle.net' },
      { id: 'ItchIo.Itch', name: 'Itch.io' },
      { id: 'MoonlightGameStreaming.Moonlight', name: 'Moonlight' },
      { id: 'Parsec.Parsec', name: 'Parsec' },
      { id: 'HeroicGamesLauncher.HeroicGamesLauncher', name: 'Heroic Launcher' }
    ]
  },
  {
    category: 'Media',
    icon: Film,
    apps: [
      { id: 'VideoLAN.VLC', name: 'VLC Media Player' },
      { id: 'Spotify.Spotify', name: 'Spotify' },
      { id: 'OBSProject.OBSStudio', name: 'OBS Studio' },
      { id: 'GIMP.GIMP', name: 'GIMP' },
      { id: 'Audacity.Audacity', name: 'Audacity' },
      { id: 'HandBrake.HandBrake', name: 'HandBrake' },
      { id: 'CodecGuide.K-LiteCodecPack.Full', name: 'K-Lite Codec Pack' },
      { id: 'Foobar2000.Foobar2000', name: 'Foobar2000' },
      { id: 'Mp3tag.Mp3tag', name: 'Mp3tag' },
      { id: 'IrfanSkiljan.IrfanView', name: 'IrfanView' },
      { id: 'ShutterEncoder.ShutterEncoder', name: 'Shutter Encoder' }
    ]
  },
  { 
    category: 'Creative',
    icon: Palette,
    apps: [
      { id: 'BlenderFoundation.Blender', name: 'Blender' },
      { id: 'Figma.Figma', name: 'Figma' },
      { id: 'Inkscape.Inkscape', name: 'Inkscape' },
      { id: 'Krita.Krita', name: 'Krita' },
      { id: 'PaintDotNet.PaintDotNet', name: 'Paint.NET' },
      { id: 'Canva.Canva', name: 'Canva' },
      { id: 'Darktable.Darktable', name: 'Darktable' },
      { id: 'Scribus.Scribus', name: 'Scribus' }
    ]
  },
  {
    category: 'Development',
    icon: Code2,
    apps: [
      { id: 'Microsoft.VisualStudioCode', name: 'VS Code' },
      { id: 'Git.Git', name: 'Git' },
      { id: 'OpenJS.NodeJS.LTS', name: 'Node.js (LTS)' },
      { id: 'Python.Python.3.13', name: 'Python 3.13' },
      { id: 'Notepad++.Notepad++', name: 'Notepad++' },
      { id: 'Docker.DockerDesktop', name: 'Docker Desktop' },
      { id: 'Postman.Postman', name: 'Postman' },
      { id: 'JetBrains.IntelliJIDEA.Community', name: 'IntelliJ IDEA (Comm)' },
      { id: 'JetBrains.PyCharm.Community', name: 'PyCharm (Comm)' },
      { id: 'Microsoft.PowerToys', name: 'PowerToys' },
      { id: 'Microsoft.OpenJDK.17', name: 'OpenJDK 17' },
      { id: 'GitHub.GitHubDesktop', name: 'GitHub Desktop' },
      { id: 'SublimeHQ.SublimeText.4', name: 'Sublime Text' },
      { id: 'GoLang.Go', name: 'Go' },
      { id: 'Rustlang.Rustup', name: 'Rustup' },
      { id: 'Anaconda.Anaconda3', name: 'Anaconda' }
    ]
  },
  { 
    category: 'Documents', 
    icon: FileText,
    apps: [
      { id: 'TheDocumentFoundation.LibreOffice', name: 'LibreOffice' },
      { id: 'Adobe.Acrobat.Reader.64-bit', name: 'Adobe Reader DC' },
      { id: 'Notion.Notion', name: 'Notion' },
      { id: 'Obsidian.Obsidian', name: 'Obsidian' },
      { id: 'Foxit.FoxitReader', name: 'Foxit PDF Reader' },
      { id: 'Evernote.Evernote', name: 'Evernote' },
      { id: 'Microsoft.Office', name: 'Microsoft 365 (Office)' },
      { id: 'Joplin.Joplin', name: 'Joplin' },
      { id: 'Anytype.Anytype', name: 'Anytype' }
    ]
  },
  {
    category: 'Security',
    icon: Shield,
    apps: [
      { id: 'Malwarebytes.Malwarebytes', name: 'Malwarebytes' },
      { id: 'Bitwarden.Bitwarden', name: 'Bitwarden' },
      { id: 'KeePassXCTeam.KeePassXC', name: 'KeePassXC' },
      { id: 'ProtonTechnologies.ProtonVPN', name: 'ProtonVPN' },
      { id: 'MullvadVPN.MullvadVPN', name: 'Mullvad VPN' },
      { id: 'WiresharkFoundation.Wireshark', name: 'Wireshark' }
    ]
  },
  {
    category: 'Tools',
    icon: Wrench,
    apps: [
      { id: '7zip.7zip', name: '7-Zip' },
      { id: 'AnyDesk.AnyDesk', name: 'AnyDesk' },
      { id: 'TeamViewer.TeamViewer', name: 'TeamViewer' },
      { id: 'BleachBit.BleachBit', name: 'BleachBit' },
      { id: 'CPUID.CPU-Z', name: 'CPU-Z' },
      { id: 'TechPowerUp.GPU-Z', name: 'GPU-Z' },
      { id: 'CPUID.HWMonitor', name: 'HWMonitor' },
      { id: 'Rufus.Rufus', name: 'Rufus' },
      { id: 'Balena.Etcher', name: 'Balena Etcher' },
      { id: 'WinDirStat.WinDirStat', name: 'WinDirStat' },
      { id: 'CrystalDewWorld.CrystalDiskInfo', name: 'CrystalDiskInfo' },
      { id: 'CrystalDewWorld.CrystalDiskMark', name: 'CrystalDiskMark' },
      { id: 'ShareX.ShareX', name: 'ShareX' },
      { id: 'Greenshot.Greenshot', name: 'Greenshot' },
      { id: 'AutoHotkey.AutoHotkey', name: 'AutoHotkey' },
      { id: 'JAMSoftware.TreeSize.Free', name: 'TreeSize Free' }
    ]
  },
  {
    category: 'Cloud',
    icon: Cloud,
    apps: [
      { id: 'Google.GoogleDrive', name: 'Google Drive' },
      { id: 'Dropbox.Dropbox', name: 'Dropbox' },
      { id: 'Nextcloud.NextcloudDesktop', name: 'Nextcloud' },
      { id: 'Mega.MEGASync', name: 'MEGA' }
    ]
  },
  {
    category: 'Virtualization',
    icon: Box,
    apps: [
      { id: 'Oracle.VirtualBox', name: 'VirtualBox' },
      { id: 'VMware.WorkstationPlayer', name: 'VMware Player' }
    ]
  },
  { 
    category: 'Runtimes', 
    icon: Cpu,
    apps: [
      { id: 'Microsoft.DotNet.DesktopRuntime.6', name: '.NET Runtime 6' },
      { id: 'Microsoft.DotNet.DesktopRuntime.7', name: '.NET Runtime 7' },
      { id: 'Microsoft.DotNet.DesktopRuntime.8', name: '.NET Runtime 8' },
      { id: 'Microsoft.VC++2015-2022Redist-x64', name: 'VC++ Redist' },
      { id: 'Oracle.JavaRuntimeEnvironment', name: 'Java Runtime (JRE)' },
      { id: 'Microsoft.DirectX', name: 'DirectX Runtime' }
    ]
  }
];

interface InstalledApp {
  Id: string;
  Version: string;
  Available: string;
  Name?: string;
}

interface InstallationHistory {
  appId: string;
  action: 'install' | 'update' | 'uninstall';
  timestamp: string;
  success: boolean;
}

interface StartupProgram {
  Name: string;
  Command: string;
  Location: string;
  Enabled: boolean;
}

interface DeviceIssue {
  FriendlyName?: string;
  InstanceId?: string;
  Class?: string;
  Status?: string;
}

interface AppLeftoverResult {
  files: string[];
  registry: string[];
}

interface PrivacyAuditFinding {
  id: string;
  title: string;
  enabled: boolean;
  detail: string;
}

interface PrivacyAuditResult {
  score: number;
  findings: PrivacyAuditFinding[];
}

interface HiddenService {
  Name?: string;
  DisplayName?: string;
  PathName?: string;
  StartMode?: string;
  State?: string;
}

interface JunkOrigin {
  Name?: string;
  Path?: string;
  SizeMB?: number;
}

interface AppUsage {
  Name?: string;
  Cpu?: number;
  MemoryMB?: number;
}

const Installer: React.FC = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'install' | 'installed' | 'updates' | 'history' | 'utilities'>('install');
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [installing, setInstalling] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<InstallationHistory[]>([]);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [updatingApp, setUpdatingApp] = useState<{ id: string; name?: string } | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  const [startupPrograms, setStartupPrograms] = useState<StartupProgram[]>([]);
  const [startupLoading, setStartupLoading] = useState(false);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [leftoverAppId, setLeftoverAppId] = useState<string>('');
  const [leftoverResult, setLeftoverResult] = useState<AppLeftoverResult | null>(null);
  const [leftoverLoading, setLeftoverLoading] = useState(false);
  const [deviceIssues, setDeviceIssues] = useState<DeviceIssue[]>([]);
  const [deviceScanLoading, setDeviceScanLoading] = useState(false);
  const [hostsAdsEnabled, setHostsAdsEnabled] = useState(false);
  const [hostsTelemetryEnabled, setHostsTelemetryEnabled] = useState(false);
  const [hostsLoading, setHostsLoading] = useState(false);
  const [firewallEnabled, setFirewallEnabled] = useState(false);
  const [firewallLoading, setFirewallLoading] = useState(false);
  const [storageProfile, setStorageProfile] = useState<'light' | 'balanced' | 'aggressive'>('balanced');
  const [storageLoading, setStorageLoading] = useState(false);
  const [privacyAudit, setPrivacyAudit] = useState<PrivacyAuditResult | null>(null);
  const [privacyAuditLoading, setPrivacyAuditLoading] = useState(false);
  const [hiddenServices, setHiddenServices] = useState<HiddenService[]>([]);
  const [hiddenServicesLoading, setHiddenServicesLoading] = useState(false);
  const [junkOrigins, setJunkOrigins] = useState<JunkOrigin[]>([]);
  const [junkOriginsLoading, setJunkOriginsLoading] = useState(false);
  const [powerAudioLoading, setPowerAudioLoading] = useState(false);
  const [appUsage, setAppUsage] = useState<AppUsage[]>([]);
  const [appUsageLoading, setAppUsageLoading] = useState(false);
  const fetchingRef = useRef(false);

  const toggleApp = (id: string) => {
    if (selectedApps.includes(id)) {
      setSelectedApps(selectedApps.filter(appId => appId !== id));
    } else {
      setSelectedApps([...selectedApps, id]);
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const fetchInstalledApps = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingInstalled(true);
    
    try {
      const result = await getInstalledApps();
      let parsed: InstalledApp[] = [];
      
      if (result && result.trim() !== '' && result.trim() !== '[]') {
        try {
          const jsonResult = JSON.parse(result);
          if (Array.isArray(jsonResult)) {
            parsed = jsonResult;
          } else if (jsonResult && typeof jsonResult === 'object' && Array.isArray(jsonResult.Apps)) {
            parsed = jsonResult.Apps;
          } else if (jsonResult && typeof jsonResult === 'object' && jsonResult.Success === false) {
            const errorMsg = jsonResult.Error || 'Unknown error';
            console.warn('Winget error:', errorMsg);
            if (!errorMsg.includes('bulunamadı') && !errorMsg.includes('not found')) {
              showNotification('warning', t('warning') || 'Warning', errorMsg);
            }
            parsed = [];
          } else {
            parsed = [];
          }
        } catch (parseError) {
          console.error('Failed to parse installed apps:', parseError, 'Result:', result);
          parsed = [];
        }
      }
      
      setInstalledApps(parsed);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Failed to fetch installed apps:', errorMsg);
      if (errorMsg.includes('Winget')) {
        showNotification('error', t('error') || 'Error', errorMsg);
      }
      setInstalledApps([]);
    } finally {
      setLoadingInstalled(false);
      fetchingRef.current = false;
    }
  }, [showNotification, t]);

  useEffect(() => {
    if (activeTab === 'installed' || activeTab === 'updates') {
      fetchInstalledApps();
    }
  }, [activeTab, fetchInstalledApps]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('confutils_install_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch {
        setHistory([]);
      }
    }
  }, []);

  const addToHistory = (appId: string, action: 'install' | 'update' | 'uninstall', success: boolean) => {
    const newHistory: InstallationHistory = {
      appId,
      action,
      timestamp: new Date().toISOString(),
      success
    };
    const updatedHistory = [newHistory, ...history].slice(0, 100);
    setHistory(updatedHistory);
    localStorage.setItem('confutils_install_history', JSON.stringify(updatedHistory));
  };

  const getStartupImpact = (program: StartupProgram) => {
    let score = 0;
    const name = program.Name.toLowerCase();
    const command = program.Command.toLowerCase();
    const location = program.Location.toLowerCase();

    if (program.Enabled) score += 2;
    if (name.includes('update') || name.includes('helper') || name.includes('agent')) score += 1;
    if (command.includes('update') || command.includes('updater')) score += 1;
    if (location.includes('run')) score += 1;
    if (command.length > 80) score += 1;

    if (score >= 4) return { level: 'high', score };
    if (score >= 2) return { level: 'medium', score };
    return { level: 'low', score };
  };

  const fetchStartupPrograms = useCallback(async () => {
    setStartupLoading(true);
    setStartupError(null);
    try {
      const result = await listStartupPrograms();
      const parsed = JSON.parse(result || '[]');
      if (Array.isArray(parsed)) {
        setStartupPrograms(parsed as StartupProgram[]);
      } else {
        setStartupPrograms([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setStartupPrograms([]);
      setStartupError(message);
    } finally {
      setStartupLoading(false);
    }
  }, []);

  const loadHostsStatus = useCallback(async () => {
    setHostsLoading(true);
    try {
      const [adsStatus, telemetryStatus] = await Promise.all([
        getHostsBlocklistStatus('ads'),
        getHostsBlocklistStatus('telemetry')
      ]);
      setHostsAdsEnabled(adsStatus.trim().toLowerCase() === 'true');
      setHostsTelemetryEnabled(telemetryStatus.trim().toLowerCase() === 'true');
    } catch (error) {
      console.error(error);
    } finally {
      setHostsLoading(false);
    }
  }, []);

  const loadFirewallStatus = useCallback(async () => {
    setFirewallLoading(true);
    try {
      const status = await getPrivacyFirewallStatus();
      setFirewallEnabled(status.trim().toLowerCase() === 'true');
    } catch (error) {
      console.error(error);
    } finally {
      setFirewallLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'utilities') {
      fetchInstalledApps();
      fetchStartupPrograms();
      loadHostsStatus();
      loadFirewallStatus();
    }
  }, [activeTab, fetchInstalledApps, fetchStartupPrograms, loadHostsStatus, loadFirewallStatus]);

  const handleToggleHostsBlocklist = async (listType: 'ads' | 'telemetry', enabled: boolean) => {
    try {
      if (enabled) {
        await applyHostsBlocklist(listType);
      } else {
        await removeHostsBlocklist(listType);
      }
      await loadHostsStatus();
      showNotification('success', t('success'), enabled ? t('hosts_blocklist_enabled') : t('hosts_blocklist_disabled'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleTogglePrivacyFirewall = async (enabled: boolean) => {
    try {
      if (enabled) {
        await applyPrivacyFirewallRules();
      } else {
        await removePrivacyFirewallRules();
      }
      await loadFirewallStatus();
      showNotification('success', t('success'), enabled ? t('privacy_firewall_enabled') : t('privacy_firewall_disabled'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleScanDeviceIssues = async () => {
    setDeviceScanLoading(true);
    setDeviceIssues([]);
    try {
      const result = await scanDeviceIssues();
      const parsed = JSON.parse(result || '[]');
      if (Array.isArray(parsed)) {
        setDeviceIssues(parsed as DeviceIssue[]);
      } else {
        setDeviceIssues([]);
      }
      showNotification('success', t('success'), t('device_scan_completed'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setDeviceScanLoading(false);
    }
  };

  const handleOpenDeviceManager = async () => {
    try {
      const result = await openDeviceManager();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleScanLeftovers = async () => {
    if (!leftoverAppId) {
      showNotification('warning', t('warning') || 'Warning', t('leftover_select_app'));
      return;
    }
    setLeftoverLoading(true);
    setLeftoverResult(null);
    try {
      const result = await scanAppLeftovers(leftoverAppId);
      const parsed = JSON.parse(result || '{}');
      setLeftoverResult({
        files: Array.isArray(parsed.files) ? parsed.files : [],
        registry: Array.isArray(parsed.registry) ? parsed.registry : []
      });
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setLeftoverLoading(false);
    }
  };

  const handleApplyStorageProfile = async () => {
    setStorageLoading(true);
    try {
      const result = await applyStorageSenseProfile(storageProfile);
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setStorageLoading(false);
    }
  };

  const handleDisableStorageSense = async () => {
    setStorageLoading(true);
    try {
      const result = await disableStorageSense();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setStorageLoading(false);
    }
  };

  const handlePrivacyAudit = async () => {
    setPrivacyAuditLoading(true);
    setPrivacyAudit(null);
    try {
      const result = await runPrivacyAudit();
      const parsed = JSON.parse(result || '{}');
      if (parsed && typeof parsed === 'object') {
        setPrivacyAudit({
          score: parsed.score || 0,
          findings: Array.isArray(parsed.findings) ? parsed.findings : []
        });
      }
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setPrivacyAuditLoading(false);
    }
  };

  const handleScanHiddenServices = async () => {
    setHiddenServicesLoading(true);
    setHiddenServices([]);
    try {
      const result = await scanHiddenServices();
      const parsed = JSON.parse(result || '[]');
      if (Array.isArray(parsed)) {
        setHiddenServices(parsed as HiddenService[]);
      }
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setHiddenServicesLoading(false);
    }
  };

  const handleAnalyzeJunkOrigins = async () => {
    setJunkOriginsLoading(true);
    setJunkOrigins([]);
    try {
      const result = await analyzeJunkOrigins();
      const parsed = JSON.parse(result || '[]');
      if (Array.isArray(parsed)) {
        setJunkOrigins(parsed as JunkOrigin[]);
      }
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setJunkOriginsLoading(false);
    }
  };

  const handleApplyPowerAudio = async () => {
    setPowerAudioLoading(true);
    try {
      const result = await applyPowerAudioOptimizations();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setPowerAudioLoading(false);
    }
  };

  const handleRevertPowerAudio = async () => {
    setPowerAudioLoading(true);
    try {
      const result = await revertPowerAudioOptimizations();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setPowerAudioLoading(false);
    }
  };

  const handleMonitorAppUsage = async () => {
    setAppUsageLoading(true);
    setAppUsage([]);
    try {
      const result = await monitorAppUsage();
      const parsed = JSON.parse(result || '[]');
      if (Array.isArray(parsed)) {
        setAppUsage(parsed as AppUsage[]);
      }
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setAppUsageLoading(false);
    }
  };

  const handleInstall = async () => {
    if (selectedApps.length === 0) return;

    setInstalling(true);
    setLogs([]);
    addLog(t('installer_start_log'));

    for (const appId of selectedApps) {
      setCurrentApp(appId);
      addLog(t('installer_installing_log', { appId }));
      
      try {
        await installWingetPackage(appId);
        addLog(t('installer_success_log', { appId }));
        addToHistory(appId, 'install', true);
      } catch (error) {
        addLog(t('installer_error_log', { appId, error: String(error) }));
        addToHistory(appId, 'install', false);
        console.error(error);
      }
    }

    setCurrentApp(null);
    setInstalling(false);
    setSelectedApps([]);
    showNotification('success', t('success'), t('installer_completed_message'));
    addLog(t('installer_completed_log'));
    if (activeTab === 'installed' || activeTab === 'updates') {
      await fetchInstalledApps();
    }
  };

  const handleUpdateModalClose = async () => {
    const wasUpdating = updatingApp;
    setUpdateModalOpen(false);
    setUpdatingApp(null);
    setUpdatingAll(false);
    
    if (wasUpdating) {
      setTimeout(async () => {
        await fetchInstalledApps();
      }, 1000);
    }
  };

  const handleUpdateAll = async (apps: InstalledApp[]) => {
    if (apps.length === 0) return;
    
    setUpdatingAll(true);
    setUpdateModalOpen(true);
    setUpdatingApp({ id: 'all', name: `${apps.length} applications` });
    
    const updatePromises = apps.map(async (app) => {
      try {
        await updateWingetPackage(app.Id);
        addToHistory(app.Id, 'update', true);
        return { success: true, appId: app.Id, appName: app.Name };
      } catch (error) {
        addToHistory(app.Id, 'update', false);
        return { success: false, appId: app.Id, appName: app.Name, error };
      }
    });

    const results = await Promise.all(updatePromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    setUpdatingAll(false);
    
    if (successCount > 0) {
      showNotification('success', t('success'), `${successCount} ${t('updated_successfully') || 'updated successfully'}`);
    }
    if (failCount > 0) {
      showNotification('error', t('error'), `${failCount} ${t('update_failed') || 'update failed'}`);
    }
    
    setTimeout(async () => {
      await fetchInstalledApps();
      setUpdateModalOpen(false);
      setUpdatingApp(null);
    }, 2000);
  };

  const handleUninstall = async (appId: string) => {
    if (!confirm(t('confirm_uninstall') || `Uninstall ${appId}?`)) return;
    
    try {
      setCurrentApp(appId);
      await uninstallWingetPackage(appId);
      showNotification('success', t('success'), `${appId} ${t('uninstalled_successfully') || 'uninstalled successfully'}`);
      addToHistory(appId, 'uninstall', true);
      await fetchInstalledApps();
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      addToHistory(appId, 'uninstall', false);
    } finally {
      setCurrentApp(null);
    }
  };

  const handleSelectAll = (apps: { id: string }[]) => {
    const ids = apps.map(a => a.id);
    const newSelected = [...new Set([...selectedApps, ...ids])];
    setSelectedApps(newSelected);
  };

  const handleDeselectAll = (apps: { id: string }[]) => {
    const ids = apps.map(a => a.id);
    setSelectedApps(selectedApps.filter(id => !ids.includes(id)));
  };

  const filteredInstalledApps = useMemo(() => {
    if (!searchQuery.trim()) {
      return installedApps;
    }
    const query = searchQuery.toLowerCase();
    return installedApps.filter(app =>
      (app.Id && app.Id.toLowerCase().includes(query)) ||
      (app.Name && app.Name.toLowerCase().includes(query)) ||
      (app.Version && app.Version.toLowerCase().includes(query)) ||
      (app.Available && app.Available.toLowerCase().includes(query))
    );
  }, [installedApps, searchQuery]);

  return (
    <div className="page-container installer-page">
      <div className="page-header installer-header">
        <div>
          <h1>{t('installer_page_title')}</h1>
          <p>{t('installer_page_description')}</p>
        </div>
      </div>

      <div className="installer-tabs">
        <button
          className={`tab-btn ${activeTab === 'install' ? 'active' : ''}`}
          onClick={() => setActiveTab('install')}
        >
          <Download size={18} />
          {t('install') || 'Install'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
          onClick={() => setActiveTab('installed')}
        >
          <Package size={18} />
          {t('installed_apps') || 'Installed Apps'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
          onClick={() => setActiveTab('updates')}
        >
          <RefreshCw size={18} />
          {t('updates') || 'Updates'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={18} />
          {t('history') || 'History'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'utilities' ? 'active' : ''}`}
          onClick={() => setActiveTab('utilities')}
        >
          <Wrench size={18} />
          {t('installer_utilities') || 'Utilities'}
        </button>
      </div>

      <div className="installer-container">
        {activeTab === 'install' && (
          <>
        
        <div className="apps-grid-container">
          {SOFTWARE_LIST.map((category) => {
              const CategoryIcon = category.icon;
              return (
                <div key={category.category} className="app-category">
                  <div className="category-header">
                    <div className="category-title">
                      <CategoryIcon size={20} className="category-icon" />
                      <h3>{t(`category_${category.category.toLowerCase()}`) || category.category}</h3>
                    </div>
                    <div className="category-actions">
                      <button onClick={() => handleSelectAll(category.apps)} title={t('installer_select_all')}>+</button>
                      <button onClick={() => handleDeselectAll(category.apps)} title={t('installer_deselect_all')}>-</button>
                    </div>
                  </div>
                  <div className="apps-list">
                    {category.apps.map((app) => (
                      <label key={app.id} className={`app-card ${selectedApps.includes(app.id) ? 'selected' : ''}`}>
                        <div className="app-card-content">
                          <input
                            type="checkbox"
                            checked={selectedApps.includes(app.id)}
                            onChange={() => toggleApp(app.id)}
                            disabled={installing}
                          />
                          <span className="app-name">{app.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>

        
        <div className="logs-console">
          <div className="logs-header">
            <span>{t('installer_logs_title')}</span>
            {currentApp && <span className="current-process">{t('installer_current_process')}: {currentApp}</span>}
          </div>
          <div className="logs-content">
            {logs.length === 0 ? (
              <span className="no-logs">{t('installer_no_logs')}</span>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="log-line">{log}</div>
              ))
            )}
          </div>
        </div>

        
        <div className="action-panel sticky-footer">
          <div className="selection-summary">
            <span>{t('installer_selected_count', { count: selectedApps.length })}</span>
          </div>
          
          <button 
            className="install-button"
            onClick={handleInstall}
            disabled={installing || selectedApps.length === 0}
          >
            {installing ? (
              <>
                <Loader2 className="spinner" size={18} />
                {t('installer_installing_button')}
              </>
            ) : (
              <>
                <Download size={18} />
                {t('installer_install_button')}
              </>
            )}
          </button>
        </div>
          </>
        )}

        {activeTab === 'installed' && (
          <div className="installed-apps-tab">
            <div className="installed-controls">
              <div className="search-box">
                <Search size={20} />
                <input
                  type="text"
                  placeholder={t('search_installed_apps') || 'Search installed apps...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="refresh-btn" onClick={fetchInstalledApps} disabled={loadingInstalled}>
                <RefreshCw size={18} className={loadingInstalled ? 'spinning' : ''} />
                {t('refresh') || 'Refresh'}
              </button>
            </div>

            {loadingInstalled ? (
              <div className="loading-state">
                <Loader2 size={32} />
                <p>{t('loading_installed_apps') || 'Loading installed apps...'}</p>
              </div>
            ) : filteredInstalledApps.length === 0 ? (
              <div className="empty-state">
                <Package size={48} />
                <p>{t('no_installed_apps') || 'No installed apps found'}</p>
              </div>
            ) : (
              <div className="installed-apps-list">
                {filteredInstalledApps.map((app) => (
                  <div key={app.Id || `${app.Name}-${app.Version}`} className="installed-app-item">
                    <div className="app-info">
                      <h4 className="app-name">{app.Name || app.Id}</h4>
                      <p className="app-version">{t('version') || 'Version'}: {app.Version}</p>
                    </div>
                    <div className="app-actions">
                      <button
                        className="action-btn uninstall-btn"
                        onClick={() => handleUninstall(app.Id)}
                        disabled={currentApp === app.Id}
                        title={t('uninstall_app') || 'Uninstall App'}
                      >
                        <Trash2 size={16} />
                        {t('uninstall') || 'Uninstall'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="updates-tab">
            <div className="updates-controls">
              <button className="refresh-btn" onClick={fetchInstalledApps} disabled={loadingInstalled || updatingAll}>
                <RefreshCw size={18} className={loadingInstalled ? 'spinning' : ''} />
                {t('refresh') || 'Refresh'}
              </button>
              {(() => {
                const appsWithUpdates = filteredInstalledApps.filter(
                  app => app.Available && app.Available !== app.Version
                );
                return appsWithUpdates.length > 0 && (
                  <button 
                    className="action-btn update-all-btn" 
                    onClick={() => handleUpdateAll(appsWithUpdates)}
                    disabled={updatingAll || updateModalOpen}
                  >
                    <RefreshCw size={18} />
                    {t('update_all') || 'Update All'} ({appsWithUpdates.length})
                  </button>
                );
              })()}
            </div>

            {loadingInstalled ? (
              <div className="loading-state">
                <Loader2 size={32} />
                <p>{t('checking_updates') || 'Checking for updates...'}</p>
              </div>
            ) : (
              (() => {
                const appsWithUpdates = filteredInstalledApps.filter(
                  app => app.Available && app.Available !== app.Version
                );
                return appsWithUpdates.length === 0 ? (
                  <div className="empty-state">
                    <RefreshCw size={48} />
                    <p>{t('no_updates_available') || 'No updates available'}</p>
                  </div>
                ) : (
                  <div className="updates-list">
                    {appsWithUpdates.map((app) => (
                      <div key={app.Id || `${app.Name}-${app.Version}`} className="update-item">
                        <div className="update-info">
                          <h4 className="update-name">{app.Name || app.Id}</h4>
                          <p className="update-current">{t('current_version') || 'Current'}: {app.Version}</p>
                          <p className="update-available">{t('available_version') || 'Available'}: {app.Available}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            {history.length === 0 ? (
              <div className="empty-state">
                <History size={48} />
                <p>{t('no_history') || 'No installation history'}</p>
              </div>
            ) : (
              <div className="history-list">
                {history.map((item, idx) => (
                  <div key={`${item.appId}-${item.timestamp}-${idx}`} className="history-item">
                    <div className="history-info">
                      <div className="history-header">
                        <span className={`history-action ${item.action}`}>
                          {item.action === 'install' && <Download size={16} />}
                          {item.action === 'update' && <RefreshCw size={16} />}
                          {item.action === 'uninstall' && <Trash2 size={16} />}
                          {t(item.action) || item.action}
                        </span>
                        <span className={`history-status ${item.success ? 'success' : 'error'}`}>
                          {item.success ? t('success') || 'Success' : t('failed') || 'Failed'}
                        </span>
                      </div>
                      <p className="history-app">{item.appId}</p>
                      <p className="history-time">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === 'utilities' && (
          <div className="utilities-tab">
            <div className="utilities-grid">
              <div className="utility-card utility-card-compact">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <FolderSearch size={18} />
                    {t('utility_leftover_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_leftover_description')}</div>
                </div>
                <div className="utility-card-body">
                  <label>{t('utility_leftover_app_label')}</label>
                  <select
                    className="utility-select"
                    value={leftoverAppId}
                    onChange={(e) => setLeftoverAppId(e.target.value)}
                  >
                    <option value="">{t('utility_leftover_select_placeholder')}</option>
                    {installedApps.map(app => (
                      <option key={app.Id} value={app.Name || app.Id}>
                        {app.Name || app.Id}
                      </option>
                    ))}
                  </select>
                  <button
                    className="utility-btn"
                    onClick={handleScanLeftovers}
                    disabled={leftoverLoading}
                  >
                    {leftoverLoading ? t('utility_scanning') : t('utility_leftover_scan')}
                  </button>
                  {leftoverResult && (
                    <div className="utility-result">
                      <div className="utility-result-row">
                        <span>{t('utility_leftover_files')}</span>
                        <span>{leftoverResult.files.length}</span>
                      </div>
                      <div className="utility-result-row">
                        <span>{t('utility_leftover_registry')}</span>
                        <span>{leftoverResult.registry.length}</span>
                      </div>
                      {(leftoverResult.files.length > 0 || leftoverResult.registry.length > 0) && (
                        <div className="utility-result-list">
                          {leftoverResult.files.slice(0, 5).map((item) => (
                            <div key={item} className="utility-result-item">{item}</div>
                          ))}
                          {leftoverResult.registry.slice(0, 5).map((item) => (
                            <div key={item} className="utility-result-item">{item}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <Monitor size={18} />
                    {t('utility_startup_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_startup_description')}</div>
                </div>
                <div className="utility-card-body">
                  <button
                    className="utility-btn secondary"
                    onClick={fetchStartupPrograms}
                    disabled={startupLoading}
                  >
                    {startupLoading ? t('utility_loading') : t('utility_refresh')}
                  </button>
                  {startupError && (
                    <div className="utility-error">{startupError}</div>
                  )}
                  {startupPrograms.length === 0 && !startupLoading ? (
                    <div className="utility-empty">{t('utility_no_startup_programs')}</div>
                  ) : (
                    <div className="utility-list">
                      {startupPrograms.map((program) => {
                        const impact = getStartupImpact(program);
                        return (
                          <div key={`${program.Name}-${program.Command}`} className="utility-list-item">
                            <div className="utility-list-info">
                              <span className="utility-list-name">{program.Name}</span>
                              <span className="utility-list-sub">{program.Location}</span>
                            </div>
                            <span className={`impact-badge ${impact.level}`}>
                              {impact.level === 'high' && t('startup_impact_high')}
                              {impact.level === 'medium' && t('startup_impact_medium')}
                              {impact.level === 'low' && t('startup_impact_low')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <AlertTriangle size={18} />
                    {t('utility_device_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_device_description')}</div>
                </div>
                <div className="utility-card-body">
                  <div className="utility-actions">
                    <button className="utility-btn secondary" onClick={handleOpenDeviceManager}>
                      {t('utility_device_open')}
                    </button>
                    <button className="utility-btn" onClick={handleScanDeviceIssues} disabled={deviceScanLoading}>
                      {deviceScanLoading ? t('utility_scanning') : t('utility_device_scan')}
                    </button>
                  </div>
                  {deviceIssues.length === 0 && !deviceScanLoading ? (
                    <div className="utility-empty">{t('utility_device_no_issues')}</div>
                  ) : (
                    <div className="utility-list">
                      {deviceIssues.map((issue) => (
                        <div key={issue.InstanceId || issue.FriendlyName} className="utility-list-item">
                          <div className="utility-list-info">
                            <span className="utility-list-name">{issue.FriendlyName || t('utility_device_unknown')}</span>
                            <span className="utility-list-sub">{issue.Class || ''}</span>
                          </div>
                          <span className="impact-badge high">{issue.Status || 'Error'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <ShieldAlert size={18} />
                    {t('utility_hosts_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_hosts_description')}</div>
                </div>
                <div className="utility-card-body">
                  <label className="utility-toggle">
                    <input
                      type="checkbox"
                      checked={hostsAdsEnabled}
                      disabled={hostsLoading}
                      onChange={(e) => handleToggleHostsBlocklist('ads', e.target.checked)}
                    />
                    <span>{t('utility_hosts_ads')}</span>
                  </label>
                  <label className="utility-toggle">
                    <input
                      type="checkbox"
                      checked={hostsTelemetryEnabled}
                      disabled={hostsLoading}
                      onChange={(e) => handleToggleHostsBlocklist('telemetry', e.target.checked)}
                    />
                    <span>{t('utility_hosts_telemetry')}</span>
                  </label>
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <ShieldCheck size={18} />
                    {t('utility_firewall_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_firewall_description')}</div>
                </div>
                <div className="utility-card-body">
                  <label className="utility-toggle">
                    <input
                      type="checkbox"
                      checked={firewallEnabled}
                      disabled={firewallLoading}
                      onChange={(e) => handleTogglePrivacyFirewall(e.target.checked)}
                    />
                    <span>{t('utility_firewall_toggle')}</span>
                  </label>
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <HardDrive size={18} />
                    {t('utility_storage_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_storage_description')}</div>
                </div>
                <div className="utility-card-body">
                  <label>{t('utility_storage_profile')}</label>
                  <select
                    className="utility-select"
                    value={storageProfile}
                    onChange={(e) => setStorageProfile(e.target.value as 'light' | 'balanced' | 'aggressive')}
                  >
                    <option value="light">{t('utility_storage_light')}</option>
                    <option value="balanced">{t('utility_storage_balanced')}</option>
                    <option value="aggressive">{t('utility_storage_aggressive')}</option>
                  </select>
                  <div className="utility-actions">
                    <button className="utility-btn" onClick={handleApplyStorageProfile} disabled={storageLoading}>
                      {storageLoading ? t('utility_applying') : t('utility_storage_apply')}
                    </button>
                    <button className="utility-btn secondary" onClick={handleDisableStorageSense} disabled={storageLoading}>
                      {t('utility_storage_disable')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <ShieldAlert size={18} />
                    {t('utility_privacy_audit_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_privacy_audit_description')}</div>
                </div>
                <div className="utility-card-body">
                  <button
                    className="utility-btn"
                    onClick={handlePrivacyAudit}
                    disabled={privacyAuditLoading}
                  >
                    {privacyAuditLoading ? t('utility_scanning') : t('utility_privacy_audit_run')}
                  </button>
                  {privacyAudit && (
                    <div className="utility-result">
                      <div className="utility-result-row">
                        <span>{t('utility_privacy_score')}</span>
                        <span className={`impact-badge ${privacyAudit.score >= 60 ? 'high' : privacyAudit.score >= 30 ? 'medium' : 'low'}`}>
                          {privacyAudit.score}
                        </span>
                      </div>
                      <div className="utility-list">
                        {privacyAudit.findings.map((finding) => (
                          <div key={finding.id} className="utility-list-item">
                            <div className="utility-list-info">
                              <span className="utility-list-name">{finding.title}</span>
                              <span className="utility-list-sub">{finding.detail}</span>
                            </div>
                            <span className={`impact-badge ${finding.enabled ? 'high' : 'low'}`}>
                              {finding.enabled ? t('utility_privacy_enabled') : t('utility_privacy_disabled')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <ShieldAlert size={18} />
                    {t('utility_hidden_services_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_hidden_services_description')}</div>
                </div>
                <div className="utility-card-body">
                  <button
                    className="utility-btn"
                    onClick={handleScanHiddenServices}
                    disabled={hiddenServicesLoading}
                  >
                    {hiddenServicesLoading ? t('utility_scanning') : t('utility_hidden_services_scan')}
                  </button>
                  {hiddenServices.length === 0 && !hiddenServicesLoading ? (
                    <div className="utility-empty">{t('utility_hidden_services_empty')}</div>
                  ) : (
                    <div className="utility-list">
                      {hiddenServices.map((service) => (
                        <div key={service.Name || service.DisplayName} className="utility-list-item">
                          <div className="utility-list-info">
                            <span className="utility-list-name">{service.DisplayName || service.Name}</span>
                            <span className="utility-list-sub">{service.PathName || ''}</span>
                          </div>
                          <span className="impact-badge medium">{service.State || 'Running'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <FolderSearch size={18} />
                    {t('utility_junk_origin_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_junk_origin_description')}</div>
                </div>
                <div className="utility-card-body">
                  <button
                    className="utility-btn"
                    onClick={handleAnalyzeJunkOrigins}
                    disabled={junkOriginsLoading}
                  >
                    {junkOriginsLoading ? t('utility_scanning') : t('utility_junk_origin_scan')}
                  </button>
                  {junkOrigins.length === 0 && !junkOriginsLoading ? (
                    <div className="utility-empty">{t('utility_junk_origin_empty')}</div>
                  ) : (
                    <div className="utility-list">
                      {junkOrigins.map((item) => (
                        <div key={`${item.Name}-${item.Path}`} className="utility-list-item">
                          <div className="utility-list-info">
                            <span className="utility-list-name">{item.Name}</span>
                            <span className="utility-list-sub">{item.Path || ''}</span>
                          </div>
                          <span className="impact-badge medium">{item.SizeMB || 0} MB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <HardDrive size={18} />
                    {t('utility_power_audio_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_power_audio_description')}</div>
                </div>
                <div className="utility-card-body">
                  <div className="utility-actions">
                    <button
                      className="utility-btn"
                      onClick={handleApplyPowerAudio}
                      disabled={powerAudioLoading}
                    >
                      {powerAudioLoading ? t('utility_applying') : t('utility_power_audio_apply')}
                    </button>
                    <button
                      className="utility-btn secondary"
                      onClick={handleRevertPowerAudio}
                      disabled={powerAudioLoading}
                    >
                      {t('utility_power_audio_revert')}
                    </button>
                  </div>
                </div>
              </div>

              <div className="utility-card">
                <div className="utility-card-header">
                  <div className="utility-card-title">
                    <Monitor size={18} />
                    {t('utility_app_monitor_title')}
                  </div>
                  <div className="utility-card-description">{t('utility_app_monitor_description')}</div>
                </div>
                <div className="utility-card-body">
                  <button
                    className="utility-btn"
                    onClick={handleMonitorAppUsage}
                    disabled={appUsageLoading}
                  >
                    {appUsageLoading ? t('utility_scanning') : t('utility_app_monitor_refresh')}
                  </button>
                  {appUsage.length === 0 && !appUsageLoading ? (
                    <div className="utility-empty">{t('utility_app_monitor_empty')}</div>
                  ) : (
                    <div className="utility-list">
                      {appUsage.map((item) => (
                        <div key={item.Name} className="utility-list-item">
                          <div className="utility-list-info">
                            <span className="utility-list-name">{item.Name}</span>
                            <span className="utility-list-sub">{t('utility_app_monitor_memory', { value: item.MemoryMB || 0 })}</span>
                          </div>
                          <span className="impact-badge medium">{t('utility_app_monitor_cpu', { value: item.Cpu || 0 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {updatingApp && (
        <UpdateModal
          isOpen={updateModalOpen}
          appId={updatingApp.id}
          appName={updatingApp.name}
          onClose={handleUpdateModalClose}
        />
      )}
    </div>
  );
};
export default Installer;
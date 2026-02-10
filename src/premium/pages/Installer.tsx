import { useState, useMemo, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Download,
  Search,
  Package,
  CheckCircle,
  Globe,
  Code,
  Image,
  Music,
  Film,
  FileText,
  Shield,
  Cloud,
  Gamepad2,
  MessageSquare,
  Folder,
  RefreshCw,
  Check,
  X
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import appsRawEn from '../data/toolbox_applications.json';

interface InstallerProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  externalQuery?: string;
}

interface App {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  selected: boolean;
  installed: boolean;
  wingetId: string;
}


type ToolboxAppItem = {
  category?: string;
  content: string;
  description: string;
  winget?: string;
};

type ToolboxAppRecord = Record<string, ToolboxAppItem>;


const mapToolboxCategory = (category?: string) => {
  switch (category) {
    case 'Browsers':
      return 'browsers';
    case 'Development':
      return 'development';
    case 'Multimedia Tools':
      return 'media';
    case 'Utilities':
      return 'utilities';
    case 'Communications':
      return 'communication';
    case 'Games':
      return 'gaming';
    case 'Microsoft Tools':
      return 'utilities';
    case 'Pro Tools':
      return 'utilities';
    case 'Document':
      return 'utilities';
    default:
      return 'utilities';
  }
};

const categoryIcons: Record<string, any> = {
  browsers: Globe,
  development: Code,
  media: Film,
  utilities: Folder,
  communication: MessageSquare,
  security: Shield,
  gaming: Gamepad2
};

const buildCategories = (t: (key: any) => string) => ([
  { id: 'all', label: t('filter_all'), icon: Package },
  { id: 'browsers', label: t('category_browsers'), icon: Globe },
  { id: 'development', label: t('category_development'), icon: Code },
  { id: 'media', label: t('category_media'), icon: Film },
  { id: 'utilities', label: t('category_utilities'), icon: Folder },
  { id: 'communication', label: t('category_communication'), icon: MessageSquare },
  { id: 'security', label: t('category_security'), icon: Shield },
  { id: 'gaming', label: t('category_gaming'), icon: Gamepad2 },
]);


const buildApps = (t: (key: any) => string): App[] => {
  const toolboxApps = appsRawEn as ToolboxAppRecord;
  const base: App[] = [
    // Browsers
    { id: 'chrome', name: t('app_chrome'), description: t('app_chrome_desc'), icon: Globe, category: 'browsers', selected: false, installed: false, wingetId: 'Google.Chrome' },
    { id: 'firefox', name: t('app_firefox'), description: t('app_firefox_desc'), icon: Globe, category: 'browsers', selected: false, installed: false, wingetId: 'Mozilla.Firefox' },
    { id: 'brave', name: t('app_brave'), description: t('app_brave_desc'), icon: Shield, category: 'browsers', selected: false, installed: false, wingetId: 'Brave.Brave' },
    { id: 'edge', name: t('app_edge'), description: t('app_edge_desc'), icon: Globe, category: 'browsers', selected: false, installed: false, wingetId: 'Microsoft.Edge' },
    { id: 'opera', name: t('app_opera'), description: t('app_opera_desc'), icon: Globe, category: 'browsers', selected: false, installed: false, wingetId: 'Opera.Opera' },
    { id: 'vivaldi', name: t('app_vivaldi'), description: t('app_vivaldi_desc'), icon: Globe, category: 'browsers', selected: false, installed: false, wingetId: 'Vivaldi.Vivaldi' },
    { id: 'thunderbird', name: t('app_thunderbird'), description: t('app_thunderbird_desc'), icon: Globe, category: 'browsers', selected: false, installed: false, wingetId: 'Mozilla.Thunderbird' },

    // Development
    { id: 'vscode', name: t('app_vscode'), description: t('app_vscode_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'Microsoft.VisualStudioCode' },
    { id: 'git', name: t('app_git'), description: t('app_git_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'Git.Git' },
    { id: 'nodejs', name: t('app_node'), description: t('app_node_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'OpenJS.NodeJS.LTS' },
    { id: 'python', name: t('app_python'), description: t('app_python_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'Python.Python.3.12' },
    { id: 'terminal', name: t('app_terminal'), description: t('app_terminal_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'Microsoft.WindowsTerminal' },
    { id: 'github', name: t('app_github_desktop'), description: t('app_github_desktop_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'GitHub.GitHubDesktop' },
    { id: 'docker', name: t('app_docker'), description: t('app_docker_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'Docker.DockerDesktop' },
    { id: 'postman', name: t('app_postman'), description: t('app_postman_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'Postman.Postman' },
    { id: 'jetbrains_toolbox', name: t('app_jetbrains_toolbox'), description: t('app_jetbrains_toolbox_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'JetBrains.Toolbox' },
    { id: 'sublime', name: t('app_sublime'), description: t('app_sublime_desc'), icon: Code, category: 'development', selected: false, installed: false, wingetId: 'SublimeHQ.SublimeText.4' },

    // Media
    { id: 'vlc', name: t('app_vlc'), description: t('app_vlc_desc'), icon: Film, category: 'media', selected: false, installed: false, wingetId: 'VideoLAN.VLC' },
    { id: 'spotify', name: t('app_spotify'), description: t('app_spotify_desc'), icon: Music, category: 'media', selected: false, installed: false, wingetId: 'Spotify.Spotify' },
    { id: 'gimp', name: t('app_gimp'), description: t('app_gimp_desc'), icon: Image, category: 'media', selected: false, installed: false, wingetId: 'GIMP.GIMP.2' },
    { id: 'obs', name: t('app_obs'), description: t('app_obs_desc'), icon: Film, category: 'media', selected: false, installed: false, wingetId: 'OBSProject.OBSStudio' },
    { id: 'audacity', name: t('app_audacity'), description: t('app_audacity_desc'), icon: Music, category: 'media', selected: false, installed: false, wingetId: 'Audacity.Audacity' },
    { id: 'blender', name: t('app_blender'), description: t('app_blender_desc'), icon: Image, category: 'media', selected: false, installed: false, wingetId: 'BlenderFoundation.Blender' },
    { id: 'handbrake', name: t('app_handbrake'), description: t('app_handbrake_desc'), icon: Film, category: 'media', selected: false, installed: false, wingetId: 'HandBrake.HandBrake' },

    // Utilities
    { id: '7zip', name: t('app_7zip'), description: t('app_7zip_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: '7zip.7zip' },
    { id: 'notepadpp', name: t('app_notepadpp'), description: t('app_notepadpp_desc'), icon: FileText, category: 'utilities', selected: false, installed: false, wingetId: 'Notepad++.Notepad++' },
    { id: 'everything', name: t('app_everything'), description: t('app_everything_desc'), icon: Search, category: 'utilities', selected: false, installed: false, wingetId: 'voidtools.Everything' },
    { id: 'powertoys', name: t('app_powertoys'), description: t('app_powertoys_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: 'Microsoft.PowerToys' },
    { id: 'winrar', name: t('app_winrar'), description: t('app_winrar_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: 'RARLab.WinRAR' },
    { id: 'rufus', name: t('app_rufus'), description: t('app_rufus_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: 'Rufus.Rufus' },
    { id: 'qbittorrent', name: t('app_qbittorrent'), description: t('app_qbittorrent_desc'), icon: Download, category: 'utilities', selected: false, installed: false, wingetId: 'qBittorrent.qBittorrent' },
    { id: 'winscp', name: t('app_winscp'), description: t('app_winscp_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: 'WinSCP.WinSCP' },
    { id: 'teamviewer', name: t('app_teamviewer'), description: t('app_teamviewer_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: 'TeamViewer.TeamViewer' },
    { id: 'anydesk', name: t('app_anydesk'), description: t('app_anydesk_desc'), icon: Folder, category: 'utilities', selected: false, installed: false, wingetId: 'AnyDesk.AnyDesk' },
    { id: 'googledrive', name: t('app_googledrive'), description: t('app_googledrive_desc'), icon: Cloud, category: 'utilities', selected: false, installed: false, wingetId: 'Google.GoogleDrive' },
    { id: 'dropbox', name: t('app_dropbox'), description: t('app_dropbox_desc'), icon: Cloud, category: 'utilities', selected: false, installed: false, wingetId: 'Dropbox.Dropbox' },
    { id: 'notion', name: t('app_notion'), description: t('app_notion_desc'), icon: FileText, category: 'utilities', selected: false, installed: false, wingetId: 'Notion.Notion' },
    { id: 'obsidian', name: t('app_obsidian'), description: t('app_obsidian_desc'), icon: FileText, category: 'utilities', selected: false, installed: false, wingetId: 'Obsidian.Obsidian' },

    // Communication
    { id: 'discord', name: t('app_discord'), description: t('app_discord_desc'), icon: MessageSquare, category: 'communication', selected: false, installed: false, wingetId: 'Discord.Discord' },
    { id: 'slack', name: t('app_slack'), description: t('app_slack_desc'), icon: MessageSquare, category: 'communication', selected: false, installed: false, wingetId: 'SlackTechnologies.Slack' },
    { id: 'telegram', name: t('app_telegram'), description: t('app_telegram_desc'), icon: MessageSquare, category: 'communication', selected: false, installed: false, wingetId: 'Telegram.TelegramDesktop' },
    { id: 'zoom', name: t('app_zoom'), description: t('app_zoom_desc'), icon: MessageSquare, category: 'communication', selected: false, installed: false, wingetId: 'Zoom.Zoom' },
    { id: 'teams', name: t('app_teams'), description: t('app_teams_desc'), icon: MessageSquare, category: 'communication', selected: false, installed: false, wingetId: 'Microsoft.Teams' },
    { id: 'signal', name: t('app_signal'), description: t('app_signal_desc'), icon: MessageSquare, category: 'communication', selected: false, installed: false, wingetId: 'OpenWhisperSystems.Signal' },

    // Security
    { id: 'bitwarden', name: t('app_bitwarden'), description: t('app_bitwarden_desc'), icon: Shield, category: 'security', selected: false, installed: false, wingetId: 'Bitwarden.Bitwarden' },
    { id: 'malwarebytes', name: t('app_malwarebytes'), description: t('app_malwarebytes_desc'), icon: Shield, category: 'security', selected: false, installed: false, wingetId: 'Malwarebytes.Malwarebytes' },
    { id: 'openvpn', name: t('app_openvpn'), description: t('app_openvpn_desc'), icon: Shield, category: 'security', selected: false, installed: false, wingetId: 'OpenVPNTechnologies.OpenVPN' },
    { id: 'wireguard', name: t('app_wireguard'), description: t('app_wireguard_desc'), icon: Shield, category: 'security', selected: false, installed: false, wingetId: 'WireGuard.WireGuard' },
    { id: 'keepass', name: t('app_keepass'), description: t('app_keepass_desc'), icon: Shield, category: 'security', selected: false, installed: false, wingetId: 'DominikReichl.KeePass' },

    // Gaming
    { id: 'steam', name: t('app_steam'), description: t('app_steam_desc'), icon: Gamepad2, category: 'gaming', selected: false, installed: false, wingetId: 'Valve.Steam' },
    { id: 'epicgames', name: t('app_epic'), description: t('app_epic_desc'), icon: Gamepad2, category: 'gaming', selected: false, installed: false, wingetId: 'EpicGames.EpicGamesLauncher' },
    { id: 'gog', name: t('app_gog'), description: t('app_gog_desc'), icon: Gamepad2, category: 'gaming', selected: false, installed: false, wingetId: 'GOG.Galaxy' },
    { id: 'battlenet', name: t('app_battlenet'), description: t('app_battlenet_desc'), icon: Gamepad2, category: 'gaming', selected: false, installed: false, wingetId: 'Blizzard.BattleNet' },
    { id: 'ubisoft', name: t('app_ubisoft'), description: t('app_ubisoft_desc'), icon: Gamepad2, category: 'gaming', selected: false, installed: false, wingetId: 'Ubisoft.Connect' },
    { id: 'ea', name: t('app_ea'), description: t('app_ea_desc'), icon: Gamepad2, category: 'gaming', selected: false, installed: false, wingetId: 'ElectronicArts.EADesktop' }
  ];

  const existingIds = new Set(base.map((app) => app.id));
  const existingWinget = new Set(base.map((app) => app.wingetId.toLowerCase()));

  const extras = Object.entries(toolboxApps)
    .filter(([, app]) => !!app.winget)
    .filter(([id, app]) => !existingIds.has(id) && !existingWinget.has((app.winget as string).toLowerCase()))
    .map(([id, app]) => {
      const mappedCategory = mapToolboxCategory(app.category);
      return {
        id,
        name: app.content,
        description: app.description,
        icon: categoryIcons[mappedCategory] || Package,
        category: mappedCategory,
        selected: false,
        installed: false,
        wingetId: app.winget as string
      };
    });

  return [...base, ...extras];
};

const AppCard = ({
  app,
  onToggle
}: {
  app: App;
  onToggle: () => void;
}) => {
  const Icon = app.icon;

  return (
    <div
      className="control-card"
      style={{
        padding: 'var(--space-md)',
        border: app.selected ? '2px solid var(--cyan)' : '1px solid var(--glass-border)',
        background: app.selected ? 'var(--cyan-15)' : 'var(--surface)',
        cursor: 'pointer',
        transition: 'all var(--duration-normal) var(--ease-out)'
      }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-md">
        <div
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: app.installed ? 'var(--success-bg)' : 'var(--raised)',
            borderRadius: 'var(--radius-lg)',
            color: app.installed ? 'var(--success)' : 'var(--cyan)',
            flexShrink: 0
          }}
        >
          <Icon size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-sm">
            <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{app.name}</span>
            {app.installed && (
              <CheckCircle size={14} color="var(--success)" />
            )}
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
            {app.description}
          </p>
          <div className="flex items-center gap-md mt-sm" />
        </div>

        <div
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            border: app.selected ? '2px solid var(--cyan)' : '2px solid var(--glass-border)',
            background: app.selected ? 'var(--cyan)' : 'transparent',
            flexShrink: 0
          }}
        >
          {app.selected && <Check size={14} color="var(--deep)" />}
        </div>
      </div>
    </div>
  );
};

export default function Installer({ showToast, externalQuery }: InstallerProps) {
  const { t } = useI18n();
  const [apps, setApps] = useState(buildApps(t));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setSearchQuery(externalQuery);
    }
  }, [externalQuery]);

  const [activeCategory, setActiveCategory] = useState('all');
  const [isInstalling, setIsInstalling] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const categories = buildCategories(t);

  // Scan for installed apps on mount
  const scanInstalledApps = async () => {
    setIsScanning(true);
    try {
      const result = await invoke('run_powershell', {
        command: 'winget list --accept-source-agreements 2>$null | Out-String'
      }) as string;

      if (result) {
        const installedList = result.toLowerCase();
        setApps(prev => prev.map(app => {
          // Check if winget ID or app name appears in installed list
          const wingetIdParts = app.wingetId.toLowerCase().split('.');
          const isInstalled = wingetIdParts.some(part =>
            part.length > 2 && installedList.includes(part)
          ) || installedList.includes(app.wingetId.toLowerCase());

          return { ...app, installed: isInstalled };
        }));
      }
    } catch (error) {
      // Winget might not be installed or available, which is fine
      console.warn('Winget scan skipped:', error);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    scanInstalledApps();
  }, []);

  useEffect(() => {
    setApps((prev) => {
      const base = buildApps(t);
      return base.map((app) => {
        const existing = prev.find((p) => p.id === app.id);
        return existing ? {
          ...app,
          selected: existing.selected,
          installed: existing.installed
        } : app;
      });
    });
  }, [t]);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || app.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [apps, searchQuery, activeCategory]);

  const selectedApps = apps.filter(app => app.selected);
  const selectedCount = selectedApps.length;

  const toggleApp = (id: string) => {
    setApps(prev => prev.map(app =>
      app.id === id ? { ...app, selected: !app.selected } : app
    ));
  };

  const selectAll = () => {
    setApps(prev => prev.map(app => ({ ...app, selected: !app.installed })));
  };

  const clearSelection = () => {
    setApps(prev => prev.map(app => ({ ...app, selected: false })));
  };

  const installSelected = async () => {
    if (selectedCount === 0) {
      showToast('warning', t('installer_none_selected'), t('installer_none_selected_desc'));
      return;
    }

    setIsInstalling(true);
    showToast('info', t('installer_installing'), `${t('installer_installing_prefix')} ${selectedCount} ${t('installer_apps')}...`);

    // First check if winget is available
    try {
      await invoke('run_powershell', { command: 'winget --version' });
    } catch {
      showToast('error', t('installer_winget_missing'), t('installer_winget_missing_desc'));
      setIsInstalling(false);
      return;
    }

    let successCount = 0;
    let alreadyInstalledCount = 0;
    let failCount = 0;

    for (const app of selectedApps) {
      try {
        const result = await invoke('run_powershell', {
          command: `winget install --id ${app.wingetId} --silent --accept-package-agreements --accept-source-agreements 2>&1; if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq -1978335189) { exit 0 } else { exit $LASTEXITCODE }`
        }) as string;

        // Check if already installed
        const isAlreadyInstalled = result && (
          result.includes('already installed') ||
          result.includes('No available upgrade') ||
          result.includes('No newer package')
        );

        setApps(prev => prev.map(a =>
          a.id === app.id ? { ...a, installed: true, selected: false } : a
        ));

        if (isAlreadyInstalled) {
          alreadyInstalledCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        const errorStr = String(error);
        // Treat "already installed" errors as success
        if (errorStr.includes('already installed') || errorStr.includes('No available upgrade') || errorStr.includes('No newer package')) {
          setApps(prev => prev.map(a =>
            a.id === app.id ? { ...a, installed: true, selected: false } : a
          ));
          alreadyInstalledCount++;
        } else if (errorStr.includes('0x80190193') || errorStr.includes('403')) {
          console.error(`Download blocked for ${app.name}:`, errorStr);
          setApps(prev => prev.map(a =>
            a.id === app.id ? { ...a, selected: false } : a
          ));
          failCount++;
          showToast('error', t('installer_error'), `${app.name}: download blocked (403)`);
        } else if (errorStr.includes('No package found')) {
          console.error(`Package not found: ${app.name} (${app.wingetId})`);
          setApps(prev => prev.map(a =>
            a.id === app.id ? { ...a, selected: false } : a
          ));
          failCount++;
        } else {
          console.error(`Failed to install ${app.name}:`, error);
          setApps(prev => prev.map(a =>
            a.id === app.id ? { ...a, selected: false } : a
          ));
          failCount++;
        }
      }
    }

    setIsInstalling(false);
    const totalSuccess = successCount + alreadyInstalledCount;
    if (failCount === 0) {
      if (alreadyInstalledCount > 0 && successCount === 0) {
        showToast('info', t('installer_complete'), `${alreadyInstalledCount} ${t('installer_already_installed')}`);
      } else {
        showToast('success', t('installer_complete'), `${t('installer_complete_prefix')} ${totalSuccess} ${t('installer_apps')}`);
      }
    } else {
      showToast('warning', t('installer_complete'), `${totalSuccess} OK, ${failCount} failed`);
    }
  };

  const installedCount = apps.filter(a => a.installed).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('installer_title')}
          </h2>
          <p className="text-muted mt-sm">
            {isScanning ? t('installer_scanning') : `${t('installer_subtitle')} • ${installedCount} ${t('installer_detected')}`}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={scanInstalledApps} disabled={isScanning}>
          <RefreshCw size={16} className={isScanning ? 'spin' : ''} />
          {isScanning ? t('scanning') : t('refresh')}
        </button>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center gap-md mb-lg">
        <div className="search-input" style={{ flex: 1 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('installer_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className="btn btn-secondary" onClick={selectAll}>
          {t('select_all')}
        </button>
        <button className="btn btn-secondary" onClick={clearSelection}>
          {t('clear')}
        </button>
      </div>

      {/* Categories */}
      <div className="tabs mb-lg" style={{ flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center' }}>
        {categories.map((cat) => (
          <button
            key={cat.id}
            className={`tab ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              padding: 'var(--space-sm) var(--space-md)'
            }}
          >
            <cat.icon size={16} />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-lg)' }}>
        {/* Apps Grid */}
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-md)'
            }}
          >
            {filteredApps.map((app) => (
              <AppCard
                key={app.id}
                app={app}
                onToggle={() => toggleApp(app.id)}
              />
            ))}
          </div>

          {filteredApps.length === 0 && (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <h3 className="empty-state-title">{t('installer_empty_title')}</h3>
              <p className="empty-state-description">
                {t('installer_empty_desc')}
              </p>
            </div>
          )}
        </div>

        {/* Selection Panel */}
        <div
          className="control-card"
          style={{
            padding: 'var(--space-lg)',
            position: 'sticky',
            top: 'var(--space-lg)',
            height: 'fit-content'
          }}
        >
          <h3 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-lg)' }}>
            {t('installer_queue_title')}
          </h3>

          {selectedCount === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              <Package size={48} style={{ color: 'var(--text-30)', marginBottom: 'var(--space-md)' }} />
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {t('installer_queue_empty')}
              </p>
            </div>
          ) : (
            <>
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 'var(--space-lg)' }}>
                {selectedApps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between"
                    style={{
                      padding: 'var(--space-sm) 0',
                      borderBottom: '1px solid var(--glass-border)'
                    }}
                  >
                    <div className="flex items-center gap-sm">
                      <app.icon size={16} color="var(--cyan)" />
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-90)' }}>
                        {app.name}
                      </span>
                    </div>
                    <button
                      className="btn btn-icon"
                      onClick={() => toggleApp(app.id)}
                      style={{ width: 24, height: 24 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--deep)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-lg)'
                }}
              >
                <div className="flex items-center justify-between mb-sm">
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('installer_apps')}</span>
                  <span className="font-mono" style={{ color: 'var(--text-90)' }}>{selectedCount}</span>
                </div>
                <div className="flex items-center justify-between" />
              </div>
            </>
          )}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={installSelected}
            disabled={selectedCount === 0 || isInstalling}
          >
            {isInstalling ? (
              <>
                <RefreshCw size={16} className="spin" />
                {t('installing')}
              </>
            ) : (
              <>
                <Download size={16} />
                {t('install')} {selectedCount > 0 ? `(${selectedCount})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

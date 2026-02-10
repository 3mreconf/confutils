import { useState, useEffect, useRef, Suspense, lazy, useCallback, useMemo } from 'react';
import {
  LayoutDashboard,
  Shield,
  Download,
  Trash2,
  Settings,
  Wifi,
  Activity,
  Wrench,
  Database,
  Info,
  Search,
  Bell,
  MessageSquare,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Server,
  Globe,
  Sliders,
  Minus,
  Square,
  Copy
} from 'lucide-react';
import './styles/premium.css';
import { useI18n } from './i18n/I18nContext';
import { open } from '@tauri-apps/plugin-shell';
import { getCurrentWindow } from '@tauri-apps/api/window';
import tweaksData from './premium/data/toolbox_tweaks.json';
import appsData from './premium/data/toolbox_applications.json';
import featuresData from './premium/data/toolbox_features.json';
import { servicesCatalog } from './premium/data/services_catalog';
import { privacySettingsCatalog } from './premium/data/privacy_settings_catalog';
import { debloaterCatalog } from './premium/data/debloater_catalog';

// Lazy loaded pages
const DashboardPage = lazy(() => import('./premium/pages/Dashboard'));
const SystemMonitorPage = lazy(() => import('./premium/pages/SystemMonitor'));
const PrivacyPage = lazy(() => import('./premium/pages/Privacy'));
const ServicesPage = lazy(() => import('./premium/pages/Services'));
const InstallerPage = lazy(() => import('./premium/pages/Installer'));
const DebloaterPage = lazy(() => import('./premium/pages/Debloater'));
const TweaksPage = lazy(() => import('./premium/pages/Tweaks'));
const SystemFeaturesPage = lazy(() => import('./premium/pages/SystemFeatures'));
const NetworkPage = lazy(() => import('./premium/pages/Network'));
const UpdatesPage = lazy(() => import('./premium/pages/Updates'));
const BackupPage = lazy(() => import('./premium/pages/Backup'));
const GoodbyeDPIPage = lazy(() => import('./premium/pages/GoodbyeDPI'));
const DiscordPage = lazy(() => import('./premium/pages/Discord'));

const SettingsPage = lazy(() => import('./premium/pages/Settings'));
const AboutPage = lazy(() => import('./premium/pages/About'));

type NavItem = { id: string; labelKey: string; icon: any };
type NavGroup = { titleKey: string; items: NavItem[] };

type SearchResult = {
  id: string;
  page: string;
  title: string;
  description?: string;
};

// Navigation structure
const navGroups: NavGroup[] = [
  {
    titleKey: 'nav_overview',
    items: [
      { id: 'dashboard', labelKey: 'nav_dashboard', icon: LayoutDashboard },
      { id: 'monitor', labelKey: 'nav_monitor', icon: Activity },
    ]
  },
  {
    titleKey: 'nav_system',
    items: [
      { id: 'tweaks', labelKey: 'nav_tweaks', icon: Wrench },
      { id: 'features', labelKey: 'nav_features', icon: Sliders },
      { id: 'updates', labelKey: 'nav_updates', icon: RefreshCw },
      { id: 'services', labelKey: 'nav_services', icon: Server },
      { id: 'debloater', labelKey: 'nav_debloater', icon: Trash2 },
    ]
  },
  {
    titleKey: 'nav_security',
    items: [
      { id: 'privacy', labelKey: 'nav_privacy', icon: Shield },
      { id: 'network', labelKey: 'nav_network', icon: Wifi },
    ]
  },
  {
    titleKey: 'nav_tools',
    items: [
      { id: 'discord', labelKey: 'nav_discord', icon: MessageSquare },
      { id: 'installer', labelKey: 'nav_installer', icon: Download },
      { id: 'backup', labelKey: 'nav_backup', icon: Database },
      { id: 'goodbyedpi', labelKey: 'nav_goodbyedpi', icon: Globe },
    ]
  }
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', labelKey: 'nav_settings', icon: Settings },
  { id: 'about', labelKey: 'nav_about', icon: Info },
];

// Toast Types
type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

// Version Blocker Component
const UpdateBlocker = ({ onUpdate, t }: { onUpdate: () => void, t: any }) => (
  <div className="update-blocker-overlay">
    <div className="update-blocker-card">
      <div className="update-blocker-icon">
        <AlertTriangle size={40} />
      </div>
      <h2 className="update-blocker-title">{t('update_required_title')}</h2>
      <p className="update-blocker-desc">{t('update_required_desc')}</p>
      <button onClick={onUpdate} className="update-blocker-btn">
        <Download size={20} />
        <span>{t('update_button')}</span>
      </button>
    </div>
  </div>
);

// Loading Skeleton
const PageSkeleton = () => (
  <div className="flex flex-col gap-lg">
    <div className="skeleton" style={{ height: '32px', width: '200px' }} />
    <div className="skeleton" style={{ height: '16px', width: '320px' }} />
    <div className="stats-grid mt-lg">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton" style={{ height: '120px' }} />
      ))}
    </div>
    <div className="card-grid mt-lg">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="skeleton" style={{ height: '200px' }} />
      ))}
    </div>
  </div>
);

function PremiumApp() {
  const { t } = useI18n();
  const [activePage, setActivePage] = useState('dashboard');
  const contentRef = useRef<HTMLDivElement>(null);
  const [systemHealth, setSystemHealth] = useState<'good' | 'warning' | 'critical'>('good');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSearch, setPageSearch] = useState<Record<string, string>>({});
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [latestUrl, setLatestUrl] = useState('https://github.com/3mreconf/confutils/releases');
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activePage]);

  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized);
    const unlisten = win.onResized(async () => {
      const next = await win.isMaximized();
      setIsMaximized(next);
    });
    return () => {
      unlisten.then((stop) => stop());
    };
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const win = getCurrentWindow();
    const max = await win.isMaximized();
    if (max) {
      await win.unmaximize();
      setIsMaximized(false);
    } else {
      await win.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };


  // Version Check
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/3mreconf/confutils/releases/latest');
        if (response.ok) {
          const data = await response.json();
          const latestVersion = data.tag_name.replace('v', '');
          const currentVersion = '2.1.33'; // Updated to match package.json/translations

          const compareVersions = (v1: string, v2: string) => {
            const parts1 = v1.split('.').map(Number);
            const parts2 = v2.split('.').map(Number);
            for (let i = 0; i < 3; i++) {
              if (parts1[i] > parts2[i]) return 1;
              if (parts1[i] < parts2[i]) return -1;
            }
            return 0;
          };

          if (compareVersions(latestVersion, currentVersion) > 0) {
            setIsUpdateRequired(true);
            setLatestUrl(data.html_url);
          }
        }
      } catch (error) {
        console.error('Version check failed:', error);
      }
    };

    checkVersion();
  }, []);

  const handleUpdate = () => {
    open(latestUrl);
  };

  // Simulate system health check
  useEffect(() => {
    const checkHealth = () => {
      const random = Math.random();
      if (random > 0.9) setSystemHealth('critical');
      else if (random > 0.7) setSystemHealth('warning');
      else setSystemHealth('good');
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Toast management
  const showToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];
    const results: SearchResult[] = [];
    const match = (value?: string) => !!value && value.toLowerCase().includes(normalizedQuery);

    const tweaks = tweaksData as Record<string, { Content?: string; Description?: string }>;
    Object.entries(tweaks).forEach(([id, item]) => {
      const title = item.Content || '';
      const description = item.Description || '';
      if (match(title) || match(description)) {
        results.push({ id: `tweak-${id}`, page: 'tweaks', title, description });
      }
    });

    const apps = appsData as Record<string, { content?: string; description?: string; winget?: string }>;
    Object.entries(apps).forEach(([id, item]) => {
      const title = item.content || '';
      const description = item.description || '';
      const winget = item.winget || '';
      if (match(title) || match(description) || match(winget)) {
        results.push({ id: `app-${id}`, page: 'installer', title, description });
      }
    });

    const features = featuresData as Record<string, { Content?: string; Description?: string }>;
    Object.entries(features).forEach(([id, item]) => {
      const title = item.Content || '';
      const description = item.Description || '';
      if (match(title) || match(description)) {
        results.push({ id: `feature-${id}`, page: 'features', title, description });
      }
    });

    servicesCatalog.forEach((service) => {
      const title = t(service.displayNameKey as any);
      const description = t(service.descriptionKey as any);
      if (match(title) || match(description)) {
        results.push({ id: `service-${service.id}`, page: 'services', title, description });
      }
    });

    privacySettingsCatalog.forEach((setting) => {
      const title = t(setting.titleKey as any);
      const description = t(setting.descriptionKey as any);
      if (match(title) || match(description)) {
        results.push({ id: `privacy-${setting.id}`, page: 'privacy', title, description });
      }
    });

    debloaterCatalog.forEach((app) => {
      const title = app.nameKey ? t(app.nameKey as any) : (app.name || '');
      const description = app.descriptionKey ? t(app.descriptionKey as any) : (app.description || '');
      if (match(title) || match(description) || match(app.packageName)) {
        results.push({ id: `debloater-${app.id}`, page: 'debloater', title, description });
      }
    });

    const monitorItems = [
      { id: 'cpu', title: t('cpu_label' as any) },
      { id: 'memory', title: t('memory_label' as any) },
      { id: 'disk', title: t('disk_label' as any) },
      { id: 'network', title: t('network_label' as any) },
      { id: 'processes', title: t('top_processes_cpu' as any) }
    ];
    monitorItems.forEach((item) => {
      if (match(item.title)) {
        results.push({ id: `monitor-${item.id}`, page: 'monitor', title: item.title });
      }
    });

    const settingsItems = [
      { id: 'performance', title: t('settings_block_performance_title' as any), description: t('settings_block_performance_desc' as any) },
      { id: 'alerts', title: t('settings_block_alerts_title' as any), description: t('settings_block_alerts_desc' as any) },
      { id: 'security', title: t('settings_block_security_title' as any), description: t('settings_block_security_desc' as any) },
      { id: 'display', title: t('settings_block_display_title' as any), description: t('settings_block_display_desc' as any) },
      { id: 'cloud', title: t('settings_block_cloud_title' as any), description: t('settings_block_cloud_desc' as any) }
    ];
    settingsItems.forEach((item) => {
      if (match(item.title) || match(item.description)) {
        results.push({ id: `settings-${item.id}`, page: 'settings', title: item.title, description: item.description });
      }
    });

    const networkItems = [
      { id: 'dns', title: t('network_dns_flush' as any), description: t('network_dns_desc' as any) },
      { id: 'adapter', title: t('network_adapter_reset' as any), description: t('network_adapter_desc' as any) },
      { id: 'qos', title: t('network_qos' as any), description: t('network_qos_desc' as any) },
      { id: 'gateway', title: t('network_gateway' as any), description: t('network_gateway_desc' as any) }
    ];
    networkItems.forEach((item) => {
      if (match(item.title) || match(item.description)) {
        results.push({ id: `network-${item.id}`, page: 'network', title: item.title, description: item.description });
      }
    });

    const updateItems = [
      { id: 'default', title: t('updates_default_title' as any), description: t('updates_default_desc' as any) },
      { id: 'security', title: t('updates_security_title' as any), description: t('updates_security_desc' as any) },
      { id: 'disable', title: t('updates_disable_title' as any), description: t('updates_disable_desc' as any) }
    ];
    updateItems.forEach((item) => {
      if (match(item.title) || match(item.description)) {
        results.push({ id: `updates-${item.id}`, page: 'updates', title: item.title, description: item.description });
      }
    });


    return results.slice(0, 50);
  }, [normalizedQuery, t]);

  const searchGroups = useMemo(() => {
    if (!searchResults.length) return [];
    const labels: Record<string, string> = {
      tweaks: t('nav_tweaks' as any),
      installer: t('nav_installer' as any),
      services: t('nav_services' as any),
      privacy: t('nav_privacy' as any),
      debloater: t('nav_debloater' as any),
      features: t('nav_features' as any),
      monitor: t('nav_monitor' as any),
      settings: t('nav_settings' as any),
      network: t('nav_network' as any),
      discord: t('nav_discord' as any),
      updates: t('nav_updates' as any),
    };
    const map = new Map<string, SearchResult[]>();
    searchResults.forEach((result) => {
      const key = result.page;
      const bucket = map.get(key);
      if (bucket) bucket.push(result);
      else map.set(key, [result]);
    });
    return Array.from(map.entries()).map(([page, items]) => ({
      page,
      label: labels[page] || page,
      items
    }));
  }, [searchResults, t]);

  const handleSearchSelect = (result: SearchResult) => {
    setActivePage(result.page);
    setPageSearch((prev) => ({ ...prev, [result.page]: searchQuery }));
  };

  const firstSearchResult = searchResults[0] || null;

  // Page titles
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: t('nav_dashboard' as any),
      monitor: t('nav_monitor' as any),
      tweaks: t('nav_tweaks' as any),
      features: t('nav_features' as any),
      updates: t('nav_updates' as any),
      services: t('nav_services' as any),
      debloater: t('nav_debloater' as any),
      privacy: t('nav_privacy' as any),
      network: t('nav_network' as any),
      discord: t('nav_discord' as any),
      installer: t('nav_installer' as any),
      backup: t('nav_backup' as any),
      settings: t('nav_settings' as any),
      about: t('nav_about' as any),
    };
    return titles[activePage] || 'Dashboard';
  };

  // Render active page
  const renderPage = () => {
    const pageProps = { showToast };

    switch (activePage) {
      case 'dashboard':
        return <DashboardPage {...pageProps} onNavigate={setActivePage} />;
      case 'monitor':
        return <SystemMonitorPage {...pageProps} />;
      case 'tweaks':
        return <TweaksPage {...pageProps} externalQuery={pageSearch.tweaks} />;
      case 'features':
        return <SystemFeaturesPage {...pageProps} externalQuery={pageSearch.features} />;
      case 'updates':
        return <UpdatesPage {...pageProps} />;
      case 'services':
        return <ServicesPage {...pageProps} externalQuery={pageSearch.services} />;
      case 'debloater':
        return <DebloaterPage {...pageProps} externalQuery={pageSearch.debloater} />;
      case 'privacy':
        return <PrivacyPage {...pageProps} externalQuery={pageSearch.privacy} />;
      case 'network':
        return <NetworkPage {...pageProps} />;
      case 'discord': return <DiscordPage {...pageProps} />;
      case 'installer':
        return <InstallerPage {...pageProps} externalQuery={pageSearch.installer} />;
      case 'backup':
        return <BackupPage {...pageProps} />;
      case 'goodbyedpi':
        return <GoodbyeDPIPage {...pageProps} />;
      case 'settings':
        return <SettingsPage {...pageProps} />;
      case 'about':
        return <AboutPage {...pageProps} />;
      default:
        return <DashboardPage {...pageProps} onNavigate={setActivePage} />;
    }
  };

  // Get toast icon
  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle size={20} />;
      case 'warning': return <AlertTriangle size={20} />;
      case 'error': return <X size={20} />;
      default: return <Info size={20} />;
    }
  };

  return (
    <div className="app-shell">
      {isUpdateRequired && <UpdateBlocker onUpdate={handleUpdate} t={t} />}


      <div className="titlebar" data-tauri-drag-region>
        <div className="titlebar-left" data-tauri-drag-region>
          <div className="titlebar-text" data-tauri-drag-region>
            <span className="titlebar-name">{t('app_name')}</span>
            <span className="titlebar-version">{t('app_version')}</span>
          </div>
        </div>
        <div className="titlebar-controls">
          <button className="titlebar-btn" onClick={handleMinimize} title="Minimize">
            <Minus size={14} />
          </button>
          <button className="titlebar-btn" onClick={handleMaximize} title={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized ? <Copy size={14} /> : <Square size={14} />}
          </button>
          <button className="titlebar-btn close" onClick={handleClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="app-body">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand">
            <div
              className="brand-orb"
              data-status={systemHealth === 'good' ? undefined : 'warning'}
            />
            <div className="brand-info">
              <span className="brand-name">{t('app_name')}</span>
              <span className="brand-version">{t('app_version')}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {navGroups.map((group) => (
            <div key={group.titleKey} className="nav-section">
              <div className="nav-section-title">{t(group.titleKey as any)}</div>
              <div className="nav-items">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => setActivePage(item.id)}
                  >
                    <item.icon className="nav-icon" size={20} />
                    <span className="nav-label">{t(item.labelKey as any)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Nav */}
        <div style={{ borderTop: '1px solid var(--glass-border)', padding: '8px 0' }}>
          <div className="nav-items" style={{ padding: '0 8px' }}>
            {bottomNavItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                <item.icon className="nav-icon" size={20} />
                <span className="nav-label">{t(item.labelKey as any)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* System Status Footer */}
        <div className="sidebar-footer">
          <div className="system-status">
            <div
              className="status-indicator"
              style={{
                background: systemHealth === 'good' ? 'var(--success)' :
                  systemHealth === 'warning' ? 'var(--warning)' : 'var(--danger)',
                boxShadow: `0 0 8px ${systemHealth === 'good' ? 'var(--success)' :
                  systemHealth === 'warning' ? 'var(--warning)' : 'var(--danger)'
                  }`
              }}
            />
            <span className="status-text">
              {t('system_label')}: <strong style={{
                color: systemHealth === 'good' ? 'var(--success)' :
                  systemHealth === 'warning' ? 'var(--warning)' : 'var(--danger)'
              }}>
                {systemHealth === 'good' ? t('system_healthy') :
                  systemHealth === 'warning' ? t('system_attention') : t('system_critical')}
              </strong>
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-area">
        {/* Header */}
        <header className="header-bar">
          <div className="header-left">
            <h1 className="page-title">{getPageTitle()}</h1>
            <div className="breadcrumb">
              <span>{t('breadcrumb_home' as any)}</span>
              <ChevronRight size={14} className="breadcrumb-divider" />
              <span style={{ color: 'var(--text-90)' }}>{getPageTitle()}</span>
            </div>
          </div>

          <div className="header-right">
            {/* Search */}
            <div className="search-input">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                className="input"
                placeholder={t('search_placeholder' as any)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && firstSearchResult) {
                    handleSearchSelect(firstSearchResult);
                  }
                }}
              />
              <span className="search-shortcut">{t('search_shortcut')}</span>
              {normalizedQuery ? (
                <div className="search-results">
                  {searchGroups.length === 0 ? (
                    <div className="search-empty">{t('search_no_results' as any)}</div>
                  ) : (
                    searchGroups.map((group) => (
                      <div key={group.page} className="search-group">
                        <div className="search-group-title">{group.label}</div>
                        {group.items.map((item) => (
                          <button
                            key={item.id}
                            className="search-result"
                            onClick={() => handleSearchSelect(item)}
                          >
                            <span className="search-result-title">{item.title}</span>
                            {item.description ? (
                              <span className="search-result-desc">{item.description}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <button className="header-action" title={t('notifications' as any)}>
              <Bell size={18} />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="content-area" ref={contentRef}>
          <Suspense fallback={<PageSkeleton />}>
            {renderPage()}
          </Suspense>
        </div>
      </main>

      </div>

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">{getToastIcon(toast.type)}</span>
            <div className="toast-content">
              <div className="toast-title">{toast.title}</div>
              {toast.message && <div className="toast-message">{toast.message}</div>}
            </div>
            <button className="toast-close" onClick={() => dismissToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PremiumApp;




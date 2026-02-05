import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
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
  Moon,
  ChevronRight,
  Zap,
  CheckCircle,
  AlertTriangle,
  X,
  Server
} from 'lucide-react';
import './styles/premium.css';
import { useI18n } from './i18n/I18nContext';
import { open } from '@tauri-apps/plugin-shell';

// Lazy loaded pages
const DashboardPage = lazy(() => import('./premium/pages/Dashboard'));
const SystemMonitorPage = lazy(() => import('./premium/pages/SystemMonitor'));
const PrivacyPage = lazy(() => import('./premium/pages/Privacy'));
const ServicesPage = lazy(() => import('./premium/pages/Services'));
const OptimizationPage = lazy(() => import('./premium/pages/Optimization'));
const InstallerPage = lazy(() => import('./premium/pages/Installer'));
const DebloaterPage = lazy(() => import('./premium/pages/Debloater'));
const EssentialTweaksPage = lazy(() => import('./premium/pages/EssentialTweaks'));
const NetworkPage = lazy(() => import('./premium/pages/Network'));
const BackupPage = lazy(() => import('./premium/pages/Backup'));
const SettingsPage = lazy(() => import('./premium/pages/Settings'));
const AboutPage = lazy(() => import('./premium/pages/About'));

// Navigation structure
const navGroups = [
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
      { id: 'optimization', labelKey: 'nav_optimization', icon: Zap },
      { id: 'tweaks', labelKey: 'nav_tweaks', icon: Wrench },
      { id: 'services', labelKey: 'nav_services', icon: Server },
      { id: 'debloater', labelKey: 'nav_debloater', icon: Trash2, badge: '12' },
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
      { id: 'installer', labelKey: 'nav_installer', icon: Download },
      { id: 'backup', labelKey: 'nav_backup', icon: Database },
    ]
  }
];

const bottomNavItems = [
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
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl">
    <div className="max-w-md p-2xl card glass-card text-center border-danger/30">
      <div className="flex justify-center mb-xl">
        <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center text-danger animate-pulse">
          <AlertTriangle size={36} />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-md text-white">{t('update_required_title')}</h2>
      <p className="text-text-60 mb-xl leading-relaxed">
        {t('update_required_desc')}
      </p>
      <button
        onClick={onUpdate}
        className="btn btn-primary w-full flex items-center justify-center gap-sm group relative overflow-hidden"
      >
        <Download size={18} className="group-hover:translate-y-px transition-transform" />
        <span>{t('update_button')}</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
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
  const { t, lang, setLang } = useI18n();
  const [activePage, setActivePage] = useState('dashboard');
  const [systemHealth, setSystemHealth] = useState<'good' | 'warning' | 'critical'>('good');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdateRequired, setIsUpdateRequired] = useState(false);
  const [latestUrl, setLatestUrl] = useState('https://github.com/3mreconf/confutils/releases/latest');

  // Version Check
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const response = await fetch('https://api.github.com/repos/3mreconf/confutils/releases/latest');
        if (response.ok) {
          const data = await response.json();
          const latestVersion = data.tag_name.replace('v', '');
          const currentVersion = '2.1.10'; // Updated to match package.json/translations

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

  // Page titles
  const getPageTitle = () => {
    const titles: Record<string, string> = {
      dashboard: t('nav_dashboard' as any),
      monitor: t('nav_monitor' as any),
      optimization: t('nav_optimization' as any),
      services: t('nav_services' as any),
      debloater: t('nav_debloater' as any),
      tweaks: t('nav_tweaks' as any),
      privacy: t('nav_privacy' as any),
      network: t('nav_network' as any),
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
      case 'optimization':
        return <OptimizationPage {...pageProps} />;
      case 'services':
        return <ServicesPage {...pageProps} />;
      case 'debloater':
        return <DebloaterPage {...pageProps} />;
      case 'tweaks':
        return <EssentialTweaksPage {...pageProps} />;
      case 'privacy':
        return <PrivacyPage {...pageProps} />;
      case 'network':
        return <NetworkPage {...pageProps} />;
      case 'installer':
        return <InstallerPage {...pageProps} />;
      case 'backup':
        return <BackupPage {...pageProps} />;
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
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
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
              />
              <span className="search-shortcut">{t('search_shortcut')}</span>
            </div>

            {/* Actions */}
            <button className="header-action" title={t('notifications' as any)}>
              <Bell size={18} />
            </button>
            <button className="header-action" title={t('dark_mode')}>
              <Moon size={18} />
            </button>
            <button
              className="header-action lang-toggle"
              title={lang === 'tr' ? t('lang_en') : t('lang_tr')}
              onClick={() => setLang(lang === 'tr' ? 'en' : 'tr')}
            >
              {lang === 'tr' ? t('lang_en') : t('lang_tr')}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="content-area">
          <Suspense fallback={<PageSkeleton />}>
            {renderPage()}
          </Suspense>
        </div>
      </main>

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





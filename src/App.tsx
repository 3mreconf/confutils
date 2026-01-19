import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { ToastContainer } from './components/UI/Toast';
import { ModalManager } from './components/UI/ModalManager';
import { useLanguage } from './contexts/LanguageContext';
import { useNotification } from './contexts/NotificationContext';
import { useAntiDebug } from './hooks/useAntiDebug';
import { clearTempFiles, getInstalledApps, listStartupPrograms } from './utils/tauri';
import { navigateToInstallerSection } from './utils/navigation';
import './styles/globals.css';
import './styles/theme.css';
import './App.css';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Services = lazy(() => import('./pages/Services'));
const Optimization = lazy(() => import('./pages/Optimization'));
const Settings = lazy(() => import('./pages/Settings'));
const AdvancedTweaks = lazy(() => import('./pages/AdvancedTweaks'));
const Fixes = lazy(() => import('./pages/Fixes'));
const Installer = lazy(() => import('./pages/Installer'));
const Debloater = lazy(() => import('./pages/Debloater'));
const Discord = lazy(() => import('./pages/Discord'));
const BackupRecovery = lazy(() => import('./pages/BackupRecovery'));
const SystemMonitor = lazy(() => import('./pages/SystemMonitor'));
const NetworkManager = lazy(() => import('./pages/NetworkManager'));
const About = lazy(() => import('./pages/About'));

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const installedSnapshot = useRef<Set<string> | null>(null);
  const startupSnapshot = useRef<Set<string> | null>(null);

  useAntiDebug({
    enableBackendCheck: false,
    enableFrontendCheck: false,
    checkInterval: 60000,
    terminateOnDetection: false,
    onDetection: (method) => {
      console.warn(`⚠️ Security check detected: ${method} (non-blocking)`);
    },
    enabled: true
  });

  useEffect(() => {
    const checkAndRunAutoCleanup = async () => {
      try {
        const settings = localStorage.getItem('confutils_settings');
        if (settings) {
          const parsedSettings = JSON.parse(settings);
          if (parsedSettings.autoCleanup) {
            await clearTempFiles();
            console.log('Automatic cleanup performed on startup.');
          }
        }
      } catch (error) {
        console.error('Failed to run automatic cleanup on startup:', error);
      }
    };

    const initialDelay = setTimeout(() => {
      checkAndRunAutoCleanup();
    }, 2000);

    return () => {
      clearTimeout(initialDelay);
    };
  }, []);

  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.scrollTop = 0;
    }
    document.body.dataset.page = activePage;
  }, [activePage]);

  useEffect(() => {
    try {
      const settings = localStorage.getItem('confutils_settings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        const contrast = parsedSettings.contrast || 'default';
        document.body.dataset.contrast = contrast;
      }
    } catch (error) {
      console.error('Failed to apply UI preferences:', error);
    }
  }, []);

  useEffect(() => {
    try {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as { deviceMemory?: number }).deviceMemory || 4;
      if (cores <= 4 || memory <= 4) {
        document.body.dataset.performance = 'low';
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const notificationsEnabled = () => {
      try {
        const settings = localStorage.getItem('confutils_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          if (parsed && parsed.notifications === false) {
            return false;
          }
        }
      } catch {
        return true;
      }
      return true;
    };

    const parseInstalledApps = (raw: string): string[] => {
      if (!raw || raw.trim() === '' || raw.trim() === '[]') {
        return [];
      }
      try {
        const jsonResult = JSON.parse(raw);
        if (Array.isArray(jsonResult)) {
          return jsonResult
            .map((app: { Id?: string; Name?: string }) => app.Id || app.Name)
            .filter((value: string | undefined): value is string => Boolean(value));
        }
        if (jsonResult && typeof jsonResult === 'object' && Array.isArray(jsonResult.Apps)) {
          return jsonResult.Apps
            .map((app: { Id?: string; Name?: string }) => app.Id || app.Name)
            .filter((value: string | undefined): value is string => Boolean(value));
        }
        return [];
      } catch {
        return [];
      }
    };

    const parseStartupPrograms = (raw: string): string[] => {
      if (!raw || raw.trim() === '' || raw.trim() === '[]') {
        return [];
      }
      try {
        const jsonResult = JSON.parse(raw);
        if (Array.isArray(jsonResult)) {
          return jsonResult
            .map((item: { Name?: string; Command?: string }) => item.Name || item.Command)
            .filter((value: string | undefined): value is string => Boolean(value));
        }
        return [];
      } catch {
        return [];
      }
    };

    const pollSystemChanges = async () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      if (!notificationsEnabled()) {
        return;
      }

      try {
        const installedRaw = await getInstalledApps();
        const installedList = parseInstalledApps(installedRaw);
        const installedSet = new Set(installedList);

        if (installedSnapshot.current) {
          const added = installedList.filter((id) => !installedSnapshot.current?.has(id));
          if (added.length > 0 && isMounted) {
            added.slice(0, 3).forEach((appId) => {
              showNotification(
                'info',
                t('notification_app_installed_title'),
                t('notification_app_installed_message', { app: appId })
              );
            });
          }
        }
        installedSnapshot.current = installedSet;
      } catch {
        return;
      }

      try {
        const startupRaw = await listStartupPrograms();
        const startupList = parseStartupPrograms(startupRaw);
        const startupSet = new Set(startupList);

        if (startupSnapshot.current) {
          const added = startupList.filter((name) => !startupSnapshot.current?.has(name));
          if (added.length > 0 && isMounted) {
            added.slice(0, 3).forEach((name) => {
              showNotification(
                'info',
                t('notification_startup_added_title'),
                t('notification_startup_added_message', { app: name }),
                {
                  label: t('notification_startup_added_action'),
                  onClick: () => navigateToInstallerSection('startup-programs')
                }
              );
            });
          }
        }
        startupSnapshot.current = startupSet;
      } catch {
        return;
      }
    };

    const intervalId = setInterval(pollSystemChanges, 180000);
    pollSystemChanges();

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [showNotification, t]);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ page?: string }>;
      const nextPage = customEvent.detail?.page;
      if (nextPage) {
        setActivePage(nextPage);
      }
    };
    window.addEventListener('confutils:navigate', handler);
    return () => {
      window.removeEventListener('confutils:navigate', handler);
    };
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onPageChange={setActivePage} />;
      case 'privacy': return <Privacy />;
      case 'services': return <Services />;
      case 'optimization': return <Optimization />;
      case 'settings': return <Settings />;
      case 'advanced-tweaks': return <AdvancedTweaks />;
      case 'fixes': return <Fixes />;
      case 'installer': return <Installer />;
      case 'debloater': return <Debloater />;
      case 'discord': return <Discord />;
      case 'backup-recovery': return <BackupRecovery />;
      case 'system-monitor': return <SystemMonitor />;
      case 'network-manager': return <NetworkManager />;
      case 'about': return <About />;
      default: return <Dashboard onPageChange={setActivePage} />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'dashboard': return t('dashboard_page_title');
      case 'installer': return t('installer_page_title');
      case 'debloater': return t('debloater_page_title');
      case 'optimization': return t('system_optimization_page_title');
      case 'privacy': return t('privacy_settings_page_title');
      case 'services': return t('services_manager_page_title');
      case 'settings': return t('settings_page_title');
      case 'advanced-tweaks': return t('system_tweaks_page_title');
      case 'fixes': return t('system_fixes_page_title');
      case 'discord': return t('discord_page_title');
      case 'backup-recovery': return t('backup_recovery_title') || 'Backup & Recovery';
      case 'system-monitor': return t('system_monitor_title') || 'System Monitor';
      case 'network-manager': return t('network_manager_title') || 'Network Manager';
      case 'about': return t('about_title') || 'About';
      default: return t('dashboard_page_title');
    }
  };

  return (
    <div className="app">
      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
      />
      <div className="app-main">
        <Header
          title={getPageTitle()}
          subtitle={t('windows_system_utilities_subtitle')}
          onPageChange={setActivePage}
        />
        <MainContent>
          <Suspense fallback={<div className="loading-state">{t('loading') || 'Loading...'}</div>}>
            {renderPage()}
          </Suspense>
        </MainContent>
      </div>
      <ToastContainer />
      <ModalManager />
    </div>
  );
}

export default App;

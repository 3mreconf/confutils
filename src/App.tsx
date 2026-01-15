import { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { MainContent } from './components/Layout/MainContent';
import { ToastContainer } from './components/UI/Toast';
import { ModalManager } from './components/UI/ModalManager';
import { useLanguage } from './contexts/LanguageContext';
import { useAntiDebug } from './hooks/useAntiDebug';
import { clearTempFiles } from './utils/tauri';
import './styles/globals.css';
import './styles/theme.css';
import './App.css';

import Dashboard from './pages/Dashboard';
import Privacy from './pages/Privacy';
import Services from './pages/Services';
import Optimization from './pages/Optimization';
import Settings from './pages/Settings';
import AdvancedTweaks from './pages/AdvancedTweaks';
import Fixes from './pages/Fixes';
import Installer from './pages/Installer';
import Debloater from './pages/Debloater';
import Discord from './pages/Discord';
import BackupRecovery from './pages/BackupRecovery';
import SystemMonitor from './pages/SystemMonitor';
import NetworkManager from './pages/NetworkManager';
import About from './pages/About';

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const { t } = useLanguage();

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
  }, [activePage]);

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
          {renderPage()}
        </MainContent>
      </div>
      <ToastContainer />
      <ModalManager />
    </div>
  );
}

export default App;

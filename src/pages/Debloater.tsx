import React, { useState, useEffect } from 'react';
import { Trash2, Loader2, Package, RefreshCw } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { getAppxPackages, removeAppxPackage } from '../utils/tauri';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import './Installer.css';

interface AppxPackage {
  Name: string;
  PackageFullName: string;
}

const Debloater: React.FC = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [apps, setApps] = useState<AppxPackage[]>([]);
  const [selectedApps, setSelectedApps] = useState<string[]>([]);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const result = await getAppxPackages();
      const parsedApps = JSON.parse(result || '[]');

      const criticalApps = [
        'Microsoft.Windows.ShellExperienceHost',
        'Microsoft.Windows.Cortana',
        'Microsoft.WindowsStore',
        'Microsoft.DesktopAppInstaller',
        'Microsoft.WindowsCalculator',
        'Microsoft.Windows.Photos',
        'Microsoft.WindowsCamera',
        'Microsoft.ScreenSketch',
        'Microsoft.Paint',
        'Microsoft.WindowsNotepad',
        'Microsoft.WindowsTerminal',
        'Microsoft.MicrosoftEdge',
        'Microsoft.HEIFImageExtension',
        'Microsoft.VP9VideoExtensions',
        'Microsoft.WebMediaExtensions',
        'Microsoft.WebpImageExtension',
        'Microsoft.UI.Xaml'
      ];

      const filteredApps = parsedApps.filter((app: AppxPackage) => {
        const isCritical = criticalApps.some(critical =>
          app.Name?.includes(critical) || app.PackageFullName?.includes(critical)
        );
        return !isCritical;
      });

      setApps(filteredApps);
    } catch (error) {
      console.error('Failed to fetch apps:', error);
      showNotification('error', t('error'), t('debloater_fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const toggleApp = (packageFullName: string) => {
    if (selectedApps.includes(packageFullName)) {
      setSelectedApps(selectedApps.filter(id => id !== packageFullName));
    } else {
      setSelectedApps([...selectedApps, packageFullName]);
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const performRemove = async () => {
    setShowConfirm(false);
    setRemoving(true);
    setLogs([]);
    addLog(t('debloater_start_log'));

    const validApps = selectedApps.filter(app => app && app.trim() !== '');
    
    if (validApps.length === 0) {
      setRemoving(false);
      showNotification('warning', t('error'), t('debloater_no_valid_apps') || 'Geçerli uygulama bulunamadı');
      return;
    }

    for (const packageFullName of validApps) {
      if (!packageFullName || packageFullName.trim() === '') {
        continue;
      }
      
      setCurrentApp(packageFullName);
      const appName = apps.find(a => a.PackageFullName === packageFullName)?.Name || packageFullName;
      addLog(t('debloater_removing_log', { appName }));
      
      try {
        await removeAppxPackage(packageFullName);
        addLog(t('debloater_success_log', { appName }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (!errorMsg.includes('null or empty') && !errorMsg.includes('Cannot validate argument')) {
          addLog(t('debloater_error_log', { appName, error: errorMsg }));
          console.error(error);
        } else {
          addLog(t('debloater_error_log', { appName, error: t('debloater_invalid_package') || 'Geçersiz paket adı' }));
        }
      }
    }

    setCurrentApp(null);
    setRemoving(false);
    setSelectedApps([]);
    showNotification('success', t('success'), t('debloater_completed_message'));
    addLog(t('debloater_completed_log'));
    fetchApps();
  };

  const handleRemove = () => {
    if (selectedApps.length === 0) return;
    setShowConfirm(true);
  };

  const handleSelectAll = () => {
    const ids = apps.map(a => a.PackageFullName);
    setSelectedApps(ids);
  };

  const handleDeselectAll = () => {
    setSelectedApps([]);
  };

  return (
    <div className="page-container installer-page">
      <div className="page-header installer-header">
        <div>
          <h1>{t('debloater_page_title')}</h1>
          <p>{t('debloater_page_description')}</p>
        </div>
        <button className="refresh-btn" onClick={fetchApps} disabled={loading || removing} title={t('refresh_list')}>
          <RefreshCw size={20} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      <div className="installer-container">
        
        <div className="apps-grid-container debloater-grid">
          {loading ? (
            <div className="loading-state">
              <Loader2 size={32} />
              <p>{t('loading_apps')}</p>
            </div>
          ) : apps.length === 0 ? (
            <div className="no-results">
              <p>{t('no_apps_found')}</p>
            </div>
          ) : (
            <div className="app-category">
              <div className="category-header">
                <div className="category-title">
                  <Package size={20} className="category-icon" />
                  <h3>{t('installed_store_apps')} ({apps.length})</h3>
                </div>
                <div className="category-actions">
                  <button onClick={handleSelectAll} title={t('installer_select_all')}>+</button>
                  <button onClick={handleDeselectAll} title={t('installer_deselect_all')}>-</button>
                </div>
              </div>
              <div className="apps-list">
                {apps.map((app) => (
                  <label key={app.PackageFullName} className={`app-card ${selectedApps.includes(app.PackageFullName) ? 'selected' : ''}`}>
                    <div className="app-card-content">
                      <input
                        type="checkbox"
                        checked={selectedApps.includes(app.PackageFullName)}
                        onChange={() => toggleApp(app.PackageFullName)}
                        disabled={removing}
                      />
                      <span className="app-name" title={app.PackageFullName}>{app.Name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        
        <div className="logs-console">
          <div className="logs-header">
            <span>{t('debloater_logs_title')}</span>
            {currentApp && <span className="current-process">{t('installer_current_process')}: {currentApp}</span>}
          </div>
          <div className="logs-content">
            {logs.length === 0 ? (
              <span className="no-logs">{t('debloater_no_logs')}</span>
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
            className="install-button remove-button"
            onClick={handleRemove}
            disabled={removing || selectedApps.length === 0}
            style={{ backgroundColor: '#ef4444' }}
          >
            {removing ? (
              <>
                <Loader2 className="spinner" size={18} />
                {t('debloater_removing_button')}
              </>
            ) : (
              <>
                <Trash2 size={18} />
                {t('debloater_remove_button')}
              </>
            )}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirm}
        title={t('debloater_confirm_title')}
        message={t('debloater_confirm_message', { count: selectedApps.length })}
        confirmText={t('debloater_confirm_yes')}
        cancelText={t('debloater_confirm_no')}
        variant="danger"
        onConfirm={performRemove}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default Debloater;

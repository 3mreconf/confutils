import React, { useState, useEffect, useCallback } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { HardDrive, Shield, Wifi, Zap, FileText, Info } from 'lucide-react';
import { clearTempFiles, flushDnsCache, getDefenderStatus, setPowerPlan, getCurrentPowerPlan, generateSystemReport, openSystemInfo } from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useModal } from '../contexts/ModalContext';
import { WifiPasswordsModal } from '../components/Network/WifiPasswordsModal';
import { handleOperationError } from '../utils/errorHandler';
import './Dashboard.css';

interface DashboardProps {
  onPageChange?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const { openModal } = useModal();
  const [defenderEnabled, setDefenderEnabled] = useState(true);
  const [performanceMode, setPerformanceMode] = useState(false);

  const checkDefenderStatus = useCallback(async () => {
    try {
      const status = await getDefenderStatus();
      const statusObj = JSON.parse(status);
      setDefenderEnabled(statusObj.RealTimeProtectionEnabled || false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('404') && !errorMsg.includes('Not Found')) {
        console.error('Failed to get Defender status:', error);
      }
    }
  }, []);

  const checkPowerPlan = useCallback(async () => {
    try {
      const plan = await getCurrentPowerPlan();
      const planObj = JSON.parse(plan);
      setPerformanceMode(planObj.IsHighPerformance || false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('404') && !errorMsg.includes('Not Found')) {
        console.error('Failed to get power plan:', error);
      }
    }
  }, []);

  useEffect(() => {
    checkDefenderStatus();
    checkPowerPlan();
  }, [checkDefenderStatus, checkPowerPlan]);

  const handleClearTemp = async () => {
    try {
      const result = await clearTempFiles();
      showNotification('success', t('success'), result);
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleFlushDns = async () => {
    try {
      const result = await flushDnsCache();
      showNotification('success', t('success'), result);
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleDefenderToggle = async (_enabled: boolean) => {
    showNotification(
      'warning',
      t('windows_defender_utility'),
      t('windows_defender_manage_message')
    );
    checkDefenderStatus();
  };

  const handlePerformanceMode = async (enabled: boolean) => {
    try {
      const result = await setPowerPlan(enabled);
      setPerformanceMode(enabled);
      showNotification(
        'success',
        t('performance_mode_title'),
        result
      );
    } catch (error) {
      handleOperationError(error, showNotification, t, t('power_plan_change_failed_message'));
      checkPowerPlan();
    }
  };

  const handleGenerateSystemReport = async () => {
    try {
      showNotification('info', t('dashboard_generating_system_report_title'), t('dashboard_generating_system_report_message'));
      const result = await generateSystemReport();
      showNotification('success', t('success'), result);
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleOpenSystemInfo = async () => {
    try {
      const result = await openSystemInfo();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleOpenWifiPasswords = useCallback(async (_enabled?: boolean) => {
    openModal(
      'wifi-passwords',
      t('wifi_passwords_title') || 'WiFi Passwords',
      <WifiPasswordsModal />,
      t('wifi_passwords_description') || 'View saved WiFi passwords'
    );
  }, [openModal, t]);

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h2 className="page-title">{t('quick_actions_title')}</h2>
        <p className="page-description">{t('common_utilities_description')}</p>
      </div>

      <div className="grid-auto">
        <UtilityCard
          icon={Wifi}
          title={t('wifi_passwords_title') || 'WiFi Passwords'}
          description={t('wifi_passwords_description') || 'View saved WiFi passwords'}
          actionType="button"
          actionLabel={t('view_button') || 'View'}
          onAction={handleOpenWifiPasswords}
          badge={{ text: 'New', type: 'success' }}
        />

        <UtilityCard
          icon={HardDrive}
          title={t('clear_temp_files_utility')}
          description={t('clear_temp_files_description')}
          actionType="button"
          actionLabel={t('clean_now_button')}
          onAction={async () => { await handleClearTemp(); }}
          badge={{ text: t('recommended_badge'), type: 'info' }}
        />

        <UtilityCard
          icon={Wifi}
          title={t('flush_dns_cache_utility')}
          description={t('flush_dns_cache_description')}
          actionType="button"
          actionLabel={t('flush_dns_button')}
          onAction={async () => { await handleFlushDns(); }}
        />

        <UtilityCard
          icon={Shield}
          title={t('windows_defender_utility')}
          description={t('windows_defender_description')}
          actionType="toggle"
          defaultEnabled={defenderEnabled}
          onAction={handleDefenderToggle}
          badge={{ text: defenderEnabled ? t('active_status') : t('inactive_status'), type: defenderEnabled ? 'success' : 'warning' }}
        />

        <UtilityCard
          icon={Zap}
          title={t('performance_mode_title')}
          description={t('performance_mode_description')}
          actionType="toggle"
          defaultEnabled={performanceMode}
          onAction={handlePerformanceMode}
        />

        <UtilityCard
          icon={FileText}
          title={t('dashboard_generate_system_report_title')}
          description={t('dashboard_generate_system_report_description')}
          actionType="button"
          actionLabel={t('dashboard_generate_report_button')}
          onAction={async () => { await handleGenerateSystemReport(); }}
          badge={{ text: t('dashboard_report_takes_time_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={Info}
          title={t('dashboard_open_system_info_title')}
          description={t('dashboard_open_system_info_description')}
          actionType="button"
          actionLabel={t('dashboard_open_system_info_button')}
          onAction={async () => { await handleOpenSystemInfo(); }}
        />
      </div>
    </div>
  );
};
export default Dashboard;

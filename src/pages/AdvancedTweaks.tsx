import React, { useState } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotification } from '../contexts/NotificationContext';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { invoke } from '@tauri-apps/api/core';
import { Monitor, Zap, PowerOff, Globe, WifiOff, BellOff, Trash2, CloudOff, Command, Tv2, Clock, ShieldAlert, Cpu, Network, Settings } from 'lucide-react';
import './Dashboard.css';

type DnsProvider = 'cloudflare' | 'google' | 'quad9';

const AdvancedTweaks: React.FC = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [selectedDns, setSelectedDns] = useState<DnsProvider>('cloudflare');
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  const askConfirmation = (titleKey: string, messageKey: string, action: () => void) => {
    setConfirmTitle(t(titleKey));
    setConfirmMessage(t(messageKey));
    setConfirmAction(() => action);
    setIsConfirmOpen(true);
  };

  const executeWithConfirmation = (
    command: string,
    params: any,
    confirmTitleKey: string,
    confirmMessageKey: string,
    successMessage: string
  ) => {
    askConfirmation(confirmTitleKey, confirmMessageKey, async () => {
      try {
        const result = await invoke(command, params);
        showNotification('success', t('success'), `${result}` || successMessage);
      } catch (error) {
        showNotification('error', t('error'), `${error}`);
      }
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{t('advanced_tweaks_page_title')}</h1>
        <p className="page-description">{t('advanced_tweaks_page_warning')}</p>
      </div>

      <div className="grid-auto">
        <UtilityCard
          icon={PowerOff}
          title={t('advanced_tweaks_disable_background_apps_title')}
          description={t('advanced_tweaks_disable_background_apps_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_background_apps', {}, 'advanced_tweaks_disable_background_apps_title', 'advanced_tweaks_disable_background_apps_detailed_description', 'Background apps disabled')}
        />
        <UtilityCard
          icon={Monitor}
          title={t('advanced_tweaks_disable_fullscreen_optimizations_title')}
          description={t('advanced_tweaks_disable_fullscreen_optimizations_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_fullscreen_optimizations', {}, 'advanced_tweaks_disable_fullscreen_optimizations_title', 'advanced_tweaks_disable_fullscreen_optimizations_detailed_description', 'Fullscreen optimizations disabled')}
        />
        <UtilityCard
          icon={Cpu}
          title={t('advanced_tweaks_disable_intel_mm_title')}
          description={t('advanced_tweaks_disable_intel_mm_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_intel_mm', {}, 'advanced_tweaks_disable_intel_mm_title', 'advanced_tweaks_disable_intel_mm_detailed_description', 'Intel MM disabled')}
        />
        <UtilityCard
          icon={WifiOff}
          title={t('advanced_tweaks_disable_ipv6_title')}
          description={t('advanced_tweaks_disable_ipv6_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_ipv6', {}, 'advanced_tweaks_disable_ipv6_title', 'advanced_tweaks_disable_ipv6_detailed_description', 'IPv6 disabled')}
        />
        <UtilityCard
          icon={Zap}
          title={t('advanced_tweaks_disable_copilot_title')}
          description={t('advanced_tweaks_disable_copilot_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_copilot', {}, 'advanced_tweaks_disable_copilot_title', 'advanced_tweaks_disable_copilot_detailed_description', 'Copilot disabled')}
        />
        <UtilityCard
          icon={BellOff}
          title={t('advanced_tweaks_disable_notification_tray_title')}
          description={t('advanced_tweaks_disable_notification_tray_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_notification_tray', {}, 'advanced_tweaks_disable_notification_tray_title', 'advanced_tweaks_disable_notification_tray_detailed_description', 'Notification tray disabled')}
        />
        <UtilityCard
          icon={Globe}
          title={t('advanced_tweaks_change_dns_title')}
          description={t('advanced_tweaks_change_dns_description')}
          actionType="custom"
        >
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <select
              value={selectedDns}
              onChange={(e) => setSelectedDns(e.target.value as DnsProvider)}
              className="custom-select"
              style={{ flex: '1', minWidth: '200px' }}
            >
              <option value="cloudflare">{t('advanced_tweaks_change_dns_cloudflare')}</option>
              <option value="google">{t('advanced_tweaks_change_dns_google')}</option>
              <option value="quad9">{t('advanced_tweaks_change_dns_quad9')}</option>
            </select>
            <button
              onClick={() => executeWithConfirmation('set_dns', { dnsType: selectedDns }, 'advanced_tweaks_change_dns_title', 'advanced_tweaks_change_dns_detailed_description', t('advanced_tweaks_change_dns_success', { dnsType: selectedDns }))}
              className="action-btn"
              style={{ flexShrink: 0, minWidth: '100px' }}
            >
              {t('execute_button')}
            </button>
          </div>
        </UtilityCard>
        <UtilityCard
          icon={Trash2}
          title={t('advanced_tweaks_remove_all_store_apps_title')}
          description={t('advanced_tweaks_remove_all_store_apps_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('remove_all_store_apps', {}, 'advanced_tweaks_remove_all_store_apps_title', 'advanced_tweaks_remove_all_store_apps_warning_prompt', 'Store apps removed')}
          badge={{ text: 'Dangerous', type: 'error' }}
        />
        <UtilityCard
          icon={Trash2}
          title={t('advanced_tweaks_remove_edge_title')}
          description={t('advanced_tweaks_remove_edge_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('remove_edge', {}, 'advanced_tweaks_remove_edge_title', 'advanced_tweaks_remove_edge_warning_prompt', 'Edge removed')}
          badge={{ text: 'Dangerous', type: 'error' }}
        />
        <UtilityCard
          icon={CloudOff}
          title={t('advanced_tweaks_remove_onedrive_title')}
          description={t('advanced_tweaks_remove_onedrive_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('remove_onedrive', {}, 'advanced_tweaks_remove_onedrive_title', 'advanced_tweaks_remove_onedrive_warning_prompt', 'OneDrive removed')}
        />
        <UtilityCard
          icon={Command}
          title={t('advanced_tweaks_set_classic_right_click_title')}
          description={t('advanced_tweaks_set_classic_right_click_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('set_classic_right_click', {}, 'advanced_tweaks_set_classic_right_click_title', 'advanced_tweaks_set_classic_right_click_detailed_description', 'Classic menu enabled')}
        />
        <UtilityCard
          icon={Tv2}
          title={t('advanced_tweaks_set_display_for_performance_title')}
          description={t('advanced_tweaks_set_display_for_performance_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('set_display_for_performance', {}, 'advanced_tweaks_set_display_for_performance_title', 'advanced_tweaks_set_display_for_performance_detailed_description', 'Display optimized')}
        />
        <UtilityCard
          icon={Clock}
          title={t('advanced_tweaks_set_time_utc_title')}
          description={t('advanced_tweaks_set_time_utc_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('set_time_utc', {}, 'advanced_tweaks_set_time_utc_title', 'advanced_tweaks_set_time_utc_detailed_description', 'Time set to UTC')}
        />
        <UtilityCard
          icon={ShieldAlert}
          title={t('advanced_tweaks_block_adobe_network_title')}
          description={t('advanced_tweaks_block_adobe_network_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('block_adobe_network', {}, 'advanced_tweaks_block_adobe_network_title', 'advanced_tweaks_block_adobe_network_detailed_description', 'Adobe network blocked')}
        />
        <UtilityCard
          icon={Zap}
          title={t('advanced_tweaks_debloat_adobe_title')}
          description={t('advanced_tweaks_debloat_adobe_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('debloat_adobe', {}, 'advanced_tweaks_debloat_adobe_title', 'advanced_tweaks_debloat_adobe_detailed_description', 'Adobe debloated')}
        />
        <UtilityCard
          icon={Settings}
          title={t('advanced_tweaks_remove_home_gallery_title')}
          description={t('advanced_tweaks_remove_home_gallery_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('remove_home_gallery', {}, 'advanced_tweaks_remove_home_gallery_title', 'advanced_tweaks_remove_home_gallery_detailed_description', 'Home & Gallery removed')}
        />
        <UtilityCard
          icon={Network}
          title={t('advanced_tweaks_disable_teredo_title')}
          description={t('advanced_tweaks_disable_teredo_description')}
          actionType="button"
          onClick={() => executeWithConfirmation('disable_teredo', {}, 'advanced_tweaks_disable_teredo_title', 'advanced_tweaks_disable_teredo_detailed_description', 'Teredo disabled')}
        />
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={() => {
          if (confirmAction) confirmAction();
          setIsConfirmOpen(false);
        }}
        onCancel={() => setIsConfirmOpen(false)}
        variant="danger"
        confirmText={t('confirm_button') || "Confirm"}
        cancelText={t('cancel_button') || "Cancel"}
      />
    </div>
  );
};

export default AdvancedTweaks;

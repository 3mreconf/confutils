import React, { useState } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Eye, EyeOff, MapPin, Mic, Camera, Globe, Brain, Cloud, Navigation, Shield, FileText, Network, FileX, Trash2 } from 'lucide-react';
import { ProcessModal, ProcessStep } from '../components/UI/ProcessModal';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { useModal } from '../contexts/ModalContext';
import { FileShredderModal } from '../components/Privacy/FileShredderModal';
import BrowserCleanerModal from '../components/Privacy/BrowserCleanerModal';
import {
  disableTelemetry,
  disableTelemetryAdvanced,
  toggleLocationServices,
  toggleCameraAccess,
  toggleMicrophoneAccess,
  clearActivityHistory,
  disableRecall,
  removeOneDrive,
  disableLocationTrackingAdvanced,
  blockAdobeNetwork,
  debloatAdobe,
  disableTeredo
} from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { handleOperationError } from '../utils/errorHandler';

const Privacy: React.FC = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const { openModal } = useModal();
  const [telemetryDisabled, setTelemetryDisabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [webPrivacy, setWebPrivacy] = useState(false);

  const [showProcess, setShowProcess] = useState(false);
  const [processTitle, setProcessTitle] = useState('');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showBrowserCleaner, setShowBrowserCleaner] = useState(false);

  const updateStep = (index: number, updates: Partial<ProcessStep>) => {
    setProcessSteps(prev => prev.map((step, i) =>
      i === index ? { ...step, ...updates } : step
    ));
  };

  const askConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (confirmAction) {
      confirmAction();
    }
  };

  const handleOpenShredder = () => {
    openModal(
      'file-shredder',
      t('file_shredder_title') || 'Secure File Shredder',
      <FileShredderModal />,
      t('file_shredder_description') || 'Permanently delete files'
    );
  };

  const handleDisableRecall = async () => {
    setProcessTitle(t('disable_windows_recall_process_title'));
    setProcessSteps([
      { id: '1', title: t('recall_step_registry'), status: 'pending' },
      { id: '2', title: t('recall_step_dism'), status: 'pending' },
      { id: '3', title: t('recall_step_completing'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep(0, { status: 'completed', message: 'Registry: DisableAIDataAnalysis = 1' });

      updateStep(1, { status: 'running' });
      const result = await disableRecall();
      updateStep(1, { status: 'completed', message: t('recall_feature_disabled_message') });

      updateStep(2, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep(2, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('recall_successfully_disabled'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleDisableTelemetryAdvanced = async () => {
    setProcessTitle(t('disable_telemetry_advanced_process_title'));
    setProcessSteps([
      { id: '1', title: t('telemetry_advanced_step_registry'), status: 'pending' },
      { id: '2', title: t('telemetry_advanced_step_scheduled_tasks'), status: 'pending' },
      { id: '3', title: t('telemetry_advanced_step_edge_restrictions'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep(0, { status: 'completed', message: t('telemetry_advanced_registry_updated_message') });

      updateStep(1, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep(1, { status: 'completed', message: t('telemetry_advanced_scheduled_tasks_disabled_message') });

      updateStep(2, { status: 'running' });
      const result = await disableTelemetryAdvanced();
      updateStep(2, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('telemetry_advanced_settings_applied'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleRemoveOneDrive = async () => {
    setProcessTitle(t('remove_onedrive_process_title'));
    setProcessSteps([
      { id: '1', title: t('onedrive_step_stopping'), status: 'pending' },
      { id: '2', title: t('onedrive_step_moving_files'), status: 'pending' },
      { id: '3', title: t('onedrive_step_uninstalling'), status: 'pending' },
      { id: '4', title: t('onedrive_step_cleaning_up'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep(0, { status: 'completed', message: t('onedrive_stopped_message') });

      updateStep(1, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep(1, { status: 'completed', message: t('onedrive_files_moved_message') });

      updateStep(2, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep(2, { status: 'completed', message: t('onedrive_uninstaller_run_message') });

      updateStep(3, { status: 'running' });
      const result = await removeOneDrive();
      updateStep(3, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('onedrive_successfully_removed'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleDisableLocationAdvanced = async () => {
    setProcessTitle(t('disable_location_advanced_process_title'));
    setProcessSteps([
      { id: '1', title: t('location_advanced_step_registry'), status: 'pending' },
      { id: '2', title: t('location_advanced_step_stopping_services'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep(0, { status: 'completed', message: t('location_advanced_registry_updated_message') });

      updateStep(1, { status: 'running' });
      const result = await disableLocationTrackingAdvanced();
      updateStep(1, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('location_tracking_successfully_disabled'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleBlockAdobeNetwork = async () => {
    setProcessTitle(t('block_adobe_network_process_title'));
    setProcessSteps([
      { id: '1', title: t('adobe_block_step_downloading'), status: 'pending' },
      { id: '2', title: t('adobe_block_step_updating_hosts'), status: 'pending' },
      { id: '3', title: t('adobe_block_step_clearing_dns'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep(0, { status: 'completed', message: t('adobe_block_downloaded_message') });

      updateStep(1, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep(1, { status: 'completed', message: t('adobe_block_servers_blocked_message') });

      updateStep(2, { status: 'running' });
      const result = await blockAdobeNetwork();
      updateStep(2, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('adobe_network_successfully_blocked'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleDebloatAdobe = async () => {
    setProcessTitle(t('debloat_adobe_process_title'));
    setProcessSteps([
      { id: '1', title: t('adobe_debloat_step_stopping_desktop_service'), status: 'pending' },
      { id: '2', title: t('adobe_debloat_step_disabling_updates'), status: 'pending' },
      { id: '3', title: t('adobe_debloat_step_managing_services'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep(0, { status: 'completed', message: t('adobe_debloat_desktop_service_message') });

      updateStep(1, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep(1, { status: 'completed', message: t('adobe_debloat_acrobat_update_message') });

      updateStep(2, { status: 'running' });
      const result = await debloatAdobe();
      updateStep(2, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('adobe_debloat_completed'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleDisableTeredo = async () => {
    setProcessTitle(t('disable_teredo_process_title'));
    setProcessSteps([
      { id: '1', title: t('teredo_step_netsh_command'), status: 'pending' },
      { id: '2', title: t('teredo_step_registry_settings'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep(0, { status: 'running' });
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep(0, { status: 'completed', message: t('teredo_state_disabled_message') });

      updateStep(1, { status: 'running' });
      const result = await disableTeredo();
      updateStep(1, { status: 'completed', message: result });

      showNotification('success', t('completed'), t('teredo_successfully_disabled'));
    } catch (error) {
      const lastRunningIndex = processSteps.findIndex(s => s.status === 'running');
      if (lastRunningIndex !== -1) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        updateStep(lastRunningIndex, { status: 'error', message: errorMsg });
      }
      handleOperationError(error, showNotification, t);
    }
  };

  const handleDisableTelemetry = async (enabled: boolean) => {
    try {
      if (!enabled) {
        await disableTelemetry();
        setTelemetryDisabled(true);
        showNotification('success', t('telemetry_disabled_title'), t('telemetry_disabled_message'));
      } else {
        showNotification('info', t('telemetry_title'), t('telemetry_reenable_message'));
      }
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleLocationToggle = async (enabled: boolean) => {
    try {
      await toggleLocationServices(enabled);
      setLocationEnabled(enabled);
      showNotification('success', t('location_services_title'), t(enabled ? 'location_services_enabled' : 'location_services_disabled'));
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleMicrophoneToggle = async (enabled: boolean) => {
    try {
      await toggleMicrophoneAccess(enabled);
      setMicEnabled(enabled);
      showNotification('success', t('microphone_access_title'), t(enabled ? 'microphone_access_enabled' : 'microphone_access_disabled'));
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleCameraToggle = async (enabled: boolean) => {
    try {
      await toggleCameraAccess(enabled);
      setCameraEnabled(enabled);
      showNotification('success', t('camera_access_title'), t(enabled ? 'camera_access_enabled' : 'camera_access_disabled'));
    } catch (error) {
      handleOperationError(error, showNotification, t);
    }
  };

  const handleWebPrivacy = async (enabled: boolean) => {
    setWebPrivacy(enabled);
    showNotification('info', t('web_privacy_title'), t(enabled ? 'web_privacy_enabled' : 'web_privacy_disabled'));
  };

  const handleClearHistory = async () => {
    try {
      const result = await clearActivityHistory();
      showNotification('success', t('activity_history_cleared_title'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleDisableRecallWithConfirm = () => {
    askConfirmation(
      t('confirm_disable_recall_title') || 'Disable Windows Recall?',
      t('confirm_disable_recall_message') || 'This will disable Windows Recall and AI features. Continue?',
      handleDisableRecall
    );
  };

  const handleRemoveOneDriveWithConfirm = () => {
    askConfirmation(
      t('confirm_remove_onedrive_title') || 'Remove OneDrive?',
      t('confirm_remove_onedrive_message') || 'This will completely uninstall OneDrive. Continue?',
      handleRemoveOneDrive
    );
  };

  const handleDisableTelemetryAdvancedWithConfirm = () => {
    askConfirmation(
      t('confirm_disable_telemetry_advanced_title') || 'Disable Advanced Telemetry?',
      t('confirm_disable_telemetry_advanced_message') || 'This will disable all telemetry. Continue?',
      handleDisableTelemetryAdvanced
    );
  };

  const handleDisableLocationAdvancedWithConfirm = () => {
    askConfirmation(
      t('confirm_disable_location_advanced_title') || 'Disable Advanced Location?',
      t('confirm_disable_location_advanced_message') || 'This will disable all location services. Continue?',
      handleDisableLocationAdvanced
    );
  };

  const handleClearHistoryWithConfirm = () => {
    askConfirmation(
      t('confirm_clear_history_title') || 'Clear Activity History?',
      t('confirm_clear_history_message') || 'This will delete all activity history. Continue?',
      handleClearHistory
    );
  };

  const handleBlockAdobeNetworkWithConfirm = () => {
    askConfirmation(
      t('confirm_block_adobe_title') || 'Block Adobe Network?',
      t('confirm_block_adobe_message') || 'This will block Adobe servers. Continue?',
      handleBlockAdobeNetwork
    );
  };

  const handleDebloatAdobeWithConfirm = () => {
    askConfirmation(
      t('confirm_debloat_adobe_title') || 'Debloat Adobe?',
      t('confirm_debloat_adobe_message') || 'This will disable Adobe background services. Continue?',
      handleDebloatAdobe
    );
  };

  const handleDisableTeredoWithConfirm = () => {
    askConfirmation(
      t('confirm_disable_teredo_title') || 'Disable Teredo?',
      t('confirm_disable_teredo_message') || 'This will disable the Teredo protocol. Continue?',
      handleDisableTeredo
    );
  };

  return (
    <div className="privacy-page">
      <div className="page-header">
        <h2 className="page-title">{t('privacy_settings_page_title')}</h2>
        <p className="page-description">{t('privacy_page_description')}</p>
      </div>

      <div className="grid-auto">
        <UtilityCard
          icon={FileX}
          title={t('file_shredder_title') || 'File Shredder'}
          description={t('file_shredder_description') || 'Permanently delete files'}
          actionType="button"
          actionLabel={t('shred_now') || 'Shred Now'}
          onAction={async () => handleOpenShredder()}
          badge={{ text: 'Privacy', type: 'error' }}
        />

        <UtilityCard
          icon={Brain}
          title={t('disable_windows_recall_title')}
          description={t('disable_windows_recall_description')}
          actionType="button"
          actionLabel={t('disable_recall_button')}
          onClick={handleDisableRecallWithConfirm}
          badge={{ text: t('essential_badge'), type: 'error' }}
        />

        <UtilityCard
          icon={EyeOff}
          title={t('disable_telemetry_advanced_title')}
          description={t('disable_telemetry_advanced_description')}
          actionType="button"
          actionLabel={t('disable_all_telemetry_button')}
          onClick={handleDisableTelemetryAdvancedWithConfirm}
          badge={{ text: t('essential_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={EyeOff}
          title={t('disable_telemetry_basic_title')}
          description={t('disable_telemetry_basic_description')}
          actionType="toggle"
          defaultEnabled={telemetryDisabled}
          onAction={handleDisableTelemetry}
          badge={{ text: t('privacy_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={Navigation}
          title={t('disable_location_advanced_title')}
          description={t('disable_location_advanced_description')}
          actionType="button"
          actionLabel={t('disable_tracking_button')}
          onClick={handleDisableLocationAdvancedWithConfirm}
          badge={{ text: t('essential_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={MapPin}
          title={t('location_services_basic_title')}
          description={t('location_services_basic_description')}
          actionType="toggle"
          defaultEnabled={locationEnabled}
          onAction={handleLocationToggle}
        />

        <UtilityCard
          icon={Mic}
          title={t('microphone_access_title')}
          description={t('microphone_access_description')}
          actionType="toggle"
          defaultEnabled={micEnabled}
          onAction={handleMicrophoneToggle}
        />

        <UtilityCard
          icon={Camera}
          title={t('camera_access_title')}
          description={t('camera_access_description')}
          actionType="toggle"
          defaultEnabled={cameraEnabled}
          onAction={handleCameraToggle}
        />

        <UtilityCard
          icon={Globe}
          title={t('web_privacy_title')}
          description={t('web_privacy_description')}
          actionType="toggle"
          defaultEnabled={webPrivacy}
          onAction={handleWebPrivacy}
        />

        <UtilityCard
          icon={Eye}
          title={t('activity_history_title')}
          description={t('activity_history_description')}
          actionType="button"
          actionLabel={t('clear_history_button')}
          onClick={handleClearHistoryWithConfirm}
        />

        <UtilityCard
          icon={Cloud}
          title={t('remove_onedrive_title')}
          description={t('remove_onedrive_description')}
          actionType="button"
          actionLabel={t('remove_onedrive_button')}
          onClick={handleRemoveOneDriveWithConfirm}
          badge={{ text: t('advanced_badge'), type: 'error' }}
        />

        <UtilityCard
          icon={Shield}
          title={t('block_adobe_network_title')}
          description={t('block_adobe_network_description')}
          actionType="button"
          actionLabel={t('block_adobe_button')}
          onClick={handleBlockAdobeNetworkWithConfirm}
          badge={{ text: t('advanced_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={FileText}
          title={t('debloat_adobe_title')}
          description={t('debloat_adobe_description')}
          actionType="button"
          actionLabel={t('debloat_button')}
          onClick={handleDebloatAdobeWithConfirm}
          badge={{ text: t('advanced_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={Network}
          title={t('disable_teredo_title')}
          description={t('disable_teredo_description')}
          actionType="button"
          actionLabel={t('disable_button')}
          onClick={handleDisableTeredoWithConfirm}
          badge={{ text: t('advanced_badge'), type: 'warning' }}
        />

        <UtilityCard
          icon={Trash2}
          title={t('browser_cleaner_title') || 'Browser Cleaner'}
          description={t('browser_cleaner_description') || 'Clear browser history, cookies, and cache'}
          actionType="button"
          actionLabel={t('clean_browser') || 'Clean Browser'}
          onClick={() => setShowBrowserCleaner(true)}
          badge={{ text: t('privacy_badge') || 'Privacy', type: 'info' }}
        />
      </div>

      <BrowserCleanerModal
        isOpen={showBrowserCleaner}
        onClose={() => setShowBrowserCleaner(false)}
      />

      <ProcessModal
        isOpen={showProcess}
        title={processTitle}
        steps={processSteps}
        onClose={() => setShowProcess(false)}
      />

      <ConfirmDialog
        isOpen={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        confirmText={t('confirm_button') || 'Confirm'}
        cancelText={t('cancel_button') || 'Cancel'}
        variant="danger"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};
export default Privacy;
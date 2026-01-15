import { useState } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { ProcessModal, ProcessStep } from '../components/UI/ProcessModal';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { Network, RefreshCw, FileSearch, Package } from 'lucide-react';
import {
  removeAdobeCreativeCloud,
  resetNetwork,
  resetWindowsUpdate,
  runSystemCorruptionScan,
  reinstallWinget
} from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

const Fixes = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();

  const [showProcess, setShowProcess] = useState(false);
  const [processTitle, setProcessTitle] = useState('');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');

  const updateStep = (id: string, status: ProcessStep['status'], message?: string) => {
    setProcessSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status, message } : step
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

  const handleRemoveAdobeCC = async () => {
    setProcessTitle(t('process_modal_remove_adobe_cc_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_remove_adobe_cc_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_remove_adobe_cc_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_remove_adobe_cc_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_remove_adobe_cc_step_4'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('1', 'completed', t('process_modal_remove_adobe_cc_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep('2', 'completed', t('process_modal_remove_adobe_cc_step_2_completed'));

      updateStep('3', 'running');
      const result = await removeAdobeCreativeCloud();
      updateStep('3', 'completed', t('process_modal_remove_adobe_cc_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('4', 'completed', result);

      showNotification('success', t('success'), t('process_modal_remove_adobe_cc_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '4';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleResetNetwork = async () => {
    setProcessTitle(t('process_modal_reset_network_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_reset_network_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_reset_network_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_reset_network_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_reset_network_step_4'), status: 'pending' },
      { id: '5', title: t('process_modal_reset_network_step_5'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('1', 'completed', t('process_modal_reset_network_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('2', 'completed', t('process_modal_reset_network_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep('3', 'completed', t('process_modal_reset_network_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('4', 'completed', t('process_modal_reset_network_step_4_completed'));

      updateStep('5', 'running');
      const result = await resetNetwork();
      updateStep('5', 'completed', result);

      showNotification('success', t('success'), t('process_modal_reset_network_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '5';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleResetWindowsUpdate = async () => {
    setProcessTitle(t('process_modal_reset_windows_update_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_reset_windows_update_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_reset_windows_update_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_reset_windows_update_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_reset_windows_update_step_4'), status: 'pending' },
      { id: '5', title: t('process_modal_reset_windows_update_step_5'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('1', 'completed', t('process_modal_reset_windows_update_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 1500));
      updateStep('2', 'completed', t('process_modal_reset_windows_update_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('3', 'completed', t('process_modal_reset_windows_update_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('4', 'completed', t('process_modal_reset_windows_update_step_4_completed'));

      updateStep('5', 'running');
      const result = await resetWindowsUpdate();
      updateStep('5', 'completed', result);

      showNotification('success', t('success'), t('process_modal_reset_windows_update_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '5';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleSystemCorruptionScan = async () => {
    setProcessTitle(t('process_modal_system_corruption_scan_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_system_corruption_scan_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_system_corruption_scan_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_system_corruption_scan_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_system_corruption_scan_step_4'), status: 'pending' },
      { id: '5', title: t('process_modal_system_corruption_scan_step_5'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep('1', 'completed', t('process_modal_system_corruption_scan_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 3000));
      updateStep('2', 'completed', t('process_modal_system_corruption_scan_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep('3', 'completed', t('process_modal_system_corruption_scan_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep('4', 'completed', t('process_modal_system_corruption_scan_step_4_completed'));

      updateStep('5', 'running');
      const result = await runSystemCorruptionScan();
      updateStep('5', 'completed', result);

      showNotification('success', t('success'), t('process_modal_system_corruption_scan_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '5';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleReinstallWinget = async () => {
    setProcessTitle(t('process_modal_reinstall_winget_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_reinstall_winget_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_reinstall_winget_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_reinstall_winget_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_reinstall_winget_step_4'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('1', 'completed', t('process_modal_reinstall_winget_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep('2', 'completed', t('process_modal_reinstall_winget_step_2_completed'));

      updateStep('3', 'running');
      const result = await reinstallWinget();
      updateStep('3', 'completed', t('process_modal_reinstall_winget_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('4', 'completed', result);

      showNotification('success', t('success'), t('process_modal_reinstall_winget_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '4';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleRemoveAdobeCCWithConfirm = () => {
    askConfirmation(
      t('confirm_remove_adobe_cc_title') || 'Remove Adobe Creative Cloud?',
      t('confirm_remove_adobe_cc_message') || 'This will remove Adobe Creative Cloud completely. Continue?',
      handleRemoveAdobeCC
    );
  };

  const handleResetNetworkWithConfirm = () => {
    askConfirmation(
      t('confirm_reset_network_title') || 'Reset Network Settings?',
      t('confirm_reset_network_message') || 'This will reset all network settings. You will need to restart. Continue?',
      handleResetNetwork
    );
  };

  return (
    <div className="fixes-page">
      <div className="page-header">
        <h2 className="page-title">{t('fixes_page_title')}</h2>
        <p className="page-description">{t('fixes_page_description')}</p>
      </div>

      <div className="grid-auto">
        <UtilityCard
          icon={Package}
          title={t('fixes_remove_adobe_cc_title')}
          description={t('fixes_remove_adobe_cc_description')}
          actionType="button"
          actionLabel={t('fixes_remove_adobe_cc_action_label')}
          onClick={handleRemoveAdobeCCWithConfirm}
          badge={{ text: t('fixes_remove_adobe_cc_badge'), type: 'warning' }}
          detailedInfo={{
            description: t('fixes_remove_adobe_cc_detailed_description'),
            features: [
              t('fixes_remove_adobe_cc_feature_1'),
              t('fixes_remove_adobe_cc_feature_2'),
              t('fixes_remove_adobe_cc_feature_3'),
              t('fixes_remove_adobe_cc_feature_4'),
              t('fixes_remove_adobe_cc_feature_5'),
            ],
            requirements: [
              t('fixes_remove_adobe_cc_requirement_1'),
              t('fixes_remove_adobe_cc_requirement_2'),
              t('fixes_remove_adobe_cc_requirement_3'),
            ],
            warnings: [
              t('fixes_remove_adobe_cc_warning_1'),
              t('fixes_remove_adobe_cc_warning_2'),
              t('fixes_remove_adobe_cc_warning_3'),
              t('fixes_remove_adobe_cc_warning_4'),
            ],
            technicalDetails: t('fixes_remove_adobe_cc_tech_details'),
          }}
        />

        <UtilityCard
          icon={Network}
          title={t('fixes_reset_network_title')}
          description={t('fixes_reset_network_description')}
          actionType="button"
          actionLabel={t('fixes_reset_network_action_label')}
          onClick={handleResetNetworkWithConfirm}
          badge={{ text: t('fixes_reset_network_badge'), type: 'info' }}
          detailedInfo={{
            description: t('fixes_reset_network_detailed_description'),
            features: [
              t('fixes_reset_network_feature_1'),
              t('fixes_reset_network_feature_2'),
              t('fixes_reset_network_feature_3'),
              t('fixes_reset_network_feature_4'),
              t('fixes_reset_network_feature_5'),
              t('fixes_reset_network_feature_6'),
            ],
            requirements: [
              t('fixes_reset_network_requirement_1'),
              t('fixes_reset_network_requirement_2'),
              t('fixes_reset_network_requirement_3'),
            ],
            warnings: [
              t('fixes_reset_network_warning_1'),
              t('fixes_reset_network_warning_2'),
              t('fixes_reset_network_warning_3'),
              t('fixes_reset_network_warning_4'),
            ],
            technicalDetails: t('fixes_reset_network_tech_details'),
          }}
        />

        <UtilityCard
          icon={RefreshCw}
          title={t('fixes_reset_windows_update_title')}
          description={t('fixes_reset_windows_update_description')}
          actionType="button"
          actionLabel={t('fixes_reset_windows_update_action_label')}
          onClick={handleResetWindowsUpdate}
          badge={{ text: t('fixes_reset_windows_update_badge'), type: 'info' }}
          detailedInfo={{
            description: t('fixes_reset_windows_update_detailed_description'),
            features: [
              t('fixes_reset_windows_update_feature_1'),
              t('fixes_reset_windows_update_feature_2'),
              t('fixes_reset_windows_update_feature_3'),
              t('fixes_reset_windows_update_feature_4'),
              t('fixes_reset_windows_update_feature_5'),
              t('fixes_reset_windows_update_feature_6'),
            ],
            requirements: [
              t('fixes_reset_windows_update_requirement_1'),
              t('fixes_reset_windows_update_requirement_2'),
              t('fixes_reset_windows_update_requirement_3'),
            ],
            warnings: [
              t('fixes_reset_windows_update_warning_1'),
              t('fixes_reset_windows_update_warning_2'),
              t('fixes_reset_windows_update_warning_3'),
              t('fixes_reset_windows_update_warning_4'),
            ],
            technicalDetails: t('fixes_reset_windows_update_tech_details'),
          }}
        />

        <UtilityCard
          icon={FileSearch}
          title={t('fixes_system_corruption_scan_title')}
          description={t('fixes_system_corruption_scan_description')}
          actionType="button"
          actionLabel={t('fixes_system_corruption_scan_action_label')}
          onClick={handleSystemCorruptionScan}
          badge={{ text: t('fixes_system_corruption_scan_badge'), type: 'info' }}
          detailedInfo={{
            description: t('fixes_system_corruption_scan_detailed_description'),
            features: [
              t('fixes_system_corruption_scan_feature_1'),
              t('fixes_system_corruption_scan_feature_2'),
              t('fixes_system_corruption_scan_feature_3'),
              t('fixes_system_corruption_scan_feature_4'),
              t('fixes_system_corruption_scan_feature_5'),
              t('fixes_system_corruption_scan_feature_6'),
            ],
            requirements: [
              t('fixes_system_corruption_scan_requirement_1'),
              t('fixes_system_corruption_scan_requirement_2'),
              t('fixes_system_corruption_scan_requirement_3'),
              t('fixes_system_corruption_scan_requirement_4'),
            ],
            warnings: [
              t('fixes_system_corruption_scan_warning_1'),
              t('fixes_system_corruption_scan_warning_2'),
              t('fixes_system_corruption_scan_warning_3'),
              t('fixes_system_corruption_scan_warning_4'),
            ],
            technicalDetails: t('fixes_system_corruption_scan_tech_details'),
          }}
        />

        <UtilityCard
          icon={Package}
          title={t('fixes_reinstall_winget_title')}
          description={t('fixes_reinstall_winget_description')}
          actionType="button"
          actionLabel={t('fixes_reinstall_winget_action_label')}
          onClick={handleReinstallWinget}
          detailedInfo={{
            description: t('fixes_reinstall_winget_detailed_description'),
            features: [
              t('fixes_reinstall_winget_feature_1'),
              t('fixes_reinstall_winget_feature_2'),
              t('fixes_reinstall_winget_feature_3'),
              t('fixes_reinstall_winget_feature_4'),
              t('fixes_reinstall_winget_feature_5'),
              t('fixes_reinstall_winget_feature_6'),
            ],
            requirements: [
              t('fixes_reinstall_winget_requirement_1'),
              t('fixes_reinstall_winget_requirement_2'),
              t('fixes_reinstall_winget_requirement_3'),
              t('fixes_reinstall_winget_requirement_4'),
            ],
            warnings: [
              t('fixes_reinstall_winget_warning_1'),
              t('fixes_reinstall_winget_warning_2'),
              t('fixes_reinstall_winget_warning_3'),
              t('fixes_reinstall_winget_warning_4'),
            ],
            technicalDetails: t('fixes_reinstall_winget_tech_details'),
          }}
        />
      </div>

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
export default Fixes;

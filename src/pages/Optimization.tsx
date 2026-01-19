import { useState } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { ProcessModal, ProcessStep } from '../components/UI/ProcessModal';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { HardDrive, Search, Trash2, Database, Wifi, Home, Gamepad2, Moon, Zap, ZapOff, Settings, Cpu } from 'lucide-react';
import {
  clearTempFiles,
  optimizeSsd,
  rebuildSearchIndex,
  runDiskCleanup,
  flushDnsCache,
  removeHomeGallery,
  disableGameDvr,
  disableHibernation,
  addUltimatePowerPlan,
  removeUltimatePowerPlan,
  setServicesManual,
  scanOutdatedDrivers,
  getFastStartupStatus
} from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';

interface DriverScanItem {
  Name?: string;
  DriverVersion?: string;
  DriverDate?: string;
  Manufacturer?: string;
  AgeYears?: number;
  Outdated?: boolean;
  OfficialUrl?: string;
  SearchUrl?: string;
}

interface FastStartupStatus {
  FastStartupEnabled?: boolean;
  HibernationEnabled?: boolean;
  EffectiveFastStartup?: boolean;
  Recommendation?: string;
}

const Optimization = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();

  const [showProcess, setShowProcess] = useState(false);
  const [processTitle, setProcessTitle] = useState('');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [driverScanLoading, setDriverScanLoading] = useState(false);
  const [driverScanItems, setDriverScanItems] = useState<DriverScanItem[]>([]);
  const [fastStartupLoading, setFastStartupLoading] = useState(false);
  const [fastStartupStatus, setFastStartupStatus] = useState<FastStartupStatus | null>(null);

  const updateStep = (id: string, status: ProcessStep['status'], message?: string) => {
    setProcessSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status, message } : step
    ));
  };

  const handleClearTemp = async () => {
    setProcessTitle(t('process_modal_clear_temp_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_clear_temp_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_clear_temp_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_clear_temp_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_clear_temp_step_4'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('1', 'completed', t('process_modal_clear_temp_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('2', 'completed', t('process_modal_clear_temp_step_2_completed'));

      updateStep('3', 'running');
      const result = await clearTempFiles();
      updateStep('3', 'completed', t('process_modal_clear_temp_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('4', 'completed', result);

      showNotification('success', t('success'), t('process_modal_clear_temp_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '4';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleOptimizeSSD = async () => {
    setProcessTitle(t('process_modal_optimize_ssd_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_optimize_ssd_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_optimize_ssd_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_optimize_ssd_step_3'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep('1', 'completed', t('process_modal_optimize_ssd_step_1_completed'));

      updateStep('2', 'running');
      await optimizeSsd();
      updateStep('2', 'completed', t('process_modal_optimize_ssd_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('3', 'completed', t('process_modal_optimize_ssd_step_3_completed'));

      showNotification('success', t('success'), t('process_modal_optimize_ssd_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleRebuildSearch = async () => {
    setProcessTitle(t('process_modal_rebuild_search_index_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_rebuild_search_index_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_rebuild_search_index_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_rebuild_search_index_step_3'), status: 'pending' },
      { id: '4', title: t('process_modal_rebuild_search_index_step_4'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('1', 'completed', t('process_modal_rebuild_search_index_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep('2', 'completed', t('process_modal_rebuild_search_index_step_2_completed'));

      updateStep('3', 'running');
      const result = await rebuildSearchIndex();
      updateStep('3', 'completed', t('process_modal_rebuild_search_index_step_3_completed'));

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('4', 'completed', result);

      showNotification('success', t('success'), t('process_modal_rebuild_search_index_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '4';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleDiskCleanup = async () => {
    try {
      showNotification('info', t('process_modal_disk_cleanup_starting_title'), t('process_modal_disk_cleanup_starting_message'));
      const result = await runDiskCleanup();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleFlushDns = async () => {
    try {
      const result = await flushDnsCache();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleRemoveHomeGallery = async () => {
    setProcessTitle(t('process_modal_remove_home_gallery_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_remove_home_gallery_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_remove_home_gallery_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_remove_home_gallery_step_3'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      const result = await removeHomeGallery();
      updateStep('1', 'completed', t('process_modal_remove_home_gallery_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('2', 'completed', t('process_modal_remove_home_gallery_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 800));
      updateStep('3', 'completed', result);

      showNotification('success', t('success'), t('process_modal_remove_home_gallery_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleDisableGameDvr = async () => {
    setProcessTitle(t('process_modal_disable_gamedvr_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_disable_gamedvr_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_disable_gamedvr_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_disable_gamedvr_step_3'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('1', 'completed', t('process_modal_disable_gamedvr_step_1_completed'));

      updateStep('2', 'running');
      const result = await disableGameDvr();
      updateStep('2', 'completed', t('process_modal_disable_gamedvr_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('3', 'completed', result);

      showNotification('success', t('success'), t('process_modal_disable_gamedvr_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleDisableHibernation = async () => {
    try {
      const result = await disableHibernation();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleAddUltimatePowerPlan = async () => {
    setProcessTitle(t('process_modal_add_ultimate_power_plan_title'));
    setProcessSteps([
      { id: '1', title: t('process_modal_add_ultimate_power_plan_step_1'), status: 'pending' },
      { id: '2', title: t('process_modal_add_ultimate_power_plan_step_2'), status: 'pending' },
      { id: '3', title: t('process_modal_add_ultimate_power_plan_step_3'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      const result = await addUltimatePowerPlan();
      updateStep('1', 'completed', t('process_modal_add_ultimate_power_plan_step_1_completed'));

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('2', 'completed', t('process_modal_add_ultimate_power_plan_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 300));
      updateStep('3', 'completed', result);

      showNotification('success', t('success'), t('process_modal_add_ultimate_power_plan_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleRemoveUltimatePowerPlan = async () => {
    try {
      const result = await removeUltimatePowerPlan();
      showNotification('success', t('success'), result);
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleSetServicesManual = async () => {
    setProcessTitle(t('optimization_set_services_manual_title'));
    setProcessSteps([
      { id: '1', title: t('optimization_set_services_manual_step_1'), status: 'pending' },
      { id: '2', title: t('optimization_set_services_manual_step_2'), status: 'pending' },
      { id: '3', title: t('optimization_set_services_manual_step_3'), status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('1', 'completed', t('optimization_set_services_manual_step_1_completed'));

      updateStep('2', 'running');
      const result = await setServicesManual();
      updateStep('2', 'completed', t('optimization_set_services_manual_step_2_completed'));

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('3', 'completed', result);

      showNotification('success', t('success'), t('optimization_set_services_manual_success'));
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleScanDrivers = async () => {
    setDriverScanLoading(true);
    setDriverScanItems([]);
    try {
      const result = await scanOutdatedDrivers();
      const parsed = JSON.parse(result || '[]');
      if (Array.isArray(parsed)) {
        setDriverScanItems(parsed as DriverScanItem[]);
      } else {
        setDriverScanItems([]);
      }
      showNotification('success', t('success'), t('utility_driver_scan_completed') || t('utility_driver_scan_button'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setDriverScanLoading(false);
    }
  };

  const handleCheckFastStartup = async () => {
    setFastStartupLoading(true);
    setFastStartupStatus(null);
    try {
      const result = await getFastStartupStatus();
      const parsed = JSON.parse(result || '{}');
      if (parsed && typeof parsed === 'object') {
        setFastStartupStatus({
          FastStartupEnabled: parsed.FastStartupEnabled,
          HibernationEnabled: parsed.HibernationEnabled,
          EffectiveFastStartup: parsed.EffectiveFastStartup,
          Recommendation: parsed.Recommendation
        });
      }
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    } finally {
      setFastStartupLoading(false);
    }
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

  const handleClearTempWithConfirm = () => {
    askConfirmation(
      t('confirm_clear_temp_title') || 'Clear Temporary Files?',
      t('confirm_clear_temp_message') || 'This will delete all temporary files. Continue?',
      handleClearTemp
    );
  };

  const handleSetServicesManualWithConfirm = () => {
    askConfirmation(
      t('confirm_set_services_manual_title') || 'Set Services to Manual?',
      t('confirm_set_services_manual_message') || 'This will set some Windows services to manual startup. Continue?',
      handleSetServicesManual
    );
  };

  return (
    <div className="optimization-page">
      <div className="page-header">
        <h2 className="page-title">{t('optimization_page_title')}</h2>
        <p className="page-description">{t('optimization_page_description')}</p>
      </div>

      <div className="grid-auto">
        <UtilityCard
          icon={Trash2}
          title={t('optimization_clear_temp_title')}
          description={t('optimization_clear_temp_description')}
          actionType="button"
          actionLabel={t('optimization_clear_temp_action_label')}
          onClick={handleClearTempWithConfirm}
          badge={{ text: t('optimization_clear_temp_badge'), type: 'info' }}
          detailedInfo={{
            description: t('optimization_clear_temp_detailed_description'),
            features: [
              t('optimization_clear_temp_feature_1'),
              t('optimization_clear_temp_feature_2'),
              t('optimization_clear_temp_feature_3'),
              t('optimization_clear_temp_feature_4'),
              t('optimization_clear_temp_feature_5'),
            ],
            requirements: [
              t('optimization_clear_temp_requirement_1'),
              t('optimization_clear_temp_requirement_2'),
              t('optimization_clear_temp_requirement_3'),
            ],
            warnings: [
              t('optimization_clear_temp_warning_1'),
              t('optimization_clear_temp_warning_2'),
              t('optimization_clear_temp_warning_3'),
            ],
            technicalDetails: t('optimization_clear_temp_tech_details'),
          }}
        />

        <UtilityCard
          icon={HardDrive}
          title={t('optimization_optimize_ssd_title')}
          description={t('optimization_optimize_ssd_description')}
          actionType="button"
          actionLabel={t('optimization_optimize_ssd_action_label')}
          onClick={handleOptimizeSSD}
          detailedInfo={{
            description: t('optimization_optimize_ssd_detailed_description'),
            features: [
              t('optimization_optimize_ssd_feature_1'),
              t('optimization_optimize_ssd_feature_2'),
              t('optimization_optimize_ssd_feature_3'),
              t('optimization_optimize_ssd_feature_4'),
              t('optimization_optimize_ssd_feature_5'),
            ],
            requirements: [
              t('optimization_optimize_ssd_requirement_1'),
              t('optimization_optimize_ssd_requirement_2'),
              t('optimization_optimize_ssd_requirement_3'),
            ],
            warnings: [
              t('optimization_optimize_ssd_warning_1'),
              t('optimization_optimize_ssd_warning_2'),
              t('optimization_optimize_ssd_warning_3'),
            ],
            technicalDetails: t('optimization_optimize_ssd_tech_details'),
          }}
        />

        <UtilityCard
          icon={Search}
          title={t('optimization_rebuild_search_index_title')}
          description={t('optimization_rebuild_search_index_description')}
          actionType="button"
          actionLabel={t('optimization_rebuild_search_index_action_label')}
          onClick={handleRebuildSearch}
          detailedInfo={{
            description: t('optimization_rebuild_search_index_detailed_description'),
            features: [
              t('optimization_rebuild_search_index_feature_1'),
              t('optimization_rebuild_search_index_feature_2'),
              t('optimization_rebuild_search_index_feature_3'),
              t('optimization_rebuild_search_index_feature_4'),
              t('optimization_rebuild_search_index_feature_5'),
            ],
            requirements: [
              t('optimization_rebuild_search_index_requirement_1'),
              t('optimization_rebuild_search_index_requirement_2'),
              t('optimization_rebuild_search_index_requirement_3'),
            ],
            warnings: [
              t('optimization_rebuild_search_index_warning_1'),
              t('optimization_rebuild_search_index_warning_2'),
              t('optimization_rebuild_search_index_warning_3'),
            ],
            technicalDetails: t('optimization_rebuild_search_index_tech_details'),
          }}
        />

        <UtilityCard
          icon={Database}
          title={t('optimization_disk_cleanup_title')}
          description={t('optimization_disk_cleanup_description')}
          actionType="button"
          actionLabel={t('optimization_disk_cleanup_action_label')}
          onClick={handleDiskCleanup}
          detailedInfo={{
            description: t('optimization_disk_cleanup_detailed_description'),
            features: [
              t('optimization_disk_cleanup_feature_1'),
              t('optimization_disk_cleanup_feature_2'),
              t('optimization_disk_cleanup_feature_3'),
              t('optimization_disk_cleanup_feature_4'),
              t('optimization_disk_cleanup_feature_5'),
            ],
            requirements: [
              t('optimization_disk_cleanup_requirement_1'),
              t('optimization_disk_cleanup_requirement_2'),
              t('optimization_disk_cleanup_requirement_3'),
            ],
            warnings: [
              t('optimization_disk_cleanup_warning_1'),
              t('optimization_disk_cleanup_warning_2'),
              t('optimization_disk_cleanup_warning_3'),
            ],
            technicalDetails: t('optimization_disk_cleanup_tech_details'),
          }}
        />

        <UtilityCard
          icon={Wifi}
          title={t('optimization_flush_dns_title')}
          description={t('optimization_flush_dns_description')}
          actionType="button"
          actionLabel={t('optimization_flush_dns_action_label')}
          onClick={handleFlushDns}
          detailedInfo={{
            description: t('optimization_flush_dns_detailed_description'),
            features: [
              t('optimization_flush_dns_feature_1'),
              t('optimization_flush_dns_feature_2'),
              t('optimization_flush_dns_feature_3'),
              t('optimization_flush_dns_feature_4'),
              t('optimization_flush_dns_feature_5'),
            ],
            requirements: [
              t('optimization_flush_dns_requirement_1'),
              t('optimization_flush_dns_requirement_2'),
              t('optimization_flush_dns_requirement_3'),
            ],
            warnings: [
              t('optimization_flush_dns_warning_1'),
              t('optimization_flush_dns_warning_2'),
              t('optimization_flush_dns_warning_3'),
            ],
            technicalDetails: t('optimization_flush_dns_tech_details'),
          }}
        />

        <UtilityCard
          icon={Home}
          title={t('optimization_remove_home_gallery_title')}
          description={t('optimization_remove_home_gallery_description')}
          actionType="button"
          actionLabel={t('optimization_remove_home_gallery_action_label')}
          onClick={handleRemoveHomeGallery}
          badge={{ text: t('optimization_remove_home_gallery_badge'), type: 'warning' }}
          detailedInfo={{
            description: t('optimization_remove_home_gallery_detailed_description'),
            features: [
              t('optimization_remove_home_gallery_feature_1'),
              t('optimization_remove_home_gallery_feature_2'),
              t('optimization_remove_home_gallery_feature_3'),
              t('optimization_remove_home_gallery_feature_4'),
              t('optimization_remove_home_gallery_feature_5'),
            ],
            requirements: [
              t('optimization_remove_home_gallery_requirement_1'),
              t('optimization_remove_home_gallery_requirement_2'),
              t('optimization_remove_home_gallery_requirement_3'),
            ],
            warnings: [
              t('optimization_remove_home_gallery_warning_1'),
              t('optimization_remove_home_gallery_warning_2'),
              t('optimization_remove_home_gallery_warning_3'),
            ],
            technicalDetails: t('optimization_remove_home_gallery_tech_details'),
          }}
        />

        <UtilityCard
          icon={Gamepad2}
          title={t('optimization_disable_gamedvr_title')}
          description={t('optimization_disable_gamedvr_description')}
          actionType="button"
          actionLabel={t('optimization_disable_gamedvr_action_label')}
          onClick={handleDisableGameDvr}
          badge={{ text: t('optimization_disable_gamedvr_badge'), type: 'info' }}
          detailedInfo={{
            description: t('optimization_disable_gamedvr_detailed_description'),
            features: [
              t('optimization_disable_gamedvr_feature_1'),
              t('optimization_disable_gamedvr_feature_2'),
              t('optimization_disable_gamedvr_feature_3'),
              t('optimization_disable_gamedvr_feature_4'),
              t('optimization_disable_gamedvr_feature_5'),
            ],
            requirements: [
              t('optimization_disable_gamedvr_requirement_1'),
              t('optimization_disable_gamedvr_requirement_2'),
              t('optimization_disable_gamedvr_requirement_3'),
            ],
            warnings: [
              t('optimization_disable_gamedvr_warning_1'),
              t('optimization_disable_gamedvr_warning_2'),
              t('optimization_disable_gamedvr_warning_3'),
              t('optimization_disable_gamedvr_warning_4'),
            ],
            technicalDetails: t('optimization_disable_gamedvr_tech_details'),
          }}
        />

        <UtilityCard
          icon={Moon}
          title={t('optimization_disable_hibernation_title')}
          description={t('optimization_disable_hibernation_description')}
          actionType="button"
          actionLabel={t('optimization_disable_hibernation_action_label')}
          onClick={handleDisableHibernation}
          detailedInfo={{
            description: t('optimization_disable_hibernation_detailed_description'),
            features: [
              t('optimization_disable_hibernation_feature_1'),
              t('optimization_disable_hibernation_feature_2'),
              t('optimization_disable_hibernation_feature_3'),
              t('optimization_disable_hibernation_feature_4'),
              t('optimization_disable_hibernation_feature_5'),
            ],
            requirements: [
              t('optimization_disable_hibernation_requirement_1'),
              t('optimization_disable_hibernation_requirement_2'),
              t('optimization_disable_hibernation_requirement_3'),
            ],
            warnings: [
              t('optimization_disable_hibernation_warning_1'),
              t('optimization_disable_hibernation_warning_2'),
              t('optimization_disable_hibernation_warning_3'),
              t('optimization_disable_hibernation_warning_4'),
            ],
            technicalDetails: t('optimization_disable_hibernation_tech_details'),
          }}
        />

        <UtilityCard
          icon={Cpu}
          title={t('utility_driver_scan_title')}
          description={t('utility_driver_scan_description')}
          actionType="custom"
        >
          <div>
            <button className="action-btn" onClick={handleScanDrivers} disabled={driverScanLoading}>
              {driverScanLoading ? t('utility_scanning') : t('utility_driver_scan_button')}
            </button>
          </div>
          {driverScanItems.length === 0 && !driverScanLoading ? (
            <div className="utility-result">
              <div className="utility-result-row">
                <span>{t('utility_driver_scan_empty')}</span>
              </div>
            </div>
          ) : (
            <div className="utility-result-list">
              {driverScanItems.map((item) => (
                <div key={`${item.Name}-${item.DriverVersion}`} className="utility-result-item">
                  <div className="utility-result-item-title">{item.Name}</div>
                  <div>{t('utility_driver_scan_vendor')}: {item.Manufacturer || '-'}</div>
                  <div>{t('utility_driver_scan_version')}: {item.DriverVersion || '-'}</div>
                  <div>{t('utility_driver_scan_age')}: {item.AgeYears || 0}y</div>
                  <div>
                    <a
                      className="utility-link"
                      href={item.OfficialUrl || item.SearchUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('utility_driver_scan_link')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </UtilityCard>

        <UtilityCard
          icon={Zap}
          title={t('utility_fast_startup_title')}
          description={t('utility_fast_startup_description')}
          actionType="custom"
        >
          <div>
            <button className="action-btn" onClick={handleCheckFastStartup} disabled={fastStartupLoading}>
              {fastStartupLoading ? t('utility_scanning') : t('utility_fast_startup_check')}
            </button>
          </div>
          {fastStartupStatus && (
            <div className="utility-result">
              <div className="utility-result-row">
                <span>{t('utility_fast_startup_status')}</span>
                <span>{fastStartupStatus.EffectiveFastStartup ? t('enabled') || 'Enabled' : t('disabled') || 'Disabled'}</span>
              </div>
              <div className="utility-result-row">
                <span>{t('utility_fast_startup_hibernation')}</span>
                <span>{fastStartupStatus.HibernationEnabled ? t('enabled') || 'Enabled' : t('disabled') || 'Disabled'}</span>
              </div>
              {fastStartupStatus.Recommendation && (
                <div className="utility-result-row">
                  <span>{t('utility_fast_startup_recommendation')}</span>
                  <span>{fastStartupStatus.Recommendation}</span>
                </div>
              )}
            </div>
          )}
        </UtilityCard>

        <UtilityCard
          icon={Zap}
          title={t('optimization_add_ultimate_power_plan_title')}
          description={t('optimization_add_ultimate_power_plan_description')}
          actionType="button"
          actionLabel={t('optimization_add_ultimate_power_plan_action_label')}
          onClick={handleAddUltimatePowerPlan}
          badge={{ text: t('optimization_add_ultimate_power_plan_badge'), type: 'info' }}
          detailedInfo={{
            description: t('optimization_add_ultimate_power_plan_detailed_description'),
            features: [
              t('optimization_add_ultimate_power_plan_feature_1'),
              t('optimization_add_ultimate_power_plan_feature_2'),
              t('optimization_add_ultimate_power_plan_feature_3'),
              t('optimization_add_ultimate_power_plan_feature_4'),
              t('optimization_add_ultimate_power_plan_feature_5'),
              t('optimization_add_ultimate_power_plan_feature_6'),
            ],
            requirements: [
              t('optimization_add_ultimate_power_plan_requirement_1'),
              t('optimization_add_ultimate_power_plan_requirement_2'),
              t('optimization_add_ultimate_power_plan_requirement_3'),
            ],
            warnings: [
              t('optimization_add_ultimate_power_plan_warning_1'),
              t('optimization_add_ultimate_power_plan_warning_2'),
              t('optimization_add_ultimate_power_plan_warning_3'),
              t('optimization_add_ultimate_power_plan_warning_4'),
            ],
            technicalDetails: t('optimization_add_ultimate_power_plan_tech_details'),
          }}
        />

        <UtilityCard
          icon={ZapOff}
          title={t('optimization_remove_ultimate_power_plan_title')}
          description={t('optimization_remove_ultimate_power_plan_description')}
          actionType="button"
          actionLabel={t('optimization_remove_ultimate_power_plan_action_label')}
          onClick={handleRemoveUltimatePowerPlan}
          detailedInfo={{
            description: t('optimization_remove_ultimate_power_plan_detailed_description'),
            features: [
              t('optimization_remove_ultimate_power_plan_feature_1'),
              t('optimization_remove_ultimate_power_plan_feature_2'),
              t('optimization_remove_ultimate_power_plan_feature_3'),
              t('optimization_remove_ultimate_power_plan_feature_4'),
            ],
            requirements: [
              t('optimization_remove_ultimate_power_plan_requirement_1'),
              t('optimization_remove_ultimate_power_plan_requirement_2'),
            ],
            warnings: [
              t('optimization_remove_ultimate_power_plan_warning_1'),
              t('optimization_remove_ultimate_power_plan_warning_2'),
            ],
            technicalDetails: t('optimization_remove_ultimate_power_plan_tech_details'),
          }}
        />

        <UtilityCard
          icon={Settings}
          title={t('optimization_set_services_manual_title')}
          description={t('optimization_set_services_manual_description')}
          actionType="button"
          actionLabel={t('optimization_set_services_manual_action_label')}
          onClick={handleSetServicesManualWithConfirm}
          badge={{ text: t('optimization_set_services_manual_badge'), type: 'warning' }}
          detailedInfo={{
            description: t('optimization_set_services_manual_detailed_description'),
            features: [
              t('optimization_set_services_manual_feature_1'),
              t('optimization_set_services_manual_feature_2'),
              t('optimization_set_services_manual_feature_3'),
              t('optimization_set_services_manual_feature_4'),
              t('optimization_set_services_manual_feature_5'),
            ],
            requirements: [
              t('optimization_set_services_manual_requirement_1'),
              t('optimization_set_services_manual_requirement_2'),
            ],
            warnings: [
              t('optimization_set_services_manual_warning_1'),
              t('optimization_set_services_manual_warning_2'),
              t('optimization_set_services_manual_warning_3'),
            ],
            technicalDetails: t('optimization_set_services_manual_tech_details'),
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

export default Optimization;


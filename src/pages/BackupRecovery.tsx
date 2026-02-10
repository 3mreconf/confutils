import React, { useState, useEffect, useCallback } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Save, RotateCcw, Trash2, RefreshCw, Clock, AlertTriangle, HardDrive, History, Loader2 } from 'lucide-react';
import { createRestorePoint, listRestorePoints, restoreSystem, deleteRestorePoint } from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { ProcessModal, ProcessStep } from '../components/UI/ProcessModal';
import './BackupRecovery.css';

interface RestorePoint {
  SequenceNumber: number;
  CreationTime: string;
  Description: string;
  RestorePointType: number;
}

const BackupRecovery: React.FC = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showProcess, setShowProcess] = useState(false);
  const [processTitle, setProcessTitle] = useState('');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  const fetchRestorePoints = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRestorePoints();
      
      if (!result || result.trim().length === 0) {
        setRestorePoints([]);
        return;
      }
      
      try {
        const parsed: RestorePoint[] = JSON.parse(result);
        if (Array.isArray(parsed)) {
          setRestorePoints(parsed.sort((a, b) => b.SequenceNumber - a.SequenceNumber));
        } else {
          setRestorePoints([]);
        }
      } catch (parseError) {
        console.warn('Failed to parse restore points JSON:', parseError, 'Raw result:', result);
        setRestorePoints([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('JSON')) {
        showNotification('error', t('error'), `${error}`);
      }
      setRestorePoints([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification, t]);

  useEffect(() => {
    fetchRestorePoints();
  }, [fetchRestorePoints]);

  const updateStep = (id: string, status: ProcessStep['status'], message?: string) => {
    setProcessSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status, message } : step
    ));
  };

  const handleCreateRestorePoint = async () => {
    setProcessTitle(t('creating_restore_point') || 'Creating Restore Point');
    setProcessSteps([
      { id: '1', title: t('restore_point_step_1') || 'Preparing system...', status: 'pending' },
      { id: '2', title: t('restore_point_step_2') || 'Enabling System Restore...', status: 'pending' },
      { id: '3', title: t('restore_point_step_3') || 'Creating restore point...', status: 'pending' },
      { id: '4', title: t('restore_point_step_4') || 'Finalizing...', status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('1', 'completed', t('restore_point_step_1_completed') || 'System prepared');

      updateStep('2', 'running');
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep('2', 'completed', t('restore_point_step_2_completed') || 'System Restore enabled');

      updateStep('3', 'running');
      const result = await createRestorePoint();
      updateStep('3', 'completed', t('restore_point_step_3_completed') || 'Restore point created');

      updateStep('4', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('4', 'completed', result);

      showNotification('success', t('success'), t('restore_point_created') || 'Restore point created successfully');
      await fetchRestorePoints();
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '4';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleRestoreSystem = (sequenceNumber: number, description: string) => {
    setConfirmTitle(t('confirm_restore_title') || 'Restore System?');
    setConfirmMessage(
      t('confirm_restore_message') || 
      `This will restore your system to the restore point created on ${new Date(description).toLocaleString()}. This action cannot be undone. Continue?`
    );
    setConfirmAction(() => async () => {
      setShowConfirm(false);
      setProcessTitle(t('restoring_system') || 'Restoring System');
      setProcessSteps([
        { id: '1', title: t('restore_step_1') || 'Preparing restore...', status: 'pending' },
        { id: '2', title: t('restore_step_2') || 'Restoring system...', status: 'pending' },
        { id: '3', title: t('restore_step_3') || 'System will restart...', status: 'pending' },
      ]);
      setShowProcess(true);

      try {
        updateStep('1', 'running');
        await new Promise(resolve => setTimeout(resolve, 1000));
        updateStep('1', 'completed', t('restore_step_1_completed') || 'Ready to restore');

        updateStep('2', 'running');
        await restoreSystem(sequenceNumber);
        updateStep('2', 'completed', t('restore_step_2_completed') || 'System restored');

        updateStep('3', 'running');
        showNotification('success', t('success'), t('system_restored') || 'System restored. Restarting...');
      } catch (error) {
        const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
        updateStep(currentStep, 'error', `${error}`);
        showNotification('error', t('error'), `${error}`);
      }
    });
    setShowConfirm(true);
  };

  const handleDeleteRestorePoint = (sequenceNumber: number) => {
    setConfirmTitle(t('confirm_delete_restore_point_title') || 'Delete Restore Point?');
    setConfirmMessage(t('confirm_delete_restore_point_message') || 'This will permanently delete this restore point. Continue?');
    setConfirmAction(() => async () => {
      setShowConfirm(false);
      try {
        await deleteRestorePoint(sequenceNumber);
        showNotification('success', t('success'), t('restore_point_deleted') || 'Restore point deleted');
        await fetchRestorePoints();
      } catch (error) {
        showNotification('error', t('error'), `${error}`);
      }
    });
    setShowConfirm(true);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const getRestorePointType = (type: number) => {
    switch (type) {
      case 0: return t('restore_point_type_application') || 'Application Install';
      case 1: return t('restore_point_type_modify') || 'Modify Settings';
      case 2: return t('restore_point_type_cancelled') || 'Cancelled Operation';
      default: return t('restore_point_type_unknown') || 'Unknown';
    }
  };

  return (
    <div className="page-container backup-recovery-page">
      <div className="page-header">
        <h2 className="page-title">{t('backup_recovery_title') || 'Backup & Recovery'}</h2>
        <p className="page-description">{t('backup_recovery_description') || 'Manage system restore points and backups'}</p>
      </div>

      <div className="backup-actions">
        <UtilityCard
          icon={Save}
          title={t('create_restore_point_title') || 'Create Restore Point'}
          description={t('create_restore_point_description') || 'Create a new system restore point'}
          actionType="button"
          actionLabel={t('create_now') || 'Create Now'}
          onAction={handleCreateRestorePoint}
          badge={{ text: t('recommended_badge') || 'Recommended', type: 'info' }}
        />
      </div>

      <div className="restore-points-section">
        <div className="section-header">
          <h3>{t('restore_points_title') || 'System Restore Points'}</h3>
          <button className="refresh-btn" onClick={fetchRestorePoints} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            {t('refresh') || 'Refresh'}
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <Loader2 size={32} />
            <p>{t('loading_restore_points') || 'Loading restore points...'}</p>
          </div>
        ) : restorePoints.length === 0 ? (
          <div className="empty-state">
            <History size={48} />
            <p>{t('no_restore_points') || 'No restore points found'}</p>
            <p className="empty-hint">{t('create_first_restore_point') || 'Create your first restore point to get started'}</p>
          </div>
        ) : (
          <div className="restore-points-list">
            {restorePoints.map((point) => (
              <div key={point.SequenceNumber} className="restore-point-item">
                <div className="restore-point-info">
                  <div className="restore-point-header">
                    <h4>{point.Description || t('restore_point_default_name') || 'System Restore Point'}</h4>
                    <span className="restore-point-type">{getRestorePointType(point.RestorePointType)}</span>
                  </div>
                  <div className="restore-point-details">
                    <div className="detail-row">
                      <Clock size={16} />
                      <span>{formatDate(point.CreationTime)}</span>
                    </div>
                    <div className="detail-row">
                      <HardDrive size={16} />
                      <span>{t('sequence_number') || 'Sequence'}: {point.SequenceNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="restore-point-actions">
                  <button
                    className="action-btn restore-btn"
                    onClick={() => handleRestoreSystem(point.SequenceNumber, point.CreationTime)}
                    title={t('restore_system') || 'Restore System'}
                  >
                    <RotateCcw size={18} />
                    {t('restore') || 'Restore'}
                  </button>
                  <button
                    className="action-btn delete-btn"
                    onClick={() => handleDeleteRestorePoint(point.SequenceNumber)}
                    title={t('delete_restore_point') || 'Delete Restore Point'}
                  >
                    <Trash2 size={18} />
                    {t('delete') || 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="backup-info">
        <div className="info-card">
          <AlertTriangle size={24} />
          <div>
            <h4>{t('backup_warning_title') || 'Important Notes'}</h4>
            <ul>
              <li>{t('backup_warning_1') || 'System restore points are automatically created by Windows'}</li>
              <li>{t('backup_warning_2') || 'Restoring will revert system settings and installed programs'}</li>
              <li>{t('backup_warning_3') || 'Your personal files will not be affected'}</li>
              <li>{t('backup_warning_4') || 'The system will restart during restore'}</li>
            </ul>
          </div>
        </div>
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
        onConfirm={() => {
          if (confirmAction) confirmAction();
        }}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
};

export default BackupRecovery;


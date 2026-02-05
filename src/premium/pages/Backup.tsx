import {
  Database,
  ShieldCheck,
  Cloud,
  HardDrive,
  Clock,
  Download,
  Upload
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface BackupProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

const buildBackupPoints = (t: (key: any) => string) => ([
  { id: 'bp-001', label: t('backup_point_system'), time: t('backup_time_today'), size: '18.4 GB', status: t('backup_verified') },
  { id: 'bp-002', label: t('backup_point_drivers'), time: t('backup_time_yesterday'), size: '6.2 GB', status: t('backup_verified') },
  { id: 'bp-003', label: t('backup_point_config'), time: t('backup_time_feb2'), size: '420 MB', status: t('backup_verified') }
]);

export default function Backup({ showToast }: BackupProps) {
  const { t } = useI18n();
  const backupPoints = buildBackupPoints(t);
  const handleBackup = () => {
    showToast('info', t('backup_started'), t('backup_started_msg'));
    setTimeout(() => {
      showToast('success', t('backup_complete'), t('backup_complete_msg'));
    }, 1400);
  };

  const handleRestore = () => {
    showToast('warning', t('backup_restore_queued'), t('backup_restore_msg'));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('backup_title')}
          </h2>
          <p className="text-muted mt-sm">{t('backup_subtitle')}</p>
        </div>
        <div className="flex items-center gap-sm">
          <button className="btn btn-secondary" onClick={handleRestore}>
            <Download size={16} />
            {t('backup_restore')}
          </button>
          <button className="btn btn-primary" onClick={handleBackup}>
            <Upload size={16} />
            {t('backup_new')}
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-md">
            <span className="stat-label">{t('backup_last')}</span>
            <Clock size={18} color="var(--cyan)" className="opacity-70" />
          </div>
          <div className="stat-value">2h<span className="stat-unit"> {t('ago')}</span></div>
          <div className="stat-change positive">
            <ShieldCheck size={12} /> {t('verified')}
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-md">
            <span className="stat-label">{t('backup_local_storage')}</span>
            <HardDrive size={18} color="var(--amber)" className="opacity-70" />
          </div>
          <div className="stat-value">64<span className="stat-unit">%</span></div>
          <div className="stat-change negative">
            <Database size={12} /> 312 GB {t('used')}
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-md">
            <span className="stat-label">{t('backup_cloud_sync')}</span>
            <Cloud size={18} color="var(--success)" className="opacity-70" />
          </div>
          <div className="stat-value">{t('active')}</div>
          <div className="stat-change positive">
            <ShieldCheck size={12} /> {t('encrypted')}
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between mb-md">
            <span className="stat-label">{t('backup_retention')}</span>
            <Database size={18} color="var(--cyan)" className="opacity-70" />
          </div>
          <div className="stat-value">14<span className="stat-unit"> {t('days')}</span></div>
          <div className="stat-change positive">
            <ShieldCheck size={12} /> {t('auto_clean')}
          </div>
        </div>
      </div>

      <div className="list-container mt-lg">
        <div className="list-header">
          <div className="list-title">{t('backup_recent_points')}</div>
          <div className="list-count">{backupPoints.length} {t('backup_total')}</div>
        </div>
        {backupPoints.map((item) => (
          <div key={item.id} className="list-item">
            <div className="list-item-icon">
              <Database size={16} />
            </div>
            <div className="list-item-content">
              <div className="list-item-title">{item.label}</div>
              <div className="list-item-subtitle">{item.time} - {item.size}</div>
            </div>
            <div className="list-item-actions">
              <span className="card-status">
                <span className="card-status-dot" />
                {t('backup_verified')}
              </span>
              <button className="btn btn-secondary" onClick={handleRestore}>{t('backup_restore')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

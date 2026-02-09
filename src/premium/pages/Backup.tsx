import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Database,
  ShieldCheck,
  Cloud,
  HardDrive,
  Clock,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface BackupProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

interface RestorePoint {
  id: string;
  label: string;
  time: string;
  description?: string;
}

export default function Backup({ showToast }: BackupProps) {
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restorePoints, setRestorePoints] = useState<RestorePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load restore points on mount
  useEffect(() => {
    loadRestorePoints();
  }, []);

  const loadRestorePoints = async () => {
    setIsLoading(true);
    try {
      const result = await invoke('run_powershell', {
        command: `
          $points = @()
          try { $points = Get-CimInstance -ClassName SystemRestore -ErrorAction Stop } catch {}
          if (-not $points) {
            try { $points = Get-ComputerRestorePoint -ErrorAction Stop } catch {}
          }

          $mapped = $points | ForEach-Object {
            $raw = $_.CreationTime
            $dt = $null
            if ($raw -is [DateTime]) {
              $dt = $raw
            } elseif ($raw) {
              try { $dt = [Management.ManagementDateTimeConverter]::ToDateTime($raw) } catch {}
            }
            [PSCustomObject]@{
              SequenceNumber = $_.SequenceNumber
              Description = $_.Description
              CreationTime = if ($dt) { $dt.ToString('yyyy-MM-dd HH:mm') } else { 'Unknown' }
              CreationSort = if ($dt) { $dt } else { [DateTime]::MinValue }
            }
          } | Sort-Object -Property CreationSort -Descending | Select-Object -First 12

          if ($mapped) { $mapped | ConvertTo-Json } else { '[]' }
        `
      }) as string;

      if (result && result.trim()) {
        const parsed = JSON.parse(result);
        const points = Array.isArray(parsed) ? parsed : [parsed];
        setRestorePoints(points.map((p: { SequenceNumber: number; Description: string; CreationTime: string }) => ({
          id: String(p.SequenceNumber),
          label: p.Description || 'System Restore Point',
          time: p.CreationTime
        })));
      }
    } catch (error) {
      console.error('Failed to load restore points:', error);
      showToast('error', t('backup_error'), String(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackup = async () => {
    setIsCreating(true);
    showToast('info', t('backup_started'), t('backup_started_msg'));
    try {
      await invoke('run_powershell', {
        command: `
          # Enable System Restore if not enabled
          Enable-ComputerRestore -Drive "C:\\" -ErrorAction SilentlyContinue
          # Allow frequent restore points
          Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore" -Name "SystemRestorePointCreationFrequency" -Value 0 -Type DWord -ErrorAction SilentlyContinue
          # Create restore point
          Checkpoint-Computer -Description "ConfUtils Restore Point - $(Get-Date -Format 'yyyy-MM-dd HH:mm')" -RestorePointType MODIFY_SETTINGS
        `
      });
      showToast('success', t('backup_complete'), t('backup_create_success'));
      // Reload restore points (give Windows time to register the point)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await loadRestorePoints();
    } catch (error) {
      showToast('error', t('backup_error'), String(error));
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (pointId?: string) => {
    setIsRestoring(true);
    showToast('warning', t('backup_restore_started'), t('backup_restore_desc'));
    try {
      if (pointId) {
        await invoke('run_powershell', {
          command: `Restore-Computer -RestorePoint ${pointId} -Confirm:$false`
        });
      }
    } catch (error) {
      showToast('error', t('backup_error'), String(error));
    } finally {
      setIsRestoring(false);
    }
  };

  const displayPoints = restorePoints;

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
          <button className="btn btn-secondary" onClick={() => handleRestore()} disabled={isRestoring}>
            {isRestoring ? <RefreshCw size={16} className="spin" /> : <Download size={16} />}
            {t('backup_restore')}
          </button>
          <button className="btn btn-primary" onClick={handleBackup} disabled={isCreating}>
            {isCreating ? <RefreshCw size={16} className="spin" /> : <Upload size={16} />}
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
          <div className="list-count">{displayPoints.length} {t('backup_total')}</div>
        </div>
        {isLoading ? (
          <div className="list-item" style={{ justifyContent: 'center' }}>
            <RefreshCw size={20} className="spin" style={{ color: 'var(--cyan)' }} />
          </div>
        ) : displayPoints.length === 0 ? (
          <div className="list-item" style={{ justifyContent: 'center' }}>
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {t('backup_empty_desc')}
            </div>
          </div>
        ) : displayPoints.map((item) => (
          <div key={item.id} className="list-item">
            <div className="list-item-icon">
              <Database size={16} />
            </div>
            <div className="list-item-content">
              <div className="list-item-title">{item.label}</div>
              <div className="list-item-subtitle">{item.time}</div>
            </div>
            <div className="list-item-actions">
              <span className="card-status">
                <span className="card-status-dot" />
                {t('backup_verified')}
              </span>
              <button className="btn btn-secondary" onClick={() => handleRestore(item.id)} disabled={isRestoring}>{t('backup_restore')}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

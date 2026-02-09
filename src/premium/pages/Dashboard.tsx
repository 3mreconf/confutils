import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Shield,
  Wifi,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  ChevronRight,
  Play,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface DashboardProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  onNavigate: (page: string) => void;
}

const STATIC_STATS = {
  cpu: 34,
  memory: 62,
  disk: 48,
  temp: 52,
  network: { up: 2.4, down: 12.8 },
  processes: 142,
  services: { running: 87, stopped: 23 },
};

// Progress Ring Component
const ProgressRing = ({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  unit = '%',
  color = 'var(--cyan)'
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  unit?: string;
  color?: string;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="progress-ring" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle
            className="progress-ring-bg"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="progress-ring-fill"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            style={{
              stroke: color,
              strokeDasharray: circumference,
              strokeDashoffset: offset
            }}
          />
        </svg>
        <div className="progress-ring-value">
          {Math.round(value)}<span style={{ fontSize: '14px', opacity: 0.7 }}>{unit}</span>
        </div>
      </div>
      <div className="progress-ring-label">{label}</div>
    </div>
  );
};

// Quick Action Card
const QuickActionCard = ({
  icon: Icon,
  title,
  description,
  status,
  onAction,
  actionLabel = 'Run',
  variant = 'cyan',
  lastRunLabel,
  disabled = false
}: {
  icon: any;
  title: string;
  description: string;
  status?: { text: string; type: 'success' | 'warning' | 'error' | 'info' };
  onAction: () => void;
  actionLabel?: string;
  variant?: 'cyan' | 'amber' | 'success' | 'danger';
  lastRunLabel?: string;
  disabled?: boolean;
}) => (
  <div className="control-card">
    <div className="card-header">
      <div className={`card-icon-wrapper ${variant}`}>
        <Icon size={22} />
      </div>
      {status && (
        <div className={`card-status ${status.type}`}>
          <span className="card-status-dot" />
          {status.text}
        </div>
      )}
    </div>
    <h3 className="card-title">{title}</h3>
    <p className="card-description">{description}</p>
    <div className="card-footer">
      <span className="card-meta">{lastRunLabel}</span>
      <button className="btn btn-primary" onClick={onAction} disabled={disabled}>
        {disabled ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
        {actionLabel}
      </button>
    </div>
  </div>
);

// Stat Card
const StatCard = ({
  icon: Icon,
  label,
  value,
  unit,
  change,
  color = 'var(--cyan)'
}: {
  icon: any;
  label: string;
  value: number | string;
  unit?: string;
  change?: { value: number; positive: boolean };
  color?: string;
}) => (
  <div
    className="stat-card"
    style={{ '--progress': typeof value === 'number' ? Math.min(1, Math.max(0, value / 100)) : 0 } as React.CSSProperties}
  >
    <div className="flex items-center justify-between mb-md">
      <span className="stat-label">{label}</span>
      <Icon size={18} color={color} className="opacity-70" />
    </div>
    <div className="stat-value">
      {typeof value === 'number' ? Math.round(value) : value}
      {unit && <span className="stat-unit">{unit}</span>}
    </div>
    {change && (
      <div className={`stat-change ${change.positive ? 'positive' : 'negative'}`}>
        {change.positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(change.value)}%
      </div>
    )}
  </div>
);

export default function Dashboard({ showToast, onNavigate }: DashboardProps) {
  const { t } = useI18n();
  const stats = STATIC_STATS;
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('success', t('dashboard_refresh'), t('dashboard_subtitle'));
    }, 1000);
  };

  const [quickActionProcessing, setQuickActionProcessing] = useState<Record<string, boolean>>({});

  const handleClearTemp = async () => {
    setQuickActionProcessing(prev => ({ ...prev, temp: true }));
    showToast('info', t('action_clear_temp'), t('toast_may_take_moment'));
    try {
      const result = await invoke('run_powershell', {
        command: `
          $before = 0
          $paths = @("$env:TEMP", "C:\\Windows\\Temp", "C:\\Windows\\Prefetch")
          foreach ($p in $paths) {
            if (Test-Path $p) {
              $before += (Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            }
          }

          # Clear user temp
          Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue

          # Clear Windows temp (admin)
          Remove-Item -Path "C:\\Windows\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue

          # Clear Prefetch (admin)
          Remove-Item -Path "C:\\Windows\\Prefetch\\*" -Recurse -Force -ErrorAction SilentlyContinue

          # Clear browser caches
          Remove-Item -Path "$env:LOCALAPPDATA\\Microsoft\\Edge\\User Data\\Default\\Cache\\*" -Recurse -Force -ErrorAction SilentlyContinue
          Remove-Item -Path "$env:LOCALAPPDATA\\Google\\Chrome\\User Data\\Default\\Cache\\*" -Recurse -Force -ErrorAction SilentlyContinue

          # Clear recent files list
          Remove-Item -Path "$env:APPDATA\\Microsoft\\Windows\\Recent\\*" -Force -ErrorAction SilentlyContinue

          # Empty recycle bin
          Clear-RecycleBin -Force -Confirm:$false -ErrorAction SilentlyContinue

          $after = 0
          foreach ($p in $paths) {
            if (Test-Path $p) {
              $after += (Get-ChildItem $p -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            }
          }
          $freed = [math]::Round(($before - $after) / 1MB, 2)
          "Freed: $freed MB"
        `
      }) as string;
      showToast('success', t('action_clear_temp'), result || t('toast_freed_space'));
    } catch (error) {
      showToast('error', t('action_clear_temp'), String(error));
    } finally {
      setQuickActionProcessing(prev => ({ ...prev, temp: false }));
    }
  };


  const handleDefenderCheck = async () => {
    setQuickActionProcessing(prev => ({ ...prev, security: true }));
    showToast('info', t('action_security'), t('toast_scanning_defender'));
    try {
      const result = await invoke('run_powershell', {
        command: `
          $ErrorActionPreference = 'SilentlyContinue'

          # Check Windows Defender status
          $defender = Get-MpComputerStatus -ErrorAction SilentlyContinue

          if ($defender) {
            $status = @()
            if ($defender.AntivirusEnabled) { $status += "Antivirus: Active" }
            if ($defender.RealTimeProtectionEnabled) { $status += "Real-time: On" }
            if ($defender.AntivirusSignatureLastUpdated) {
              $lastUpdate = $defender.AntivirusSignatureLastUpdated.ToString("yyyy-MM-dd HH:mm")
              $status += "Last Update: $lastUpdate"
            }
            $status -join " | "
          } else {
            "Windows Defender status checked"
          }
        `
      }) as string;
      showToast('success', t('action_security'), result || t('toast_defender_ok'));
    } catch (error) {
      showToast('error', t('action_security'), String(error));
    } finally {
      setQuickActionProcessing(prev => ({ ...prev, security: false }));
    }
  };

  const handleFlushDns = async () => {
    setQuickActionProcessing(prev => ({ ...prev, dns: true }));
    showToast('info', t('action_flush_dns'), t('toast_clearing_dns'));
    try {
      await invoke('run_powershell', {
        command: `
          Clear-DnsClientCache -ErrorAction SilentlyContinue
          ipconfig /flushdns | Out-Null
          ipconfig /registerdns | Out-Null
          netsh winsock reset catalog | Out-Null
          "DNS cache cleared successfully"
        `
      });
      showToast('success', t('action_flush_dns'), t('toast_network_refreshed'));
    } catch (error) {
      showToast('error', t('action_flush_dns'), String(error));
    } finally {
      setQuickActionProcessing(prev => ({ ...prev, dns: false }));
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('dashboard_title')}
          </h2>
          <p className="text-muted mt-sm">
            {t('dashboard_subtitle')}
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {t('dashboard_refresh')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          icon={Cpu}
          label={t('stat_cpu')}
          value={stats.cpu}
          unit="%"
          color={stats.cpu > 80 ? 'var(--danger)' : stats.cpu > 60 ? 'var(--warning)' : 'var(--cyan)'}
          change={{ value: 12, positive: false }}
        />
        <StatCard
          icon={MemoryStick}
          label={t('stat_memory')}
          value={stats.memory}
          unit="%"
          color={stats.memory > 85 ? 'var(--danger)' : stats.memory > 70 ? 'var(--warning)' : 'var(--cyan)'}
        />
        <StatCard
          icon={HardDrive}
          label={t('stat_disk')}
          value={stats.disk}
          unit="%"
          color="var(--cyan)"
        />
        <StatCard
          icon={Thermometer}
          label={t('stat_temp')}
          value={stats.temp}
          unit="C"
          color={stats.temp > 75 ? 'var(--danger)' : stats.temp > 60 ? 'var(--warning)' : 'var(--success)'}
        />
      </div>

      {/* Performance Rings */}
      <div
        className="control-card performance-card mt-lg"
        style={{ padding: 'var(--space-xl)' }}
      >
        <div className="flex items-center justify-between mb-lg">
          <div>
            <h3 className="card-title" style={{ marginBottom: '4px' }}>{t('realtime_title')}</h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{t('realtime_subtitle')}</p>
          </div>
          <button className="btn btn-ghost" onClick={() => onNavigate('monitor')}>
            {t('view_details')}
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 'var(--space-xl)'
        }}>
          <ProgressRing
            value={stats.cpu}
            label={t('cpu_label')}
            color={stats.cpu > 80 ? 'var(--danger)' : stats.cpu > 60 ? 'var(--warning)' : 'var(--cyan)'}
          />
          <ProgressRing
            value={stats.memory}
            label={t('memory_label')}
            color={stats.memory > 85 ? 'var(--danger)' : 'var(--cyan)'}
          />
          <ProgressRing
            value={stats.disk}
            label={t('disk_label')}
            color="var(--cyan)"
          />
          <div className="flex flex-col items-center gap-md">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-md)',
              padding: 'var(--space-lg)',
              background: 'var(--deep)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--glass-border)'
            }}>
              <div className="flex items-center gap-sm">
                <ArrowUpRight size={16} style={{ color: 'var(--success)' }} />
                <span className="font-mono" style={{ color: 'var(--text-90)' }}>
                  {stats.network.up.toFixed(1)} MB/s
                </span>
              </div>
              <div className="flex items-center gap-sm">
                <ArrowDownRight size={16} style={{ color: 'var(--cyan)' }} />
                <span className="font-mono" style={{ color: 'var(--text-90)' }}>
                  {stats.network.down.toFixed(1)} MB/s
                </span>
              </div>
            </div>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('network_io')}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-lg mb-md">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('quick_actions')}
        </h3>
        <p className="text-muted mt-sm" style={{ fontSize: 'var(--text-sm)' }}>
          {t('quick_actions_subtitle')}
        </p>
      </div>

      <div className="card-grid">
        <QuickActionCard
          icon={Trash2}
          title={t('action_clear_temp')}
          description={t('action_clear_temp_desc')}
          status={{ text: t('action_recommended'), type: 'info' }}
          onAction={handleClearTemp}
          actionLabel={t('action_run')}
          lastRunLabel={t('last_run')}
          disabled={quickActionProcessing.temp}
        />

        <QuickActionCard
          icon={Shield}
          title={t('action_security')}
          description={t('action_security_desc')}
          status={{ text: t('action_enabled'), type: 'success' }}
          onAction={handleDefenderCheck}
          variant="success"
          actionLabel={t('action_run')}
          lastRunLabel={t('last_run')}
          disabled={quickActionProcessing.security}
        />

        <QuickActionCard
          icon={Wifi}
          title={t('action_flush_dns')}
          description={t('action_flush_dns_desc')}
          onAction={handleFlushDns}
          actionLabel={t('action_run')}
          lastRunLabel={t('last_run')}
          disabled={quickActionProcessing.dns}
        />
      </div>

      {/* System Info Summary */}
      <div className="list-container mt-lg">
        <div className="list-header">
          <span className="list-title">{t('system_summary')}</span>
          <span className="list-count">{stats.processes} {t('processes')}</span>
        </div>
        <div className="list-item">
          <div className="list-item-icon">
            <CheckCircle size={18} style={{ color: 'var(--success)' }} />
          </div>
          <div className="list-item-content">
            <div className="list-item-title">{t('windows_services')}</div>
            <div className="list-item-subtitle">{stats.services.running} {t('running')}, {stats.services.stopped} {t('stopped')}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => onNavigate('services')}>
            {t('manage')}
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="list-item">
          <div className="list-item-icon">
            <Clock size={18} style={{ color: 'var(--cyan)' }} />
          </div>
          <div className="list-item-content">
            <div className="list-item-title">{t('startup_programs')}</div>
            <div className="list-item-subtitle">{t('startup_programs_desc')}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => onNavigate('services')}>
            {t('manage')}
            <ChevronRight size={14} />
          </button>
        </div>
        <div className="list-item">
          <div className="list-item-icon">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
          </div>
          <div className="list-item-content">
            <div className="list-item-title">{t('bloatware_detected')}</div>
            <div className="list-item-subtitle">{t('bloatware_desc')}</div>
          </div>
          <button className="btn btn-ghost" onClick={() => onNavigate('debloater')}>
            {t('review')}
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

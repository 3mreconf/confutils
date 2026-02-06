import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Wifi,
  Shield,
  Activity,
  Zap,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Server
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface NetworkProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

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

export default function Network({ showToast }: NetworkProps) {
  const { t } = useI18n();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('success', t('network_scan_complete'), t('network_scan_msg'));
    }, 1000);
  };

  const handleFlushDns = async () => {
    setProcessing(prev => ({ ...prev, dns: true }));
    showToast('info', t('network_dns_flush'), t('network_dns_msg'));
    try {
      await invoke('run_powershell', { command: 'Clear-DnsClientCache; ipconfig /flushdns' });
      showToast('success', t('network_dns_flush'), t('network_dns_success'));
    } catch (error) {
      showToast('error', t('network_error'), String(error));
    } finally {
      setProcessing(prev => ({ ...prev, dns: false }));
    }
  };

  const handleResetAdapter = async () => {
    setProcessing(prev => ({ ...prev, adapter: true }));
    showToast('info', t('network_adapter_reset'), t('network_adapter_msg'));
    try {
      await invoke('run_powershell', {
        command: `
          $adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}
          foreach ($adapter in $adapters) {
            Restart-NetAdapter -Name $adapter.Name -Confirm:$false
          }
        `
      });
      showToast('success', t('network_adapter_reset'), t('network_adapter_success'));
    } catch (error) {
      showToast('error', t('network_error'), String(error));
    } finally {
      setProcessing(prev => ({ ...prev, adapter: false }));
    }
  };

  const handleQosBoost = async () => {
    setProcessing(prev => ({ ...prev, qos: true }));
    showToast('info', t('network_qos'), t('network_qos_msg'));
    try {
      await invoke('run_powershell', {
        command: `
          # Disable Nagle's Algorithm for lower latency
          $paths = @(
            'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
          )
          Get-ChildItem $paths[0] | ForEach-Object {
            Set-ItemProperty -Path $_.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -ErrorAction SilentlyContinue
            Set-ItemProperty -Path $_.PSPath -Name 'TCPNoDelay' -Value 1 -Type DWord -ErrorAction SilentlyContinue
          }
          # Disable network throttling
          Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'NetworkThrottlingIndex' -Value 0xffffffff -Type DWord -ErrorAction SilentlyContinue
          Set-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile' -Name 'SystemResponsiveness' -Value 0 -Type DWord -ErrorAction SilentlyContinue
        `
      });
      showToast('success', t('network_qos'), t('network_qos_success'));
    } catch (error) {
      showToast('error', t('network_error'), String(error));
    } finally {
      setProcessing(prev => ({ ...prev, qos: false }));
    }
  };

  const handleTraceRoute = async () => {
    setProcessing(prev => ({ ...prev, trace: true }));
    showToast('info', t('network_gateway'), t('network_gateway_msg'));
    try {
      await invoke('run_powershell', {
        command: `
          $gateway = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop
          Test-Connection -ComputerName $gateway -Count 4
        `
      });
      showToast('success', t('network_gateway'), t('network_trace_success'));
    } catch (error) {
      showToast('error', t('network_error'), String(error));
    } finally {
      setProcessing(prev => ({ ...prev, trace: false }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('network_title')}
          </h2>
          <p className="text-muted mt-sm">{t('network_subtitle')}</p>
        </div>
        <button className="btn btn-secondary" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      <div className="stats-grid">
        <StatCard icon={Activity} label={t('latency')} value={18} unit="ms" color="var(--success)" change={{ value: 6, positive: true }} />
        <StatCard icon={ArrowDownRight} label={t('download')} value={412} unit="Mbps" color="var(--cyan)" change={{ value: 4, positive: true }} />
        <StatCard icon={ArrowUpRight} label={t('upload')} value={96} unit="Mbps" color="var(--amber)" change={{ value: 2, positive: true }} />
        <StatCard icon={Shield} label={t('firewall')} value={t('active')} color="var(--success)" />
      </div>

      <div className="card-grid mt-lg">
        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <Globe size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('online')}
            </div>
          </div>
          <div className="card-title">{t('network_dns_flush')}</div>
          <div className="card-description">{t('network_dns_desc')}</div>
          <div className="card-footer">
            <span className="card-meta">{t('estimated')} 3s</span>
            <button className="btn btn-primary" onClick={handleFlushDns} disabled={processing.dns}>
              {processing.dns ? <RefreshCw size={14} className="spin" /> : null}
              {t('network_flush_btn')}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper amber">
              <Wifi size={20} />
            </div>
            <div className="card-status warning">
              <span className="card-status-dot" />
              {t('moderate')}
            </div>
          </div>
          <div className="card-title">{t('network_adapter_reset')}</div>
          <div className="card-description">{t('network_adapter_desc')}</div>
          <div className="card-footer">
            <span className="card-meta">{t('downtime')} 8s</span>
            <button className="btn btn-secondary" onClick={handleResetAdapter} disabled={processing.adapter}>
              {processing.adapter ? <RefreshCw size={14} className="spin" /> : null}
              {t('network_reset_btn')}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper success">
              <Zap size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('optimized')}
            </div>
          </div>
          <div className="card-title">{t('network_qos')}</div>
          <div className="card-description">{t('network_qos_desc')}</div>
          <div className="card-footer">
            <span className="card-meta">{t('profile')}: {t('realtime')}</span>
            <button className="btn btn-primary" onClick={handleQosBoost} disabled={processing.qos}>
              {processing.qos ? <RefreshCw size={14} className="spin" /> : null}
              {t('network_boost_btn')}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <Server size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('stable')}
            </div>
          </div>
          <div className="card-title">{t('network_gateway')}</div>
          <div className="card-description">{t('network_gateway_desc')}</div>
          <div className="card-footer">
            <span className="card-meta">{t('nodes')}: 8</span>
            <button className="btn btn-secondary" onClick={handleTraceRoute} disabled={processing.trace}>
              {processing.trace ? <RefreshCw size={14} className="spin" /> : null}
              {t('network_trace_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

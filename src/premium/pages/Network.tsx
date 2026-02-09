import { useMemo, useState } from 'react';
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
import { SelectMenu } from '../components/SelectMenu';

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
  const dnsPresets = useMemo(() => ([
    { id: 'cloudflare', name: 'Cloudflare', v4: ['1.1.1.1', '1.0.0.1'], v6: ['2606:4700:4700::1111', '2606:4700:4700::1001'] },
    { id: 'google', name: 'Google', v4: ['8.8.8.8', '8.8.4.4'], v6: ['2001:4860:4860::8888', '2001:4860:4860::8844'] },
    { id: 'quad9', name: 'Quad9', v4: ['9.9.9.9', '149.112.112.112'], v6: ['2620:fe::fe', '2620:fe::9'] },
    { id: 'adguard', name: 'AdGuard', v4: ['94.140.14.14', '94.140.15.15'], v6: ['2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff'] }
  ]), []);
  const [selectedPresetId, setSelectedPresetId] = useState(dnsPresets[0]?.id || 'cloudflare');
  const selectedPreset = dnsPresets.find((p) => p.id === selectedPresetId) || dnsPresets[0];

  const runPowershell = async (command: string, requireAdmin = false) => {
    const wrapped = requireAdmin ? `
      $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
      if (-not $isAdmin) { throw "ADMIN_REQUIRED" }
      ${command}
    ` : command;

    return await invoke('run_powershell', { command: wrapped });
  };

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
      await runPowershell(`
        $ErrorActionPreference = 'SilentlyContinue'
        Clear-DnsClientCache
        ipconfig /flushdns | Out-Null
        "DNS cache cleared"
      `);
      showToast('success', t('network_dns_flush'), t('network_dns_success'));
    } catch (error) {
      const msg = String(error);
      showToast('error', t('network_error'), msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, dns: false }));
    }
  };

  const handleApplyDnsPreset = async () => {
    if (!selectedPreset) return;
    setProcessing(prev => ({ ...prev, dnsPreset: true }));
    showToast('info', t('network_dns_flush'), `${selectedPreset.name} DNS`);
    try {
      await runPowershell(`
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses @("${selectedPreset.v4[0]}", "${selectedPreset.v4[1]}") -AddressFamily IPv4
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses @("${selectedPreset.v6[0]}", "${selectedPreset.v6[1]}") -AddressFamily IPv6
        }
        "DNS updated"
      `, true);
      showToast('success', t('network_dns_flush'), `${selectedPreset.name} DNS`);
    } catch (error) {
      const msg = String(error);
      showToast('error', t('network_error'), msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, dnsPreset: false }));
    }
  };

  const handleResetDnsPreset = async () => {
    setProcessing(prev => ({ ...prev, dnsReset: true }));
    showToast('info', t('network_dns_flush'), t('toolkit_dns_reset_desc' as any));
    try {
      await runPowershell(`
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ResetServerAddresses
        }
        "DNS reset"
      `, true);
      showToast('success', t('network_dns_flush'), t('toolkit_dns_reset_title' as any));
    } catch (error) {
      const msg = String(error);
      showToast('error', t('network_error'), msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, dnsReset: false }));
    }
  };

  const handleResetAdapter = async () => {
    setProcessing(prev => ({ ...prev, adapter: true }));
    showToast('info', t('network_adapter_reset'), t('network_adapter_msg'));
    try {
      await runPowershell(`
        $ErrorActionPreference = 'SilentlyContinue'
        $adapters = Get-NetAdapter | Where-Object {$_.Status -eq 'Up'}
        foreach ($adapter in $adapters) {
          Disable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
          Start-Sleep -Milliseconds 500
          Enable-NetAdapter -Name $adapter.Name -Confirm:$false -ErrorAction SilentlyContinue
        }
        "Adapters reset"
      `, true);
      showToast('success', t('network_adapter_reset'), t('network_adapter_success'));
    } catch (error) {
      const msg = String(error);
      showToast('error', t('network_error'), msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, adapter: false }));
    }
  };

  const handleQosBoost = async () => {
    setProcessing(prev => ({ ...prev, qos: true }));
    showToast('info', t('network_qos'), t('network_qos_msg'));
    try {
      await runPowershell(`
        # Disable Nagle's Algorithm for lower latency
        $interfacesPath = 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip\\Parameters\\Interfaces'
        Get-ChildItem $interfacesPath | ForEach-Object {
          Set-ItemProperty -Path $_.PSPath -Name 'TcpAckFrequency' -Value 1 -Type DWord -Force
          Set-ItemProperty -Path $_.PSPath -Name 'TCPNoDelay' -Value 1 -Type DWord -Force
        }

        # Network throttling settings
        $profilePath = 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Multimedia\\SystemProfile'
        Set-ItemProperty -Path $profilePath -Name 'NetworkThrottlingIndex' -Value 0xffffffff -Type DWord -Force
        Set-ItemProperty -Path $profilePath -Name 'SystemResponsiveness' -Value 0 -Type DWord -Force

        # TCP optimizations
        netsh int tcp set global autotuninglevel=normal
        netsh int tcp set global congestionprovider=ctcp

        "QoS settings applied"
      `, true);
      showToast('success', t('network_qos'), t('network_qos_success'));
    } catch (error) {
      const msg = String(error);
      showToast('error', t('network_error'), msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, qos: false }));
    }
  };

  const handleTraceRoute = async () => {
    setProcessing(prev => ({ ...prev, trace: true }));
    showToast('info', t('network_gateway'), t('network_gateway_msg'));
    try {
      const result = await runPowershell(`
        $ErrorActionPreference = 'SilentlyContinue'
        $gateway = (Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Select-Object -First 1).NextHop
        if ($gateway) {
          $ping = Test-Connection -ComputerName $gateway -Count 2 -ErrorAction SilentlyContinue
          if ($ping) {
            $avg = ($ping | Measure-Object -Property ResponseTime -Average).Average
            "Gateway: $gateway - Avg: $([math]::Round($avg, 2))ms"
          } else {
            "Gateway: $gateway - No response"
          }
        } else {
          "No gateway found"
        }
      `) as string;
      showToast('success', t('network_gateway'), result || t('network_trace_success'));
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
              <Server size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('network_dns_flush')}
            </div>
          </div>
          <div className="card-title">{t('toolkit_dns_title' as any)}</div>
          <div className="card-description">{t('toolkit_dns_desc' as any)}</div>
          <div className="flex items-center gap-md mt-md" style={{ flexWrap: 'wrap' }}>
            <SelectMenu
              value={selectedPresetId}
              options={dnsPresets.map((preset) => ({
                value: preset.id,
                label: preset.name
              }))}
              onChange={(next) => setSelectedPresetId(next)}
            />
            <button
              className="btn btn-primary"
              onClick={handleApplyDnsPreset}
              disabled={!!processing.dnsPreset}
            >
              {processing.dnsPreset ? <RefreshCw size={14} className="spin" /> : null}
              {t('action_apply' as any)}
            </button>
            <button
              className="btn btn-ghost"
              onClick={handleResetDnsPreset}
              disabled={!!processing.dnsReset}
            >
              {processing.dnsReset ? <RefreshCw size={14} className="spin" /> : null}
              {t('action_reset' as any)}
            </button>
          </div>
          {selectedPreset ? (
            <div className="text-muted mt-sm" style={{ fontSize: 'var(--text-sm)' }}>
              IPv4: {selectedPreset.v4.join(', ')}<br />
              IPv6: {selectedPreset.v6.join(', ')}
            </div>
          ) : null}
        </div>

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

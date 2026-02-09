import { useMemo, useState } from 'react';
import {
  Shield,
  Wifi,
  Trash2,
  Search,
  Sparkles,
  Activity,
  CheckCircle,
  Clock,
  RefreshCw
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import { SelectMenu } from '../components/SelectMenu';

interface ToolkitModulesProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  compact?: boolean;
}

type Action = {
  id: string;
  titleKey: string;
  descKey: string;
  icon: any;
  command: string;
  undoCommand?: string;
  caution?: boolean;
};

type DnsPreset = {
  id: string;
  name: string;
  v4: string[];
  v6: string[];
};

const impactColors = {
  low: { bg: 'var(--success-bg)', color: 'var(--success)' },
  medium: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
  high: { bg: 'var(--danger-bg)', color: 'var(--danger)' }
};

const ActionCard = ({
  action,
  onRun,
  onUndo,
  busy,
  t
}: {
  action: Action;
  onRun: () => void;
  onUndo?: () => void;
  busy: boolean;
  t: any;
}) => {
  const Icon = action.icon;
  const impact = action.caution ? impactColors.high : impactColors.medium;
  const StatusIcon = busy ? RefreshCw : CheckCircle;
  const statusLabel = busy ? t('status_running' as any) : t('status_pending' as any);

  return (
    <div className="control-card">
      <div className="flex items-center justify-between mb-md">
        <div
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: busy ? 'var(--raised)' : 'var(--success-bg)',
            borderRadius: 'var(--radius-md)',
            color: busy ? 'var(--cyan)' : 'var(--success)'
          }}
        >
          <Icon size={20} />
        </div>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            padding: '2px 8px',
            background: impact.bg,
            color: impact.color,
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500
          }}
        >
          {action.caution ? t('impact_high' as any) : t('impact_medium' as any)}
        </span>
      </div>

      <h3 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: '4px' }}>
        {action.titleKey}
      </h3>
      <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
        {action.descKey}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <StatusIcon
            size={14}
            color={busy ? 'var(--cyan)' : 'var(--success)'}
            className={busy ? 'spin' : ''}
          />
          <span className="text-muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}>
            {statusLabel}
          </span>
        </div>
        <div className="flex items-center gap-sm">
          {onUndo && (
            <button className="btn btn-ghost" onClick={onUndo} disabled={busy}>
              {t('action_undo' as any)}
            </button>
          )}
          <button className="btn btn-primary" onClick={onRun} disabled={busy}>
            {busy ? (
              <>
                <RefreshCw size={14} className="spin" />
                {t('status_running' as any)}
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                {t('action_apply' as any)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ToolkitModules({ showToast, compact }: ToolkitModulesProps) {
  const { t } = useI18n();
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const actions = useMemo<Action[]>(() => ([
    {
      id: 'disable-telemetry',
      titleKey: t('toolkit_disable_telemetry_title' as any),
      descKey: t('toolkit_disable_telemetry_desc' as any),
      icon: Shield,
      command: `
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -Type DWord -Value 0 -Force
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" -Name "AllowTelemetry" -Type DWord -Value 0 -Force
        "Telemetry disabled"
      `,
      undoCommand: `
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection" -Name "AllowTelemetry" -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection" -Name "AllowTelemetry" -Type DWord -Value 1 -Force
        "Telemetry restored"
      `
    },
    {
      id: 'disable-ps7-telemetry',
      titleKey: t('toolkit_disable_ps7_title' as any),
      descKey: t('toolkit_disable_ps7_desc' as any),
      icon: Activity,
      command: `
        setx POWERSHELL_TELEMETRY_OPTOUT 1 /M | Out-Null
        "PowerShell 7 telemetry disabled"
      `,
      undoCommand: `
        Remove-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" -Name "POWERSHELL_TELEMETRY_OPTOUT" -ErrorAction SilentlyContinue
        "PowerShell 7 telemetry restored"
      `
    },
    {
      id: 'disable-copilot',
      titleKey: t('toolkit_disable_copilot_title' as any),
      descKey: t('toolkit_disable_copilot_desc' as any),
      icon: Sparkles,
      command: `
        New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Force | Out-Null
        New-Item -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Force | Out-Null
        Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Type DWord -Value 1 -Force
        Set-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Name "TurnOffWindowsCopilot" -Type DWord -Value 1 -Force
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\WindowsCopilot" -Name "AllowCopilotRuntime" -Type DWord -Value 0 -Force
        "Copilot disabled"
      `,
      undoCommand: `
        Remove-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Name "TurnOffWindowsCopilot" -ErrorAction SilentlyContinue
        Remove-ItemProperty -Path "HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot" -Name "TurnOffWindowsCopilot" -ErrorAction SilentlyContinue
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\WindowsCopilot" -Name "AllowCopilotRuntime" -Type DWord -Value 1 -Force
        "Copilot restored"
      `
    },
    {
      id: 'remove-onedrive',
      titleKey: t('toolkit_remove_onedrive_title' as any),
      descKey: t('toolkit_remove_onedrive_desc' as any),
      icon: Trash2,
      caution: true,
      command: `
        $od = "$env:LOCALAPPDATA\\Microsoft\\OneDrive\\OneDrive.exe"
        if (Test-Path $od) { Stop-Process -Name OneDrive -Force -ErrorAction SilentlyContinue }
        Start-Process "$env:SystemRoot\\System32\\OneDriveSetup.exe" -ArgumentList "/uninstall" -Wait
        Remove-Item "$env:LOCALAPPDATA\\Microsoft\\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item "C:\\ProgramData\\Microsoft OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
        "OneDrive removed"
      `,
      undoCommand: `
        Start-Process "$env:SystemRoot\\System32\\OneDriveSetup.exe" -ArgumentList "/install" -Wait
        "OneDrive installed"
      `
    },
    {
      id: 'disable-bing-search',
      titleKey: t('toolkit_disable_bing_title' as any),
      descKey: t('toolkit_disable_bing_desc' as any),
      icon: Search,
      command: `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "BingSearchEnabled" -Type DWord -Value 0 -Force
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "CortanaConsent" -Type DWord -Value 0 -Force
        "Bing search disabled"
      `,
      undoCommand: `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "BingSearchEnabled" -Type DWord -Value 1 -Force
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "CortanaConsent" -Type DWord -Value 1 -Force
        "Bing search enabled"
      `
    },
    {
      id: 'taskbar-search-hide',
      titleKey: t('toolkit_taskbar_search_hide_title' as any),
      descKey: t('toolkit_taskbar_search_hide_desc' as any),
      icon: Search,
      command: `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "SearchboxTaskbarMode" -Type DWord -Value 0 -Force
        "Taskbar search hidden"
      `,
      undoCommand: `
        Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search" -Name "SearchboxTaskbarMode" -Type DWord -Value 1 -Force
        "Taskbar search shown"
      `
    }
  ]), [t]);

  const dnsPresets = useMemo<DnsPreset[]>(() => ([
    { id: 'cloudflare', name: 'Cloudflare', v4: ['1.1.1.1', '1.0.0.1'], v6: ['2606:4700:4700::1111', '2606:4700:4700::1001'] },
    { id: 'google', name: 'Google', v4: ['8.8.8.8', '8.8.4.4'], v6: ['2001:4860:4860::8888', '2001:4860:4860::8844'] },
    { id: 'quad9', name: 'Quad9', v4: ['9.9.9.9', '149.112.112.112'], v6: ['2620:fe::fe', '2620:fe::9'] },
    { id: 'adguard', name: 'AdGuard', v4: ['94.140.14.14', '94.140.15.15'], v6: ['2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff'] }
  ]), []);
  const [selectedPresetId, setSelectedPresetId] = useState(dnsPresets[0]?.id || 'cloudflare');
  const selectedPreset = dnsPresets.find((p) => p.id === selectedPresetId) || dnsPresets[0];

  const runAction = async (action: Action, undo = false) => {
    const id = `${action.id}-${undo ? 'undo' : 'apply'}`;
    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      const command = undo ? action.undoCommand : action.command;
      if (!command) return;
      await invoke('run_powershell', { command });
      showToast('success', t('toolkit_done' as any), action.titleKey);
    } catch (err: any) {
      showToast('error', t('toolkit_failed' as any), String(err));
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  const setDns = async (preset: DnsPreset) => {
    setProcessing(prev => ({ ...prev, [`dns-${preset.id}`]: true }));
    try {
      const command = `
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses @("${preset.v4[0]}", "${preset.v4[1]}") -AddressFamily IPv4
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ServerAddresses @("${preset.v6[0]}", "${preset.v6[1]}") -AddressFamily IPv6
        }
        "DNS updated"
      `;
      await invoke('run_powershell', { command });
      showToast('success', t('toolkit_done' as any), `${preset.name} DNS`);
    } catch (err: any) {
      showToast('error', t('toolkit_failed' as any), String(err));
    } finally {
      setProcessing(prev => ({ ...prev, [`dns-${preset.id}`]: false }));
    }
  };

  const resetDns = async () => {
    setProcessing(prev => ({ ...prev, dnsReset: true }));
    try {
      const command = `
        $adapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
        foreach ($a in $adapters) {
          Set-DnsClientServerAddress -InterfaceAlias $a.Name -ResetServerAddresses
        }
        "DNS reset"
      `;
      await invoke('run_powershell', { command });
      showToast('success', t('toolkit_done' as any), t('toolkit_dns_reset_title' as any));
    } catch (err: any) {
      showToast('error', t('toolkit_failed' as any), String(err));
    } finally {
      setProcessing(prev => ({ ...prev, dnsReset: false }));
    }
  };

  return (
    <div>
      {!compact && (
        <div className="mb-lg">
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('toolkit_title' as any)}
        </h2>
        <p className="text-muted mt-sm">{t('toolkit_subtitle' as any)}</p>
        </div>
      )}

      <div className={compact ? '' : 'list-container'}>
        {!compact && (
          <>
            <div className="list-header">
              <span className="list-title">{t('toolkit_dns_title' as any)}</span>
              <span className="list-count">{dnsPresets.length} {t('toolkit_actions_count' as any)}</span>
            </div>
            <p className="text-muted mt-sm">{t('toolkit_dns_desc' as any)}</p>
          </>
        )}
        <div className="card-grid mt-md">
          <div className="control-card">
            <div className="flex items-center justify-between mb-md">
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--raised)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--cyan)'
                }}
              >
                <Wifi size={20} />
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '2px 8px',
                  background: impactColors.low.bg,
                  color: impactColors.low.color,
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500
                }}
              >
                {t('impact_low' as any)}
              </span>
            </div>
            <h3 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: '4px' }}>
              {t('toolkit_dns_title' as any)}
            </h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
              {t('toolkit_dns_desc' as any)}
            </p>
            <div className="flex items-center gap-md" style={{ flexWrap: 'wrap' }}>
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
                onClick={() => selectedPreset && setDns(selectedPreset)}
                disabled={!selectedPreset || !!processing[`dns-${selectedPreset?.id}`]}
              >
                {processing[`dns-${selectedPreset?.id}`] ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    {t('status_running' as any)}
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    {t('action_apply' as any)}
                  </>
                )}
              </button>
            </div>
            {selectedPreset && (
              <div className="text-muted mt-sm" style={{ fontSize: 'var(--text-sm)' }}>
                IPv4: {selectedPreset.v4.join(', ')}<br />
                IPv6: {selectedPreset.v6.join(', ')}
              </div>
            )}
          </div>
          <div className="control-card">
            <div className="flex items-center justify-between mb-md">
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--raised)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--cyan)'
                }}
              >
                <Wifi size={20} />
              </div>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '2px 8px',
                  background: impactColors.low.bg,
                  color: impactColors.low.color,
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500
                }}
              >
                {t('impact_low' as any)}
              </span>
            </div>
            <h3 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: '4px' }}>
              {t('toolkit_dns_reset_title' as any)}
            </h3>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
              {t('toolkit_dns_reset_desc' as any)}
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-sm">
                {processing.dnsReset ? (
                  <RefreshCw size={14} className="spin" color="var(--cyan)" />
                ) : (
                  <Clock size={14} color="var(--text-50)" />
                )}
                <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                  {processing.dnsReset ? t('status_running' as any) : t('status_pending' as any)}
                </span>
              </div>
              <button
                className="btn btn-ghost"
                onClick={resetDns}
                disabled={!!processing.dnsReset}
                style={{ padding: 'var(--space-xs) var(--space-md)' }}
              >
                {processing.dnsReset ? (
                  <>
                    <RefreshCw size={14} className="spin" />
                    {t('status_running' as any)}
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} />
                    {t('action_reset' as any)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={compact ? 'mt-lg' : 'list-container mt-lg'}>
        {!compact && (
          <>
            <div className="list-header">
              <span className="list-title">{t('toolkit_actions_title' as any)}</span>
              <span className="list-count">{actions.length} {t('toolkit_actions_count' as any)}</span>
            </div>
            <p className="text-muted mt-sm">{t('toolkit_subtitle' as any)}</p>
          </>
        )}
        <div className="card-grid mt-md">
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onRun={() => runAction(action, false)}
              onUndo={action.undoCommand ? () => runAction(action, true) : undefined}
              busy={!!processing[`${action.id}-apply`] || !!processing[`${action.id}-undo`]}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}



import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Shield, AlertTriangle, RefreshCw, Settings, Lock } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface UpdatesProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export default function Updates({ showToast }: UpdatesProps) {
  const { t } = useI18n();
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const runPowershell = async (command: string) => {
    const wrapped = `
      $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
      if (-not $isAdmin) { throw "ADMIN_REQUIRED" }
      ${command}
    `;
    return await invoke('run_powershell', { command: wrapped });
  };

  const runUpdateAction = async (id: string, command: string, title: string, success: string) => {
    setProcessing((p) => ({ ...p, [id]: true }));
    showToast('info', title, t('updates_working' as any));
    try {
      await runPowershell(command);
      showToast('success', title, success);
    } catch (error) {
      const msg = String(error);
      showToast('error', title, msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required' as any) : msg);
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  const resetDefault = () =>
    runUpdateAction(
      'default',
      `
      $ErrorActionPreference = 'SilentlyContinue'
      Remove-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Recurse -Force
      Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization" -Recurse -Force
      Remove-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings" -Recurse -Force
      Remove-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata" -Recurse -Force
      Remove-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DriverSearching" -Recurse -Force
      Remove-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" -Recurse -Force

      Set-Service -Name BITS -StartupType Manual
      Set-Service -Name wuauserv -StartupType Manual
      Set-Service -Name UsoSvc -StartupType Automatic
      Set-Service -Name WaaSMedicSvc -StartupType Manual

      $Tasks =
        '\\Microsoft\\Windows\\InstallService\\*',
        '\\Microsoft\\Windows\\UpdateOrchestrator\\*',
        '\\Microsoft\\Windows\\UpdateAssistant\\*',
        '\\Microsoft\\Windows\\WaaSMedic\\*',
        '\\Microsoft\\Windows\\WindowsUpdate\\*',
        '\\Microsoft\\WindowsUpdate\\*'

      foreach ($Task in $Tasks) {
        Get-ScheduledTask -TaskPath $Task | Enable-ScheduledTask -ErrorAction SilentlyContinue
      }

      secedit /configure /cfg "$Env:SystemRoot\\inf\\defltbase.inf" /db defltbase.sdb
      `,
      t('updates_default_title' as any),
      t('updates_default_done' as any)
    );

  const applySecurity = () =>
    runUpdateAction(
      'security',
      `
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Device Metadata" -Name "PreventDeviceMetadataFromNetwork" -Type DWord -Value 1

      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DriverSearching" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DriverSearching" -Name "DontPromptForWindowsUpdate" -Type DWord -Value 1
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DriverSearching" -Name "DontSearchWindowsUpdate" -Type DWord -Value 1
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DriverSearching" -Name "DriverUpdateWizardWuSearchEnabled" -Type DWord -Value 0

      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate" -Name "ExcludeWUDriversInQualityUpdate" -Type DWord -Value 1

      New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings" -Name "BranchReadinessLevel" -Type DWord -Value 20
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings" -Name "DeferFeatureUpdatesPeriodInDays" -Type DWord -Value 365
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\WindowsUpdate\\UX\\Settings" -Name "DeferQualityUpdatesPeriodInDays" -Type DWord -Value 4

      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Name "NoAutoRebootWithLoggedOnUsers" -Type DWord -Value 1
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Name "AUPowerManagement" -Type DWord -Value 0
      `,
      t('updates_security_title' as any),
      t('updates_security_done' as any)
    );

  const disableUpdates = () =>
    runUpdateAction(
      'disable',
      `
      $ErrorActionPreference = 'SilentlyContinue'
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Name "NoAutoUpdate" -Type DWord -Value 1
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsUpdate\\AU" -Name "AUOptions" -Type DWord -Value 1

      New-Item -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" -Force | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\DeliveryOptimization\\Config" -Name "DODownloadMode" -Type DWord -Value 0

      Set-Service -Name BITS -StartupType Disabled
      Set-Service -Name wuauserv -StartupType Disabled
      Set-Service -Name UsoSvc -StartupType Disabled
      Set-Service -Name WaaSMedicSvc -StartupType Disabled

      Remove-Item "C:\\Windows\\SoftwareDistribution\\*" -Recurse -Force

      $Tasks =
        '\\Microsoft\\Windows\\InstallService\\*',
        '\\Microsoft\\Windows\\UpdateOrchestrator\\*',
        '\\Microsoft\\Windows\\UpdateAssistant\\*',
        '\\Microsoft\\Windows\\WaaSMedic\\*',
        '\\Microsoft\\Windows\\WindowsUpdate\\*',
        '\\Microsoft\\WindowsUpdate\\*'

      foreach ($Task in $Tasks) {
        Get-ScheduledTask -TaskPath $Task | Disable-ScheduledTask -ErrorAction SilentlyContinue
      }
      `,
      t('updates_disable_title' as any),
      t('updates_disable_done' as any)
    );

  return (
    <div>
      <div className="mb-lg">
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('updates_title' as any)}
        </h2>
        <p className="text-muted mt-sm">{t('updates_subtitle' as any)}</p>
      </div>

      <div className="updates-grid">
        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <Settings size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('updates_recommended' as any)}
            </div>
          </div>
          <h3 className="card-title">{t('updates_default_title' as any)}</h3>
          <p className="card-description">{t('updates_default_desc' as any)}</p>
          <ul className="updates-list">
            <li>{t('updates_default_point_1' as any)}</li>
            <li>{t('updates_default_point_2' as any)}</li>
            <li>{t('updates_default_point_3' as any)}</li>
          </ul>
          <div className="card-footer">
            <span className="card-meta">{t('updates_restart_note' as any)}</span>
            <button className="btn btn-primary" onClick={resetDefault} disabled={!!processing.default}>
              {processing.default ? <RefreshCw size={14} className="spin" /> : null}
              {t('updates_apply_default' as any)}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper success">
              <Shield size={20} />
            </div>
            <div className="card-status customize">
              <span className="card-status-dot" />
              {t('updates_balanced' as any)}
            </div>
          </div>
          <h3 className="card-title">{t('updates_security_title' as any)}</h3>
          <p className="card-description">{t('updates_security_desc' as any)}</p>
          <ul className="updates-list">
            <li>{t('updates_security_point_1' as any)}</li>
            <li>{t('updates_security_point_2' as any)}</li>
            <li>{t('updates_security_point_3' as any)}</li>
          </ul>
          <div className="card-footer">
            <span className="card-meta">{t('updates_group_policy_note' as any)}</span>
            <button className="btn btn-secondary" onClick={applySecurity} disabled={!!processing.security}>
              {processing.security ? <RefreshCw size={14} className="spin" /> : null}
              {t('updates_apply_security' as any)}
            </button>
          </div>
        </div>

        <div className="control-card updates-danger">
          <div className="card-header">
            <div className="card-icon-wrapper danger">
              <AlertTriangle size={20} />
            </div>
            <div className="card-status error">
              <span className="card-status-dot" />
              {t('updates_risky' as any)}
            </div>
          </div>
          <h3 className="card-title">{t('updates_disable_title' as any)}</h3>
          <p className="card-description">{t('updates_disable_desc' as any)}</p>
          <ul className="updates-list">
            <li>{t('updates_disable_point_1' as any)}</li>
            <li>{t('updates_disable_point_2' as any)}</li>
            <li>{t('updates_disable_point_3' as any)}</li>
          </ul>
          <div className="card-footer">
            <span className="card-meta danger">
              <Lock size={14} />
              {t('updates_disable_warning' as any)}
            </span>
            <button className="btn btn-secondary" onClick={disableUpdates} disabled={!!processing.disable}>
              {processing.disable ? <RefreshCw size={14} className="spin" /> : null}
              {t('updates_apply_disable' as any)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

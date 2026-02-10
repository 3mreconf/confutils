import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Globe,
  Download,
  Play,
  Square,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Shield,
  Zap,
  Info,
  ExternalLink,
  Folder
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface GoodbyeDPIProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

interface DPIMode {
  id: string;
  nameKey: string;
  descKey: string;
  command?: string;
  script?: string;
  serviceScript?: string;
  icon: any;
  recommended?: boolean;
}

interface DPIVariant {
  id: string;
  nameKey: string;
  descKey: string;
  url: string;
  installPath: string;
  repoUrl: string;
  modes: DPIMode[];
}

const ORIGINAL_MODES: DPIMode[] = [
  {
    id: 'mode1',
    nameKey: 'gdpi_mode1_name',
    descKey: 'gdpi_mode1_desc',
    command: '-1',
    icon: CheckCircle,
    recommended: true
  },
  {
    id: 'mode2',
    nameKey: 'gdpi_mode2_name',
    descKey: 'gdpi_mode2_desc',
    command: '-5',
    icon: Zap,
    recommended: false
  },
  {
    id: 'mode3',
    nameKey: 'gdpi_mode3_name',
    descKey: 'gdpi_mode3_desc',
    command: '-9',
    icon: Shield,
    recommended: false
  }
];

const TURKEY_MODES: DPIMode[] = [
  {
    id: 'tr_default',
    nameKey: 'gdpi_tr_mode_default_name',
    descKey: 'gdpi_tr_mode_default_desc',
    script: 'turkey_dnsredir.cmd',
    serviceScript: 'service_install_dnsredir_turkey.cmd',
    icon: CheckCircle,
    recommended: true
  },
  {
    id: 'tr_alt1',
    nameKey: 'gdpi_tr_mode_alt1_name',
    descKey: 'gdpi_tr_mode_alt1_desc',
    script: 'turkey_dnsredir_alternative_superonline.cmd',
    serviceScript: 'service_install_dnsredir_turkey_alternative_superonline.cmd',
    icon: Zap
  },
  {
    id: 'tr_alt2',
    nameKey: 'gdpi_tr_mode_alt2_name',
    descKey: 'gdpi_tr_mode_alt2_desc',
    script: 'turkey_dnsredir_alternative2_superonline.cmd',
    serviceScript: 'service_install_dnsredir_turkey_alternative2_superonline.cmd',
    icon: Shield
  },
  {
    id: 'tr_alt3',
    nameKey: 'gdpi_tr_mode_alt3_name',
    descKey: 'gdpi_tr_mode_alt3_desc',
    script: 'turkey_dnsredir_alternative3_superonline.cmd',
    serviceScript: 'service_install_dnsredir_turkey_alternative3_superonline.cmd',
    icon: Zap
  },
  {
    id: 'tr_alt4',
    nameKey: 'gdpi_tr_mode_alt4_name',
    descKey: 'gdpi_tr_mode_alt4_desc',
    script: 'turkey_dnsredir_alternative4_superonline.cmd',
    serviceScript: 'service_install_dnsredir_turkey_alternative4_superonline.cmd',
    icon: Shield
  },
  {
    id: 'tr_alt5',
    nameKey: 'gdpi_tr_mode_alt5_name',
    descKey: 'gdpi_tr_mode_alt5_desc',
    script: 'turkey_dnsredir_alternative5_superonline.cmd',
    serviceScript: 'service_install_dnsredir_turkey_alternative5_superonline.cmd',
    icon: Zap
  },
  {
    id: 'tr_alt6',
    nameKey: 'gdpi_tr_mode_alt6_name',
    descKey: 'gdpi_tr_mode_alt6_desc',
    script: 'turkey_dnsredir_alternative6_superonline.cmd',
    serviceScript: 'service_install_dnsredir_turkey_alternative6_superonline.cmd',
    icon: Shield
  }
];

const GOODBYEDPI_VARIANTS: DPIVariant[] = [
  {
    id: 'original',
    nameKey: 'gdpi_variant_original',
    descKey: 'gdpi_variant_original_desc',
    url: 'https://github.com/ValdikSS/GoodbyeDPI/releases/download/0.2.2/goodbyedpi-0.2.2.zip',
    installPath: 'C:\\ProgramData\\ConfUtils\\GoodbyeDPI',
    repoUrl: 'https://github.com/ValdikSS/GoodbyeDPI',
    modes: ORIGINAL_MODES
  },
  {
    id: 'turkey',
    nameKey: 'gdpi_variant_turkey',
    descKey: 'gdpi_variant_turkey_desc',
    url: 'https://github.com/cagritaskn/GoodbyeDPI-Turkey/releases/download/release-0.2.3rc3-turkey/goodbyedpi-0.2.3rc3-turkey.zip',
    installPath: 'C:\\ProgramData\\ConfUtils\\GoodbyeDPI-Turkey',
    repoUrl: 'https://github.com/cagritaskn/GoodbyeDPI-Turkey',
    modes: TURKEY_MODES
  }
];

export default function GoodbyeDPI({ showToast }: GoodbyeDPIProps) {
  const { t } = useI18n();
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState('original');
  const [selectedMode, setSelectedMode] = useState('mode1');
  const [isServiceInstalled, setIsServiceInstalled] = useState(false);

  const currentVariant = GOODBYEDPI_VARIANTS.find((variant) => variant.id === selectedVariant) ?? GOODBYEDPI_VARIANTS[0];
  const activeModes = currentVariant.modes;

  // Check installation status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    setSelectedMode(currentVariant.modes[0]?.id ?? 'mode1');
    checkStatus();
  }, [selectedVariant]);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const installPath = currentVariant.installPath;
      // Combined status check to avoid rate limiting
      const result = await invoke('run_powershell', {
        command: `
          $installed = Test-Path "${installPath}\\goodbyedpi.exe"
          $service = (Get-Service -Name "GoodbyeDPI" -ErrorAction SilentlyContinue) -ne $null
          $running = (Get-Process -Name "goodbyedpi" -ErrorAction SilentlyContinue) -ne $null
          "$installed|$service|$running"
        `
      }) as string;

      const parts = result.trim().split('|');
      setIsInstalled(parts[0]?.toLowerCase() === 'true');
      setIsServiceInstalled(parts[1]?.toLowerCase() === 'true');
      setIsRunning(parts[2]?.toLowerCase() === 'true');
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadAndInstall = async () => {
    setIsDownloading(true);
    showToast('info', t('gdpi_downloading'), t('gdpi_downloading_desc'));

    try {
      const installPath = currentVariant.installPath;
      const downloadUrl = currentVariant.url;
      const result = await invoke('run_powershell', {
        command: `
          $ErrorActionPreference = "Stop"
          $extractPath = "$env:TEMP\\goodbyedpi_extract"
          $zipPath = "$env:TEMP\\goodbyedpi.zip"

          # Clean previous attempts
          Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
          Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

          # Create install directory
          New-Item -ItemType Directory -Force -Path "${installPath}" | Out-Null

          # Download GoodbyeDPI
          [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
          $ProgressPreference = 'SilentlyContinue'
          Invoke-WebRequest -Uri "${downloadUrl}" -OutFile $zipPath -UseBasicParsing

          if (!(Test-Path $zipPath)) {
            throw "Download failed - zip file not found"
          }

          # Extract to temp folder
          Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

          $exeFile = Get-ChildItem $extractPath -Recurse -Filter "goodbyedpi.exe" | Select-Object -First 1
          if (!$exeFile) {
            throw "goodbyedpi.exe not found in extracted archive"
          }

          $exeFolder = $exeFile.Directory.FullName
          Copy-Item -Path "$exeFolder\\*" -Destination "${installPath}" -Recurse -Force

          $parentFolder = $exeFile.Directory.Parent
          if ($parentFolder) {
            Get-ChildItem $parentFolder.FullName -File | Where-Object { $_.Extension -eq ".txt" -or $_.Extension -eq ".cmd" } | Copy-Item -Destination "${installPath}" -Force
          }

          # Verify installation
          if (!(Test-Path "${installPath}\\goodbyedpi.exe")) {
            throw "Installation verification failed - goodbyedpi.exe not found"
          }

          # Cleanup
          Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
          Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

          "SUCCESS"
        `
      }) as string;

      if (result.trim().includes('SUCCESS')) {
        setIsInstalled(true);
        showToast('success', t('gdpi_installed'), t('gdpi_installed_desc'));
      } else {
        throw new Error(result);
      }
    } catch (error) {
      showToast('error', t('gdpi_install_error'), String(error));
    } finally {
      setIsDownloading(false);
      await checkStatus();
    }
  };

  const startGoodbyeDPI = async () => {
    const mode = activeModes.find(m => m.id === selectedMode);
    if (!mode) return;

    showToast('info', t('gdpi_starting'), t(mode.nameKey as any));

    try {
      const installPath = currentVariant.installPath;
      const startCommand = currentVariant.id === 'turkey'
        ? `
          $scriptPath = "${installPath}\\${mode.serviceScript ?? mode.script ?? ''}"
          if (!(Test-Path $scriptPath)) { throw "Script not found: $scriptPath" }
          cmd.exe /c "echo.| ""$scriptPath"""
        `
        : mode.script
          ? `
            Set-Location -Path "${installPath}"
            & ".\\${mode.script}"
          `
          : `Start-Process -FilePath "${installPath}\\goodbyedpi.exe" -ArgumentList "${mode.command}" -WorkingDirectory "${installPath}" -WindowStyle Hidden`;
      await invoke('run_powershell', {
        command: `
          Stop-Process -Name "goodbyedpi" -Force -ErrorAction SilentlyContinue
          ${startCommand}
        `
      });

      setIsRunning(true);
      showToast('success', t('gdpi_started'), t('gdpi_started_desc'));
    } catch (error) {
      showToast('error', t('gdpi_start_error'), String(error));
    }
  };

  const stopGoodbyeDPI = async () => {
    showToast('info', t('gdpi_stopping'), t('gdpi_stopping_desc'));

    try {
      const result = await invoke('run_powershell', {
        command: `
          sc.exe stop "GoodbyeDPI" 2>$null
          taskkill /f /im goodbyedpi.exe 2>$null
          Stop-Process -Name "goodbyedpi" -Force -ErrorAction SilentlyContinue
          $running = (Get-Process -Name "goodbyedpi" -ErrorAction SilentlyContinue) -ne $null
          if ($running) { "RUNNING" } else { "STOPPED" }
        `
      }) as string;

      if (result.trim().includes('STOPPED')) {
        setIsRunning(false);
        showToast('success', t('gdpi_stopped'), t('gdpi_stopped_desc'));
      } else {
        throw new Error('goodbyedpi still running');
      }
    } catch (error) {
      showToast('error', t('gdpi_stop_error'), String(error));
    }
  };

  const installService = async () => {
    const mode = activeModes.find(m => m.id === selectedMode);
    if (!mode) return;

    showToast('info', t('gdpi_service_installing'), t('gdpi_service_installing_desc'));

    try {
      const installPath = currentVariant.installPath;
      const serviceCommand = currentVariant.id === 'turkey'
        ? `
          $scriptPath = "${installPath}\\${mode.serviceScript ?? ''}"
          if (!(Test-Path $scriptPath)) { throw "Service script not found: $scriptPath" }
          cmd.exe /c "echo.| ""$scriptPath"""
        `
        : `
          # Stop existing if running
          Stop-Process -Name "goodbyedpi" -Force -ErrorAction SilentlyContinue

          # Remove old service if exists
          sc.exe delete "GoodbyeDPI" 2>$null

          # Create service
          $exePath = "${installPath}\\goodbyedpi.exe"
          $args = "${mode.command}"

          # Use sc.exe to create service
          sc.exe create "GoodbyeDPI" binPath= "$exePath $args" start= auto DisplayName= "GoodbyeDPI Service"
          sc.exe description "GoodbyeDPI" "Deep Packet Inspection circumvention utility"
          sc.exe start "GoodbyeDPI"
        `;
      await invoke('run_powershell', {
        command: serviceCommand
      });

      setIsServiceInstalled(true);
      setIsRunning(true);
      showToast('success', t('gdpi_service_installed'), t('gdpi_service_installed_desc'));
    } catch (error) {
      showToast('error', t('gdpi_service_error'), String(error));
    }
  };

  const removeService = async () => {
    showToast('info', t('gdpi_service_removing'), t('gdpi_service_removing_desc'));

    try {
      await invoke('run_powershell', {
        command: `
          sc.exe stop "GoodbyeDPI" 2>$null
          sc.exe delete "GoodbyeDPI" 2>$null
          Stop-Process -Name "goodbyedpi" -Force -ErrorAction SilentlyContinue
        `
      });

      setIsServiceInstalled(false);
      setIsRunning(false);
      showToast('success', t('gdpi_service_removed'), t('gdpi_service_removed_desc'));
    } catch (error) {
      showToast('error', t('gdpi_service_error'), String(error));
    }
  };

  const openInstallFolder = async () => {
    try {
      await invoke('run_powershell', {
        command: `explorer.exe "${currentVariant.installPath}"`
      });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            GoodbyeDPI
          </h2>
          <p className="text-muted mt-sm">
            {t('gdpi_subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-sm">
          <button className="btn btn-secondary" onClick={checkStatus} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
            {t('refresh')}
          </button>
          {isInstalled && (
            <button className="btn btn-ghost" onClick={openInstallFolder}>
              <Folder size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div
        className="control-card mb-lg"
        style={{
          padding: 'var(--space-xl)',
          background: isRunning
            ? 'linear-gradient(135deg, var(--success-bg) 0%, var(--surface) 100%)'
            : 'linear-gradient(135deg, var(--surface) 0%, var(--elevated) 100%)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-lg">
            <div
              style={{
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isRunning ? 'var(--success)' : 'var(--raised)',
                borderRadius: 'var(--radius-lg)',
                color: isRunning ? 'var(--deep)' : 'var(--text-50)'
              }}
            >
              <Globe size={32} />
            </div>
            <div>
              <div className="flex items-center gap-sm mb-xs">
                {isRunning ? (
                  <CheckCircle size={18} color="var(--success)" />
                ) : (
                  <AlertCircle size={18} color="var(--text-50)" />
                )}
                <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)' }}>
                  {isRunning ? t('gdpi_status_active') : t('gdpi_status_inactive')}
                </span>
              </div>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {isInstalled
                  ? (isRunning ? t('gdpi_running_desc') : t('gdpi_ready_desc'))
                  : t('gdpi_not_installed_desc')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-sm">
            {!isInstalled ? (
              <button
                className="btn btn-primary"
                onClick={downloadAndInstall}
                disabled={isDownloading}
                style={{ minWidth: 160 }}
              >
                {isDownloading ? (
                  <>
                    <RefreshCw size={18} className="spin" />
                    {t('downloading')}
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    {t('gdpi_install')}
                  </>
                )}
              </button>
            ) : isRunning ? (
              <button className="btn btn-danger" onClick={stopGoodbyeDPI} style={{ minWidth: 160 }}>
                <Square size={18} />
                {t('gdpi_stop')}
              </button>
            ) : (
              <button className="btn btn-primary" onClick={startGoodbyeDPI} style={{ minWidth: 160 }}>
                <Play size={18} />
                {t('gdpi_start')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Variant Selection */}
      <div className="control-card mb-lg" style={{ padding: 'var(--space-lg)' }}>
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-md)' }}>
          {t('gdpi_variant_title')}
        </h3>
        <div className="card-grid">
          {GOODBYEDPI_VARIANTS.map((variant) => (
            <button
              key={variant.id}
              className="control-card"
              style={{
                padding: 'var(--space-lg)',
                cursor: 'pointer',
                border: selectedVariant === variant.id ? '2px solid var(--cyan)' : '1px solid var(--glass-border)',
                background: selectedVariant === variant.id ? 'var(--cyan-15)' : 'var(--surface)',
                textAlign: 'left'
              }}
              onClick={() => setSelectedVariant(variant.id)}
              disabled={isRunning || isDownloading}
            >
              <div className="flex items-center gap-md mb-md">
                <Globe size={20} color={selectedVariant === variant.id ? 'var(--cyan)' : 'var(--text-50)'} />
                <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{t(variant.nameKey as any)}</span>
                {variant.id === 'turkey' && (
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      padding: '2px 8px',
                      background: 'var(--warning-bg)',
                      color: 'var(--warning)',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: 500
                    }}
                  >
                    TR
                  </span>
                )}
              </div>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {t(variant.descKey as any)}
              </p>
              {selectedVariant === variant.id && (
                <div className="flex items-center gap-sm mt-md" style={{ color: 'var(--cyan)', fontSize: 'var(--text-xs)' }}>
                  <CheckCircle size={14} />
                  {t('selected')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Selection */}
      {isInstalled && (
        <>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-md)' }}>
            {t('gdpi_select_mode')}
          </h3>
          <div className="card-grid mb-lg">
            {activeModes.map((mode) => (
              <button
                key={mode.id}
                className="control-card"
                style={{
                  padding: 'var(--space-lg)',
                  cursor: 'pointer',
                  border: selectedMode === mode.id ? '2px solid var(--cyan)' : '1px solid var(--glass-border)',
                  background: selectedMode === mode.id ? 'var(--cyan-15)' : 'var(--surface)',
                  textAlign: 'left'
                }}
                onClick={() => setSelectedMode(mode.id)}
                disabled={isRunning}
              >
                <div className="flex items-center gap-md mb-md">
                  <mode.icon size={20} color={selectedMode === mode.id ? 'var(--cyan)' : 'var(--text-50)'} />
                  <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{t(mode.nameKey as any)}</span>
                  {mode.recommended && (
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        padding: '2px 8px',
                        background: 'var(--success-bg)',
                        color: 'var(--success)',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 500
                      }}
                    >
                      {t('recommended')}
                    </span>
                  )}
                </div>
                <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {t(mode.descKey as any)}
                </p>
                {selectedMode === mode.id && (
                  <div className="flex items-center gap-sm mt-md" style={{ color: 'var(--cyan)', fontSize: 'var(--text-xs)' }}>
                    <CheckCircle size={14} />
                    {t('selected')}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Service Management */}
          <div className="control-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h4 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: '4px' }}>
                  {t('gdpi_service_title')}
                </h4>
                <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                  {t('gdpi_service_desc')}
                </p>
              </div>
              <div className="flex items-center gap-sm">
                {isServiceInstalled ? (
                  <button className="btn btn-danger" onClick={removeService}>
                    {t('gdpi_service_remove')}
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={installService}>
                    {t('gdpi_service_install')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info Section */}
        <div className="control-card mt-lg" style={{ padding: 'var(--space-lg)', background: 'var(--deep)' }}>
          <div className="flex items-start gap-md">
            <Info size={20} color="var(--cyan)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
                {t('gdpi_info')}
              </p>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  invoke('run_powershell', { command: `Start-Process "${currentVariant.repoUrl}"` });
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                    gap: 'var(--space-xs)',
                    color: 'var(--cyan)',
                    fontSize: 'var(--text-sm)',
                    marginTop: 'var(--space-sm)'
                  }}
                >
                  GitHub <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

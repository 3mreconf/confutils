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
  command: string;
  icon: any;
  recommended?: boolean;
}

const DPI_MODES: DPIMode[] = [
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

const GOODBYEDPI_URL = 'https://github.com/ValdikSS/GoodbyeDPI/releases/download/0.2.2/goodbyedpi-0.2.2.zip';
const INSTALL_PATH = 'C:\\ProgramData\\ConfUtils\\GoodbyeDPI';

export default function GoodbyeDPI({ showToast }: GoodbyeDPIProps) {
  const { t } = useI18n();
  const [isInstalled, setIsInstalled] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedMode, setSelectedMode] = useState('mode1');
  const [isServiceInstalled, setIsServiceInstalled] = useState(false);

  // Check installation status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      // Combined status check to avoid rate limiting
      const result = await invoke('run_powershell', {
        command: `
          $installed = Test-Path "${INSTALL_PATH}\\goodbyedpi.exe"
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
      const result = await invoke('run_powershell', {
        command: `
          $ErrorActionPreference = "Stop"
          $extractPath = "$env:TEMP\\goodbyedpi_extract"
          $zipPath = "$env:TEMP\\goodbyedpi.zip"

          # Clean previous attempts
          Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
          Remove-Item $extractPath -Recurse -Force -ErrorAction SilentlyContinue

          # Create install directory
          New-Item -ItemType Directory -Force -Path "${INSTALL_PATH}" | Out-Null

          # Download GoodbyeDPI
          [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
          $ProgressPreference = 'SilentlyContinue'
          Invoke-WebRequest -Uri "${GOODBYEDPI_URL}" -OutFile $zipPath -UseBasicParsing

          if (!(Test-Path $zipPath)) {
            throw "Download failed - zip file not found"
          }

          # Extract to temp folder
          Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force

          # Find x86_64 folder (it's inside the main extracted folder)
          $x64Folder = Get-ChildItem $extractPath -Recurse -Directory | Where-Object { $_.Name -eq "x86_64" } | Select-Object -First 1

          if ($x64Folder) {
            # Copy x86_64 contents
            Copy-Item -Path "$($x64Folder.FullName)\\*" -Destination "${INSTALL_PATH}" -Recurse -Force

            # Also copy blacklist files from parent folder (folder above x86_64)
            $parentFolder = $x64Folder.Parent.FullName
            Get-ChildItem $parentFolder -File | Where-Object { $_.Extension -eq ".txt" -or $_.Extension -eq ".cmd" } | Copy-Item -Destination "${INSTALL_PATH}" -Force
          } else {
             # Fallback for different structure
             $extractedRoot = Get-ChildItem $extractPath -Directory | Select-Object -First 1
             if ($extractedRoot) {
                # Try to find x86_64 deeper or assume flat structure
                $deepX64 = Get-ChildItem $extractedRoot.FullName -Recurse -Directory | Where-Object { $_.Name -eq "x86_64" } | Select-Object -First 1
                if ($deepX64) {
                     Copy-Item -Path "$($deepX64.FullName)\\*" -Destination "${INSTALL_PATH}" -Recurse -Force
                     $parentFolder = $deepX64.Parent.FullName
                     Get-ChildItem $parentFolder -File | Where-Object { $_.Extension -eq ".txt" -or $_.Extension -eq ".cmd" } | Copy-Item -Destination "${INSTALL_PATH}" -Force
                } else {
                     throw "x86_64 folder not found in extracted archive"
                }
             } else {
                 throw "Extraction failed - empty content"
             }
          }

          # Verify installation
          if (!(Test-Path "${INSTALL_PATH}\\goodbyedpi.exe")) {
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
    const mode = DPI_MODES.find(m => m.id === selectedMode);
    if (!mode) return;

    showToast('info', t('gdpi_starting'), t(mode.nameKey as any));

    try {
      await invoke('run_powershell', {
        command: `
          Start-Process -FilePath "${INSTALL_PATH}\\goodbyedpi.exe" -ArgumentList "${mode.command}" -WorkingDirectory "${INSTALL_PATH}" -WindowStyle Hidden
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
      await invoke('run_powershell', {
        command: `Stop-Process -Name "goodbyedpi" -Force -ErrorAction SilentlyContinue`
      });

      setIsRunning(false);
      showToast('success', t('gdpi_stopped'), t('gdpi_stopped_desc'));
    } catch (error) {
      showToast('error', t('gdpi_stop_error'), String(error));
    }
  };

  const installService = async () => {
    const mode = DPI_MODES.find(m => m.id === selectedMode);
    if (!mode) return;

    showToast('info', t('gdpi_service_installing'), t('gdpi_service_installing_desc'));

    try {
      await invoke('run_powershell', {
        command: `
          # Stop existing if running
          Stop-Process -Name "goodbyedpi" -Force -ErrorAction SilentlyContinue

          # Remove old service if exists
          sc.exe delete "GoodbyeDPI" 2>$null

          # Create service
          $exePath = "${INSTALL_PATH}\\goodbyedpi.exe"
          $args = "${mode.command}"

          # Use sc.exe to create service
          sc.exe create "GoodbyeDPI" binPath= "$exePath $args" start= auto DisplayName= "GoodbyeDPI Service"
          sc.exe description "GoodbyeDPI" "Deep Packet Inspection circumvention utility"
          sc.exe start "GoodbyeDPI"
        `
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
        command: `explorer.exe "${INSTALL_PATH}"`
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

      {/* Mode Selection */}
      {isInstalled && (
        <>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-md)' }}>
            {t('gdpi_select_mode')}
          </h3>
          <div className="card-grid mb-lg">
            {DPI_MODES.map((mode) => (
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
                    invoke('run_powershell', { command: 'Start-Process "https://github.com/ValdikSS/GoodbyeDPI"' });
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

import { Shield, Cpu, HardDrive, Info, Sparkles, Github } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { open } from '@tauri-apps/plugin-shell';
import { invoke } from '@tauri-apps/api/core';

interface AboutProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

export default function About({ showToast }: AboutProps) {
  const { t } = useI18n();
  const runAction = async (action: 'changelog' | 'license' | 'report' | 'profiles' | 'analytics') => {
    try {
      switch (action) {
        case 'changelog':
          open('https://github.com/3mreconf/confutils/releases');
          return;
        case 'license':
          open('https://github.com/3mreconf/confutils/blob/main/LICENSE');
          return;
        case 'profiles':
          await invoke('run_powershell', { command: 'New-Item -ItemType Directory -Force -Path "C:\\ProgramData\\ConfUtils\\Profiles" | Out-Null; Start-Process "C:\\ProgramData\\ConfUtils\\Profiles"' });
          return;
        case 'analytics':
          await invoke('run_powershell', { command: 'Start-Process "ms-settings:storage"' });
          return;
        case 'report':
        default:
          await invoke('run_powershell', {
            command: `
              $reportDir = "C:\\ProgramData\\ConfUtils\\Reports"
              New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
              $reportPath = Join-Path $reportDir ("security-report-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".txt")
              Get-ComputerInfo | Out-File -FilePath $reportPath -Encoding UTF8
              Start-Process $reportDir
            `
          });
          return;
      }
    } catch (error) {
      showToast('error', t('service_error'), String(error));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('about_title')}
          </h2>
          <p className="text-muted mt-sm">{t('about_subtitle')}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => runAction('changelog')}>
          <Info size={16} />
          {t('about_changelog')}
        </button>
      </div>

      <div className="card-grid">
        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <Sparkles size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('premium')}
            </div>
          </div>
          <div className="card-title">{t('version')} 2.1.32</div>
          <div className="card-description">
            {t('about_premium_desc')}
          </div>
          <div className="card-footer">
            <span className="card-meta">{t('build')}: 2026.02.05</span>
            <button className="btn btn-primary" onClick={() => runAction('license')}>
              {t('about_license')}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper success">
              <Shield size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('secure')}
            </div>
          </div>
          <div className="card-title">{t('about_security_title')}</div>
          <div className="card-description">
            {t('about_security_desc')}
          </div>
          <div className="card-footer">
            <span className="card-meta">{t('modules')}: 6 {t('active')}</span>
            <button className="btn btn-secondary" onClick={() => runAction('report')}>
              {t('about_report')}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper amber">
              <Cpu size={20} />
            </div>
            <div className="card-status warning">
              <span className="card-status-dot" />
              {t('tuned')}
            </div>
          </div>
          <div className="card-title">{t('about_perf_title')}</div>
          <div className="card-description">
            {t('about_perf_desc')}
          </div>
          <div className="card-footer">
            <span className="card-meta">{t('profiles')}: 4 {t('ready')}</span>
            <button className="btn btn-secondary" onClick={() => runAction('profiles')}>
              {t('about_profiles')}
            </button>
          </div>
        </div>

        <div className="control-card">
          <div className="card-header">
            <div className="card-icon-wrapper">
              <HardDrive size={20} />
            </div>
            <div className="card-status">
              <span className="card-status-dot" />
              {t('stable')}
            </div>
          </div>
          <div className="card-title">{t('about_storage_title')}</div>
          <div className="card-description">
            {t('about_storage_desc')}
          </div>
          <div className="card-footer">
            <span className="card-meta">{t('space_reclaimed')}: 42 GB</span>
            <button className="btn btn-secondary" onClick={() => runAction('analytics')}>
              {t('about_analytics')}
            </button>
          </div>
        </div>
      </div>

      <div className="list-container mt-lg">
        <div className="list-header">
          <div className="list-title">{t('core_contributors')}</div>
          <div className="list-count">{t('team')}</div>
        </div>
        <div className="list-item">
          <div className="list-item-icon">
            <Github size={16} />
          </div>
          <div className="list-item-content">
            <div className="list-item-title">ConfUtils Lab</div>
            <div className="list-item-subtitle">{t('about_contrib_desc')}</div>
          </div>
          <div className="list-item-actions">
            <button className="btn btn-secondary" onClick={() => open('https://github.com/3mreconf/confutils/')}>
              {t('about_repo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}





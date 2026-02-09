import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Sliders,
  Bell,
  Shield,
  Monitor,
  Cloud,
  CheckCircle
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

const buildSettingBlocks = (t: (key: any) => string) => ([
  {
    id: 'performance',
    title: t('settings_block_performance_title'),
    description: t('settings_block_performance_desc'),
    icon: Sliders,
    status: t('settings_status_balanced'),
    command: 'Start-Process "control.exe" -ArgumentList "powercfg.cpl"'
  },
  {
    id: 'alerts',
    title: t('settings_block_alerts_title'),
    description: t('settings_block_alerts_desc'),
    icon: Bell,
    status: t('settings_status_enabled'),
    command: 'Start-Process "ms-settings:notifications"'
  },
  {
    id: 'security',
    title: t('settings_block_security_title'),
    description: t('settings_block_security_desc'),
    icon: Shield,
    status: t('settings_status_hardened'),
    command: 'Start-Process "windowsdefender:"'
  },
  {
    id: 'display',
    title: t('settings_block_display_title'),
    description: t('settings_block_display_desc'),
    icon: Monitor,
    status: t('settings_status_cinematic'),
    command: 'Start-Process "ms-settings:display"'
  },
  {
    id: 'cloud',
    title: t('settings_block_cloud_title'),
    description: t('settings_block_cloud_desc'),
    icon: Cloud,
    status: t('settings_status_connected'),
    command: 'Start-Process "ms-settings:backup"'
  }
]);

export default function Settings({ showToast }: SettingsProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const settingBlocks = buildSettingBlocks(t);

  const handleSave = () => {
    setSaving(true);
    showToast('info', t('settings_saving'), t('settings_saved_msg'));
    setTimeout(() => {
      setSaving(false);
      showToast('success', t('settings_saved'), t('settings_saved_msg'));
    }, 1200);
  };
  const handleConfigure = async (blockId: string) => {
    const block = settingBlocks.find((item) => item.id === blockId);
    if (!block?.command) return;

    showToast('info', t('settings_configure'), t('settings_opening'));
    try {
      await invoke('run_powershell', { command: block.command });
    } catch (error) {
      showToast('error', t('settings_opening'), String(error));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('settings_title')}
          </h2>
          <p className="text-muted mt-sm">{t('settings_subtitle')}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          <CheckCircle size={16} />
          {saving ? t('settings_saving') : t('settings_save')}
        </button>
      </div>

      <div className="card-grid">
        {settingBlocks.map((block) => (
          <div key={block.id} className="control-card">
            <div className="card-header">
              <div className="card-icon-wrapper">
                <block.icon size={20} />
              </div>
              <div className="card-status">
                <span className="card-status-dot" />
                {block.status}
              </div>
            </div>
            <div className="card-title">{block.title}</div>
            <div className="card-description">{block.description}</div>
            <div className="card-footer">
              <span className="card-meta">{t('last_updated_today')}</span>
              <button className="btn btn-secondary" onClick={() => handleConfigure(block.id)}>
                {t('settings_configure')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

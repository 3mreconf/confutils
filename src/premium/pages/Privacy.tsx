import { useState, useEffect } from 'react';
import {
  Shield,
  Eye,
  EyeOff,
  MapPin,
  Mic,
  Camera,
  Activity,
  FileText,
  Search,
  AlertTriangle,
  Lock,
  RefreshCw
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import { privacySettingsCatalog } from '../data/privacy_settings_catalog';

interface PrivacyProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  externalQuery?: string;
}

type RegistryItem = {
  path: string;
  name: string;
  type: string;
  enableValue: string;
  disableValue: string;
};

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  risk: 'low' | 'medium' | 'high';
  category: string;
  registry?: RegistryItem[];
  enableScript?: string[];
  disableScript?: string[];
}

const privacyIcons: Record<string, any> = {
  telemetry: Activity,
  advertising: Eye,
  location: MapPin,
  camera: Camera,
  microphone: Mic,
  activity: FileText,
  cortana: Mic,
  searchHistory: Search
};

const buildInitialSettings = (t: (key: any) => string): PrivacySetting[] =>
  privacySettingsCatalog.map((setting) => ({
    id: setting.id,
    title: t(setting.titleKey as any),
    description: t(setting.descriptionKey as any),
    icon: privacyIcons[setting.id] || Shield,
    enabled: false,
    risk: setting.risk,
    category: setting.category,
    registry: setting.registry,
    enableScript: setting.enableScript,
    disableScript: setting.disableScript
  }));

const ToggleSwitch = ({
  checked,
  onChange,
  disabled = false
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <label className="toggle" style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="toggle-track">
      <span className="toggle-thumb" />
    </span>
  </label>
);

const PrivacyCard = ({
  setting,
  onToggle,
  isProcessing = false
}: {
  setting: PrivacySetting;
  onToggle: (id: string, enabled: boolean) => void;
  isProcessing?: boolean;
}) => {
  const { t } = useI18n();
  const Icon = setting.icon;

  const riskColors = {
    low: { bg: 'var(--success-bg)', color: 'var(--success)', label: t('risk_low') },
    medium: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: t('risk_medium') },
    high: { bg: 'var(--danger-bg)', color: 'var(--danger)', label: t('risk_high') }
  };

  const risk = riskColors[setting.risk];

  return (
    <div className="control-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md" style={{ flex: 1 }}>
          <div
            style={{
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: setting.enabled ? 'var(--success-bg)' : 'var(--raised)',
              borderRadius: 'var(--radius-md)',
              color: setting.enabled ? 'var(--success)' : 'var(--text-50)',
              transition: 'all var(--duration-normal) var(--ease-out)'
            }}
          >
            <Icon size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-sm">
              <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{setting.title}</span>
              <span
                style={{
                  fontSize: 'var(--text-xs)',
                  padding: '2px 6px',
                  background: risk.bg,
                  color: risk.color,
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 500
                }}
              >
                {risk.label}
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginTop: '4px' }}>
              {setting.description}
            </p>
          </div>
        </div>
        {isProcessing ? (
          <RefreshCw size={20} className="spin" style={{ color: 'var(--cyan)' }} />
        ) : (
          <ToggleSwitch
            checked={setting.enabled}
            onChange={(checked) => onToggle(setting.id, checked)}
          />
        )}
      </div>
    </div>
  );
};

export default function Privacy({ showToast, externalQuery }: PrivacyProps) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(buildInitialSettings(t));
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [applyingAll, setApplyingAll] = useState(false);

  const runPowershell = async (command: string, requireAdmin = false) => {
    const wrapped = requireAdmin ? `
      $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
      if (-not $isAdmin) { throw "ADMIN_REQUIRED" }
      ${command}
    ` : command;

    return await invoke('run_powershell', { command: wrapped });
  };

  const loadPrivacyState = async () => {
    const base = buildInitialSettings(t);
    const registryItems = base.flatMap((setting) =>
      (setting.registry ?? []).map((reg, idx) => ({
        key: `${setting.id}:${idx}`,
        path: reg.path,
        name: reg.name,
        enableValue: reg.enableValue
      }))
    );

    if (registryItems.length === 0) {
      setSettings(base);
      return;
    }

    try {
      const payload = JSON.stringify(registryItems);
      const result = await runPowershell(`
        $items = @'
${payload}
'@ | ConvertFrom-Json
        $out = foreach ($i in $items) {
          $value = $null
          try {
            $prop = Get-ItemProperty -Path $i.path -Name $i.name -ErrorAction SilentlyContinue
            $value = $prop."$($i.name)"
          } catch {}
          [PSCustomObject]@{ key = $i.key; value = $value }
        }
        $out | ConvertTo-Json -Compress
      `) as string;

      const parsed = result && result.trim() ? JSON.parse(result) : [];
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const valueMap = new Map<string, string>();
      list.forEach((item: { key: string; value: any }) => {
        const val = item.value === null || typeof item.value === 'undefined' ? '' : String(item.value);
        valueMap.set(item.key, val);
      });

      const updated = base.map((setting) => {
        if (!setting.registry || setting.registry.length === 0) {
          return setting;
        }
        const allMatch = setting.registry.every((reg, idx) => {
          const key = `${setting.id}:${idx}`;
          const current = valueMap.get(key) ?? '';
          return current === String(reg.enableValue);
        });
        return { ...setting, enabled: allMatch };
      });

      setSettings(updated);
    } catch (error) {
      console.error('Failed to load privacy state:', error);
      setSettings(base);
    }
  };

  useEffect(() => {
    loadPrivacyState();
  }, [t]);

  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setSearchQuery(externalQuery);
    }
  }, [externalQuery]);

  const handleToggle = async (id: string, enabled: boolean) => {
    const setting = settings.find(s => s.id === id);
    if (!setting) return;

    setProcessing(prev => ({ ...prev, [id]: true }));

    try {
      const needsAdmin = (setting.registry ?? []).some(r => r.path.startsWith('HKLM:')) || !!setting.enableScript || !!setting.disableScript;

      // Apply registry changes
      if (setting.registry) {
        for (const reg of setting.registry) {
          const value = enabled ? reg.enableValue : reg.disableValue;
          const command = `
            if (-not (Test-Path "${reg.path}")) {
              New-Item -Path "${reg.path}" -Force | Out-Null
            }
            Set-ItemProperty -Path "${reg.path}" -Name "${reg.name}" -Value "${value}" -Type ${reg.type} -Force
          `;
          await runPowershell(command, reg.path.startsWith('HKLM:') || needsAdmin);
        }
      }

      // Run enable/disable scripts
      const script = enabled ? setting.enableScript : setting.disableScript;
      if (script) {
        await runPowershell(script.join('; '), needsAdmin);
      }

      setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
      showToast(
        'success',
        enabled ? t('privacy_setting_enabled') : t('privacy_setting_disabled'),
        `${setting.title} ${enabled ? t('privacy_enabled_suffix') : t('privacy_disabled_suffix')}`
      );
    } catch (error) {
      console.error(error);
      const msg = String(error);
      showToast('error', t('privacy_error'), msg.includes('ADMIN_REQUIRED') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleApplyAll = async () => {
    setApplyingAll(true);
    try {
      for (const setting of settings) {
        if (!setting.enabled) {
          await handleToggle(setting.id, true);
        }
      }
      showToast('success', t('privacy_apply_all_title'), t('privacy_apply_all_desc'));
    } catch (error) {
      showToast('error', t('privacy_error'), String(error));
    } finally {
      setApplyingAll(false);
    }
  };

  const handleResetAll = async () => {
    setApplyingAll(true);
    try {
      for (const setting of settings) {
        if (setting.enabled) {
          await handleToggle(setting.id, false);
        }
      }
      showToast('info', t('privacy_reset_title'), t('privacy_reset_desc'));
    } catch (error) {
      showToast('error', t('privacy_error'), String(error));
    } finally {
      setApplyingAll(false);
    }
  };

  const enabledCount = settings.filter(s => s.enabled).length;
  const filteredSettings = settings.filter(s => {
    if (filter === 'enabled' && !s.enabled) return false;
    if (filter === 'disabled' && s.enabled) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q);
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('privacy_center_title')}
          </h2>
          <p className="text-muted mt-sm">
            {t('privacy_center_subtitle')}
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={handleResetAll}>
            {t('reset_all')}
          </button>
          <button className="btn btn-primary" onClick={handleApplyAll} disabled={applyingAll}>
            {applyingAll ? <RefreshCw size={16} className="spin" /> : <Shield size={16} />}
            {applyingAll ? t('applying') : t('apply_all')}
          </button>
        </div>
      </div>

      {/* Privacy Score */}
      <div
        className="control-card mb-lg"
        style={{
          padding: 'var(--space-xl)',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--elevated) 100%)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            background: enabledCount >= 6 ? 'var(--success)' : enabledCount >= 3 ? 'var(--warning)' : 'var(--danger)',
            opacity: 0.05,
            borderRadius: '50%',
            filter: 'blur(40px)'
          }}
        />

        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-md mb-md">
              <div
                style={{
                  width: 48,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: enabledCount >= 6 ? 'var(--success-bg)' : enabledCount >= 3 ? 'var(--warning-bg)' : 'var(--danger-bg)',
                  borderRadius: 'var(--radius-lg)',
                  color: enabledCount >= 6 ? 'var(--success)' : enabledCount >= 3 ? 'var(--warning)' : 'var(--danger)'
                }}
              >
                {enabledCount >= 6 ? <Lock size={24} /> : <AlertTriangle size={24} />}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-50)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t('privacy_score')}
                </div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 'var(--text-3xl)',
                    fontWeight: 700,
                    color: enabledCount >= 6 ? 'var(--success)' : enabledCount >= 3 ? 'var(--warning)' : 'var(--danger)'
                  }}
                >
                  {Math.round((enabledCount / settings.length) * 100)}%
                </div>
              </div>
            </div>
            <p className="text-muted" style={{ maxWidth: 400 }}>
              {enabledCount >= 6
                ? t('privacy_score_excellent')
                : enabledCount >= 3
                  ? t('privacy_score_good')
                  : t('privacy_score_attention')}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div className="flex items-center gap-lg">
              <div>
                <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('enabled')}</div>
                <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--success)' }}>
                  {enabledCount}
                </div>
              </div>
              <div style={{ width: 1, height: 40, background: 'var(--glass-border)' }} />
              <div>
                <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('disabled')}</div>
                <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--danger)' }}>
                  {settings.length - enabledCount}
                </div>
              </div>
              <div style={{ width: 1, height: 40, background: 'var(--glass-border)' }} />
              <div>
                <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('total')}</div>
                <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-90)' }}>
                  {settings.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-lg" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
        <div className="search-input" style={{ minWidth: 240 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('privacy_search_placeholder' as any)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="tabs" style={{ display: 'inline-flex' }}>
          {[
            { id: 'all', label: `${t('filter_all')} (${settings.length})` },
            { id: 'enabled', label: `${t('filter_enabled')} (${enabledCount})` },
            { id: 'disabled', label: `${t('filter_disabled')} (${settings.length - enabledCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`tab ${filter === tab.id ? 'active' : ''}`}
              onClick={() => setFilter(tab.id as typeof filter)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Grid */}
      <div className="card-grid">
        {filteredSettings.map((setting) => (
          <PrivacyCard
            key={setting.id}
            setting={setting}
            onToggle={handleToggle}
            isProcessing={processing[setting.id] || applyingAll}
          />
        ))}
      </div>

      {filteredSettings.length === 0 && (
        <div className="empty-state">
          <EyeOff className="empty-state-icon" />
          <h3 className="empty-state-title">{t('privacy_empty_title')}</h3>
          <p className="empty-state-description">
            {t('privacy_empty_desc')}
          </p>
        </div>
      )}
    </div>
  );
}

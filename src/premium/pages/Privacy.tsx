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
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Lock
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface PrivacyProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
  enabled: boolean;
  risk: 'low' | 'medium' | 'high';
  category: string;
}

const buildInitialSettings = (t: (key: any) => string): PrivacySetting[] => ([
  {
    id: 'telemetry',
    title: t('privacy_disable_telemetry_title'),
    description: t('privacy_disable_telemetry_desc'),
    icon: Activity,
    enabled: false,
    risk: 'high',
    category: 'data'
  },
  {
    id: 'advertising',
    title: t('privacy_disable_ad_id_title'),
    description: t('privacy_disable_ad_id_desc'),
    icon: Eye,
    enabled: true,
    risk: 'medium',
    category: 'data'
  },
  {
    id: 'location',
    title: t('privacy_disable_location_title'),
    description: t('privacy_disable_location_desc'),
    icon: MapPin,
    enabled: false,
    risk: 'medium',
    category: 'sensors'
  },
  {
    id: 'camera',
    title: t('privacy_block_camera_title'),
    description: t('privacy_block_camera_desc'),
    icon: Camera,
    enabled: false,
    risk: 'low',
    category: 'sensors'
  },
  {
    id: 'microphone',
    title: t('privacy_block_microphone_title'),
    description: t('privacy_block_microphone_desc'),
    icon: Mic,
    enabled: false,
    risk: 'low',
    category: 'sensors'
  },
  {
    id: 'activity',
    title: t('privacy_disable_activity_title'),
    description: t('privacy_disable_activity_desc'),
    icon: FileText,
    enabled: true,
    risk: 'medium',
    category: 'data'
  },
  {
    id: 'cortana',
    title: t('privacy_disable_cortana_title'),
    description: t('privacy_disable_cortana_desc'),
    icon: Mic,
    enabled: true,
    risk: 'low',
    category: 'features'
  },
  {
    id: 'searchHistory',
    title: t('privacy_clear_search_title'),
    description: t('privacy_clear_search_desc'),
    icon: Search,
    enabled: false,
    risk: 'low',
    category: 'data'
  },
]);

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
  onToggle
}: {
  setting: PrivacySetting;
  onToggle: (id: string, enabled: boolean) => void;
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
        <ToggleSwitch
          checked={setting.enabled}
          onChange={(checked) => onToggle(setting.id, checked)}
        />
      </div>
    </div>
  );
};

export default function Privacy({ showToast }: PrivacyProps) {
  const { t } = useI18n();
  const [settings, setSettings] = useState(buildInitialSettings(t));
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  useEffect(() => {
    setSettings((prev) => {
      const base = buildInitialSettings(t);
      return base.map((setting) => ({
        ...setting,
        enabled: prev.find((p) => p.id === setting.id)?.enabled ?? setting.enabled
      }));
    });
  }, [t]);

  const handleToggle = (id: string, enabled: boolean) => {
    setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled } : s));
    const setting = settings.find(s => s.id === id);
    if (setting) {
      showToast(
        'success',
        enabled ? t('privacy_setting_enabled') : t('privacy_setting_disabled'),
        `${setting.title} ${enabled ? t('privacy_enabled_suffix') : t('privacy_disabled_suffix')}`
      );
    }
  };

  const handleApplyAll = () => {
    setSettings(prev => prev.map(s => ({ ...s, enabled: true })));
    showToast('success', t('privacy_apply_all_title'), t('privacy_apply_all_desc'));
  };

  const handleResetAll = () => {
    setSettings(buildInitialSettings(t));
    showToast('info', t('privacy_reset_title'), t('privacy_reset_desc'));
  };

  const enabledCount = settings.filter(s => s.enabled).length;
  const filteredSettings = settings.filter(s => {
    if (filter === 'enabled') return s.enabled;
    if (filter === 'disabled') return !s.enabled;
    return true;
  });

  const categories = ['data', 'sensors', 'features'];

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
          <button className="btn btn-primary" onClick={handleApplyAll}>
            <Shield size={16} />
            {t('apply_all')}
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

      {/* Filter Tabs */}
      <div className="tabs mb-lg" style={{ display: 'inline-flex' }}>
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

      {/* Settings Grid */}
      <div className="card-grid">
        {filteredSettings.map((setting) => (
          <PrivacyCard
            key={setting.id}
            setting={setting}
            onToggle={handleToggle}
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

import { useState } from 'react';
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
  icon: React.ComponentType<{ size?: number }>;
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
      <Icon size={18} style={{ color, opacity: 0.7 }} />
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('success', t('network_scan_complete'), t('network_scan_msg'));
    }, 1000);
  };

  const handleAction = (title: string, message: string) => {
    showToast('info', title, message);
    setTimeout(() => {
      showToast('success', `${title} ${t('complete')}`, t('network_settings_applied'));
    }, 1200);
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
          <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
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
            <button className="btn btn-primary" onClick={() => handleAction(t('network_dns_flush'), t('network_dns_msg'))}>
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
            <button className="btn btn-secondary" onClick={() => handleAction(t('network_adapter_reset'), t('network_adapter_msg'))}>
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
            <button className="btn btn-primary" onClick={() => handleAction(t('network_qos'), t('network_qos_msg'))}>
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
            <button className="btn btn-secondary" onClick={() => handleAction(t('network_gateway'), t('network_gateway_msg'))}>
              {t('network_trace_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

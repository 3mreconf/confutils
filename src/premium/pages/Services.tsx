import { useState, useMemo, useEffect } from 'react';
import {
  Server,
  Play,
  Square,
  RotateCcw,
  Search,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  Database,
  Wifi,
  Monitor,
  RefreshCw
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import { servicesCatalog } from '../data/services_catalog';

interface ServicesProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  externalQuery?: string;
}

interface Service {
  id: string;
  name: string;
  displayName: string;
  description: string;
  status: 'running' | 'stopped' | 'paused';
  startupType: 'automatic' | 'manual' | 'disabled';
  category: 'system' | 'network' | 'security' | 'application';
  canDisable: boolean;
}

const buildServices = (t: (key: any) => string): Service[] =>
  servicesCatalog.map((service) => ({
    id: service.id,
    name: service.name,
    displayName: t(service.displayNameKey as any),
    description: t(service.descriptionKey as any),
    status: service.status,
    startupType: service.startupType,
    category: service.category,
    canDisable: service.canDisable
  }));

const categoryIcons: Record<string, any> = {
  system: Monitor,
  network: Wifi,
  security: Shield,
  application: Database
};

const ServiceRow = ({
  service,
  onStart,
  onStop,
  onRestart,
  onChangeStartup,
  isProcessing = false
}: {
  service: Service;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onChangeStartup: (type: Service['startupType']) => void;
  isProcessing?: boolean;
}) => {
  const { t } = useI18n();
  const [showDropdown, setShowDropdown] = useState(false);
  const CategoryIcon = categoryIcons[service.category];

  const categoryLabels: Record<Service['category'], string> = {
    system: t('category_system'),
    network: t('category_network'),
    security: t('category_security'),
    application: t('category_application')
  };

  const startupLabels: Record<Service['startupType'], string> = {
    automatic: t('startup_automatic'),
    manual: t('startup_manual'),
    disabled: t('startup_disabled')
  };

  const statusColors = {
    running: { bg: 'var(--success-bg)', color: 'var(--success)', icon: CheckCircle },
    stopped: { bg: 'var(--danger-bg)', color: 'var(--danger)', icon: AlertCircle },
    paused: { bg: 'var(--warning-bg)', color: 'var(--warning)', icon: Clock }
  };

  const status = statusColors[service.status];
  const StatusIcon = status.icon;

  return (
    <div className="list-item" style={{ padding: 'var(--space-md) var(--space-lg)' }}>
      <div
        className="list-item-icon"
        style={{
          background: status.bg,
          color: status.color
        }}
      >
        <StatusIcon size={16} />
      </div>

      <div className="list-item-content" style={{ flex: 2 }}>
        <div className="list-item-title">{service.displayName}</div>
        <div className="list-item-subtitle">{service.description}</div>
      </div>

      <div style={{ width: 100 }}>
        <div className="flex items-center gap-sm">
          <CategoryIcon size={14} color="var(--text-50)" />
          <span className="text-muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}>
            {categoryLabels[service.category]}
          </span>
        </div>
      </div>

      <div style={{ width: 120, position: 'relative' }}>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', justifyContent: 'space-between', fontSize: 'var(--text-xs)' }}
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={!service.canDisable}
        >
          <span style={{ textTransform: 'capitalize' }}>{startupLabels[service.startupType]}</span>
          <ChevronDown size={14} />
        </button>
        {showDropdown && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              onClick={() => setShowDropdown(false)}
            />
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: 'var(--elevated)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                zIndex: 20
              }}
            >
              {(['automatic', 'manual', 'disabled'] as const).map((type) => (
                <button
                  key={type}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: 'var(--space-sm) var(--space-md)',
                    textAlign: 'left',
                    background: service.startupType === type ? 'var(--cyan-15)' : 'transparent',
                    border: 'none',
                    color: 'var(--text-90)',
                    fontSize: 'var(--text-xs)',
                    textTransform: 'capitalize',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    onChangeStartup(type);
                    setShowDropdown(false);
                  }}
                >
                  {startupLabels[type]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex gap-sm">
        <button
          className="btn btn-icon"
          onClick={onStart}
          disabled={service.status === 'running' || isProcessing}
          title={t('start')}
        >
          {isProcessing ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
        </button>
        <button
          className="btn btn-icon"
          onClick={onStop}
          disabled={service.status === 'stopped' || !service.canDisable || isProcessing}
          title={t('stop')}
        >
          <Square size={14} />
        </button>
        <button
          className="btn btn-icon"
          onClick={onRestart}
          disabled={service.status === 'stopped' || isProcessing}
          title={t('restart')}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

export default function Services({ showToast, externalQuery }: ServicesProps) {
  const { t } = useI18n();
  const [services, setServices] = useState(buildServices(t));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setServices((prev) => {
      const base = buildServices(t);
      return base.map((service) => {
        const existing = prev.find((p) => p.id === service.id);
        return existing ? {
          ...service,
          status: existing.status,
          startupType: existing.startupType,
          canDisable: existing.canDisable
        } : service;
      });
    });
  }, [t]);

  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setSearchQuery(externalQuery);
    }
  }, [externalQuery]);

  const loadServiceStates = async () => {
    setIsRefreshing(true);
    try {
      const result = await invoke('run_powershell', {
        command: `
          $services = Get-CimInstance Win32_Service | Select-Object Name, State, StartMode
          $services | ConvertTo-Json -Compress
        `
      }) as string;

      const parsed = result && result.trim() ? JSON.parse(result) : [];
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const map = new Map<string, { State: string; StartMode: string }>();
      list.forEach((svc: { Name: string; State: string; StartMode: string }) => {
        map.set(svc.Name, { State: svc.State, StartMode: svc.StartMode });
      });

      setServices(prev => prev.map((svc) => {
        const match = map.get(svc.name);
        if (!match) return svc;
        const status = match.State?.toLowerCase() === 'running' ? 'running'
          : match.State?.toLowerCase() === 'paused' ? 'paused'
            : 'stopped';
        const startupType = match.StartMode?.toLowerCase() === 'auto' ? 'automatic'
          : match.StartMode?.toLowerCase() === 'manual' ? 'manual'
            : 'disabled';
        return { ...svc, status, startupType };
      }));
    } catch (error) {
      showToast('error', t('service_error'), String(error));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadServiceStates();
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter(service => {
      const matchesSearch = service.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [services, searchQuery, statusFilter, categoryFilter]);

  const stats = useMemo(() => ({
    running: services.filter(s => s.status === 'running').length,
    stopped: services.filter(s => s.status === 'stopped').length,
    total: services.length
  }), [services]);

  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const handleStart = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;

    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      await invoke('run_powershell', { command: `Start-Service -Name "${service.name}" -ErrorAction Stop` });
      await loadServiceStates();
      showToast('success', t('service_started'), `${service.displayName} ${t('service_now_running')}`);
    } catch (error) {
      const msg = String(error);
      showToast('error', t('service_error'), msg.includes('Access is denied') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleStop = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;

    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      await invoke('run_powershell', { command: `Stop-Service -Name "${service.name}" -Force -ErrorAction Stop` });
      await loadServiceStates();
      showToast('info', t('service_stopped'), `${service.displayName} ${t('service_has_been_stopped')}`);
    } catch (error) {
      const msg = String(error);
      showToast('error', t('service_error'), msg.includes('Access is denied') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRestart = async (id: string) => {
    const service = services.find(s => s.id === id);
    if (!service) return;

    setProcessing(prev => ({ ...prev, [id]: true }));
    showToast('info', t('service_restarting'), `${service.displayName} ${t('service_is_restarting')}`);
    try {
      await invoke('run_powershell', { command: `Restart-Service -Name "${service.name}" -Force -ErrorAction Stop` });
      await loadServiceStates();
      showToast('success', t('service_restarted'), `${service.displayName} ${t('service_has_been_restarted')}`);
    } catch (error) {
      const msg = String(error);
      showToast('error', t('service_error'), msg.includes('Access is denied') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleChangeStartup = async (id: string, type: Service['startupType']) => {
    const service = services.find(s => s.id === id);
    if (!service) return;

    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      const startupMap = { automatic: 'Automatic', manual: 'Manual', disabled: 'Disabled' };
      await invoke('run_powershell', { command: `Set-Service -Name "${service.name}" -StartupType ${startupMap[type]} -ErrorAction Stop` });
      await loadServiceStates();
      showToast('success', t('startup_changed'), `${service.displayName} ${t('startup_set_to')} ${type}`);
    } catch (error) {
      const msg = String(error);
      showToast('error', t('service_error'), msg.includes('Access is denied') ? t('tweak_admin_required') : msg);
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('services_title')}
          </h2>
          <p className="text-muted mt-sm">
            {t('services_subtitle')}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={loadServiceStates} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? 'spin' : ''} />
          {isRefreshing ? t('scanning') : t('refresh')}
        </button>
      </div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)'
        }}
      >
        {[
          { label: t('running'), value: stats.running, color: 'var(--success)', icon: CheckCircle },
          { label: t('stopped'), value: stats.stopped, color: 'var(--danger)', icon: AlertCircle },
          { label: t('total'), value: stats.total, color: 'var(--cyan)', icon: Server }
        ].map((stat) => (
          <div key={stat.label} className="control-card" style={{ padding: 'var(--space-lg)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{stat.label}</div>
                <div className="font-mono" style={{ fontSize: 'var(--text-2xl)', color: stat.color }}>
                  {stat.value}
                </div>
              </div>
              <stat.icon size={24} color={stat.color} className="opacity-50" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-md mb-lg">
        <div className="search-input" style={{ flex: 1 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('services_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tabs">
          {['all', 'running', 'stopped'].map((status) => (
            <button
              key={status}
              className={`tab ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status as typeof statusFilter)}
            >
              {status === 'all' ? t('filter_all') : status === 'running' ? t('running') : t('stopped')}
            </button>
          ))}
        </div>

        <select
          className="input"
          style={{ width: 'auto' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">{t('all_categories')}</option>
          <option value="system">{t('category_system')}</option>
          <option value="network">{t('category_network')}</option>
          <option value="security">{t('category_security')}</option>
          <option value="application">{t('category_application')}</option>
        </select>
      </div>

      {/* Services List */}
      <div className="list-container">
        <div className="list-header">
          <span className="list-title">{t('services_list_title')}</span>
          <span className="list-count">{filteredServices.length} {t('services_count')}</span>
        </div>
        {filteredServices.map((service) => (
          <ServiceRow
            key={service.id}
            service={service}
            onStart={() => handleStart(service.id)}
            onStop={() => handleStop(service.id)}
            onRestart={() => handleRestart(service.id)}
            onChangeStartup={(type) => handleChangeStartup(service.id, type)}
            isProcessing={processing[service.id]}
          />
        ))}
        {filteredServices.length === 0 && (
          <div className="empty-state">
            <Server className="empty-state-icon" />
            <h3 className="empty-state-title">{t('services_empty_title')}</h3>
            <p className="empty-state-description">
              {t('services_empty_desc')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

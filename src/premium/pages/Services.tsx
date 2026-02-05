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
  Monitor
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface ServicesProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
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

const buildServices = (t: (key: any) => string): Service[] => ([
  {
    id: 'wuauserv',
    name: 'wuauserv',
    displayName: t('service_windows_update'),
    description: t('service_windows_update_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'system',
    canDisable: true
  },
  {
    id: 'bits',
    name: 'BITS',
    displayName: t('service_bits'),
    description: t('service_bits_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'network',
    canDisable: true
  },
  {
    id: 'wdefend',
    name: 'WinDefend',
    displayName: t('service_defender'),
    description: t('service_defender_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'security',
    canDisable: false
  },
  {
    id: 'spooler',
    name: 'Spooler',
    displayName: t('service_spooler'),
    description: t('service_spooler_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'application',
    canDisable: true
  },
  {
    id: 'wsearch',
    name: 'WSearch',
    displayName: t('service_windows_search'),
    description: t('service_windows_search_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'system',
    canDisable: true
  },
  {
    id: 'diagtrack',
    name: 'DiagTrack',
    displayName: t('service_diagtrack'),
    description: t('service_diagtrack_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'system',
    canDisable: true
  },
  {
    id: 'sysmain',
    name: 'SysMain',
    displayName: t('service_sysmain'),
    description: t('service_sysmain_desc'),
    status: 'stopped',
    startupType: 'disabled',
    category: 'system',
    canDisable: true
  },
  {
    id: 'fax',
    name: 'Fax',
    displayName: t('service_fax'),
    description: t('service_fax_desc'),
    status: 'stopped',
    startupType: 'manual',
    category: 'application',
    canDisable: true
  },
  {
    id: 'remoteregistry',
    name: 'RemoteRegistry',
    displayName: t('service_remote_registry'),
    description: t('service_remote_registry_desc'),
    status: 'stopped',
    startupType: 'disabled',
    category: 'security',
    canDisable: true
  },
  {
    id: 'dhcp',
    name: 'Dhcp',
    displayName: t('service_dhcp'),
    description: t('service_dhcp_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'network',
    canDisable: false
  },
  {
    id: 'dnscache',
    name: 'Dnscache',
    displayName: t('service_dns_client'),
    description: t('service_dns_client_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'network',
    canDisable: false
  },
  {
    id: 'themes',
    name: 'Themes',
    displayName: t('service_themes'),
    description: t('service_themes_desc'),
    status: 'running',
    startupType: 'automatic',
    category: 'application',
    canDisable: true
  },
]);

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
  onChangeStartup
}: {
  service: Service;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onChangeStartup: (type: Service['startupType']) => void;
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
          disabled={service.status === 'running'}
          title={t('start')}
        >
          <Play size={14} />
        </button>
        <button
          className="btn btn-icon"
          onClick={onStop}
          disabled={service.status === 'stopped' || !service.canDisable}
          title={t('stop')}
        >
          <Square size={14} />
        </button>
        <button
          className="btn btn-icon"
          onClick={onRestart}
          disabled={service.status === 'stopped'}
          title={t('restart')}
        >
          <RotateCcw size={14} />
        </button>
      </div>
    </div>
  );
};

export default function Services({ showToast }: ServicesProps) {
  const { t } = useI18n();
  const [services, setServices] = useState(buildServices(t));
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

  const handleStart = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'running' as const } : s));
    const service = services.find(s => s.id === id);
    showToast('success', t('service_started'), `${service?.displayName} ${t('service_now_running')}`);
  };

  const handleStop = (id: string) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, status: 'stopped' as const } : s));
    const service = services.find(s => s.id === id);
    showToast('info', t('service_stopped'), `${service?.displayName} ${t('service_has_been_stopped')}`);
  };

  const handleRestart = (id: string) => {
    const service = services.find(s => s.id === id);
    showToast('info', t('service_restarting'), `${service?.displayName} ${t('service_is_restarting')}`);
    setTimeout(() => {
      showToast('success', t('service_restarted'), `${service?.displayName} ${t('service_has_been_restarted')}`);
    }, 1500);
  };

  const handleChangeStartup = (id: string, type: Service['startupType']) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, startupType: type } : s));
    const service = services.find(s => s.id === id);
    showToast('success', t('startup_changed'), `${service?.displayName} ${t('startup_set_to')} ${type}`);
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

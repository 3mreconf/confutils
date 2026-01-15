import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Play, Square, Search, RefreshCw, Info, AlertCircle, Loader2 } from 'lucide-react';
import { startService, stopService, listServices, getServiceDetails, setServiceStartupType, restartService } from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FullScreenModal } from '../components/UI/FullScreenModal';
import { handleOperationError } from '../utils/errorHandler';
import './Services.css';

interface Service {
  Name: string;
  DisplayName: string;
  Status: string;
  StartType?: string;
}

interface ServiceDetails {
  Name: string;
  DisplayName: string;
  Status: string;
  StartType: string;
  ServiceName: string;
  RequiredServices?: Array<{ Name: string }>;
  DependentServices?: Array<{ Name: string }>;
  Error?: string;
}

const Services: React.FC = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'stopped' | 'disabled'>('all');
  const [selectedService, setSelectedService] = useState<ServiceDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listServices();
      if (!result || result.trim() === '' || result.trim() === 'null') {
        setServices([]);
        return;
      }
      try {
        const parsedServices: Service[] = JSON.parse(result);
        if (Array.isArray(parsedServices)) {
          setServices(parsedServices);
        } else if (parsedServices && typeof parsedServices === 'object') {
          setServices([parsedServices as Service]);
        } else {
          setServices([]);
        }
      } catch (parseError) {
        console.warn('Failed to parse services list:', parseError);
        setServices([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('PowerShell')) {
        setServices([]);
      } else {
        console.warn('Services list load error:', errorMsg);
        setServices([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = useMemo(() => {
    let filtered = services;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service =>
        service.Name.toLowerCase().includes(query) ||
        service.DisplayName.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(service => {
        const status = service.Status?.toString().trim() || '';
        const startType = service.StartType?.toString().trim() || '';
        
        if (statusFilter === 'running') {
          return status === 'Running' || status === '1';
        }
        if (statusFilter === 'stopped') {
          return status === 'Stopped' || status === '0';
        }
        if (statusFilter === 'disabled') {
          return startType === 'Disabled' || startType === '4' || startType === 'disabled';
        }
        return true;
      });
    }

    return filtered;
  }, [searchQuery, statusFilter, services]);

  const handleServiceToggle = async (serviceName: string, enabled: boolean) => {
    try {
      if (enabled) {
        const service = services.find(s => s.Name === serviceName);
        if (service && (service.StartType === 'Disabled' || service.StartType?.toLowerCase() === 'disabled')) {
          await setServiceStartupType(serviceName, 'Manual');
          showNotification('info', t('startup_type_changed') || 'Startup Type Changed', t('service_enabled_for_start') || 'Service enabled, starting...');
        }
        await startService(serviceName);
        showNotification('success', t('service_started'), `${serviceName} ${t('service_started_successfully')}`);
      } else {
        await stopService(serviceName);
        showNotification('success', t('service_stopped'), `${serviceName} ${t('service_stopped_successfully')}`);
      }
      await fetchServices();
    } catch (error) {
      handleOperationError(
        error,
        showNotification,
        t,
        enabled 
          ? (t('service_start_error') || 'Service başlatılamadı')
          : (t('service_stop_error') || 'Service durdurulamadı')
      );
    }
  };

  const handleRestartService = async (serviceName: string) => {
    try {
      await restartService(serviceName);
      showNotification('success', t('success'), `${serviceName} ${t('service_restarted') || 'restarted'}`);
      await fetchServices();
    } catch (error) {
      handleOperationError(error, showNotification, t, t('service_restart_error') || 'Service yeniden başlatılamadı');
    }
  };

  const handleViewDetails = async (service: Service) => {
    try {
      const result = await getServiceDetails(service.Name);
      if (!result || result.trim() === '') {
        showNotification('error', t('error'), t('service_details_error') || 'Service detayları alınamadı');
        return;
      }
      try {
        const details: ServiceDetails = JSON.parse(result);
        if (details.Error) {
          showNotification('error', t('error'), details.Error);
          return;
        }
        setSelectedService(details);
        setShowDetails(true);
      } catch (parseError) {
        console.warn('Failed to parse service details:', parseError);
        showNotification('error', t('error'), t('service_details_parse_error') || 'Service detayları parse edilemedi.');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        showNotification('error', t('error'), t('service_not_found') || 'Service bulunamadı');
      } else {
        showNotification('error', t('error'), errorMsg || t('service_details_error') || 'Service detayları alınamadı');
      }
    }
  };

  const handleChangeStartupType = async (serviceName: string, startupType: string) => {
    try {
      await setServiceStartupType(serviceName, startupType);
      showNotification('success', t('success'), `${t('startup_type_changed') || 'Startup type changed'}`);
      await fetchServices();
      if (selectedService && selectedService.Name === serviceName) {
        try {
          const result = await getServiceDetails(serviceName);
          const details: ServiceDetails = JSON.parse(result);
          setSelectedService(details);
        } catch (detailsError) {
          console.error('Failed to refresh service details:', detailsError);
        }
      }
    } catch (error) {
      handleOperationError(error, showNotification, t, t('startup_type_change_error') || 'Startup type değiştirilemedi');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Running': return 'var(--status-success)';
      case 'Stopped': return 'var(--status-error)';
      case 'StartPending': return 'var(--status-warning)';
      case 'StopPending': return 'var(--status-warning)';
      default: return 'var(--text-muted)';
    }
  };

  const getStartupTypeColor = (startType?: string) => {
    switch (startType) {
      case 'Automatic': return 'var(--status-success)';
      case 'Manual': return 'var(--status-warning)';
      case 'Disabled': return 'var(--status-error)';
      default: return 'var(--text-muted)';
    }
  };

  const runningCount = services.filter(s => {
    const status = (s.Status || '').toString().trim();
    return status === 'Running' || status === '1';
  }).length;
  const stoppedCount = services.filter(s => {
    const status = (s.Status || '').toString().trim();
    return status === 'Stopped' || status === '0';
  }).length;
  const disabledCount = services.filter(s => {
    const startType = (s.StartType || '').toString().trim();
    return startType === 'Disabled' || startType === '4' || startType.toLowerCase() === 'disabled';
  }).length;

  return (
    <div className="page-container services-page">
      <div className="page-header">
        <h2 className="page-title">{t('windows_services_title')}</h2>
        <p className="page-description">{t('windows_services_description')}</p>
      </div>

      <div className="services-stats">
        <div className="stat-card">
          <div className="stat-value">{services.length}</div>
          <div className="stat-label">{t('total_services') || 'Total Services'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--status-success)' }}>{runningCount}</div>
          <div className="stat-label">{t('running_services') || 'Running'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--status-error)' }}>{stoppedCount}</div>
          <div className="stat-label">{t('stopped_services') || 'Stopped'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--status-warning)' }}>{disabledCount}</div>
          <div className="stat-label">{t('disabled_services') || 'Disabled'}</div>
        </div>
      </div>

      <div className="services-controls">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder={t('search_services') || 'Search services...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            {t('all') || 'All'}
          </button>
          <button
            className={`filter-btn ${statusFilter === 'running' ? 'active' : ''}`}
            onClick={() => setStatusFilter('running')}
          >
            {t('running') || 'Running'}
          </button>
          <button
            className={`filter-btn ${statusFilter === 'stopped' ? 'active' : ''}`}
            onClick={() => setStatusFilter('stopped')}
          >
            {t('stopped') || 'Stopped'}
          </button>
          <button
            className={`filter-btn ${statusFilter === 'disabled' ? 'active' : ''}`}
            onClick={() => setStatusFilter('disabled')}
          >
            {t('disabled') || 'Disabled'}
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchServices} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spinning' : ''} />
          {t('refresh') || 'Refresh'}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <Loader2 size={32} />
          <p>{t('loading_services') || 'Loading services...'}</p>
        </div>
      ) : (
        <div className="services-list">
          {filteredServices.length === 0 ? (
            <div className="empty-state">
              <AlertCircle size={48} />
              <p>{t('no_services_found') || 'No services found'}</p>
            </div>
          ) : (
            filteredServices.map((service) => (
              <div key={service.Name} className="service-item">
                <div className="service-info">
                  <div className="service-name-row">
                    <h3 className="service-name">{service.DisplayName}</h3>
                    <span className="service-status" style={{ color: getStatusColor(service.Status) }}>
                      {service.Status}
                    </span>
                  </div>
                  <p className="service-id">{service.Name}</p>
                  {service.StartType && (
                    <span className="service-startup" style={{ color: getStartupTypeColor(service.StartType) }}>
                      {service.StartType}
                    </span>
                  )}
                </div>
                <div className="service-actions">
                  <button
                    className="action-btn info-btn"
                    onClick={() => handleViewDetails(service)}
                    title={t('view_details') || 'View Details'}
                  >
                    <Info size={16} />
                  </button>
                  {service.Status === 'Running' ? (
                    <button
                      className="action-btn stop-btn"
                      onClick={() => handleServiceToggle(service.Name, false)}
                      title={t('stop_service') || 'Stop Service'}
                    >
                      <Square size={16} />
                    </button>
                  ) : (
                    <button
                      className="action-btn start-btn"
                      onClick={() => handleServiceToggle(service.Name, true)}
                      title={t('start_service') || 'Start Service'}
                    >
                      <Play size={16} />
                    </button>
                  )}
                  {service.Status === 'Running' && (
                    <button
                      className="action-btn restart-btn"
                      onClick={() => handleRestartService(service.Name)}
                      title={t('restart_service') || 'Restart Service'}
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showDetails && selectedService && (
        <FullScreenModal
          title={selectedService.DisplayName}
          description={selectedService.Name}
          onClose={() => {
            setShowDetails(false);
            setSelectedService(null);
          }}
        >
          <div className="service-details">
            <div className="detail-section">
              <h3>{t('service_information') || 'Service Information'}</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">{t('name') || 'Name'}:</span>
                  <span className="detail-value">{selectedService.DisplayName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('service_name') || 'Service Name'}:</span>
                  <span className="detail-value">{selectedService.ServiceName}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('status') || 'Status'}:</span>
                  <span className="detail-value" style={{ color: getStatusColor(selectedService.Status) }}>
                    {selectedService.Status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">{t('startup_type') || 'Startup Type'}:</span>
                  <div className="startup-type-control">
                    <select
                      value={selectedService.StartType}
                      onChange={(e) => handleChangeStartupType(selectedService.Name, e.target.value)}
                      className="startup-select"
                    >
                      <option value="Automatic">Automatic</option>
                      <option value="Manual">Manual</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {selectedService.RequiredServices && selectedService.RequiredServices.length > 0 && (
              <div className="detail-section">
                <h3>{t('required_services') || 'Required Services'}</h3>
                <div className="services-list-mini">
                  {selectedService.RequiredServices.map((req, idx) => (
                    <div key={idx} className="service-tag">{req.Name}</div>
                  ))}
                </div>
              </div>
            )}

            {selectedService.DependentServices && selectedService.DependentServices.length > 0 && (
              <div className="detail-section">
                <h3>{t('dependent_services') || 'Dependent Services'}</h3>
                <div className="services-list-mini">
                  {selectedService.DependentServices.map((dep, idx) => (
                    <div key={idx} className="service-tag">{dep.Name}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-actions">
              {selectedService.Status === 'Running' ? (
                <>
                  <button
                    className="action-button danger"
                    onClick={() => {
                      handleServiceToggle(selectedService.Name, false);
                      setShowDetails(false);
                    }}
                  >
                    <Square size={18} />
                    {t('stop_service') || 'Stop Service'}
                  </button>
                  <button
                    className="action-button warning"
                    onClick={() => {
                      handleRestartService(selectedService.Name);
                      setShowDetails(false);
                    }}
                  >
                    <RefreshCw size={18} />
                    {t('restart_service') || 'Restart Service'}
                  </button>
                </>
              ) : (
                <button
                  className="action-button success"
                  onClick={() => {
                    handleServiceToggle(selectedService.Name, true);
                    setShowDetails(false);
                  }}
                >
                  <Play size={18} />
                  {t('start_service') || 'Start Service'}
                </button>
              )}
            </div>
          </div>
        </FullScreenModal>
      )}
    </div>
  );
};

export default Services;

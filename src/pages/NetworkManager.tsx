import React, { useState, useEffect, useCallback } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Wifi, Shield, RefreshCw, Globe, Router, Activity, X, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { listNetworkAdapters, getFirewallStatus, getActiveConnections, disconnectNetwork, getRouterInfo, flushDnsCache } from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { handleOperationError } from '../utils/errorHandler';
import './NetworkManager.css';

interface NetworkAdapter {
  Name: string;
  Status: string;
  MacAddress: string;
  LinkSpeed?: string;
}

interface FirewallProfile {
  Name: string;
  Enabled: boolean;
}

interface ActiveConnection {
  name: string;
  type: string;
  status: string;
}

interface RouterInfo {
  gateway?: string;
  ip?: string;
  subnet?: string;
}

const NetworkManager: React.FC = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const [adapters, setAdapters] = useState<NetworkAdapter[]>([]);
  const [firewallProfiles, setFirewallProfiles] = useState<FirewallProfile[]>([]);
  const [activeConnections, setActiveConnections] = useState<ActiveConnection[]>([]);
  const [routerInfo, setRouterInfo] = useState<RouterInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'adapters' | 'firewall' | 'dns' | 'connections'>('adapters');

  const fetchAdapters = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listNetworkAdapters();
      if (!result || result.trim() === '') {
        setAdapters([]);
        return;
      }
      try {
        const parsed: NetworkAdapter[] = JSON.parse(result);
        setAdapters(Array.isArray(parsed) ? parsed : [parsed]);
      } catch (parseError) {
        console.warn('Failed to parse network adapters:', parseError);
        setAdapters([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('PowerShell') || errorMsg.includes('Get-NetAdapter')) {
        setAdapters([]);
      } else {
        console.warn('Network adapters load error:', errorMsg);
        setAdapters([]);
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification, t]);

  const fetchFirewallStatus = useCallback(async () => {
    try {
      const result = await getFirewallStatus();
      if (!result || result.trim() === '') {
        setFirewallProfiles([]);
        return;
      }
      try {
        const parsed = JSON.parse(result);
        if (parsed.Domain !== undefined || parsed.Private !== undefined || parsed.Public !== undefined) {
          setFirewallProfiles([
            { Name: 'Domain', Enabled: parsed.Domain || false },
            { Name: 'Private', Enabled: parsed.Private || false },
            { Name: 'Public', Enabled: parsed.Public || false }
          ]);
        } else {
          setFirewallProfiles(Array.isArray(parsed) ? parsed : [parsed]);
        }
      } catch (parseError) {
        console.warn('Failed to parse firewall status:', parseError);
        setFirewallProfiles([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('PowerShell') || errorMsg.includes('Get-NetFirewallProfile')) {
        setFirewallProfiles([]);
      } else {
        console.warn('Firewall status load error:', errorMsg);
        setFirewallProfiles([]);
      }
    }
  }, [showNotification, t]);

  const fetchActiveConnections = useCallback(async () => {
    try {
      const result = await getActiveConnections();
      
      if (!result || result.trim().length === 0) {
        setActiveConnections([]);
        return;
      }
      
      try {
        const parsed: ActiveConnection[] = JSON.parse(result);
        setActiveConnections(Array.isArray(parsed) ? parsed : []);
      } catch (parseError) {
        console.warn('Failed to parse active connections JSON:', parseError, 'Raw result:', result);
        setActiveConnections([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found') || errorMsg.includes('JSON')) {
        setActiveConnections([]);
      } else {
        handleOperationError(error, showNotification, t, t('active_connections_load_error') || 'Aktif bağlantılar yüklenemedi');
      }
    }
  }, [showNotification, t]);

  const fetchRouterInfo = useCallback(async () => {
    try {
      const result = await getRouterInfo();
      const parsed: RouterInfo = JSON.parse(result);
      setRouterInfo(parsed);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        setRouterInfo(null);
      } else {
        handleOperationError(error, showNotification, t, t('router_info_load_error') || 'Router bilgisi yüklenemedi');
      }
    }
  }, [showNotification, t]);

  useEffect(() => {
    fetchAdapters();
    fetchFirewallStatus();
    fetchActiveConnections();
    fetchRouterInfo();
  }, [fetchAdapters, fetchFirewallStatus, fetchActiveConnections, fetchRouterInfo]);

  const handleSetDns = async (dnsType: string) => {
    try {
      const result = await invoke<string>('set_dns', { dnsType });
      showNotification('success', t('success'), result);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      showNotification('error', t('error'), errorMsg || t('dns_set_error') || 'DNS ayarlanamadı');
    }
  };

  const handleDisconnect = async (connectionName: string, connectionType: string) => {
    if (!confirm(t('disconnect_confirm') || `Disconnect ${connectionName}?`)) {
      return;
    }
    try {
      const result = await disconnectNetwork(connectionName, connectionType);
      showNotification('success', t('success'), result);
      await fetchActiveConnections();
    } catch (error) {
      handleOperationError(error, showNotification, t, t('disconnect_network_error') || 'Bağlantı kesilemedi');
    }
  };

  const handleFlushDns = async () => {
    try {
      const result = await flushDnsCache();
      showNotification('success', t('success'), result);
    } catch (error) {
      handleOperationError(error, showNotification, t, t('dns_flush_error') || 'DNS önbelleği temizlenemedi');
    }
  };

  return (
    <div className="page-container network-manager-page">
      <div className="page-header">
        <h2 className="page-title">{t('network_manager_title') || 'Network Manager'}</h2>
        <p className="page-description">{t('network_manager_description') || 'Manage network adapters, firewall, DNS, and connections'}</p>
      </div>

      <div className="network-tabs">
        <button
          className={`tab-btn ${activeTab === 'adapters' ? 'active' : ''}`}
          onClick={() => setActiveTab('adapters')}
        >
          <Wifi size={18} />
          {t('network_adapters') || 'Adapters'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'firewall' ? 'active' : ''}`}
          onClick={() => setActiveTab('firewall')}
        >
          <Shield size={18} />
          {t('firewall') || 'Firewall'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'dns' ? 'active' : ''}`}
          onClick={() => setActiveTab('dns')}
        >
          <Globe size={18} />
          {t('dns') || 'DNS'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          <Activity size={18} />
          {t('connections') || 'Connections'}
        </button>
      </div>

      {activeTab === 'adapters' && (
        <div className="network-tab-content">
          <div className="network-controls">
            <button className="refresh-btn" onClick={fetchAdapters} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <Loader2 size={32} />
              <p>{t('loading_adapters') || 'Loading adapters...'}</p>
            </div>
          ) : (
            <div className="adapters-list">
              {adapters.length === 0 ? (
                <div className="empty-state">
                  <Wifi size={48} />
                  <p>{t('no_adapters_found') || 'No network adapters found'}</p>
                </div>
              ) : (
                adapters.map((adapter, idx) => (
                  <div key={idx} className="adapter-item">
                    <div className="adapter-info">
                      <h4 className="adapter-name">{adapter.Name}</h4>
                      <div className="adapter-details">
                        <span className={`adapter-status ${adapter.Status === 'Up' ? 'up' : 'down'}`}>
                          {adapter.Status}
                        </span>
                        {adapter.LinkSpeed && (
                          <span className="adapter-speed">{adapter.LinkSpeed}</span>
                        )}
                        {adapter.MacAddress && (
                          <span className="adapter-mac">MAC: {adapter.MacAddress}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {routerInfo && (
            <div className="router-info-card">
              <div className="info-header">
                <Router size={20} />
                <span>{t('router_info') || 'Router Information'}</span>
              </div>
              <div className="router-details">
                {routerInfo.gateway && (
                  <div className="router-item">
                    <span className="router-label">{t('gateway') || 'Gateway'}:</span>
                    <span className="router-value">{routerInfo.gateway}</span>
                  </div>
                )}
                {routerInfo.ip && (
                  <div className="router-item">
                    <span className="router-label">{t('ip_address') || 'IP Address'}:</span>
                    <span className="router-value">{routerInfo.ip}</span>
                  </div>
                )}
                {routerInfo.subnet && (
                  <div className="router-item">
                    <span className="router-label">{t('subnet') || 'Subnet'}:</span>
                    <span className="router-value">{routerInfo.subnet}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'firewall' && (
        <div className="network-tab-content">
          <div className="firewall-profiles">
            {firewallProfiles.length === 0 ? (
              <div className="empty-state">
                <Shield size={48} />
                <p>{t('no_firewall_profiles') || 'No firewall profiles found'}</p>
              </div>
            ) : (
              firewallProfiles.map((profile, idx) => (
                <div key={idx} className="firewall-profile-card">
                  <div className="profile-header">
                    <Shield size={20} />
                    <span className="profile-name">{profile.Name}</span>
                    <span className={`profile-status ${profile.Enabled ? 'enabled' : 'disabled'}`}>
                      {profile.Enabled ? t('enabled') || 'Enabled' : t('disabled') || 'Disabled'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'dns' && (
        <div className="network-tab-content">
          <div className="dns-section">
            <div className="dns-cards">
              <UtilityCard
                icon={Globe}
                title="Cloudflare DNS"
                description="1.1.1.1, 1.0.0.1"
                actionType="button"
                actionLabel={t('set_dns') || 'Set DNS'}
                onClick={() => handleSetDns('cloudflare')}
              />
              <UtilityCard
                icon={Globe}
                title="Google DNS"
                description="8.8.8.8, 8.8.4.4"
                actionType="button"
                actionLabel={t('set_dns') || 'Set DNS'}
                onClick={() => handleSetDns('google')}
              />
              <UtilityCard
                icon={Globe}
                title="Quad9 DNS"
                description="9.9.9.9, 149.112.112.112"
                actionType="button"
                actionLabel={t('set_dns') || 'Set DNS'}
                onClick={() => handleSetDns('quad9')}
              />
            </div>
            <div className="dns-actions">
              <UtilityCard
                icon={RefreshCw}
                title={t('flush_dns_cache_utility')}
                description={t('flush_dns_cache_description')}
                actionType="button"
                actionLabel={t('flush_dns_button')}
                onAction={handleFlushDns}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'connections' && (
        <div className="network-tab-content">
          <div className="network-controls">
            <button className="refresh-btn" onClick={fetchActiveConnections}>
              <RefreshCw size={18} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>

          <div className="connections-list">
            {activeConnections.length === 0 ? (
              <div className="empty-state">
                <Activity size={48} />
                <p>{t('no_connections_found') || 'No active connections found'}</p>
              </div>
            ) : (
              activeConnections.map((connection, idx) => (
                <div key={idx} className="connection-item">
                  <div className="connection-info">
                    <h4 className="connection-name">{connection.name}</h4>
                    <div className="connection-details">
                      <span className="connection-type">{connection.type}</span>
                      <span className={`connection-status ${connection.status === 'Connected' ? 'connected' : 'disconnected'}`}>
                        {connection.status}
                      </span>
                    </div>
                  </div>
                  {connection.status === 'Connected' && (
                    <div className="connection-actions">
                      <button
                        className="action-btn disconnect-btn"
                        onClick={() => handleDisconnect(connection.name, connection.type)}
                        title={t('disconnect') || 'Disconnect'}
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkManager;

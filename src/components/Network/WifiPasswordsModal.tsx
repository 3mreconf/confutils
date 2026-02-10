import React, { useState, useEffect } from 'react';
import { Wifi, Copy, RefreshCw, Eye, EyeOff, Network, Users, Power, Router, ExternalLink } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import './WifiPasswordsModal.css';

interface NetworkInfo {
  name: String;
  password: String;
  auth_type: String;
  connection_type: String;
  ip_address: String;
  dns_servers: String;
  gateway: String;
}

interface ConnectedDevice {
  ip_address: String;
  mac_address: String;
  device_type: String;
  hostname: String;
}

interface ActiveConnection {
  name: String;
  connection_type: String;
  status: String;
  ip_address: String;
  ssid: String;
  signal_strength: String;
}

interface RouterInfo {
  gateway_ip: String;
  router_mac: String;
  router_brand: String;
  admin_url: String;
}

export const WifiPasswordsModal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'saved' | 'devices' | 'active'>('saved');
  const [networks, setNetworks] = useState<NetworkInfo[]>([]);
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [connections, setConnections] = useState<ActiveConnection[]>([]);
  const [routerInfo, setRouterInfo] = useState<RouterInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [expandedNetworks, setExpandedNetworks] = useState<Record<string, boolean>>({});
  const { t } = useLanguage();
  const { showNotification } = useNotification();

  const fetchWifiPasswords = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('get_wifi_passwords');
      const parsed: NetworkInfo[] = JSON.parse(result);
      setNetworks(parsed);
    } catch (error) {
      console.error('Failed to get network passwords:', error);
      showNotification('error', t('error'), t('error_fetching_wifi') || 'Failed to retrieve network passwords');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedDevices = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('get_connected_devices');
      const parsed: ConnectedDevice[] = JSON.parse(result);
      setDevices(parsed);
    } catch (error) {
      console.error('Failed to get connected devices:', error);
      showNotification('error', t('error'), t('error_fetching_connected_devices'));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveConnections = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<string>('get_active_connections');
      
      if (!result || result.trim().length === 0) {
        setConnections([]);
        return;
      }
      
      try {
        const parsed: ActiveConnection[] = JSON.parse(result);
        setConnections(Array.isArray(parsed) ? parsed : []);
      } catch (parseError) {
        console.warn('Failed to parse active connections JSON:', parseError, 'Raw result:', result);
        setConnections([]);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('JSON')) {
        setConnections([]);
      } else {
        console.error('Failed to get active connections:', error);
        showNotification('error', t('error'), t('error_fetching_active_connections'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRouterInfo = async () => {
    try {
      const result = await invoke<string>('get_router_info');
      const parsed: RouterInfo = JSON.parse(result);
      setRouterInfo(parsed);
    } catch (error) {
      console.error('Failed to get router info:', error);
    }
  };

  const disconnectNetwork = async (name: string, type: string) => {
    try {
      await invoke('disconnect_network', { connectionName: name, connectionType: type });
      showNotification('success', t('success'), t('network_disconnect_success', { type }));
      fetchActiveConnections();
    } catch (error) {
      showNotification('error', t('error'), t('network_disconnect_failed', { error: String(error) }));
    }
  };

  useEffect(() => {
    fetchWifiPasswords();
    fetchRouterInfo();
  }, []);

  useEffect(() => {
    if (activeTab === 'devices') {
      fetchConnectedDevices();
    } else if (activeTab === 'active') {
      fetchActiveConnections();
    }
  }, [activeTab]);

  const copyToClipboard = (text: String) => {
    navigator.clipboard.writeText(text.toString());
    showNotification('success', t('success'), t('wifi_copy_success'));
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const toggleExpanded = (name: string) => {
    setExpandedNetworks(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  const openRouterAdmin = async (url: String) => {
    try {
      const urlString = url.toString();
      if (!urlString.startsWith('http://') && !urlString.startsWith('https://')) {
        await open(`http://${urlString}`);
      } else {
        await open(urlString);
      }
    } catch (error) {
      console.error('Failed to open router admin:', error);
      showNotification('error', t('error'), `Router arayüzü açılamadı: ${error}`);
    }
  };

  return (
    <div className="wifi-modal-content">
      <div className="wifi-header">
        <p>{t('wifi_passwords_description')}</p>
        <button className="refresh-btn" onClick={() => {
          if (activeTab === 'saved') fetchWifiPasswords();
          else if (activeTab === 'devices') fetchConnectedDevices();
          else if (activeTab === 'active') fetchActiveConnections();
        }} disabled={isLoading}>
          <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          {t('refresh')}
        </button>
      </div>

      {routerInfo && (
        <div className="router-info-card">
          <div className="router-header">
            <Router size={20} />
            <span>{t('network_router_info_title')}</span>
          </div>
          <div className="router-details">
            <div className="router-detail-item">
              <span className="router-label">{t('network_router_gateway_label')}</span>
              <span className="router-value">{routerInfo.gateway_ip}</span>
              <button className="icon-btn-small" onClick={() => copyToClipboard(routerInfo.gateway_ip)}>
                <Copy size={12} />
              </button>
            </div>
            <div className="router-detail-item">
              <span className="router-label">{t('network_router_mac_label')}</span>
              <span className="router-value">{routerInfo.router_mac}</span>
              <button className="icon-btn-small" onClick={() => copyToClipboard(routerInfo.router_mac)}>
                <Copy size={12} />
              </button>
            </div>
            <button className="router-admin-btn" onClick={() => openRouterAdmin(routerInfo.admin_url)}>
              <ExternalLink size={14} />
              {t('network_router_admin_button')}
            </button>
          </div>
        </div>
      )}

      <div className="network-tabs">
        <button 
          className={`network-tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          <Wifi size={16} />
          {t('network_tab_saved')}
        </button>
        <button 
          className={`network-tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          <Users size={16} />
          {t('network_tab_devices')}
        </button>
        <button 
          className={`network-tab ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <Network size={16} />
          {t('network_tab_active')}
        </button>
      </div>

      <div className="wifi-list">
        {isLoading ? (
          <div className="wifi-loading">
            <div className="spinner"></div>
            <p>{t('wifi_scanning')}</p>
          </div>
        ) : activeTab === 'saved' ? (
          networks.length === 0 ? (
            <div className="wifi-empty">
              <Wifi size={48} />
              <p>{t('wifi_no_networks')}</p>
            </div>
          ) : (
            networks.map((net, index) => {
              const isWiFi = net.connection_type === "WiFi";
              const isExpanded = expandedNetworks[net.name.toString()];
              return (
                <div key={index} className="wifi-item">
                  <div className="wifi-icon">
                    {isWiFi ? <Wifi size={20} /> : <Network size={20} />}
                  </div>
                  <div className="wifi-details">
                    <div className="wifi-ssid">
                      {net.name}
                      <span className="connection-badge">{net.connection_type}</span>
                    </div>
                    <div className="wifi-auth">{net.auth_type}</div>
                    {!isWiFi && net.ip_address && (
                      <div className="network-info-compact">
                        IP: {net.ip_address}
                      </div>
                    )}
                  </div>
                  {isWiFi && (
                    <div className="wifi-password-container">
                      <div className="password-display">
                        {showPasswords[net.name.toString()] ? net.password : '••••••••'}
                      </div>
                      <div className="wifi-actions">
                        <button 
                          className="icon-btn" 
                          onClick={() => togglePasswordVisibility(net.name.toString())}
                          title={showPasswords[net.name.toString()] ? t('hide') || "Hide" : t('show') || "Show"}
                        >
                          {showPasswords[net.name.toString()] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button 
                          className="icon-btn" 
                          onClick={() => copyToClipboard(net.password)}
                          title={t('copy') || "Copy"}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                  {!isWiFi && (
                    <button 
                      className="expand-btn"
                      onClick={() => toggleExpanded(net.name.toString())}
                      title={isExpanded ? t('hide') || "Hide" : t('show') || "Show"}
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                  )}
                  {!isWiFi && isExpanded && (
                    <div className="ethernet-details">
                      <div className="detail-row">
                        <span className="detail-label">{t('network_ip_address_label')}</span>
                        <span className="detail-value">{net.ip_address || "N/A"}</span>
                        <button className="icon-btn-small" onClick={() => copyToClipboard(net.ip_address)}>
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('network_dns_servers_label')}</span>
                        <span className="detail-value">{net.dns_servers || "N/A"}</span>
                        <button className="icon-btn-small" onClick={() => copyToClipboard(net.dns_servers)}>
                          <Copy size={12} />
                        </button>
                      </div>
                      <div className="detail-row">
                        <span className="detail-label">{t('network_gateway_label')}</span>
                        <span className="detail-value">{net.gateway || "N/A"}</span>
                        <button className="icon-btn-small" onClick={() => copyToClipboard(net.gateway)}>
                          <Copy size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : activeTab === 'devices' ? (
          devices.length === 0 ? (
            <div className="wifi-empty">
              <Users size={48} />
              <p>{t('network_no_devices')}</p>
            </div>
          ) : (
            devices.map((device, index) => (
              <div key={index} className="wifi-item">
                <div className="wifi-icon">
                  <Users size={20} />
                </div>
                <div className="wifi-details">
                  <div className="wifi-ssid">
                    {device.hostname}
                    <span className="connection-badge">{device.device_type}</span>
                  </div>
                  <div className="wifi-auth">{t('network_ip_short_label')} {device.ip_address}</div>
                  <div className="network-info-compact">
                    {t('network_mac_short_label')} {device.mac_address}
                  </div>
                </div>
                <div className="wifi-actions">
                  <button 
                    className="icon-btn" 
                    onClick={() => copyToClipboard(device.ip_address)}
                    title={t('network_copy_ip')}
                  >
                    <Copy size={14} />
                  </button>
                  <button 
                    className="icon-btn" 
                    onClick={() => copyToClipboard(device.mac_address)}
                    title={t('network_copy_mac')}
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'active' ? (
          connections.length === 0 ? (
            <div className="wifi-empty">
              <Network size={48} />
              <p>{t('network_no_active_connections')}</p>
            </div>
          ) : (
            connections.map((conn, index) => (
              <div key={index} className="wifi-item">
                <div className="wifi-icon">
                  {conn.connection_type === "WiFi" ? <Wifi size={20} /> : <Network size={20} />}
                </div>
                <div className="wifi-details">
                  <div className="wifi-ssid">
                    {conn.name}
                    <span className="connection-badge">{conn.connection_type}</span>
                    <span className="status-badge connected">{conn.status}</span>
                  </div>
                  {conn.connection_type === "WiFi" && (
                    <>
                      <div className="wifi-auth">{t('network_ssid_label')} {conn.ssid}</div>
                      <div className="network-info-compact">
                        {t('network_signal_label')} {conn.signal_strength} | {t('network_ip_short_label')} {conn.ip_address}
                      </div>
                    </>
                  )}
                  {conn.connection_type === "Ethernet" && (
                    <div className="network-info-compact">
                      {t('network_ip_short_label')} {conn.ip_address}
                    </div>
                  )}
                </div>
                <button 
                  className="disconnect-btn"
                  onClick={() => disconnectNetwork(conn.name.toString(), conn.connection_type.toString())}
                  title={t('network_disconnect')}
                >
                  <Power size={14} />
                  {t('network_disconnect')}
                </button>
              </div>
            ))
          )
        ) : null}
      </div>
    </div>
  );
};

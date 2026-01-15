import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Cpu, HardDrive, Wifi, Activity, Power, RefreshCw, ToggleLeft, ToggleRight, Battery, Clock, Monitor, XCircle, Search, Loader2 } from 'lucide-react';
import { getCpuUsage, getMemoryUsage, getDiskInfo, getNetworkStats, getUptime, getBatteryStatus, getDetailedSpecs, listStartupPrograms, toggleStartupProgram, listProcesses, killProcess } from '../utils/tauri';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { handleOperationError } from '../utils/errorHandler';
import './SystemMonitor.css';

interface SystemStats {
  cpu: number;
  memory: number;
  disk: any;
  network: any;
  uptime: any;
  battery: any;
  specs: any;
}

interface StartupProgram {
  Name: string;
  Command: string;
  Location: string;
  Enabled: boolean;
}

interface Process {
  Id: number;
  Name: string;
  CPU?: number;
  WorkingSet?: number;
}

const SystemMonitor: React.FC = () => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  
  const handleToggleStartup = async (program: StartupProgram) => {
    try {
      await toggleStartupProgram(program.Name, program.Location, program.Command, !program.Enabled);
      showNotification(
        'success',
        t('success'),
        `${program.Name} ${program.Enabled ? t('disabled') || 'disabled' : t('enabled') || 'enabled'}`
      );
      await fetchStartupPrograms();
    } catch (error) {
      handleOperationError(error, showNotification, t, t('startup_toggle_error') || 'Startup programı değiştirilemedi');
    }
  };
  const [stats, setStats] = useState<SystemStats>({ cpu: 0, memory: 0, disk: null, network: null, uptime: null, battery: null, specs: null });
  const [startupPrograms, setStartupPrograms] = useState<StartupProgram[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [processSearchQuery, setProcessSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [processLoading, setProcessLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'processes' | 'startup'>('overview');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [cpuResponse, memoryResponse, diskResponse, networkResponse, uptimeResponse, batteryResponse, specsResponse] = await Promise.all([
        getCpuUsage(),
        getMemoryUsage(),
        getDiskInfo(),
        getNetworkStats(),
        getUptime().catch(() => '{}'),
        getBatteryStatus().catch(() => '{}'),
        getDetailedSpecs().catch(() => '{}'),
      ]);

      let cpuValue = 0;
      let memoryValue = 0;
      let diskData: any = null;
      let networkData: any = null;
      let uptimeData: any = null;
      let batteryData: any = null;
      let specsData: any = null;

      try {
        const cpuJson = JSON.parse(cpuResponse || '{}');
        cpuValue = cpuJson.Usage || 0;
      } catch (e) {
        console.error('CPU parse error:', e);
      }

      try {
        const memoryJson = JSON.parse(memoryResponse || '{}');
        memoryValue = memoryJson.Percent || 0;
      } catch (e) {
        console.error('Memory parse error:', e);
      }

      try {
        const diskJson = JSON.parse(diskResponse || '[]');
        if (Array.isArray(diskJson) && diskJson.length > 0) {
          const mainDisk = diskJson[0];
          diskData = {
            Total: (mainDisk.TotalGB || 0) * 1024 * 1024 * 1024,
            Used: (mainDisk.UsedGB || 0) * 1024 * 1024 * 1024,
            Free: (mainDisk.FreeGB || 0) * 1024 * 1024 * 1024,
            UsedPercent: mainDisk.PercentUsed || 0,
            DeviceID: mainDisk.DeviceID || 'C:',
            VolumeName: mainDisk.VolumeName || ''
          };
        } else if (typeof diskJson === 'object' && diskJson.TotalGB) {
          diskData = {
            Total: (diskJson.TotalGB || 0) * 1024 * 1024 * 1024,
            Used: (diskJson.UsedGB || 0) * 1024 * 1024 * 1024,
            Free: (diskJson.FreeGB || 0) * 1024 * 1024 * 1024,
            UsedPercent: diskJson.PercentUsed || 0,
            DeviceID: diskJson.DeviceID || 'C:',
            VolumeName: diskJson.VolumeName || ''
          };
        }
      } catch (e) {
        console.error('Disk parse error:', e);
      }

      try {
        const networkJson = JSON.parse(networkResponse || '[]');
        if (Array.isArray(networkJson) && networkJson.length > 0) {
          const mainAdapter = networkJson[0];
          networkData = {
            Sent: (mainAdapter.SentMB || 0) * 1024 * 1024,
            Received: (mainAdapter.ReceivedMB || 0) * 1024 * 1024,
            Name: mainAdapter.Name || 'Unknown'
          };
        } else if (typeof networkJson === 'object' && networkJson.SentMB) {
          networkData = {
            Sent: (networkJson.SentMB || 0) * 1024 * 1024,
            Received: (networkJson.ReceivedMB || 0) * 1024 * 1024,
            Name: networkJson.Name || 'Unknown'
          };
        }
      } catch (e) {
        console.error('Network parse error:', e);
      }

      try {
        uptimeData = JSON.parse(uptimeResponse || '{}');
      } catch (e) {
        console.error('Uptime parse error:', e);
      }

      try {
        batteryData = JSON.parse(batteryResponse || '{}');
      } catch (e) {
        console.error('Battery parse error:', e);
      }

      try {
        specsData = JSON.parse(specsResponse || '{}');
      } catch (e) {
        console.error('Specs parse error:', e);
      }

      setStats({
        cpu: cpuValue,
        memory: memoryValue,
        disk: diskData,
        network: networkData,
        uptime: uptimeData,
        battery: batteryData,
        specs: specsData,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('404') && !errorMsg.includes('Not Found')) {
        console.error('Failed to fetch stats:', error);
      }
    }
  }, []);

  const fetchStartupPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listStartupPrograms();
      if (!result || result.trim() === '') {
        setStartupPrograms([]);
        return;
      }
      const parsed = JSON.parse(result);
      const programs = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      setStartupPrograms(programs.filter((p: StartupProgram) => p && p.Name));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('404') || errorMsg.includes('Not Found')) {
        setStartupPrograms([]);
      } else {
        handleOperationError(error, showNotification, t, t('startup_programs_load_error') || 'Startup programları yüklenemedi');
      }
    } finally {
      setLoading(false);
    }
  }, [showNotification, t]);

  const fetchProcesses = useCallback(async () => {
    setProcessLoading(true);
    try {
      const result = await listProcesses();
      if (!result || result.trim() === '') {
        setProcesses([]);
        return;
      }
      const parsed = JSON.parse(result);
      const processesArray = Array.isArray(parsed) ? parsed : [parsed];
      setProcesses(processesArray.filter((p: any) => p && p.Id && p.Name));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!errorMsg.includes('404') && !errorMsg.includes('Not Found')) {
        console.error('Failed to fetch processes:', error);
      }
      setProcesses([]);
    } finally {
      setProcessLoading(false);
    }
  }, []);

  const handleKillProcess = async (processId: number, processName: string) => {
    if (!confirm(t('kill_process_confirm') || `Kill process "${processName}" (PID: ${processId})?`)) {
      return;
    }
    try {
      await killProcess(processId);
      showNotification('success', t('success'), `${processName} ${t('killed') || 'killed'}`);
      await fetchProcesses();
    } catch (error) {
      handleOperationError(error, showNotification, t, t('kill_process_error') || 'Process sonlandırılamadı');
    }
  };

  useEffect(() => {
    fetchStats();
    
    if (activeTab === 'processes') {
      fetchProcesses();
    } else if (activeTab === 'startup') {
      fetchStartupPrograms();
    }

    let isScrolling = false;
    let scrollTimeout: NodeJS.Timeout;

    const handleScroll = () => {
      isScrolling = true;
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    intervalRef.current = setInterval(() => {
      if (!isScrolling) {
        fetchStats();
      }
    }, 3000);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(scrollTimeout);
    };
  }, [fetchStats, fetchStartupPrograms, fetchProcesses, activeTab]);

  const filteredProcesses = useMemo(() => {
    if (!processSearchQuery.trim()) return processes;
    const query = processSearchQuery.toLowerCase();
    return processes.filter((proc) =>
      proc.Name.toLowerCase().includes(query) ||
      proc.Id.toString().includes(processSearchQuery)
    );
  }, [processes, processSearchQuery]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getMemoryColor = (usage: number) => {
    if (usage > 80) return 'var(--status-error)';
    if (usage > 60) return 'var(--status-warning)';
    return 'var(--status-success)';
  };

  const getCpuColor = (usage: number) => {
    if (usage > 80) return 'var(--status-error)';
    if (usage > 60) return 'var(--status-warning)';
    return 'var(--status-success)';
  };

  return (
    <div className="page-container system-monitor-page">
      <div className="page-header">
        <h2 className="page-title">{t('system_monitor_title') || 'System Monitor'}</h2>
        <p className="page-description">{t('system_monitor_description') || 'Real-time system monitoring and process management'}</p>
      </div>

      <div className="monitor-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={18} />
          {t('overview') || 'Overview'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'processes' ? 'active' : ''}`}
          onClick={() => setActiveTab('processes')}
        >
          <Cpu size={18} />
          {t('processes') || 'Processes'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'startup' ? 'active' : ''}`}
          onClick={() => setActiveTab('startup')}
        >
          <Power size={18} />
          {t('startup_programs') || 'Startup Programs'}
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="monitor-overview">
          <div className="stats-grid">
            <div className="stat-card cpu-card">
              <div className="stat-header">
                <Cpu size={24} />
                <span>{t('cpu_usage') || 'CPU Usage'}</span>
              </div>
              <div className="stat-value" style={{ color: getCpuColor(stats.cpu) }}>
                {stats.cpu.toFixed(1)}%
              </div>
              <div className="stat-bar">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${stats.cpu}%`,
                    backgroundColor: getCpuColor(stats.cpu),
                  }}
                />
              </div>
            </div>

            <div className="stat-card memory-card">
              <div className="stat-header">
                <HardDrive size={24} />
                <span>{t('memory_usage') || 'Memory Usage'}</span>
              </div>
              <div className="stat-value" style={{ color: getMemoryColor(stats.memory) }}>
                {stats.memory.toFixed(1)}%
              </div>
              <div className="stat-bar">
                <div
                  className="stat-bar-fill"
                  style={{
                    width: `${stats.memory}%`,
                    backgroundColor: getMemoryColor(stats.memory),
                  }}
                />
              </div>
            </div>

            <div className="stat-card disk-card">
              <div className="stat-header">
                <HardDrive size={24} />
                <span>{t('disk_usage') || 'Disk Usage'}</span>
              </div>
              {stats.disk && stats.disk.UsedPercent !== undefined ? (
                <>
                  <div className="stat-value" style={{ color: getMemoryColor(stats.disk.UsedPercent) }}>
                    {stats.disk.UsedPercent.toFixed(1)}%
                  </div>
                  <div className="stat-bar">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${stats.disk.UsedPercent}%`,
                        backgroundColor: getMemoryColor(stats.disk.UsedPercent),
                      }}
                    />
                  </div>
                  {stats.disk.Total && stats.disk.Used && (
                    <div className="stat-details">
                      {formatBytes(stats.disk.Used)} / {formatBytes(stats.disk.Total)}
                      {stats.disk.DeviceID && <span className="disk-device"> ({stats.disk.DeviceID})</span>}
                    </div>
                  )}
                </>
              ) : (
                <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>
                  N/A
                </div>
              )}
            </div>

            <div className="stat-card network-card">
              <div className="stat-header">
                <Wifi size={24} />
                <span>{t('network') || 'Network'}</span>
              </div>
              {stats.network && stats.network.Sent !== undefined ? (
                <>
                  <div className="stat-value">
                    {formatBytes(stats.network.Sent)}
                  </div>
                  <div className="stat-details">
                    <span>{t('sent') || 'Sent'}</span> / <span>{formatBytes(stats.network.Received || 0)}</span> <span>{t('received') || 'Received'}</span>
                    {stats.network.Name && <div className="network-adapter">{stats.network.Name}</div>}
                  </div>
                </>
              ) : (
                <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>
                  N/A
                </div>
              )}
            </div>

            {stats.uptime && (stats.uptime.Days !== undefined || stats.uptime.Hours !== undefined || stats.uptime.Minutes !== undefined) && (
              <div className="stat-card uptime-card">
                <div className="stat-header">
                  <Clock size={24} />
                  <span>{t('uptime') || 'Uptime'}</span>
                </div>
                <div className="stat-value">
                  {stats.uptime.Days ? `${stats.uptime.Days}d ` : ''}
                  {stats.uptime.Hours ? `${stats.uptime.Hours}h ` : ''}
                  {stats.uptime.Minutes ? `${stats.uptime.Minutes}m` : '0m'}
                </div>
              </div>
            )}
          </div>

          <div className="additional-info">
            {stats.battery && !stats.battery.NoBattery && stats.battery.Charge !== undefined && (
              <div className="info-card">
                <div className="info-header">
                  <Battery size={20} />
                  <span>{t('battery') || 'Battery'}</span>
                </div>
                <div className="info-value">
                  {stats.battery.Charge}%
                  {stats.battery.IsCharging && <span className="charging-indicator"> (Charging)</span>}
                </div>
              </div>
            )}

            {stats.specs && stats.specs.CpuName && (
              <div className="info-card specs-card">
                <div className="info-header">
                  <Monitor size={20} />
                  <span>{t('system_specs') || 'System Specs'}</span>
                </div>
                <div className="specs-details">
                  <div className="spec-item">
                    <span className="spec-label">{t('cpu') || 'CPU'}:</span>
                    <span className="spec-value">{stats.specs.CpuName}</span>
                  </div>
                  {stats.specs.CpuCores && (
                    <div className="spec-item">
                      <span className="spec-label">{t('cores') || 'Cores'}:</span>
                      <span className="spec-value">{stats.specs.CpuCores} / {stats.specs.CpuThreads || stats.specs.CpuCores} {t('threads') || 'Threads'}</span>
                    </div>
                  )}
                  {stats.specs.GpuName && (
                    <div className="spec-item">
                      <span className="spec-label">{t('gpu') || 'GPU'}:</span>
                      <span className="spec-value">{stats.specs.GpuName}</span>
                    </div>
                  )}
                  {stats.specs.OsName && (
                    <div className="spec-item">
                      <span className="spec-label">{t('os') || 'OS'}:</span>
                      <span className="spec-value">{stats.specs.OsName}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="quick-actions">
            <UtilityCard
              icon={RefreshCw}
              title={t('refresh_stats') || 'Refresh Statistics'}
              description={t('refresh_stats_description') || 'Update all system statistics'}
              actionType="button"
              actionLabel={t('refresh') || 'Refresh'}
              onAction={fetchStats}
            />
          </div>
        </div>
      )}

      {activeTab === 'processes' && (
        <div className="processes-tab">
          <div className="processes-controls">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder={t('search_processes') || 'Search processes...'}
                value={processSearchQuery}
                onChange={(e) => setProcessSearchQuery(e.target.value)}
              />
            </div>
            <button className="refresh-btn" onClick={fetchProcesses} disabled={processLoading}>
              <RefreshCw size={18} className={processLoading ? 'spinning' : ''} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>

          {processLoading ? (
            <div className="loading-state">
              <Loader2 size={32} />
              <p>{t('loading_processes') || 'Loading processes...'}</p>
            </div>
          ) : (
            <div className="processes-list">
              {filteredProcesses.length === 0 ? (
                <div className="empty-state">
                  <Cpu size={48} />
                  <p>{t('no_processes_found') || 'No processes found'}</p>
                </div>
              ) : (
                filteredProcesses.map((proc) => (
                    <div key={proc.Id} className="process-item">
                      <div className="process-info">
                        <div className="process-name-row">
                          <h4 className="process-name">{proc.Name}</h4>
                          <span className="process-pid">PID: {proc.Id}</span>
                        </div>
                        <div className="process-stats">
                          {proc.CPU !== undefined && (
                            <div className="process-stat">
                              <Cpu size={14} />
                              <span>{proc.CPU.toFixed(2)}s</span>
                            </div>
                          )}
                          {proc.WorkingSet !== undefined && (
                            <div className="process-stat">
                              <HardDrive size={14} />
                              <span>{formatBytes(proc.WorkingSet)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="process-actions">
                        <button
                          className="action-btn kill-btn"
                          onClick={() => handleKillProcess(proc.Id, proc.Name)}
                          title={t('kill_process') || 'Kill Process'}
                        >
                          <XCircle size={18} />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'startup' && (
        <div className="startup-tab">
          <div className="startup-controls">
            <button className="refresh-btn" onClick={fetchStartupPrograms} disabled={loading}>
              <RefreshCw size={18} className={loading ? 'spinning' : ''} />
              {t('refresh') || 'Refresh'}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>{t('loading_startup_programs') || 'Loading startup programs...'}</p>
            </div>
          ) : (
            <div className="startup-list">
              {startupPrograms.length === 0 ? (
                <div className="empty-state">
                  <Power size={48} />
                  <p>{t('no_startup_programs') || 'No startup programs found'}</p>
                </div>
              ) : (
                startupPrograms.map((program, idx) => (
                  <div key={idx} className="startup-item">
                    <div className="startup-info">
                      <h4 className="startup-name">{program.Name}</h4>
                      <p className="startup-command">{program.Command}</p>
                      <p className="startup-location">{program.Location}</p>
                    </div>
                    <div className="startup-actions">
                      <button
                        className={`toggle-btn ${program.Enabled ? 'enabled' : 'disabled'}`}
                        onClick={() => handleToggleStartup(program)}
                        title={program.Enabled ? t('disable') || 'Disable' : t('enable') || 'Enable'}
                      >
                        {program.Enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        <span>{program.Enabled ? t('enabled') || 'Enabled' : t('disabled') || 'Disabled'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default SystemMonitor;

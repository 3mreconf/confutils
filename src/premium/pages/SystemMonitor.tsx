import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Cpu,
  HardDrive,
  MemoryStick,
  Activity,
  Wifi,
  Clock,
  Layers
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface SystemMonitorProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

// Live chart component
const LiveChart = ({
  data,
  color,
  height = 80,
  showGrid = true
}: {
  data: number[];
  color: string;
  height?: number;
  showGrid?: boolean;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = (rect.height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
    }

    // Data line
    if (data.length < 2) return;

    const stepX = rect.width / (data.length - 1);

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
    gradient.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
    gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));

    ctx.beginPath();
    ctx.moveTo(0, rect.height);

    data.forEach((value, i) => {
      const x = i * stepX;
      const y = rect.height - (value / 100) * rect.height;
      if (i === 0) {
        ctx.lineTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.lineTo(rect.width, rect.height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    data.forEach((value, i) => {
      const x = i * stepX;
      const y = rect.height - (value / 100) * rect.height;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();

  }, [data, color, height, showGrid]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block'
      }}
    />
  );
};

// Resource Monitor Card
const ResourceCard = ({
  icon: Icon,
  title,
  value,
  unit,
  data,
  color,
  details
}: {
  icon: any;
  title: string;
  value: number;
  unit: string;
  data: number[];
  color: string;
  details?: { label: string; value: string }[];
}) => (
  <div className="control-card" style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ padding: 'var(--space-lg)' }}>
      <div className="flex items-center justify-between mb-md">
        <div className="flex items-center gap-md">
          <div
            style={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: color.replace(')', ', 0.15)').replace('rgb', 'rgba'),
              borderRadius: 'var(--radius-md)',
              color
            }}
          >
            <Icon size={18} />
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{title}</span>
        </div>
        <div className="font-mono" style={{ fontSize: 'var(--text-2xl)', color }}>
          {Math.round(value)}<span style={{ fontSize: 'var(--text-sm)', opacity: 0.7 }}>{unit}</span>
        </div>
      </div>

      {details && (
        <div className="flex gap-lg mt-md">
          {details.map((d, i) => (
            <div key={i}>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{d.label}</div>
              <div className="font-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-90)' }}>{d.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    <div style={{ borderTop: '1px solid var(--glass-border)' }}>
      <LiveChart data={data} color={color} height={80} />
    </div>
  </div>
);

// Process list item
const ProcessItem = ({
  name,
  cpu,
  memory,
  pid
}: {
  name: string;
  cpu: number;
  memory: number;
  pid: number;
}) => {
  const { t } = useI18n();

  return (
    <div className="list-item">
      <div className="list-item-icon" style={{ background: 'var(--elevated)' }}>
        <Layers size={16} />
      </div>
      <div className="list-item-content" style={{ flex: 2 }}>
        <div className="list-item-title">{name}</div>
        <div className="list-item-subtitle">{t('pid_label')}: {pid}</div>
      </div>
      <div style={{ width: 80 }}>
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('cpu_label')}</div>
        <div
          className="font-mono"
          style={{
            fontSize: 'var(--text-sm)',
            color: cpu > 50 ? 'var(--warning)' : 'var(--text-90)'
          }}
        >
          {cpu.toFixed(1)}%
        </div>
      </div>
      <div style={{ width: 80 }}>
        <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('memory_label')}</div>
        <div className="font-mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-90)' }}>
          {memory} MB
        </div>
      </div>
    </div>
  );
};

export default function SystemMonitor({ showToast: _showToast }: SystemMonitorProps) {
  const { t } = useI18n();
  const HISTORY_POINTS = 30;
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(HISTORY_POINTS).fill(0));
  const [memHistory, setMemHistory] = useState<number[]>(Array(HISTORY_POINTS).fill(0));
  const [diskHistory, setDiskHistory] = useState<number[]>(Array(HISTORY_POINTS).fill(0));
  const [netHistory, setNetHistory] = useState<number[]>(Array(HISTORY_POINTS).fill(0));

  const [currentStats, setCurrentStats] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: 0,
    uptime: '0m',
    processes: 0,
    threads: 0,
    handles: 0,
    memUsedGB: 0,
    memFreeGB: 0,
    memTotalGB: 0,
    diskUsedGB: 0,
    diskFreeGB: 0,
    diskTotalGB: 0,
    netDownMB: 0,
    netUpMB: 0,
    netLatencyMs: null as number | null,
    cpuCores: 0,
    cpuSpeedGHz: 0,
    cpuBaseGHz: 0,
    netMaxBps: 0
  });

  const [processes, setProcesses] = useState<
    { name: string; cpu: number; memory: number; pid: number }[]
  >([]);
  const processCpuRef = useRef<{ time: number; cpu: Map<number, number> }>({
    time: 0,
    cpu: new Map()
  });
  const netMaxBpsRef = useRef(0);
  const isVisibleRef = useRef(true);

  const safeJson = <T,>(raw: unknown, fallback: T): T => {
    if (!raw) return fallback;
    if (typeof raw !== 'string') return raw as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };

  const formatUptime = (uptime: { Days: number; Hours: number; Minutes: number }) =>
    `${uptime.Days}d ${uptime.Hours}h ${uptime.Minutes}m`;

  const formatGb = (value: number) => value.toFixed(1);

  const fetchCpuInfo = async () => {
    const command = `
      $cpu = Get-CimInstance Win32_Processor | Select-Object -First 1 Name, NumberOfLogicalProcessors, MaxClockSpeed, CurrentClockSpeed
      if ($cpu) {
        @{Cores=$cpu.NumberOfLogicalProcessors;MaxGHz=[math]::Round($cpu.MaxClockSpeed/1000,2);CurrentGHz=[math]::Round($cpu.CurrentClockSpeed/1000,2)} | ConvertTo-Json -Compress
      } else {
        @{Cores=0;MaxGHz=0;CurrentGHz=0} | ConvertTo-Json -Compress
      }
    `;
    const data = safeJson<{ Cores: number; MaxGHz: number; CurrentGHz: number }>(
      await invoke('run_powershell', { command }),
      { Cores: 0, MaxGHz: 0, CurrentGHz: 0 }
    );
    setCurrentStats(prev => ({
      ...prev,
      cpuCores: data.Cores || 0,
      cpuSpeedGHz: data.CurrentGHz || 0,
      cpuBaseGHz: data.MaxGHz || 0
    }));
  };

  const fetchNetworkStats = async () => {
    const command = `
      $ctr = Get-Counter '\\Network Interface(*)\\Bytes Received/sec','\\Network Interface(*)\\Bytes Sent/sec'
      $samples = $ctr.CounterSamples | Where-Object {
        $_.InstanceName -notlike "*isatap*" -and $_.InstanceName -notlike "*Loopback*" -and $_.InstanceName -notlike "*Teredo*"
      }
      $down = ($samples | Where-Object { $_.Path -like "*Bytes Received/sec" } | Measure-Object -Property CookedValue -Sum).Sum
      $up = ($samples | Where-Object { $_.Path -like "*Bytes Sent/sec" } | Measure-Object -Property CookedValue -Sum).Sum
      @{DownBytesPerSec=$down;UpBytesPerSec=$up} | ConvertTo-Json -Compress
    `;
    const net = safeJson<{ DownBytesPerSec: number; UpBytesPerSec: number }>(
      await invoke('run_powershell', { command }),
      { DownBytesPerSec: 0, UpBytesPerSec: 0 }
    );
    const downMB = Math.max(0, (net.DownBytesPerSec || 0) / (1024 * 1024));
    const upMB = Math.max(0, (net.UpBytesPerSec || 0) / (1024 * 1024));
    const totalBytes = (net.DownBytesPerSec || 0) + (net.UpBytesPerSec || 0);
    const netPercent =
      netMaxBpsRef.current > 0
        ? Math.min(100, (totalBytes * 8 * 100) / netMaxBpsRef.current)
        : 0;
    setNetHistory(h => [...h.slice(1), netPercent]);
    setCurrentStats(prev => ({
      ...prev,
      network: netPercent,
      netDownMB: downMB,
      netUpMB: upMB
    }));
  };

  const fetchNetworkLatency = async () => {
    const command = `
      $lat = (Test-Connection -ComputerName 1.1.1.1 -Count 1 -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty ResponseTime)
      @{Latency=$lat} | ConvertTo-Json -Compress
    `;
    const data = safeJson<{ Latency: number | null }>(
      await invoke('run_powershell', { command }),
      { Latency: null }
    );
    setCurrentStats(prev => ({
      ...prev,
      netLatencyMs: typeof data.Latency === 'number' ? data.Latency : null
    }));
  };
  const fetchNetworkSpeed = async () => {
    const command = `
      $adapters = Get-CimInstance Win32_NetworkAdapter | Where-Object { $_.NetEnabled -eq $true -and $_.Speed -gt 0 }
      $max = ($adapters | Measure-Object -Property Speed -Maximum).Maximum
      @{MaxSpeed=$max} | ConvertTo-Json -Compress
    `;
    const data = safeJson<{ MaxSpeed: number }>(
      await invoke('run_powershell', { command }),
      { MaxSpeed: 0 }
    );
    netMaxBpsRef.current = data.MaxSpeed || 0;
    setCurrentStats(prev => ({
      ...prev,
      netMaxBps: data.MaxSpeed || 0
    }));
  };

  const fetchUsage = async () => {
    const [cpuRaw, memRaw] = await Promise.all([
      invoke('get_cpu_usage'),
      invoke('get_memory_usage')
    ]);
    const cpu = safeJson<{ Usage: number }>(cpuRaw, { Usage: 0 });
    const mem = safeJson<{ Total: number; Used: number; Free: number; Percent: number }>(memRaw, {
      Total: 0,
      Used: 0,
      Free: 0,
      Percent: 0
    });
    const cpuUsage = Math.max(0, Math.min(100, cpu.Usage || 0));
    const memPercent = Math.max(0, Math.min(100, mem.Percent || 0));
    const memTotalGB = (mem.Total || 0) / 1024;
    const memUsedGB = (mem.Used || 0) / 1024;
    const memFreeGB = (mem.Free || 0) / 1024;
    setCpuHistory(h => [...h.slice(1), cpuUsage]);
    setMemHistory(h => [...h.slice(1), memPercent]);
    setCurrentStats(prev => ({
      ...prev,
      cpu: cpuUsage,
      memory: memPercent,
      memTotalGB,
      memUsedGB,
      memFreeGB
    }));
  };

  const fetchDiskAndUptime = async () => {
    const [diskRaw, uptimeRaw] = await Promise.all([
      invoke('get_disk_info'),
      invoke('get_uptime')
    ]);
    const disk = safeJson<any>(diskRaw, []);
    const disks = Array.isArray(disk) ? disk : disk ? [disk] : [];
    const totals = disks.reduce(
      (acc, d) => {
        acc.total += Number(d.SizeGB || 0);
        acc.free += Number(d.FreeSpaceGB || 0);
        acc.used += Number(d.UsedSpaceGB || 0);
        return acc;
      },
      { total: 0, free: 0, used: 0 }
    );
    const diskPercent = totals.total > 0 ? Math.min(100, (totals.used / totals.total) * 100) : 0;
    setDiskHistory(h => [...h.slice(1), diskPercent]);
    const uptime = safeJson<{ Days: number; Hours: number; Minutes: number }>(uptimeRaw, {
      Days: 0,
      Hours: 0,
      Minutes: 0
    });
    setCurrentStats(prev => ({
      ...prev,
      disk: diskPercent,
      diskTotalGB: totals.total,
      diskUsedGB: totals.used,
      diskFreeGB: totals.free,
      uptime: formatUptime(uptime)
    }));
  };

  const fetchProcessStats = async () => {
    const command = `
      $procs = Get-Process
      $top = $procs | Sort-Object CPU -Descending | Select-Object -First 12 Id, ProcessName, CPU, @{Name="MemoryMB";Expression={[math]::Round($_.WorkingSet64/1MB,2)}}
      $handles = ($procs | Measure-Object -Property Handles -Sum).Sum
      $threads = ($procs | ForEach-Object { $_.Threads.Count } | Measure-Object -Sum).Sum
      @{Total=$procs.Count;Threads=$threads;Handles=$handles;Top=$top} | ConvertTo-Json -Compress
    `;
    const payload = safeJson<any>(await invoke('run_powershell', { command }), {});
    const listRaw = payload.Top ?? [];
    const list = Array.isArray(listRaw) ? listRaw : listRaw ? [listRaw] : [];
    const now = performance.now();
    const prev = processCpuRef.current;
    const deltaSeconds = prev.time > 0 ? (now - prev.time) / 1000 : 0;
    const nextMap = new Map<number, number>();
    const cores = Math.max(1, navigator.hardwareConcurrency || 1);
    const computed = list.map((p: { Id: number; ProcessName: string; CPU: number; MemoryMB: number }) => {
      const cpuTime = Number(p.CPU || 0);
      const prevCpu = prev.cpu.get(p.Id) ?? cpuTime;
      const deltaCpu = cpuTime - prevCpu;
      const cpuPercent =
        deltaSeconds > 0 && deltaCpu >= 0
          ? Math.min(100, (deltaCpu / deltaSeconds / cores) * 100)
          : 0;
      nextMap.set(p.Id, cpuTime);
      return {
        name: p.ProcessName || 'Unknown',
        cpu: cpuPercent,
        memory: Math.round(Number(p.MemoryMB || 0)),
        pid: p.Id
      };
    });
    processCpuRef.current = { time: now, cpu: nextMap };
    const top = computed.sort((a, b) => b.cpu - a.cpu).slice(0, 8);
    setProcesses(top);
    setCurrentStats(prev => ({
      ...prev,
      processes: Number(payload.Total || list.length || 0),
      threads: Number(payload.Threads || 0),
      handles: Number(payload.Handles || 0)
    }));
  };

  useEffect(() => {
    let active = true;

    const onVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    onVisibilityChange();

    const fast = async () => {
      try {
        if (!isVisibleRef.current) return;
        await Promise.all([fetchUsage(), fetchNetworkStats()]);
      } catch {
        if (!active) return;
      }
    };

    const slow = async () => {
      try {
        if (!isVisibleRef.current) return;
        await Promise.all([fetchDiskAndUptime(), fetchProcessStats()]);
      } catch {
        if (!active) return;
      }
    };

    fetchCpuInfo();
    fetchNetworkSpeed();
    fetchNetworkLatency();
    fast();
    slow();

    const fastInterval = setInterval(fast, 2000);
    const slowInterval = setInterval(slow, 10000);
    const netSpeedInterval = setInterval(fetchNetworkSpeed, 30000);
    const latencyInterval = setInterval(fetchNetworkLatency, 30000);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(fastInterval);
      clearInterval(slowInterval);
      clearInterval(netSpeedInterval);
      clearInterval(latencyInterval);
    };
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-lg">
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('system_monitor_title')}
        </h2>
        <p className="text-muted mt-sm">
          {t('system_monitor_subtitle')}
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)'
        }}
      >
        {[
          { icon: Clock, label: t('uptime'), value: currentStats.uptime },
          { icon: Layers, label: t('processes'), value: currentStats.processes.toString() },
          { icon: Activity, label: t('threads'), value: currentStats.threads.toLocaleString() },
          { icon: Cpu, label: t('handles'), value: currentStats.handles.toLocaleString() },
        ].map((stat, i) => (
          <div
            key={i}
            className="control-card"
            style={{ padding: 'var(--space-md)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}
          >
            <stat.icon size={18} color="var(--text-50)" />
            <div>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{stat.label}</div>
              <div className="font-mono" style={{ color: 'var(--text-100)' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Resource Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--space-lg)',
          marginBottom: 'var(--space-lg)'
        }}
      >
        <ResourceCard
          icon={Cpu}
          title={t('cpu_label')}
          value={currentStats.cpu}
          unit="%"
          data={cpuHistory}
          color={currentStats.cpu > 80 ? 'rgb(255, 71, 87)' : currentStats.cpu > 60 ? 'rgb(255, 184, 0)' : 'rgb(0, 240, 255)'}
          details={[
            { label: t('cores'), value: currentStats.cpuCores ? currentStats.cpuCores.toString() : '-' },
            { label: t('speed'), value: currentStats.cpuSpeedGHz ? `${currentStats.cpuSpeedGHz.toFixed(2)} GHz` : '-' },
            { label: t('base'), value: currentStats.cpuBaseGHz ? `${currentStats.cpuBaseGHz.toFixed(2)} GHz` : '-' }
          ]}
        />

        <ResourceCard
          icon={MemoryStick}
          title={t('memory_label')}
          value={currentStats.memory}
          unit="%"
          data={memHistory}
          color={currentStats.memory > 85 ? 'rgb(255, 71, 87)' : 'rgb(0, 240, 255)'}
          details={[
            { label: t('used'), value: `${formatGb(currentStats.memUsedGB)} GB` },
            { label: t('available'), value: `${formatGb(currentStats.memFreeGB)} GB` },
            { label: t('total'), value: `${formatGb(currentStats.memTotalGB)} GB` }
          ]}
        />

        <ResourceCard
          icon={HardDrive}
          title={t('disk_label')}
          value={currentStats.disk}
          unit="%"
          data={diskHistory}
          color="rgb(0, 240, 255)"
          details={[
            { label: t('used'), value: `${formatGb(currentStats.diskUsedGB)} GB` },
            { label: t('available'), value: `${formatGb(currentStats.diskFreeGB)} GB` },
            { label: t('total'), value: `${formatGb(currentStats.diskTotalGB)} GB` }
          ]}
        />

        <ResourceCard
          icon={Wifi}
          title={t('network_label')}
          value={currentStats.network}
          unit="%"
          data={netHistory}
          color="rgb(0, 255, 148)"
          details={[
            { label: t('download'), value: `${currentStats.netDownMB.toFixed(2)} MB/s` },
            { label: t('upload'), value: `${currentStats.netUpMB.toFixed(2)} MB/s` },
            { label: t('latency'), value: currentStats.netLatencyMs != null ? `${currentStats.netLatencyMs} ms` : '-' }
          ]}
        />
      </div>

      {/* Top Processes */}
      <div className="list-container">
        <div className="list-header">
          <span className="list-title">{t('top_processes_cpu')}</span>
          <span className="list-count">{currentStats.processes} {t('processes')}</span>
        </div>
        {processes.map((proc, i) => (
          <ProcessItem key={i} {...proc} />
        ))}
      </div>
    </div>
  );
}

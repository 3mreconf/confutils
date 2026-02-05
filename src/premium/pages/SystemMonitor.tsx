import { useState, useEffect, useRef } from 'react';
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
  const [cpuHistory, setCpuHistory] = useState<number[]>(Array(60).fill(30));
  const [memHistory, setMemHistory] = useState<number[]>(Array(60).fill(55));
  const [diskHistory, setDiskHistory] = useState<number[]>(Array(60).fill(45));
  const [netHistory, setNetHistory] = useState<number[]>(Array(60).fill(20));

  const [currentStats, setCurrentStats] = useState({
    cpu: 34,
    memory: 62,
    disk: 48,
    network: 25,
    uptime: '4d 12h 34m',
    processes: 156,
    threads: 2341,
    handles: 89234
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStats(prev => {
        const newCpu = Math.min(100, Math.max(5, prev.cpu + (Math.random() - 0.5) * 20));
        const newMem = Math.min(95, Math.max(30, prev.memory + (Math.random() - 0.5) * 8));
        const newDisk = Math.min(100, Math.max(20, prev.disk + (Math.random() - 0.5) * 3));
        const newNet = Math.min(100, Math.max(0, prev.network + (Math.random() - 0.5) * 30));

        setCpuHistory(h => [...h.slice(1), newCpu]);
        setMemHistory(h => [...h.slice(1), newMem]);
        setDiskHistory(h => [...h.slice(1), newDisk]);
        setNetHistory(h => [...h.slice(1), newNet]);

        return {
          ...prev,
          cpu: newCpu,
          memory: newMem,
          disk: newDisk,
          network: newNet
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Mock processes
  const processes = [
    { name: 'System', cpu: 2.1, memory: 128, pid: 4 },
    { name: 'explorer.exe', cpu: 1.5, memory: 89, pid: 4521 },
    { name: 'chrome.exe', cpu: 12.4, memory: 892, pid: 8234 },
    { name: 'vscode.exe', cpu: 8.2, memory: 456, pid: 7123 },
    { name: 'node.exe', cpu: 4.1, memory: 234, pid: 9012 },
    { name: 'WindowsTerminal.exe', cpu: 0.8, memory: 67, pid: 5678 },
  ].sort((a, b) => b.cpu - a.cpu);

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
            { label: t('cores'), value: '8' },
            { label: t('speed'), value: '3.6 GHz' },
            { label: t('base'), value: '2.9 GHz' }
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
            { label: t('used'), value: '9.9 GB' },
            { label: t('available'), value: '6.1 GB' },
            { label: t('total'), value: '16 GB' }
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
            { label: t('read'), value: '12.4 MB/s' },
            { label: t('write'), value: '8.2 MB/s' },
            { label: t('active'), value: `${currentStats.disk}%` }
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
            { label: t('download'), value: '12.8 MB/s' },
            { label: t('upload'), value: '2.4 MB/s' },
            { label: t('latency'), value: '24 ms' }
          ]}
        />
      </div>

      {/* Top Processes */}
      <div className="list-container">
        <div className="list-header">
          <span className="list-title">{t('top_processes_cpu')}</span>
          <span className="list-count">{processes.length} {t('processes')}</span>
        </div>
        {processes.map((proc, i) => (
          <ProcessItem key={i} {...proc} />
        ))}
      </div>
    </div>
  );
}

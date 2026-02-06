import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Zap,
  Rocket,
  HardDrive,
  Cpu,
  MemoryStick,
  Monitor,
  Gamepad2,
  Battery,
  Play,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface OptimizationProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

interface OptimizationTask {
  id: string;
  title: string;
  description: string;
  icon: any;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  impact: 'low' | 'medium' | 'high';
  category: 'performance' | 'startup' | 'visual' | 'gaming';
  command?: string;
}

const buildInitialTasks = (t: (key: any) => string): OptimizationTask[] => ([
  {
    id: 'clear-temp',
    title: t('opt_task_clear_temp_title'),
    description: t('opt_task_clear_temp_desc'),
    icon: HardDrive,
    status: 'pending',
    impact: 'medium',
    category: 'performance',
    command: `
      Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "C:\\Windows\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Remove-Item -Path "C:\\Windows\\Prefetch\\*" -Recurse -Force -ErrorAction SilentlyContinue
      Clear-RecycleBin -Force -Confirm:$false -ErrorAction SilentlyContinue
      "Temp files cleared"
    `
  },
  {
    id: 'optimize-memory',
    title: t('opt_task_optimize_memory_title'),
    description: t('opt_task_optimize_memory_desc'),
    icon: MemoryStick,
    status: 'pending',
    impact: 'medium',
    category: 'performance',
    command: `
      [System.GC]::Collect()
      [System.GC]::WaitForPendingFinalizers()
      [System.GC]::Collect()
      # Clear standby list using EmptyStandbyList if available
      $rammap = "$env:TEMP\\RAMMap64.exe"
      if (Test-Path $rammap) { Start-Process $rammap -ArgumentList "-Ew" -Wait -WindowStyle Hidden }
      "Memory optimized"
    `
  },
  {
    id: 'disable-animations',
    title: t('opt_task_disable_animations_title'),
    description: t('opt_task_disable_animations_desc'),
    icon: Monitor,
    status: 'pending',
    impact: 'low',
    category: 'visual',
    command: `
      Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "UserPreferencesMask" -Value ([byte[]](0x90,0x12,0x03,0x80,0x10,0x00,0x00,0x00)) -Type Binary -Force
      Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop\\WindowMetrics" -Name "MinAnimate" -Value "0" -Force
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name "TaskbarAnimations" -Value 0 -Type DWord -Force
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2 -Type DWord -Force
      Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "MenuShowDelay" -Value "0" -Force
      "Animations disabled"
    `
  },
  {
    id: 'power-plan',
    title: t('opt_task_power_plan_title'),
    description: t('opt_task_power_plan_desc'),
    icon: Battery,
    status: 'pending',
    impact: 'high',
    category: 'performance',
    command: `
      # Create Ultimate Performance plan if not exists
      powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
      # Try to activate Ultimate Performance
      $plans = powercfg /list
      $ultimate = $plans | Select-String "Ultimate Performance" | ForEach-Object { if ($_ -match '([a-f0-9-]{36})') { $matches[1] } }
      if ($ultimate) {
        powercfg /setactive $ultimate
        "Ultimate Performance activated"
      } else {
        powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
        "High Performance activated"
      }
    `
  },
  {
    id: 'game-mode',
    title: t('opt_task_game_mode_title'),
    description: t('opt_task_game_mode_desc'),
    icon: Gamepad2,
    status: 'pending',
    impact: 'medium',
    category: 'gaming',
    command: `
      # Enable Game Mode
      New-Item -Path "HKCU:\\Software\\Microsoft\\GameBar" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AllowAutoGameMode" -Value 1 -Type DWord -Force
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force
      # Disable Game DVR
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
      New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" -Name "AllowGameDVR" -Value 0 -Type DWord -Force
      "Game mode enabled, DVR disabled"
    `
  },
  {
    id: 'disable-indexing',
    title: t('opt_task_disable_indexing_title'),
    description: t('opt_task_disable_indexing_desc'),
    icon: HardDrive,
    status: 'pending',
    impact: 'medium',
    category: 'performance',
    command: `
      Stop-Service -Name "WSearch" -Force -ErrorAction SilentlyContinue
      Set-Service -Name "WSearch" -StartupType Disabled -ErrorAction SilentlyContinue
      "Search indexing disabled"
    `
  },
  {
    id: 'optimize-cpu',
    title: t('opt_task_optimize_cpu_title'),
    description: t('opt_task_optimize_cpu_desc'),
    icon: Cpu,
    status: 'pending',
    impact: 'high',
    category: 'performance',
    command: `
      # Optimize for programs instead of background services
      Set-ItemProperty -Path "HKLM:\\SYSTEM\\CurrentControlSet\\Control\\PriorityControl" -Name "Win32PrioritySeparation" -Value 38 -Type DWord -Force
      # Disable core parking
      powercfg -setacvalueindex scheme_current sub_processor CPMINCORES 100
      powercfg -setactive scheme_current
      "CPU priority optimized"
    `
  },
  {
    id: 'disable-background-apps',
    title: t('opt_task_background_apps_title'),
    description: t('opt_task_background_apps_desc'),
    icon: Rocket,
    status: 'pending',
    impact: 'medium',
    category: 'startup',
    command: `
      # Disable background apps
      New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Force -ErrorAction SilentlyContinue | Out-Null
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -Type DWord -Force
      # Disable suggested content
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SubscribedContent-338388Enabled" -Value 0 -Type DWord -Force
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SubscribedContent-310093Enabled" -Value 0 -Type DWord -Force
      Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager" -Name "SilentInstalledAppsEnabled" -Value 0 -Type DWord -Force
      "Background apps disabled"
    `
  },
]);

const buildProfiles = (t: (key: any) => string) => ([
  {
    id: 'balanced',
    name: t('opt_profile_balanced_title'),
    description: t('opt_profile_balanced_desc'),
    icon: Battery,
    color: 'var(--cyan)'
  },
  {
    id: 'performance',
    name: t('opt_profile_performance_title'),
    description: t('opt_profile_performance_desc'),
    icon: Zap,
    color: 'var(--warning)'
  },
  {
    id: 'gaming',
    name: t('opt_profile_gaming_title'),
    description: t('opt_profile_gaming_desc'),
    icon: Gamepad2,
    color: 'var(--success)'
  },
]);

const TaskCard = ({
  task,
  onRun
}: {
  task: OptimizationTask;
  onRun: () => void;
}) => {
  const { t } = useI18n();
  const Icon = task.icon;

  const impactColors = {
    low: { bg: 'var(--success-bg)', color: 'var(--success)' },
    medium: { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    high: { bg: 'var(--danger-bg)', color: 'var(--danger)' }
  };

  const impact = impactColors[task.impact];

  const statusIcons = {
    pending: Clock,
    running: RefreshCw,
    completed: CheckCircle,
    skipped: AlertTriangle
  };

  const StatusIcon = statusIcons[task.status];

  return (
    <div className="control-card">
      <div className="flex items-center justify-between mb-md">
        <div
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: task.status === 'completed' ? 'var(--success-bg)' : 'var(--raised)',
            borderRadius: 'var(--radius-md)',
            color: task.status === 'completed' ? 'var(--success)' : 'var(--cyan)'
          }}
        >
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-sm">
          <span
            style={{
              fontSize: 'var(--text-xs)',
              padding: '2px 8px',
              background: impact.bg,
              color: impact.color,
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500
            }}
          >
            {task.impact === 'low' ? t('impact_low') : task.impact === 'medium' ? t('impact_medium') : t('impact_high')}
          </span>
        </div>
      </div>

      <h3 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: '4px' }}>
        {task.title}
      </h3>
      <p className="text-muted" style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-md)' }}>
        {task.description}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <StatusIcon
            size={14}
            color={task.status === 'completed' ? 'var(--success)' :
              task.status === 'running' ? 'var(--cyan)' : 'var(--text-50)'}
            className={task.status === 'running' ? 'spin' : ''}
          />
          <span className="text-muted" style={{ fontSize: 'var(--text-xs)', textTransform: 'capitalize' }}>
            {task.status === 'pending' ? t('status_pending') :
              task.status === 'running' ? t('status_running') :
                task.status === 'completed' ? t('status_completed') : t('status_skipped')}
          </span>
        </div>
        <button
          className="btn btn-primary"
          onClick={onRun}
          disabled={task.status === 'running' || task.status === 'completed'}
          style={{ padding: 'var(--space-xs) var(--space-md)' }}
        >
          {task.status === 'completed' ? (
            <>
              <CheckCircle size={14} />
              {t('done')}
            </>
          ) : task.status === 'running' ? (
            <>
              <RefreshCw size={14} className="spin" />
              {t('status_running')}
            </>
          ) : (
            <>
              <Play size={14} />
              {t('run')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function Optimization({ showToast }: OptimizationProps) {
  const { t } = useI18n();
  const [tasks, setTasks] = useState(buildInitialTasks(t));
  const [activeProfile, setActiveProfile] = useState('balanced');
  const [isRunningAll, setIsRunningAll] = useState(false);
  const profiles = buildProfiles(t);

  useEffect(() => {
    setTasks((prev) => {
      const base = buildInitialTasks(t);
      return base.map((task) => {
        const existing = prev.find((p) => p.id === task.id);
        return existing ? { ...task, status: existing.status } : task;
      });
    });
  }, [t]);

  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  const runTask = async (id: string) => {
    const task = tasks.find(tsk => tsk.id === id);
    if (!task) return;

    setTasks(prev => prev.map(tsk => tsk.id === id ? { ...tsk, status: 'running' as const } : tsk));

    try {
      if (task.command) {
        const result = await invoke('run_powershell', { command: task.command }) as string;
        if (result && result.startsWith('Error')) {
          throw new Error(result);
        }
      }
      setTasks(prev => prev.map(tsk => tsk.id === id ? { ...tsk, status: 'completed' as const } : tsk));
      showToast('success', t('task_completed'), task.title);
    } catch (error) {
      console.error('Optimization task failed:', error);
      setTasks(prev => prev.map(tsk => tsk.id === id ? { ...tsk, status: 'pending' as const } : tsk));

      let errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes("exit code 1") || errorMessage.includes("Access is denied")) {
        errorMessage = t('opt_error_access_denied') || "Access denied. Check antivirus or permissions.";
      }

      showToast('error', t('optimization_error'), errorMessage);
    }
  };

  const runAllTasks = async () => {
    setIsRunningAll(true);
    showToast('info', t('opt_running_all'), t('opt_running_all_desc'));

    for (const task of tasks.filter(t => t.status === 'pending')) {
      await runTask(task.id);
    }

    setIsRunningAll(false);
    showToast('success', t('opt_all_complete'), t('opt_all_complete_desc'));
  };

  const resetTasks = () => {
    setTasks(buildInitialTasks(t));
    showToast('info', t('opt_reset_title'), t('opt_reset_desc'));
  };

  const selectProfile = async (id: string) => {
    setActiveProfile(id);
    const profile = profiles.find(p => p.id === id);

    try {
      if (id === 'balanced') {
        await invoke('run_powershell', {
          command: `powercfg /setactive 381b4222-f694-41f0-9685-ff5bb260df2e`
        });
      } else if (id === 'performance') {
        await invoke('run_powershell', {
          command: `
            # Create and activate Ultimate Performance
            powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 2>$null
            $plans = powercfg /list
            $ultimate = $plans | Select-String "Ultimate Performance" | ForEach-Object { if ($_ -match '([a-f0-9-]{36})') { $matches[1] } }
            if ($ultimate) { powercfg /setactive $ultimate }
            else { powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c }
            # Visual effects for performance
            Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects" -Name "VisualFXSetting" -Value 2 -Type DWord -Force
          `
        });
      } else if (id === 'gaming') {
        await invoke('run_powershell', {
          command: `
            # High Performance power plan
            powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
            # Enable Game Mode
            New-Item -Path "HKCU:\\Software\\Microsoft\\GameBar" -Force -ErrorAction SilentlyContinue | Out-Null
            Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\GameBar" -Name "AutoGameModeEnabled" -Value 1 -Type DWord -Force
            # Disable Game DVR
            New-Item -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Force -ErrorAction SilentlyContinue | Out-Null
            Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\GameDVR" -Name "AppCaptureEnabled" -Value 0 -Type DWord -Force
            New-Item -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" -Force -ErrorAction SilentlyContinue | Out-Null
            Set-ItemProperty -Path "HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR" -Name "AllowGameDVR" -Value 0 -Type DWord -Force
            # Disable transparency for FPS
            Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" -Name "EnableTransparency" -Value 0 -Type DWord -Force
          `
        });
      }
      showToast('success', t('opt_profile_applied'), `${profile?.name} ${t('opt_profile_active')}`);
    } catch (error) {
      showToast('error', t('optimization_error'), String(error));
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('opt_title')}
          </h2>
          <p className="text-muted mt-sm">
            {t('opt_subtitle')}
          </p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary" onClick={resetTasks} disabled={isRunningAll}>
            {t('reset_all')}
          </button>
          <button className="btn btn-primary" onClick={runAllTasks} disabled={isRunningAll}>
            <Zap size={16} />
            {isRunningAll ? t('running') + '...' : t('run_all')}
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div
        className="control-card mb-lg"
        style={{
          padding: 'var(--space-xl)',
          background: 'linear-gradient(135deg, var(--surface) 0%, var(--elevated) 100%)'
        }}
      >
        <div className="flex items-center justify-between mb-lg">
          <div>
            <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: '4px' }}>
              {t('opt_progress')}
            </div>
            <div className="font-mono" style={{ fontSize: 'var(--text-3xl)', color: 'var(--cyan)' }}>
              {progress}%
            </div>
          </div>
          <div className="flex items-center gap-lg">
            <div>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('completed')}</div>
              <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--success)' }}>
                {completedCount}
              </div>
            </div>
            <div style={{ width: 1, height: 40, background: 'var(--glass-border)' }} />
            <div>
              <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('remaining')}</div>
              <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-90)' }}>
                {tasks.length - completedCount}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            height: 8,
            background: 'var(--deep)',
            borderRadius: 'var(--radius-full)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--cyan), var(--cyan-70))',
              borderRadius: 'var(--radius-full)',
              transition: 'width 0.5s ease-out',
              boxShadow: '0 0 10px var(--cyan)'
            }}
          />
        </div>
      </div>

      {/* Performance Profiles */}
      <div className="mb-lg">
        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-md)' }}>
          {t('opt_profiles')}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-md)' }}>
          {profiles.map((profile) => (
            <button
              key={profile.id}
              className="control-card"
              style={{
                padding: 'var(--space-lg)',
                cursor: 'pointer',
                border: activeProfile === profile.id ? `2px solid ${profile.color}` : '1px solid var(--glass-border)',
                background: activeProfile === profile.id ? `${profile.color}10` : 'var(--surface)'
              }}
              onClick={() => selectProfile(profile.id)}
            >
              <div className="flex items-center gap-md mb-md">
                <profile.icon size={24} color={profile.color} />
                <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{profile.name}</span>
              </div>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)', textAlign: 'left' }}>
                {profile.description}
              </p>
              {activeProfile === profile.id && (
                <div
                  className="flex items-center gap-sm mt-md"
                  style={{ color: profile.color, fontSize: 'var(--text-xs)' }}
                >
                  <CheckCircle size={14} />
                  {t('active')}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks Grid */}
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-md)' }}>
        {t('opt_tasks')}
      </h3>
      <div className="card-grid">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onRun={() => runTask(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

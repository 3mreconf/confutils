import { useState, useEffect } from 'react';
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
}

const buildInitialTasks = (t: (key: any) => string): OptimizationTask[] => ([
  {
    id: 'disable-startup',
    title: t('opt_task_disable_startup_title'),
    description: t('opt_task_disable_startup_desc'),
    icon: Rocket,
    status: 'pending',
    impact: 'high',
    category: 'startup'
  },
  {
    id: 'clear-temp',
    title: t('opt_task_clear_temp_title'),
    description: t('opt_task_clear_temp_desc'),
    icon: HardDrive,
    status: 'pending',
    impact: 'medium',
    category: 'performance'
  },
  {
    id: 'optimize-memory',
    title: t('opt_task_optimize_memory_title'),
    description: t('opt_task_optimize_memory_desc'),
    icon: MemoryStick,
    status: 'pending',
    impact: 'medium',
    category: 'performance'
  },
  {
    id: 'disable-animations',
    title: t('opt_task_disable_animations_title'),
    description: t('opt_task_disable_animations_desc'),
    icon: Monitor,
    status: 'pending',
    impact: 'low',
    category: 'visual'
  },
  {
    id: 'power-plan',
    title: t('opt_task_power_plan_title'),
    description: t('opt_task_power_plan_desc'),
    icon: Battery,
    status: 'pending',
    impact: 'high',
    category: 'performance'
  },
  {
    id: 'game-mode',
    title: t('opt_task_game_mode_title'),
    description: t('opt_task_game_mode_desc'),
    icon: Gamepad2,
    status: 'pending',
    impact: 'medium',
    category: 'gaming'
  },
  {
    id: 'disable-indexing',
    title: t('opt_task_disable_indexing_title'),
    description: t('opt_task_disable_indexing_desc'),
    icon: HardDrive,
    status: 'pending',
    impact: 'medium',
    category: 'performance'
  },
  {
    id: 'optimize-cpu',
    title: t('opt_task_optimize_cpu_title'),
    description: t('opt_task_optimize_cpu_desc'),
    icon: Cpu,
    status: 'pending',
    impact: 'low',
    category: 'performance'
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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'running' as const } : t));

    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' as const } : t));

    const task = tasks.find(t => t.id === id);
    showToast('success', t('task_completed'), task?.title);
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

  const selectProfile = (id: string) => {
    setActiveProfile(id);
    const profile = profiles.find(p => p.id === id);
    showToast('success', t('opt_profile_applied'), `${profile?.name} ${t('opt_profile_active')}`);
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

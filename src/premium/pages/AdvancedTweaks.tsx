import { useMemo, useState, useEffect } from 'react';
import { Filter, Play, Undo2, Search, CheckCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import tweaksRaw from '../data/toolbox_tweaks.json';
import { SelectMenu } from '../components/SelectMenu';

interface AdvancedTweaksProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  compact?: boolean;
  externalQuery?: string;
}

type RegistryItem = {
  Path: string;
  Name: string;
  Type: string;
  Value: string;
  OriginalValue?: string;
};

type ServiceItem = {
  Name: string;
  StartupType: string;
  OriginalType?: string;
};

type TweakItem = {
  Content: string;
  Description?: string;
  category?: string;
  panel?: string;
  Order?: string;
  registry?: RegistryItem[];
  service?: ServiceItem[];
  InvokeScript?: string[];
  UndoScript?: string[];
  link?: string;
};

const tweaks = tweaksRaw as Record<string, TweakItem>;

const buildRegistryScript = (items?: RegistryItem[], undo = false) => {
  if (!items || items.length === 0) return '';
  const lines: string[] = [];
  for (const item of items) {
    const path = item.Path;
    const name = item.Name;
    const value = undo ? item.OriginalValue : item.Value;
    const type = item.Type || 'String';
    if (!path || !name) continue;
    if (value === '<RemoveEntry>') {
      lines.push(`Remove-ItemProperty -Path "${path}" -Name "${name}" -ErrorAction SilentlyContinue`);
    } else {
      lines.push(`if (-not (Test-Path "${path}")) { New-Item -Path "${path}" -Force | Out-Null }`);
      lines.push(`Set-ItemProperty -Path "${path}" -Name "${name}" -Type ${type} -Value "${value}" -Force`);
    }
  }
  return lines.join('\n');
};

const buildServiceScript = (items?: ServiceItem[], undo = false) => {
  if (!items || items.length === 0) return '';
  const lines: string[] = [];
  for (const item of items) {
    const name = item.Name;
    const type = undo ? item.OriginalType : item.StartupType;
    if (!name || !type) continue;
    lines.push(`Set-Service -Name "${name}" -StartupType ${type} -ErrorAction SilentlyContinue`);
  }
  return lines.join('\n');
};

const buildInvokeScript = (items?: string[]) => (items && items.length ? items.join('\n') : '');

const buildCommand = (tweak: TweakItem, undo = false) => {
  const reg = buildRegistryScript(tweak.registry, undo);
  const svc = buildServiceScript(tweak.service, undo);
  const script = undo ? tweak.UndoScript : tweak.InvokeScript;
  const invoke = buildInvokeScript(script);
  return [reg, svc, invoke].filter(Boolean).join('\n');
};

const buildStatusScript = (tweak: TweakItem) => {
  const lines: string[] = [];
  const hasRegistry = !!(tweak.registry && tweak.registry.length);
  const hasService = !!(tweak.service && tweak.service.length);
  if (!hasRegistry && !hasService) return '';
  lines.push('$ok = $true');

  if (tweak.registry) {
    for (const item of tweak.registry) {
      const path = item.Path;
      const name = item.Name;
      const value = item.Value;
      if (!path || !name) continue;
      if (value === '<RemoveEntry>') {
        lines.push(
          `if (Get-ItemProperty -Path "${path}" -Name "${name}" -ErrorAction SilentlyContinue) { $ok = $false }`
        );
      } else {
        lines.push(`$val = (Get-ItemProperty -Path "${path}" -ErrorAction SilentlyContinue)."${name}"`);
        lines.push(
          `if ($null -eq $val -or ("$val" -ne "${value}")) { $ok = $false }`
        );
      }
    }
  }

  if (tweak.service) {
    for (const item of tweak.service) {
      const name = item.Name;
      const type = item.StartupType;
      if (!name || !type) continue;
      lines.push(`$svc = Get-Service -Name "${name}" -ErrorAction SilentlyContinue`);
      lines.push(
        `if ($null -eq $svc -or $svc.StartType.ToString() -ne "${type}") { $ok = $false }`
      );
    }
  }

  lines.push('if ($ok) { "APPLIED" } else { "NOT" }');
  return lines.join('\n');
};

const getRiskLevel = (category?: string) => {
  const label = (category || '').toLowerCase();
  if (label.includes('caution') || label.includes('danger') || label.includes('advanced') || label.includes('z__advanced')) {
    return 'high';
  }
  if (label.includes('privacy') || label.includes('debloat') || label.includes('performance')) {
    return 'medium';
  }
  return 'low';
};

export default function AdvancedTweaks({ showToast, compact, externalQuery }: AdvancedTweaksProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<Record<string, 'unknown' | 'applied' | 'ready' | 'checking'>>({});

  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  const categoryLabel = (value?: string) => {
    const raw = (value || 'Other').replace(/^z__+/i, '').replace(/_/g, ' ').trim();
    return raw || 'Other';
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    Object.values(tweaks).forEach((tweak) => set.add(tweak.category || 'Other'));
    const normalized = Array.from(set).map((c) =>
      c ? c.replace(/^z__+/i, '').replace(/_/g, ' ') : c
    );
    const unique = Array.from(new Set(normalized.map((c) => c || 'Other')));
    return ['all', ...unique.sort()];
  }, []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(tweaks)
      .map(([id, tweak]) => ({
        id,
        ...tweak,
        _category: (tweak.category || 'Other').replace(/^z__+/i, '').replace(/_/g, ' ')
      }))
      .filter((t) => (category === 'all' ? true : t._category === category))
      .filter((t) =>
        q
          ? (t.Content || '').toLowerCase().includes(q) ||
            (t.Description || '').toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (a.Order || '').localeCompare(b.Order || ''));
  }, [query, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof list>();
    list.forEach((item) => {
      const key = item._category || 'Other';
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    });
    return Array.from(map.entries()).map(([group, items]) => ({
      group,
      items
    }));
  }, [list]);

  const run = async (id: string, undo = false) => {
    const tweak = tweaks[id];
    if (!tweak) return;
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      const cmd = buildCommand(tweak, undo);
      if (!cmd) throw new Error('No script to run');
      await invoke('run_powershell', { command: cmd });
      showToast('success', t('tweaks_done' as any), tweak.Content);
      setStatus((prev) => ({ ...prev, [id]: undo ? 'ready' : 'applied' }));
    } catch (err: any) {
      showToast('error', t('tweaks_failed' as any), String(err));
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  const checkStatus = async (id: string) => {
    const tweak = tweaks[id];
    if (!tweak) return;
    const cmd = buildStatusScript(tweak);
    if (!cmd) {
      setStatus((prev) => ({ ...prev, [id]: 'unknown' }));
      return;
    }
    setStatus((prev) => ({ ...prev, [id]: 'checking' }));
    try {
      const result = await invoke('run_powershell', { command: cmd });
      const normalized = String(result || '').trim().toLowerCase();
      setStatus((prev) => ({ ...prev, [id]: normalized === 'applied' ? 'applied' : 'ready' }));
    } catch (err: any) {
      setStatus((prev) => ({ ...prev, [id]: 'unknown' }));
      showToast('error', t('tweaks_failed' as any), String(err));
    }
  };

  return (
    <div>
      {!compact && (
        <div className="mb-lg">
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('advanced_tweaks_title' as any)}
        </h2>
        <p className="text-muted mt-sm">{t('advanced_tweaks_subtitle' as any)}</p>
        </div>
      )}

      <div className="flex items-center gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
        <div className="search-input" style={{ flex: 1, minWidth: 220 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('tweaks_search' as any)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-sm">
          <Filter size={16} className="opacity-60" />
          <SelectMenu
            value={category}
            options={categories.map((c) => ({
              value: c,
              label: c === 'all' ? t('tweaks_all' as any) : categoryLabel(c)
            }))}
            onChange={(next) => setCategory(next)}
          />
        </div>
      </div>

      <div className="tweaks-group-list">
        {grouped.map((group) => (
          <div key={group.group} className="tweaks-group">
            <div className="tweaks-group-header">
              <span className="tweaks-group-title">{categoryLabel(group.group)}</span>
              <span className="tweaks-group-count">{group.items.length} {t('tweaks_items' as any)}</span>
            </div>
            <div className="card-grid">
              {group.items.map((item) => {
                const risk = getRiskLevel(item._category);
                const statusValue = status[item.id] || 'unknown';
                const statusLabel =
                  statusValue === 'applied'
                    ? t('tweak_status_applied' as any)
                    : statusValue === 'ready'
                    ? t('tweak_status_ready' as any)
                    : statusValue === 'checking'
                    ? t('tweak_status_processing' as any)
                    : t('tweaks_status_unknown' as any);
                const riskLabel =
                  risk === 'high' ? t('risk_high' as any) : risk === 'medium' ? t('risk_medium' as any) : t('risk_low' as any);
                const riskClass = risk === 'high' ? 'error' : risk === 'medium' ? 'warning' : '';
                return (
                <div key={item.id} className="control-card">
                  <div className="card-header">
                    <div className="card-icon-wrapper cyan">
                      <Filter size={22} />
                    </div>
                    <div className="flex items-center gap-sm">
                      <div className={`card-status ${riskClass}`}>
                        <span className="card-status-dot" />
                        {riskLabel}
                      </div>
                    </div>
                  </div>
                  <h3 className="card-title">{item.Content}</h3>
                  <p className="card-description">{item.Description}</p>
                  <div className="card-footer">
                    <span className="card-meta">{statusLabel}</span>
                    <div className="flex gap-sm">
                      <button
                        className="btn btn-ghost"
                        onClick={() => checkStatus(item.id)}
                        disabled={statusValue === 'checking' || !!processing[item.id]}
                      >
                        <CheckCircle size={14} />
                        {t('tweaks_check' as any)}
                      </button>
                      <button
                        className="btn btn-ghost"
                        onClick={() => run(item.id, true)}
                        disabled={!!processing[item.id]}
                      >
                        <Undo2 size={14} />
                        {t('tweaks_undo' as any)}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => run(item.id, false)}
                        disabled={!!processing[item.id]}
                      >
                        <Play size={14} />
                        {processing[item.id] ? t('tweaks_applying' as any) : t('tweaks_apply' as any)}
                      </button>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



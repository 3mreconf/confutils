import { useMemo, useState } from 'react';
import { Layers, Play, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import presetsRaw from '../data/toolbox_presets.json';
import tweaksRaw from '../data/toolbox_tweaks.json';

interface PresetsProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  compact?: boolean;
}

type Presets = Record<string, string[]>;
type TweakItem = {
  Content: string;
  Description?: string;
  category?: string;
  registry?: { Path: string; Name: string; Type: string; Value: string; OriginalValue?: string }[];
  service?: { Name: string; StartupType: string; OriginalType?: string }[];
  InvokeScript?: string[];
  UndoScript?: string[];
};

const presets = presetsRaw as Presets;
const tweaks = tweaksRaw as Record<string, TweakItem>;

const buildRegistryScript = (items: TweakItem['registry'], undo = false) => {
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

const buildServiceScript = (items: TweakItem['service'], undo = false) => {
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

const runTweak = async (tweak: TweakItem, undo = false) => {
  const reg = buildRegistryScript(tweak.registry, undo);
  const svc = buildServiceScript(tweak.service, undo);
  const script = undo ? tweak.UndoScript : tweak.InvokeScript;
  const invoke = buildInvokeScript(script);
  return [reg, svc, invoke].filter(Boolean).join('\n');
};

export default function Presets({ showToast, compact }: PresetsProps) {
  const { t } = useI18n();
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [savedPresets, setSavedPresets] = useState<Record<string, string[]>>({});

  const presetList = useMemo(() => Object.entries(presets), []);

  const applyPreset = async (name: string, ids: string[]) => {
    setProcessing((p) => ({ ...p, [name]: true }));
    try {
      const scripts: string[] = [];
      for (const id of ids) {
        const tweak = tweaks[id];
        if (!tweak) continue;
        const cmd = await runTweak(tweak, false);
        if (cmd) scripts.push(cmd);
      }
      if (scripts.length === 0) throw new Error('No scripts to run');
      await invoke('run_powershell', { command: scripts.join('\n') });
      showToast('success', t('presets_done' as any), name);
    } catch (err: any) {
      showToast('error', t('presets_failed' as any), String(err));
    } finally {
      setProcessing((p) => ({ ...p, [name]: false }));
    }
  };

  const formatPresetSummary = (ids: string[]) => {
    const names = ids.map((id) => tweaks[id]?.Content || id);
    if (names.length <= 6) return names.join(', ');
    const head = names.slice(0, 6).join(', ');
    const extra = names.length - 6;
    return `${head} +${extra} ${t('presets_more' as any)}`;
  };

  const deletePreset = (name: string) => {
    const next = { ...savedPresets };
    delete next[name];
    setSavedPresets(next);
  };

  return (
    <div>
      {!compact && (
        <div className="mb-lg">
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('presets_title' as any)}
          </h2>
          <p className="text-muted mt-sm">{t('presets_subtitle' as any)}</p>
        </div>
      )}

      {!compact && (
        <div className="list-container mb-lg">
        <div className="list-header">
          <span className="list-title">{t('presets_title' as any)}</span>
          <span className="list-count">{presetList.length} {t('presets_items' as any)}</span>
        </div>
        <div className="flex items-center gap-md mt-sm" style={{ flexWrap: 'wrap' }}>
          <span className="card-meta">{t('presets_custom_title' as any)}: {Object.keys(savedPresets).length}</span>
          <span className="card-meta">{t('tweaks_all' as any)}: {Object.keys(tweaks).length}</span>
        </div>
        </div>
      )}

      <div className="card-grid">
        {presetList.map(([name, ids]) => (
          <div key={name} className="control-card">
            <div className="card-header">
              <div className="card-icon-wrapper cyan">
                <Layers size={22} />
              </div>
              <div className="card-status info">
                <span className="card-status-dot" />
                {ids.length} {t('presets_items' as any)}
              </div>
            </div>
            <h3 className="card-title">{name}</h3>
            <p className="card-description">
              {formatPresetSummary(ids)}
            </p>
            <div className="card-footer">
              <button
                className="btn btn-primary"
                onClick={() => applyPreset(name, ids)}
                disabled={!!processing[name]}
              >
                <Play size={14} />
                {processing[name] ? t('presets_applying' as any) : t('presets_apply' as any)}
              </button>
            </div>
          </div>
        ))}
      </div>

      {Object.keys(savedPresets).length > 0 && (
        <div className={compact ? 'mt-lg' : 'list-container mt-lg'}>
          {!compact && (
            <div className="list-header">
              <span className="list-title">{t('presets_custom_title' as any)}</span>
              <span className="list-count">{Object.keys(savedPresets).length} {t('presets_custom_saved' as any)}</span>
            </div>
          )}
          <div className="card-grid mt-md">
            {Object.entries(savedPresets).map(([name, ids]) => (
              <div key={name} className="control-card">
                <div className="card-header">
                  <div className="card-icon-wrapper cyan">
                    <Layers size={22} />
                  </div>
                  <div className="card-status info">
                    <span className="card-status-dot" />
                    {ids.length} {t('presets_items' as any)}
                  </div>
                </div>
                <h3 className="card-title">{name}</h3>
                <p className="card-description">
                  {formatPresetSummary(ids)}
                </p>
                <div className="card-footer">
                  <button className="btn btn-ghost" onClick={() => deletePreset(name)}>
                    <Trash2 size={14} />
                    {t('presets_delete' as any)}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => applyPreset(name, ids)}
                    disabled={!!processing[name]}
                  >
                    <Play size={14} />
                    {processing[name] ? t('presets_applying' as any) : t('presets_apply' as any)}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



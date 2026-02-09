import { useMemo, useState, useEffect } from 'react';
import { Download, ExternalLink, Search, Sparkles, Flame, CheckSquare, Square } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import appsRawEn from '../data/toolbox_applications.json';
import { SelectMenu } from '../components/SelectMenu';

interface AppCatalogProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  compact?: boolean;
  externalQuery?: string;
}

type AppItem = {
  category: string;
  choco?: string;
  content: string;
  description: string;
  link?: string;
  winget?: string;
};

type AppRecord = Record<string, AppItem>;


export default function AppCatalog({ showToast, compact, externalQuery }: AppCatalogProps) {
  const { t } = useI18n();
  const apps = useMemo(() => appsRawEn as AppRecord, []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [showRecommended, setShowRecommended] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState<Record<string, boolean>>({});
  const [bulkMode, setBulkMode] = useState<'install' | 'upgrade' | 'uninstall' | null>(null);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [showInstalledOnly, setShowInstalledOnly] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [showNotInstalledOnly, setShowNotInstalledOnly] = useState(false);
  const [lastFailures, setLastFailures] = useState<string[]>([]);
  const [autoChecked, setAutoChecked] = useState(false);

  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  const recommendedIds = useMemo(
    () => new Set([
      '7zip',
      'notepadplusplus',
      'vscode',
      'git',
      'vlc',
      'firefox',
      'brave',
      'winrar',
      'hwinfo',
      'rufus'
    ]),
    []
  );

  const topIds = useMemo(
    () => new Set([
      'chrome',
      'vscode',
      'discord',
      'steam',
      'spotify',
      'vlc',
      '7zip',
      'obs',
      'notepadplusplus',
      'git'
    ]),
    []
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    Object.values(apps).forEach((app) => set.add(app.category || 'Other'));
    return ['all', ...Array.from(set).sort()];
  }, [apps]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(apps)
      .map(([id, app]) => ({ id, ...app }))
      .filter((app) => (showRecommended ? recommendedIds.has(app.id) : true))
      .filter((app) => (showTop ? topIds.has(app.id) : true))
      .filter((app) => (showInstalledOnly ? installed[app.id] : true))
      .filter((app) => (showNotInstalledOnly ? !installed[app.id] : true))
      .filter((app) => (category === 'all' ? true : app.category === category))
      .filter((app) =>
        q
          ? app.content.toLowerCase().includes(q) ||
            app.description.toLowerCase().includes(q) ||
            (app.winget || '').toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => a.content.localeCompare(b.content));
  }, [query, category, showRecommended, showTop, showInstalledOnly, showNotInstalledOnly, installed, recommendedIds, topIds, apps]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const next: Record<string, boolean> = {};
    list.forEach((app) => {
      next[app.id] = true;
    });
    setSelected(next);
  };

  const selectInstalled = () => {
    const next: Record<string, boolean> = {};
    list.forEach((app) => {
      if (installed[app.id]) next[app.id] = true;
    });
    setSelected(next);
  };

  const selectNotInstalled = () => {
    const next: Record<string, boolean> = {};
    list.forEach((app) => {
      if (!installed[app.id]) next[app.id] = true;
    });
    setSelected(next);
  };

  const invertSelection = () => {
    const next: Record<string, boolean> = {};
    list.forEach((app) => {
      next[app.id] = !selected[app.id];
    });
    setSelected(next);
  };

  const clearSelection = () => {
    setSelected({});
  };

  const bulkAction = async (mode: 'install' | 'upgrade' | 'uninstall', forceIds?: string[]) => {
    const items = list.filter((app) => {
      if (forceIds && forceIds.length) return forceIds.includes(app.id) && app.winget;
      return selected[app.id] && app.winget;
    });
    if (items.length === 0) {
      showToast('warning', t('apps_no_selection' as any));
      return;
    }
    setBulkMode(mode);
    setBulkTotal(items.length);
    setBulkProgress(0);
    const failures: string[] = [];
    try {
      for (const app of items) {
        const id = app.winget as string;
        const cmd =
          mode === 'install'
            ? `winget install --id "${id}" --exact --accept-package-agreements --accept-source-agreements --silent`
            : mode === 'upgrade'
            ? `winget upgrade --id "${id}" --exact --accept-package-agreements --accept-source-agreements --silent`
            : `winget uninstall --id "${id}" --exact --silent`;
        try {
          setLogLines((prev) => [...prev, `[${mode.toUpperCase()}] ${app.content} (${id})`]);
          const out = await invoke('run_powershell', { command: cmd });
          if (out) {
            setLogLines((prev) => [...prev, String(out).trim()].filter(Boolean));
          }
          if (mode === 'install') {
            setInstalled((prev) => ({ ...prev, [app.id]: true }));
          }
          if (mode === 'uninstall') {
            setInstalled((prev) => ({ ...prev, [app.id]: false }));
          }
        } catch {
          failures.push(app.content);
          setLogLines((prev) => [...prev, `[ERROR] ${app.content}`]);
        } finally {
          setBulkProgress((p) => p + 1);
        }
      }
      if (failures.length > 0) {
        setLastFailures(items.filter((a) => failures.includes(a.content)).map((a) => a.id));
        showToast('warning', t('apps_bulk_failed' as any), failures.join(', '));
      } else {
        setLastFailures([]);
        showToast('success', t('apps_bulk_done' as any), t(`apps_bulk_${mode}` as any));
      }
    } catch (err: any) {
      showToast('error', t('apps_bulk_failed' as any), String(err));
    } finally {
      setBulkMode(null);
    }
  };

  const checkInstalled = async (scopeIds?: string[]) => {
    const scope = scopeIds && scopeIds.length ? scopeIds : selectedIds.length ? selectedIds : list.map((app) => app.id);
    const ids = scope
      .map((id) => apps[id]?.winget)
      .filter(Boolean) as string[];
    if (ids.length === 0) {
      showToast('warning', t('apps_no_selection' as any));
      return;
    }
    const script = `
$ids = @(${ids.map((id) => `'${id.replace(/'/g, "''")}'`).join(',')})
$result = @{}
foreach ($id in $ids) {
  $out = winget list --id "$id" --exact --source winget | Out-String
  if ($out -match 'No installed package') { $result[$id] = $false } else { $result[$id] = $true }
}
$result | ConvertTo-Json -Compress
    `.trim();
    try {
      const out = await invoke('run_powershell', { command: script });
      const parsed = JSON.parse(String(out || '{}')) as Record<string, boolean>;
      const next: Record<string, boolean> = { ...installed };
      Object.entries(parsed).forEach(([wingetId, value]) => {
        const appId = Object.keys(apps).find((key) => apps[key]?.winget === wingetId);
        if (appId) next[appId] = value;
      });
      setInstalled(next);
      showToast('success', t('apps_installed_checked' as any));
    } catch (err: any) {
      showToast('error', t('apps_installed_failed' as any), String(err));
    }
  };

  useEffect(() => {
    if (autoChecked) return;
    const ids = Array.from(recommendedIds);
    if (ids.length === 0) return;
    setAutoChecked(true);
    checkInstalled(ids);
  }, [autoChecked, recommendedIds]);

  const showInstalledOnlyToggle = () => {
    setShowInstalledOnly((prev) => !prev);
    setShowNotInstalledOnly(false);
  };

  const showNotInstalledOnlyToggle = () => {
    setShowNotInstalledOnly((prev) => !prev);
    setShowInstalledOnly(false);
  };

  const retryFailures = () => {
    if (!lastFailures.length) return;
    bulkAction('install', lastFailures);
  };

  const clearFailures = () => {
    setLastFailures([]);
  };

  const clearLog = () => {
    setLogLines([]);
  };

  const copyLog = async () => {
    if (logLines.length === 0) return;
    try {
      await invoke('run_powershell', {
        command: `Set-Clipboard -Value @'\n${logLines.join('\n').replace(/'/g, "''")}\n'@`
      });
      showToast('success', t('apps_log_copied' as any));
    } catch (err: any) {
      showToast('error', t('apps_log_copy_failed' as any), String(err));
    }
  };

  const exportLog = async () => {
    if (logLines.length === 0) return;
    try {
      const content = logLines.join('\n').replace(/\"/g, '""');
      const script = `
$path = Join-Path $env:TEMP "confutils-toolbox-log.txt"
@"
${content}
"@ | Set-Content -Path $path -Encoding UTF8
Start-Process "explorer.exe" -ArgumentList ("/select," + '\"' + $path + '\"')
      `.trim();
      await invoke('run_powershell', { command: script });
      showToast('success', t('apps_log_exported' as any));
    } catch (err: any) {
      showToast('error', t('apps_log_export_failed' as any), String(err));
    }
  };

  const install = async (app: AppItem & { id: string }) => {
    if (!app.winget) {
      showToast('warning', t('apps_no_winget' as any), app.content);
      return;
    }
    setProcessing((p) => ({ ...p, [app.id]: true }));
    try {
      const cmd = `winget install --id "${app.winget}" --exact --accept-package-agreements --accept-source-agreements --silent`;
      await invoke('run_powershell', { command: cmd });
      showToast('success', t('apps_install_done' as any), app.content);
    } catch (err: any) {
      showToast('error', t('apps_install_failed' as any), String(err));
    } finally {
      setProcessing((p) => ({ ...p, [app.id]: false }));
    }
  };

  const openLink = async (url?: string) => {
    if (!url) return;
    try {
      await invoke('run_powershell', { command: `Start-Process "${url}"` });
    } catch {
      // ignore
    }
  };

  return (
    <div>
      {!compact && (
        <div className="mb-lg">
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('apps_title' as any)}
        </h2>
        <p className="text-muted mt-sm">{t('apps_subtitle' as any)}</p>
        </div>
      )}

      {!compact && (
        <div className="list-container mb-lg">
        <div className="list-header">
          <span className="list-title">{t('apps_summary' as any)}</span>
          <span className="list-count">{list.length} / {Object.keys(apps).length} {t('apps_filtered' as any)}</span>
        </div>
        <div className="flex items-center gap-md mt-sm" style={{ flexWrap: 'wrap' }}>
          <span className="card-meta">{t('apps_total' as any)}: {Object.keys(apps).length}</span>
          <span className="card-meta">{t('apps_installed_count' as any)}: {Object.values(installed).filter(Boolean).length}</span>
          <span className="card-meta">{t('apps_selected_count' as any)}: {selectedIds.length}</span>
        </div>
        </div>
      )}

      <div className={compact ? 'mb-lg' : 'list-container mb-lg'}>
        {!compact && (
          <div className="list-header">
            <span className="list-title">{t('filter_all' as any)}</span>
            <span className="list-count">{t('apps_search' as any)}</span>
          </div>
        )}
        <div className={compact ? 'flex items-center gap-md' : 'flex items-center gap-md mt-sm'} style={{ flexWrap: 'wrap' }}>
        <div className="search-input" style={{ flex: 1, minWidth: 220 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('apps_search' as any)}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button
          className={`btn ${showRecommended ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowRecommended((v) => !v)}
        >
          <Sparkles size={14} />
          {t('apps_recommended' as any)}
        </button>
        <button
          className={`btn ${showTop ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setShowTop((v) => !v)}
        >
          <Flame size={14} />
          {t('apps_top' as any)}
        </button>
        <button
          className={`btn ${showInstalledOnly ? 'btn-primary' : 'btn-ghost'}`}
          onClick={showInstalledOnlyToggle}
        >
          {t('apps_filter_installed' as any)}
        </button>
        <button
          className={`btn ${showNotInstalledOnly ? 'btn-primary' : 'btn-ghost'}`}
          onClick={showNotInstalledOnlyToggle}
        >
          {t('apps_filter_not_installed' as any)}
        </button>
        <SelectMenu
          value={category}
          options={categories.map((c) => ({
            value: c,
            label: c === 'all' ? t('apps_all' as any) : c
          }))}
          onChange={(next) => setCategory(next)}
        />
        </div>
      </div>

      <div className={compact ? 'mb-lg' : 'list-container mb-lg'}>
        {!compact && (
          <div className="list-header">
            <span className="list-title">{t('apps_selection' as any)}</span>
            <span className="list-count">{selectedIds.length} {t('apps_selected' as any)}</span>
          </div>
        )}
        <div className={compact ? 'flex items-center gap-sm' : 'flex items-center gap-sm mt-sm'} style={{ flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" onClick={selectAll}>
            <CheckSquare size={14} />
            {t('apps_select_all' as any)}
          </button>
          <button className="btn btn-ghost" onClick={selectInstalled}>
            <CheckSquare size={14} />
            {t('apps_select_installed' as any)}
          </button>
          <button className="btn btn-ghost" onClick={selectNotInstalled}>
            <CheckSquare size={14} />
            {t('apps_select_not_installed' as any)}
          </button>
          <button className="btn btn-ghost" onClick={invertSelection}>
            <Square size={14} />
            {t('apps_invert_selection' as any)}
          </button>
          <button className="btn btn-ghost" onClick={clearSelection}>
            <Square size={14} />
            {t('apps_clear' as any)}
          </button>
          <button className="btn btn-ghost" onClick={() => checkInstalled()} disabled={bulkMode !== null}>
            {t('apps_check_installed' as any)}
          </button>
          <button className="btn btn-secondary" onClick={retryFailures} disabled={!lastFailures.length || bulkMode !== null}>
            {t('apps_retry_failures' as any)}
          </button>
          <button className="btn btn-ghost" onClick={clearFailures} disabled={!lastFailures.length}>
            {t('apps_clear_failures' as any)}
          </button>
          <button className="btn btn-primary" onClick={() => bulkAction('install')}>
            {t('apps_bulk_install' as any)}
          </button>
          <button className="btn btn-secondary" onClick={() => bulkAction('upgrade')}>
            {t('apps_bulk_upgrade' as any)}
          </button>
          <button className="btn btn-ghost" onClick={() => bulkAction('uninstall')}>
            {t('apps_bulk_uninstall' as any)}
          </button>
          {bulkMode && (
            <span className="card-meta">
              {t('apps_bulk_progress' as any)} {bulkProgress}/{bulkTotal}
            </span>
          )}
        </div>
      </div>

      {logLines.length > 0 && !compact && (
        <div className="list-container mb-lg">
          <div className="list-header">
            <span className="list-title">{t('apps_log_title' as any)}</span>
            <span className="list-count">{logLines.length}</span>
          </div>
          <div className="flex items-center gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={clearLog}>
              {t('apps_log_clear' as any)}
            </button>
            <button className="btn btn-ghost" onClick={copyLog}>
              {t('apps_log_copy' as any)}
            </button>
            <button className="btn btn-ghost" onClick={exportLog}>
              {t('apps_log_export' as any)}
            </button>
          </div>
          <pre className="code-block" style={{ maxHeight: 240, overflow: 'auto' }}>
            <code>{logLines.join('\n')}</code>
          </pre>
        </div>
      )}

      <div className="card-grid">
        {list.map((app) => (
          <div key={app.id} className="control-card">
            <div className="card-header">
              <div className="card-icon-wrapper cyan">
                <Download size={22} />
              </div>
              <div className="flex items-center gap-sm">
                <div className="card-status info">
                  <span className="card-status-dot" />
                  {app.category}
                </div>
                {installed[app.id] && (
                  <div className="card-status">
                    <span className="card-status-dot" />
                    {t('apps_installed' as any)}
                  </div>
                )}
                <label className="card-status customize" style={{ cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!!selected[app.id]}
                    onChange={() => toggleSelect(app.id)}
                    style={{ marginRight: 6 }}
                  />
                  {t('apps_pick' as any)}
                </label>
              </div>
            </div>
            <h3 className="card-title">{app.content}</h3>
            <p className="card-description">{app.description}</p>
            <div className="card-footer">
              {app.link && (
                <button className="btn btn-ghost" onClick={() => openLink(app.link)}>
                  <ExternalLink size={14} />
                  {t('apps_site' as any)}
                </button>
              )}
              <button
                className="btn btn-primary"
                onClick={() => install(app)}
                disabled={!!processing[app.id]}
              >
                {processing[app.id] ? t('apps_installing' as any) : t('apps_install' as any)}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}




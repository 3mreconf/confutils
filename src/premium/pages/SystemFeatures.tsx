import { useMemo, useState, useEffect } from 'react';
import { Wrench, Play, Filter, Search } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';
import featuresRaw from '../data/toolbox_features.json';
import { SelectMenu } from '../components/SelectMenu';

interface SystemFeaturesProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
  compact?: boolean;
  externalQuery?: string;
}

type FeatureItem = {
  Content: string;
  Description?: string;
  category?: string;
  panel?: string;
  Order?: string;
  feature?: string[];
  InvokeScript?: string[];
  Type?: string;
  link?: string;
};

const features = featuresRaw as Record<string, FeatureItem>;

const buildFeatureScript = (item: FeatureItem) => {
  const lines: string[] = [];
  if (item.feature && item.feature.length > 0) {
    for (const feat of item.feature) {
      if (!feat) continue;
      lines.push(`Enable-WindowsOptionalFeature -Online -FeatureName "${feat}" -All -NoRestart -ErrorAction Stop`);
    }
  }
  if (item.InvokeScript && item.InvokeScript.length > 0) {
    lines.push(item.InvokeScript.join('\n'));
  }
  return lines.filter(Boolean).join('\n').trim();
};

const getCustomCommand = (id: string) => {
  switch (id) {
    case 'WPFPanelAutologin':
      return 'Start-Process "netplwiz"';
    case 'WPFPanelControl':
      return 'Start-Process "control"';
    case 'WPFPanelComputer':
      return 'Start-Process "compmgmt.msc"';
    case 'WPFPanelNetwork':
      return 'Start-Process "ncpa.cpl"';
    case 'WPFPanelPower':
      return 'Start-Process "powercfg.cpl"';
    case 'WPFPanelPrinter':
      return 'Start-Process "control.exe" -ArgumentList "printers"';
    case 'WPFPanelRegion':
      return 'Start-Process "intl.cpl"';
    case 'WPFPanelRestore':
      return 'Start-Process "rstrui.exe"';
    case 'WPFPanelSound':
      return 'Start-Process "mmsys.cpl"';
    case 'WPFPanelSystem':
      return 'Start-Process "SystemPropertiesAdvanced"';
    case 'WPFPanelTimedate':
      return 'Start-Process "timedate.cpl"';
    case 'WPFPanelDISM':
      return 'dism /Online /Cleanup-Image /RestoreHealth\nsfc /scannow';
    case 'WPFFixesNetwork':
      return 'ipconfig /flushdns\nnetsh winsock reset\nnetsh int ip reset\nnetsh winhttp reset proxy';
    case 'WPFFixesUpdate':
      return `
Stop-Service -Name BITS,wuauserv,appidsvc,cryptsvc -Force -ErrorAction SilentlyContinue
Rename-Item $env:systemroot\\SoftwareDistribution\\Download Download.bak -ErrorAction SilentlyContinue
Rename-Item $env:systemroot\\System32\\catroot2 catroot2.bak -ErrorAction SilentlyContinue
Start-Service -Name BITS,wuauserv,appidsvc,cryptsvc -ErrorAction SilentlyContinue
wuauclt /resetauthorization /detectnow
usoclient StartScan
      `.trim();
    case 'WPFFixesWinget':
      return `
try {
  winget source reset --force | Out-Null
} catch {
  $manifest = Get-ChildItem "$env:ProgramFiles\\WindowsApps" -Recurse -Filter AppxManifest.xml -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -like "*Microsoft.DesktopAppInstaller*" } | Select-Object -First 1
  if ($manifest) {
    Add-AppxPackage -Register $manifest.FullName -DisableDevelopmentMode
  } else {
    Start-Process "ms-windows-store://pdp/?ProductId=9NBLGGH4NNS1"
  }
}
      `.trim();
    case 'WPFInstallPSProfile':
      return `
$profilePath = $profile
if (-not (Test-Path (Split-Path $profilePath))) { New-Item -ItemType Directory -Path (Split-Path $profilePath) -Force | Out-Null }
Invoke-WebRequest -UseBasicParsing "https://raw.githubusercontent.com/ChrisTitusTech/powershell-profile/main/Microsoft.PowerShell_profile.ps1" -OutFile $profilePath
      `.trim();
    case 'WPFUninstallPSProfile':
      return 'Remove-Item -Path $profile -Force -ErrorAction SilentlyContinue';
    case 'WPFSSHServer':
      return `
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
      `.trim();
    case 'WPFFeatureInstall':
      return 'Start-Process "optionalfeatures.exe"';
    default:
      return '';
  }
};

export default function SystemFeatures({ showToast, compact, externalQuery }: SystemFeaturesProps) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof externalQuery === 'string') {
      setQuery(externalQuery);
    }
  }, [externalQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    Object.values(features).forEach((item) => set.add(item.category || 'Other'));
    return ['all', ...Array.from(set).sort()];
  }, []);

  const categoryLabel = (value?: string) => {
    switch ((value || '').toLowerCase()) {
      case 'features':
        return t('features_cat_features' as any);
      case 'fixes':
        return t('features_cat_fixes' as any);
      case 'legacy windows panels':
        return t('features_cat_legacy' as any);
      case 'powershell profile':
        return t('features_cat_powershell' as any);
      case 'remote access':
        return t('features_cat_remote' as any);
      default:
        return value || t('features_all' as any);
    }
  };

  const titleLabel = (value?: string) => value || '';

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(features)
      .map(([id, item]) => ({ id, ...item }))
      .filter((item) => (category === 'all' ? true : item.category === category))
      .filter((item) =>
        q
          ? (item.Content || '').toLowerCase().includes(q) ||
            (item.Description || '').toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => (a.Order || '').localeCompare(b.Order || ''));
  }, [query, category]);

  const runAction = async (id: string) => {
    const item = features[id];
    if (!item) return;
    const cmd = getCustomCommand(id) || buildFeatureScript(item);
    setProcessing((p) => ({ ...p, [id]: true }));
    try {
      if (!cmd) {
        throw new Error('No script to run');
      } else {
        await invoke('run_powershell', { command: cmd });
        showToast('success', t('features_done' as any), item.Content);
      }
    } catch (err: any) {
      showToast('error', t('features_failed' as any), String(err));
    } finally {
      setProcessing((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div>
      {!compact && (
        <div className="mb-lg">
        <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
          {t('features_title' as any)}
        </h2>
        <p className="text-muted mt-sm">{t('features_subtitle' as any)}</p>
        </div>
      )}

      <div className="flex items-center gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
        <div className="search-input" style={{ flex: 1, minWidth: 220 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('features_search' as any)}
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
              label: c === 'all' ? t('features_all' as any) : categoryLabel(c)
            }))}
            onChange={(next) => setCategory(next)}
          />
        </div>
      </div>

      <div className="card-grid">
        {list.map((item) => {
          const hasScript = !!(getCustomCommand(item.id) || buildFeatureScript(item));
          const canRun = hasScript;
          const hasFeature = !!(item.feature && item.feature.length);
          const actionLabel = hasFeature ? t('features_enable' as any) : t('action_apply' as any);
          return (
            <div key={item.id} className="control-card">
              <div className="card-header">
                <div className="card-icon-wrapper cyan">
                  <Wrench size={22} />
                </div>
                <div className="card-status customize">
                  <span className="card-status-dot" />
                  {categoryLabel(item.category)}
                </div>
              </div>
              <h3 className="card-title">{titleLabel(item.Content)}</h3>
              <p className="card-description">{item.Description || ''}</p>
              <div className="card-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => runAction(item.id)}
                  disabled={!!processing[item.id] || !canRun}
                >
                  <Play size={14} />
                  {processing[item.id] ? t('features_running' as any) : actionLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}




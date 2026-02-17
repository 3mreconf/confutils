
import { useCallback, useEffect, useMemo, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  ChevronDown,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Filter,
  HardDrive,
  Layers,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Upload,
  Wand2,
  Wrench
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';

interface DriverFirmwareProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

type DriverIssue = { FriendlyName?: string; InstanceId?: string; Class?: string; Status?: string };
type OutdatedDriver = { Name?: string; DriverVersion?: string; DriverDate?: string; Manufacturer?: string; AgeYears?: number; OfficialUrl?: string; SearchUrl?: string };
type FirmwareOverview = { biosVersion: string; biosDate: string; biosVendor: string; boardProduct: string; boardVendor: string; systemModel: string };
type Telemetry = { cpu: number; mem: number; netMBps: number };
type Snapshot = { timestamp: string; risk: number; outdatedCount: number; issueCount: number; firmwareAge: number | null };
type DriverStoreEntry = {
  publishedName: string;
  originalName: string;
  providerName: string;
  className: string;
  driverVersion: string;
  driverDate: string;
  driverExtensionId: string;
  bootCritical: boolean;
  devicePresent: boolean;
  deviceNames: string[];
  sizeBytes: number;
};
type DriverStoreTrend = { timestamp: string; count: number; sizeBytes: number };
type SessionLog = { id: string; timestamp: string; level: 'info' | 'success' | 'warning' | 'error'; action: string; detail: string };
type BackupFolder = { name: string; path: string; created: string; driverCount: number };
type BatchProfile = {
  id: string;
  name: string;
  includeBootCritical: boolean;
  forceDelete: boolean;
  deleteMode?: 'normal' | 'uninstall' | 'force';
  storeClass: string;
  storeSort: string;
  ruleProvider: string;
  ruleMinAge: number;
  ruleOnlyNotInUse: boolean;
  pinnedVendors: string[];
  density: 'compact' | 'comfortable';
};
type TransactionManifest = {
  name: string;
  path: string;
  created: string;
  backupPath: string;
  count: number;
};
type OfficialDriverUpdate = {
  id: string;
  revision: number;
  key: string;
  title: string;
  manufacturer: string;
  driverModel: string;
  driverClass: string;
  date: string;
  sizeBytes: number;
  rebootBehavior: number;
};
type OfficialInstallRow = {
  title: string;
  code: number;
  hresult: number;
  rebootRequired: boolean;
  hresultText?: string;
};
type DriverVersionDiff = {
  key: string;
  name: string;
  manufacturer: string;
  className: string;
  beforeVersion: string;
  afterVersion: string;
  infName: string;
};
type DriverBackgroundStatus = {
  enabled: boolean;
  running: boolean;
  queue: Array<{ id: string; job_type: string }>;
  current: { id: string; job_type: string } | null;
  last_result: string | null;
  last_run_unix: number | null;
};

type DropdownOption = { value: string; label: string };
type DropdownProps = {
  id: string;
  label: string;
  value: string;
  options: DropdownOption[];
  openId: string | null;
  onToggle: (id: string) => void;
  onChange: (value: string) => void;
};

const DRIVER_HISTORY_KEY = 'confutils_driver_hub_history_v1';
const DRIVER_STORE_TREND_KEY = 'confutils_driver_store_trend_v1';
const DRIVER_SESSION_LOG_KEY = 'confutils_driver_session_log_v1';
const DRIVER_BATCH_PROFILES_KEY = 'confutils_driver_batch_profiles_v1';
const DRIVER_TX_ROOT = 'C:\\ProgramData\\ConfUtils\\DriverTransactions';
const DRIVER_AUTOMATION_KEY = 'confutils_driver_automation_v1';
const DEFAULT_FIRMWARE: FirmwareOverview = { biosVersion: 'N/A', biosDate: 'N/A', biosVendor: 'N/A', boardProduct: 'N/A', boardVendor: 'N/A', systemModel: 'N/A' };

const psQ = (s: string) => `'${s.replace(/'/g, "''")}'`;
const psArr = (list: string[]) => `@(${list.map(psQ).join(',')})`;
const parseVersion = (v: string) => (v || '').split('.').map((x) => Number.parseInt(x, 10)).filter((x) => !Number.isNaN(x));
const cmpVersion = (a: string, b: string) => {
  const aa = parseVersion(a);
  const bb = parseVersion(b);
  const len = Math.max(aa.length, bb.length);
  for (let i = 0; i < len; i += 1) {
    const d = (aa[i] ?? 0) - (bb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};
const fmtBytes = (bytes: number) => {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(i === 0 || n > 100 ? 0 : 1)} ${u[i]}`;
};
const parseDateAge = (raw: string) => {
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return 0;
  return Math.max(0, (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
};

function PremiumDropdown({ id, label, value, options, openId, onToggle, onChange }: DropdownProps) {
  const selected = options.find((o) => o.value === value) || options[0];
  const isOpen = openId === id;

  return (
    <div className="dfh-dropdown" data-dropdown-root>
      <div className="dfh-dropdown-label">{label}</div>
      <button type="button" className={`dfh-dropdown-trigger ${isOpen ? 'open' : ''}`} onClick={() => onToggle(id)}>
        <span>{selected?.label || 'Select'}</span>
        <ChevronDown size={14} />
      </button>
      {isOpen ? (
        <div className="dfh-dropdown-menu">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`dfh-dropdown-item ${opt.value === value ? 'active' : ''}`}
              onClick={() => {
                onChange(opt.value);
                onToggle('');
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DriverFirmware({ showToast }: DriverFirmwareProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [safeUpdate, setSafeUpdate] = useState(true);
  const [creatingRestore, setCreatingRestore] = useState(false);
  const [restoreStamp, setRestoreStamp] = useState<string | null>(null);
  const [issues, setIssues] = useState<DriverIssue[]>([]);
  const [drivers, setDrivers] = useState<OutdatedDriver[]>([]);
  const [store, setStore] = useState<DriverStoreEntry[]>([]);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const [firmware, setFirmware] = useState<FirmwareOverview>(DEFAULT_FIRMWARE);
  const [telemetry, setTelemetry] = useState<Telemetry>({ cpu: 0, mem: 0, netMBps: 0 });
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [trend, setTrend] = useState<DriverStoreTrend[]>([]);
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [backups, setBackups] = useState<BackupFolder[]>([]);
  const [selectedBackupPath, setSelectedBackupPath] = useState('');
  const [profiles, setProfiles] = useState<BatchProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [txManifests, setTxManifests] = useState<TransactionManifest[]>([]);
  const [selectedTxManifestPath, setSelectedTxManifestPath] = useState('');
  const [integrityResult, setIntegrityResult] = useState<{ count: number; hashCount: number; uniqueHashCount: number } | null>(null);
  const [detailEntry, setDetailEntry] = useState<DriverStoreEntry | null>(null);
  const [installInfPath, setInstallInfPath] = useState('');
  const [installRecursive, setInstallRecursive] = useState(true);
  const [officialUpdates, setOfficialUpdates] = useState<OfficialDriverUpdate[]>([]);
  const [officialPick, setOfficialPick] = useState<Record<string, boolean>>({});
  const [officialLoading, setOfficialLoading] = useState(false);
  const [officialInstalling, setOfficialInstalling] = useState(false);
  const [officialQuery, setOfficialQuery] = useState('');
  const [officialRebootRequired, setOfficialRebootRequired] = useState(false);
  const [officialAllowTokens, setOfficialAllowTokens] = useState('');
  const [officialBlockTokens, setOfficialBlockTokens] = useState('');
  const [officialClassFilter, setOfficialClassFilter] = useState('all');
  const [officialDryRunRows, setOfficialDryRunRows] = useState<string[]>([]);
  const [officialInstallRows, setOfficialInstallRows] = useState<OfficialInstallRow[]>([]);
  const [officialVersionDiff, setOfficialVersionDiff] = useState<DriverVersionDiff[]>([]);
  const [safeRing, setSafeRing] = useState<'stable' | 'balanced' | 'aggressive'>('balanced');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<'daily' | 'weekly'>('daily');
  const [scheduleMode, setScheduleMode] = useState<'report' | 'install'>('report');
  const [scheduleHour, setScheduleHour] = useState('03:00');
  const [nextScheduledRun, setNextScheduledRun] = useState('');
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [bgStatus, setBgStatus] = useState<DriverBackgroundStatus | null>(null);

  const [lastScan, setLastScan] = useState('');
  const [lastAction, setLastAction] = useState('Ready');
  const [query, setQuery] = useState('');
  const [storeQuery, setStoreQuery] = useState('');
  const [storeClass, setStoreClass] = useState('all');
  const [storeSort, setStoreSort] = useState('size_desc');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');

  const [includeBootCritical, setIncludeBootCritical] = useState(false);
  const [forceDelete, setForceDelete] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'normal' | 'uninstall' | 'force'>('uninstall');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);

  const [ruleProvider, setRuleProvider] = useState('');
  const [ruleMinAge, setRuleMinAge] = useState(2);
  const [ruleOnlyNotInUse, setRuleOnlyNotInUse] = useState(true);
  const [preset, setPreset] = useState<'safe' | 'balanced' | 'aggressive' | 'custom'>('balanced');

  const [pinnedVendors, setPinnedVendors] = useState<string[]>([]);
  const [advInUse, setAdvInUse] = useState<'all' | 'in_use' | 'stale'>('all');
  const [advBoot, setAdvBoot] = useState<'all' | 'boot' | 'non_boot'>('all');
  const [advSizeMinMb, setAdvSizeMinMb] = useState('');
  const [advSizeMaxMb, setAdvSizeMaxMb] = useState('');
  const [advDateFrom, setAdvDateFrom] = useState('');
  const [advDateTo, setAdvDateTo] = useState('');
  const [advExtQuery, setAdvExtQuery] = useState('');
  const [cliProfileJson, setCliProfileJson] = useState('');

  const parse = <T,>(raw: unknown, fallback: T): T => {
    if (!raw) return fallback;
    if (typeof raw !== 'string') return raw as T;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  };
  const toArr = <T,>(v: T | T[] | null | undefined) => (!v ? [] : Array.isArray(v) ? v : [v]);

  const addLog = useCallback((level: SessionLog['level'], action: string, detail: string) => {
    const entry: SessionLog = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      level,
      action,
      detail
    };
    setSessionLogs((prev) => {
      const next = [entry, ...prev].slice(0, 80);
      localStorage.setItem(DRIVER_SESSION_LOG_KEY, JSON.stringify(next));
      return next;
    });
    setLastAction(`${action}: ${detail}`);
  }, []);

  const firmwareAge = useMemo(() => {
    const dt = firmware.biosDate && firmware.biosDate !== 'N/A' ? new Date(firmware.biosDate) : null;
    if (!dt || Number.isNaN(dt.getTime())) return null;
    return Math.max(0, (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  }, [firmware.biosDate]);

  const risk = useMemo(
    () => Math.min(100, Math.round(Math.min(40, drivers.length * 8) + Math.min(45, issues.length * 15) + (firmwareAge && firmwareAge > 2 ? Math.min(25, 10 + (firmwareAge - 2) * 5) : 0))),
    [drivers.length, issues.length, firmwareAge]
  );
  const RiskIcon = risk >= 60 ? ShieldAlert : risk >= 25 ? AlertTriangle : ShieldCheck;
  const riskClass = risk >= 60 ? 'error' : risk >= 25 ? 'warning' : 'customize';

  const storeClassOptions = useMemo(() => {
    const dynamic = Array.from(new Set(store.map((x) => x.className).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', label: 'All classes' }, ...dynamic.map((v) => ({ value: v, label: v }))];
  }, [store]);
  const storeSortOptions: DropdownOption[] = [
    { value: 'size_desc', label: 'Size - largest first' },
    { value: 'date_desc', label: 'Date - newest first' },
    { value: 'provider_asc', label: 'Provider - A to Z' },
    { value: 'name_asc', label: 'INF Name - A to Z' }
  ];

  const backupOptions = useMemo(() => backups.map((b) => ({ value: b.path, label: `${b.name} (${b.driverCount})` })), [backups]);
  const profileOptions = useMemo(() => [{ value: '', label: 'Choose profile' }, ...profiles.map((p) => ({ value: p.id, label: p.name }))], [profiles]);
  const txManifestOptions = useMemo(
    () => txManifests.map((m) => ({ value: m.path, label: `${m.name} (${m.count})` })),
    [txManifests]
  );
  const deleteModeOptions: DropdownOption[] = [
    { value: 'normal', label: 'Normal delete' },
    { value: 'uninstall', label: 'Uninstall mode' },
    { value: 'force', label: 'Force mode' }
  ];

  const vendorStats = useMemo(() => {
    const map = new Map<string, number>();
    drivers.forEach((d) => {
      const k = d.Manufacturer || 'Unknown';
      map.set(k, (map.get(k) || 0) + 1);
    });
    return Array.from(map.entries()).map(([vendor, count]) => ({ vendor, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const v = d.Manufacturer || 'Unknown';
      if (pinnedVendors.length > 0 && !pinnedVendors.includes(v)) return false;
      if (query && !`${d.Name} ${d.Manufacturer} ${d.DriverVersion}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [drivers, pinnedVendors, query]);

  const filteredStore = useMemo(() => {
    const q = storeQuery.toLowerCase();
    const out = store
      .filter((x) => storeClass === 'all' || x.className === storeClass)
      .filter((x) => !q || `${x.publishedName} ${x.originalName} ${x.providerName} ${x.className}`.toLowerCase().includes(q))
      .filter((x) => (advInUse === 'all' ? true : advInUse === 'in_use' ? x.devicePresent : !x.devicePresent))
      .filter((x) => (advBoot === 'all' ? true : advBoot === 'boot' ? x.bootCritical : !x.bootCritical))
      .filter((x) => {
        if (!advExtQuery.trim()) return true;
        return (x.driverExtensionId || '').toLowerCase().includes(advExtQuery.toLowerCase());
      })
      .filter((x) => {
        const mb = x.sizeBytes / (1024 * 1024);
        const min = Number(advSizeMinMb || 0);
        const max = Number(advSizeMaxMb || 0);
        if (min > 0 && mb < min) return false;
        if (max > 0 && mb > max) return false;
        return true;
      })
      .filter((x) => {
        const ts = new Date(x.driverDate).getTime();
        if (!Number.isFinite(ts)) return true;
        if (advDateFrom) {
          const from = new Date(advDateFrom).getTime();
          if (Number.isFinite(from) && ts < from) return false;
        }
        if (advDateTo) {
          const to = new Date(advDateTo).getTime();
          if (Number.isFinite(to) && ts > to) return false;
        }
        return true;
      });

    out.sort((a, b) => {
      if (storeSort === 'date_desc') return new Date(b.driverDate).getTime() - new Date(a.driverDate).getTime();
      if (storeSort === 'provider_asc') return a.providerName.localeCompare(b.providerName);
      if (storeSort === 'name_asc') return a.publishedName.localeCompare(b.publishedName);
      return b.sizeBytes - a.sizeBytes;
    });
    return out;
  }, [store, storeClass, storeQuery, storeSort, advInUse, advBoot, advExtQuery, advSizeMinMb, advSizeMaxMb, advDateFrom, advDateTo]);

  const pickedRows = useMemo(() => store.filter((x) => pick[x.publishedName]), [store, pick]);
  const reclaimBytes = useMemo(() => pickedRows.reduce((s, x) => s + x.sizeBytes, 0), [pickedRows]);

  const dependencyGroups = useMemo(() => {
    const map = new Map<string, { key: string; provider: string; className: string; count: number; selected: number; inUse: number; sizeBytes: number }>();
    store.forEach((row) => {
      const key = `${row.providerName}__${row.className}`;
      const current = map.get(key) || { key, provider: row.providerName, className: row.className, count: 0, selected: 0, inUse: 0, sizeBytes: 0 };
      current.count += 1;
      current.sizeBytes += row.sizeBytes;
      if (row.devicePresent) current.inUse += 1;
      if (pick[row.publishedName]) current.selected += 1;
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 12);
  }, [store, pick]);

  const ghostRows = useMemo(() => store.filter((x) => !x.devicePresent), [store]);

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, DriverStoreEntry[]>();
    store.forEach((row) => {
      const key = `${row.originalName}|${row.providerName}|${row.className}`.toLowerCase();
      const list = map.get(key) || [];
      list.push(row);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .map(([key, rows]) => ({ key, rows }))
      .filter((x) => x.rows.length > 1)
      .sort((a, b) => b.rows.length - a.rows.length)
      .slice(0, 40);
  }, [store]);

  const officialClassOptions = useMemo(() => {
    const dynamic = Array.from(new Set(officialUpdates.map((x) => x.driverClass).filter(Boolean))).sort((a, b) => a.localeCompare(b));
    return [{ value: 'all', label: 'All classes' }, ...dynamic.map((v) => ({ value: v, label: v }))];
  }, [officialUpdates]);

  const parseTokens = (raw: string) =>
    raw
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);

  const filteredOfficialUpdates = useMemo(() => {
    const q = officialQuery.trim().toLowerCase();
    const allow = parseTokens(officialAllowTokens);
    const block = parseTokens(officialBlockTokens);
    return officialUpdates.filter((x) => {
      const hay = `${x.title} ${x.manufacturer} ${x.driverClass} ${x.driverModel}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (officialClassFilter !== 'all' && x.driverClass !== officialClassFilter) return false;
      if (allow.length > 0 && !allow.some((t) => hay.includes(t))) return false;
      if (block.some((t) => hay.includes(t))) return false;
      return true;
    });
  }, [officialUpdates, officialQuery, officialAllowTokens, officialBlockTokens, officialClassFilter]);

  const selectedOfficialRows = useMemo(
    () => officialUpdates.filter((x) => officialPick[x.key]),
    [officialUpdates, officialPick]
  );

  const driverHealth = useMemo(() => {
    return drivers.slice(0, 40).map((d) => {
      const age = d.AgeYears || 0;
      const issuePenalty = issues.some((i) => (i.FriendlyName || '').toLowerCase().includes((d.Name || '').toLowerCase())) ? 20 : 0;
      const agePenalty = Math.min(55, age * 12);
      const vendorPenalty = (d.Manufacturer || '').toLowerCase().includes('unknown') ? 15 : 0;
      const score = Math.max(0, Math.round(100 - agePenalty - issuePenalty - vendorPenalty));
      return { name: d.Name || 'Unknown Device', manufacturer: d.Manufacturer || 'Unknown', version: d.DriverVersion || 'N/A', age, score };
    });
  }, [drivers, issues]);

  const oemMatches = useMemo(() => {
    const mk = (title: string, url: string) => ({ title, url });
    const mapVendor = (v: string) => {
      const x = v.toLowerCase();
      if (x.includes('nvidia')) return mk('NVIDIA Driver Downloads', 'https://www.nvidia.com/Download/index.aspx');
      if (x.includes('intel')) return mk('Intel Driver & Support Assistant', 'https://www.intel.com/content/www/us/en/support/detect.html');
      if (x.includes('advanced micro') || x.includes('amd')) return mk('AMD Drivers and Support', 'https://www.amd.com/en/support');
      if (x.includes('realtek')) return mk('Realtek Downloads', 'https://www.realtek.com/en/downloads');
      if (x.includes('lenovo')) return mk('Lenovo Support Drivers', 'https://pcsupport.lenovo.com/');
      if (x.includes('dell')) return mk('Dell Drivers & Downloads', 'https://www.dell.com/support/home/drivers');
      if (x.includes('hp')) return mk('HP Software and Drivers', 'https://support.hp.com/drivers');
      return null;
    };
    const rows = drivers
      .map((d) => ({ driver: d.Name || 'Unknown Device', vendor: d.Manufacturer || 'Unknown', match: mapVendor(d.Manufacturer || '') }))
      .filter((x) => !!x.match);
    const dedup = new Map<string, { driver: string; vendor: string; match: { title: string; url: string } }>();
    rows.forEach((r) => {
      if (!r.match) return;
      const key = `${r.vendor}|${r.match.url}`;
      if (!dedup.has(key)) dedup.set(key, { driver: r.driver, vendor: r.vendor, match: r.match });
    });
    return Array.from(dedup.values()).slice(0, 10);
  }, [drivers]);

  const complianceSummary = useMemo(
    () => ({
      installed: officialInstallRows.filter((r) => r.code === 2 || r.code === 3).length,
      failed: officialInstallRows.filter((r) => r.code >= 4).length,
      diffed: officialVersionDiff.length,
      reboot: officialRebootRequired
    }),
    [officialInstallRows, officialVersionDiff.length, officialRebootRequired]
  );

  const preview = useMemo(() => {
    const classes = Array.from(new Set(pickedRows.map((x) => x.className)));
    const providers = Array.from(new Set(pickedRows.map((x) => x.providerName)));
    const inUse = pickedRows.filter((x) => x.devicePresent).length;
    const boot = pickedRows.filter((x) => x.bootCritical).length;
    return { count: pickedRows.length, sizeBytes: reclaimBytes, classes, providers, inUse, boot };
  }, [pickedRows, reclaimBytes]);

  const persistSnapshot = useCallback((next: Snapshot) => {
    setHistory((prev) => {
      const merged = [next, ...prev].slice(0, 20);
      localStorage.setItem(DRIVER_HISTORY_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const persistTrend = useCallback((next: DriverStoreTrend) => {
    setTrend((prev) => {
      const merged = [next, ...prev].slice(0, 20);
      localStorage.setItem(DRIVER_STORE_TREND_KEY, JSON.stringify(merged));
      return merged;
    });
  }, []);

  const loadTelemetry = useCallback(async () => {
    const [cpuRaw, memRaw, netRaw] = await Promise.all([invoke('get_cpu_usage'), invoke('get_memory_usage'), invoke('get_network_stats')]);
    const cpu = parse<{ Usage?: number }>(cpuRaw, { Usage: 0 });
    const mem = parse<{ Percent?: number }>(memRaw, { Percent: 0 });
    const net = parse<{ BytesPerSec?: number }[] | { BytesPerSec?: number }>(netRaw, []);
    const list = Array.isArray(net) ? net : [net];
    const bps = list.reduce((sum, i) => sum + Number(i.BytesPerSec || 0), 0);
    return { cpu: Number(cpu.Usage || 0), mem: Number(mem.Percent || 0), netMBps: bps / (1024 * 1024) };
  }, []);

  const scanMain = useCallback(
    async (notify = false) => {
      setLoading(true);
      try {
        const [issuesRaw, driversRaw, fwRaw, tlm] = await Promise.all([
          invoke('scan_device_issues'),
          invoke('scan_outdated_drivers'),
          invoke('run_powershell', {
            command:
              "$bios=Get-CimInstance Win32_BIOS|Select-Object -First 1 SMBIOSBIOSVersion,ReleaseDate,Manufacturer;$board=Get-CimInstance Win32_BaseBoard|Select-Object -First 1 Product,Manufacturer;$computer=Get-CimInstance Win32_ComputerSystem|Select-Object -First 1 Model;@{biosVersion=if($bios.SMBIOSBIOSVersion){$bios.SMBIOSBIOSVersion}else{'N/A'};biosDate=if($bios.ReleaseDate){([datetime]$bios.ReleaseDate).ToString('yyyy-MM-dd')}else{'N/A'};biosVendor=if($bios.Manufacturer){$bios.Manufacturer}else{'N/A'};boardProduct=if($board.Product){$board.Product}else{'N/A'};boardVendor=if($board.Manufacturer){$board.Manufacturer}else{'N/A'};systemModel=if($computer.Model){$computer.Model}else{'N/A'}}|ConvertTo-Json -Compress"
          }),
          loadTelemetry()
        ]);

        const pi = toArr(parse<DriverIssue | DriverIssue[]>(issuesRaw, []));
        const pd = toArr(parse<OutdatedDriver | OutdatedDriver[]>(driversRaw, []));
        const pf = parse<FirmwareOverview>(fwRaw, DEFAULT_FIRMWARE);
        setIssues(pi);
        setDrivers(pd);
        setFirmware(pf);
        setTelemetry(tlm);
        setLastScan(new Date().toLocaleTimeString());

        persistSnapshot({ timestamp: new Date().toISOString(), risk, outdatedCount: pd.length, issueCount: pi.length, firmwareAge });
        addLog('success', 'Scan main', `${pd.length} outdated, ${pi.length} issue(s).`);
        if (notify) showToast('success', t('driver_hub_scan_complete' as any), t('driver_hub_scan_complete_desc' as any));
      } catch (e) {
        addLog('error', 'Scan main', String(e));
        showToast('error', t('driver_hub_scan_failed' as any), String(e));
      } finally {
        setLoading(false);
      }
    },
    [firmwareAge, loadTelemetry, persistSnapshot, risk, showToast, t, addLog]
  );

  const scanStore = useCallback(
    async (notify = false) => {
      setStoreLoading(true);
      try {
        const script = `$dev=@{};$signed=Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue;foreach($i in $signed){if(-not $i.InfName){continue};if(-not $dev.ContainsKey($i.InfName)){$dev[$i.InfName]=@()};if($i.DeviceName){$dev[$i.InfName]+=[string]$i.DeviceName}};$repo=Join-Path $env:windir 'System32\\DriverStore\\FileRepository';$raw=(pnputil /enum-drivers|Out-String);$blocks=$raw -split '(?:\\r?\\n){2,}';$rows=@();foreach($b in $blocks){if(-not($b -match 'Published Name')){continue};$m=@{};foreach($l in ($b -split '\\r?\\n')){if($l -match '^\\s*([^:]+)\\s*:\\s*(.*)$'){$m[$matches[1].Trim()]=$matches[2].Trim()}};$pub=[string]$m['Published Name'];if(-not $pub){continue};$orig=[string]$m['Original Name'];$ver=[string]$m['Driver Version'];$date='';$verNum=$ver;if($ver -match '^(\\S+)\\s+(.+)$'){$date=$matches[1];$verNum=$matches[2]};$extKey=($m.Keys|?{$_ -match 'Extension\\s*ID|Driver\\s*Extension\\s*ID'}|select -First 1);$bootKey=($m.Keys|?{$_ -match 'Boot\\s*Critical'}|select -First 1);$bootVal=if($bootKey){[string]$m[$bootKey]}else{''};$devices=@();if($dev.ContainsKey($pub)){$devices=@($dev[$pub]|Sort-Object -Unique)};$size=0;$base=[System.IO.Path]::GetFileNameWithoutExtension($orig);if($base){$dirs=@(Get-ChildItem -Path $repo -Directory -Filter \"$base*\" -ErrorAction SilentlyContinue);foreach($d in $dirs){$sum=(Get-ChildItem -Path $d.FullName -File -Recurse -ErrorAction SilentlyContinue|Measure-Object Length -Sum).Sum;if($sum){$size+=[int64]$sum}}};$rows+=[PSCustomObject]@{publishedName=$pub;originalName=if($orig){$orig}else{'N/A'};providerName=if($m['Provider Name']){$m['Provider Name']}else{'N/A'};className=if($m['Class Name']){$m['Class Name']}else{'Unknown'};driverVersion=if($verNum){$verNum}else{'N/A'};driverDate=if($date){$date}else{'N/A'};driverExtensionId=if($extKey){[string]$m[$extKey]}else{''};bootCritical=($bootVal -match '^(Yes|True|Evet)$');devicePresent=($devices.Count -gt 0);deviceNames=@($devices);sizeBytes=[int64]$size}};$rows|ConvertTo-Json -Compress`;
        const raw = await invoke('run_powershell', { command: script });
        const list = toArr(parse<DriverStoreEntry | DriverStoreEntry[]>(raw, []));
        setStore(list);
        setPick((prev) => {
          const next: Record<string, boolean> = {};
          list.forEach((x) => {
            if (prev[x.publishedName]) next[x.publishedName] = true;
          });
          return next;
        });

        const total = list.reduce((sum, x) => sum + x.sizeBytes, 0);
        persistTrend({ timestamp: new Date().toISOString(), count: list.length, sizeBytes: total });
        addLog('success', 'Scan store', `${list.length} package(s), ${fmtBytes(total)} indexed.`);

        if (notify) showToast('success', 'Driver Store scan complete', `${list.length} package(s) indexed.`);
      } catch (e) {
        addLog('error', 'Scan store', String(e));
        showToast('error', 'Driver Store scan failed', String(e));
      } finally {
        setStoreLoading(false);
      }
    },
    [showToast, addLog, persistTrend]
  );

  const loadBackups = useCallback(async () => {
    try {
      const raw = await invoke('run_powershell', {
        command:
          "$root='C:\\ProgramData\\ConfUtils\\DriverBackups';if(-not(Test-Path $root)){@()|ConvertTo-Json -Compress;exit};Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue|Sort-Object LastWriteTime -Descending|ForEach-Object{[PSCustomObject]@{name=$_.Name;path=$_.FullName;created=$_.LastWriteTime.ToString('s');driverCount=(Get-ChildItem -Path $_.FullName -Recurse -Filter '*.inf' -File -ErrorAction SilentlyContinue|Measure-Object).Count}}|ConvertTo-Json -Compress"
      });
      const list = toArr(parse<BackupFolder | BackupFolder[]>(raw, []));
      setBackups(list);
      if (!selectedBackupPath && list.length > 0) setSelectedBackupPath(list[0].path);
      addLog('info', 'Backup list', `${list.length} backup folder(s) found.`);
    } catch (e) {
      addLog('error', 'Backup list', String(e));
      showToast('error', 'Backup list failed', String(e));
    }
  }, [selectedBackupPath, showToast, addLog]);

  const loadTxManifests = useCallback(async () => {
    try {
      const raw = await invoke('run_powershell', {
        command: `$root='${DRIVER_TX_ROOT}';if(-not(Test-Path $root)){@()|ConvertTo-Json -Compress;exit};Get-ChildItem -Path $root -File -Filter '*.json' -ErrorAction SilentlyContinue|Sort-Object LastWriteTime -Descending|ForEach-Object{try{$j=Get-Content $_.FullName -Raw|ConvertFrom-Json;[PSCustomObject]@{name=$_.BaseName;path=$_.FullName;created=$_.LastWriteTime.ToString('s');backupPath=$j.backupPath;count=@($j.packages).Count}}catch{}}|ConvertTo-Json -Compress`
      });
      const list = toArr(parse<TransactionManifest | TransactionManifest[]>(raw, []));
      setTxManifests(list);
      if (!selectedTxManifestPath && list.length > 0) setSelectedTxManifestPath(list[0].path);
    } catch (e) {
      addLog('error', 'Tx manifest list', String(e));
    }
  }, [addLog, selectedTxManifestPath]);

  const computeNextRun = useCallback((freq: 'daily' | 'weekly', hourText: string) => {
    const [hRaw, mRaw] = hourText.split(':');
    const h = Number.isFinite(Number(hRaw)) ? Number(hRaw) : 3;
    const m = Number.isFinite(Number(mRaw)) ? Number(mRaw) : 0;
    const now = new Date();
    const next = new Date(now);
    next.setSeconds(0, 0);
    next.setHours(h, m, 0, 0);
    if (next.getTime() <= now.getTime()) {
      next.setDate(next.getDate() + (freq === 'daily' ? 1 : 7));
    } else if (freq === 'weekly') {
      next.setDate(next.getDate() + 7);
    }
    return next.toISOString();
  }, []);

  const refreshBackgroundStatus = useCallback(async () => {
    try {
      const raw = await invoke('get_driver_background_status');
      const s = parse<DriverBackgroundStatus>(raw, {
        enabled: false,
        running: false,
        queue: [],
        current: null,
        last_result: null,
        last_run_unix: null
      });
      setBgStatus(s);
      setBackgroundMode(!!s.enabled);
    } catch {
      // ignore status refresh errors in UI loop
    }
  }, []);

  const enqueueJob = async (job: 'scan_official' | 'install_selected' | 'install_all') => {
    try {
      const keys = job === 'install_selected' ? selectedOfficialRows.map((x) => x.key) : [];
      await invoke('enqueue_driver_background_job', { jobType: job, keys });
      addLog('info', 'Background queue', `Queued: ${job}`);
      await refreshBackgroundStatus();
    } catch (e) {
      showToast('error', 'Queue failed', String(e));
    }
  };

  useEffect(() => {
    const rawHistory = localStorage.getItem(DRIVER_HISTORY_KEY);
    const rawTrend = localStorage.getItem(DRIVER_STORE_TREND_KEY);
    const rawLogs = localStorage.getItem(DRIVER_SESSION_LOG_KEY);
    const rawProfiles = localStorage.getItem(DRIVER_BATCH_PROFILES_KEY);
    const rawAutomation = localStorage.getItem(DRIVER_AUTOMATION_KEY);

    if (rawHistory) {
      try {
        const parsed = JSON.parse(rawHistory) as Snapshot[];
        if (Array.isArray(parsed)) setHistory(parsed);
      } catch {
        // noop
      }
    }
    if (rawTrend) {
      try {
        const parsed = JSON.parse(rawTrend) as DriverStoreTrend[];
        if (Array.isArray(parsed)) setTrend(parsed);
      } catch {
        // noop
      }
    }
    if (rawLogs) {
      try {
        const parsed = JSON.parse(rawLogs) as SessionLog[];
        if (Array.isArray(parsed)) setSessionLogs(parsed);
      } catch {
        // noop
      }
    }
    if (rawProfiles) {
      try {
        const parsed = JSON.parse(rawProfiles) as BatchProfile[];
        if (Array.isArray(parsed)) setProfiles(parsed);
      } catch {
        // noop
      }
    }
    if (rawAutomation) {
      try {
        const parsed = JSON.parse(rawAutomation) as {
          safeRing?: 'stable' | 'balanced' | 'aggressive';
          scheduleEnabled?: boolean;
          scheduleFrequency?: 'daily' | 'weekly';
          scheduleMode?: 'report' | 'install';
          scheduleHour?: string;
          nextScheduledRun?: string;
          backgroundMode?: boolean;
        };
        if (parsed.safeRing) setSafeRing(parsed.safeRing);
        if (typeof parsed.scheduleEnabled === 'boolean') setScheduleEnabled(parsed.scheduleEnabled);
        if (parsed.scheduleFrequency) setScheduleFrequency(parsed.scheduleFrequency);
        if (parsed.scheduleMode) setScheduleMode(parsed.scheduleMode);
        if (parsed.scheduleHour) setScheduleHour(parsed.scheduleHour);
        if (parsed.nextScheduledRun) setNextScheduledRun(parsed.nextScheduledRun);
        if (typeof parsed.backgroundMode === 'boolean') setBackgroundMode(parsed.backgroundMode);
      } catch {
        // noop
      }
    }

    scanMain(false);
    scanStore(false);
    loadBackups();
    loadTxManifests();
    refreshBackgroundStatus();
  }, [scanMain, scanStore, loadBackups, loadTxManifests, refreshBackgroundStatus]);

  useEffect(() => {
    const closeDropdown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-dropdown-root]')) setOpenDropdown(null);
    };
    window.addEventListener('mousedown', closeDropdown);
    return () => window.removeEventListener('mousedown', closeDropdown);
  }, []);

  useEffect(() => {
    const payload = {
      safeRing,
      scheduleEnabled,
      scheduleFrequency,
      scheduleMode,
      scheduleHour,
      nextScheduledRun,
      backgroundMode
    };
    localStorage.setItem(DRIVER_AUTOMATION_KEY, JSON.stringify(payload));
  }, [safeRing, scheduleEnabled, scheduleFrequency, scheduleMode, scheduleHour, nextScheduledRun, backgroundMode]);

  useEffect(() => {
    if (safeRing === 'stable') {
      setOfficialAllowTokens('intel,nvidia,amd,realtek');
      setOfficialBlockTokens('beta,preview,test,insider');
      return;
    }
    if (safeRing === 'balanced') {
      setOfficialAllowTokens('');
      setOfficialBlockTokens('beta,preview,test');
      return;
    }
    setOfficialAllowTokens('');
    setOfficialBlockTokens('');
  }, [safeRing]);

  const createRestorePoint = async () => {
    setCreatingRestore(true);
    try {
      await invoke('create_restore_point');
      const stamp = new Date().toLocaleTimeString();
      setRestoreStamp(stamp);
      addLog('success', 'Restore point', `Created at ${stamp}`);
      showToast('success', 'Restore point created', 'Safety checkpoint is ready.');
      return true;
    } catch (e) {
      addLog('error', 'Restore point', String(e));
      showToast('error', 'Restore point failed', String(e));
      return false;
    } finally {
      setCreatingRestore(false);
    }
  };

  const openExternal = async (url?: string) => {
    if (url) await invoke('run_powershell', { command: `Start-Process \"${url}\"` }).catch(() => undefined);
  };

  const safeOpen = async (driver: OutdatedDriver, url?: string) => {
    if (!url) return;
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    await openExternal(url);
    addLog('info', 'Open source', `${driver.Name || 'Driver'} -> ${url}`);
    showToast('info', 'Opening update source', `${driver.Name || 'Driver'} source opened.`);
  };

  const matchRule = useCallback(
    (row: DriverStoreEntry, cfg?: { provider: string; minAge: number; onlyNotInUse: boolean }) => {
      const providerNeedle = (cfg?.provider ?? ruleProvider).trim().toLowerCase();
      const minAge = cfg?.minAge ?? ruleMinAge;
      const onlyNotInUse = cfg?.onlyNotInUse ?? ruleOnlyNotInUse;

      if (providerNeedle && !row.providerName.toLowerCase().includes(providerNeedle)) return false;
      if (onlyNotInUse && row.devicePresent) return false;
      const age = parseDateAge(row.driverDate);
      if (age < minAge) return false;
      return true;
    },
    [ruleProvider, ruleMinAge, ruleOnlyNotInUse]
  );

  const applyRuleSelection = () => {
    const next: Record<string, boolean> = {};
    store.forEach((row) => {
      if (matchRule(row)) next[row.publishedName] = true;
    });
    setPick(next);
    setPreset('custom');
    addLog('success', 'Rule engine', `${Object.keys(next).length} package(s) selected.`);
    showToast('success', 'Rule applied', `${Object.keys(next).length} package(s) selected.`);
  };

  const selectOldCandidates = () => {
    const groups = new Map<string, DriverStoreEntry[]>();
    store
      .filter((x) => x.originalName.toLowerCase() !== 'ntprint.inf' && (includeBootCritical || !x.bootCritical))
      .forEach((x) => {
        const k = [x.className, x.driverExtensionId, x.providerName, x.originalName].join('|').toLowerCase();
        const list = groups.get(k) || [];
        list.push(x);
        groups.set(k, list);
      });

    const selected = new Set<string>();
    groups.forEach((pkgGroup) => {
      const vMap = new Map<string, DriverStoreEntry[]>();
      pkgGroup.forEach((x) => {
        const k = `${x.driverVersion}|${x.driverDate}`.toLowerCase();
        const list = vMap.get(k) || [];
        list.push(x);
        vMap.set(k, list);
      });
      const ordered = Array.from(vMap.values()).sort((a, b) => {
        const v = cmpVersion(a[0]?.driverVersion || '0', b[0]?.driverVersion || '0');
        if (v !== 0) return -v;
        return new Date(b[0]?.driverDate || 0).getTime() - new Date(a[0]?.driverDate || 0).getTime();
      });
      ordered.slice(1).forEach((grp) => {
        if (grp.every((x) => !x.devicePresent)) grp.forEach((x) => selected.add(x.publishedName));
      });
    });

    const next: Record<string, boolean> = {};
    selected.forEach((x) => {
      const row = store.find((r) => r.publishedName === x);
      if (row && matchRule(row)) next[x] = true;
    });
    setPick(next);
    addLog('success', 'DSE selection', `${Object.keys(next).length} package(s) selected.`);
    showToast(Object.keys(next).length ? 'success' : 'info', 'DSE old-driver selection', `${Object.keys(next).length} package(s) selected.`);
  };

  const applyPreset = (mode: 'safe' | 'balanced' | 'aggressive') => {
    setPreset(mode);
    if (mode === 'safe') {
      setIncludeBootCritical(false);
      setForceDelete(false);
      setDeleteMode('uninstall');
      setRuleProvider('');
      setRuleMinAge(3);
      setRuleOnlyNotInUse(true);
    }
    if (mode === 'balanced') {
      setIncludeBootCritical(false);
      setForceDelete(false);
      setDeleteMode('uninstall');
      setRuleProvider('');
      setRuleMinAge(2);
      setRuleOnlyNotInUse(true);
    }
    if (mode === 'aggressive') {
      setIncludeBootCritical(true);
      setForceDelete(true);
      setDeleteMode('force');
      setRuleProvider('');
      setRuleMinAge(0);
      setRuleOnlyNotInUse(false);
    }

    const cfg = mode === 'safe' ? { provider: '', minAge: 3, onlyNotInUse: true } : mode === 'balanced' ? { provider: '', minAge: 2, onlyNotInUse: true } : { provider: '', minAge: 0, onlyNotInUse: false };

    const next: Record<string, boolean> = {};
    store.forEach((row) => {
      const age = parseDateAge(row.driverDate);
      if (mode !== 'aggressive' && row.bootCritical) return;
      if (mode !== 'aggressive' && row.originalName.toLowerCase() === 'ntprint.inf') return;
      if (!matchRule(row, cfg)) return;
      if (mode === 'safe' && age < 4) return;
      next[row.publishedName] = true;
    });
    setPick(next);
    addLog('info', 'Preset', `${mode} applied with ${Object.keys(next).length} selected.`);
  };

  const exportDrivers = async (all: boolean) => {
    const targets = all ? store.map((x) => x.publishedName) : pickedRows.map((x) => x.publishedName);
    if (!targets.length) return showToast('warning', 'Nothing to export', 'Select package(s) first.');
    setBusy(true);
    try {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const raw = await invoke('run_powershell', {
        command: `$dest='C:\\ProgramData\\ConfUtils\\DriverBackups\\${stamp}';New-Item -Path $dest -ItemType Directory -Force|Out-Null;$names=${psArr(targets)};$ok=0;$fail=@();foreach($n in $names){try{pnputil /export-driver $n $dest|Out-Null;if($LASTEXITCODE -eq 0){$ok++}else{$fail+=$n}}catch{$fail+=$n}};@{dest=$dest;ok=$ok;failed=@($fail)}|ConvertTo-Json -Compress`
      });
      const res = parse<{ dest?: string; ok?: number; failed?: string[] }>(raw, {});
      await loadBackups();
      addLog('success', 'Export drivers', `${res.ok || 0} exported, ${(res.failed || []).length} failed.`);
      showToast((res.failed || []).length ? 'warning' : 'success', 'Driver export finished', `${res.ok || 0} exported. Failed: ${(res.failed || []).length}. ${res.dest || ''}`);
    } catch (e) {
      addLog('error', 'Export drivers', String(e));
      showToast('error', 'Driver export failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    const targets = pickedRows.map((x) => x.publishedName);
    if (!targets.length) return showToast('warning', 'Nothing selected', 'Select package(s) before delete.');
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    setBusy(true);
    try {
      const modeCmd =
        deleteMode === 'force'
          ? '/uninstall /force'
          : deleteMode === 'uninstall'
            ? '/uninstall'
            : '';
      const raw = await invoke('run_powershell', {
        command: `$names=${psArr(targets)};$ok=0;$fail=@();foreach($n in $names){try{pnputil /delete-driver $n ${modeCmd}|Out-Null;if($LASTEXITCODE -eq 0){$ok++}else{$fail+=$n}}catch{$fail+=$n}};@{ok=$ok;failed=@($fail)}|ConvertTo-Json -Compress`
      });
      const res = parse<{ ok?: number; failed?: string[] }>(raw, {});
      addLog((res.failed || []).length ? 'warning' : 'success', 'Delete drivers', `${res.ok || 0} removed, ${(res.failed || []).length} failed.`);
      showToast((res.failed || []).length ? 'warning' : 'success', 'Driver delete finished', `${res.ok || 0} removed. Failed: ${(res.failed || []).length}.`);
      await scanStore(false);
    } catch (e) {
      addLog('error', 'Delete drivers', String(e));
      showToast('error', 'Driver delete failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const restoreFromBackup = async () => {
    if (!selectedBackupPath) {
      showToast('warning', 'No backup selected', 'Pick a backup folder first.');
      return;
    }
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    setBusy(true);
    try {
      await invoke('run_powershell', {
        command: `$root=${psQ(selectedBackupPath)};pnputil /add-driver \"$root\\*.inf\" /subdirs /install | Out-Null;@{ok=$LASTEXITCODE}|ConvertTo-Json -Compress`
      });
      addLog('success', 'Restore backup', selectedBackupPath);
      showToast('success', 'Restore started', 'Drivers from backup are being restored.');
      await scanMain(false);
      await scanStore(false);
    } catch (e) {
      addLog('error', 'Restore backup', String(e));
      showToast('error', 'Restore failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const installInfPackage = async () => {
    if (!installInfPath.trim()) {
      showToast('warning', 'INF path required', 'Provide .inf file or folder path.');
      return;
    }
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    setBusy(true);
    try {
      const path = installInfPath.trim();
      const cmd = path.toLowerCase().endsWith('.inf')
        ? `pnputil /add-driver ${psQ(path)} /install`
        : `pnputil /add-driver ${psQ(path + '\\\\*.inf')} ${installRecursive ? '/subdirs' : ''} /install`;
      await invoke('run_powershell', { command: `${cmd} | Out-Null; @{ok=$LASTEXITCODE}|ConvertTo-Json -Compress` });
      addLog('success', 'Install INF', path);
      showToast('success', 'Install started', path);
      await scanStore(false);
      await scanMain(false);
    } catch (e) {
      addLog('error', 'Install INF', String(e));
      showToast('error', 'Install failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const scanOfficialDriverUpdates = async (notify = true) => {
    setOfficialLoading(true);
    try {
      const raw = await invoke('run_powershell', {
        command:
          "$s=New-Object -ComObject Microsoft.Update.Session;$searcher=$s.CreateUpdateSearcher();$res=$searcher.Search(\"IsInstalled=0 and Type='Driver' and IsHidden=0\");$rows=@();foreach($u in $res.Updates){$id=[string]$u.Identity.UpdateID;$rev=[int]$u.Identity.RevisionNumber;$title=[string]$u.Title;$mfr='';$model='';$class='';$dt='N/A';$size=0;$rb=0;try{$mfr=[string]$u.DriverManufacturer}catch{};try{$model=[string]$u.DriverModel}catch{};try{$class=[string]$u.DriverClass}catch{};try{$dt=(Get-Date $u.LastDeploymentChangeTime).ToString('yyyy-MM-dd')}catch{};try{$size=[int64]$u.MaxDownloadSize}catch{};try{$rb=[int]$u.InstallationBehavior.RebootBehavior}catch{};$rows+=[PSCustomObject]@{id=$id;revision=$rev;key=($id+'|'+$rev);title=$title;manufacturer=$mfr;driverModel=$model;driverClass=$class;date=$dt;sizeBytes=$size;rebootBehavior=$rb}};$rows|ConvertTo-Json -Depth 5 -Compress"
      });
      const list = toArr(parse<OfficialDriverUpdate | OfficialDriverUpdate[]>(raw, []));
      setOfficialUpdates(list);
      setOfficialDryRunRows([]);
      setOfficialPick((prev) => {
        const next: Record<string, boolean> = {};
        list.forEach((x) => {
          if (prev[x.key]) next[x.key] = true;
        });
        return next;
      });
      addLog('success', 'Official driver scan', `${list.length} update(s) available.`);
      if (notify) showToast('success', 'Official driver scan complete', `${list.length} update(s) found.`);
    } catch (e) {
      addLog('error', 'Official driver scan', String(e));
      showToast('error', 'Official driver scan failed', String(e));
    } finally {
      setOfficialLoading(false);
    }
  };

  const decodeHResult = (value: number) => {
    const hex = `0x${(value >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
    const known: Record<string, string> = {
      '0x00000000': 'Success',
      '0x80070005': 'Access denied',
      '0x80070422': 'Windows Update service disabled',
      '0x80240017': 'Not applicable for this device',
      '0x8024001E': 'Operation canceled/service stopped',
      '0x80240022': 'All updates failed',
      '0x8024200B': 'Download/content problem',
      '0x8024402C': 'Network/proxy name resolution issue',
      '0x800F081F': 'Required component source missing'
    };
    return `${hex} ${known[hex] || 'Unknown error'}`;
  };

  const runOfficialDryRun = async () => {
    const keys = selectedOfficialRows.map((x) => x.key);
    if (!keys.length) {
      showToast('warning', 'No official update selected', 'Select updates before dry-run.');
      return;
    }
    try {
      const raw = await invoke('run_powershell', {
        command: `$wanted=${psArr(keys)};$s=New-Object -ComObject Microsoft.Update.Session;$searcher=$s.CreateUpdateSearcher();$res=$searcher.Search(\"IsInstalled=0 and Type='Driver' and IsHidden=0\");$rows=@();foreach($u in $res.Updates){$k=([string]$u.Identity.UpdateID+'|'+[string]$u.Identity.RevisionNumber);if($wanted -contains $k){$rows+=[PSCustomObject]@{title=[string]$u.Title;eulaAccepted=[bool]$u.EulaAccepted;rebootBehavior=[int]$u.InstallationBehavior.RebootBehavior;size=[int64]$u.MaxDownloadSize}}};$rows|ConvertTo-Json -Depth 6 -Compress`
      });
      const list = toArr(parse<{ title?: string; eulaAccepted?: boolean; rebootBehavior?: number; size?: number } | { title?: string; eulaAccepted?: boolean; rebootBehavior?: number; size?: number }[]>(raw, []));
      const rows = list.map((x) => `${x.title || 'Unknown'} | EULA:${x.eulaAccepted ? 'ok' : 'pending'} | reboot:${x.rebootBehavior || 0} | size:${fmtBytes(Number(x.size || 0))}`);
      setOfficialDryRunRows(rows);
      addLog('info', 'Official dry-run', `${rows.length} candidate(s) validated.`);
      showToast('info', 'Dry-run complete', `${rows.length} update(s) ready for install.`);
    } catch (e) {
      addLog('error', 'Official dry-run', String(e));
      showToast('error', 'Dry-run failed', String(e));
    }
  };

  const installOfficialDriverUpdates = async (autoAll = false) => {
    const keys = autoAll ? officialUpdates.map((x) => x.key) : selectedOfficialRows.map((x) => x.key);
    if (!keys.length) {
      showToast('warning', 'No official update selected', 'Select updates or use Auto Mode.');
      return;
    }
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    setBusy(true);
    setOfficialInstalling(true);
    try {
      const raw = await invoke('run_powershell', {
        command: `$wanted=${psArr(keys)};$before=Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue|Select-Object DeviceID,DriverVersion,InfName,DriverName,Manufacturer,DeviceClass;$s=New-Object -ComObject Microsoft.Update.Session;$searcher=$s.CreateUpdateSearcher();$res=$searcher.Search(\"IsInstalled=0 and Type='Driver' and IsHidden=0\");$coll=New-Object -ComObject Microsoft.Update.UpdateColl;foreach($u in $res.Updates){$k=([string]$u.Identity.UpdateID+'|'+[string]$u.Identity.RevisionNumber);if($wanted -contains $k){if(-not $u.EulaAccepted){try{$u.AcceptEula()|Out-Null}catch{}};[void]$coll.Add($u)}};if($coll.Count -eq 0){@{selected=0;installed=0;failed=0;rebootRequired=$false;results=@();diffs=@()}|ConvertTo-Json -Depth 7 -Compress;exit};$downloader=$s.CreateUpdateDownloader();$downloader.Updates=$coll;$null=$downloader.Download();$installer=$s.CreateUpdateInstaller();$installer.Updates=$coll;$ires=$installer.Install();$results=@();for($i=0;$i -lt $coll.Count;$i++){$u=$coll.Item($i);$r=$ires.GetUpdateResult($i);$results+=[PSCustomObject]@{title=[string]$u.Title;hresult=[int64]$r.HResult;code=[int]$r.ResultCode;rebootRequired=[bool]$r.RebootRequired}};$after=Get-CimInstance Win32_PnPSignedDriver -ErrorAction SilentlyContinue|Select-Object DeviceID,DriverVersion,InfName,DriverName,Manufacturer,DeviceClass;$beforeMap=@{};foreach($d in $before){$k=[string]$d.DeviceID;if($k){$beforeMap[$k]=$d}};$diffs=@();foreach($d in $after){$k=[string]$d.DeviceID;if(-not $k){continue};if($beforeMap.ContainsKey($k)){$b=$beforeMap[$k];if([string]$b.DriverVersion -ne [string]$d.DriverVersion){$diffs+=[PSCustomObject]@{key=$k;name=[string]$d.DriverName;manufacturer=[string]$d.Manufacturer;className=[string]$d.DeviceClass;beforeVersion=[string]$b.DriverVersion;afterVersion=[string]$d.DriverVersion;infName=[string]$d.InfName}}}};$ok=@($results|Where-Object{$_.code -eq 2 -or $_.code -eq 3}).Count;$fail=@($results|Where-Object{$_.code -ge 4}).Count;@{selected=$coll.Count;installed=$ok;failed=$fail;rebootRequired=[bool]$ires.RebootRequired;results=$results;diffs=$diffs}|ConvertTo-Json -Depth 8 -Compress`
      });
      const res = parse<{
        selected?: number;
        installed?: number;
        failed?: number;
        rebootRequired?: boolean;
        results?: OfficialInstallRow[];
        diffs?: DriverVersionDiff[];
      }>(raw, {});
      const needReboot = !!res.rebootRequired;
      setOfficialRebootRequired(needReboot);
      setOfficialInstallRows((res.results || []).map((r) => ({ ...r, hresultText: decodeHResult(Number(r.hresult || 0)) })));
      setOfficialVersionDiff(toArr(res.diffs || []));
      addLog((res.failed || 0) > 0 ? 'warning' : 'success', 'Official driver install', `selected:${res.selected || 0} installed:${res.installed || 0} failed:${res.failed || 0}`);
      showToast(
        (res.failed || 0) > 0 ? 'warning' : 'success',
        'Official driver install finished',
        `Installed ${res.installed || 0}/${res.selected || 0}. Failed ${res.failed || 0}.${needReboot ? ' Reboot required.' : ''}`
      );
      await scanOfficialDriverUpdates(false);
      await scanMain(false);
      await scanStore(false);
    } catch (e) {
      addLog('error', 'Official driver install', String(e));
      showToast('error', 'Official driver install failed', String(e));
    } finally {
      setOfficialInstalling(false);
      setBusy(false);
    }
  };

  const oneClickRollback = async () => {
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    const latestTx = txManifests[0];
    if (latestTx?.path) {
      setSelectedTxManifestPath(latestTx.path);
      setBusy(true);
      try {
        await invoke('run_powershell', {
          command: `$m=Get-Content ${psQ(latestTx.path)} -Raw|ConvertFrom-Json;$b=[string]$m.backupPath;pnputil /add-driver \"$b\\\\*.inf\" /subdirs /install|Out-Null;@{ok=$LASTEXITCODE}|ConvertTo-Json -Compress`
        });
        addLog('success', 'One-click rollback', `Transaction restored: ${latestTx.name}`);
        showToast('success', 'Rollback applied', `Transaction restored: ${latestTx.name}`);
        await scanStore(false);
        await scanMain(false);
      } catch (e) {
        addLog('error', 'One-click rollback', String(e));
        showToast('error', 'Rollback failed', String(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (backups[0]?.path) {
      setSelectedBackupPath(backups[0].path);
      setBusy(true);
      try {
        await invoke('run_powershell', {
          command: `$root=${psQ(backups[0].path)};pnputil /add-driver \"$root\\*.inf\" /subdirs /install | Out-Null;@{ok=$LASTEXITCODE}|ConvertTo-Json -Compress`
        });
        addLog('success', 'One-click rollback', `Backup restored: ${backups[0].name}`);
        showToast('success', 'Rollback applied', `Backup restored: ${backups[0].name}`);
        await scanStore(false);
        await scanMain(false);
      } catch (e) {
        addLog('error', 'One-click rollback', String(e));
        showToast('error', 'Rollback failed', String(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    showToast('warning', 'No rollback source', 'No transaction or backup found.');
  };

  useEffect(() => {
    if (!scheduleEnabled) return;
    if (!nextScheduledRun) setNextScheduledRun(computeNextRun(scheduleFrequency, scheduleHour));
    const timer = window.setInterval(() => {
      const next = nextScheduledRun ? new Date(nextScheduledRun).getTime() : 0;
      if (!next || Number.isNaN(next)) return;
      if (Date.now() >= next) {
        void enqueueJob('scan_official');
        if (scheduleMode === 'install') void enqueueJob('install_all');
        addLog('info', 'Scheduler', `Triggered ${scheduleMode} (${scheduleFrequency})`);
        setNextScheduledRun(computeNextRun(scheduleFrequency, scheduleHour));
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [scheduleEnabled, scheduleFrequency, scheduleMode, scheduleHour, nextScheduledRun, computeNextRun, addLog]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refreshBackgroundStatus();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [refreshBackgroundStatus]);

  useEffect(() => {
    void invoke('set_driver_background_enabled', { enabled: backgroundMode })
      .then(() => refreshBackgroundStatus())
      .catch(() => undefined);
  }, [backgroundMode, refreshBackgroundStatus]);

  const applyTransaction = async () => {
    const targets = pickedRows.map((x) => x.publishedName);
    if (!targets.length) {
      showToast('warning', 'No transaction items', 'Select package(s) first.');
      return;
    }
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    setBusy(true);
    try {
      const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const modeCmd =
        deleteMode === 'force'
          ? '/uninstall /force'
          : deleteMode === 'uninstall'
            ? '/uninstall'
            : '';
      const raw = await invoke('run_powershell', {
        command: `$root='${DRIVER_TX_ROOT}';New-Item -Path $root -ItemType Directory -Force|Out-Null;$backup=\"C:\\ProgramData\\ConfUtils\\DriverBackups\\tx_${stamp}\";New-Item -Path $backup -ItemType Directory -Force|Out-Null;$names=${psArr(targets)};$exp=0;$del=0;$fail=@();foreach($n in $names){try{pnputil /export-driver $n $backup|Out-Null;if($LASTEXITCODE -eq 0){$exp++}else{$fail+=$n;continue};pnputil /delete-driver $n ${modeCmd}|Out-Null;if($LASTEXITCODE -eq 0){$del++}else{$fail+=$n}}catch{$fail+=$n}};$manifest=[PSCustomObject]@{created=(Get-Date).ToString('s');backupPath=$backup;deleteMode='${deleteMode}';packages=@($names);failed=@($fail)};$manifestPath=Join-Path $root (\"tx_${stamp}.json\");$manifest|ConvertTo-Json -Depth 5|Set-Content -Path $manifestPath;@{exported=$exp;deleted=$del;failed=@($fail);manifest=$manifestPath;backup=$backup}|ConvertTo-Json -Compress`
      });
      const res = parse<{ exported?: number; deleted?: number; failed?: string[]; manifest?: string; backup?: string }>(raw, {});
      addLog((res.failed || []).length ? 'warning' : 'success', 'Transaction apply', `exp:${res.exported || 0} del:${res.deleted || 0} fail:${(res.failed || []).length}`);
      showToast((res.failed || []).length ? 'warning' : 'success', 'Transaction completed', `Deleted ${res.deleted || 0}, failed ${(res.failed || []).length}.`);
      await loadTxManifests();
      await loadBackups();
      await scanStore(false);
    } catch (e) {
      addLog('error', 'Transaction apply', String(e));
      showToast('error', 'Transaction failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const rollbackTransaction = async () => {
    if (!selectedTxManifestPath) {
      showToast('warning', 'No transaction selected', 'Pick a transaction manifest first.');
      return;
    }
    if (safeUpdate && !restoreStamp) {
      const ok = await createRestorePoint();
      if (!ok) return;
    }
    setBusy(true);
    try {
      await invoke('run_powershell', {
        command: `$m=Get-Content ${psQ(selectedTxManifestPath)} -Raw|ConvertFrom-Json;$b=[string]$m.backupPath;pnputil /add-driver \"$b\\\\*.inf\" /subdirs /install|Out-Null;@{ok=$LASTEXITCODE}|ConvertTo-Json -Compress`
      });
      addLog('success', 'Transaction rollback', selectedTxManifestPath);
      showToast('success', 'Rollback started', 'Transaction backup restore is running.');
      await scanStore(false);
      await scanMain(false);
    } catch (e) {
      addLog('error', 'Transaction rollback', String(e));
      showToast('error', 'Rollback failed', String(e));
    } finally {
      setBusy(false);
    }
  };

  const exportCliProfiles = () => {
    downloadFile('driver_cli_profiles.json', 'application/json', JSON.stringify(profiles, null, 2));
    addLog('success', 'CLI profile export', `${profiles.length} profile(s).`);
  };

  const importCliProfiles = () => {
    try {
      const parsed = JSON.parse(cliProfileJson) as BatchProfile[];
      if (!Array.isArray(parsed)) throw new Error('Invalid profile JSON');
      const normalized = parsed.filter((p) => p && p.id && p.name);
      setProfiles(normalized);
      localStorage.setItem(DRIVER_BATCH_PROFILES_KEY, JSON.stringify(normalized));
      addLog('success', 'CLI profile import', `${normalized.length} profile(s).`);
      showToast('success', 'Profiles imported', `${normalized.length} profile(s).`);
    } catch (e) {
      addLog('error', 'CLI profile import', String(e));
      showToast('error', 'Profile import failed', String(e));
    }
  };

  const runIntegrityCheck = async () => {
    if (!selectedBackupPath) {
      showToast('warning', 'No backup selected', 'Pick a backup folder first.');
      return;
    }
    try {
      const raw = await invoke('run_powershell', {
        command: `$p=${psQ(selectedBackupPath)};$files=Get-ChildItem -Path $p -Recurse -Filter '*.inf' -File -ErrorAction SilentlyContinue;$hash=if($files.Count -gt 0){$files|Get-FileHash -Algorithm SHA256}else{@()};@{count=$files.Count;hashCount=@($hash).Count;uniqueHashCount=@($hash|Select-Object -ExpandProperty Hash -Unique).Count}|ConvertTo-Json -Compress`
      });
      const res = parse<{ count?: number; hashCount?: number; uniqueHashCount?: number }>(raw, {});
      setIntegrityResult({ count: res.count || 0, hashCount: res.hashCount || 0, uniqueHashCount: res.uniqueHashCount || 0 });
      addLog('success', 'Integrity check', `files:${res.count || 0} hashes:${res.hashCount || 0}`);
    } catch (e) {
      addLog('error', 'Integrity check', String(e));
      showToast('error', 'Integrity check failed', String(e));
    }
  };

  const togglePinnedVendor = (vendor: string) => {
    setPinnedVendors((prev) => {
      const next = prev.includes(vendor) ? prev.filter((v) => v !== vendor) : [...prev, vendor];
      addLog('info', 'Pinned vendors', next.length ? next.join(', ') : 'none');
      return next;
    });
  };

  const saveProfile = () => {
    const name = `Profile ${new Date().toLocaleString()}`;
    const profile: BatchProfile = {
      id: `${Date.now()}`,
      name,
      includeBootCritical,
      forceDelete,
      deleteMode,
      storeClass,
      storeSort,
      ruleProvider,
      ruleMinAge,
      ruleOnlyNotInUse,
      pinnedVendors,
      density
    };
    setProfiles((prev) => {
      const next = [profile, ...prev].slice(0, 25);
      localStorage.setItem(DRIVER_BATCH_PROFILES_KEY, JSON.stringify(next));
      return next;
    });
    setSelectedProfileId(profile.id);
    addLog('success', 'Save profile', name);
    showToast('success', 'Profile saved', name);
  };

  const loadProfile = (id: string) => {
    setSelectedProfileId(id);
    const profile = profiles.find((p) => p.id === id);
    if (!profile) return;
    setIncludeBootCritical(profile.includeBootCritical);
    setForceDelete(profile.forceDelete);
    setDeleteMode(profile.deleteMode || 'uninstall');
    setStoreClass(profile.storeClass);
    setStoreSort(profile.storeSort);
    setRuleProvider(profile.ruleProvider);
    setRuleMinAge(profile.ruleMinAge);
    setRuleOnlyNotInUse(profile.ruleOnlyNotInUse);
    setPinnedVendors(profile.pinnedVendors);
    setDensity(profile.density);
    setPreset('custom');
    addLog('success', 'Load profile', profile.name);
    showToast('success', 'Profile loaded', profile.name);
  };

  const downloadFile = (filename: string, type: string, content: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportReport = (format: 'json' | 'csv' | 'html') => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const report = {
      generatedAt: new Date().toISOString(),
      risk,
      telemetry,
      firmware,
      outdatedCount: drivers.length,
      issueCount: issues.length,
      driverStoreCount: store.length,
      selectedCount: pickedRows.length,
      selectedSize: reclaimBytes,
      topDependencyGroups: dependencyGroups.slice(0, 8)
    };

    if (format === 'json') {
      downloadFile(`driver_hub_report_${stamp}.json`, 'application/json', JSON.stringify(report, null, 2));
    }
    if (format === 'csv') {
      const header = 'publishedName,originalName,provider,class,version,date,devicePresent,bootCritical,sizeBytes';
      const rows = store
        .map((x) => [x.publishedName, x.originalName, x.providerName, x.className, x.driverVersion, x.driverDate, x.devicePresent, x.bootCritical, x.sizeBytes].map((v) => `\"${String(v).replace(/\"/g, '\"\"')}\"`).join(','))
        .join('\n');
      downloadFile(`driver_store_${stamp}.csv`, 'text/csv', `${header}\n${rows}`);
    }
    if (format === 'html') {
      const rows = store
        .slice(0, 250)
        .map((x) => `<tr><td>${x.publishedName}</td><td>${x.providerName}</td><td>${x.className}</td><td>${x.driverVersion}</td><td>${x.driverDate}</td><td>${x.devicePresent ? 'In use' : 'Stale'}</td><td>${fmtBytes(x.sizeBytes)}</td></tr>`)
        .join('');
      const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Driver Hub Report</title><style>body{font-family:Segoe UI,Arial;margin:24px;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f5f5f5;text-align:left}.k{margin-bottom:12px}</style></head><body><h1>Driver Hub Report</h1><div class=\"k\">Generated: ${new Date().toLocaleString()}</div><div class=\"k\">Risk: ${risk} | Outdated: ${drivers.length} | Issues: ${issues.length} | Store: ${store.length}</div><table><thead><tr><th>Published INF</th><th>Provider</th><th>Class</th><th>Version</th><th>Date</th><th>Status</th><th>Size</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      downloadFile(`driver_hub_report_${stamp}.html`, 'text/html', html);
    }

    addLog('success', 'Offline report', `${format.toUpperCase()} exported.`);
    showToast('success', 'Report exported', `${format.toUpperCase()} file created.`);
  };

  const exportComplianceReport = (format: 'json' | 'html') => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const payload = {
      generatedAt: new Date().toISOString(),
      ring: safeRing,
      summary: complianceSummary,
      installResults: officialInstallRows,
      versionDiff: officialVersionDiff,
      queue: { enabled: backgroundMode, pending: bgStatus?.queue?.length || 0, running: !!bgStatus?.running },
      scheduler: { enabled: scheduleEnabled, frequency: scheduleFrequency, mode: scheduleMode, hour: scheduleHour, nextRun: nextScheduledRun }
    };
    if (format === 'json') {
      downloadFile(`driver_compliance_${stamp}.json`, 'application/json', JSON.stringify(payload, null, 2));
    } else {
      const resultRows = officialInstallRows
        .slice(0, 120)
        .map((r) => `<tr><td>${r.title}</td><td>${r.code}</td><td>${r.hresultText || ''}</td><td>${r.rebootRequired ? 'Yes' : 'No'}</td></tr>`)
        .join('');
      const diffRows = officialVersionDiff
        .slice(0, 120)
        .map((d) => `<tr><td>${d.name || d.infName}</td><td>${d.manufacturer}</td><td>${d.className}</td><td>${d.beforeVersion}</td><td>${d.afterVersion}</td></tr>`)
        .join('');
      const html = `<!doctype html><html><head><meta charset=\"utf-8\"><title>Driver Compliance Report</title><style>body{font-family:Segoe UI,Arial;margin:24px;color:#111}table{border-collapse:collapse;width:100%;margin-top:12px}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f5f5f5;text-align:left}.k{margin:6px 0}</style></head><body><h1>Driver Compliance Report</h1><div class=\"k\">Generated: ${new Date().toLocaleString()}</div><div class=\"k\">Ring: ${safeRing} | Installed: ${complianceSummary.installed} | Failed: ${complianceSummary.failed} | Diffed: ${complianceSummary.diffed} | Reboot: ${complianceSummary.reboot ? 'Yes' : 'No'}</div><h2>Install Results</h2><table><thead><tr><th>Title</th><th>Code</th><th>HResult</th><th>Reboot</th></tr></thead><tbody>${resultRows}</tbody></table><h2>Version Diff</h2><table><thead><tr><th>Device</th><th>Vendor</th><th>Class</th><th>Before</th><th>After</th></tr></thead><tbody>${diffRows}</tbody></table></body></html>`;
      downloadFile(`driver_compliance_${stamp}.html`, 'text/html', html);
    }
    addLog('success', 'Compliance export', `${format.toUpperCase()} exported.`);
    showToast('success', 'Compliance report exported', format.toUpperCase());
  };

  const timeline = firmwareAge === null ? 0 : Math.min(100, (firmwareAge / 6) * 100);
  const trendMaxSize = Math.max(1, ...trend.map((t) => t.sizeBytes));

  return (
    <div className="dfh-shell">
      <section className="dfh-hero">
        <div className="dfh-hero-head">
          <div>
            <h2 className="dfh-title">{t('driver_hub_title' as any)}</h2>
            <p className="dfh-subtitle">{t('driver_hub_subtitle' as any)}</p>
            <div className="dfh-last-action">Last action: {lastAction}</div>
          </div>
          <div className={`dfh-risk-badge ${riskClass}`}><RiskIcon size={14} />Risk {risk}</div>
        </div>
        <div className="dfh-hero-stats">
          <div className="dfh-chip"><Cpu size={14} />CPU {telemetry.cpu.toFixed(0)}%</div>
          <div className="dfh-chip"><BrainCircuit size={14} />RAM {telemetry.mem.toFixed(0)}%</div>
          <div className="dfh-chip"><HardDrive size={14} />NET {telemetry.netMBps.toFixed(1)} MB/s</div>
          <div className="dfh-chip">Last scan: {lastScan || '-'}</div>
          <div className="dfh-chip">Restore: {restoreStamp || 'Not ready'}</div>
          <div className="dfh-chip">Density: {density}</div>
        </div>
      </section>

      <section className="dfh-toolbar">
        <button className="btn btn-primary" onClick={() => scanMain(true)} disabled={loading}>{loading ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}{t('driver_hub_scan_now' as any)}</button>
        <button className="btn btn-secondary" onClick={() => scanStore(true)} disabled={storeLoading}>{storeLoading ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}Scan Driver Store</button>
        <button className="btn btn-secondary" onClick={() => scanOfficialDriverUpdates(true)} disabled={officialLoading}>{officialLoading ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}Scan Official Driver Updates</button>
        <button className="btn btn-ghost" onClick={() => invoke('open_device_manager').catch((e) => showToast('error', 'Action failed', String(e)))}><Wrench size={14} />Device Manager</button>
        <button className="btn btn-ghost" onClick={() => invoke('run_powershell', { command: 'Start-Process \"ms-settings:windowsupdate\"' }).catch((e) => showToast('error', 'Action failed', String(e)))}><ExternalLink size={14} />Windows Update</button>
        <button className="btn btn-secondary" onClick={createRestorePoint} disabled={creatingRestore}>{creatingRestore ? <RefreshCw size={14} className="spin" /> : <ShieldCheck size={14} />}Create Restore Point</button>
        <button className={`btn ${safeUpdate ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSafeUpdate((v) => !v)}>{safeUpdate ? 'Safe Update: ON' : 'Safe Update: OFF'}</button>
        <button className={`btn ${density === 'compact' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}>{density === 'compact' ? 'Compact' : 'Comfortable'}</button>
      </section>

      <div className="dfh-metric-grid">
        <div className="control-card"><div className="card-header"><div className={`card-icon-wrapper ${riskClass === 'error' ? 'danger' : riskClass === 'warning' ? 'warning' : 'success'}`}><RiskIcon size={20} /></div><div className={`card-status ${riskClass}`}><span className="card-status-dot" />{risk >= 60 ? 'Critical' : risk >= 25 ? 'Attention' : 'Safe'}</div></div><h3 className="card-title">Risk Score: {risk}</h3><p className="card-description">Live telemetry + outdated drivers + firmware age.</p></div>
        <div className="control-card"><div className="card-header"><div className="card-icon-wrapper cyan"><BarChart3 size={20} /></div><div className="card-status customize"><span className="card-status-dot" />Store trend</div></div><h3 className="card-title">Driver Store Trend</h3><div className="dfh-trend">{trend.slice(0, 12).reverse().map((x, i) => <div key={`${x.timestamp}_${i}`} className="dfh-trend-bar-wrap" title={`${new Date(x.timestamp).toLocaleString()} | ${x.count} pkg | ${fmtBytes(x.sizeBytes)}`}><div className="dfh-trend-bar" style={{ height: `${Math.max(10, (x.sizeBytes / trendMaxSize) * 64)}px` }} /><span>{new Date(x.timestamp).toLocaleDateString()}</span></div>)}</div></div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Official Driver Booster (Windows Update)</span><span className="list-count">{selectedOfficialRows.length} / {officialUpdates.length} selected</span></div>
        <div className="dfh-actions">
          <button className="btn btn-ghost" onClick={() => scanOfficialDriverUpdates(true)} disabled={officialLoading || officialInstalling}>{officialLoading ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}Refresh list</button>
          <button className="btn btn-ghost" onClick={() => setOfficialPick(Object.fromEntries(filteredOfficialUpdates.map((x) => [x.key, true])))} disabled={!filteredOfficialUpdates.length || officialInstalling}>Select visible</button>
          <button className="btn btn-ghost" onClick={() => setOfficialPick({})} disabled={!Object.keys(officialPick).length || officialInstalling}>Clear</button>
          <button className="btn btn-ghost" onClick={runOfficialDryRun} disabled={officialInstalling || !selectedOfficialRows.length}><FileText size={14} />Dry-run</button>
          <button className="btn btn-secondary" onClick={() => installOfficialDriverUpdates(false)} disabled={busy || officialInstalling || !selectedOfficialRows.length}>{officialInstalling ? <RefreshCw size={14} className="spin" /> : <Download size={14} />}Download + Install Selected</button>
          <button className="btn btn-primary" onClick={() => installOfficialDriverUpdates(true)} disabled={busy || officialInstalling || !officialUpdates.length}><ShieldCheck size={14} />Auto Mode (All Official)</button>
          {officialRebootRequired ? <span className="card-status warning"><span className="card-status-dot" />Reboot required</span> : null}
        </div>
        <div className="dfh-filter-row">
          <div className="search-input dfh-search">
            <Search className="search-icon" size={16} />
            <input className="input" value={officialQuery} onChange={(e) => setOfficialQuery(e.target.value)} placeholder="Search title / vendor / class / model" />
          </div>
          <PremiumDropdown id="official-class" label="Class filter" value={officialClassFilter} options={officialClassOptions} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={setOfficialClassFilter} />
        </div>
        <div className="dfh-actions">
          <input className="input" style={{ minWidth: 220 }} value={officialAllowTokens} onChange={(e) => setOfficialAllowTokens(e.target.value)} placeholder="Allow tokens (csv): intel,nvidia,net" />
          <input className="input" style={{ minWidth: 220 }} value={officialBlockTokens} onChange={(e) => setOfficialBlockTokens(e.target.value)} placeholder="Block tokens (csv): beta,preview,test" />
        </div>
        <div className="dfh-table-header"><span>Sel</span><span>Title</span><span>Vendor / Class</span><span>Date</span><span>Size</span><span>Reboot</span></div>
        {filteredOfficialUpdates.length === 0 ? (
          <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>
            No official driver updates listed yet. Run "Scan Official Driver Updates".
          </div>
        ) : (
          filteredOfficialUpdates.slice(0, 120).map((u) => (
            <div key={u.key} className={`list-item dfh-store-row ${density === 'compact' ? 'compact' : ''}`}>
              <input type="checkbox" checked={!!officialPick[u.key]} onChange={(e) => setOfficialPick((prev) => ({ ...prev, [u.key]: e.target.checked }))} />
              <div className="list-item-content" style={{ flex: 2 }}>
                <div className="list-item-title">{u.title}</div>
                <div className="list-item-subtitle">Model: {u.driverModel || '-'}</div>
              </div>
              <div className="dfh-col">
                <div className="list-item-subtitle">{u.manufacturer || '-'}</div>
                <div className="list-item-subtitle">{u.driverClass || '-'}</div>
              </div>
              <div className="dfh-col"><div className="font-mono">{u.date || '-'}</div></div>
              <div className="dfh-col"><div className="font-mono">{fmtBytes(u.sizeBytes)}</div></div>
              <div>{u.rebootBehavior > 0 ? <span className="card-status warning"><span className="card-status-dot" />Possible</span> : <span className="card-meta">No</span>}</div>
            </div>
          ))
        )}
        {officialDryRunRows.length > 0 ? (
          <div style={{ padding: '8px 16px 14px' }}>
            <div className="list-item-subtitle" style={{ marginBottom: 8 }}>Dry-run validation</div>
            {officialDryRunRows.slice(0, 12).map((r, i) => (
              <div key={`dry_${i}`} className="list-item">
                <div className="list-item-content">
                  <div className="list-item-subtitle">{r}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {officialInstallRows.length > 0 ? (
          <div style={{ padding: '8px 16px 14px' }}>
            <div className="list-item-subtitle" style={{ marginBottom: 8 }}>Install results (HResult decoded)</div>
            {officialInstallRows.slice(0, 16).map((r, i) => (
              <div key={`inst_${i}`} className="list-item">
                <div className="list-item-content">
                  <div className="list-item-title">{r.title}</div>
                  <div className="list-item-subtitle">{r.hresultText}</div>
                </div>
                <div className={`card-status ${r.code >= 4 ? 'error' : 'customize'}`}><span className="card-status-dot" />code {r.code}</div>
              </div>
            ))}
          </div>
        ) : null}
        {officialVersionDiff.length > 0 ? (
          <div style={{ padding: '0 16px 14px' }}>
            <div className="list-item-subtitle" style={{ marginBottom: 8 }}>Pre/Post version diff</div>
            {officialVersionDiff.slice(0, 16).map((d) => (
              <div key={d.key} className="list-item">
                <div className="list-item-content">
                  <div className="list-item-title">{d.name || d.infName}</div>
                  <div className="list-item-subtitle">{d.manufacturer} | {d.className} | {d.infName}</div>
                </div>
                <div className="font-mono">{d.beforeVersion}{' -> '}{d.afterVersion}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Safe Rings</span><span className="list-count">{safeRing.toUpperCase()}</span></div>
        <div className="dfh-actions">
          <button className={`btn ${safeRing === 'stable' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSafeRing('stable')}>Stable</button>
          <button className={`btn ${safeRing === 'balanced' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSafeRing('balanced')}>Balanced</button>
          <button className={`btn ${safeRing === 'aggressive' ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setSafeRing('aggressive')}>Aggressive</button>
          <span className="card-meta">Ring policy updates allow/block filters automatically.</span>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Scheduled Auto-Scan</span><span className="list-count">{scheduleEnabled ? 'Enabled' : 'Disabled'}</span></div>
        <div className="dfh-actions">
          <button className={`btn ${scheduleEnabled ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { const next = !scheduleEnabled ? computeNextRun(scheduleFrequency, scheduleHour) : ''; setScheduleEnabled((v) => !v); setNextScheduledRun(next); }}>{scheduleEnabled ? 'Disable schedule' : 'Enable schedule'}</button>
          <PremiumDropdown id="sched-freq" label="Frequency" value={scheduleFrequency} options={[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }]} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={(v) => setScheduleFrequency(v as 'daily' | 'weekly')} />
          <PremiumDropdown id="sched-mode" label="Mode" value={scheduleMode} options={[{ value: 'report', label: 'Scan + report' }, { value: 'install', label: 'Scan + auto-install' }]} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={(v) => setScheduleMode(v as 'report' | 'install')} />
          <input className="input" style={{ width: 110 }} value={scheduleHour} onChange={(e) => setScheduleHour(e.target.value)} placeholder="HH:MM" />
          <button className="btn btn-ghost" onClick={() => setNextScheduledRun(computeNextRun(scheduleFrequency, scheduleHour))}>Recalc next run</button>
          <span className="card-meta">Next: {nextScheduledRun ? new Date(nextScheduledRun).toLocaleString() : '-'}</span>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Background Queue Mode</span><span className="list-count">{bgStatus?.running ? 'Running' : `${bgStatus?.queue?.length || 0} queued`}</span></div>
        <div className="dfh-actions">
          <button className={`btn ${backgroundMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setBackgroundMode((v) => !v)}>{backgroundMode ? 'Background ON' : 'Background OFF'}</button>
          <button className="btn btn-ghost" onClick={() => void enqueueJob('scan_official')}>Queue: Scan official</button>
          <button className="btn btn-ghost" onClick={() => void enqueueJob('install_selected')} disabled={!selectedOfficialRows.length}>Queue: Install selected</button>
          <button className="btn btn-ghost" onClick={() => void enqueueJob('install_all')} disabled={!officialUpdates.length}>Queue: Install all</button>
          <button className="btn btn-ghost" onClick={() => invoke('clear_driver_background_jobs').then(() => refreshBackgroundStatus()).catch(() => undefined)} disabled={!(bgStatus?.queue?.length)}>Clear queue</button>
          <button className="btn btn-ghost" onClick={refreshBackgroundStatus}><RefreshCw size={14} />Refresh status</button>
          <span className="card-meta">Current: {bgStatus?.current?.job_type || '-'}</span>
          <span className="card-meta">Last: {bgStatus?.last_result || '-'}</span>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">One-click Rollback</span><span className="list-count">Latest transaction/backup</span></div>
        <div className="dfh-actions">
          <button className="btn btn-secondary" onClick={oneClickRollback} disabled={busy || (!txManifests.length && !backups.length)}><RotateCcw size={14} />Rollback Last Change</button>
          <span className="card-meta">Uses latest transaction first, fallback to latest backup.</span>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Compliance Report</span><span className="list-count">Installed {complianceSummary.installed} | Failed {complianceSummary.failed}</span></div>
        <div className="dfh-actions">
          <button className="btn btn-ghost" onClick={() => exportComplianceReport('json')}><FileText size={14} />Export JSON</button>
          <button className="btn btn-ghost" onClick={() => exportComplianceReport('html')}><FileText size={14} />Export HTML</button>
          <span className="card-meta">Diff rows: {complianceSummary.diffed} | Reboot: {complianceSummary.reboot ? 'Yes' : 'No'}</span>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Driver Health Score</span><span className="list-count">{driverHealth.length} device(s)</span></div>
        {driverHealth.length === 0 ? (
          <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No score yet. Run a main scan first.</div>
        ) : (
          driverHealth.slice(0, 16).map((d, i) => (
            <div key={`health_${i}`} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">{d.name}</div>
                <div className="list-item-subtitle">{d.manufacturer} | {d.version} | age {d.age.toFixed(1)}y</div>
              </div>
              <div className={`card-status ${d.score < 40 ? 'error' : d.score < 70 ? 'warning' : 'customize'}`}><span className="card-status-dot" />{d.score}</div>
            </div>
          ))
        )}
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">OEM Match Layer</span><span className="list-count">{oemMatches.length} suggestion(s)</span></div>
        {oemMatches.length === 0 ? (
          <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No OEM match suggestion currently.</div>
        ) : (
          oemMatches.map((x, i) => (
            <div key={`oem_${i}`} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">{x.vendor}</div>
                <div className="list-item-subtitle">{x.match.title} | {x.driver}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => openExternal(x.match.url)}><ExternalLink size={14} />Open OEM</button>
            </div>
          ))
        )}
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Smart Presets + Rule Engine</span><span className="list-count">{preset.toUpperCase()}</span></div>
        <div className="dfh-actions">
          <button className={`btn ${preset === 'safe' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => applyPreset('safe')}><Wand2 size={14} />Safe</button>
          <button className={`btn ${preset === 'balanced' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => applyPreset('balanced')}><Wand2 size={14} />Balanced</button>
          <button className={`btn ${preset === 'aggressive' ? 'btn-danger' : 'btn-ghost'}`} onClick={() => applyPreset('aggressive')}><Wand2 size={14} />Aggressive</button>
          <div className="dfh-rule-box"><Filter size={14} /><input className="input" value={ruleProvider} onChange={(e) => setRuleProvider(e.target.value)} placeholder="Provider contains" /><input className="input" style={{ width: 74 }} type="number" min={0} step={0.5} value={ruleMinAge} onChange={(e) => setRuleMinAge(Number(e.target.value || 0))} /><label className="dfh-checkbox-line"><input type="checkbox" checked={ruleOnlyNotInUse} onChange={(e) => setRuleOnlyNotInUse(e.target.checked)} />only not-in-use</label><button className="btn btn-ghost" onClick={applyRuleSelection}>Apply Rule</button></div>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Driver Store Cleanup (DSE logic)</span><span className="list-count">{pickedRows.length} selected</span></div>
        {pickedRows.length > 0 ? <div className="dfh-selection-bar"><span>{pickedRows.length} selected</span><span>Reclaimable: {fmtBytes(reclaimBytes)}</span><button className="btn btn-ghost" onClick={() => setPreviewOpen((v) => !v)}><FileText size={14} />{previewOpen ? 'Hide Preview' : 'Cleanup Preview'}</button><button className="btn btn-ghost" onClick={() => exportDrivers(false)} disabled={busy}><Download size={14} />Export Selected</button><button className="btn btn-danger" onClick={deleteSelected} disabled={busy}><Trash2 size={14} />Delete Selected</button></div> : null}
        {previewOpen ? <div className="dfh-preview"><div className="dfh-preview-card"><strong>Packages</strong><span>{preview.count}</span></div><div className="dfh-preview-card"><strong>Estimated reclaim</strong><span>{fmtBytes(preview.sizeBytes)}</span></div><div className="dfh-preview-card"><strong>In-use among selected</strong><span>{preview.inUse}</span></div><div className="dfh-preview-card"><strong>Boot critical selected</strong><span>{preview.boot}</span></div><div className="dfh-preview-wide"><strong>Affected classes:</strong> {preview.classes.join(', ') || 'none'}</div><div className="dfh-preview-wide"><strong>Affected providers:</strong> {preview.providers.join(', ') || 'none'}</div></div> : null}
        <div className="dfh-actions"><button className="btn btn-ghost" onClick={selectOldCandidates} disabled={storeLoading || busy || !store.length}><ShieldCheck size={14} />Select Old Drivers</button><button className="btn btn-ghost" onClick={() => exportDrivers(true)} disabled={busy || !store.length}><Download size={14} />Export All</button><button className={`btn ${includeBootCritical ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setIncludeBootCritical((v) => !v)} disabled={busy}>{includeBootCritical ? 'Boot Critical: Included' : 'Boot Critical: Excluded'}</button><button className={`btn ${forceDelete ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setForceDelete((v) => !v)} disabled={busy}>{forceDelete ? 'Force Delete: ON' : 'Force Delete: OFF'}</button><PremiumDropdown id="delete-mode" label="Delete mode" value={deleteMode} options={deleteModeOptions} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={(v) => setDeleteMode(v as 'normal' | 'uninstall' | 'force')} /><button className="btn btn-secondary" onClick={applyTransaction} disabled={busy || !pickedRows.length}>Apply Transaction</button></div>
        <div className="dfh-filter-row"><div className="search-input dfh-search"><Search className="search-icon" size={16} /><input className="input" value={storeQuery} onChange={(e) => setStoreQuery(e.target.value)} placeholder="Search INF / provider / class" /></div><PremiumDropdown id="store-class" label="Class" value={storeClass} options={storeClassOptions} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={setStoreClass} /><PremiumDropdown id="store-sort" label="Sort" value={storeSort} options={storeSortOptions} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={setStoreSort} /></div>
        <div className="dfh-actions"><PremiumDropdown id="adv-inuse" label="In-use filter" value={advInUse} options={[{ value: 'all', label: 'All' }, { value: 'in_use', label: 'In use' }, { value: 'stale', label: 'Stale only' }]} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={(v) => setAdvInUse(v as 'all' | 'in_use' | 'stale')} /><PremiumDropdown id="adv-boot" label="Boot filter" value={advBoot} options={[{ value: 'all', label: 'All' }, { value: 'boot', label: 'Boot critical' }, { value: 'non_boot', label: 'Non-boot' }]} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={(v) => setAdvBoot(v as 'all' | 'boot' | 'non_boot')} /><input className="input" style={{ width: 90 }} placeholder="min MB" value={advSizeMinMb} onChange={(e) => setAdvSizeMinMb(e.target.value)} /><input className="input" style={{ width: 90 }} placeholder="max MB" value={advSizeMaxMb} onChange={(e) => setAdvSizeMaxMb(e.target.value)} /><input className="input" style={{ width: 140 }} placeholder="ext id contains" value={advExtQuery} onChange={(e) => setAdvExtQuery(e.target.value)} /><input className="input" type="date" value={advDateFrom} onChange={(e) => setAdvDateFrom(e.target.value)} /><input className="input" type="date" value={advDateTo} onChange={(e) => setAdvDateTo(e.target.value)} /></div>
        <div className="dfh-table-header"><span>Sel</span><span>Package</span><span>Date</span><span>Size</span><span>Status</span><span>Flags</span></div>
        {filteredStore.length === 0 ? (
          <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>
            No driver store packages found. Run a scan and use preset selection to continue.
          </div>
        ) : (
          filteredStore.slice(0, 180).map((x) => (
            <div key={x.publishedName} className={`list-item dfh-store-row ${density === 'compact' ? 'compact' : ''}`}>
              <input type="checkbox" checked={!!pick[x.publishedName]} onChange={(e) => setPick((prev) => ({ ...prev, [x.publishedName]: e.target.checked }))} />
              <div className="list-item-content" style={{ flex: 2 }}>
                <div className="list-item-title">{x.publishedName} ({x.originalName})</div>
                <div className="list-item-subtitle">{x.providerName} | {x.className} | {x.driverVersion}</div>
                <div className="list-item-subtitle">Devices: {x.deviceNames.length ? x.deviceNames.slice(0, 2).join(', ') : 'none'}{x.deviceNames.length > 2 ? ' ...' : ''}</div>
              </div>
              <div className="dfh-col"><div className="font-mono">{x.driverDate}</div></div>
              <div className="dfh-col"><div className="font-mono">{fmtBytes(x.sizeBytes)}</div></div>
              <div className={`card-status ${x.devicePresent ? 'warning' : 'customize'}`}><span className="card-status-dot" />{x.devicePresent ? 'In use' : 'Stale'}</div>
              <div className="flex items-center gap-sm">
                {x.bootCritical ? <span className="card-status error"><span className="card-status-dot" />Boot</span> : <span className="card-meta">-</span>}
                <button className="btn btn-ghost" onClick={() => setDetailEntry(x)}>
                  <FileText size={14} />
                  Detail
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Install Driver Package (.INF)</span><span className="list-count">PnPUtil</span></div>
        <div className="dfh-actions">
          <input className="input" style={{ minWidth: 360, flex: 1 }} value={installInfPath} onChange={(e) => setInstallInfPath(e.target.value)} placeholder="INF file or folder path (e.g. C:\Drivers\Display\oem_setup.inf)" />
          <label className="dfh-checkbox-line">
            <input type="checkbox" checked={installRecursive} onChange={(e) => setInstallRecursive(e.target.checked)} />
            Include subfolders
          </label>
          <button className="btn btn-secondary" onClick={installInfPackage} disabled={busy || !installInfPath.trim()}>
            <Upload size={14} />
            Install INF
          </button>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Ghost Device Awareness</span><span className="list-count">{ghostRows.length} stale package(s)</span></div>
        {ghostRows.length === 0 ? (
          <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No stale package detected.</div>
        ) : (
          ghostRows.slice(0, 10).map((x) => (
            <div key={`ghost_${x.publishedName}`} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">{x.publishedName}</div>
                <div className="list-item-subtitle">{x.providerName} | {x.className} | {x.driverVersion}</div>
              </div>
              <div className="card-meta">{fmtBytes(x.sizeBytes)}</div>
            </div>
          ))
        )}
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Duplicate Detector</span><span className="list-count">{duplicateGroups.length} group(s)</span></div>
        {duplicateGroups.length === 0 ? (
          <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No duplicate groups detected.</div>
        ) : (
          duplicateGroups.slice(0, 8).map((g) => (
            <div key={g.key} className="list-item">
              <div className="list-item-content">
                <div className="list-item-title">{g.rows[0].providerName} | {g.rows[0].className} | {g.rows[0].originalName}</div>
                <div className="list-item-subtitle">{g.rows.length} package(s): {g.rows.map((r) => r.publishedName).join(', ')}</div>
              </div>
              <button className="btn btn-ghost" onClick={() => setPick((prev) => ({ ...prev, ...Object.fromEntries(g.rows.slice(1).map((r) => [r.publishedName, true] as const)) }))}>
                Select old copies
              </button>
            </div>
          ))
        )}
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Transaction Rollback</span><span className="list-count">{txManifests.length} manifest(s)</span></div>
        <div className="dfh-actions">
          <PremiumDropdown
            id="tx-manifest"
            label="Transaction manifest"
            value={selectedTxManifestPath}
            options={txManifestOptions.length ? txManifestOptions : [{ value: '', label: 'No transactions found' }]}
            openId={openDropdown}
            onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))}
            onChange={setSelectedTxManifestPath}
          />
          <button className="btn btn-ghost" onClick={loadTxManifests}><RefreshCw size={14} />Refresh</button>
          <button className="btn btn-secondary" onClick={rollbackTransaction} disabled={busy || !selectedTxManifestPath}><RotateCcw size={14} />Rollback Selected</button>
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">Backup Integrity Check</span><span className="list-count">{integrityResult ? `${integrityResult.uniqueHashCount} unique hash` : 'Not run'}</span></div>
        <div className="dfh-actions">
          <button className="btn btn-ghost" onClick={runIntegrityCheck} disabled={busy || !selectedBackupPath}>
            <ShieldCheck size={14} />
            Run check on selected backup
          </button>
          {integrityResult ? (
            <span className="card-meta">
              Files: {integrityResult.count} | Hashes: {integrityResult.hashCount} | Unique: {integrityResult.uniqueHashCount}
            </span>
          ) : null}
        </div>
      </div>

      <div className="list-container dfh-panel mb-lg">
        <div className="list-header"><span className="list-title">CLI-Compatible Profiles</span><span className="list-count">{profiles.length} saved</span></div>
        <div className="dfh-actions">
          <button className="btn btn-ghost" onClick={exportCliProfiles}><Download size={14} />Export CLI JSON</button>
          <button className="btn btn-secondary" onClick={importCliProfiles} disabled={!cliProfileJson.trim()}><Upload size={14} />Import JSON</button>
        </div>
        <div style={{ padding: '8px 16px 14px' }}>
          <textarea
            className="input"
            style={{ width: '100%', minHeight: 110, resize: 'vertical' }}
            value={cliProfileJson}
            onChange={(e) => setCliProfileJson(e.target.value)}
            placeholder="Paste profile JSON array here to import"
          />
        </div>
      </div>

      {detailEntry ? (
        <div className="list-container dfh-panel mb-lg">
          <div className="list-header"><span className="list-title">Driver Package Detail</span><span className="list-count">{detailEntry.publishedName}</span></div>
          <div className="dfh-actions">
            <div className="card-meta">Provider: {detailEntry.providerName}</div>
            <div className="card-meta">Class: {detailEntry.className}</div>
            <div className="card-meta">Version: {detailEntry.driverVersion}</div>
            <div className="card-meta">Date: {detailEntry.driverDate}</div>
            <div className="card-meta">Ext ID: {detailEntry.driverExtensionId || '-'}</div>
            <div className="card-meta">Size: {fmtBytes(detailEntry.sizeBytes)}</div>
            <button className="btn btn-ghost" onClick={() => setDetailEntry(null)}>Close</button>
          </div>
        </div>
      ) : null}

      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title"><Layers size={14} /> Dependency Awareness</span><span className="list-count">{dependencyGroups.length}</span></div>{dependencyGroups.length === 0 ? <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No grouping yet. Scan Driver Store first.</div> : dependencyGroups.map((g) => (<div key={g.key} className="list-item"><div className="list-item-content"><div className="list-item-title">{g.provider} | {g.className}</div><div className="list-item-subtitle">packages: {g.count} | selected: {g.selected} | in-use: {g.inUse}</div></div><div className="card-meta">{fmtBytes(g.sizeBytes)}</div></div>))}</div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">Driver Vendor Focus</span><span className="list-count">Pinned {pinnedVendors.length}</span></div><div className="dfh-vendor-grid">{vendorStats.map((v) => {const pinned = pinnedVendors.includes(v.vendor);return (<button key={v.vendor} className={`dfh-vendor-chip ${pinned ? 'active' : ''}`} onClick={() => togglePinnedVendor(v.vendor)}>{pinned ? <Pin size={13} /> : <PinOff size={13} />}{v.vendor}<span>{v.count}</span></button>);})}</div></div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">Batch Profiles</span><span className="list-count">{profiles.length}</span></div><div className="dfh-actions"><button className="btn btn-ghost" onClick={saveProfile}><Save size={14} />Save Current</button><PremiumDropdown id="profile-load" label="Load profile" value={selectedProfileId} options={profileOptions} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={loadProfile} /></div></div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">Restore Wizard</span><span className="list-count">{backups.length} backups</span></div><div className="dfh-actions"><button className="btn btn-ghost" onClick={() => { setRestoreOpen((v) => !v); loadBackups(); }}><RotateCcw size={14} />{restoreOpen ? 'Hide Wizard' : 'Open Wizard'}</button><button className="btn btn-ghost" onClick={loadBackups}><RefreshCw size={14} />Refresh Backup List</button></div>{restoreOpen ? (<div className="dfh-restore-box"><PremiumDropdown id="backup-select" label="Backup folder" value={selectedBackupPath} options={backupOptions.length ? backupOptions : [{ value: '', label: 'No backups found' }]} openId={openDropdown} onToggle={(id) => setOpenDropdown((prev) => (prev === id ? null : id || null))} onChange={setSelectedBackupPath} /><button className="btn btn-secondary" onClick={restoreFromBackup} disabled={busy || !selectedBackupPath}><Upload size={14} />Restore Selected Backup</button></div>) : null}</div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">Offline Report Export</span><span className="list-count">JSON / CSV / HTML</span></div><div className="dfh-actions"><button className="btn btn-ghost" onClick={() => exportReport('json')}><FileText size={14} />JSON</button><button className="btn btn-ghost" onClick={() => exportReport('csv')}><FileText size={14} />CSV</button><button className="btn btn-ghost" onClick={() => exportReport('html')}><FileText size={14} />HTML</button></div></div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">Firmware Advisor</span><span className="list-count">Overview</span></div><div className="card-grid firmware-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}><div className="control-card firmware-card dfh-firmware-main"><h3 className="card-title">{firmware.biosVersion}</h3><p className="card-description">{firmware.systemModel}</p><div className="list-item-subtitle">BIOS Date: {firmware.biosDate}</div><div className="list-item-subtitle">Firmware Age: {firmwareAge === null ? 'N/A' : `${firmwareAge.toFixed(1)}y`}</div><div className="dfh-timeline"><div className="dfh-timeline-fill" style={{ width: `${timeline}%` }} /></div></div><div className="control-card firmware-card"><div className="list-item"><div className="list-item-content"><div className="list-item-title">Board Vendor</div><div className="list-item-subtitle">{firmware.boardVendor}</div></div></div><div className="list-item"><div className="list-item-content"><div className="list-item-title">Board Model</div><div className="list-item-subtitle">{firmware.boardProduct}</div></div></div><div className="list-item"><div className="list-item-content"><div className="list-item-title">Advisor</div><div className="list-item-subtitle">{firmwareAge !== null && firmwareAge > 4 ? 'Firmware is aging. Prefer OEM BIOS utility and model-specific package.' : 'Firmware looks recent. Focus on driver stack first.'}</div></div></div></div></div></div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">{t('driver_hub_outdated_drivers' as any)}</span><span className="list-count">{filteredDrivers.length} / {drivers.length}</span></div><div className="search-input dfh-search" style={{ margin: '10px 16px 12px' }}><Search className="search-icon" size={16} /><input className="input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search driver / vendor / version" /></div>{filteredDrivers.length === 0 ? <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No outdated drivers for current filters. Try removing vendor pins.</div> : filteredDrivers.slice(0, 80).map((d, i) => (<div key={`${d.Name || 'driver'}_${i}`} className="list-item"><div className="list-item-content" style={{ flex: 2 }}><div className="list-item-title">{d.Name || 'Unknown Device'}</div><div className="list-item-subtitle">{d.Manufacturer || 'Unknown'} | {d.DriverVersion || 'N/A'}</div></div><div className="font-mono" style={{ color: 'var(--text-90)', minWidth: 96 }}>{d.DriverDate || 'N/A'}</div><div className="font-mono" style={{ minWidth: 65, color: (d.AgeYears || 0) >= 4 ? 'var(--danger)' : 'var(--warning)' }}>{(d.AgeYears ?? 0).toFixed(1)}y</div><div className="flex items-center gap-sm">{d.OfficialUrl ? <button className="btn btn-ghost" onClick={() => safeOpen(d, d.OfficialUrl)}><ExternalLink size={14} />Safe Official</button> : null}<button className="btn btn-ghost" onClick={() => safeOpen(d, d.SearchUrl)}><ExternalLink size={14} />Safe Search</button></div></div>))}</div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">{t('driver_hub_device_issues' as any)}</span><span className="list-count">{issues.length}</span></div>{issues.length === 0 ? <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>{t('driver_hub_no_issues' as any)}</div> : issues.map((x, i) => (<div key={`${x.InstanceId || 'issue'}_${i}`} className="list-item"><div className="list-item-content"><div className="list-item-title">{x.FriendlyName || 'Unknown Device'}</div><div className="list-item-subtitle">{x.Class || 'Unknown class'} | {x.InstanceId || '-'}</div></div><div className="card-status error"><span className="card-status-dot" />{x.Status || 'Error'}</div></div>))}</div>
      <div className="list-container dfh-panel mb-lg"><div className="list-header"><span className="list-title">Session Log</span><span className="list-count">{sessionLogs.length}</span></div>{sessionLogs.length === 0 ? <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No events yet.</div> : sessionLogs.slice(0, 20).map((l) => (<div key={l.id} className="list-item"><div className="list-item-content"><div className="list-item-title">{new Date(l.timestamp).toLocaleString()} - {l.action}</div><div className="list-item-subtitle">{l.detail}</div></div><div className={`card-status ${l.level === 'error' ? 'error' : l.level === 'warning' ? 'warning' : 'customize'}`}><span className="card-status-dot" />{l.level}</div></div>))}</div>
      <div className="list-container dfh-panel"><div className="list-header"><span className="list-title">History</span><span className="list-count">{history.length} snapshots</span></div>{history.length === 0 ? <div className="text-muted mt-sm" style={{ padding: '12px 16px' }}>No snapshots yet. Run a scan to start tracking changes.</div> : history.slice(0, 8).map((h, i) => (<div key={`${h.timestamp}_${i}`} className="list-item"><div className="list-item-content"><div className="list-item-title">{new Date(h.timestamp).toLocaleString()}</div><div className="list-item-subtitle">Outdated: {h.outdatedCount} | Issues: {h.issueCount} | Firmware age: {h.firmwareAge === null ? 'N/A' : `${h.firmwareAge.toFixed(1)}y`}</div></div><div className={`card-status ${h.risk >= 60 ? 'error' : h.risk >= 25 ? 'warning' : 'customize'}`}><span className="card-status-dot" />Risk {h.risk}</div></div>))}</div>
    </div>
  );
}

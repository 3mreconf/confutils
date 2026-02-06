import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Trash2,
  Search,
  AlertTriangle,
  CheckCircle,
  Shield,
  Gamepad2,
  Camera,
  MapPin,
  Calendar,
  Mail,
  Music,
  Film,
  Cloud,
  Phone,
  Newspaper,
  ShoppingBag,
  Users,
  RefreshCw,
  Info,
  X,
  Scan,
  Package
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';

interface DebloaterProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

interface BloatApp {
  id: string;
  name: string;
  packageName: string;
  description: string;
  icon: any;
  size: string;
  risk: 'safe' | 'moderate' | 'caution';
  category: string;
  selected: boolean;
  removed: boolean;
  installed: boolean;
}

const buildCategories = (t: (key: any) => string) => ([
  { id: 'all', label: t('filter_all') },
  { id: 'entertainment', label: t('category_entertainment') },
  { id: 'productivity', label: t('category_productivity') },
  { id: 'social', label: t('category_social') },
  { id: 'system', label: t('category_system') },
]);

const buildApps = (t: (key: any) => string): BloatApp[] => ([
  // Entertainment
  { id: 'xboxgaming', name: 'Xbox Gaming Overlay', packageName: 'Microsoft.XboxGamingOverlay', description: t('bloat_gamebar_desc'), icon: Gamepad2, size: '35 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'gamebar', name: t('bloat_gamebar'), packageName: 'Microsoft.XboxGameOverlay', description: t('bloat_gamebar_desc'), icon: Gamepad2, size: '48 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'xboxidentity', name: 'Xbox Identity Provider', packageName: 'Microsoft.XboxIdentityProvider', description: 'Xbox hesap kimlik doğrulama servisi', icon: Gamepad2, size: '12 MB', risk: 'moderate', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'xboxspeech', name: 'Xbox Speech to Text', packageName: 'Microsoft.XboxSpeechToTextOverlay', description: 'Xbox konuşmadan metne dönüştürücü', icon: Gamepad2, size: '8 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'groove', name: t('bloat_groove'), packageName: 'Microsoft.ZuneMusic', description: t('bloat_groove_desc'), icon: Music, size: '31 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'movies', name: t('bloat_movies'), packageName: 'Microsoft.ZuneVideo', description: t('bloat_movies_desc'), icon: Film, size: '28 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'solitaire', name: t('bloat_solitaire'), packageName: 'Microsoft.MicrosoftSolitaireCollection', description: t('bloat_solitaire_desc'), icon: Gamepad2, size: '185 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'mixedreality', name: 'Mixed Reality Portal', packageName: 'Microsoft.MixedReality.Portal', description: 'Windows Mixed Reality portalı', icon: Gamepad2, size: '120 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: '3dviewer', name: '3D Viewer', packageName: 'Microsoft.Microsoft3DViewer', description: '3D model görüntüleyici', icon: Film, size: '45 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: 'paint3d', name: 'Paint 3D', packageName: 'Microsoft.MSPaint', description: '3D çizim uygulaması', icon: Film, size: '95 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },
  { id: '3dbuilder', name: '3D Builder', packageName: 'Microsoft.3DBuilder', description: '3D model oluşturucu', icon: Film, size: '50 MB', risk: 'safe', category: 'entertainment', selected: false, removed: false, installed: false },

  // Productivity
  { id: 'onenote', name: t('bloat_onenote'), packageName: 'Microsoft.Office.OneNote', description: t('bloat_onenote_desc'), icon: Calendar, size: '156 MB', risk: 'moderate', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'mail', name: t('bloat_mail'), packageName: 'microsoft.windowscommunicationsapps', description: t('bloat_mail_desc'), icon: Mail, size: '89 MB', risk: 'moderate', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'maps', name: t('bloat_maps'), packageName: 'Microsoft.WindowsMaps', description: t('bloat_maps_desc'), icon: MapPin, size: '45 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'news', name: t('bloat_news'), packageName: 'Microsoft.BingNews', description: t('bloat_news_desc'), icon: Newspaper, size: '38 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'weather', name: t('bloat_weather'), packageName: 'Microsoft.BingWeather', description: t('bloat_weather_desc'), icon: Cloud, size: '24 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'stickynotes', name: 'Sticky Notes', packageName: 'Microsoft.MicrosoftStickyNotes', description: 'Yapışkan not uygulaması', icon: Calendar, size: '18 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'todos', name: 'Microsoft To Do', packageName: 'Microsoft.Todos', description: 'Görev yönetici uygulaması', icon: Calendar, size: '32 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'officehub', name: 'Office Hub', packageName: 'Microsoft.MicrosoftOfficeHub', description: 'Office uygulama merkezi', icon: Calendar, size: '28 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'powerautomate', name: 'Power Automate', packageName: 'Microsoft.PowerAutomateDesktop', description: 'Otomasyon aracı', icon: Calendar, size: '150 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },
  { id: 'clipchamp', name: 'Clipchamp', packageName: 'Clipchamp.Clipchamp', description: 'Video düzenleme uygulaması', icon: Film, size: '200 MB', risk: 'safe', category: 'productivity', selected: false, removed: false, installed: false },

  // Social
  { id: 'people', name: t('bloat_people'), packageName: 'Microsoft.People', description: t('bloat_people_desc'), icon: Users, size: '18 MB', risk: 'safe', category: 'social', selected: false, removed: false, installed: false },
  { id: 'skype', name: t('bloat_skype'), packageName: 'Microsoft.SkypeApp', description: t('bloat_skype_desc'), icon: Phone, size: '128 MB', risk: 'safe', category: 'social', selected: false, removed: false, installed: false },
  { id: 'yourphone', name: t('bloat_yourphone'), packageName: 'Microsoft.YourPhone', description: t('bloat_yourphone_desc'), icon: Phone, size: '42 MB', risk: 'moderate', category: 'social', selected: false, removed: false, installed: false },
  { id: 'phonelink', name: 'Phone Link', packageName: 'Microsoft.Windows.PhoneLink', description: 'Telefon bağlantı uygulaması', icon: Phone, size: '42 MB', risk: 'moderate', category: 'social', selected: false, removed: false, installed: false },
  { id: 'teams', name: 'Microsoft Teams', packageName: 'MicrosoftTeams', description: 'İş iletişim uygulaması', icon: Users, size: '180 MB', risk: 'safe', category: 'social', selected: false, removed: false, installed: false },
  { id: 'teams2', name: 'Microsoft Teams (New)', packageName: 'MSTeams', description: 'Yeni Teams uygulaması', icon: Users, size: '180 MB', risk: 'safe', category: 'social', selected: false, removed: false, installed: false },

  // System
  { id: 'cortana', name: t('bloat_cortana'), packageName: 'Microsoft.549981C3F5F10', description: t('bloat_cortana_desc'), icon: Shield, size: '245 MB', risk: 'moderate', category: 'system', selected: false, removed: false, installed: false },
  { id: 'camera', name: t('bloat_camera'), packageName: 'Microsoft.WindowsCamera', description: t('bloat_camera_desc'), icon: Camera, size: '23 MB', risk: 'caution', category: 'system', selected: false, removed: false, installed: false },
  { id: 'feedback', name: t('bloat_feedback'), packageName: 'Microsoft.WindowsFeedbackHub', description: t('bloat_feedback_desc'), icon: Info, size: '56 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'gethelp', name: t('bloat_gethelp'), packageName: 'Microsoft.GetHelp', description: t('bloat_gethelp_desc'), icon: Info, size: '12 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'tips', name: t('bloat_tips'), packageName: 'Microsoft.Getstarted', description: t('bloat_tips_desc'), icon: Info, size: '15 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'store', name: t('bloat_store'), packageName: 'Microsoft.WindowsStore', description: t('bloat_store_desc'), icon: ShoppingBag, size: '78 MB', risk: 'caution', category: 'system', selected: false, removed: false, installed: false },
  { id: 'alarms', name: 'Alarms & Clock', packageName: 'Microsoft.WindowsAlarms', description: 'Alarm ve saat uygulaması', icon: Calendar, size: '15 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'calculator', name: 'Calculator', packageName: 'Microsoft.WindowsCalculator', description: 'Hesap makinesi', icon: Calendar, size: '8 MB', risk: 'caution', category: 'system', selected: false, removed: false, installed: false },
  { id: 'soundrecorder', name: 'Sound Recorder', packageName: 'Microsoft.WindowsSoundRecorder', description: 'Ses kayıt uygulaması', icon: Music, size: '10 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'widgets', name: 'Windows Widgets', packageName: 'MicrosoftWindows.Client.WebExperience', description: 'Masaüstü widget paneli', icon: Info, size: '85 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'copilot', name: 'Copilot', packageName: 'Microsoft.Copilot', description: 'AI asistan', icon: Shield, size: '50 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'quickassist', name: 'Quick Assist', packageName: 'MicrosoftCorporationII.QuickAssist', description: 'Uzak yardım uygulaması', icon: Info, size: '25 MB', risk: 'safe', category: 'system', selected: false, removed: false, installed: false },
  { id: 'photos', name: 'Photos', packageName: 'Microsoft.Windows.Photos', description: 'Fotoğraf görüntüleyici', icon: Camera, size: '150 MB', risk: 'caution', category: 'system', selected: false, removed: false, installed: false },
]);

const BloatCard = ({
  app,
  onToggle
}: {
  app: BloatApp;
  onToggle: () => void;
}) => {
  const { t } = useI18n();
  const Icon = app.icon;

  const riskConfig = {
    safe: { color: 'var(--success)', bg: 'var(--success-bg)', label: t('risk_safe_remove') },
    moderate: { color: 'var(--warning)', bg: 'var(--warning-bg)', label: t('risk_moderate') },
    caution: { color: 'var(--danger)', bg: 'var(--danger-bg)', label: t('risk_caution') }
  };

  const risk = riskConfig[app.risk];

  if (app.removed) {
    return (
      <div
        className="control-card"
        style={{
          padding: 'var(--space-md)',
          opacity: 0.5,
          background: 'var(--surface)'
        }}
      >
        <div className="flex items-center gap-md">
          <div
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--success-bg)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--success)'
            }}
          >
            <CheckCircle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-100)', textDecoration: 'line-through' }}>
              {app.name}
            </span>
            <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
              {t('removed')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="control-card"
      style={{
        padding: 'var(--space-md)',
        border: app.selected ? '2px solid var(--danger)' : '1px solid var(--glass-border)',
        background: app.selected ? 'var(--danger-bg)' : 'var(--surface)',
        cursor: 'pointer',
        transition: 'all var(--duration-normal) var(--ease-out)'
      }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-md">
        <div
          style={{
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--raised)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-50)'
          }}
        >
          <Icon size={22} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-sm">
            <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{app.name}</span>
          </div>
          <p className="text-muted" style={{ fontSize: 'var(--text-xs)', marginTop: '2px' }}>
            {app.description}
          </p>
          <div className="flex items-center gap-md mt-sm">
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: risk.bg,
                color: risk.color,
                borderRadius: 'var(--radius-sm)',
                fontWeight: 500
              }}
            >
              {risk.label}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{app.size}</span>
          </div>
        </div>

        <div
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
            border: app.selected ? '2px solid var(--danger)' : '2px solid var(--glass-border)',
            background: app.selected ? 'var(--danger)' : 'transparent'
          }}
        >
          {app.selected && <Trash2 size={12} color="white" />}
        </div>
      </div>
    </div>
  );
};

export default function Debloater({ showToast }: DebloaterProps) {
  const { t } = useI18n();
  const [apps, setApps] = useState(buildApps(t));
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isRemoving, setIsRemoving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const categories = buildCategories(t);

  // Auto-scan on mount
  const scanInstalledApps = useCallback(async () => {
    setIsScanning(true);
    setScanComplete(false);

    try {
      // Get all installed AppX packages for current user as a single string
      const result = await invoke('run_powershell', {
        command: `(Get-AppxPackage).Name -join '|'`
      }) as string;

      const installedList = result.toLowerCase();

      setApps(prev => prev.map(app => {
        const packageLower = app.packageName.toLowerCase();
        // Simple check: is this package name in the installed list?
        const isInstalled = installedList.includes(packageLower);

        return {
          ...app,
          installed: isInstalled,
          removed: !isInstalled
        };
      }));

      setScanComplete(true);
    } catch (error) {
      console.error('Failed to scan installed apps:', error);
      showToast('error', t('scan_error'), String(error));
    } finally {
      setIsScanning(false);
    }
  }, [showToast, t]);

  useEffect(() => {
    scanInstalledApps();
  }, []);

  useEffect(() => {
    setApps((prev) => {
      const base = buildApps(t);
      return base.map((app) => {
        const existing = prev.find((p) => p.id === app.id);
        return existing ? {
          ...app,
          selected: existing.selected,
          removed: existing.removed,
          installed: existing.installed
        } : app;
      });
    });
  }, [t]);

  // Only show installed apps (not removed)
  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || app.category === activeCategory;
      return matchesSearch && matchesCategory && app.installed && !app.removed;
    });
  }, [apps, searchQuery, activeCategory]);

  const selectedApps = apps.filter(app => app.selected);
  const selectedCount = selectedApps.length;
  const totalSize = selectedApps.reduce((acc, app) => {
    const size = parseFloat(app.size);
    return acc + (isNaN(size) ? 0 : size);
  }, 0);
  const installedCount = apps.filter(app => app.installed && !app.removed).length;
  const removedCount = apps.filter(app => app.removed || !app.installed).length;

  const toggleApp = (id: string) => {
    setApps(prev => prev.map(app =>
      app.id === id ? { ...app, selected: !app.selected } : app
    ));
  };

  const selectAllSafe = () => {
    setApps(prev => prev.map(app => ({
      ...app,
      selected: app.risk === 'safe' && app.installed && !app.removed
    })));
  };

  const clearSelection = () => {
    setApps(prev => prev.map(app => ({ ...app, selected: false })));
  };

  const confirmRemoval = () => {
    if (selectedCount === 0) {
      showToast('warning', t('debloater_none_selected'), t('debloater_none_selected_desc'));
      return;
    }

    const hasCaution = selectedApps.some(app => app.risk === 'caution');
    if (hasCaution) {
      setShowWarning(true);
    } else {
      removeSelected();
    }
  };

  const removeSelected = async () => {
    setShowWarning(false);
    setIsRemoving(true);
    showToast('info', t('debloater_removing'), `${t('debloater_removing_prefix')} ${selectedCount} ${t('installer_apps')}...`);

    let removedAppsCount = 0;
    for (const app of selectedApps) {
      try {
        // Remove AppX package for current user and all users
        const command = `Get-AppxPackage -AllUsers *${app.packageName}* | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue; Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like "*${app.packageName}*"} | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue`;
        await invoke('run_powershell', { command });

        setApps(prev => prev.map(a =>
          a.id === app.id ? { ...a, removed: true, selected: false, installed: false } : a
        ));
        removedAppsCount++;
      } catch (error) {
        console.error(`Failed to remove ${app.name}:`, error);
        showToast('warning', t('debloater_partial_error'), `${app.name}: ${String(error)}`);
      }
    }

    setIsRemoving(false);
    if (removedAppsCount > 0) {
      showToast('success', t('debloater_removed'), `${t('debloater_removed_prefix')} ${removedAppsCount} ${t('installer_apps')}. ${t('debloater_freed')} ~${totalSize.toFixed(0)} MB`);
    }
  };

  return (
    <div>
      {/* Warning Modal */}
      {showWarning && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <AlertTriangle size={24} color="var(--warning)" />
              <h3 className="modal-title">{t('debloater_confirm_title')}</h3>
              <button className="modal-close" onClick={() => setShowWarning(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="text-muted">
                {t('debloater_confirm_body')}
              </p>
              <div
                style={{
                  marginTop: 'var(--space-md)',
                  padding: 'var(--space-md)',
                  background: 'var(--warning-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--warning)'
                }}
              >
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--warning)' }}>
                  {t('debloater_confirm_note')}
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowWarning(false)}>
                {t('cancel')}
              </button>
              <button className="btn btn-primary" onClick={removeSelected}>
                <Trash2 size={16} />
                {t('debloater_remove_anyway')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('debloater_title')}
          </h2>
          <p className="text-muted mt-sm">
            {t('debloater_subtitle')}
          </p>
        </div>
        <div className="flex gap-sm">
          <button
            className="btn btn-secondary"
            onClick={scanInstalledApps}
            disabled={isScanning}
          >
            {isScanning ? (
              <>
                <RefreshCw size={16} className="spin" />
                {t('scanning')}
              </>
            ) : (
              <>
                <Scan size={16} />
                {t('debloater_rescan')}
              </>
            )}
          </button>
          <button className="btn btn-secondary" onClick={selectAllSafe}>
            {t('debloater_select_safe')}
          </button>
          <button className="btn btn-secondary" onClick={clearSelection}>
            {t('clear')}
          </button>
        </div>
      </div>

      {/* Scan Status Banner */}
      {isScanning && (
        <div
          className="control-card mb-lg"
          style={{
            padding: 'var(--space-md)',
            background: 'linear-gradient(135deg, var(--cyan-15) 0%, var(--surface) 100%)',
            border: '1px solid var(--cyan)'
          }}
        >
          <div className="flex items-center gap-md">
            <RefreshCw size={20} className="spin" color="var(--cyan)" />
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-100)' }}>{t('debloater_scanning')}</span>
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>{t('debloater_scanning_desc')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 'var(--space-md)',
          marginBottom: 'var(--space-lg)'
        }}
      >
        <div className="control-card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex items-center gap-sm mb-xs">
            <Package size={14} color="var(--text-50)" />
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('debloater_detected')}</span>
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--text-100)' }}>
            {installedCount}
          </div>
        </div>
        <div className="control-card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex items-center gap-sm mb-xs">
            <Trash2 size={14} color="var(--danger)" />
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('selected')}</span>
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--danger)' }}>
            {selectedCount}
          </div>
        </div>
        <div className="control-card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex items-center gap-sm mb-xs">
            <CheckCircle size={14} color="var(--success)" />
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('debloater_clean')}</span>
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--success)' }}>
            {removedCount}
          </div>
        </div>
        <div className="control-card" style={{ padding: 'var(--space-md)' }}>
          <div className="flex items-center gap-sm mb-xs">
            <Cloud size={14} color="var(--cyan)" />
            <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('space_to_free')}</span>
          </div>
          <div className="font-mono" style={{ fontSize: 'var(--text-xl)', color: 'var(--cyan)' }}>
            ~{totalSize.toFixed(0)} MB
          </div>
        </div>
      </div>

      {/* Search and Categories */}
      <div className="flex items-center gap-md mb-lg">
        <div className="search-input" style={{ flex: 1 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            className="input"
            placeholder={t('debloater_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="tabs" style={{ flexWrap: 'wrap', gap: 'var(--space-sm)', justifyContent: 'center' }}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`tab ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
              style={{ gap: 'var(--space-sm)' }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 'var(--space-lg)' }}>
        <div>
          {isScanning ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-md)'
              }}
            >
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--space-md)'
              }}
            >
              {filteredApps.map((app) => (
                <BloatCard
                  key={app.id}
                  app={app}
                  onToggle={() => toggleApp(app.id)}
                />
              ))}
            </div>
          )}

          {!isScanning && filteredApps.length === 0 && scanComplete && (
            <div className="empty-state">
              <CheckCircle className="empty-state-icon" color="var(--success)" />
              <h3 className="empty-state-title">{t('debloater_empty_title')}</h3>
              <p className="empty-state-description">
                {t('debloater_empty_desc')}
              </p>
            </div>
          )}
        </div>

        {/* Removal Panel */}
        <div
          className="control-card"
          style={{
            padding: 'var(--space-lg)',
            position: 'sticky',
            top: 'var(--space-lg)',
            height: 'fit-content'
          }}
        >
          <h3 style={{ fontWeight: 600, color: 'var(--text-100)', marginBottom: 'var(--space-lg)' }}>
            {t('debloater_queue_title')}
          </h3>

          {selectedCount === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl) 0' }}>
              <Trash2 size={48} color="var(--text-30)" style={{ marginBottom: 'var(--space-md)' }} />
              <p className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
                {t('debloater_queue_empty')}
              </p>
            </div>
          ) : (
            <>
              <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 'var(--space-lg)' }}>
                {selectedApps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between"
                    style={{
                      padding: 'var(--space-sm) 0',
                      borderBottom: '1px solid var(--glass-border)'
                    }}
                  >
                    <div className="flex items-center gap-sm">
                      <app.icon size={14} color="var(--text-50)" />
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-90)' }}>
                        {app.name}
                      </span>
                    </div>
                    <button
                      className="btn btn-icon"
                      onClick={() => toggleApp(app.id)}
                      style={{ width: 24, height: 24 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div
                style={{
                  padding: 'var(--space-md)',
                  background: 'var(--deep)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-lg)'
                }}
              >
                <div className="flex items-center justify-between mb-sm">
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('debloater_apps_to_remove')}</span>
                  <span className="font-mono" style={{ color: 'var(--danger)' }}>{selectedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('space_to_free')}</span>
                  <span className="font-mono" style={{ color: 'var(--success)' }}>~{totalSize.toFixed(0)} MB</span>
                </div>
              </div>
            </>
          )}

          <button
            className="btn"
            style={{
              width: '100%',
              background: 'var(--danger)',
              color: 'white'
            }}
            onClick={confirmRemoval}
            disabled={selectedCount === 0 || isRemoving}
          >
            {isRemoving ? (
              <>
                <RefreshCw size={16} className="spin" />
                {t('removing')}
              </>
            ) : (
              <>
                <Trash2 size={16} />
                {t('debloater_remove_selected')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

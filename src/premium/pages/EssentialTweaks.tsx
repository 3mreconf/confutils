import { useMemo, useState } from 'react';
import {
  Shield,
  Wrench,
  AlertTriangle,
  CheckCircle,
  TerminalSquare,
  RefreshCw,
  Power,
  Settings,
  HardDrive,
  Network,
  Cpu,
  Square,
  Play,
  Moon,
  Type,
  MousePointer2,
  LayoutGrid,
  Search,
  Eye,
  Layout,
  MessageSquare,
  Maximize,
  Monitor,
  Keyboard,
  Zap,
  History,
  Activity,
  UserCheck,
  Trash2
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useI18n } from '../../i18n/I18nContext';

interface EssentialTweaksProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

type RegistryItem = {
  path: string;
  name: string;
  type: string;
  value: string;
  originalValue?: string;
};

type Tweak = {
  id: string;
  titleKey: string;
  descKey: string;
  category: 'essential' | 'caution' | 'customize';
  icon: any;
  registry?: RegistryItem[];
  invokeScript?: string[];
  undoScript?: string[];
  noteKey?: string;
  sampleList?: string[];
  tab: 'essential' | 'advanced' | 'customize';
};

type Tab = 'all' | 'essential' | 'advanced' | 'customize';

const RegistryTable = ({
  items,
  labels
}: {
  items: RegistryItem[];
  labels: { path: string; name: string; type: string; value: string };
}) => (
  <div className="tweak-table">
    <div className="tweak-table-row tweak-table-head">
      <span>{labels.path}</span>
      <span>{labels.name}</span>
      <span>{labels.type}</span>
      <span>{labels.value}</span>
    </div>
    {items.map((item, idx) => (
      <div key={`${item.path}-${item.name}-${idx}`} className="tweak-table-row">
        <span className="tweak-mono">{item.path}</span>
        <span className="tweak-mono">{item.name}</span>
        <span>{item.type}</span>
        <span className="tweak-mono">{item.value}</span>
      </div>
    ))}
  </div>
);

export default function EssentialTweaks({ showToast }: EssentialTweaksProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [applied, setApplied] = useState<Record<string, boolean>>({});
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const tweaks = useMemo<Tweak[]>(() => ([
    {
      id: 'restore-point',
      titleKey: 'tweak_restore_title',
      descKey: 'tweak_restore_desc',
      category: 'essential',
      tab: 'essential',
      icon: Shield,
      registry: [
        {
          path: 'HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\SystemRestore',
          name: 'SystemRestorePointCreationFrequency',
          type: 'DWord',
          value: '0',
          originalValue: '1440'
        }
      ],
      invokeScript: [
        'if (-not (Get-ComputerRestorePoint)) {',
        '    Enable-ComputerRestore -Drive $Env:SystemDrive',
        '}',
        'Checkpoint-Computer -Description "System Restore Point created by WinUtil" -RestorePointType MODIFY_SETTINGS',
        'Write-Host "System Restore Point Created Successfully" -ForegroundColor Green'
      ]
    },
    {
      id: 'ultimate-performance',
      titleKey: 'tweak_ultimate_perf_title',
      descKey: 'tweak_ultimate_perf_desc',
      category: 'essential',
      tab: 'essential',
      icon: Zap,
      invokeScript: [
        '$guid = (powercfg -duplicatescheme e9a42b02-d5df-448d-aa00-03f14749eb61 | Select-String -Pattern "([a-z0-9-]{36})" | ForEach-Object { $_.Matches.Value }); if ($guid) { powercfg -setactive $guid }'
      ],
      undoScript: ['powercfg -setactive 381b4222-f694-41f0-9685-ff5bb260df2e']
    },
    {
      id: 'power-throttling',
      titleKey: 'tweak_power_throttling_title',
      descKey: 'tweak_power_throttling_desc',
      category: 'essential',
      tab: 'essential',
      icon: Cpu,
      registry: [
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerThrottling', name: 'PowerThrottlingOff', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'activity-history',
      titleKey: 'tweak_activity_history_title',
      descKey: 'tweak_activity_history_desc',
      category: 'essential',
      tab: 'essential',
      icon: History,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', name: 'EnableActivityFeed', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', name: 'PublishUserActivities', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', name: 'UploadUserActivities', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'edge-debloat',
      titleKey: 'tweak_edge_title',
      descKey: 'tweak_edge_desc',
      category: 'caution',
      tab: 'essential',
      icon: Wrench,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\EdgeUpdate', name: 'CreateDesktopShortcutDefault', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'PersonalizationReportingEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'ShowRecommendationsEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'HideFirstRunExperience', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'UserFeedbackAllowed', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'ConfigureDoNotTrack', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'AlternateErrorPagesEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'EdgeCollectionsEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'EdgeShoppingAssistantEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'MicrosoftEdgeInsiderPromotionEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'ShowMicrosoftRewards', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'WebWidgetAllowed', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'DiagnosticData', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'EdgeAssetDeliveryServiceEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Edge', name: 'WalletDonationEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'consumer-features',
      titleKey: 'tweak_consumer_title',
      descKey: 'tweak_consumer_desc',
      category: 'essential',
      tab: 'essential',
      icon: Settings,
      registry: [
        {
          path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\CloudContent',
          name: 'DisableWindowsConsumerFeatures',
          type: 'DWord',
          value: '1',
          originalValue: '<RemoveEntry>'
        }
      ]
    },
    {
      id: 'gamedvr',
      titleKey: 'tweak_gamedvr_title',
      descKey: 'tweak_gamedvr_desc',
      category: 'essential',
      tab: 'essential',
      icon: Play,
      registry: [
        { path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_FSEBehavior', type: 'DWord', value: '2', originalValue: '1' },
        { path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_Enabled', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_HonorUserFSEBehaviorMode', type: 'DWord', value: '1', originalValue: '0' },
        { path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_EFSEFeatureFlags', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\GameDVR', name: 'AllowGameDVR', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'hibernation',
      titleKey: 'tweak_hiber_title',
      descKey: 'tweak_hiber_desc',
      category: 'essential',
      tab: 'essential',
      icon: Power,
      registry: [
        { path: 'HKLM:\\System\\CurrentControlSet\\Control\\Session Manager\\Power', name: 'HibernateEnabled', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FlyoutMenuSettings', name: 'ShowHibernateOption', type: 'DWord', value: '0', originalValue: '1' }
      ],
      invokeScript: ['powercfg.exe /hibernate off'],
      undoScript: ['powercfg.exe /hibernate on']
    },
    {
      id: 'powershell7-telemetry',
      titleKey: 'tweak_ps7_title',
      descKey: 'tweak_ps7_desc',
      category: 'essential',
      tab: 'essential',
      icon: TerminalSquare,
      invokeScript: ["[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '1', 'Machine')"],
      undoScript: ["[Environment]::SetEnvironmentVariable('POWERSHELL_TELEMETRY_OPTOUT', '', 'Machine')"]
    },
    {
      id: 'storage-sense',
      titleKey: 'tweak_storage_title',
      descKey: 'tweak_storage_desc',
      category: 'caution',
      tab: 'essential',
      icon: HardDrive,
      registry: [
        {
          path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\StorageSense\\Parameters\\StoragePolicy',
          name: '01',
          type: 'DWord',
          value: '0',
          originalValue: '1'
        }
      ]
    },
    {
      id: 'end-task',
      titleKey: 'tweak_endtask_title',
      descKey: 'tweak_endtask_desc',
      category: 'essential',
      tab: 'essential',
      icon: Square,
      registry: [
        {
          path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced\\TaskbarDeveloperSettings',
          name: 'TaskbarEndTask',
          type: 'DWord',
          value: '1',
          originalValue: '<RemoveEntry>'
        }
      ]
    },
    {
      id: 'ipv46',
      titleKey: 'tweak_ipv46_title',
      descKey: 'tweak_ipv46_desc',
      category: 'caution',
      tab: 'essential',
      icon: Network,
      registry: [
        {
          path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters',
          name: 'DisabledComponents',
          type: 'DWord',
          value: '32',
          originalValue: '0'
        }
      ]
    },
    {
      id: 'disk-cleanup',
      titleKey: 'tweak_diskcleanup_title',
      descKey: 'tweak_diskcleanup_desc',
      category: 'essential',
      tab: 'essential',
      icon: HardDrive,
      invokeScript: [
        'cleanmgr.exe /d C: /VERYLOWDISK',
        'Dism.exe /online /Cleanup-Image /StartComponentCleanup /ResetBase'
      ]
    },
    {
      id: 'laptop-hibernation',
      titleKey: 'tweak_laptop_hiber_title',
      descKey: 'tweak_laptop_hiber_desc',
      category: 'caution',
      tab: 'essential',
      icon: Power,
      registry: [
        {
          path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\238C9FA8-0AAD-41ED-83F4-97BE242C8F20\\7bc4a2f9-d8fc-4469-b07b-33eb785aaca0',
          name: 'Attributes',
          type: 'DWord',
          value: '2',
          originalValue: '1'
        },
        {
          path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\abfc2519-3608-4c2a-94ea-171b0ed546ab\\94ac6d29-73ce-41a6-809f-6363ba21b47e',
          name: 'Attributes',
          type: 'DWord',
          value: '2',
          originalValue: '0'
        }
      ],
      invokeScript: [
        'Write-Host "Turn on Hibernation"',
        'powercfg.exe /hibernate on',
        '# Set hibernation as the default action',
        'powercfg.exe change standby-timeout-ac 60',
        'powercfg.exe change standby-timeout-dc 60',
        'powercfg.exe change monitor-timeout-ac 10',
        'powercfg.exe change monitor-timeout-dc 1'
      ],
      undoScript: [
        'Write-Host "Turn off Hibernation"',
        'powercfg.exe /hibernate off',
        '# Set standby to default values',
        'powercfg.exe change standby-timeout-ac 15',
        'powercfg.exe change standby-timeout-dc 15',
        'powercfg.exe change monitor-timeout-ac 15',
        'powercfg.exe change monitor-timeout-dc 15'
      ],
      noteKey: 'tweak_laptop_hiber_note'
    },
    {
      id: 'services-manual',
      titleKey: 'tweak_services_title',
      descKey: 'tweak_services_desc',
      category: 'essential',
      tab: 'essential',
      icon: Cpu,
      noteKey: 'tweak_services_note',
      sampleList: [
        'ALG', 'AppMgmt', 'AppReadiness', 'Appinfo', 'BITS', 'BTAGService', 'CDPSvc', 'CertPropSvc', 'CryptSvc', 'DPS', 'DevQueryBroker', 'DeviceAssociationService', 'DeviceInstall', 'DisplayEnhancementService', 'EapHost', 'EventSystem', 'FontCache', 'IKEEXT', 'iphlpsvc', 'LanmanWorkstation', 'lfsvc', 'LicenseManager', 'MapsBroker', 'Netman', 'NlaSvc', 'nsi', 'RasMan', 'RetailDemo', 'SensorDataService', 'SensorService', 'SensrSvc', 'ShellHWDetection', 'Spooler', 'SysMain', 'Themes', 'TrkWks', 'WSearch', 'WinHttpAutoProxySvc', 'WbioSrvc', 'WdiServiceHost', 'WdiSystemHost', 'Winmgmt', 'WlanSvc', 'WwanSvc'
      ],
      invokeScript: [
        '$services = "ALG", "AppMgmt", "AppReadiness", "Appinfo", "BITS", "BTAGService", "CDPSvc", "CertPropSvc", "CryptSvc", "DPS", "DevQueryBroker", "DeviceAssociationService", "DeviceInstall", "DisplayEnhancementService", "EapHost", "EventSystem", "FontCache", "IKEEXT", "iphlpsvc", "LanmanWorkstation", "lfsvc", "LicenseManager", "MapsBroker", "Netman", "NlaSvc", "nsi", "RasMan", "RetailDemo", "SensorDataService", "SensorService", "SensrSvc", "ShellHWDetection", "Spooler", "SysMain", "Themes", "TrkWks", "WSearch", "WinHttpAutoProxySvc", "WbioSrvc", "WdiServiceHost", "WdiSystemHost", "Winmgmt", "WlanSvc", "WwanSvc"',
        'foreach ($s in $services) { Set-Service -Name $s -StartupType Manual -ErrorAction SilentlyContinue }'
      ]
    },
    {
      id: 'remove-onedrive',
      titleKey: 'tweak_remove_onedrive_title',
      descKey: 'tweak_remove_onedrive_desc',
      category: 'caution',
      tab: 'advanced',
      icon: HardDrive,
      invokeScript: [
        'if (Get-Process -Name "OneDrive" -ErrorAction SilentlyContinue) { Stop-Process -Name "OneDrive" -Force }',
        'Start-Sleep -Seconds 2',
        '$onedrivePath = "$env:SystemRoot\\SysWOW64\\OneDriveSetup.exe"',
        'if (Test-Path $onedrivePath) { Start-Process -FilePath $onedrivePath -ArgumentList "/uninstall" -Wait -NoNewWindow }'
      ]
    },
    {
      id: 'classic-menu',
      titleKey: 'tweak_classic_menu_title',
      descKey: 'tweak_classic_menu_desc',
      category: 'essential',
      tab: 'advanced',
      icon: Settings,
      registry: [
        { path: 'HKCU:\\Software\\Classes\\CLSID\\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\\InprocServer32', name: '', type: 'String', value: '', originalValue: '<RemoveKey>' }
      ]
    },
    {
      id: 'dark-mode',
      titleKey: 'tweak_darkmode_title',
      descKey: 'tweak_darkmode_desc',
      category: 'essential',
      tab: 'customize',
      icon: Moon,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize', name: 'AppsUseLightTheme', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize', name: 'SystemUsesLightTheme', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'show-extensions',
      titleKey: 'tweak_showext_title',
      descKey: 'tweak_showext_desc',
      category: 'essential',
      tab: 'customize',
      icon: Type,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'HideFileExt', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'mouse-acceleration',
      titleKey: 'tweak_mouseaccel_title',
      descKey: 'tweak_mouseaccel_desc',
      category: 'caution',
      tab: 'customize',
      icon: MousePointer2,
      registry: [
        { path: 'HKCU:\\Control Panel\\Mouse', name: 'MouseSpeed', type: 'String', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Control Panel\\Mouse', name: 'MouseThreshold1', type: 'String', value: '0', originalValue: '6' },
        { path: 'HKCU:\\Control Panel\\Mouse', name: 'MouseThreshold2', type: 'String', value: '0', originalValue: '10' }
      ]
    },
    {
      id: 'bing-search',
      titleKey: 'tweak_bing_title',
      descKey: 'tweak_bing_desc',
      category: 'customize',
      tab: 'customize',
      icon: Search,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search', name: 'BingSearchEnabled', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'taskbar-center',
      titleKey: 'tweak_center_taskbar_title',
      descKey: 'tweak_center_taskbar_desc',
      category: 'customize',
      tab: 'customize',
      icon: Layout,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarAl', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'detailed-bsod',
      titleKey: 'tweak_bsod_title',
      descKey: 'tweak_bsod_desc',
      category: 'customize',
      tab: 'customize',
      icon: Monitor,
      registry: [
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CrashControl', name: 'DisplayParameters', type: 'DWord', value: '1', originalValue: '0' },
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\CrashControl', name: 'DisableEmoticon', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'numlock-startup',
      titleKey: 'tweak_numlock_title',
      descKey: 'tweak_numlock_desc',
      category: 'customize',
      tab: 'customize',
      icon: Keyboard,
      registry: [
        { path: 'HKU:\\.Default\\Control Panel\\Keyboard', name: 'InitialKeyboardIndicators', type: 'DWord', value: '2', originalValue: '0' },
        { path: 'HKCU:\\Control Panel\\Keyboard', name: 'InitialKeyboardIndicators', type: 'DWord', value: '2', originalValue: '0' }
      ]
    },
    {
      id: 'taskbar-search',
      titleKey: 'tweak_taskbar_search_title',
      descKey: 'tweak_taskbar_search_desc',
      category: 'customize',
      tab: 'customize',
      icon: Search,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Search', name: 'SearchboxTaskbarMode', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'hidden-files',
      titleKey: 'tweak_hidden_files_title',
      descKey: 'tweak_hidden_files_desc',
      category: 'customize',
      tab: 'customize',
      icon: Eye,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'Hidden', type: 'DWord', value: '1', originalValue: '2' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'snap-flyout',
      titleKey: 'tweak_snap_flyout_title',
      descKey: 'tweak_snap_flyout_desc',
      category: 'customize',
      tab: 'customize',
      icon: Layout,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'EnableSnapAssistFlyout', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'snap-suggestion',
      titleKey: 'tweak_snap_suggestion_title',
      descKey: 'tweak_snap_suggestion_desc',
      category: 'customize',
      tab: 'customize',
      icon: Layout,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'SnapAssist', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'snap-window',
      titleKey: 'tweak_snap_window_title',
      descKey: 'tweak_snap_window_desc',
      category: 'customize',
      tab: 'customize',
      icon: Maximize,
      registry: [
        { path: 'HKCU:\\Control Panel\\Desktop', name: 'WindowArrangementActive', type: 'String', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'sticky-keys',
      titleKey: 'tweak_sticky_keys_title',
      descKey: 'tweak_sticky_keys_desc',
      category: 'customize',
      tab: 'customize',
      icon: Keyboard,
      registry: [
        { path: 'HKCU:\\Control Panel\\Accessibility\\StickyKeys', name: 'Flags', type: 'DWord', value: '510', originalValue: '58' }
      ]
    },
    {
      id: 'taskview-button',
      titleKey: 'tweak_taskview_title',
      descKey: 'tweak_taskview_desc',
      category: 'customize',
      tab: 'customize',
      icon: LayoutGrid,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'ShowTaskViewButton', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'verbose-logon',
      titleKey: 'tweak_verbose_logon_title',
      descKey: 'tweak_verbose_logon_desc',
      category: 'customize',
      tab: 'customize',
      icon: MessageSquare,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\System', name: 'VerboseStatus', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'widgets-button',
      titleKey: 'tweak_widgets_title',
      descKey: 'tweak_widgets_desc',
      category: 'customize',
      tab: 'customize',
      icon: LayoutGrid,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarDa', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'show-this-pc',
      titleKey: 'tweak_this_pc_title',
      descKey: 'tweak_this_pc_desc',
      category: 'customize',
      tab: 'customize',
      icon: Monitor,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', name: '{20D04FE0-3AEA-1069-A2D8-08002B30309D}', type: 'DWord', value: '0', originalValue: '1' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'show-user-files',
      titleKey: 'tweak_user_files_title',
      descKey: 'tweak_user_files_desc',
      category: 'customize',
      tab: 'customize',
      icon: HardDrive,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', name: '{59031a47-3f72-44a7-89c5-5595fe6b30ee}', type: 'DWord', value: '0', originalValue: '1' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'show-network-icon',
      titleKey: 'tweak_network_icon_title',
      descKey: 'tweak_network_icon_desc',
      category: 'customize',
      tab: 'customize',
      icon: Network,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', name: '{F02C1A0D-BE21-4350-88B0-7367FC96EF3C}', type: 'DWord', value: '0', originalValue: '1' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'show-control-panel',
      titleKey: 'tweak_control_panel_title',
      descKey: 'tweak_control_panel_desc',
      category: 'customize',
      tab: 'customize',
      icon: Settings,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\HideDesktopIcons\\NewStartPanel', name: '{21EC2020-3AEA-1069-A2DD-08002B30309D}', type: 'DWord', value: '0', originalValue: '1' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'compact-mode',
      titleKey: 'tweak_compact_mode_title',
      descKey: 'tweak_compact_mode_desc',
      category: 'customize',
      tab: 'customize',
      icon: Layout,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'UseCompactMode', type: 'DWord', value: '1', originalValue: '0' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'disable-chat-button',
      titleKey: 'tweak_chat_button_title',
      descKey: 'tweak_chat_button_desc',
      category: 'customize',
      tab: 'customize',
      icon: MessageSquare,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarMn', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'cross-device-resume',
      titleKey: 'tweak_cross_device_title',
      descKey: 'tweak_cross_device_desc',
      category: 'customize',
      tab: 'customize',
      icon: Monitor,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\CrossDeviceResume\\Configuration', name: 'IsResumeAllowed', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'remove-shortcut-arrow',
      titleKey: 'tweak_shortcut_arrow_title',
      descKey: 'tweak_shortcut_arrow_desc',
      category: 'customize',
      tab: 'customize',
      icon: Moon,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Shell Icons', name: '29', type: 'String', value: '%windir%\\System32\\shell32.dll,-50', originalValue: '<RemoveEntry>' }
      ],
      invokeScript: ['Stop-Process -Name explorer -Force'],
      undoScript: ['Stop-Process -Name explorer -Force']
    },
    {
      id: 'news-interests',
      titleKey: 'tweak_news_interests_title',
      descKey: 'tweak_news_interests_desc',
      category: 'customize',
      tab: 'customize',
      icon: Layout,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Feeds', name: 'ShellFeedsTaskbarViewMode', type: 'DWord', value: '2', originalValue: '0' }
      ]
    },
    {
      id: 'disable-stickers',
      titleKey: 'tweak_stickers_title',
      descKey: 'tweak_stickers_desc',
      category: 'customize',
      tab: 'customize',
      icon: Moon,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\PolicyManager\\current\\user\\ControlPanelDisplay', name: 'AllowStickers', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'brave-debloat',
      titleKey: 'tweak_brave_debloat_title',
      descKey: 'tweak_brave_debloat_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Wrench,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave', name: 'BraveRewardsDisabled', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave', name: 'BraveWalletDisabled', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave', name: 'BraveVPNDisabled', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\BraveSoftware\\Brave', name: 'BraveAIChatEnabled', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'disable-action-center',
      titleKey: 'tweak_action_center_title',
      descKey: 'tweak_action_center_desc',
      category: 'caution',
      tab: 'advanced',
      icon: MessageSquare,
      registry: [
        { path: 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableNotificationCenter', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'god-mode',
      titleKey: 'tweak_god_mode_title',
      descKey: 'tweak_god_mode_desc',
      category: 'customize',
      tab: 'customize',
      icon: UserCheck,
      invokeScript: ['New-Item -Path "$home\\Desktop\\GodMode.{ED7BA470-8E54-465E-825C-99712043E01C}" -ItemType Directory -ErrorAction SilentlyContinue'],
      undoScript: ['Remove-Item -Path "$home\\Desktop\\GodMode.{ED7BA470-8E54-465E-825C-99712043E01C}" -Recurse -ErrorAction SilentlyContinue']
    },
    {
      id: 'search-indexing',
      titleKey: 'tweak_search_indexing_title',
      descKey: 'tweak_search_indexing_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Search,
      invokeScript: ['Stop-Service WSearch; Set-Service WSearch -StartupType Disabled'],
      undoScript: ['Set-Service WSearch -StartupType Automatic; Start-Service WSearch']
    },
    {
      id: 'telemetry-lockdown',
      titleKey: 'tweak_telemetry_lockdown_title',
      descKey: 'tweak_telemetry_lockdown_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Activity,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', name: 'AllowTelemetry', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat', name: 'AITEnable', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat', name: 'DisableInventory', type: 'DWord', value: '1', originalValue: '0' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppCompat', name: 'DisableUAR', type: 'DWord', value: '1', originalValue: '0' }
      ],
      invokeScript: ['Stop-Service DiagTrack; Set-Service DiagTrack -StartupType Disabled']
    },
    {
      id: 'block-adobe',
      titleKey: 'tweak_adobe_title',
      descKey: 'tweak_adobe_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Network,
      invokeScript: [
        '$hostsUrl = "https://github.com/Ruddernation-Designs/Adobe-URL-Block-List/raw/refs/heads/master/hosts"',
        '$hosts = "$env:SystemRoot\\System32\\drivers\\etc\\hosts"',
        'Copy-Item $hosts "$hosts.bak"',
        'Invoke-WebRequest $hostsUrl -OutFile $hosts',
        'ipconfig /flushdns'
      ],
      undoScript: [
        '$hosts = "$env:SystemRoot\\System32\\drivers\\etc\\hosts"',
        'if (Test-Path "$hosts.bak") { Copy-Item "$hosts.bak" $hosts; Remove-Item "$hosts.bak" }',
        'ipconfig /flushdns'
      ]
    },
    {
      id: 'disable-bg-apps',
      titleKey: 'tweak_bgapps_title',
      descKey: 'tweak_bgapps_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Cpu,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\BackgroundAccessApplications', name: 'GlobalUserDisabled', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'disable-fso',
      titleKey: 'tweak_fso_title',
      descKey: 'tweak_fso_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Play,
      registry: [
        { path: 'HKCU:\\System\\GameConfigStore', name: 'GameDVR_DXGIHonorFSEWindowsCompatible', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'disable-ipv6',
      titleKey: 'tweak_ipv6_title',
      descKey: 'tweak_ipv6_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Network,
      registry: [
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters', name: 'DisabledComponents', type: 'DWord', value: '255', originalValue: '0' }
      ],
      invokeScript: ['Disable-NetAdapterBinding -Name * -ComponentID ms_tcpip6'],
      undoScript: ['Enable-NetAdapterBinding -Name * -ComponentID ms_tcpip6']
    },
    {
      id: 'disable-notifications',
      titleKey: 'tweak_notifications_title',
      descKey: 'tweak_notifications_desc',
      category: 'caution',
      tab: 'advanced',
      icon: AlertTriangle,
      registry: [
        { path: 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer', name: 'DisableNotificationCenter', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\PushNotifications', name: 'ToastEnabled', type: 'DWord', value: '0', originalValue: '1' }
      ]
    },
    {
      id: 'disable-teredo',
      titleKey: 'tweak_teredo_title',
      descKey: 'tweak_teredo_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Network,
      registry: [
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Services\\Tcpip6\\Parameters', name: 'DisabledComponents', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'remove-all-apps',
      titleKey: 'tweak_all_apps_title',
      descKey: 'tweak_all_apps_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Wrench,
      invokeScript: [
        'Get-AppxPackage -AllUsers | where-object {$_.name -notlike "*MicrosoftStore*" -and $_.name -notlike "*Calculator*" -and $_.name -notlike "*Photos*"} | Remove-AppxPackage',
        'Get-AppxProvisionedPackage -online | where-object {$_.packagename -notlike "*MicrosoftStore*" -and $_.packagename -notlike "*Calculator*" -and $_.packagename -notlike "*Photos*"} | Remove-AppxProvisionedPackage -online'
      ]
    },
    {
      id: 'remove-gallery',
      titleKey: 'tweak_gallery_title',
      descKey: 'tweak_gallery_desc',
      category: 'caution',
      tab: 'advanced',
      icon: LayoutGrid,
      invokeScript: ['Remove-Item "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" -ErrorAction SilentlyContinue'],
      undoScript: ['New-Item "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{e88865ea-0e1c-4e20-9aa6-edcd0212c87c}" -Force']
    },
    {
      id: 'remove-home',
      titleKey: 'tweak_home_title',
      descKey: 'tweak_home_desc',
      category: 'caution',
      tab: 'advanced',
      icon: LayoutGrid,
      invokeScript: [
        'Remove-Item "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}" -ErrorAction SilentlyContinue',
        'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name LaunchTo -Value 1'
      ],
      undoScript: [
        'New-Item "HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Desktop\\NameSpace\\{f874310e-b6b7-47dc-bc84-b9e6b38f5903}" -Force',
        'Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced" -Name LaunchTo -Value 0'
      ]
    },
    {
      id: 'remove-edge-advanced',
      titleKey: 'tweak_remove_edge_title',
      descKey: 'tweak_remove_edge_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Wrench,
      invokeScript: [
        '$Path = (Get-ChildItem "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\*\\Installer\\setup.exe")[0].FullName',
        'if ($Path) { Start-Process $Path -ArgumentList "--uninstall --system-level --force-uninstall --delete-profile" -Wait }'
      ],
      undoScript: ['winget install Microsoft.Edge --source winget']
    },
    {
      id: 'run-ooshutup',
      titleKey: 'tweak_ooshutup_title',
      descKey: 'tweak_ooshutup_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Shield,
      invokeScript: [
        '$OOSU_filepath = "$ENV:temp\\OOSU10.exe"',
        'Invoke-WebRequest -Uri "https://dl5.oo-software.com/files/ooshutup10/OOSU10.exe" -OutFile $OOSU_filepath',
        'Start-Process $OOSU_filepath'
      ]
    },
    {
      id: 'display-performance',
      titleKey: 'tweak_display_perf_title',
      descKey: 'tweak_display_perf_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Cpu,
      registry: [
        { path: 'HKCU:\\Control Panel\\Desktop', name: 'DragFullWindows', type: 'String', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Control Panel\\Desktop', name: 'MenuShowDelay', type: 'String', value: '200', originalValue: '400' },
        { path: 'HKCU:\\Control Panel\\Desktop\\WindowMetrics', name: 'MinAnimate', type: 'String', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Control Panel\\Keyboard', name: 'KeyboardDelay', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'ListviewAlphaSelect', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'ListviewShadow', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'TaskbarAnimations', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\VisualEffects', name: 'VisualFXSetting', type: 'DWord', value: '3', originalValue: '1' },
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\DWM', name: 'EnableAeroPeek', type: 'DWord', value: '0', originalValue: '1' }
      ],
      invokeScript: ['Set-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "UserPreferencesMask" -Type Binary -Value ([byte[]](144,18,3,128,16,0,0,0))'],
      undoScript: ['Remove-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "UserPreferencesMask"']
    },
    {
      id: 'time-utc',
      titleKey: 'tweak_time_utc_title',
      descKey: 'tweak_time_utc_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Settings,
      registry: [
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\TimeZoneInformation', name: 'RealTimeIsUniversal', type: 'DWord', value: '1', originalValue: '0' }
      ]
    },
    {
      id: 'remove-copilot',
      titleKey: 'tweak_copilot_title',
      descKey: 'tweak_copilot_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Wrench,
      registry: [
        { path: 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsCopilot', name: 'TurnOffWindowsCopilot', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsCopilot', name: 'TurnOffWindowsCopilot', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' }
      ],
      invokeScript: [
        'Get-AppxPackage -allusers *Microsoft.Copilot* | Remove-AppxPackage -AllUsers -ErrorAction SilentlyContinue',
        'Get-AppxProvisionedPackage -Online | Where-Object {$_.PackageName -like "*Copilot*"} | Remove-AppxProvisionedPackage -Online -ErrorAction SilentlyContinue'
      ]
    },
    {
      id: 'disable-recall',
      titleKey: 'tweak_recall_title',
      descKey: 'tweak_recall_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Eye,
      registry: [
        { path: 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\WindowsAI', name: 'DisableAIDataAnalysis', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\WindowsAI', name: 'DisableAIDataAnalysis', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' }
      ],
      invokeScript: [
        'Dism /Online /Disable-Feature /FeatureName:Recall /NoRestart -ErrorAction SilentlyContinue'
      ]
    },
    {
      id: 'disable-location',
      titleKey: 'tweak_location_title',
      descKey: 'tweak_location_desc',
      category: 'essential',
      tab: 'essential',
      icon: Network,
      registry: [
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableLocation', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableLocationScripting', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' },
        { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableWindowsLocationProvider', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'delete-temp-files',
      titleKey: 'tweak_delete_temp_title',
      descKey: 'tweak_delete_temp_desc',
      category: 'essential',
      tab: 'essential',
      icon: Trash2,
      invokeScript: [
        'Remove-Item -Path "$env:TEMP\\*" -Recurse -Force -ErrorAction SilentlyContinue',
        'Remove-Item -Path "C:\\Windows\\Temp\\*" -Recurse -Force -ErrorAction SilentlyContinue',
        'Remove-Item -Path "C:\\Windows\\Prefetch\\*" -Recurse -Force -ErrorAction SilentlyContinue',
        'Clear-RecycleBin -Force -ErrorAction SilentlyContinue'
      ]
    },
    {
      id: 'start-menu-recommendations',
      titleKey: 'tweak_start_recs_title',
      descKey: 'tweak_start_recs_desc',
      category: 'customize',
      tab: 'customize',
      icon: Layout,
      registry: [
        { path: 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced', name: 'Start_IrisRecommendations', type: 'DWord', value: '0', originalValue: '1' },
        { path: 'HKCU:\\Software\\Policies\\Microsoft\\Windows\\Explorer', name: 'HideRecommendedSection', type: 'DWord', value: '1', originalValue: '<RemoveEntry>' }
      ]
    },
    {
      id: 'dns-google',
      titleKey: 'tweak_dns_google_title',
      descKey: 'tweak_dns_google_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Network,
      invokeScript: [
        '$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}',
        'foreach ($adapter in $adapters) {',
        '  Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ("8.8.8.8","8.8.4.4","2001:4860:4860::8888","2001:4860:4860::8844")',
        '}',
        'ipconfig /flushdns'
      ],
      undoScript: [
        '$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}',
        'foreach ($adapter in $adapters) {',
        '  Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ResetServerAddresses',
        '}',
        'ipconfig /flushdns'
      ]
    },
    {
      id: 'dns-cloudflare',
      titleKey: 'tweak_dns_cloudflare_title',
      descKey: 'tweak_dns_cloudflare_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Network,
      invokeScript: [
        '$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}',
        'foreach ($adapter in $adapters) {',
        '  Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ServerAddresses ("1.1.1.1","1.0.0.1","2606:4700:4700::1111","2606:4700:4700::1001")',
        '}',
        'ipconfig /flushdns'
      ],
      undoScript: [
        '$adapters = Get-NetAdapter | Where-Object {$_.Status -eq "Up"}',
        'foreach ($adapter in $adapters) {',
        '  Set-DnsClientServerAddress -InterfaceIndex $adapter.ifIndex -ResetServerAddresses',
        '}',
        'ipconfig /flushdns'
      ]
    },
    {
      id: 's3-sleep',
      titleKey: 'tweak_s3_sleep_title',
      descKey: 'tweak_s3_sleep_desc',
      category: 'caution',
      tab: 'advanced',
      icon: Power,
      registry: [
        { path: 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power', name: 'PlatformAoAcOverride', type: 'DWord', value: '0', originalValue: '<RemoveEntry>' }
      ],
      noteKey: 'tweak_s3_sleep_note'
    }
  ]), [t]);

  const filteredTweaks = useMemo(() => {
    if (activeTab === 'all') return tweaks;
    return tweaks.filter(t => t.tab === activeTab);
  }, [tweaks, activeTab]);


  const handleApply = async (tweak: Tweak) => {
    setProcessing(prev => ({ ...prev, [tweak.id]: true }));
    try {
      if (tweak.registry) {
        for (const reg of tweak.registry) {
          const command = `
            if (-not (Test-Path "${reg.path}")) {
              New-Item -Path "${reg.path}" -Force | Out-Null
            }
            Set-ItemProperty -Path "${reg.path}" -Name "${reg.name}" -Value "${reg.value}" -Type ${reg.type} -Force
          `;
          await invoke('run_powershell', { command });
        }
      }

      if (tweak.invokeScript) {
        await invoke('run_powershell', { command: tweak.invokeScript.join('; ') });
      }

      setApplied(prev => ({ ...prev, [tweak.id]: true }));
      showToast('success', t('tweak_applied_title'), t(tweak.titleKey as any));
    } catch (error) {
      console.error(error);
      showToast('error', t('tweak_error_title'), String(error));
    } finally {
      setProcessing(prev => ({ ...prev, [tweak.id]: false }));
    }
  };

  const handleUndo = async (tweak: Tweak) => {
    setProcessing(prev => ({ ...prev, [tweak.id]: true }));
    try {
      if (tweak.undoScript) {
        await invoke('run_powershell', { command: tweak.undoScript.join('; ') });
      } else if (tweak.registry) {
        for (const reg of tweak.registry) {
          if (reg.originalValue === '<RemoveEntry>') {
            await invoke('run_powershell', {
              command: `Remove-ItemProperty -Path "${reg.path}" -Name "${reg.name}" -Force -ErrorAction SilentlyContinue`
            });
          } else if (reg.originalValue === '<RemoveKey>') {
            await invoke('run_powershell', {
              command: `Remove-Item -Path "${reg.path}" -Recurse -Force -ErrorAction SilentlyContinue`
            });
          } else if (reg.originalValue) {
            await invoke('run_powershell', {
              command: `Set-ItemProperty -Path "${reg.path}" -Name "${reg.name}" -Value "${reg.originalValue}" -Type ${reg.type} -Force`
            });
          }
        }
      }

      setApplied(prev => ({ ...prev, [tweak.id]: false }));
      showToast('info', t('tweak_reverted_title'), t(tweak.titleKey as any));
    } catch (error) {
      console.error(error);
      showToast('error', t('tweak_error_title'), String(error));
    } finally {
      setProcessing(prev => ({ ...prev, [tweak.id]: false }));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--text-100)' }}>
            {t('essential_tweaks_title')}
          </h2>
          <p className="text-muted mt-sm">{t('essential_tweaks_subtitle')}</p>
        </div>

        <div className="tab-control">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <LayoutGrid size={16} />
            <span>{t('tab_all')}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'essential' ? 'active' : ''}`}
            onClick={() => setActiveTab('essential')}
          >
            <Shield size={16} />
            <span>{t('tab_essential')}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            <Wrench size={16} />
            <span>{t('tab_advanced')}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'customize' ? 'active' : ''}`}
            onClick={() => setActiveTab('customize')}
          >
            <Moon size={16} />
            <span>{t('tab_customize')}</span>
          </button>
        </div>
      </div>

      <div className="card-grid">
        {filteredTweaks.map((tweak) => (
          <div key={tweak.id} className="control-card">
            <div className="card-header">
              <div className={`card-icon-wrapper ${tweak.category === 'caution' ? 'amber' : tweak.category === 'customize' ? 'purple' : ''}`}>
                <tweak.icon size={20} />
              </div>
              <div className={`card-status ${tweak.category === 'caution' ? 'warning' : tweak.category === 'customize' ? 'customize' : ''}`}>
                <span className="card-status-dot" />
                {tweak.category === 'caution' ? t('caution_badge') :
                  tweak.category === 'customize' ? t('customize_badge') : t('essential_badge')}
              </div>
            </div>

            <div className="card-title">{t(tweak.titleKey as any)}</div>
            <div className="card-description">{t(tweak.descKey as any)}</div>

            {tweak.noteKey && (
              <div className="tweak-note">
                <AlertTriangle size={14} />
                <span>{t(tweak.noteKey as any)}</span>
              </div>
            )}

            {tweak.sampleList && (
              <div className="tweak-sample">
                <div className="tweak-sample-title">{t('tweak_services_sample')}</div>
                <div className="tweak-sample-list">
                  {tweak.sampleList.map((item) => (
                    <span key={item} className="badge badge-muted">{item}</span>
                  ))}
                </div>
              </div>
            )}

            {(tweak.registry || tweak.invokeScript || tweak.undoScript) && (
              <details className="tweak-details">
                <summary>{t('tweak_details')}</summary>
                {tweak.registry && (
                  <div className="tweak-section">
                    <div className="tweak-section-title">{t('tweak_registry')}</div>
                    <RegistryTable
                      items={tweak.registry}
                      labels={{
                        path: t('tweak_table_path'),
                        name: t('tweak_table_name'),
                        type: t('tweak_table_type'),
                        value: t('tweak_table_value')
                      }}
                    />
                  </div>
                )}
                {tweak.invokeScript && (
                  <div className="tweak-section">
                    <div className="tweak-section-title">{t('tweak_invoke')}</div>
                    <pre className="code-block"><code>{tweak.invokeScript.join('\n')}</code></pre>
                  </div>
                )}
                {tweak.undoScript && (
                  <div className="tweak-section">
                    <div className="tweak-section-title">{t('tweak_undo')}</div>
                    <pre className="code-block"><code>{tweak.undoScript.join('\n')}</code></pre>
                  </div>
                )}
              </details>
            )}

            <div className="card-footer">
              <span className="card-meta">
                {processing[tweak.id] ? t('tweak_status_processing' as any) :
                  applied[tweak.id] ? t('tweak_status_applied' as any) : t('tweak_status_ready' as any)}
              </span>
              <div className="flex gap-sm">
                <button
                  className="btn btn-secondary"
                  onClick={() => handleUndo(tweak)}
                  disabled={!applied[tweak.id] || processing[tweak.id]}
                >
                  <RefreshCw size={14} className={processing[tweak.id] ? 'animate-spin' : ''} />
                  {t('tweak_undo_btn')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleApply(tweak)}
                  disabled={processing[tweak.id]}
                >
                  <CheckCircle size={14} />
                  {t('tweak_apply_btn')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

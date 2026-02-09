export type PrivacyRegistryItem = {
  path: string;
  name: string;
  type: string;
  enableValue: string;
  disableValue: string;
};

export type PrivacySettingCatalogItem = {
  id: string;
  titleKey: string;
  descriptionKey: string;
  risk: 'low' | 'medium' | 'high';
  category: string;
  registry?: PrivacyRegistryItem[];
  enableScript?: string[];
  disableScript?: string[];
};

export const privacySettingsCatalog: PrivacySettingCatalogItem[] = [
  {
    id: 'telemetry',
    titleKey: 'privacy_disable_telemetry_title',
    descriptionKey: 'privacy_disable_telemetry_desc',
    risk: 'high',
    category: 'data',
    registry: [
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection', name: 'AllowTelemetry', type: 'DWord', enableValue: '0', disableValue: '3' },
      { path: 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Policies\\DataCollection', name: 'AllowTelemetry', type: 'DWord', enableValue: '0', disableValue: '3' }
    ],
    enableScript: ['Stop-Service DiagTrack -Force; Set-Service DiagTrack -StartupType Disabled'],
    disableScript: ['Set-Service DiagTrack -StartupType Automatic; Start-Service DiagTrack']
  },
  {
    id: 'advertising',
    titleKey: 'privacy_disable_ad_id_title',
    descriptionKey: 'privacy_disable_ad_id_desc',
    risk: 'medium',
    category: 'data',
    registry: [
      { path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo', name: 'Enabled', type: 'DWord', enableValue: '0', disableValue: '1' },
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AdvertisingInfo', name: 'DisabledByGroupPolicy', type: 'DWord', enableValue: '1', disableValue: '0' }
    ]
  },
  {
    id: 'location',
    titleKey: 'privacy_disable_location_title',
    descriptionKey: 'privacy_disable_location_desc',
    risk: 'medium',
    category: 'sensors',
    registry: [
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableLocation', type: 'DWord', enableValue: '1', disableValue: '0' },
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\LocationAndSensors', name: 'DisableLocationScripting', type: 'DWord', enableValue: '1', disableValue: '0' }
    ]
  },
  {
    id: 'camera',
    titleKey: 'privacy_block_camera_title',
    descriptionKey: 'privacy_block_camera_desc',
    risk: 'low',
    category: 'sensors',
    registry: [
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy', name: 'LetAppsAccessCamera', type: 'DWord', enableValue: '2', disableValue: '0' }
    ]
  },
  {
    id: 'microphone',
    titleKey: 'privacy_block_microphone_title',
    descriptionKey: 'privacy_block_microphone_desc',
    risk: 'low',
    category: 'sensors',
    registry: [
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\AppPrivacy', name: 'LetAppsAccessMicrophone', type: 'DWord', enableValue: '2', disableValue: '0' }
    ]
  },
  {
    id: 'activity',
    titleKey: 'privacy_disable_activity_title',
    descriptionKey: 'privacy_disable_activity_desc',
    risk: 'medium',
    category: 'data',
    registry: [
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', name: 'EnableActivityFeed', type: 'DWord', enableValue: '0', disableValue: '1' },
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', name: 'PublishUserActivities', type: 'DWord', enableValue: '0', disableValue: '1' },
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\System', name: 'UploadUserActivities', type: 'DWord', enableValue: '0', disableValue: '1' }
    ]
  },
  {
    id: 'cortana',
    titleKey: 'privacy_disable_cortana_title',
    descriptionKey: 'privacy_disable_cortana_desc',
    risk: 'low',
    category: 'features',
    registry: [
      { path: 'HKLM:\\SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search', name: 'AllowCortana', type: 'DWord', enableValue: '0', disableValue: '1' },
      { path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search', name: 'CortanaConsent', type: 'DWord', enableValue: '0', disableValue: '1' }
    ]
  },
  {
    id: 'searchHistory',
    titleKey: 'privacy_clear_search_title',
    descriptionKey: 'privacy_clear_search_desc',
    risk: 'low',
    category: 'data',
    registry: [
      { path: 'HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\SearchSettings', name: 'IsDeviceSearchHistoryEnabled', type: 'DWord', enableValue: '0', disableValue: '1' }
    ],
    enableScript: ['Remove-Item -Path "HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Search\\RecentApps" -Recurse -ErrorAction SilentlyContinue']
  }
];

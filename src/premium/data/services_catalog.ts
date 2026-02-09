export type ServiceCatalogItem = {
  id: string;
  name: string;
  displayNameKey: string;
  descriptionKey: string;
  status: 'running' | 'stopped' | 'paused';
  startupType: 'automatic' | 'manual' | 'disabled';
  category: 'system' | 'network' | 'security' | 'application';
  canDisable: boolean;
};

export const servicesCatalog: ServiceCatalogItem[] = [
  {
    id: 'wuauserv',
    name: 'wuauserv',
    displayNameKey: 'service_windows_update',
    descriptionKey: 'service_windows_update_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'system',
    canDisable: true
  },
  {
    id: 'bits',
    name: 'BITS',
    displayNameKey: 'service_bits',
    descriptionKey: 'service_bits_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'network',
    canDisable: true
  },
  {
    id: 'wdefend',
    name: 'WinDefend',
    displayNameKey: 'service_defender',
    descriptionKey: 'service_defender_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'security',
    canDisable: false
  },
  {
    id: 'spooler',
    name: 'Spooler',
    displayNameKey: 'service_spooler',
    descriptionKey: 'service_spooler_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'application',
    canDisable: true
  },
  {
    id: 'wsearch',
    name: 'WSearch',
    displayNameKey: 'service_windows_search',
    descriptionKey: 'service_windows_search_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'system',
    canDisable: true
  },
  {
    id: 'diagtrack',
    name: 'DiagTrack',
    displayNameKey: 'service_diagtrack',
    descriptionKey: 'service_diagtrack_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'system',
    canDisable: true
  },
  {
    id: 'sysmain',
    name: 'SysMain',
    displayNameKey: 'service_sysmain',
    descriptionKey: 'service_sysmain_desc',
    status: 'stopped',
    startupType: 'disabled',
    category: 'system',
    canDisable: true
  },
  {
    id: 'fax',
    name: 'Fax',
    displayNameKey: 'service_fax',
    descriptionKey: 'service_fax_desc',
    status: 'stopped',
    startupType: 'manual',
    category: 'application',
    canDisable: true
  },
  {
    id: 'remoteregistry',
    name: 'RemoteRegistry',
    displayNameKey: 'service_remote_registry',
    descriptionKey: 'service_remote_registry_desc',
    status: 'stopped',
    startupType: 'disabled',
    category: 'security',
    canDisable: true
  },
  {
    id: 'dhcp',
    name: 'Dhcp',
    displayNameKey: 'service_dhcp',
    descriptionKey: 'service_dhcp_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'network',
    canDisable: false
  },
  {
    id: 'dnscache',
    name: 'Dnscache',
    displayNameKey: 'service_dns_client',
    descriptionKey: 'service_dns_client_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'network',
    canDisable: false
  },
  {
    id: 'themes',
    name: 'Themes',
    displayNameKey: 'service_themes',
    descriptionKey: 'service_themes_desc',
    status: 'running',
    startupType: 'automatic',
    category: 'application',
    canDisable: true
  }
];

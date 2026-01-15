import { useState, memo, useMemo, useCallback } from 'react';
import { Home, Settings, Shield, Cpu, Database, Power, ChevronLeft, ChevronRight, Sliders, Wrench, Download, Trash2, MessageSquare, Save, Activity, Network, Info } from 'lucide-react';
import { open } from '@tauri-apps/plugin-shell';
import { useLanguage } from '../../contexts/LanguageContext';
import './Sidebar.css';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
}

const SidebarComponent: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useLanguage();

  const menuItems = useMemo(() => [
    { id: 'dashboard', icon: Home, label: t('dashboard_page_title') },
    { id: 'installer', icon: Download, label: t('installer_menu_item') },
    { id: 'debloater', icon: Trash2, label: t('debloater_menu_item') },
    { id: 'discord', icon: MessageSquare, label: t('discord_menu_item') },
    { id: 'system-monitor', icon: Activity, label: t('system_monitor_menu_item') || 'System Monitor' },
    { id: 'network-manager', icon: Network, label: t('network_manager_menu_item') || 'Network Manager' },
    { id: 'backup-recovery', icon: Save, label: t('backup_recovery_menu_item') || 'Backup & Recovery' },
    { id: 'advanced-tweaks', icon: Sliders, label: t('system_tweaks_menu_item') },
    { id: 'optimization', icon: Cpu, label: t('optimization_menu_item') },
    { id: 'fixes', icon: Wrench, label: t('fixes_menu_item') },
    { id: 'privacy', icon: Shield, label: t('privacy_menu_item') },
    { id: 'services', icon: Database, label: t('services_menu_item') },
    { id: 'settings', icon: Settings, label: t('settings_page_title') },
    { id: 'about', icon: Info, label: t('about_menu_item') || 'About' },
  ], [t]);

  const handleItemClick = useCallback((itemId: string) => {
    onPageChange(itemId);
  }, [onPageChange]);

  const handleDiscordClick = useCallback(async () => {
    await open('https://discord.gg/hbht3K4zJg');
  }, []);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-top">
        <button className="brand" onClick={() => handleItemClick('dashboard')}>
          <Power className="brand-icon" />
          {!collapsed && <span className="brand-text">{t('app_name')}</span>}
        </button>
        <button
          className="collapse-toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? t('expand_sidebar_tooltip') : t('collapse_sidebar_tooltip')}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => handleItemClick(item.id)}
            >
              <span className="nav-icon-wrap">
                <Icon className="nav-icon" />
              </span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <button className="discord-link" onClick={handleDiscordClick}>
          {t('discord_connect_button')}
        </button>
      </div>
    </aside>
  );
};

export const Sidebar = memo(SidebarComponent);

import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { User, X, Square } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { getTokenInfo } from '../../utils/tauri';
import { decryptToken } from '../../contexts/AuthContext';
import './Header.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onPageChange?: (page: string) => void;
}

const HeaderComponent: React.FC<HeaderProps> = ({ title, subtitle, onPageChange }) => {
  const { t } = useLanguage();
  const { discordUserToken } = useAuth();
  const [isMaximized, setIsMaximized] = useState(false);
  const [discordAvatar, setDiscordAvatar] = useState<string | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await getCurrentWindow().isMaximized();
        setIsMaximized(maximized);
      } catch (e) {
        console.error('Failed to check window state:', e);
      }
    };

    checkMaximized();

    const window = getCurrentWindow();
    
    const setupListeners = async () => {
      try {
        const unlistenResized = await window.onResized(() => {
          checkMaximized();
        });
        
        unlistenRef.current = unlistenResized;
      } catch (e) {
        console.error('Failed to setup window listeners:', e);
      }
    };

    setupListeners();

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const loadDiscordAvatar = async () => {
      let tokenToUse = discordUserToken;
      
      if (!tokenToUse) {
        const DISCORD_USER_TOKEN_KEY = 'confutils_discord_user_token';
        const encryptedToken = localStorage.getItem(DISCORD_USER_TOKEN_KEY);
        if (encryptedToken) {
          try {
            tokenToUse = decryptToken(encryptedToken);
            if (!tokenToUse || tokenToUse.trim() === '' || tokenToUse === encryptedToken) {
              tokenToUse = null;
            }
          } catch (error) {
            console.error('Failed to decrypt Discord token:', error);
            tokenToUse = null;
          }
        }
      }
      
      if (tokenToUse && tokenToUse.trim()) {
        try {
          const tokenInfo = await getTokenInfo(tokenToUse.trim());
          const info = JSON.parse(tokenInfo);
          const userId = info.id || info.user_id;
          const avatarHash = info.avatar;
          
          if (userId) {
            let avatarUrl = '';
            if (avatarHash && avatarHash !== null && avatarHash !== 'null' && avatarHash !== '') {
              avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
            } else {
              const avatarIndex = parseInt(userId) % 5;
              avatarUrl = `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
            }
            setDiscordAvatar(avatarUrl);
          } else {
            setDiscordAvatar(null);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          if (!errorMsg.includes('404') && !errorMsg.includes('Not Found')) {
            console.error('Failed to load Discord avatar:', error);
          }
          setDiscordAvatar(null);
        }
      } else {
        setDiscordAvatar(null);
      }
    };
    
    loadDiscordAvatar();
    
    const checkInterval = setInterval(() => {
      if (!discordAvatar && (discordUserToken || localStorage.getItem('confutils_discord_user_token'))) {
        loadDiscordAvatar();
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [discordUserToken, discordAvatar]);

  const handleMinimize = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const settings = localStorage.getItem('confutils_settings');
    if (settings) {
      try {
        const parsedSettings = JSON.parse(settings);
        if (parsedSettings.minimizeToTray) {
          await getCurrentWindow().hide();
          return;
        }
      } catch (e) {
      }
    }
    await getCurrentWindow().minimize();
  }, []);

  const handleMaximizeToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      const window = getCurrentWindow();
      const currentMaximized = await window.isMaximized();
      
      if (currentMaximized) {
        await window.unmaximize();
        setIsMaximized(false);
      } else {
        await window.maximize();
        setIsMaximized(true);
      }
      
      setTimeout(async () => {
        try {
          const newState = await window.isMaximized();
          setIsMaximized(newState);
        } catch (err) {
          console.error('Failed to update maximize state:', err);
        }
      }, 300);
    } catch (e) {
      console.error('Failed to toggle maximize:', e);
    }
  }, []);

  const handleClose = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const settings = localStorage.getItem('confutils_settings');
    if (settings) {
      try {
        const parsedSettings = JSON.parse(settings);
        if (parsedSettings.minimizeToTray) {
          console.log('🔵 Minimize to Tray enabled - hiding to system tray');
          await getCurrentWindow().hide();
          return;
        }
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }

    console.log('🔴 CLOSE BUTTON CLICKED - Force exiting...');
    try {
      await invoke('force_exit');
    } catch (error) {
      console.error('❌ Failed to exit:', error);
      try {
        await getCurrentWindow().close();
      } catch (e) {
        console.error('❌ Fallback close also failed:', e);
      }
    }
  }, []);

  const handleSettingsClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPageChange) {
      onPageChange('settings');
    }
  }, [onPageChange]);

  return (
    <header className="header glass">
      <div className="header-left">
        <div className="header-title-group">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-actions no-drag">
          {discordAvatar ? (
            <div 
              className="profile-avatar-container" 
              title={t('settings_page_title')} 
              onClick={handleSettingsClick}
            >
              <img
                src={discordAvatar}
                alt="Profile"
                className="profile-avatar"
              />
            </div>
          ) : (
            <button className="action-btn" title={t('settings_page_title')} onClick={handleSettingsClick}>
              <User size={18} />
            </button>
          )}
        </div>

        <div className="window-controls no-drag" style={{ zIndex: 9999 }}>
          <button className="window-btn" onClick={handleMinimize} title="Minimize">
            <span className="minimize-icon">−</span>
          </button>
          <button className="window-btn" onClick={handleMaximizeToggle} title={isMaximized ? "Restore" : "Maximize"}>
            {isMaximized ? <span className="restore-icon">🗗</span> : <Square size={14} />}
          </button>
          <button className="window-btn close-btn" onClick={handleClose} title="Close">
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
};

export const Header = memo(HeaderComponent);
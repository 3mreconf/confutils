import { useState, useEffect } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Bell, Zap, Download, RotateCw, Globe } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { open } from '@tauri-apps/plugin-shell';
import { enableAutostart, getTokenInfo } from '../utils/tauri';
import { CustomSelect } from '../components/UI/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { maskToken } from '../utils/discordToken';
import './Dashboard.css';

const SETTINGS_KEY = 'confutils_settings';

interface AppSettings {
  autoStart: boolean;
  notifications: boolean;
  minimizeToTray: boolean;
  autoCleanup: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  autoStart: false,
  notifications: true,
  minimizeToTray: false,
  autoCleanup: false,
};

const Settings = () => {
  const { showNotification } = useNotification();
  const { language, setLanguage, t } = useLanguage();
  const { discordUserToken, discordUserTokens, setDiscordUserToken, setActiveDiscordUserToken } = useAuth();
  const [autoStart, setAutoStart] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [tokenError, setTokenError] = useState('');
  const [tokenProfile, setTokenProfile] = useState<{ username: string; avatarUrl: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (discordUserToken) {
      setTokenInput(discordUserToken);
    }
  }, [discordUserToken]);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings: AppSettings & { language?: string } = JSON.parse(saved);
        setAutoStart(settings.autoStart);
        setNotifications(settings.notifications);
        setMinimizeToTray(settings.minimizeToTray);
        setAutoCleanup(settings.autoCleanup || false);
        if (settings.language && settings.language !== language) {
          setLanguage(settings.language);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveSettings = (newSettings: Partial<AppSettings> & { language?: string }) => {
    try {
      const current: AppSettings & { language?: string } = {
        autoStart,
        notifications,
        minimizeToTray,
        autoCleanup,
        language,
        ...newSettings,
      };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleAutoStart = async (enabled: boolean) => {
    try {
      await enableAutostart(enabled);
      setAutoStart(enabled);
      saveSettings({ autoStart: enabled });
      showNotification(
        'success',
        t('notification_autostart_updated_title'),
        enabled ? t('notification_autostart_enabled_message') : t('notification_autostart_disabled_message')
      );
    } catch (error) {
      showNotification('error', t('notification_error_title'), `${error}`);
    }
  };

  const handleNotifications = async (enabled: boolean) => {
    setNotifications(enabled);
    saveSettings({ notifications: enabled });
    showNotification(
      'info',
      t('notification_notifications_updated_title'),
      enabled ? t('notification_notifications_enabled_message') : t('notification_notifications_disabled_message')
    );
  };

  const handleMinimizeToTray = async (enabled: boolean) => {
    setMinimizeToTray(enabled);
    saveSettings({ minimizeToTray: enabled });
    showNotification(
      'success',
      t('notification_setting_updated_title'),
      enabled ? t('notification_minimize_to_tray_enabled_message') : t('notification_minimize_to_tray_disabled_message')
    );
  };

  const handleAutoCleanup = async (enabled: boolean) => {
    setAutoCleanup(enabled);
    saveSettings({ autoCleanup: enabled });
    showNotification(
      'success',
      t('notification_setting_updated_title'),
      enabled ? t('notification_auto_cleanup_enabled_message') : t('notification_auto_cleanup_disabled_message')
    );
  };

  const handleLanguageChange = (selectedLanguage: string) => {
    setLanguage(selectedLanguage);
    saveSettings({ language: selectedLanguage });
    showNotification('success', t('notification_language_updated_title'), t('notification_language_updated_message', { language: selectedLanguage }));
  };

  const handleCheckUpdates = async () => {
    try {
      await open('https://github.com/3mreconf/confutils-releases/releases');
      showNotification('success', t('success'), t('notification_opening_browser'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenError(t('settings_discord_token_required'));
      showNotification('error', t('error'), t('settings_discord_token_required'));
      return;
    }
    setDiscordUserToken(trimmed);
    setTokenError('');
    setTokenStatus('idle');
    showNotification('success', t('success'), t('settings_discord_token_saved'));
  };

  const handleCheckToken = async () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenError(t('settings_discord_token_required'));
      showNotification('error', t('error'), t('settings_discord_token_required'));
      return;
    }
    setTokenStatus('checking');
    setTokenError('');
    setTokenProfile(null);
    try {
      const raw = await getTokenInfo(trimmed);
      const info = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const userId = info.id || info.user_id;
      if (!userId) {
        throw new Error('invalid');
      }
      const username = info.username || info.global_name || userId;
      const discriminator = info.discriminator;
      const displayName = discriminator && discriminator !== '0' ? `${username}#${discriminator}` : username;
      const avatarHash = info.avatar;
      let avatarUrl = '';
      if (avatarHash && avatarHash !== 'null') {
        avatarUrl = `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=128`;
      } else {
        const avatarIndex = parseInt(String(userId), 10) % 5;
        avatarUrl = `https://cdn.discordapp.com/embed/avatars/${avatarIndex}.png`;
      }
      setTokenProfile({ username: displayName, avatarUrl });
      setTokenStatus('ok');
      showNotification('success', t('success'), t('settings_discord_token_valid'));
    } catch (error) {
      setTokenStatus('error');
      setTokenError(t('settings_discord_token_invalid'));
      showNotification('error', t('error'), t('settings_discord_token_check_failed'));
    }
  };

  const handleReset = async () => {
    setAutoStart(DEFAULT_SETTINGS.autoStart);
    setNotifications(DEFAULT_SETTINGS.notifications);
    setMinimizeToTray(DEFAULT_SETTINGS.minimizeToTray);
    setAutoCleanup(DEFAULT_SETTINGS.autoCleanup);
    setLanguage('tr');
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, language: 'tr' }));
    showNotification('warning', t('notification_reset_settings_title'), t('notification_reset_settings_message'));
  };

  const languageOptions = [
    { value: 'tr', label: t('language_turkish') },
    { value: 'en', label: t('language_english') },
  ];
  return (
    <div className="settings-page">
      <div className="page-header">
        <h2 className="page-title">{t('settings_page_title')}</h2>
        <p className="page-description">{t('settings_page_description')}</p>
      </div>

      <div className="settings-section">
        <h3 className="section-title">{t('settings_section_general')}</h3>
        <div className="grid-auto">
          <UtilityCard
            icon={Zap}
            title={t('settings_launch_on_startup_title')}
            description={t('settings_launch_on_startup_description')}
            actionType="toggle"
            defaultEnabled={autoStart}
            onAction={handleAutoStart}
          />

          <UtilityCard
            icon={Bell}
            title={t('settings_enable_notifications_title')}
            description={t('settings_enable_notifications_description')}
            actionType="toggle"
            defaultEnabled={notifications}
            onAction={handleNotifications}
          />

          <UtilityCard
            icon={Zap}
            title={t('settings_minimize_to_tray_title')}
            description={t('settings_minimize_to_tray_description')}
            actionType="toggle"
            defaultEnabled={minimizeToTray}
            onAction={handleMinimizeToTray}
          />

          <UtilityCard
            icon={Zap}
            title={t('settings_auto_cleanup_title')}
            description={t('settings_auto_cleanup_description')}
            actionType="toggle"
            defaultEnabled={autoCleanup}
            onAction={handleAutoCleanup}
            detailedInfo={{
              description: t('settings_auto_cleanup_detailed_description'),
              features: [
                t('settings_auto_cleanup_feature_1'),
                t('settings_auto_cleanup_feature_2'),
                t('settings_auto_cleanup_feature_3'),
                t('settings_auto_cleanup_feature_4'),
                t('settings_auto_cleanup_feature_5'),
              ],
              requirements: [
                t('settings_auto_cleanup_requirement_1'),
                t('settings_auto_cleanup_requirement_2'),
              ],
              warnings: [
                t('settings_auto_cleanup_warning_1'),
                t('settings_auto_cleanup_warning_2'),
              ],
              technicalDetails: t('settings_auto_cleanup_tech_details'),
            }}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">{t('settings_section_application')}</h3>
        <div className="grid-auto">
          <UtilityCard
            icon={Globe}
            title={t('settings_language_title')}
            description={t('settings_language_description')}
            actionType="custom"
          >
            <CustomSelect
              options={languageOptions}
              value={language}
              onChange={handleLanguageChange}
            />
          </UtilityCard>

          <UtilityCard
            icon={Download}
            title={t('settings_check_for_updates_title')}
            description={t('settings_check_for_updates_description')}
            actionType="button"
            actionLabel={t('settings_check_for_updates_button')}
            onAction={handleCheckUpdates}
          />

          <UtilityCard
            icon={RotateCw}
            title={t('settings_reset_settings_title')}
            description={t('settings_reset_settings_description')}
            actionType="button"
            actionLabel={t('settings_reset_all_button')}
            onAction={handleReset}
            badge={{ text: t('settings_reset_settings_caution'), type: 'warning' }}
          />
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">{t('settings_section_discord')}</h3>
        <div className="grid-auto">
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings_discord_token_title')}</div>
              <div className="settings-card-description">{t('settings_discord_token_description')}</div>
            </div>
            <div className="settings-card-body">
              <label className="settings-label">{t('settings_discord_token_label')}</label>
              <input
                type="password"
                className="settings-input"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  if (tokenError) setTokenError('');
                }}
                placeholder={t('settings_discord_token_placeholder')}
              />
              {discordUserTokens.length > 0 && (
                <>
                  <label className="settings-label">{t('settings_discord_saved_tokens_label')}</label>
                  <select
                    className="settings-input"
                    value={discordUserToken || ''}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (!selected) return;
                      setTokenInput(selected);
                      setActiveDiscordUserToken(selected);
                      setTokenStatus('idle');
                      setTokenProfile(null);
                      setTokenError('');
                    }}
                  >
                    {discordUserTokens.map(token => (
                      <option key={token} value={token}>
                        {maskToken(token)}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {tokenError && <div className="settings-token-error">{tokenError}</div>}
              <div className="settings-token-actions">
                <button className="settings-btn" onClick={handleSaveToken}>
                  {t('settings_discord_token_save')}
                </button>
                <button
                  className="settings-btn secondary"
                  onClick={handleCheckToken}
                  disabled={tokenStatus === 'checking'}
                >
                  {tokenStatus === 'checking' ? t('settings_discord_token_checking') : t('settings_discord_token_check')}
                </button>
              </div>
              {tokenProfile && (
                <div className="settings-token-profile">
                  <img src={tokenProfile.avatarUrl} alt={t('settings_discord_token_avatar_alt')} />
                  <div>
                    <div className="settings-token-name">{tokenProfile.username}</div>
                    <div className="settings-token-status">{t('settings_discord_token_valid')}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
export default Settings;
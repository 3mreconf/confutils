import { useState, useEffect, useRef } from 'react';
import { UtilityCard } from '../components/Cards/UtilityCard';
import { Bell, Zap, Download, RotateCw, Globe, Type, SlidersHorizontal, Upload, Save } from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';
import { useLanguage } from '../contexts/LanguageContext';
import { open } from '@tauri-apps/plugin-shell';
import { getVersion } from '@tauri-apps/api/app';
import { enableAutostart, getTokenInfo } from '../utils/tauri';
import { CustomSelect } from '../components/UI/CustomSelect';
import { useAuth } from '../contexts/AuthContext';
import { maskToken } from '../utils/discordToken';
import { consumeSettingsSection } from '../utils/navigation';
import './Dashboard.css';

const SETTINGS_KEY = 'confutils_settings';

interface AppSettings {
  autoStart: boolean;
  notifications: boolean;
  minimizeToTray: boolean;
  autoCleanup: boolean;
  autoCheckToken?: boolean;
  fontScale?: 'sm' | 'md' | 'lg';
  contrast?: 'soft' | 'default' | 'high';
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
  const {
    discordUserToken,
    discordUserTokens,
    discordTokenLabels,
    discordTokenProfiles,
    setDiscordUserToken,
    setActiveDiscordUserToken,
    setDiscordTokenLabel,
    setDiscordTokenProfile,
    importDiscordTokens,
    removeDiscordUserToken,
    clearDiscordUserToken
  } = useAuth();
  const [autoStart, setAutoStart] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [minimizeToTray, setMinimizeToTray] = useState(false);
  const [autoCleanup, setAutoCleanup] = useState(false);
  const [autoCheckTokenOnSave, setAutoCheckTokenOnSave] = useState(false);
  const [fontScale, setFontScale] = useState<'sm' | 'md' | 'lg'>('md');
  const [contrast, setContrast] = useState<'soft' | 'default' | 'high'>('default');
  const [tokenInput, setTokenInput] = useState('');
  const [tokenLabelInput, setTokenLabelInput] = useState('');
  const [tokenStatus, setTokenStatus] = useState<'idle' | 'checking' | 'ok' | 'error'>('idle');
  const [tokenError, setTokenError] = useState('');
  const [tokenProfile, setTokenProfile] = useState<{ username: string; avatarUrl: string } | null>(null);
  const tokenInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestRelease, setLatestRelease] = useState<{
    version: string;
    name: string;
    body: string;
    htmlUrl: string;
    downloadUrl: string | null;
    publishedAt: string;
  } | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'upToDate' | 'error'>('idle');
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await getVersion();
        setCurrentVersion(version);
      } catch {
        setCurrentVersion(null);
      }
    };
    loadVersion();
  }, []);

  useEffect(() => {
    fetchLatestRelease(false);
  }, []);

  useEffect(() => {
    if (discordUserToken) {
      setTokenInput(discordUserToken);
      setTokenLabelInput(discordTokenLabels[discordUserToken] || '');
    }
    setConfirmRemove(false);
  }, [discordUserToken, discordTokenLabels]);

  useEffect(() => {
    setConfirmClearAll(false);
  }, [discordUserTokens.length]);

  useEffect(() => {
    document.body.dataset.fontScale = fontScale;
    document.body.dataset.contrast = contrast;
  }, [fontScale, contrast]);

  useEffect(() => {
    const target = consumeSettingsSection();
    if (target === 'discord-token-settings') {
      const element = document.getElementById(target);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          tokenInputRef.current?.focus();
        }, 0);
      }
    }
  }, []);

  const loadSettings = () => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        const settings: AppSettings & { language?: string } = JSON.parse(saved);
        setAutoStart(settings.autoStart);
        setNotifications(settings.notifications);
        setMinimizeToTray(settings.minimizeToTray);
        setAutoCleanup(settings.autoCleanup || false);
        setAutoCheckTokenOnSave(settings.autoCheckToken || false);
        setFontScale(settings.fontScale || 'md');
        setContrast(settings.contrast || 'default');
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
        autoCheckToken: autoCheckTokenOnSave,
        fontScale,
        contrast,
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

  const normalizeVersion = (value: string) => value.replace(/^v/i, '');

  const compareVersions = (a: string, b: string) => {
    const partsA = normalizeVersion(a).split('.').map(Number);
    const partsB = normalizeVersion(b).split('.').map(Number);
    const length = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < length; i += 1) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      if (partA > partB) return 1;
      if (partA < partB) return -1;
    }
    return 0;
  };

  const pickDownloadUrl = (assets: Array<{ name: string; browser_download_url: string }>) => {
    const windowsAsset = assets.find((asset) => asset.name.toLowerCase().endsWith('.msi'))
      || assets.find((asset) => asset.name.toLowerCase().endsWith('.exe'));
    return windowsAsset ? windowsAsset.browser_download_url : null;
  };

  const fetchLatestRelease = async (notify: boolean) => {
    setUpdateStatus('checking');
    setUpdateError(null);
    if (notify) {
      showNotification('info', t('notification_checking_for_updates_title'), t('notification_checking_for_updates_message'));
    }
    try {
      const response = await fetch('https://api.github.com/repos/3mreconf/confutils/releases/latest', {
        headers: {
          Accept: 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const version = normalizeVersion(data.tag_name || data.name || '');
      const downloadUrl = pickDownloadUrl(data.assets || []);
      const nextRelease = {
        version,
        name: data.name || data.tag_name || `v${version}`,
        body: data.body || '',
        htmlUrl: data.html_url || 'https://github.com/3mreconf/confutils-releases/releases',
        downloadUrl,
        publishedAt: data.published_at || ''
      };
      setLatestRelease(nextRelease);

      if (currentVersion) {
        if (compareVersions(version, currentVersion) > 0) {
          setUpdateStatus('available');
          if (notify) {
            showNotification('success', t('notification_update_found_title'), t('notification_update_found_message', { version }));
          }
        } else {
          setUpdateStatus('upToDate');
          if (notify) {
            showNotification('success', t('notification_update_up_to_date_title'), t('notification_update_up_to_date_message'));
          }
        }
      } else {
        setUpdateStatus('idle');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setUpdateStatus('error');
      setUpdateError(message);
      if (notify) {
        showNotification('error', t('notification_update_check_failed_title'), t('notification_update_check_failed_message', { error: message }));
      }
    }
  };

  const handleCheckUpdates = async () => {
    await fetchLatestRelease(true);
  };

  useEffect(() => {
    if (!latestRelease || !currentVersion) {
      return;
    }
    if (compareVersions(latestRelease.version, currentVersion) > 0) {
      setUpdateStatus('available');
    } else {
      setUpdateStatus('upToDate');
    }
  }, [latestRelease, currentVersion]);

  const handleSaveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenError(t('settings_discord_token_required'));
      showNotification('error', t('error'), t('settings_discord_token_required'));
      return;
    }
    if (autoCheckTokenOnSave) {
      handleValidateAndSave(trimmed);
      return;
    }
    setDiscordUserToken(trimmed);
    if (tokenLabelInput.trim()) {
      setDiscordTokenLabel(trimmed, tokenLabelInput);
    }
    setTokenError('');
    setTokenStatus('idle');
    showNotification('success', t('success'), t('settings_discord_token_saved'));
  };

  const handleValidateAndSave = async (token: string) => {
    try {
      setTokenStatus('checking');
      setTokenError('');
      const profile = await fetchTokenProfile(token);
      setTokenProfile(profile);
      setTokenStatus('ok');
      setDiscordUserToken(token);
      setDiscordTokenProfile(token, profile);
      if (tokenLabelInput.trim()) {
        setDiscordTokenLabel(token, tokenLabelInput);
      }
      showNotification('success', t('success'), t('settings_discord_token_saved'));
    } catch (error) {
      setTokenStatus('error');
      setTokenError(t('settings_discord_token_invalid'));
      showNotification('error', t('error'), t('settings_discord_token_check_failed'));
    }
  };

  const handleSaveTokenLabel = () => {
    const selectedToken = (discordUserToken || tokenInput).trim();
    if (!selectedToken) {
      showNotification('error', t('error'), t('settings_discord_token_required'));
      return;
    }
    if (!discordUserTokens.includes(selectedToken)) {
      showNotification('error', t('error'), t('settings_discord_token_not_found'));
      return;
    }
    setDiscordTokenLabel(selectedToken, tokenLabelInput);
    showNotification('success', t('success'), t('settings_discord_label_saved'));
  };

  const handleRemoveToken = () => {
    const candidate = (discordUserToken || tokenInput).trim();
    if (!candidate) {
      showNotification('error', t('error'), t('settings_discord_token_required'));
      return;
    }
    if (!discordUserTokens.includes(candidate)) {
      showNotification('error', t('error'), t('settings_discord_token_not_found'));
      return;
    }
    if (!confirmRemove) {
      setConfirmRemove(true);
      return;
    }
    removeDiscordUserToken(candidate);
    setTokenInput('');
    setTokenProfile(null);
    setTokenStatus('idle');
    setTokenError('');
    setConfirmRemove(false);
    showNotification('success', t('success'), t('settings_discord_token_removed'));
  };

  const handleClearAllTokens = () => {
    if (!confirmClearAll) {
      setConfirmClearAll(true);
      return;
    }
    clearDiscordUserToken();
    setTokenInput('');
    setTokenProfile(null);
    setTokenStatus('idle');
    setTokenError('');
    setTokenLabelInput('');
    setConfirmClearAll(false);
    showNotification('success', t('success'), t('settings_discord_tokens_cleared'));
  };

  const fetchTokenProfile = async (token: string) => {
    const raw = await getTokenInfo(token);
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
    return { username: displayName, avatarUrl };
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
      const profile = await fetchTokenProfile(trimmed);
      setTokenProfile(profile);
      setTokenStatus('ok');
      setDiscordTokenProfile(trimmed, profile);
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
    setAutoCheckTokenOnSave(false);
    setFontScale('md');
    setContrast('default');
    setLanguage('tr');
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, language: 'tr', autoCheckToken: false, fontScale: 'md', contrast: 'default' })
    );
    showNotification('warning', t('notification_reset_settings_title'), t('notification_reset_settings_message'));
  };

  const languageOptions = [
    { value: 'tr', label: t('language_turkish') },
    { value: 'en', label: t('language_english') },
  ];
  const fontScaleOptions = [
    { value: 'sm', label: t('settings_font_size_small') },
    { value: 'md', label: t('settings_font_size_medium') },
    { value: 'lg', label: t('settings_font_size_large') },
  ];
  const contrastOptions = [
    { value: 'soft', label: t('settings_contrast_soft') },
    { value: 'default', label: t('settings_contrast_default') },
    { value: 'high', label: t('settings_contrast_high') },
  ];
  const selectedToken = (discordUserToken || tokenInput).trim();
  const selectedTokenProfile = selectedToken ? (tokenProfile || discordTokenProfiles[selectedToken]) : null;
  const tokenOptionLabel = (token: string) => {
    const label = discordTokenLabels[token];
    return label ? `${label} · ${maskToken(token)}` : maskToken(token);
  };

  const handleExportTokens = () => {
    if (discordUserTokens.length === 0) {
      showNotification('error', t('error'), t('settings_discord_token_not_found'));
      return;
    }
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      tokens: discordUserTokens.map(token => ({
        token,
        label: discordTokenLabels[token] || '',
        profile: discordTokenProfiles[token] || null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'confutils-discord-tokens.json';
    anchor.click();
    URL.revokeObjectURL(url);
    showNotification('success', t('success'), t('settings_discord_token_exported'));
  };

  const handleImportTokens = async (file: File) => {
    const content = await file.text();
    const parsed = JSON.parse(content);
    const tokens: string[] = [];
    const labels: Record<string, string> = {};
    const profiles: Record<string, { username: string; avatarUrl: string }> = {};
    if (Array.isArray(parsed.tokens)) {
      parsed.tokens.forEach((item: any) => {
        if (typeof item === 'string') {
          tokens.push(item);
        } else if (item && typeof item.token === 'string') {
          tokens.push(item.token);
          if (typeof item.label === 'string' && item.label.trim()) {
            labels[item.token] = item.label.trim();
          }
          if (item.profile && typeof item.profile.username === 'string') {
            profiles[item.token] = {
              username: item.profile.username,
              avatarUrl: item.profile.avatarUrl || '',
            };
          }
        }
      });
    }
    if (tokens.length === 0) {
      showNotification('error', t('error'), t('settings_discord_token_import_failed'));
      return;
    }
    importDiscordTokens(tokens, labels, profiles);
    showNotification('success', t('success'), t('settings_discord_token_imported'));
  };
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
            icon={Type}
            title={t('settings_font_size_title')}
            description={t('settings_font_size_description')}
            actionType="custom"
          >
            <CustomSelect
              options={fontScaleOptions}
              value={fontScale}
              onChange={(value) => {
                setFontScale(value as 'sm' | 'md' | 'lg');
                saveSettings({ fontScale: value as 'sm' | 'md' | 'lg' });
              }}
            />
          </UtilityCard>

          <UtilityCard
            icon={SlidersHorizontal}
            title={t('settings_contrast_title')}
            description={t('settings_contrast_description')}
            actionType="custom"
          >
            <CustomSelect
              options={contrastOptions}
              value={contrast}
              onChange={(value) => {
                setContrast(value as 'soft' | 'default' | 'high');
                saveSettings({ contrast: value as 'soft' | 'default' | 'high' });
              }}
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
          {latestRelease && (
            <div className="settings-update-panel">
              <div className="settings-update-header">
                <div className="settings-update-title">{t('settings_update_status_title')}</div>
                <div className={`settings-update-badge ${updateStatus}`}>
                  {updateStatus === 'available' && t('settings_update_available')}
                  {updateStatus === 'upToDate' && t('settings_update_up_to_date')}
                  {updateStatus === 'checking' && t('settings_update_checking')}
                  {updateStatus === 'error' && t('settings_update_failed')}
                </div>
              </div>
              <div className="settings-update-meta">
                <span>{t('settings_update_current_version')}: {currentVersion || '2.0.0'}</span>
                <span>{t('settings_update_latest_version')}: {latestRelease.version}</span>
              </div>
              {updateError && (
                <div className="settings-update-error">{updateError}</div>
              )}
              {latestRelease.body && (
                <div className="settings-changelog">
                  <div className="settings-changelog-title">{t('settings_update_changelog')}</div>
                  <div className="settings-changelog-body">{latestRelease.body}</div>
                </div>
              )}
              <div className="settings-update-actions">
                <button
                  className="settings-btn secondary"
                  onClick={() => open(latestRelease.htmlUrl)}
                  type="button"
                >
                  {t('settings_update_open_release')}
                </button>
                {latestRelease.downloadUrl && (
                  <button
                    className="settings-btn"
                    onClick={() => {
                      if (latestRelease.downloadUrl) {
                        open(latestRelease.downloadUrl);
                      }
                    }}
                    type="button"
                  >
                    {t('settings_update_download')}
                  </button>
                )}
              </div>
            </div>
          )}

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
          <div className="settings-card" id="discord-token-settings">
            <div className="settings-card-header">
              <div className="settings-card-title">{t('settings_discord_token_title')}</div>
              <div className="settings-card-description">{t('settings_discord_token_description')}</div>
            </div>
            <div className="settings-card-body">
              <label className="settings-label">{t('settings_discord_token_label')}</label>
              <input
                type="password"
                className="settings-input"
                ref={tokenInputRef}
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  setTokenProfile(null);
                  setTokenStatus('idle');
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
                        {tokenOptionLabel(token)}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <label className="settings-label">{t('settings_discord_token_label_name')}</label>
              <input
                type="text"
                className="settings-input"
                value={tokenLabelInput}
                onChange={(e) => setTokenLabelInput(e.target.value)}
                placeholder={t('settings_discord_token_label_placeholder')}
              />
              <div className="settings-toggle-row">
                <label className="settings-toggle-label">
                  <input
                    type="checkbox"
                    checked={autoCheckTokenOnSave}
                    onChange={(e) => {
                      setAutoCheckTokenOnSave(e.target.checked);
                      saveSettings({ autoCheckToken: e.target.checked });
                    }}
                  />
                  <span>{t('settings_discord_token_auto_check')}</span>
                </label>
              </div>
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
                <button
                  className="settings-btn secondary"
                  onClick={handleRemoveToken}
                  disabled={discordUserTokens.length === 0}
                >
                  {confirmRemove ? t('settings_discord_token_remove_confirm') : t('settings_discord_token_remove')}
                </button>
                <button
                  className="settings-btn secondary"
                  onClick={handleSaveTokenLabel}
                  disabled={discordUserTokens.length === 0}
                >
                  {t('settings_discord_label_save')}
                </button>
              </div>
              <div className="settings-token-actions secondary compact">
                <button
                  className="settings-btn secondary"
                  onClick={handleExportTokens}
                  disabled={discordUserTokens.length === 0}
                >
                  <Save size={14} />
                  {t('settings_discord_token_export')}
                </button>
                <button
                  className="settings-btn secondary"
                  onClick={() => importInputRef.current?.click()}
                >
                  <Upload size={14} />
                  {t('settings_discord_token_import')}
                </button>
                <button
                  className="settings-btn secondary"
                  onClick={handleClearAllTokens}
                  disabled={discordUserTokens.length === 0}
                >
                  {confirmClearAll ? t('settings_discord_tokens_clear_confirm') : t('settings_discord_tokens_clear')}
                </button>
                <input
                  type="file"
                  accept="application/json"
                  ref={importInputRef}
                  className="settings-hidden-input"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await handleImportTokens(file);
                    } catch (error) {
                      showNotification('error', t('error'), t('settings_discord_token_import_failed'));
                    } finally {
                      if (importInputRef.current) {
                        importInputRef.current.value = '';
                      }
                    }
                  }}
                />
              </div>
              <div className="settings-token-hint">{t('settings_discord_token_rate_limit_hint')}</div>
              <div className="settings-token-hint">{t('settings_discord_token_export_warning')}</div>
              {selectedTokenProfile && (
                <div className="settings-token-profile">
                  <img src={selectedTokenProfile.avatarUrl} alt={t('settings_discord_token_avatar_alt')} />
                  <div>
                    <div className="settings-token-name">{selectedTokenProfile.username}</div>
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
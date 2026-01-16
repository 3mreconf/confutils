import React, { useState, useEffect } from 'react';
import { Download, Upload, Database, Settings, AlertTriangle, Shield } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import { maskToken } from '../../utils/discordToken';
import { navigateToSettingsSection } from '../../utils/navigation';
import { TokenNotice } from './common';
import {
  FormInput,
  FormCheckbox,
  ActionButton,
  LogViewer,
  ModalHeader,
  SectionCard,
  InfoBox,
  FormGrid
} from './common';
import { validateToken, validateSnowflake } from './utils';
import './DiscordModal.css';

interface ServerBackupModalProps {
  modalId: string;
}

interface BackupOptions {
  includeChannels: boolean;
  includeRoles: boolean;
  includeEmojis: boolean;
  includeSettings: boolean;
  includePermissions: boolean;
}

export const ServerBackupModal: React.FC<ServerBackupModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [guildId, setGuildId] = useState('');
  const [mode, setMode] = useState<'backup' | 'restore'>('backup');
  const [backupPath, setBackupPath] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [options, setOptions] = useState<BackupOptions>({
    includeChannels: true,
    includeRoles: true,
    includeEmojis: true,
    includeSettings: true,
    includePermissions: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (discordUserToken) {
      setUserToken(discordUserToken);
    }
  }, [discordUserToken]);

  const handleTokenRedirect = () => {
    if (!discordUserToken) {
      closeModal(modalId);
      navigateToSettingsSection('discord-token-settings');
    }
  };

  useEffect(() => {
    const unlisten = listen<string>('server-backup-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateToken(userToken)) {
      newErrors.userToken = t('discord_invalid_token');
    }

    if (!validateSnowflake(guildId)) {
      newErrors.guildId = t('discord_invalid_id');
    }

    if (mode === 'restore' && !backupPath.trim()) {
      newErrors.backupPath = t('discord_backup_path_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBackup = async () => {
    if (!validateForm()) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('backup_guild', {
        userToken,
        guildId,
        options: JSON.stringify(options)
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!validateForm()) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsProcessing(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('restore_guild', {
        userToken,
        guildId,
        backupPath,
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="discord-modal-container">
      <ModalHeader
        icon={mode === 'backup' ? Download : Upload}
        title={t('discord_server_backup_title')}
        description={t('discord_server_backup_description')}
      />

      <TokenNotice
        hasToken={Boolean(discordUserToken)}
        tokenLabel={discordUserToken ? discordTokenLabels[discordUserToken] : undefined}
        tokenMask={discordUserToken ? maskToken(discordUserToken) : undefined}
        tokenProfile={discordUserToken ? discordTokenProfiles[discordUserToken] : undefined}
        onOpenSettings={handleTokenRedirect}
      />

      <InfoBox type="warning" icon={AlertTriangle} title={t('discord_backup_warning_title')}>
        <ul>
          <li>{t('discord_backup_warning_1')}</li>
          <li>{t('discord_backup_warning_2')}</li>
          <li>{t('discord_backup_warning_3')}</li>
        </ul>
      </InfoBox>

      <SectionCard title={t('discord_backup_mode')} icon={Settings}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <ActionButton
            label={t('discord_backup')}
            icon={Download}
            onClick={() => setMode('backup')}
            disabled={isProcessing}
            variant={mode === 'backup' ? 'primary' : undefined}
            fullWidth
          />
          <ActionButton
            label={t('discord_restore')}
            icon={Upload}
            onClick={() => setMode('restore')}
            disabled={isProcessing}
            variant={mode === 'restore' ? 'warning' : undefined}
            fullWidth
          />
        </div>
      </SectionCard>

      <SectionCard title={t('discord_authentication')} icon={Database} badge="Required">
        <FormGrid columns={1}>
          {discordUserTokens.length > 1 && (
            <div className="form-group">
              <label>{t('discord_saved_tokens_label')}</label>
              <select
                className="input-field"
                value={discordUserToken || ''}
                onChange={(e) => {
                  const selected = e.target.value;
                  if (!selected) return;
                  setUserToken(selected);
                  setActiveDiscordUserToken(selected);
                }}
              >
                {discordUserTokens.map(token => (
                  <option key={token} value={token}>
                  {discordTokenLabels[token] ? `${discordTokenLabels[token]} · ${maskToken(token)}` : maskToken(token)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <FormInput
            label={t('discord_user_token')}
            value={userToken}
            onChange={(value) => {
              setUserToken(value);
              if (errors.userToken) setErrors({ ...errors, userToken: '' });
            }}
            type="password"
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
            disabled={isProcessing}
            readOnly
            required
            error={errors.userToken}
            warning
            hint={t('discord_token_warning')}
            onClick={handleTokenRedirect}
            onFocus={handleTokenRedirect}
          />

          <FormInput
            label={t('discord_guild_id')}
            value={guildId}
            onChange={(value) => {
              setGuildId(value);
              if (errors.guildId) setErrors({ ...errors, guildId: '' });
            }}
            type="text"
            placeholder="123456789012345678"
            disabled={isProcessing}
            required
            error={errors.guildId}
          />

          {mode === 'restore' && (
            <FormInput
              label={t('discord_backup_file_path')}
              value={backupPath}
              onChange={(value) => {
                setBackupPath(value);
                if (errors.backupPath) setErrors({ ...errors, backupPath: '' });
              }}
              type="text"
              placeholder="C:/backups/server_backup.json"
              disabled={isProcessing}
              required
              error={errors.backupPath}
              hint={t('discord_backup_file_hint')}
            />
          )}
        </FormGrid>
      </SectionCard>

      {mode === 'backup' && (
        <SectionCard title={t('discord_backup_options')} icon={Shield}>
          <div className="options-grid">
            <FormCheckbox
              label={t('discord_option_channels')}
              checked={options.includeChannels}
              onChange={(checked) => setOptions({ ...options, includeChannels: checked })}
              disabled={isProcessing}
              description={t('discord_option_channels_desc')}
            />

            <FormCheckbox
              label={t('discord_option_roles')}
              checked={options.includeRoles}
              onChange={(checked) => setOptions({ ...options, includeRoles: checked })}
              disabled={isProcessing}
              description={t('discord_option_roles_desc')}
            />

            <FormCheckbox
              label={t('discord_option_emojis')}
              checked={options.includeEmojis}
              onChange={(checked) => setOptions({ ...options, includeEmojis: checked })}
              disabled={isProcessing}
              description={t('discord_option_emojis_desc')}
            />

            <FormCheckbox
              label={t('discord_option_settings')}
              checked={options.includeSettings}
              onChange={(checked) => setOptions({ ...options, includeSettings: checked })}
              disabled={isProcessing}
              description={t('discord_option_settings_desc')}
            />

            <FormCheckbox
              label={t('discord_option_permissions')}
              checked={options.includePermissions}
              onChange={(checked) => setOptions({ ...options, includePermissions: checked })}
              disabled={isProcessing}
              description={t('discord_option_permissions_desc')}
            />
          </div>
        </SectionCard>
      )}

      <ActionButton
        label={isProcessing ?
          (mode === 'backup' ? t('discord_backing_up') : t('discord_restoring')) :
          (mode === 'backup' ? t('discord_start_backup') : t('discord_start_restore'))
        }
        onClick={mode === 'backup' ? handleBackup : handleRestore}
        icon={mode === 'backup' ? Download : Upload}
        disabled={isProcessing}
        loading={isProcessing}
        variant={mode === 'backup' ? 'success' : 'warning'}
        fullWidth
      />

      {logs.length > 0 && (
        <LogViewer
          logs={logs}
          onClear={() => setLogs([])}
          title={t('discord_logs_title')}
        />
      )}
    </div>
  );
};

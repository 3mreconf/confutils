import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import { maskToken } from '../../utils/discordToken';
import { navigateToSettingsSection } from '../../utils/navigation';
import { TokenNotice } from './common';
import './MessageClonerModal.css';

interface RoleClonerModalProps {
  modalId: string;
}

export const RoleClonerModal: React.FC<RoleClonerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [guildId, setGuildId] = useState('');
  const [sourceRoleId, setSourceRoleId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [isCloning, setIsCloning] = useState(false);

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

  const handleCloneRole = async () => {
    if (!userToken || !guildId || !sourceRoleId || !newRoleName) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsCloning(true);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('clone_role', {
        userToken,
        guildId,
        sourceRoleId,
        newRoleName
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <div className="discord-modal-container">
      <div className="form-section">
        <TokenNotice
          hasToken={Boolean(discordUserToken)}
          tokenLabel={discordUserToken ? discordTokenLabels[discordUserToken] : undefined}
          tokenMask={discordUserToken ? maskToken(discordUserToken) : undefined}
          tokenProfile={discordUserToken ? discordTokenProfiles[discordUserToken] : undefined}
          onOpenSettings={handleTokenRedirect}
        />

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

        <div className="form-group">
          <label>{t('discord_user_token')}</label>
          <input
            type="password"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
            className="input-field"
            readOnly
            onClick={handleTokenRedirect}
            onFocus={handleTokenRedirect}
          />
        </div>

        <div className="form-group">
          <label>{t('discord_guild_id')}</label>
          <input
            type="text"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder="123456789012345678"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>{t('discord_source_role_id')}</label>
          <input
            type="text"
            value={sourceRoleId}
            onChange={(e) => setSourceRoleId(e.target.value)}
            placeholder="123456789012345678"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>{t('discord_new_role_name')}</label>
          <input
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            placeholder={t('discord_role_name_placeholder')}
            className="input-field"
            maxLength={100}
          />
        </div>

        <button
          onClick={handleCloneRole}
          disabled={isCloning}
          className={`action-button ${isCloning ? 'disabled' : ''}`}
        >
          <Shield size={16} />
          {isCloning ? t('discord_cloning') : t('discord_clone_role')}
        </button>
      </div>
    </div>
  );
};

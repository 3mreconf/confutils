import React, { useState, useEffect } from 'react';
import { Image } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { grabDiscordAvatar } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import { navigateToSettingsSection } from '../../utils/navigation';
import { TokenNotice } from './common';
import './MessageClonerModal.css';

interface AvatarGrabberModalProps {
  modalId: string;
}

export const AvatarGrabberModal: React.FC<AvatarGrabberModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [userId, setUserId] = useState('');
  const [size, setSize] = useState(512);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

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

  const handleGrabAvatar = async () => {
    if (!userToken) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsGrabbing(true);
    setAvatarUrl('');
    updateModalStatus(modalId, 'running');

    try {
      const result = await grabDiscordAvatar(
        userToken,
        userId.trim() || '@me',
        size
      );

      setAvatarUrl(result);
      showNotification('success', t('success'), t('discord_avatar_grabbed'));
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsGrabbing(false);
    }
  };

  const handleCopyUrl = () => {
    if (avatarUrl) {
      navigator.clipboard.writeText(avatarUrl);
      showNotification('success', t('success'), t('discord_url_copied'));
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
          <label>{t('discord_user_id')} ({t('optional') || 'Opsiyonel'})</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="@me veya 123456789012345678 (boş bırakırsanız kendi avatarınızı indirir)"
            className="input-field"
          />
          <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
            Boş bırakırsanız token'ınızın sahibi olan kullanıcının avatarını indirir
          </small>
        </div>

        <div className="form-group">
          <label>{t('discord_avatar_size')}</label>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="input-field"
          >
            <option value={128}>128x128</option>
            <option value={256}>256x256</option>
            <option value={512}>512x512</option>
            <option value={1024}>1024x1024</option>
            <option value={2048}>2048x2048</option>
          </select>
        </div>

        <button
          onClick={handleGrabAvatar}
          disabled={isGrabbing}
          className={`action-button ${isGrabbing ? 'disabled' : ''}`}
        >
          <Image size={16} />
          {isGrabbing ? t('discord_grabbing') : t('discord_grab_avatar')}
        </button>

        {avatarUrl && (
          <div className="avatar-display">
            <img src={avatarUrl} alt="User Avatar" className="avatar-image" />
            <div className="avatar-url">
              <input
                type="text"
                value={avatarUrl}
                readOnly
                className="input-field"
              />
              <button onClick={handleCopyUrl} className="copy-button">
                {t('discord_copy_url')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

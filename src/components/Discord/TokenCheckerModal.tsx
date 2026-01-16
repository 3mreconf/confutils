import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { checkDiscordToken } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import { navigateToSettingsSection } from '../../utils/navigation';
import { TokenNotice } from './common';
import './MessageClonerModal.css';

interface TokenCheckerModalProps {
  modalId: string;
}

export const TokenCheckerModal: React.FC<TokenCheckerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [isValid, setIsValid] = useState<boolean | null>(null);

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

  const handleCheckToken = async () => {
    if (!userToken) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsChecking(true);
    setIsValid(null);
    updateModalStatus(modalId, 'running');

    try {
      const result = await checkDiscordToken(userToken);

      const isValid = !result.includes('geçersiz') && !result.includes('süresi dolmuş');
      setIsValid(isValid);

      showNotification('success', t('success'), result);

      updateModalStatus(modalId, isValid ? 'success' : 'error');
    } catch (error) {
      setIsValid(false);
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('Backend') || errorMsg.includes('timeout') || errorMsg.includes('bağlanılamıyor')) {
        showNotification('error', t('error'), errorMsg);
      } else {
        showNotification('error', t('error'), t('discord_token_check_error') || `Token kontrolü başarısız: ${errorMsg}`);
      }
      updateModalStatus(modalId, 'error');
    } finally {
      setIsChecking(false);
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

        <button
          onClick={handleCheckToken}
          disabled={isChecking}
          className={`action-button ${isChecking ? 'disabled' : ''}`}
        >
          {isValid === null ? (
            <CheckCircle size={16} />
          ) : isValid ? (
            <CheckCircle size={16} color="#4ade80" />
          ) : (
            <XCircle size={16} color="#ef4444" />
          )}
          {isChecking ? t('discord_checking') : t('discord_check_token')}
        </button>

        {isValid !== null && (
          <div className={`status-message ${isValid ? 'success' : 'error'}`}>
            {isValid ? (
              <span>✓ {t('discord_token_valid')}</span>
            ) : (
              <span>✗ {t('discord_token_invalid')}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
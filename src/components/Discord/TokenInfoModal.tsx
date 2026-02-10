import React, { useState, useEffect } from 'react';
import { Info, CheckCircle, XCircle, Shield, Mail, User, Crown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { getDiscordTokenInfo } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import { FormInput, ActionButton } from './common';
import { validateToken } from './utils';
import './MessageClonerModal.css';

interface TokenInfo {
  id?: string;
  user_id?: string;
  username: string;
  discriminator?: string;
  email?: string;
  verified?: boolean;
  mfa_enabled?: boolean;
  premium_type?: number;
  premium?: string;
  avatar?: string;
  bot?: boolean;
}

interface TokenInfoModalProps {
  modalId: string;
}

export const TokenInfoModal: React.FC<TokenInfoModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();
  const { discordUserToken, discordUserTokens, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (discordUserToken) {
      setUserToken(discordUserToken);
    }
  }, [discordUserToken]);

  const handleGetInfo = async () => {
    if (!validateToken(userToken)) {
      setError(t('discord_invalid_token'));
      showNotification('error', t('error'), t('discord_invalid_token'));
      return;
    }

    setIsLoading(true);
    setTokenInfo(null);
    setError('');
    updateModalStatus(modalId, 'running');

    try {
      const rawInfo = await getDiscordTokenInfo(userToken);

      try {
        const parsedInfo = typeof rawInfo === 'string' ? JSON.parse(rawInfo) : rawInfo;

        if (!parsedInfo || typeof parsedInfo !== 'object') {
          throw new Error('Token bilgisi eksik veya geçersiz');
        }

        const userId = parsedInfo.id || parsedInfo.user_id;
        const username = parsedInfo.username;
        
        if (!username || !userId) {
          throw new Error('Token bilgisi eksik veya geçersiz: Kullanıcı adı veya ID bulunamadı');
        }

        const info: TokenInfo = {
          id: userId,
          user_id: userId,
          username: parsedInfo.discriminator && parsedInfo.discriminator !== '0' 
            ? `${username}#${parsedInfo.discriminator}` 
            : username,
          discriminator: parsedInfo.discriminator,
          email: parsedInfo.email || 'N/A',
          verified: parsedInfo.verified || false,
          mfa_enabled: parsedInfo.mfa_enabled || false,
          premium_type: parsedInfo.premium_type || 0,
          premium: parsedInfo.premium_type === 1 ? 'Nitro Classic' 
            : parsedInfo.premium_type === 2 ? 'Nitro' 
            : parsedInfo.premium_type === 3 ? 'Nitro Basic'
            : 'None',
          avatar: parsedInfo.avatar,
          bot: parsedInfo.bot || false
        };

        setTokenInfo(info);
        showNotification('success', t('success'), t('discord_token_info_loaded'));
        updateModalStatus(modalId, 'success');
      } catch (parseError) {
        const parseErrorMsg = parseError instanceof Error ? parseError.message : 'Yanıt parse edilemedi';
        setError(parseErrorMsg);
        showNotification('error', t('error'), parseErrorMsg);
        updateModalStatus(modalId, 'error');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setError(errorMsg);
      if (errorMsg.includes('Backend') || errorMsg.includes('timeout') || errorMsg.includes('bağlanılamıyor')) {
        showNotification('error', t('error'), errorMsg);
      } else {
        showNotification('error', t('error'), t('discord_token_info_error') || `Token bilgisi alınamadı: ${errorMsg}`);
      }
      updateModalStatus(modalId, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="discord-modal-container">
      <div className="form-section">
        {discordUserToken && (
          <div className="info-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', fontSize: '0.875rem' }}>
            ✓ {t('discord_saved_token_in_use')}
          </div>
        )}

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
                  {maskToken(token)}
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
            if (error) setError('');
          }}
          type="password"
          placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
          disabled={isLoading}
          readOnly
          required
          error={error}
          warning
          hint={t('discord_token_warning')}
        />

        <ActionButton
          label={isLoading ? t('discord_loading') : t('discord_get_token_info')}
          onClick={handleGetInfo}
          icon={Info}
          disabled={isLoading}
          loading={isLoading}
          variant="primary"
          fullWidth
        />

        {tokenInfo && (
          <div className="token-info-display">
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
              {t('discord_account_info')}
            </h3>

            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={16} style={{ color: 'var(--accent-cyan)' }} />
                <strong>{t('discord_username')}:</strong>
              </div>
              <span>{tokenInfo.username}</span>
            </div>

            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} style={{ color: 'var(--accent-cyan)' }} />
                <strong>{t('discord_user_id')}:</strong>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{tokenInfo.user_id}</span>
            </div>

            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Mail size={16} style={{ color: 'var(--accent-cyan)' }} />
                <strong>{t('discord_email')}:</strong>
              </div>
              <span>{tokenInfo.email}</span>
            </div>

            <div className="info-row">
              <strong>{t('discord_verified')}:</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tokenInfo.verified ? 'var(--status-success)' : 'var(--status-error)' }}>
                {tokenInfo.verified ? (
                  <>
                    <CheckCircle size={16} />
                    {t('yes')}
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    {t('no')}
                  </>
                )}
              </span>
            </div>

            <div className="info-row">
              <strong>{t('discord_mfa_enabled')}:</strong>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: tokenInfo.mfa_enabled ? 'var(--status-success)' : 'var(--status-warning)' }}>
                {tokenInfo.mfa_enabled ? (
                  <>
                    <CheckCircle size={16} />
                    {t('yes')}
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    {t('no')}
                  </>
                )}
              </span>
            </div>

            <div className="info-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Crown size={16} style={{ color: tokenInfo.premium !== 'None' ? '#fbbf24' : 'var(--text-secondary)' }} />
                <strong>{t('discord_nitro')}:</strong>
              </div>
              <span style={{ 
                color: tokenInfo.premium !== 'None' ? '#fbbf24' : 'var(--text-secondary)',
                fontWeight: tokenInfo.premium !== 'None' ? 600 : 400 
              }}>
                {tokenInfo.premium}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
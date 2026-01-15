import React, { useState, useEffect } from 'react';
import { Smile } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { spamReactions } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import { FormInput, ActionButton } from './common';
import { validateToken, validateSnowflake } from './utils';
import './MessageClonerModal.css';

interface ReactionSpammerModalProps {
  modalId: string;
}

export const ReactionSpammerModal: React.FC<ReactionSpammerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();
  const { discordUserToken, discordUserTokens, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [messageId, setMessageId] = useState('');
  const [emojis, setEmojis] = useState('👍,❤️,😂');
  const [delayMs, setDelayMs] = useState(500);
  const [isSpamming, setIsSpamming] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (discordUserToken) {
      setUserToken(discordUserToken);
    }
  }, [discordUserToken]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateToken(userToken)) {
      newErrors.userToken = t('discord_invalid_token');
    }

    if (!validateSnowflake(channelId)) {
      newErrors.channelId = t('discord_invalid_id');
    }

    if (!validateSnowflake(messageId)) {
      newErrors.messageId = t('discord_invalid_id');
    }

    if (!emojis.trim()) {
      newErrors.emojis = t('discord_emojis_required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSpamReactions = async () => {
    if (!validateForm()) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsSpamming(true);
    updateModalStatus(modalId, 'running');

    const emojiList = emojis.split(',').map(e => e.trim()).filter(e => e);

    try {
      const result = await spamReactions(
        userToken,
        channelId,
        messageId,
        emojiList,
        Number(delayMs)
      );

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsSpamming(false);
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
            if (errors.userToken) {
              setErrors({ ...errors, userToken: '' });
            }
          }}
          type="password"
          placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
          disabled={isSpamming}
          readOnly
          required
          error={errors.userToken}
          warning={true}
          hint={t('discord_token_warning')}
        />

        <FormInput
          label={t('discord_channel_id')}
          value={channelId}
          onChange={(value) => {
            setChannelId(value);
            if (errors.channelId) {
              setErrors({ ...errors, channelId: '' });
            }
          }}
          type="text"
          placeholder="123456789012345678"
          disabled={isSpamming}
          required
          error={errors.channelId}
        />

        <FormInput
          label={t('discord_message_id')}
          value={messageId}
          onChange={(value) => {
            setMessageId(value);
            if (errors.messageId) {
              setErrors({ ...errors, messageId: '' });
            }
          }}
          type="text"
          placeholder="123456789012345678"
          disabled={isSpamming}
          required
          error={errors.messageId}
        />

        <FormInput
          label={t('discord_emojis')}
          value={emojis}
          onChange={(value) => {
            setEmojis(value);
            if (errors.emojis) {
              setErrors({ ...errors, emojis: '' });
            }
          }}
          type="text"
          placeholder="👍,❤️,😂,🔥"
          disabled={isSpamming}
          required
          hint={t('discord_emojis_hint')}
          error={errors.emojis}
        />

        <FormInput
          label={t('discord_delay_ms')}
          value={delayMs}
          onChange={(value) => setDelayMs(Number(value))}
          type="number"
          min={0}
          max={5000}
          disabled={isSpamming}
          hint={t('discord_delay_hint')}
        />

        <ActionButton
          label={isSpamming ? t('discord_spamming') : t('discord_start_spam')}
          onClick={handleSpamReactions}
          icon={Smile}
          disabled={isSpamming}
          loading={isSpamming}
          variant="primary"
          fullWidth
        />
      </div>
    </div>
  );
};
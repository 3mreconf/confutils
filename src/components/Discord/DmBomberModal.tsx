import React, { useState, useEffect, useRef } from 'react';
import { Mail } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import { maskToken } from '../../utils/discordToken';
import { navigateToSettingsSection } from '../../utils/navigation';
import { TokenNotice } from './common';
import './MessageClonerModal.css';

interface DmBomberModalProps {
  modalId: string;
}

export const DmBomberModal: React.FC<DmBomberModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [userIds, setUserIds] = useState('');
  const [message, setMessage] = useState('');
  const [count, setCount] = useState(5);
  const [delayMs, setDelayMs] = useState(1000);
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

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

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    const unlisten = listen<string>('dm-bomber-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleDmBomber = async () => {
    if (!userToken || !userIds || !message) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsSending(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    const userIdList = userIds.split(',').map(id => id.trim()).filter(id => id);

    try {
      const result = await invoke<string>('dm_bomber', {
        userToken,
        userIds: userIdList,
        message,
        count,
        delayMs: Number(delayMs)
      });

      const sentCountMatch = result.match(/(\d+)\s+DM messages/);
      const sentCount = sentCountMatch?.[1] || '0';
      
      if (sentCount === '0' || result.includes('0 messages')) {
        showNotification('error', t('error'), 'Hiçbir mesaj gönderilemedi. Kullanıcı ID\'lerini ve token\'ı kontrol edin. Bot token kullanmanız gerekebilir.');
        updateModalStatus(modalId, 'error');
      } else {
        showNotification('success', t('success'), result);
        updateModalStatus(modalId, 'success');
      }
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsSending(false);
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
          <label>{t('discord_target_user_ids')}</label>
          <input
            type="text"
            value={userIds}
            onChange={(e) => setUserIds(e.target.value)}
            placeholder="123456789,987654321"
            className="input-field"
          />
          <small>{t('discord_user_ids_hint')}</small>
        </div>

        <div className="form-group">
          <label>{t('discord_message_content')}</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('discord_message_placeholder')}
            className="input-field"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>{t('discord_message_count')}</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min="1"
            max="50"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>{t('discord_delay_ms')}</label>
          <input
            type="number"
            value={delayMs}
            onChange={(e) => setDelayMs(Number(e.target.value))}
            min="500"
            max="5000"
            className="input-field"
          />
        </div>

        <button
          onClick={handleDmBomber}
          disabled={isSending}
          className={`action-button ${isSending ? 'disabled' : ''}`}
        >
          <Mail size={16} />
          {isSending ? t('discord_sending') : t('discord_start_dm_bomber')}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="logs-section">
          <h4>{t('discord_logs')}</h4>
          <div className="logs-container">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">{log}</div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
};
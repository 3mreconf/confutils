import React, { useState, useEffect, useRef } from 'react';
import { Eraser } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import { maskToken } from '../../utils/discordToken';
import './MessageClonerModal.css';

interface ChannelPurgeModalProps {
  modalId: string;
}

export const ChannelPurgeModal: React.FC<ChannelPurgeModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();
  const { discordUserToken, discordUserTokens, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [messageCount, setMessageCount] = useState(100);
  const [isPurging, setIsPurging] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (discordUserToken) {
      setUserToken(discordUserToken);
    }
  }, [discordUserToken]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  useEffect(() => {
    const unlisten = listen<string>('purge-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handlePurge = async () => {
    if (!userToken || !channelId) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsPurging(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('purge_channel', {
        userToken,
        channelId,
        messageCount
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsPurging(false);
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

        <div className="form-group">
          <label>{t('discord_user_token')}</label>
          <input
            type="password"
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
            className="input-field"
            readOnly
          />
        </div>

        <div className="form-group">
          <label>{t('discord_channel_id')}</label>
          <input
            type="text"
            value={channelId}
            onChange={(e) => setChannelId(e.target.value)}
            placeholder="123456789012345678"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>{t('discord_message_count')}</label>
          <input
            type="number"
            value={messageCount}
            onChange={(e) => setMessageCount(Number(e.target.value))}
            min="2"
            max="100"
            className="input-field"
          />
          <small>{t('discord_purge_warning')}</small>
        </div>

        <button
          onClick={handlePurge}
          disabled={isPurging}
          className={`action-button ${isPurging ? 'disabled' : ''}`}
        >
          <Eraser size={16} />
          {isPurging ? t('discord_purging') : t('discord_start_purge')}
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

import React, { useState, useEffect } from 'react';
import { Webhook, StopCircle } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { invoke } from '@tauri-apps/api/core';
import { LogViewer } from './common';
import './MessageClonerModal.css';

interface WebhookSpammerModalProps {
  modalId: string;
}

export const WebhookSpammerModal: React.FC<WebhookSpammerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('ConfUtils Bot');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [count, setCount] = useState(10);
  const [delayMs, setDelayMs] = useState(1000);
  const [isSpamming, setIsSpamming] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const unlisten = listen<string>('webhook-spam-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleSpamWebhook = async () => {
    if (!webhookUrl || !message) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsSpamming(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('spam_webhook', {
        webhookUrl,
        message,
        username,
        avatarUrl,
        count,
        delayMs
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsSpamming(false);
    }
  };

  const handleStopWebhook = async () => {
    try {
      await invoke<string>('stop_webhook_spam');
      showNotification('info', t('info'), 'Webhook spam durduruldu');
      updateModalStatus(modalId, 'idle');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  return (
    <div className="discord-modal-container">
      <div className="form-section">
        <div className="form-group">
          <label>{t('discord_webhook_url')}</label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="input-field"
          />
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
          <label>{t('discord_webhook_username')}</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Bot Name"
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>{t('discord_avatar_url')} ({t('discord_optional')})</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label>{t('discord_message_count')}</label>
          <input
            type="number"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            min="1"
            max="100"
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

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleSpamWebhook}
            disabled={isSpamming}
            className={`action-button ${isSpamming ? 'disabled' : ''}`}
          >
            <Webhook size={16} />
            {isSpamming ? t('discord_spamming') : t('discord_start_webhook_spam')}
          </button>

          {isSpamming && (
            <button
              onClick={handleStopWebhook}
              className="action-button"
              style={{ backgroundColor: '#ef4444' }}
            >
              <StopCircle size={16} />
              {t('discord_stop')}
            </button>
          )}
        </div>
      </div>

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

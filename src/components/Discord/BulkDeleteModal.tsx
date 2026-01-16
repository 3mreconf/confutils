import React, { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
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

interface BulkDeleteModalProps {
  modalId: string;
}

export const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [channelId, setChannelId] = useState('');
  const [limit, setLimit] = useState(50);
  const [delayMs, setDelayMs] = useState(1000);
  const [isDeleting, setIsDeleting] = useState(false);
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
    const unlisten = listen<string>('bulk-delete-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const handleBulkDelete = async () => {
    if (!userToken || !channelId) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsDeleting(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('bulk_delete_messages', {
        userToken,
        channelId,
        limit,
        delayMs: BigInt(delayMs)
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsDeleting(false);
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
          <label>{t('discord_message_limit')}</label>
          <input
            type="number"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
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

        <button
          onClick={handleBulkDelete}
          disabled={isDeleting}
          className={`action-button ${isDeleting ? 'disabled' : ''}`}
        >
          <Trash2 size={16} />
          {isDeleting ? t('discord_deleting') : t('discord_start_delete')}
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

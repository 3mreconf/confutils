import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Play, Square, Database, Settings } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { cloneMessages, startLiveMessageCloner, stopLiveMessageCloner, MessageCloneOptions } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
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
import './DiscordModal.css';

interface MessageClonerModalProps {
  modalId: string;
}

export const MessageClonerModal: React.FC<MessageClonerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();
  const { discordUserToken, discordUserTokens, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [sourceChannelId, setSourceChannelId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [messageLimit, setMessageLimit] = useState(50);
  const [delayMs, setDelayMs] = useState(1000);
  const [skipBots, setSkipBots] = useState(true);
  const [onlyWithAttachments, setOnlyWithAttachments] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const [cloneOptions, setCloneOptions] = useState<MessageCloneOptions>({
    messageLimit: 50,
    cloneEmbeds: true,
    cloneAttachments: true,
    delayMs: 1000,
    skipBots: true,
    onlyWithAttachments: false,
  });

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
    const unlisten = listen<string>('message-clone-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleCloneMessages = async () => {
    if (!userToken || !sourceChannelId || !webhookUrl) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsCloning(true);
    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      await cloneMessages(
        userToken,
        sourceChannelId,
        webhookUrl,
        {
          ...cloneOptions,
          messageLimit,
          delayMs,
          skipBots,
          onlyWithAttachments
        }
      );
      showNotification('success', t('success'), t('discord_message_clone_success'));
      updateModalStatus(modalId, 'success');
    } catch (error) {
      addLog(`${t('error')}: ${error}`);
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsCloning(false);
    }
  };

  const handleStartLive = async () => {
    if (!userToken || !sourceChannelId || !webhookUrl) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setLogs([]);
    updateModalStatus(modalId, 'running');

    try {
      await startLiveMessageCloner(userToken, sourceChannelId, webhookUrl);
      setIsLiveMode(true);
      showNotification('success', t('success'), t('discord_live_cloner_started'));
    } catch (error) {
      addLog(`${t('error')}: ${error}`);
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    }
  };

  const handleStopLive = async () => {
    try {
      await stopLiveMessageCloner();
      setIsLiveMode(false);
      updateModalStatus(modalId, 'idle');
      showNotification('success', t('success'), t('discord_live_cloner_stopped'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  return (
    <div className="discord-modal-container">
      <ModalHeader
        icon={MessageSquare}
        title={t('discord_message_cloner_title')}
        description={t('discord_message_cloner_description')}
      />

        {discordUserToken && (
          <div className="info-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', fontSize: '0.875rem' }}>
            ✓ {t('discord_saved_token_in_use')}
          </div>
        )}

      {isLiveMode && (
        <InfoBox type="success">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: 'var(--status-success)',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
            }}></span>
            <strong>{t('discord_live_mode_active')}</strong>
          </div>
        </InfoBox>
      )}

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
                    {maskToken(token)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <FormInput
            label={t('discord_user_token')}
            value={userToken}
            onChange={setUserToken}
            type="password"
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
            disabled={isCloning || isLiveMode}
            readOnly
            required
            warning
            hint={t('discord_token_warning')}
          />

          <FormInput
            label={t('discord_source_channel')}
            value={sourceChannelId}
            onChange={setSourceChannelId}
            type="text"
            placeholder={t('discord_source_channel_placeholder')}
            disabled={isCloning || isLiveMode}
            required
          />

          <FormInput
            label={t('discord_webhook_url')}
            value={webhookUrl}
            onChange={setWebhookUrl}
            type="text"
            placeholder={t('discord_webhook_url_placeholder')}
            disabled={isCloning || isLiveMode}
            required
          />
        </FormGrid>
      </SectionCard>

      <SectionCard title={t('discord_clone_settings')} icon={Settings}>
        <FormGrid columns={2}>
          <FormInput
            label={t('discord_message_limit')}
            value={messageLimit}
            onChange={(val) => {
              const num = parseInt(val) || 50;
              setMessageLimit(Math.min(100, Math.max(1, num)));
              setCloneOptions({ ...cloneOptions, messageLimit: num });
            }}
            type="number"
            min={1}
            max={100}
            placeholder="50"
            disabled={isCloning || isLiveMode}
            hint={t('discord_message_limit_hint')}
          />

          <FormInput
            label={t('discord_delay_ms')}
            value={delayMs}
            onChange={(val) => {
              const num = parseInt(val) || 1000;
              setDelayMs(Math.min(5000, Math.max(500, num)));
            }}
            type="number"
            min={500}
            max={5000}
            placeholder="1000"
            disabled={isCloning || isLiveMode}
            hint={t('discord_delay_hint')}
          />
        </FormGrid>

        <div className="options-grid" style={{ marginTop: '16px' }}>
          <FormCheckbox
            label={t('discord_option_clone_embeds')}
            checked={cloneOptions.cloneEmbeds}
            onChange={(checked) => setCloneOptions({ ...cloneOptions, cloneEmbeds: checked })}
            disabled={isCloning || isLiveMode}
            description={t('discord_option_clone_embeds_desc')}
          />

          <FormCheckbox
            label={t('discord_option_clone_attachments')}
            checked={cloneOptions.cloneAttachments}
            onChange={(checked) => setCloneOptions({ ...cloneOptions, cloneAttachments: checked })}
            disabled={isCloning || isLiveMode}
            description={t('discord_option_clone_attachments_desc')}
          />

          <FormCheckbox
            label={t('discord_option_skip_bots')}
            checked={skipBots}
            onChange={setSkipBots}
            disabled={isCloning || isLiveMode}
            description={t('discord_option_skip_bots_desc')}
          />

          <FormCheckbox
            label={t('discord_option_only_attachments')}
            checked={onlyWithAttachments}
            onChange={setOnlyWithAttachments}
            disabled={isCloning || isLiveMode}
            description={t('discord_option_only_attachments_desc')}
          />
        </div>
      </SectionCard>

      <div style={{ display: 'flex', gap: '12px' }}>
        <ActionButton
          label={isCloning ? t('discord_cloning_messages') : t('discord_clone_messages_button')}
          onClick={handleCloneMessages}
          icon={MessageSquare}
          disabled={isCloning || isLiveMode}
          loading={isCloning}
          variant="primary"
          fullWidth
        />

        {!isLiveMode ? (
          <ActionButton
            label={t('discord_start_live_mode')}
            onClick={handleStartLive}
            icon={Play}
            disabled={isCloning}
            variant="success"
            fullWidth
          />
        ) : (
          <ActionButton
            label={t('discord_stop_live_mode')}
            onClick={handleStopLive}
            icon={Square}
            variant="danger"
            fullWidth
          />
        )}
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

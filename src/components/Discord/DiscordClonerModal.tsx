import React, { useState, useRef, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { cloneDiscordServer, cancelDiscordClone, CloneOptions } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import { navigateToSettingsSection } from '../../utils/navigation';
import { FullScreenModal } from '../UI/FullScreenModal';
import { LogViewer, TokenNotice } from './common';
import './DiscordClonerModal.css';

interface DiscordClonerModalProps {
  modalId: string;
}

export const DiscordClonerModal: React.FC<DiscordClonerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus, closeModal } = useModal();
  const { discordUserToken, discordUserTokens, discordTokenLabels, discordTokenProfiles, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [sourceServerId, setSourceServerId] = useState('');
  const [targetServerId, setTargetServerId] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showOptions, setShowOptions] = useState(true);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [cloneOptions, setCloneOptions] = useState<CloneOptions>({
    serverName: true,
    serverIcon: true,
    roles: true,
    channels: true,
    emojis: false,
    channelPermissions: false,
  });
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
    const unlisten = listen<string>('discord-clone-log', (event) => {
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

  const handleClone = async () => {
    if (!userToken || !sourceServerId || !targetServerId) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsCloning(true);
    setCancelRequested(false);
    setLogs([]);
    setShowLogModal(true);
    updateModalStatus(modalId, 'running');

    try {
      await cloneDiscordServer(userToken.trim(), sourceServerId.trim(), targetServerId.trim(), cloneOptions);
      showNotification('success', t('success'), t('discord_clone_success'));
      updateModalStatus(modalId, 'success');
    } catch (error) {
      if (cancelRequested) {
        addLog(t('discord_cancelled'));
        showNotification('info', t('info'), t('discord_cancelled'));
        updateModalStatus(modalId, 'idle');
      } else {
        addLog(`${t('error')}: ${error}`);
        showNotification('error', t('error'), `${error}`);
        updateModalStatus(modalId, 'error');
      }
    } finally {
      setIsCloning(false);
    }
  };

  const handleCancelClone = async () => {
    setCancelRequested(true);
    try {
      await cancelDiscordClone();
      showNotification('info', t('info'), t('discord_cancel_requested'));
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
    }
  };

  return (
    <div className="discord-cloner-modal">
      <div className="discord-cloner-form">
        <TokenNotice
          hasToken={Boolean(discordUserToken)}
          tokenLabel={discordUserToken ? discordTokenLabels[discordUserToken] : undefined}
          tokenMask={discordUserToken ? maskToken(discordUserToken) : undefined}
          tokenProfile={discordUserToken ? discordTokenProfiles[discordUserToken] : undefined}
          onOpenSettings={handleTokenRedirect}
        />

        {discordUserTokens.length > 1 && (
          <div className="input-group">
            <label>{t('discord_saved_tokens_label')}</label>
            <select
              className="input"
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

        <div className="input-group">
          <label htmlFor="user-token">{t('discord_user_token')}</label>
          <input
            id="user-token"
            type="password"
            className="input"
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
            value={userToken}
            onChange={(e) => setUserToken(e.target.value)}
            disabled={isCloning}
            autoComplete="off"
            readOnly
            onClick={handleTokenRedirect}
            onFocus={handleTokenRedirect}
          />
        </div>

        <div className="input-group">
          <label htmlFor="source-server">{t('discord_source_server')}</label>
          <input
            id="source-server"
            type="text"
            className="input"
            placeholder={t('discord_source_server_placeholder')}
            value={sourceServerId}
            onChange={(e) => setSourceServerId(e.target.value)}
            disabled={isCloning}
            autoComplete="off"
          />
        </div>

        <div className="input-group">
          <label htmlFor="target-server">{t('discord_target_server')}</label>
          <input
            id="target-server"
            type="text"
            className="input"
            placeholder={t('discord_target_server_placeholder')}
            value={targetServerId}
            onChange={(e) => setTargetServerId(e.target.value)}
            disabled={isCloning}
            autoComplete="off"
          />
        </div>

        
        <div className="clone-options-section">
          <div className="section-header">
            <h3>{t('discord_clone_options')}</h3>
            <button
              className="btn-ghost btn-small"
              onClick={() => setShowOptions(!showOptions)}
              disabled={isCloning}
            >
              {showOptions ? t('discord_hide_options') : t('discord_show_options')}
            </button>
          </div>

          {showOptions && (
            <>
              <div className="info-box">
                <h4>{t('discord_what_will_be_cloned')}</h4>
                <ul>
                  {cloneOptions.serverName && <li>{t('discord_will_clone_server_name')}</li>}
                  {cloneOptions.serverIcon && <li>{t('discord_will_clone_server_icon')}</li>}
                  {cloneOptions.roles && <li>{t('discord_will_clone_roles')}</li>}
                  {cloneOptions.channels && <li>{t('discord_will_clone_channels')}</li>}
                  {cloneOptions.emojis && <li>{t('discord_will_clone_emojis')}</li>}
                  {cloneOptions.channelPermissions && <li>{t('discord_will_clone_permissions')}</li>}
                </ul>
                <h4>{t('discord_what_will_not_be_cloned')}</h4>
                <ul>
                  <li>{t('discord_wont_clone_messages')}</li>
                  <li>{t('discord_wont_clone_members')}</li>
                  <li>{t('discord_wont_clone_webhooks')}</li>
                  <li>{t('discord_wont_clone_invites')}</li>
                  <li>{t('discord_wont_clone_boosts')}</li>
                </ul>
              </div>

              <div className="options-grid">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloneOptions.serverName}
                    onChange={(e) => setCloneOptions({...cloneOptions, serverName: e.target.checked})}
                    disabled={isCloning}
                  />
                  <span>{t('discord_option_server_name')}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloneOptions.serverIcon}
                    onChange={(e) => setCloneOptions({...cloneOptions, serverIcon: e.target.checked})}
                    disabled={isCloning}
                  />
                  <span>{t('discord_option_server_icon')}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloneOptions.roles}
                    onChange={(e) => setCloneOptions({...cloneOptions, roles: e.target.checked})}
                    disabled={isCloning}
                  />
                  <span>{t('discord_option_roles')}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloneOptions.channels}
                    onChange={(e) => setCloneOptions({...cloneOptions, channels: e.target.checked})}
                    disabled={isCloning}
                  />
                  <span>{t('discord_option_channels')}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloneOptions.emojis}
                    onChange={(e) => setCloneOptions({...cloneOptions, emojis: e.target.checked})}
                    disabled={isCloning}
                  />
                  <span>{t('discord_option_emojis')}</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={cloneOptions.channelPermissions}
                    onChange={(e) => setCloneOptions({...cloneOptions, channelPermissions: e.target.checked})}
                    disabled={isCloning}
                  />
                  <span>{t('discord_option_channel_permissions')}</span>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="clone-action-row">
          <button
            className={`btn btn-primary ${isCloning ? 'btn-loading' : ''}`}
            onClick={handleClone}
            disabled={isCloning}
          >
            <Copy size={16} />
            {isCloning ? t('discord_cloning_in_progress') : t('discord_start_cloning')}
          </button>
          {isCloning && (
            <button
              className="btn btn-danger"
              onClick={handleCancelClone}
            >
              {t('discord_cancel_clone')}
            </button>
          )}
        </div>
      </div>

      {showLogModal && (
        <FullScreenModal
          title={t('discord_logs_title')}
          onClose={() => setShowLogModal(false)}
          onMinimize={() => setShowLogModal(false)}
        >
          <LogViewer
            logs={logs}
            onClear={() => setLogs([])}
            maxHeight="100%"
          />
        </FullScreenModal>
      )}
    </div>
  );
};

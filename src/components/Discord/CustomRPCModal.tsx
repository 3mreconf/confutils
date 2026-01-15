import React, { useState } from 'react';
import { Gamepad2, Save, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { FormInput } from './common/FormInput';
import { ActionButton } from './common/ActionButton';
import { LogViewer } from './common/LogViewer';
import './DiscordModal.css';

interface CustomRPCModalProps {
  modalId: string;
}

export const CustomRPCModal: React.FC<CustomRPCModalProps> = () => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [applicationId, setApplicationId] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState('');
  const [largeImageKey, setLargeImageKey] = useState('');
  const [largeImageText, setLargeImageText] = useState('');
  const [smallImageKey, setSmallImageKey] = useState('');
  const [smallImageText, setSmallImageText] = useState('');
  const [buttonLabel, setButtonLabel] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = type === 'success' ? '[+]' : type === 'error' ? '[ERROR]' : type === 'warning' ? '[WARNING]' : '[INFO]';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };

  const handleSetRPC = async () => {
    setIsLoading(true);
    setLogs([]);
    addLog('Starting RPC connection...', 'info');
    
    try {
      addLog('Validating input parameters...', 'info');
      addLog(`Application ID: ${applicationId || 'Using default'}, Details: ${details || 'N/A'}, State: ${state || 'N/A'}`, 'info');
      
      addLog('Connecting to Discord...', 'info');
      const result = await invoke('set_discord_rpc', {
        appId: applicationId || null,
        state,
        details,
        largeImageKey,
        largeImageText,
        smallImageKey,
        smallImageText,
        buttonLabel,
        buttonUrl
      });
      
      addLog('RPC connection established successfully!', 'success');
      addLog(`Result: ${result}`, 'success');
      setIsActive(true);
      showNotification('success', t('success'), t('discord_rpc_success'));
    } catch (error) {
      const errorMsg = String(error);
      addLog(`Failed to set RPC: ${errorMsg}`, 'error');
      showNotification('error', t('error'), t('discord_rpc_failed', { error: errorMsg }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearRPC = async () => {
    setIsLoading(true);
    addLog('Clearing RPC status...', 'info');
    
    try {
      await invoke('clear_discord_rpc');
      addLog('RPC status cleared successfully!', 'success');
      setIsActive(false);
      showNotification('info', t('info'), t('discord_rpc_cleared'));
    } catch (error) {
      const errorMsg = String(error);
      addLog(`Failed to clear RPC: ${errorMsg}`, 'error');
      showNotification('error', t('error'), t('discord_rpc_clear_failed', { error: errorMsg }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="discord-modal-content rpc-modal-content">
      <div className="modal-description">
        <Gamepad2 className="modal-icon" size={24} />
        <p>{t('discord_rpc_description_text')}</p>
      </div>

      <div className="rpc-form-section">
        <div className="form-group">
          <FormInput
            label={t('discord_rpc_application_id')}
            value={applicationId}
            onChange={setApplicationId}
            placeholder={t('discord_rpc_application_id_placeholder')}
          />
          <FormInput
            label={t('discord_rpc_details')}
            value={details}
            onChange={setDetails}
            placeholder={t('discord_rpc_details_placeholder')}
          />
          <FormInput
            label={t('discord_rpc_state')}
            value={state}
            onChange={setState}
            placeholder={t('discord_rpc_state_placeholder')}
          />
        </div>

        <div className="form-row">
          <FormInput
            label={t('discord_rpc_large_image_key')}
            value={largeImageKey}
            onChange={setLargeImageKey}
            placeholder={t('discord_rpc_image_key_placeholder')}
          />
          <FormInput
            label={t('discord_rpc_large_image_text')}
            value={largeImageText}
            onChange={setLargeImageText}
            placeholder={t('discord_rpc_tooltip_placeholder')}
          />
        </div>

        <div className="form-row">
          <FormInput
            label={t('discord_rpc_small_image')}
            value={smallImageKey}
            onChange={setSmallImageKey}
            placeholder={t('discord_rpc_image_key_placeholder')}
          />
          <FormInput
            label={t('discord_rpc_small_image_text')}
            value={smallImageText}
            onChange={setSmallImageText}
            placeholder={t('discord_rpc_tooltip_placeholder')}
          />
        </div>

        <div className="form-row">
          <FormInput
            label={t('discord_rpc_button_label')}
            value={buttonLabel}
            onChange={setButtonLabel}
            placeholder={t('discord_rpc_button_label_placeholder')}
          />
          <FormInput
            label={t('discord_rpc_button_url')}
            value={buttonUrl}
            onChange={setButtonUrl}
            placeholder={t('discord_rpc_button_url_placeholder')}
          />
        </div>
      </div>

      <div className="modal-actions">
        {isActive && (
          <ActionButton
            onClick={handleClearRPC}
            label={t('discord_rpc_stop')}
            icon={Trash2}
            variant="danger"
            disabled={isLoading}
            loading={isLoading}
          />
        )}
        <ActionButton
          onClick={handleSetRPC}
          label={isActive ? t('discord_rpc_update') : t('discord_rpc_start')}
          icon={Save}
          variant="primary"
          disabled={isLoading}
          loading={isLoading}
        />
      </div>

      <LogViewer
        logs={logs}
        onClear={() => setLogs([])}
        title={t('discord_rpc_logs_title') || 'RPC Status Logs'}
        maxHeight="200px"
      />
    </div>
  );
};

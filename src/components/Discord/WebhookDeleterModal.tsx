import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { invoke } from '@tauri-apps/api/core';
import './MessageClonerModal.css';

interface WebhookDeleterModalProps {
  modalId: string;
}

export const WebhookDeleterModal: React.FC<WebhookDeleterModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();

  const [webhookUrl, setWebhookUrl] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteWebhook = async () => {
    if (!webhookUrl) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsDeleting(true);
    updateModalStatus(modalId, 'running');

    try {
      const result = await invoke<string>('delete_webhook', {
        webhookUrl
      });

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
      setWebhookUrl('');
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
        <div className="form-group">
          <label>{t('discord_webhook_url')}</label>
          <input
            type="text"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="input-field"
          />
          <small className="warning-text">{t('discord_webhook_delete_warning')}</small>
        </div>

        <button
          onClick={handleDeleteWebhook}
          disabled={isDeleting}
          className={`action-button danger ${isDeleting ? 'disabled' : ''}`}
        >
          <Trash2 size={16} />
          {isDeleting ? t('discord_deleting') : t('discord_delete_webhook')}
        </button>
      </div>
    </div>
  );
};

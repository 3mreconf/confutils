import React, { useState, useEffect } from 'react';
import { Users, Database, FileJson, Info, Zap } from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { scrapeGuildMembers } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import {
  FormInput,
  FormCheckbox,
  ActionButton,
  LogViewer,
  ModalHeader,
  SectionCard,
  StatsGrid,
  InfoBox,
  FormGrid
} from './common';
import { validateToken, validateSnowflake } from './utils';
import './DiscordModal.css';

interface MemberScraperModalProps {
  modalId: string;
}

interface ScraperOptions {
  includeRoles: boolean;
  includeBots: boolean;
  includeStatus: boolean;
  exportFormat: 'json' | 'csv' | 'txt';
}

export const MemberScraperModal: React.FC<MemberScraperModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();
  const { discordUserToken, discordUserTokens, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [guildId, setGuildId] = useState('');
  const [isScraping, setIsScraping] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [options, setOptions] = useState<ScraperOptions>({
    includeRoles: true,
    includeBots: false,
    includeStatus: false,
    exportFormat: 'json',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (discordUserToken) {
      setUserToken(discordUserToken);
    }
  }, [discordUserToken]);

  useEffect(() => {
    const unlisten = listen<string>('member-scraper-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setLogs(prev => [...prev, `[${timestamp}] ${event.payload}`]);

      const match = event.payload.match(/(\d+)\s+members/i);
      if (match) {
        setMemberCount(parseInt(match[1]));
      }
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!validateToken(userToken)) {
      newErrors.userToken = t('discord_invalid_token');
    }

    if (!validateSnowflake(guildId)) {
      newErrors.guildId = t('discord_invalid_id');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartScraping = async () => {
    if (!validateForm()) {
      showNotification('error', t('error'), t('discord_fill_all_fields'));
      return;
    }

    setIsScraping(true);
    setLogs([]);
    setMemberCount(0);
    updateModalStatus(modalId, 'running');

    try {
      const result = await scrapeGuildMembers(
        userToken,
        guildId,
        options
      );

      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      showNotification('error', t('error'), `${error}`);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className="discord-modal-container">
      <ModalHeader
        icon={Users}
        title={t('discord_member_scraper')}
        description={t('discord_member_scraper_description')}
      />

      {discordUserToken && (
        <div className="info-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', fontSize: '0.875rem' }}>
          ✓ {t('discord_saved_token_in_use')}
        </div>
      )}

      <InfoBox type="warning" icon={Info} title={t('discord_member_scraper_info_title')}>
        <ul>
          <li>⚠ <strong>Önemli:</strong> Bu özellik <strong>bot token'ı</strong> gerektirir. User token ile çalışmayabilir.</li>
          <li>⚠ Discord Developer Portal'da bot'unuz için <strong>SERVER MEMBERS INTENT</strong> etkinleştirilmiş olmalıdır.</li>
          <li>✓ {t('discord_member_scraper_info_1')}</li>
          <li>✓ {t('discord_member_scraper_info_2')}</li>
          <li>⚠ {t('discord_member_scraper_info_3')}</li>
        </ul>
      </InfoBox>

      {memberCount > 0 && (
        <StatsGrid stats={[
          { label: t('discord_total_members'), value: memberCount, icon: Users },
          { label: t('discord_export_format'), value: options.exportFormat.toUpperCase(), icon: FileJson }
        ]} />
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
            label="Bot Token (Önerilir) / Kullanıcı Tokeni"
            value={userToken}
            onChange={(value) => {
              setUserToken(value);
              if (errors.userToken) setErrors({ ...errors, userToken: '' });
            }}
            type="password"
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : 'Bot token veya kullanıcı tokeni (Bot token önerilir)'}
            disabled={isScraping}
            readOnly
            required
            error={errors.userToken}
            warning
            hint="Bu özellik için bot token'ı kullanmanız önerilir. User token ile çalışmayabilir."
          />

          <FormInput
            label={t('discord_guild_id')}
            value={guildId}
            onChange={(value) => {
              setGuildId(value);
              if (errors.guildId) setErrors({ ...errors, guildId: '' });
            }}
            type="text"
            placeholder="123456789012345678"
            disabled={isScraping}
            required
            error={errors.guildId}
          />
        </FormGrid>
      </SectionCard>

      <SectionCard title={t('discord_scraper_options')} icon={Zap}>
        <div className="options-grid">
          <FormCheckbox
            label={t('discord_option_include_roles')}
            checked={options.includeRoles}
            onChange={(checked) => setOptions({ ...options, includeRoles: checked })}
            disabled={isScraping}
            description={t('discord_option_include_roles_desc')}
          />

          <FormCheckbox
            label={t('discord_option_include_bots')}
            checked={options.includeBots}
            onChange={(checked) => setOptions({ ...options, includeBots: checked })}
            disabled={isScraping}
            description={t('discord_option_include_bots_desc')}
          />

          <FormCheckbox
            label={t('discord_option_include_status')}
            checked={options.includeStatus}
            onChange={(checked) => setOptions({ ...options, includeStatus: checked })}
            disabled={isScraping}
            description={t('discord_option_include_status_desc')}
          />
        </div>

        <div className="form-group" style={{ marginTop: '16px' }}>
          <label>{t('discord_export_format')}</label>
          <select
            className="input-field"
            value={options.exportFormat}
            onChange={(e) => setOptions({ ...options, exportFormat: e.target.value as 'json' | 'csv' | 'txt' })}
            disabled={isScraping}
          >
            <option value="json">JSON - JavaScript Object Notation</option>
            <option value="csv">CSV - Comma Separated Values</option>
            <option value="txt">TXT - Plain Text</option>
          </select>
        </div>
      </SectionCard>

      <ActionButton
        label={isScraping ? t('discord_scraping') : t('discord_start_scraping')}
        onClick={handleStartScraping}
        icon={Users}
        disabled={isScraping}
        loading={isScraping}
        variant="primary"
        fullWidth
      />

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
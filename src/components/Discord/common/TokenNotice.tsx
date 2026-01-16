import React from 'react';
import { Settings } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import './FormComponents.css';

interface TokenNoticeProps {
  hasToken: boolean;
  tokenLabel?: string;
  tokenMask?: string;
  tokenProfile?: { username: string; avatarUrl: string };
  onOpenSettings: () => void;
}

export const TokenNotice: React.FC<TokenNoticeProps> = ({
  hasToken,
  tokenLabel,
  tokenMask,
  tokenProfile,
  onOpenSettings,
}) => {
  const { t } = useLanguage();

  if (!hasToken) {
    return (
      <div className="token-alert">
        <div className="token-alert-text">
          {t('discord_token_missing')}
        </div>
        <button className="btn-ghost btn-small" onClick={onOpenSettings}>
          <Settings size={14} />
          {t('discord_open_settings')}
        </button>
      </div>
    );
  }

  return (
    <div className="token-summary">
      {tokenProfile?.avatarUrl && (
        <img className="token-avatar" src={tokenProfile.avatarUrl} alt={t('discord_token_avatar_alt')} />
      )}
      <div className="token-summary-meta">
        <div className="token-summary-title">
          {tokenLabel || tokenProfile?.username || t('discord_saved_token_in_use')}
        </div>
        {tokenMask && (
          <div className="token-summary-subtitle">{tokenMask}</div>
        )}
      </div>
    </div>
  );
};

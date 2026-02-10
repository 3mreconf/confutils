import React, { useState } from 'react';
import { Server, Copy, Shield, Hash, Smile, Image, Lock, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useModal } from '../contexts/ModalContext';
import { DiscordClonerModal } from '../components/Discord/DiscordClonerModal';
import './Discord.css';

const FEATURES = [
  { icon: Server, key: 'server_name' },
  { icon: Image, key: 'server_icon' },
  { icon: Shield, key: 'roles' },
  { icon: Hash, key: 'channels' },
  { icon: Smile, key: 'emojis' },
  { icon: Lock, key: 'channel_permissions' },
] as const;

const LIMITATIONS = [
  'messages',
  'members',
  'webhooks',
  'invites',
  'boosts',
] as const;

const Discord: React.FC = () => {
  const { t } = useLanguage();
  const { openModal } = useModal();
  const [showLimitations, setShowLimitations] = useState(false);

  const handleOpenCloner = () => {
    openModal(
      'discord-cloner',
      t('discord_server_cloner_title'),
      <DiscordClonerModal modalId="discord-cloner" />,
      t('discord_server_cloner_description')
    );
  };

  return (
    <div className="page-container discord-page">

      <div className="dc-hero">
        <div className="dc-hero-glow" />
        <div className="dc-hero-content">
          <div className="dc-hero-badge">
            <Server size={14} />
            <span>Server Cloner</span>
          </div>
          <h1 className="dc-hero-title">{t('discord_server_cloner_title')}</h1>
          <p className="dc-hero-desc">{t('discord_server_cloner_description')}</p>
          <button className="dc-hero-btn" onClick={handleOpenCloner}>
            <Copy size={15} />
            <span>{t('discord_start_cloning')}</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="dc-section">
        <h2 className="dc-section-title">{t('discord_what_will_be_cloned') || 'Cloneable Elements'}</h2>
        <div className="dc-features-grid">
          {FEATURES.map(({ icon: Icon, key }) => (
            <button
              key={key}
              className="dc-feature-card"
              onClick={handleOpenCloner}
              type="button"
            >
              <div className="dc-feature-icon">
                <Icon size={18} />
              </div>
              <div className="dc-feature-info">
                <span className="dc-feature-label">
                  {t(`discord_option_${key}`) || key}
                </span>
                <span className="dc-feature-desc">
                  {t(`discord_will_clone_${key}`) || ''}
                </span>
              </div>
              <ArrowRight size={14} className="dc-feature-arrow" />
            </button>
          ))}
        </div>
      </div>

      <div className="dc-section">
        <button
          className="dc-limitations-toggle"
          onClick={() => setShowLimitations(!showLimitations)}
          type="button"
        >
          <span>{t('discord_what_will_not_be_cloned') || 'Limitations'}</span>
          {showLimitations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showLimitations && (
          <div className="dc-limitations">
            {LIMITATIONS.map((key) => (
              <div key={key} className="dc-limitation-item">
                <span className="dc-limitation-dot" />
                <span>{t(`discord_wont_clone_${key}`) || key}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};

export default Discord;

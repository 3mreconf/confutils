import React, { useEffect, useState } from 'react';
import { Info, Globe, MessageSquare, ExternalLink, Github, FileText } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { open } from '@tauri-apps/plugin-shell';
import { getVersion } from '@tauri-apps/api/app';
import './About.css';

const About: React.FC = () => {
  const { t } = useLanguage();
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const version = await getVersion();
        setAppVersion(version);
      } catch {
        setAppVersion(null);
      }
    };

    loadVersion();
  }, []);

  const handleOpenLink = async (url: string) => {
    await open(url);
  };

  return (
    <div className="page-container about-page">
      <div className="page-header">
        <h2 className="page-title">{t('about_title') || 'About ConfUtils'}</h2>
        <p className="page-description">{t('about_description') || 'System optimization and management tool for Windows'}</p>
      </div>

      <div className="about-content">
        <div className="about-hero">
          <div className="app-logo">
            <img className="app-logo-image" src="/logo-conf.png" alt="ConfUtils" />
          </div>
          <h1 className="app-name">ConfUtils</h1>
          <p className="app-version">Version {appVersion || '2.0.0'}</p>
        </div>

        <div className="about-sections">
          <div className="about-section">
            <div className="section-header">
              <Info size={24} />
              <h3>{t('about_info_title') || 'About'}</h3>
            </div>
            <div className="section-content">
              <p>{t('about_info_description') || 'ConfUtils is a comprehensive Windows system optimization and management tool. It provides powerful features for system monitoring, privacy protection, optimization, and more.'}</p>
            </div>
          </div>

          <div className="about-section">
            <div className="section-header">
              <Globe size={24} />
              <h3>{t('about_links_title') || 'Links'}</h3>
            </div>
            <div className="section-content">
              <div className="links-list">
                <button
                  className="link-item"
                  onClick={() => handleOpenLink('https://discord.gg/hbht3K4zJg')}
                >
                  <MessageSquare size={18} />
                  <span>{t('about_link_discord') || 'Discord Server'}</span>
                  <ExternalLink size={14} />
                </button>
                <button
                  className="link-item"
                  onClick={() => handleOpenLink('https://github.com/3mreconf/confutils-releases')}
                >
                  <Github size={18} />
                  <span>{t('about_link_github') || 'GitHub Releases'}</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>

          <div className="about-section">
            <div className="section-header">
              <FileText size={24} />
              <h3>{t('about_help_title') || 'Help & Support'}</h3>
            </div>
            <div className="section-content">
              <p>{t('about_help_description') || 'Need help? Join our Discord server for support, updates, and community discussions.'}</p>
              <button
                className="help-button"
                onClick={() => handleOpenLink('https://discord.gg/hbht3K4zJg')}
              >
                <MessageSquare size={18} />
                {t('about_join_discord') || 'Join Discord'}
              </button>
            </div>
          </div>

          <div className="about-footer">
            <p className="copyright">
              © 2026 ConfUtils. {t('about_rights') || 'All rights reserved.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

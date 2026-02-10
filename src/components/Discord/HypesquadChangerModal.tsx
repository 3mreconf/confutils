import React, { useState, useEffect } from 'react';
import { Shield, Flame, Sparkles, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { useModal } from '../../contexts/ModalContext';
import { useAuth } from '../../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import { FormInput, ActionButton } from './common';
import { LogViewer } from './common/LogViewer';
import { validateToken } from './utils';
import { maskToken } from '../../utils/discordToken';
import './MessageClonerModal.css';

interface HypesquadChangerModalProps {
  modalId: string;
}

type HypesquadHouse = 'bravery' | 'brilliance' | 'balance' | 'none';

export const HypesquadChangerModal: React.FC<HypesquadChangerModalProps> = ({ modalId }) => {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const { updateModalStatus } = useModal();
  const { discordUserToken, discordUserTokens, setActiveDiscordUserToken } = useAuth();

  const [userToken, setUserToken] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<HypesquadHouse>('bravery');
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    if (discordUserToken) {
      setUserToken(discordUserToken);
    }
  }, [discordUserToken]);

  const houses = [
    {
      id: 'bravery' as HypesquadHouse,
      name: 'Bravery',
      icon: Shield,
      color: '#9b59b6',
      description: t('discord_hypesquad_bravery_desc'),
    },
    {
      id: 'brilliance' as HypesquadHouse,
      name: 'Brilliance',
      icon: Sparkles,
      color: '#e91e63',
      description: t('discord_hypesquad_brilliance_desc'),
    },
    {
      id: 'balance' as HypesquadHouse,
      name: 'Balance',
      icon: Zap,
      color: '#2ecc71',
      description: t('discord_hypesquad_balance_desc'),
    },
  ];

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('tr-TR');
    const prefix = type === 'success' ? '[+]' : type === 'error' ? '[-]' : '[INFO]';
    setLogs(prev => [...prev, `[${timestamp}] ${prefix} ${message}`]);
  };


  const handleChangeHouse = async () => {
    if (!validateToken(userToken)) {
      setError(t('discord_invalid_token'));
      showNotification('error', t('error'), t('discord_invalid_token'));
      addLog(t('discord_invalid_token'), 'error');
      return;
    }

    setIsChanging(true);
    setError('');
    setLogs([]);
    updateModalStatus(modalId, 'running');

    addLog(`${houses.find(h => h.id === selectedHouse)?.name} house seçildi`, 'info');
    addLog('Hypesquad house değiştiriliyor...', 'info');

    try {
      const result = await invoke<string>('change_hypesquad_house', {
        userToken,
        house: selectedHouse,
      });

      addLog(result || 'Hypesquad house başarıyla değiştirildi!', 'success');
      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      const errorMsg = `${error}`;
      addLog(errorMsg, 'error');
      setError(errorMsg);
      showNotification('error', t('error'), errorMsg);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsChanging(false);
    }
  };

  const handleLeaveHouse = async () => {
    if (!validateToken(userToken)) {
      setError(t('discord_invalid_token'));
      showNotification('error', t('error'), t('discord_invalid_token'));
      addLog(t('discord_invalid_token'), 'error');
      return;
    }

    setIsChanging(true);
    setError('');
    setLogs([]);
    updateModalStatus(modalId, 'running');

    addLog('Hypesquad\'dan ayrılıyor...', 'info');

    try {
      const result = await invoke<string>('leave_hypesquad', {
        userToken,
      });

      addLog(result || 'Hypesquad\'dan başarıyla ayrıldınız!', 'success');
      showNotification('success', t('success'), result);
      updateModalStatus(modalId, 'success');
    } catch (error) {
      const errorMsg = `${error}`;
      addLog(errorMsg, 'error');
      setError(errorMsg);
      showNotification('error', t('error'), errorMsg);
      updateModalStatus(modalId, 'error');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <div className="discord-modal-container">
      <div className="form-section">
        {discordUserToken && (
          <div className="info-message" style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', fontSize: '0.875rem' }}>
            ✓ {t('discord_saved_token_in_use')}
          </div>
        )}

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

        <div className="info-box" style={{ marginBottom: '16px' }}>
          <h4>ℹ️ {t('discord_hypesquad_info_title')}</h4>
          <ul>
            <li>{t('discord_hypesquad_info_1')}</li>
            <li>{t('discord_hypesquad_info_2')}</li>
            <li>{t('discord_hypesquad_info_3')}</li>
          </ul>
        </div>

        <div className="form-group">
          <FormInput
            label={t('discord_user_token')}
            value={userToken}
            onChange={(value) => {
              setUserToken(value);
              if (error) setError('');
            }}
            type="password"
            placeholder={discordUserToken ? t('discord_saved_token_placeholder') : t('discord_user_token_placeholder')}
            disabled={isChanging}
            readOnly
            required
            error={error}
            warning
            hint={t('discord_token_warning')}
          />
        </div>

        <div className="form-group">
          <label>{t('discord_select_hypesquad_house')}</label>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '8px' }}>
            {houses.map((house) => {
              const Icon = house.icon;
              const isSelected = selectedHouse === house.id;
              
              return (
                <div
                  key={house.id}
                  onClick={() => !isChanging && setSelectedHouse(house.id)}
                  style={{
                    padding: '16px',
                    background: isSelected ? `${house.color}15` : 'var(--bg-tertiary)',
                    border: `2px solid ${isSelected ? house.color : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    cursor: isChanging ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isChanging ? 0.6 : 1,
                  }}
                  className="hypesquad-card"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Icon size={24} style={{ color: house.color }} />
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: house.color }}>
                      {house.name}
                    </h4>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    {house.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <ActionButton
            label={isChanging ? t('discord_changing') : t('discord_change_house')}
            onClick={handleChangeHouse}
            icon={houses.find(h => h.id === selectedHouse)?.icon || Shield}
            disabled={isChanging}
            loading={isChanging}
            variant="primary"
            fullWidth
          />

          <ActionButton
            label={t('discord_leave_hypesquad')}
            onClick={handleLeaveHouse}
            icon={Flame}
            disabled={isChanging}
            variant="danger"
            fullWidth
          />
        </div>

        <div style={{
          padding: '12px 16px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '8px',
          fontSize: '13px',
          color: 'var(--status-warning)',
          marginTop: '16px',
        }}>
          <strong>⚠️ {t('note')}:</strong> {t('discord_hypesquad_cooldown_warning')}
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <LogViewer
          logs={logs}
          onClear={() => setLogs([])}
          title={t('discord_logs_title') || 'Terminal'}
          maxHeight="300px"
        />
      </div>
    </div>
  );
};

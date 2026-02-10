import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Copy,
  Hash,
  Image as ImageIcon,
  Lock,
  Server,
  Shield,
  Smile,
  Sparkles,
  X
} from 'lucide-react';
import { listen } from '@tauri-apps/api/event';
import { useI18n } from '../../i18n/I18nContext';
import { checkDiscordToken, cloneDiscordServer } from '../../utils/tauri';
import { maskToken } from '../../utils/discordToken';
import { validateToken } from '../../components/Discord/utils';

interface DiscordProps {
  showToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, message?: string) => void;
}

const DISCORD_USER_TOKEN_KEY = 'confutils_discord_user_token';
const DISCORD_USER_TOKENS_KEY = 'confutils_discord_user_tokens';

const encodeToken = (token: string) => {
  try {
    return btoa(token);
  } catch {
    return token;
  }
};

const decodeToken = (encoded: string) => {
  try {
    return atob(encoded);
  } catch {
    return encoded;
  }
};

type ToggleRowProps = {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

const ToggleRow = ({ label, checked, onChange }: ToggleRowProps) => (
  <div className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
    <div style={{ fontWeight: 500, color: 'var(--text-90)' }}>{label}</div>
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track">
        <span className="toggle-thumb" />
      </span>
    </label>
  </div>
);

const CLONE_FEATURES = [
  { icon: Server, key: 'server_name', color: 'cyan' },
  { icon: ImageIcon, key: 'server_icon', color: 'cyan' },
  { icon: Shield, key: 'roles', color: 'amber' },
  { icon: Hash, key: 'channels', color: 'cyan' },
  { icon: Smile, key: 'emojis', color: 'amber' },
  { icon: Lock, key: 'channel_permissions', color: 'amber' },
] as const;

export default function Discord({ showToast }: DiscordProps) {
  const { t } = useI18n();
  const [userToken, setUserToken] = useState('');
  const [savedTokens, setSavedTokens] = useState<string[]>([]);

  const [sourceServerId, setSourceServerId] = useState('');
  const [targetServerId, setTargetServerId] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [cloneLogs, setCloneLogs] = useState<string[]>([]);

  const [showClonerModal, setShowClonerModal] = useState(false);
  const [tokenDropdownOpen, setTokenDropdownOpen] = useState(false);
  const [isSavingToken, setIsSavingToken] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setTokenDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (tokenDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [tokenDropdownOpen, handleClickOutside]);

  const [options, setOptions] = useState({
    serverName: true,
    serverIcon: true,
    roles: true,
    channels: true,
    emojis: false,
    channelPermissions: false
  });

  useEffect(() => {
    const unlisten = listen<string>('discord-clone-log', (event) => {
      const timestamp = new Date().toLocaleTimeString('tr-TR');
      setCloneLogs((prev) => [...prev, `[${timestamp}] ${event.payload}`]);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  useEffect(() => {
    let tokenList: string[] = [];
    let activeToken: string | null = null;

    const encryptedTokenList = localStorage.getItem(DISCORD_USER_TOKENS_KEY);
    const encryptedActive = localStorage.getItem(DISCORD_USER_TOKEN_KEY);

    if (encryptedTokenList) {
      try {
        const parsed = JSON.parse(encryptedTokenList) as string[];
        tokenList = parsed.map((token) => decodeToken(token)).filter((token) => token && token.trim());
      } catch (error) {
        console.error('Failed to load Discord token list:', error);
      }
    }

    if (encryptedActive) {
      try {
        activeToken = decodeToken(encryptedActive);
      } catch (error) {
        console.error('Failed to load active Discord token:', error);
      }
    }

    if (activeToken && !tokenList.includes(activeToken)) {
      tokenList = [activeToken, ...tokenList];
    }

    if (!activeToken && tokenList.length > 0) {
      activeToken = tokenList[0];
      try {
        const encrypted = encodeToken(activeToken);
        localStorage.setItem(DISCORD_USER_TOKEN_KEY, encrypted);
      } catch (error) {
        console.error('Failed to persist active Discord token:', error);
      }
    }

    setSavedTokens(tokenList);
    if (activeToken) {
      setUserToken(activeToken);
    }
  }, []);

  const requiredCloneFieldsMissing = useMemo(() => {
    return !userToken.trim() || !sourceServerId.trim() || !targetServerId.trim();
  }, [userToken, sourceServerId, targetServerId]);

  const handleSaveToken = async () => {
    const trimmed = userToken.trim();
    if (!validateToken(trimmed)) {
      showToast('warning', t('discord_token_vault_title' as any), t('discord_invalid_token' as any));
      return;
    }

    setIsSavingToken(true);
    try {
      await checkDiscordToken(trimmed);
    } catch {
      showToast('error', t('discord_token_vault_title' as any), t('discord_token_invalid' as any) || 'Token is invalid');
      setIsSavingToken(false);
      return;
    }

    const updated = Array.from(new Set([trimmed, ...savedTokens]));
    const encryptedList = updated.map((token) => encodeToken(token));
    localStorage.setItem(DISCORD_USER_TOKENS_KEY, JSON.stringify(encryptedList));
    localStorage.setItem(DISCORD_USER_TOKEN_KEY, encodeToken(trimmed));
    setSavedTokens(updated);
    showToast('success', t('discord_token_vault_title' as any), t('discord_token_saved' as any));
    setIsSavingToken(false);
  };

  const handleSelectToken = (token: string) => {
    if (!token) return;
    setUserToken(token);
    localStorage.setItem(DISCORD_USER_TOKEN_KEY, encodeToken(token));
  };

  const handleClearTokens = () => {
    localStorage.removeItem(DISCORD_USER_TOKEN_KEY);
    localStorage.removeItem(DISCORD_USER_TOKENS_KEY);
    setSavedTokens([]);
    setUserToken('');
    showToast('success', t('discord_token_vault_title' as any), t('discord_tokens_cleared' as any));
  };

  const handleCloneServer = async () => {
    if (requiredCloneFieldsMissing) {
      showToast('warning', t('discord_title' as any), t('discord_fill_required' as any));
      return;
    }

    setIsCloning(true);
    setCloneLogs([]);

    try {
      await cloneDiscordServer(userToken.trim(), sourceServerId.trim(), targetServerId.trim(), options);
      showToast('success', t('discord_title' as any), t('discord_clone_success' as any));
    } catch (error) {
      const msg = String(error);
      setCloneLogs((prev) => [...prev, `[${new Date().toLocaleTimeString('tr-TR')}] ${msg}`]);
      showToast('error', t('discord_clone_failed' as any), msg);
    } finally {
      setIsCloning(false);
    }
  };

  const activeOptionCount = Object.values(options).filter(Boolean).length;

  return (
    <div>
      {/* ── Hero ──────────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-xl)',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(18, 21, 26, 0.6))',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          marginBottom: 'var(--space-xl)',
          boxShadow: 'var(--shadow-glow-cyan)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 280,
            height: 280,
            background: 'radial-gradient(circle, rgba(0, 240, 255, 0.15), transparent 70%)',
            filter: 'blur(8px)',
            opacity: 0.6,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <div className="card-icon-wrapper cyan" style={{ width: 52, height: 52 }}>
              <Server size={24} />
            </div>
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-50)' }}>
                Discord
              </div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-100)', margin: 0 }}>
                {t('discord_server_cloner_title' as any)}
              </h2>
            </div>
          </div>
          <p className="text-muted" style={{ maxWidth: 480, lineHeight: 1.6 }}>
            {t('discord_server_cloner_description' as any)}
          </p>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => setShowClonerModal(true)}
            style={{ width: 'fit-content', marginTop: 'var(--space-sm)' }}
          >
            <Copy size={16} />
            {t('discord_start_cloning' as any)}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Feature Grid ─────────────────────────────────── */}
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--text-50)',
          marginBottom: 'var(--space-md)',
        }}>
          {t('discord_what_will_be_cloned' as any) || 'Cloneable Elements'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 'var(--space-md)',
        }}>
          {CLONE_FEATURES.map(({ icon: Icon, key, color }) => (
            <button
              key={key}
              onClick={() => setShowClonerModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-md)',
                padding: 'var(--space-md)',
                background: 'var(--surface)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)',
                textAlign: 'left' as const,
                width: '100%',
                fontFamily: 'var(--font-ui)',
                color: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--text-30)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className={`card-icon-wrapper ${color}`} style={{ width: 38, height: 38, flexShrink: 0 }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-100)' }}>
                  {t(`discord_option_${key}` as any) || key}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-50)', marginTop: 2 }}>
                  {t(`discord_will_clone_${key}` as any) || ''}
                </div>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-30)', flexShrink: 0 }} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Token Vault (Compact) ────────────────────────── */}
      <div className="control-card mb-lg" style={{ padding: 'var(--space-lg)' }}>
        <div className="flex items-center gap-md mb-md">
          <div className="card-icon-wrapper cyan" style={{ width: 40, height: 40 }}>
            <Shield size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, color: 'var(--text-100)' }}>{t('discord_token_vault_title' as any)}</div>
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {t('discord_token_vault_desc' as any)}
            </div>
          </div>
        </div>

        <div className="flex gap-md" style={{ flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('discord_user_token_label' as any)}</label>
            <input
              className="input"
              type="password"
              value={userToken}
              onChange={(e) => setUserToken(e.target.value)}
              placeholder={t('discord_user_token_placeholder' as any)}
              autoComplete="off"
            />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>{t('discord_saved_tokens_label' as any)}</label>
            <div className="select-menu" ref={dropdownRef}>
              <button
                className="select-trigger"
                onClick={() => setTokenDropdownOpen(!tokenDropdownOpen)}
                type="button"
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userToken && savedTokens.includes(userToken)
                    ? maskToken(userToken)
                    : t('discord_no_saved_tokens' as any)}
                </span>
                <ChevronDown size={16} style={{ transition: 'transform 200ms', transform: tokenDropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {tokenDropdownOpen && (
                <div className="select-list">
                  {savedTokens.length === 0 ? (
                    <div className="search-empty">{t('discord_no_saved_tokens' as any)}</div>
                  ) : (
                    savedTokens.map((token) => (
                      <button
                        key={token}
                        className={`select-item ${token === userToken ? 'active' : ''}`}
                        onClick={() => {
                          handleSelectToken(token);
                          setTokenDropdownOpen(false);
                        }}
                        type="button"
                      >
                        {maskToken(token)}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-lg" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div className="flex gap-sm">
            <button className="btn btn-primary" onClick={handleSaveToken} disabled={!validateToken(userToken.trim()) || isSavingToken}>
              {isSavingToken ? <Sparkles size={16} className="spin" /> : null}
              {isSavingToken ? t('discord_checking_token' as any) || 'Checking...' : t('discord_save_token' as any)}
            </button>
            <button className="btn btn-secondary" onClick={handleClearTokens}>
              {t('discord_clear_tokens' as any)}
            </button>
          </div>
          {userToken && (
            <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
              {t('discord_active_token' as any)}: {maskToken(userToken)}
            </div>
          )}
        </div>
      </div>

      {/* ── Warning ──────────────────────────────────────── */}
      <div className="control-card" style={{ padding: 'var(--space-lg)' }}>
        <div className="flex items-center gap-md">
          <div
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              background: 'var(--warning-bg)',
              color: 'var(--warning)'
            }}
          >
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text-100)' }}>{t('discord_token_warning' as any)}</div>
            <div className="text-muted" style={{ fontSize: 'var(--text-sm)' }}>
              {t('discord_token_warning_desc' as any)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Cloner Modal ─────────────────────────────────── */}
      {showClonerModal && createPortal(
        <div
          className="modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget && !isCloning) setShowClonerModal(false); }}
        >
          <div className="modal" style={{ maxWidth: 620 }}>
            {/* Header */}
            <div className="modal-header">
              <div className="flex items-center gap-md">
                <div className="card-icon-wrapper cyan" style={{ width: 36, height: 36 }}>
                  <Server size={18} />
                </div>
                <div>
                  <div className="modal-title">{t('discord_server_cloner_title' as any)}</div>
                  <div className="text-muted" style={{ fontSize: 'var(--text-xs)' }}>
                    {activeOptionCount} {t('discord_clone_options_title' as any) || 'options'} active
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={() => !isCloning && setShowClonerModal(false)} disabled={isCloning}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ maxHeight: '70vh' }}>
              {/* Server IDs */}
              <div className="flex gap-md mb-lg" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-sm)', display: 'block' }}>
                    {t('discord_source_server_label' as any)}
                  </label>
                  <input
                    className="input"
                    value={sourceServerId}
                    onChange={(e) => setSourceServerId(e.target.value)}
                    placeholder={t('discord_source_server_placeholder' as any)}
                    autoComplete="off"
                    disabled={isCloning}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <label className="text-muted" style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-sm)', display: 'block' }}>
                    {t('discord_target_server_label' as any)}
                  </label>
                  <input
                    className="input"
                    value={targetServerId}
                    onChange={(e) => setTargetServerId(e.target.value)}
                    placeholder={t('discord_target_server_placeholder' as any)}
                    autoComplete="off"
                    disabled={isCloning}
                  />
                </div>
              </div>

              {/* Clone Options */}
              <div style={{
                background: 'var(--deep)',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-md) var(--space-lg)',
                marginBottom: 'var(--space-lg)',
              }}>
                <div style={{
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase' as const,
                  color: 'var(--text-50)',
                  marginBottom: 'var(--space-sm)',
                }}>
                  {t('discord_clone_options_title' as any)}
                </div>
                <ToggleRow
                  label={t('discord_option_server_name' as any)}
                  checked={options.serverName}
                  onChange={(value) => setOptions((prev) => ({ ...prev, serverName: value }))}
                />
                <ToggleRow
                  label={t('discord_option_server_icon' as any)}
                  checked={options.serverIcon}
                  onChange={(value) => setOptions((prev) => ({ ...prev, serverIcon: value }))}
                />
                <ToggleRow
                  label={t('discord_option_roles' as any)}
                  checked={options.roles}
                  onChange={(value) => setOptions((prev) => ({ ...prev, roles: value }))}
                />
                <ToggleRow
                  label={t('discord_option_channels' as any)}
                  checked={options.channels}
                  onChange={(value) => setOptions((prev) => ({ ...prev, channels: value }))}
                />
                <ToggleRow
                  label={t('discord_option_emojis' as any)}
                  checked={options.emojis}
                  onChange={(value) => setOptions((prev) => ({ ...prev, emojis: value }))}
                />
                <ToggleRow
                  label={t('discord_option_channel_permissions' as any)}
                  checked={options.channelPermissions}
                  onChange={(value) => setOptions((prev) => ({ ...prev, channelPermissions: value }))}
                />
              </div>

              {/* Logs */}
              {cloneLogs.length > 0 && (
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <div className="flex items-center justify-between mb-md">
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--text-50)',
                    }}>
                      {t('discord_logs_title' as any)}
                    </div>
                    <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }} onClick={() => setCloneLogs([])}>
                      {t('discord_clear_logs' as any)}
                    </button>
                  </div>
                  <div className="code-block" style={{ maxHeight: 200, overflowY: 'auto', fontSize: 'var(--text-xs)' }}>
                    {cloneLogs.join('\n')}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              {requiredCloneFieldsMissing && (
                <div className="text-muted" style={{ fontSize: 'var(--text-xs)', marginRight: 'auto' }}>
                  {t('discord_fill_required' as any)}
                </div>
              )}
              <button className="btn btn-secondary" onClick={() => !isCloning && setShowClonerModal(false)} disabled={isCloning}>
                {t('cancel' as any)}
              </button>
              <button className="btn btn-primary" onClick={handleCloneServer} disabled={isCloning || requiredCloneFieldsMissing}>
                {isCloning ? <Sparkles size={16} className="spin" /> : <Copy size={16} />}
                {isCloning ? t('discord_cloning_in_progress' as any) : t('discord_start_cloning' as any)}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

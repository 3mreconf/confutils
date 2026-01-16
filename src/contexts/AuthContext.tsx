import React, { createContext, useContext, useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  discordUserToken: string | null;
  discordUserTokens: string[];
  discordTokenLabels: Record<string, string>;
  discordTokenProfiles: Record<string, { username: string; avatarUrl: string }>;
  setDiscordUserToken: (token: string) => void;
  setActiveDiscordUserToken: (token: string) => void;
  setDiscordTokenLabel: (token: string, label: string) => void;
  setDiscordTokenProfile: (token: string, profile: { username: string; avatarUrl: string }) => void;
  importDiscordTokens: (
    tokens: string[],
    labels?: Record<string, string>,
    profiles?: Record<string, { username: string; avatarUrl: string }>
  ) => void;
  removeDiscordUserToken: (token: string) => void;
  clearDiscordUserToken: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DISCORD_USER_TOKEN_KEY = 'confutils_discord_user_token';
const DISCORD_USER_TOKENS_KEY = 'confutils_discord_user_tokens';
const DISCORD_USER_TOKEN_LABELS_KEY = 'confutils_discord_token_labels';
const DISCORD_USER_TOKEN_PROFILES_KEY = 'confutils_discord_token_profiles';

const getEncryptionKey = (): string => {
  const envKey = import.meta.env.VITE_AUTH_ENCRYPTION_KEY;
  if (envKey) return envKey;

  const storedKey = localStorage.getItem('_ek');
  if (storedKey) return storedKey;

  const generatedKey = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('_ek', generatedKey);
  return generatedKey;
};

const ENCRYPTION_KEY = getEncryptionKey();

export const encryptToken = (token: string): string => {
  try {
    if (typeof CryptoJS === 'undefined' || !CryptoJS.AES) {
      console.error('CryptoJS is not available, storing token unencrypted');
      return token;
    }
    return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    return token;
  }
};

export const decryptToken = (encryptedToken: string): string => {
  try {
    if (typeof CryptoJS === 'undefined' || !CryptoJS.AES) {
      console.error('CryptoJS is not available, returning token as-is');
      return encryptedToken;
    }
    const bytes = CryptoJS.AES.decrypt(encryptedToken, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      return encryptedToken;
    }
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    return encryptedToken;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [discordUserToken, setDiscordUserTokenState] = useState<string | null>(null);
  const [discordUserTokens, setDiscordUserTokens] = useState<string[]>([]);
  const [discordTokenLabels, setDiscordTokenLabels] = useState<Record<string, string>>({});
  const [discordTokenProfiles, setDiscordTokenProfiles] = useState<Record<string, { username: string; avatarUrl: string }>>({});

  useEffect(() => {
    const encryptedDiscordUserToken = localStorage.getItem(DISCORD_USER_TOKEN_KEY);
    const encryptedTokenList = localStorage.getItem(DISCORD_USER_TOKENS_KEY);
    const encryptedTokenLabels = localStorage.getItem(DISCORD_USER_TOKEN_LABELS_KEY);
    const encryptedTokenProfiles = localStorage.getItem(DISCORD_USER_TOKEN_PROFILES_KEY);
    let tokenList: string[] = [];
    let activeToken: string | null = null;
    let labelMap: Record<string, string> = {};
    let profileMap: Record<string, { username: string; avatarUrl: string }> = {};

    if (encryptedTokenList) {
      try {
        const parsed = JSON.parse(encryptedTokenList) as string[];
        tokenList = parsed.map(token => decryptToken(token)).filter(token => token && token.trim());
      } catch (error) {
        console.error('Failed to decrypt Discord token list:', error);
      }
    }

    if (encryptedDiscordUserToken) {
      try {
        activeToken = decryptToken(encryptedDiscordUserToken);
      } catch (error) {
        console.error('Failed to decrypt Discord user token:', error);
      }
    }

    if (encryptedTokenLabels) {
      try {
        const parsed = JSON.parse(encryptedTokenLabels) as Array<{ token: string; label: string }>;
        labelMap = parsed.reduce<Record<string, string>>((acc, entry) => {
          const token = decryptToken(entry.token);
          if (token && token.trim()) {
            acc[token] = entry.label;
          }
          return acc;
        }, {});
      } catch (error) {
        console.error('Failed to load Discord token labels:', error);
      }
    }

    if (encryptedTokenProfiles) {
      try {
        const parsed = JSON.parse(encryptedTokenProfiles) as Array<{ token: string; username: string; avatarUrl: string }>;
        profileMap = parsed.reduce<Record<string, { username: string; avatarUrl: string }>>((acc, entry) => {
          const token = decryptToken(entry.token);
          if (token && token.trim()) {
            acc[token] = { username: entry.username, avatarUrl: entry.avatarUrl };
          }
          return acc;
        }, {});
      } catch (error) {
        console.error('Failed to load Discord token profiles:', error);
      }
    }

    if (activeToken && !tokenList.includes(activeToken)) {
      tokenList = [activeToken, ...tokenList];
    }

    if (!activeToken && tokenList.length > 0) {
      activeToken = tokenList[0];
      try {
        const encryptedActive = encryptToken(activeToken);
        localStorage.setItem(DISCORD_USER_TOKEN_KEY, encryptedActive);
      } catch (error) {
        console.error('Failed to persist active Discord token:', error);
      }
    }

    setDiscordUserTokens(tokenList);
    setDiscordTokenLabels(labelMap);
    setDiscordTokenProfiles(profileMap);
    if (activeToken) {
      setDiscordUserTokenState(activeToken);
    }
  }, []);

  const setDiscordUserToken = (token: string) => {
    if (!token || token.trim() === '') {
      console.error('Invalid Discord user token');
      return;
    }

    try {
      const trimmed = token.trim();
      const updatedList = Array.from(new Set([trimmed, ...discordUserTokens]));
      const encryptedList = updatedList.map(item => encryptToken(item));
      localStorage.setItem(DISCORD_USER_TOKENS_KEY, JSON.stringify(encryptedList));
      const encryptedActive = encryptToken(trimmed);
      localStorage.setItem(DISCORD_USER_TOKEN_KEY, encryptedActive);
      setDiscordUserTokens(updatedList);
      setDiscordUserTokenState(trimmed);
    } catch (error) {
      console.error('Failed to save Discord user token:', error);
    }
  };

  const persistTokenLabels = (labels: Record<string, string>) => {
    const entries = Object.entries(labels).map(([token, label]) => ({
      token: encryptToken(token),
      label,
    }));
    localStorage.setItem(DISCORD_USER_TOKEN_LABELS_KEY, JSON.stringify(entries));
  };

  const persistTokenProfiles = (profiles: Record<string, { username: string; avatarUrl: string }>) => {
    const entries = Object.entries(profiles).map(([token, profile]) => ({
      token: encryptToken(token),
      username: profile.username,
      avatarUrl: profile.avatarUrl,
    }));
    localStorage.setItem(DISCORD_USER_TOKEN_PROFILES_KEY, JSON.stringify(entries));
  };

  const setActiveDiscordUserToken = (token: string) => {
    if (!token || token.trim() === '') {
      return;
    }
    try {
      const trimmed = token.trim();
      const updatedList = Array.from(new Set([trimmed, ...discordUserTokens]));
      const encryptedList = updatedList.map(item => encryptToken(item));
      localStorage.setItem(DISCORD_USER_TOKENS_KEY, JSON.stringify(encryptedList));
      const encryptedActive = encryptToken(trimmed);
      localStorage.setItem(DISCORD_USER_TOKEN_KEY, encryptedActive);
      setDiscordUserTokens(updatedList);
      setDiscordUserTokenState(trimmed);
    } catch (error) {
      console.error('Failed to set active Discord user token:', error);
    }
  };

  const setDiscordTokenLabel = (token: string, label: string) => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return;
    }
    const nextLabels = { ...discordTokenLabels };
    const trimmedLabel = label.trim();
    if (trimmedLabel) {
      nextLabels[trimmedToken] = trimmedLabel;
    } else {
      delete nextLabels[trimmedToken];
    }
    persistTokenLabels(nextLabels);
    setDiscordTokenLabels(nextLabels);
  };

  const setDiscordTokenProfile = (token: string, profile: { username: string; avatarUrl: string }) => {
    const trimmedToken = token.trim();
    if (!trimmedToken) {
      return;
    }
    const nextProfiles = { ...discordTokenProfiles, [trimmedToken]: profile };
    persistTokenProfiles(nextProfiles);
    setDiscordTokenProfiles(nextProfiles);
  };

  const importDiscordTokens = (
    tokens: string[],
    labels: Record<string, string> = {},
    profiles: Record<string, { username: string; avatarUrl: string }> = {}
  ) => {
    const cleaned = tokens.map(token => token.trim()).filter(token => token);
    if (cleaned.length === 0) {
      return;
    }
    const updatedList = Array.from(new Set([...discordUserTokens, ...cleaned]));
    const encryptedList = updatedList.map(item => encryptToken(item));
    localStorage.setItem(DISCORD_USER_TOKENS_KEY, JSON.stringify(encryptedList));
    let nextActive = discordUserToken;
    if (!nextActive) {
      nextActive = updatedList[0];
    }
    if (nextActive) {
      const encryptedActive = encryptToken(nextActive);
      localStorage.setItem(DISCORD_USER_TOKEN_KEY, encryptedActive);
      setDiscordUserTokenState(nextActive);
    }
    setDiscordUserTokens(updatedList);
    const nextLabels = { ...discordTokenLabels };
    Object.entries(labels).forEach(([token, label]) => {
      const trimmed = token.trim();
      if (trimmed && label.trim()) {
        nextLabels[trimmed] = label.trim();
      }
    });
    persistTokenLabels(nextLabels);
    setDiscordTokenLabels(nextLabels);
    const nextProfiles = { ...discordTokenProfiles };
    Object.entries(profiles).forEach(([token, profile]) => {
      const trimmed = token.trim();
      if (trimmed && profile.username) {
        nextProfiles[trimmed] = { username: profile.username, avatarUrl: profile.avatarUrl };
      }
    });
    persistTokenProfiles(nextProfiles);
    setDiscordTokenProfiles(nextProfiles);
  };

  const removeDiscordUserToken = (token: string) => {
    const trimmed = token.trim();
    if (!trimmed) {
      return;
    }
    const updatedList = discordUserTokens.filter(item => item !== trimmed);
    if (updatedList.length === 0) {
      localStorage.removeItem(DISCORD_USER_TOKEN_KEY);
      localStorage.removeItem(DISCORD_USER_TOKENS_KEY);
      setDiscordUserTokens([]);
      setDiscordUserTokenState(null);
      return;
    }
    const encryptedList = updatedList.map(item => encryptToken(item));
    localStorage.setItem(DISCORD_USER_TOKENS_KEY, JSON.stringify(encryptedList));
    const nextActive = discordUserToken === trimmed ? updatedList[0] : discordUserToken;
    if (nextActive) {
      const encryptedActive = encryptToken(nextActive);
      localStorage.setItem(DISCORD_USER_TOKEN_KEY, encryptedActive);
      setDiscordUserTokenState(nextActive);
    }
    setDiscordUserTokens(updatedList);
    if (discordTokenLabels[trimmed]) {
      const nextLabels = { ...discordTokenLabels };
      delete nextLabels[trimmed];
      persistTokenLabels(nextLabels);
      setDiscordTokenLabels(nextLabels);
    }
    if (discordTokenProfiles[trimmed]) {
      const nextProfiles = { ...discordTokenProfiles };
      delete nextProfiles[trimmed];
      persistTokenProfiles(nextProfiles);
      setDiscordTokenProfiles(nextProfiles);
    }
  };

  const clearDiscordUserToken = () => {
    localStorage.removeItem(DISCORD_USER_TOKEN_KEY);
    localStorage.removeItem(DISCORD_USER_TOKENS_KEY);
    localStorage.removeItem(DISCORD_USER_TOKEN_LABELS_KEY);
    localStorage.removeItem(DISCORD_USER_TOKEN_PROFILES_KEY);
    setDiscordUserTokenState(null);
    setDiscordUserTokens([]);
    setDiscordTokenLabels({});
    setDiscordTokenProfiles({});
  };

  return (
    <AuthContext.Provider
      value={{
        discordUserToken,
        discordUserTokens,
        discordTokenLabels,
        discordTokenProfiles,
        setDiscordUserToken,
        setActiveDiscordUserToken,
        setDiscordTokenLabel,
        setDiscordTokenProfile,
        importDiscordTokens,
        removeDiscordUserToken,
        clearDiscordUserToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

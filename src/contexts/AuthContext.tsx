import React, { createContext, useContext, useEffect, useState } from 'react';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  discordUserToken: string | null;
  discordUserTokens: string[];
  setDiscordUserToken: (token: string) => void;
  setActiveDiscordUserToken: (token: string) => void;
  removeDiscordUserToken: (token: string) => void;
  clearDiscordUserToken: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DISCORD_USER_TOKEN_KEY = 'confutils_discord_user_token';
const DISCORD_USER_TOKENS_KEY = 'confutils_discord_user_tokens';

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

  useEffect(() => {
    const encryptedDiscordUserToken = localStorage.getItem(DISCORD_USER_TOKEN_KEY);
    const encryptedTokenList = localStorage.getItem(DISCORD_USER_TOKENS_KEY);
    let tokenList: string[] = [];
    let activeToken: string | null = null;

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
  };

  const clearDiscordUserToken = () => {
    localStorage.removeItem(DISCORD_USER_TOKEN_KEY);
    localStorage.removeItem(DISCORD_USER_TOKENS_KEY);
    setDiscordUserTokenState(null);
    setDiscordUserTokens([]);
  };

  return (
    <AuthContext.Provider
      value={{
        discordUserToken,
        discordUserTokens,
        setDiscordUserToken,
        setActiveDiscordUserToken,
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

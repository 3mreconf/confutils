import { useEffect, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface HardwareInfo {
  hwid: string;
  cpu_id: string;
  motherboard_serial: string;
  disk_serial: string;
  mac_address: string;
  os_info: string;
}

interface HWIDHookResult {
  hwid: string | null;
  hardwareInfo: HardwareInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchHWID: () => Promise<void>;
  verifyHWID: (storedHWID: string) => Promise<boolean>;
}


export function useHWID(): HWIDHookResult {
  const [hwid, setHwid] = useState<string | null>(null);
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHWID = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const info = await invoke<HardwareInfo>('get_hwid');

      setHardwareInfo(info);
      setHwid(info.hwid);

      localStorage.setItem('confutils_hwid', info.hwid);

      console.log('✅ HWID fetched successfully:', info.hwid.substring(0, 16) + '...');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error('🔴 Failed to fetch HWID:', errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  
  const verifyHWID = useCallback(async (storedHWID: string): Promise<boolean> => {
    try {
      const isValid = await invoke<boolean>('verify_hwid', { storedHwid: storedHWID });

      if (!isValid) {
        console.warn('⚠️ HWID mismatch detected! Hardware may have changed.');
      }

      return isValid;
    } catch (err) {
      console.error('🔴 HWID verification failed:', err);
      return false;
    }
  }, []);

  
  useEffect(() => {
    fetchHWID();
  }, [fetchHWID]);

  return {
    hwid,
    hardwareInfo,
    isLoading,
    error,
    fetchHWID,
    verifyHWID,
  };
}


export async function getHWIDOnce(): Promise<string> {
  try {
    return await invoke<string>('get_hwid_string');
  } catch (error) {
    console.error('Failed to get HWID:', error);
    throw error;
  }
}


export async function getHardwareInfoOnce(): Promise<HardwareInfo> {
  try {
    return await invoke<HardwareInfo>('get_hwid');
  } catch (error) {
    console.error('Failed to get hardware info:', error);
    throw error;
  }
}
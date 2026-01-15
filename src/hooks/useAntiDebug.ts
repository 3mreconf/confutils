import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface DebugCheckResult {
  is_debugged: boolean;
  debugger_present: boolean;
  timing_anomaly: boolean;
  suspicious_parent: boolean;
  suspicious_process: boolean;
  hardware_breakpoint: boolean;
}

interface AntiDebugConfig {
  enableBackendCheck: boolean;
  enableFrontendCheck: boolean;
  checkInterval: number;
  terminateOnDetection: boolean;
  onDetection?: (method: string) => void;
  enabled?: boolean;
}

const DEFAULT_CONFIG: AntiDebugConfig = {
  enableBackendCheck: true,
  enableFrontendCheck: true,
  checkInterval: 60000,
  terminateOnDetection: true,
  enabled: true,
};


class FrontendAntiDebug {
  
  static checkDevTools(): boolean {
    const widthThreshold = window.outerWidth - window.innerWidth > 160;
    const heightThreshold = window.outerHeight - window.innerHeight > 160;

    return widthThreshold || heightThreshold;
  }

  
  static checkConsole(): boolean {
    const element = new Image();
    let isOpen = false;

    Object.defineProperty(element, 'id', {
      get: function() {
        isOpen = true;
        return 'detected';
      }
    });

    try {
      const _ = element.id;
      void _;
    } catch {
      return false;
    }
    return isOpen;
  }

  
  static checkTiming(): boolean {
    const start = performance.now();
    debugger;
    const end = performance.now();

    return (end - start) > 100;
  }

  
  static checkToString(): boolean {
    try {
      const check = /./;
      const original = check.toString;
      check.toString = function() { return 'detected'; };

      const result = String(check) === 'detected';

      check.toString = original;

      return result;
    } catch {
      return false;
    }
  }

  
  static checkDatePerformance(): boolean {
    const start = new Date().getTime();
    debugger;
    const end = new Date().getTime();

    return (end - start) > 100;
  }

  
  static checkReactDevMode(): boolean {
    return import.meta.env.DEV;
  }

  
  static detect(): { detected: boolean; method?: string } {
    if (this.checkDevTools()) {
      return { detected: true, method: 'DevTools Size' };
    }

    if (this.checkConsole()) {
      return { detected: true, method: 'Console Detection' };
    }

    if (this.checkTiming()) {
      return { detected: true, method: 'Timing Anomaly' };
    }

    if (this.checkDatePerformance()) {
      return { detected: true, method: 'Date Performance' };
    }

    return { detected: false };
  }
}


export function useAntiDebug(config: Partial<AntiDebugConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectedRef = useRef(false);

  
  const checkNativeDebugger = useCallback(async (): Promise<boolean> => {
    if (import.meta.env.PROD) {
      return false;
    }
    
    try {
      const result = await invoke<DebugCheckResult>('check_debugger');

      if (result.is_debugged) {
        const methods = [];
        if (result.debugger_present) methods.push('Debugger Present');
        if (result.timing_anomaly) methods.push('Timing Anomaly');
        if (result.suspicious_parent) methods.push('Suspicious Parent Process');
        if (result.suspicious_process) methods.push('Cheat Engine Detected');
        if (result.hardware_breakpoint) methods.push('Hardware Breakpoint');

        console.warn('⚠️ Debugger detected (non-blocking):', methods.join(', '));
        return false;
      }

      return false;
    } catch (error) {
      console.warn('Backend debugger check failed (non-blocking):', error);
      return false;
    }
  }, []);

  
  const checkFrontendDebugger = useCallback((): boolean => {
    if (import.meta.env.PROD) {
      return false;
    }
    
    const result = FrontendAntiDebug.detect();

    if (result.detected) {
      console.warn('⚠️ Frontend debugger detected (non-blocking):', result.method);
      return false;
    }

    return false;
  }, []);

  
  const handleDetection = useCallback(async (method: string) => {
    if (detectedRef.current) return;

    detectedRef.current = true;

    if (finalConfig.onDetection) {
      finalConfig.onDetection(method);
    }

    if (finalConfig.terminateOnDetection && false) {
      try {
        console.warn('⚠️ Debugger detected, but termination disabled');
      } catch (error) {
        console.warn('Termination check failed:', error);
      }
    }
  }, [finalConfig]);

  
  const performCheck = useCallback(async () => {
    if (!finalConfig.enabled) return;

    if (finalConfig.enableBackendCheck) {
      const nativeDetected = await checkNativeDebugger();
      if (nativeDetected) {
        await handleDetection('Native');
        return;
      }
    }

    if (finalConfig.enableFrontendCheck) {
      const frontendDetected = checkFrontendDebugger();
      if (frontendDetected) {
        await handleDetection('Frontend');
        return;
      }
    }
  }, [finalConfig, checkNativeDebugger, checkFrontendDebugger, handleDetection]);

  
  useEffect(() => {
    if (!finalConfig.enabled) return;

    performCheck();

    if (finalConfig.checkInterval > 0) {
      intervalRef.current = setInterval(performCheck, finalConfig.checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [performCheck, finalConfig.checkInterval, finalConfig.enabled]);

  return {
    checkNow: performCheck,
    isDetected: detectedRef.current,
  };
}


export async function checkDebuggerOnce(): Promise<boolean> {
  try {
    const result = await invoke<DebugCheckResult>('check_debugger');
    return result.is_debugged;
  } catch (error) {
    console.error('Debugger check failed:', error);
    return false;
  }
}


export async function terminateIfDebugged(): Promise<void> {
  try {
    await invoke('terminate_if_debugged');
  } catch (error) {
    console.error('Termination failed:', error);
  }
}
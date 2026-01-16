import React, { useRef, useEffect, useState } from 'react';
import { PauseCircle, PlayCircle, Trash2, Copy } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext';
import './FormComponents.css';

export interface LogViewerProps {
  logs: string[];
  onClear: () => void;
  title?: string;
  maxHeight?: string;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  logs,
  onClear,
  title,
  maxHeight = '320px',
}) => {
  const { t } = useLanguage();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isPaused) {
      scrollToBottom();
    }
  }, [logs]);

  const handleCopy = async () => {
    const content = logs.join('\n');
    if (!content) {
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      const fallback = document.createElement('textarea');
      fallback.value = content;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      document.body.removeChild(fallback);
    }
  };

  const getLogClass = (log: string): string => {
    if (log.includes('[+]') || log.includes('SUCCESS') || log.includes('✓')) return 'log-success';
    if (log.includes('[-]') || log.includes('DELETE')) return 'log-delete';
    if (log.includes('[ERROR]') || log.includes('✗')) return 'log-error';
    if (log.includes('[WARNING]') || log.includes('⚠')) return 'log-warning';
    if (log.includes('[INFO]') || log.includes('ℹ')) return 'log-info';
    return '';
  };

  return (
    <div className="logs-section" style={{ maxHeight }}>
      <div className="logs-header">
        <h3>{title || t('discord_logs_title')}</h3>
        <div className="logs-actions">
          <button className="btn-ghost btn-small" onClick={() => setIsPaused(!isPaused)}>
            {isPaused ? <PlayCircle size={14} /> : <PauseCircle size={14} />}
            {isPaused ? t('resume') : t('pause')}
          </button>
          <button className="btn-ghost btn-small" onClick={handleCopy} disabled={logs.length === 0}>
            <Copy size={14} />
            {t('copy')}
          </button>
          <button className="btn-ghost btn-small" onClick={onClear} disabled={logs.length === 0}>
            <Trash2 size={14} />
            {t('clear')}
          </button>
        </div>
      </div>
      <div className="logs-content">
        {logs.length === 0 ? (
          <div className="log-line log-info">{t('logs_waiting')}</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`log-line ${getLogClass(log)}`}>
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

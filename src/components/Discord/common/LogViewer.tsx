import React, { useRef, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
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

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

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
        <button className="btn-ghost btn-small" onClick={onClear}>
          <Trash2 size={14} />
          {t('clear')}
        </button>
      </div>
      <div className="logs-content">
        {logs.length === 0 ? (
          <div className="log-line log-info">Waiting for logs...</div>
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

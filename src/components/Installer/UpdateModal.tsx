import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { LogViewer } from '../Discord/common/LogViewer';
import { updateWingetPackage } from '../../utils/tauri';
import './UpdateModal.css';

interface UpdateModalProps {
  isOpen: boolean;
  appId: string;
  appName?: string;
  onClose: () => void;
  onSuccess?: () => void;
  onError?: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  appId,
  appName,
  onClose,
  onSuccess,
  onError
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'updating' | 'success' | 'error'>('updating');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  useEffect(() => {
    if (isOpen) {
      setLogs([]);
      setProgress(0);
      setStatus('updating');
      setErrorMessage('');
      
      const performUpdate = async () => {
        try {
          addLog(`Starting update for ${appName || appId}...`);
          setProgress(10);
          
          addLog(`Updating package: ${appId}`);
          setProgress(30);
          
          const result = await updateWingetPackage(appId);
          
          setProgress(80);
          addLog(result || `Update completed for ${appId}`);
          
          setProgress(100);
          setStatus('success');
          addLog('Update successful!');
          
          onSuccess?.();
          
          setTimeout(() => {
            onClose();
          }, 2000);
        } catch (error: any) {
          const errorMsg = error?.toString() || 'Unknown error occurred';
          setErrorMessage(errorMsg);
          setStatus('error');
          addLog(`[ERROR] ${errorMsg}`);
          setProgress(100);
          
          onError?.();
        }
      };

      performUpdate();
    }
  }, [isOpen, appId, appName, onClose]);

  if (!isOpen) return null;

  return (
    <div className="update-modal-overlay" onClick={onClose}>
      <div className="update-modal" onClick={(e) => e.stopPropagation()}>
        <div className="update-modal-header">
          <div className="update-modal-title">
            <h3>Updating {appName || appId}</h3>
            {status === 'updating' && <Loader2 className="spinner" size={20} />}
            {status === 'success' && <CheckCircle className="success-icon" size={20} />}
            {status === 'error' && <XCircle className="error-icon" size={20} />}
          </div>
          <button 
            className="update-modal-close" 
            onClick={onClose}
            disabled={status === 'updating'}
            title={status === 'updating' ? 'Please wait...' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        <div className="update-modal-content">
          <div className="update-progress-container">
            <div className="update-progress-bar">
              <div 
                className={`update-progress-fill ${status}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="update-progress-text">{progress}%</span>
          </div>

          <div className="update-log-container">
            <LogViewer 
              logs={logs} 
              onClear={() => setLogs([])}
              title="Update Logs"
              maxHeight="300px"
            />
          </div>

          {status === 'error' && errorMessage && (
            <div className="update-error-message">
              <XCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {status === 'success' && (
            <div className="update-success-message">
              <CheckCircle size={18} />
              <span>Update completed successfully!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

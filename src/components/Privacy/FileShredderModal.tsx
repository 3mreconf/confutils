import React, { useState } from 'react';
import { FileX, Trash2, AlertTriangle, File, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import './FileShredderModal.css';

export const FileShredderModal: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isShredding, setIsShredding] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const { t } = useLanguage();
  const { showNotification } = useNotification();

  const handleSelectFile = async () => {
    if (isShredding) return;
    
    try {
      const file = await open({
        multiple: false,
        directory: false,
      });
      if (file) {
        setSelectedFile(file as string);
        setProgress(0);
      }
    } catch (error) {
      console.error('File selection failed:', error);
      showNotification('error', t('error'), `${t('shred_failed')}${error}`);
    }
  };

  const handleShred = async () => {
    if (!selectedFile) return;

    setIsShredding(true);
    setProgress(10);

    try {
      const interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      await invoke('secure_delete_file', { filePath: selectedFile });
      
      clearInterval(interval);
      setProgress(100);
      
      showNotification('success', t('success'), t('shred_success'));
      
      setTimeout(() => {
        setSelectedFile(null);
        setIsShredding(false);
        setProgress(0);
      }, 1500);

    } catch (error) {
      setIsShredding(false);
      setProgress(0);
      showNotification('error', t('error'), `${t('shred_failed')}${error}`);
    }
  };

  return (
    <div className="shredder-content">
      <div className="shredder-info-card">
        <div className="shredder-info-header" onClick={() => setShowInfo(!showInfo)}>
          <div className="shredder-info-title">
            <Info size={20} />
            <h3>{t('shred_info_title')}</h3>
          </div>
          <button className="shredder-info-toggle">
            {showInfo ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
        
        {showInfo && (
          <div className="shredder-info-content">
            <p className="shredder-info-description">{t('shred_info_description')}</p>
            
            <div className="shredder-info-section">
              <h4 className="shredder-info-section-title">{t('shred_info_how_it_works')}</h4>
              <p className="shredder-info-section-text">{t('shred_info_how_it_works_text')}</p>
            </div>

            <div className="shredder-info-section">
              <h4 className="shredder-info-section-title">{t('shred_info_features_title')}</h4>
              <ul className="shredder-info-list">
                <li>{t('shred_info_feature_1')}</li>
                <li>{t('shred_info_feature_2')}</li>
                <li>{t('shred_info_feature_3')}</li>
                <li>{t('shred_info_feature_4')}</li>
                <li>{t('shred_info_feature_5')}</li>
              </ul>
            </div>

            <div className="shredder-info-section">
              <h4 className="shredder-info-section-title">{t('shred_info_effectiveness_title')}</h4>
              <p className="shredder-info-section-text">{t('shred_info_effectiveness_text')}</p>
            </div>

            <div className="shredder-info-section">
              <h4 className="shredder-info-section-title">{t('shred_info_use_cases_title')}</h4>
              <ul className="shredder-info-list">
                <li>{t('shred_info_use_case_1')}</li>
                <li>{t('shred_info_use_case_2')}</li>
                <li>{t('shred_info_use_case_3')}</li>
                <li>{t('shred_info_use_case_4')}</li>
              </ul>
            </div>

            <div className="shredder-info-section shredder-info-warnings">
              <h4 className="shredder-info-section-title">{t('shred_info_warning_title')}</h4>
              <ul className="shredder-info-list">
                <li>{t('shred_info_warning_1')}</li>
                <li>{t('shred_info_warning_2')}</li>
                <li>{t('shred_info_warning_3')}</li>
                <li>{t('shred_info_warning_4')}</li>
                <li>{t('shred_info_warning_5')}</li>
              </ul>
            </div>

            <div className="shredder-info-section shredder-info-technical">
              <h4 className="shredder-info-section-title">{t('shred_info_technical_title')}</h4>
              <p className="shredder-info-section-text">{t('shred_info_technical_text')}</p>
            </div>
          </div>
        )}
      </div>

      <div className="shredder-warning">
        <AlertTriangle size={24} className="warning-icon" />
        <div className="warning-text">
          <h3>{t('shred_warning_title')}</h3>
          <p>{t('shred_warning_text')}</p>
        </div>
      </div>

      <div className="drop-zone" onClick={isShredding ? undefined : handleSelectFile}>
        {selectedFile ? (
          <div className="selected-file">
            <File size={48} className="file-icon" />
            <div className="file-info">
              <span className="file-name">{selectedFile.split('\\').pop()}</span>
              <span className="file-path">{selectedFile}</span>
            </div>
            {!isShredding && (
              <button 
                className="change-file-btn" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectFile();
                }}
              >
                {t('shred_change_file')}
              </button>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <FileX size={48} />
            <p>{t('shred_select_file')}</p>
          </div>
        )}
      </div>

      {isShredding && (
        <div className="shredding-status">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <p>{progress === 100 ? t('shred_completed') : t('shredding_progress', { progress: progress.toString() })}</p>
        </div>
      )}

      <div className="shredder-actions">
        <button 
          className="shred-btn" 
          disabled={!selectedFile || isShredding}
          onClick={handleShred}
        >
          {isShredding ? (
            <span className="spinner"></span>
          ) : (
            <Trash2 size={18} />
          )}
          {isShredding ? t('shredding') : t('shred_securely_shred_file')}
        </button>
      </div>
    </div>
  );
};
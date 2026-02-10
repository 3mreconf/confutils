import React, { useState } from 'react';
import { X, Trash2, Globe } from 'lucide-react';
import { clearBrowserData } from '../../utils/tauri';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ProcessModal, ProcessStep } from '../UI/ProcessModal';
import './BrowserCleanerModal.css';

interface BrowserCleanerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const BrowserCleanerModal: React.FC<BrowserCleanerModalProps> = ({ isOpen, onClose }) => {
  const { showNotification } = useNotification();
  const { t } = useLanguage();
  const [selectedBrowser, setSelectedBrowser] = useState<string>('chrome');
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>(['history', 'cookies', 'cache']);
  const [showProcess, setShowProcess] = useState(false);
  const [processTitle, setProcessTitle] = useState('');
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);

  const browsers = [
    { id: 'chrome', name: 'Google Chrome', icon: Globe },
    { id: 'edge', name: 'Microsoft Edge', icon: Globe },
    { id: 'firefox', name: 'Mozilla Firefox', icon: Globe },
  ];

  const dataTypes = [
    { id: 'history', label: t('browser_history') || 'Browser History' },
    { id: 'cookies', label: t('cookies') || 'Cookies' },
    { id: 'cache', label: t('cache') || 'Cache' },
  ];

  const toggleDataType = (type: string) => {
    if (selectedDataTypes.includes(type)) {
      setSelectedDataTypes(selectedDataTypes.filter(t => t !== type));
    } else {
      setSelectedDataTypes([...selectedDataTypes, type]);
    }
  };

  const updateStep = (id: string, status: ProcessStep['status'], message?: string) => {
    setProcessSteps(prev => prev.map(step =>
      step.id === id ? { ...step, status, message } : step
    ));
  };

  const handleClean = async () => {
    if (selectedDataTypes.length === 0) {
      showNotification('warning', t('warning') || 'Warning', t('select_data_types') || 'Please select at least one data type');
      return;
    }

    setProcessTitle(t('cleaning_browser_data') || 'Cleaning Browser Data');
    setProcessSteps([
      { id: '1', title: t('browser_cleaner_step_1') || 'Preparing...', status: 'pending' },
      { id: '2', title: t('browser_cleaner_step_2') || 'Cleaning browser data...', status: 'pending' },
      { id: '3', title: t('browser_cleaner_step_3') || 'Finalizing...', status: 'pending' },
    ]);
    setShowProcess(true);

    try {
      updateStep('1', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('1', 'completed', t('browser_cleaner_step_1_completed') || 'Ready');

      updateStep('2', 'running');
      const result = await clearBrowserData(selectedBrowser, selectedDataTypes);
      updateStep('2', 'completed', result);

      updateStep('3', 'running');
      await new Promise(resolve => setTimeout(resolve, 500));
      updateStep('3', 'completed', t('browser_cleaner_step_3_completed') || 'Completed');

      showNotification('success', t('success'), t('browser_data_cleared') || 'Browser data cleared successfully');
      onClose();
    } catch (error) {
      const currentStep = processSteps.find(s => s.status === 'running')?.id || '3';
      updateStep(currentStep, 'error', `${error}`);
      showNotification('error', t('error'), `${error}`);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="browser-cleaner-modal">
        <div className="modal-header">
          <h2>{t('browser_cleaner_title') || 'Browser Cleaner'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="browser-selection">
            <h3>{t('select_browser') || 'Select Browser'}</h3>
            <div className="browser-options">
              {browsers.map((browser) => {
                const BrowserIcon = browser.icon;
                return (
                  <button
                    key={browser.id}
                    className={`browser-option ${selectedBrowser === browser.id ? 'active' : ''}`}
                    onClick={() => setSelectedBrowser(browser.id)}
                  >
                    <BrowserIcon size={20} />
                    <span>{browser.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="data-types-selection">
            <h3>{t('select_data_types') || 'Select Data Types'}</h3>
            <div className="data-types-options">
              {dataTypes.map((type) => (
                <label key={type.id} className="data-type-option">
                  <input
                    type="checkbox"
                    checked={selectedDataTypes.includes(type.id)}
                    onChange={() => toggleDataType(type.id)}
                  />
                  <span>{type.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onClose}>
            {t('cancel') || 'Cancel'}
          </button>
          <button className="clean-btn" onClick={handleClean}>
            <Trash2 size={18} />
            {t('clean_now') || 'Clean Now'}
          </button>
        </div>
      </div>

      <ProcessModal
        isOpen={showProcess}
        title={processTitle}
        steps={processSteps}
        onClose={() => setShowProcess(false)}
      />
    </>
  );
};

export default BrowserCleanerModal;


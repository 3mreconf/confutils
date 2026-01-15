import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import './ProcessModal.css';

export interface ProcessStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  message?: string;
}

interface ProcessModalProps {
  isOpen: boolean;
  title: string;
  steps: ProcessStep[];
  onClose?: () => void;
}

export const ProcessModal: React.FC<ProcessModalProps> = ({
  isOpen,
  title,
  steps,
  onClose
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;
  const hasError = steps.some(s => s.status === 'error');
  const allCompleted = completedSteps === totalSteps && !hasError;

  const modalContent = (
    <div className="process-modal-overlay">
      <div className="process-modal-content">
        <div className="process-modal-header">
          <h2 className="process-modal-title">{title}</h2>
          <div className="process-progress-text">
            {allCompleted ? (
              <span className="process-complete">Tamamlandı</span>
            ) : hasError ? (
              <span className="process-error">Hata Oluştu</span>
            ) : (
              <span>{completedSteps} / {totalSteps}</span>
            )}
          </div>
        </div>

        <div className="process-progress-bar-container">
          <div
            className={`process-progress-bar ${allCompleted ? 'complete' : ''} ${hasError ? 'error' : ''}`}
            style={{ width: `${progress}%` }}
          >
            <div className="process-progress-shine"></div>
          </div>
        </div>

        <div className="process-steps">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`process-step process-step-${step.status}`}
            >
              <div className="process-step-icon">
                {step.status === 'pending' && (
                  <div className="step-icon-pending"></div>
                )}
                {step.status === 'running' && (
                  <Loader2 className="step-icon-spinning" size={20} />
                )}
                {step.status === 'completed' && (
                  <CheckCircle2 className="step-icon-success" size={20} />
                )}
                {step.status === 'error' && (
                  <XCircle className="step-icon-error" size={20} />
                )}
              </div>
              <div className="process-step-content">
                <div className="process-step-title">{step.title}</div>
                {step.message && (
                  <div className="process-step-message">{step.message}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {(allCompleted || hasError) && onClose && (
          <div className="process-modal-footer">
            <button className="process-close-btn" onClick={onClose}>
              {allCompleted ? 'Kapat' : 'Tamam'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

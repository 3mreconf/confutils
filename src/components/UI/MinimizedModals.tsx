import React from 'react';
import { Maximize2, X, Loader, CheckCircle, XCircle } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';
import './MinimizedModals.css';

export const MinimizedModals: React.FC = () => {
  const { modals, maximizeModal, closeModal } = useModal();

  const minimizedModals = modals.filter(m => m.isMinimized);

  if (minimizedModals.length === 0) return null;

  const getStatusIcon = (status?: 'idle' | 'running' | 'success' | 'error') => {
    switch (status) {
      case 'running':
        return <Loader size={16} className="status-icon spinning" />;
      case 'success':
        return <CheckCircle size={16} className="status-icon status-success" />;
      case 'error':
        return <XCircle size={16} className="status-icon status-error" />;
      default:
        return null;
    }
  };

  return (
    <div className="minimized-modals-container">
      {minimizedModals.map(modal => (
        <div key={modal.id} className={`minimized-modal minimized-modal-${modal.status || 'idle'}`}>
          <div className="minimized-modal-content" onClick={() => maximizeModal(modal.id)}>
            {getStatusIcon(modal.status)}
            <div className="minimized-modal-info">
              <span className="minimized-modal-title">{modal.title}</span>
              {modal.description && (
                <span className="minimized-modal-description">{modal.description}</span>
              )}
            </div>
          </div>
          <div className="minimized-modal-actions">
            <button
              className="minimized-modal-btn"
              onClick={() => maximizeModal(modal.id)}
              title="Maximize"
            >
              <Maximize2 size={16} />
            </button>
            <button
              className="minimized-modal-btn minimized-modal-close"
              onClick={() => closeModal(modal.id)}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

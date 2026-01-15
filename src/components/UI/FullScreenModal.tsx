import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModal } from '../../contexts/ModalContext';
import './FullScreenModal.css';

interface FullScreenModalProps {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose?: () => void;
  onMinimize?: () => void;
}

export const FullScreenModal: React.FC<FullScreenModalProps> = ({ 
  id, 
  title, 
  description, 
  children,
  onClose,
  onMinimize 
}) => {
  const { closeModal, minimizeModal } = useModal();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (id) {
      closeModal(id);
    }
  };

  const handleMinimize = () => {
    if (onMinimize) {
      onMinimize();
    } else if (id) {
      minimizeModal(id);
    }
  };

  const modalContent = (
    <div className="fullscreen-modal-overlay">
      <div className="fullscreen-modal-container">
        <div className="fullscreen-modal-header">
          <div className="fullscreen-modal-header-content">
            <h2>{title}</h2>
            {description && <p className="fullscreen-modal-description">{description}</p>}
          </div>
          <div className="fullscreen-modal-header-actions">
            <button
              className="fullscreen-modal-action-btn"
              onClick={handleMinimize}
              title="Minimize"
            >
              <span className="minimize-icon">−</span>
            </button>
            <button
              className="fullscreen-modal-action-btn fullscreen-modal-close-btn"
              onClick={handleClose}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="fullscreen-modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(modalContent, document.body);
};

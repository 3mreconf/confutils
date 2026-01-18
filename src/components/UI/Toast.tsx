import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useNotification } from '../../contexts/NotificationContext';
import './Toast.css';

export const ToastContainer = () => {
  const { notifications, removeNotification } = useNotification();

  return createPortal(
    <div className="toast-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          id={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          action={notification.action}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>,
    document.body
  );
};

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: { label: string; onClick: () => void };
  onClose: () => void;
}

const Toast = ({ type, title, message, action, onClose }: ToastProps) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const Icon = icons[type];

  const handleActionClick = () => {
    if (action) {
      action.onClick();
      onClose();
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        <div className="toast-title">{title}</div>
        <div className="toast-message">{message}</div>
        {action && (
          <div className="toast-actions">
            <button
              className="toast-action"
              type="button"
              onClick={handleActionClick}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
      <button
        className="toast-close"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

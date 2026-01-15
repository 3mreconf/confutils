import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';
import './FormComponents.css';

export interface ActionButtonProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'danger' | 'success' | 'warning';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  label,
  onClick,
  icon: Icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  size = 'medium',
}) => {
  return (
    <button
      className={`action-button ${variant} ${fullWidth ? 'full-width' : ''} ${size} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <Loader2 size={16} className="spinner" />
      ) : Icon ? (
        <Icon size={16} />
      ) : null}
      {label}
    </button>
  );
};

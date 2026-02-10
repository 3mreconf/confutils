import React from 'react';
import './FormComponents.css';

export interface FormCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
}

export const FormCheckbox: React.FC<FormCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  description,
}) => {
  return (
    <label className={`checkbox-label ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <div className="checkbox-content">
        <span className="checkbox-label-text">{label}</span>
        {description && <small className="checkbox-description">{description}</small>}
      </div>
    </label>
  );
};

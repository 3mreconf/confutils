import React from 'react';
import './FormComponents.css';

export interface FormInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'password' | 'number' | 'textarea';
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: string;
  required?: boolean;
  min?: number;
  max?: number;
  rows?: number;
  autoComplete?: string;
  error?: string;
  warning?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  disabled = false,
  readOnly = false,
  hint,
  required = false,
  min,
  max,
  rows = 3,
  autoComplete = 'off',
  error,
  warning = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    let newValue = e.target.value;

    if (type === 'number') {
      const numValue = Number(newValue);
      if (min !== undefined && numValue < min) newValue = String(min);
      if (max !== undefined && numValue > max) newValue = String(max);
    }

    onChange(newValue);
  };

  return (
    <div className="form-group">
      <label className={warning ? 'warning-label' : ''}>
        {label}
        {required && <span className="required-indicator">*</span>}
      </label>

      {type === 'textarea' ? (
        <textarea
          className={`input-field ${error ? 'input-error' : ''} ${warning ? 'input-warning' : ''}`}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          required={required}
        />
      ) : (
        <input
          className={`input-field ${error ? 'input-error' : ''} ${warning ? 'input-warning' : ''}`}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          min={min}
          max={max}
          autoComplete={autoComplete}
        />
      )}

      {hint && !error && <small className={warning ? 'warning-text' : ''}>{hint}</small>}
      {error && <small className="error-text">{error}</small>}
    </div>
  );
};

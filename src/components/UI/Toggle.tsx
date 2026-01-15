import React from 'react';

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({
  enabled,
  onChange,
  disabled = false,
}) => {
  return (
    <button
      className={`toggle-switch ${enabled ? 'active' : ''}`}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      aria-checked={enabled}
      role="switch"
    />
  );
};

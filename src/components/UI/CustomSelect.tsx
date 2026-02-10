import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

interface CustomSelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <>
      <div className={`custom-select ${disabled ? 'disabled' : ''}`}>
        <button
          ref={triggerRef}
          className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          type="button"
        >
          <span className="custom-select-value">{selectedOption?.label}</span>
          <ChevronDown className={`custom-select-arrow ${isOpen ? 'rotated' : ''}`} size={18} />
        </button>
      </div>

      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          className="custom-select-dropdown"
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
              type="button"
            >
              <span className="option-label">{option.label}</span>
              {option.value === value && (
                <div className="option-indicator"></div>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
};

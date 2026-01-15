import React, { useState, useEffect, memo, useCallback } from 'react';
import { LucideIcon, Info } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { CustomSelect } from '../UI/CustomSelect';
import { useLanguage } from '../../contexts/LanguageContext';
import './UtilityCard.css';

interface UtilityCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionType?: 'toggle' | 'button' | 'select' | 'custom';
  actionLabel?: string;
  defaultEnabled?: boolean;
  onAction?: (enabled: boolean) => Promise<void>;
  selectOptions?: { value: string; label: string }[];
  selectedValue?: string;
  onSelectChange?: (value: string) => void;
  onExecute?: () => Promise<void>;
  badge?: {
    text: string;
    type: 'success' | 'warning' | 'error' | 'info';
  };
  detailedInfo?: {
    description: string;
    features?: string[];
    requirements?: string[];
    warnings?: string[];
    technicalDetails?: string;
  };
  variant?: string;
  onClick?: () => void | Promise<void>;
  children?: React.ReactNode;
}

const UtilityCardComponent: React.FC<UtilityCardProps> = ({
  icon: Icon,
  title,
  description,
  actionType = 'button',
  actionLabel = 'Execute',
  defaultEnabled = false,
  onAction,
  selectOptions,
  selectedValue,
  onSelectChange,
  onExecute,
  badge,
  detailedInfo,
  variant: _variant,
  onClick,
  children,
}) => {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [loading, setLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    setEnabled(defaultEnabled);
  }, [defaultEnabled]);

  const handleToggle = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    const newState = !enabled;

    try {
      if (onAction) {
        await onAction(newState);
      }
      setEnabled(newState);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, enabled, onAction]);

  const handleButton = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (onClick) {
        await onClick();
      } else if (onAction) {
        await onAction(true);
      }
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, onClick, onAction]);

  const handleExecute = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (onExecute) {
        await onExecute();
      }
    } catch (error) {
      console.error('Execute failed:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, onExecute]);

  return (
    <>
      <div className="utility-card card">
        <div className="card-header">
          <div className="card-title-row">
            <div className="card-title">
              <Icon className="card-icon" />
              {title}
            </div>
            {detailedInfo && (
              <button
                className="info-btn"
                onClick={() => setShowInfo(true)}
                title={t('info_modal_tooltip')}
              >
                <Info size={18} />
              </button>
            )}
          </div>
          {badge && (
            <span className={`badge badge-${badge.type}`}>{badge.text}</span>
          )}
        </div>
      
      <p className="card-description">{description}</p>
      
      <div className="card-footer">
        {actionType === 'toggle' ? (
          <>
            <span className="action-status">
              {enabled ? t('enabled_status') : t('disabled_status')}
            </span>
            <button
              className={`toggle-switch ${enabled ? 'active' : ''}`}
              onClick={handleToggle}
              disabled={loading}
            >
              {loading && <div className="spinner"></div>}
            </button>
          </>
        ) : actionType === 'select' ? (
          <div className="select-action-group">
            <CustomSelect
              options={selectOptions || []}
              value={selectedValue || ''}
              onChange={(value) => onSelectChange?.(value)}
              disabled={loading}
            />
            <button
              className="btn btn-primary"
              onClick={handleExecute}
              disabled={loading}
            >
              {loading && <div className="spinner"></div>}
              {!loading && actionLabel}
            </button>
          </div>
        ) : actionType === 'custom' ? (
          <div className="custom-action-content">
            {children}
          </div>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleButton}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                {t('processing_button')}
              </>
            ) : (
              actionLabel
            )}
          </button>
        )}
      </div>
    </div>

    {detailedInfo && (
      <Modal
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title={title}
        size="medium"
      >
        <div className="info-modal-content">
          <p className="info-description">{detailedInfo.description}</p>

          {detailedInfo.features && detailedInfo.features.length > 0 && (
            <div className="info-section">
              <h3 className="info-section-title">{t('info_modal_features_title')}</h3>
              <ul className="info-list">
                {detailedInfo.features.map((feature, idx) => (
                  <li key={idx}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {detailedInfo.requirements && detailedInfo.requirements.length > 0 && (
            <div className="info-section">
              <h3 className="info-section-title">{t('info_modal_requirements_title')}</h3>
              <ul className="info-list">
                {detailedInfo.requirements.map((req, idx) => (
                  <li key={idx}>{req}</li>
                ))}
              </ul>
            </div>
          )}

          {detailedInfo.warnings && detailedInfo.warnings.length > 0 && (
            <div className="info-section info-warnings">
              <h3 className="info-section-title">{t('info_modal_warnings_title')}</h3>
              <ul className="info-list">
                {detailedInfo.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {detailedInfo.technicalDetails && (
            <div className="info-section info-technical">
              <h3 className="info-section-title">{t('info_modal_technical_details_title')}</h3>
              <p className="info-technical-text">{detailedInfo.technicalDetails}</p>
            </div>
          )}
        </div>
      </Modal>
    )}
  </>
  );
};

export const UtilityCard = memo(UtilityCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.actionType === nextProps.actionType &&
    prevProps.actionLabel === nextProps.actionLabel &&
    prevProps.defaultEnabled === nextProps.defaultEnabled &&
    prevProps.selectedValue === nextProps.selectedValue &&
    prevProps.onAction === nextProps.onAction &&
    prevProps.onClick === nextProps.onClick &&
    prevProps.onExecute === nextProps.onExecute &&
    prevProps.onSelectChange === nextProps.onSelectChange &&
    JSON.stringify(prevProps.badge) === JSON.stringify(nextProps.badge) &&
    JSON.stringify(prevProps.selectOptions) === JSON.stringify(nextProps.selectOptions) &&
    JSON.stringify(prevProps.detailedInfo) === JSON.stringify(nextProps.detailedInfo)
  );
});

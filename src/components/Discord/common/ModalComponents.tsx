import React from 'react';
import { LucideIcon } from 'lucide-react';
import '../DiscordModal.css';

export interface ModalHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ icon: Icon, title, description }) => {
  return (
    <div className="modal-header">
      <div className="modal-header-content">
        <div className="modal-header-icon">
          <Icon size={24} />
        </div>
        <div className="modal-header-text">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
};

export interface SectionCardProps {
  title: string;
  badge?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, badge, icon: Icon, children, actions }) => {
  return (
    <div className="section-card">
      <div className="section-card-header">
        <div className="section-card-title">
          {Icon && <Icon size={18} />}
          <h3>{title}</h3>
          {badge && <span className="section-card-badge">{badge}</span>}
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div className="section-card-body">
        {children}
      </div>
    </div>
  );
};

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div className="stat-card-value">
        {value}
        {Icon && <Icon size={20} />}
      </div>
    </div>
  );
};

export interface StatsGridProps {
  stats: StatCardProps[];
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="stats-grid">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
};

export interface InfoBoxProps {
  title?: string;
  children: React.ReactNode;
  type?: 'info' | 'warning' | 'error' | 'success';
  icon?: LucideIcon;
}

export const InfoBox: React.FC<InfoBoxProps> = ({ title, children, type = 'info', icon: Icon }) => {
  return (
    <div className={`info-box ${type}`}>
      {title && (
        <h4>
          {Icon && <Icon size={16} />}
          {title}
        </h4>
      )}
      {children}
    </div>
  );
};

export interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ label, current, total }) => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;

  return (
    <div className="progress-container">
      <div className="progress-label">
        <span>{label}</span>
        <span>{current} / {total}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2;
}

export const FormGrid: React.FC<FormGridProps> = ({ children, columns = 1 }) => {
  return (
    <div className={`form-grid ${columns === 2 ? 'two-columns' : ''}`}>
      {children}
    </div>
  );
};
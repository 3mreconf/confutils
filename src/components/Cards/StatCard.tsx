import { LucideIcon } from 'lucide-react';
import './StatCard.css';

interface StatCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  subtitle?: string;
  percent?: number;
  color?: 'cyan' | 'green' | 'yellow' | 'red';
}

export const StatCard = ({
  icon: Icon,
  title,
  value,
  subtitle,
  percent,
  color = 'cyan'
}: StatCardProps) => {
  return (
    <div className={`stat-card glass stat-card-${color}`}>
      <div className="stat-header">
        <div className="stat-icon-wrapper">
          <Icon className="stat-icon" />
        </div>
        <span className="stat-title">{title}</span>
      </div>
      
      <div className="stat-value">{value}</div>
      
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      
      {percent !== undefined && (
        <div className="stat-progress">
          <div 
            className={`stat-progress-bar stat-progress-${color}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

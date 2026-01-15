import React from 'react';

interface SkeletonProps {
  variant?: 'text' | 'title' | 'card' | 'circular';
  width?: string;
  height?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
}) => {
  const getSkeletonClass = () => {
    switch (variant) {
      case 'text':
        return 'skeleton skeleton-text';
      case 'title':
        return 'skeleton skeleton-title';
      case 'card':
        return 'skeleton skeleton-card';
      case 'circular':
        return 'skeleton';
      default:
        return 'skeleton';
    }
  };

  const style: React.CSSProperties = {
    width: width || undefined,
    height: height || undefined,
    borderRadius: variant === 'circular' ? '50%' : undefined,
  };

  return <div className={`${getSkeletonClass()} ${className}`} style={style} />;
};

interface SkeletonGroupProps {
  count?: number;
  variant?: 'text' | 'title' | 'card';
}

export const SkeletonGroup: React.FC<SkeletonGroupProps> = ({
  count = 3,
  variant = 'text',
}) => {
  return (
    <div className="skeleton-group">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant={variant} />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card-wrapper">
      <div className="skeleton-card-header">
        <Skeleton variant="circular" width="40px" height="40px" />
        <Skeleton variant="title" width="60%" />
      </div>
      <SkeletonGroup count={2} variant="text" />
      <Skeleton width="120px" height="36px" />
    </div>
  );
};

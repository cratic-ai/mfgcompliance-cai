// components/StatusBadge.tsx
import React from 'react';
import { getStatusColor } from '../utils/formatters';

interface StatusBadgeProps {
  status: string;
  progress?: number;
  size?: 'sm' | 'md' | 'lg';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, progress = 0, size = 'md' }) => {
  const colors = getStatusColor(status);
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const statusText = {
    queued: 'Queued',
    uploading: progress > 0 ? `Uploading ${progress}%` : 'Uploading',
    processing: progress > 0 ? `Processing ${progress}%` : 'Processing',
    ready: 'Ready',
    failed: 'Failed',
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
      >
        <span>{colors.icon}</span>
        <span>{statusText[status as keyof typeof statusText] || status}</span>
      </span>
      
      {(status === 'uploading' || status === 'processing') && progress > 0 && (
        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default StatusBadge;
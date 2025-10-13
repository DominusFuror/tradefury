import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8'
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Загружаем данные...',
  size = 'md'
}) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center space-x-3">
        <Loader2 className={`${SIZE_CLASS[size]} animate-spin text-wow-gold`} />
        <span className="text-white font-medium">{message}</span>
      </div>
    </div>
  );
};


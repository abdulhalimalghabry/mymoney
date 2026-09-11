import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({
  message = 'جارٍ تحميل البيانات المالية...',
  fullScreen = false,
  size = 'md',
}: LoadingSpinnerProps) {
  const iconSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';

  const content = (
    <div className="flex flex-col items-center justify-center p-8 text-center" dir="rtl">
      <Loader2 className={`${iconSize} animate-spin text-emerald-600 mb-3`} />
      <p className="text-sm font-bold text-slate-700">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-xs">
        {content}
      </div>
    );
  }

  return content;
}

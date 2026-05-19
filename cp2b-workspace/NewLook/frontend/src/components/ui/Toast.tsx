'use client';

import { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { type Toast as ToastItem, type ToastType, useToast } from '@/contexts/ToastContext';

const CONFIG: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-gradient-to-r from-cp2b-green to-cp2b-lime',
    border: 'border-cp2b-green',
    icon: <CheckCircle2 className="h-5 w-5 text-white flex-shrink-0" aria-hidden="true" />,
  },
  error: {
    bg: 'bg-gradient-to-r from-red-500 to-red-600',
    border: 'border-red-500',
    icon: <AlertCircle className="h-5 w-5 text-white flex-shrink-0" aria-hidden="true" />,
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    border: 'border-orange-400',
    icon: <AlertTriangle className="h-5 w-5 text-white flex-shrink-0" aria-hidden="true" />,
  },
  info: {
    bg: 'bg-gradient-to-r from-blue-500 to-blue-600',
    border: 'border-blue-500',
    icon: <Info className="h-5 w-5 text-white flex-shrink-0" aria-hidden="true" />,
  },
};

interface ToastProps {
  toast: ToastItem;
}

export default function Toast({ toast }: ToastProps) {
  const { removeToast } = useToast();
  const cfg = CONFIG[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className="w-80 max-w-full animate-in slide-in-from-right-5 fade-in duration-300"
    >
      <div className={`${cfg.bg} text-white rounded-lg shadow-2xl border-2 ${cfg.border} overflow-hidden`}>
        <div className="flex items-start gap-3 p-4">
          <div className="mt-0.5">{cfg.icon}</div>
          <p className="flex-1 text-sm leading-relaxed text-white/95">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 rounded"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {/* Shrinking progress bar */}
        <div className="h-1 bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white/40 animate-progress"
            style={{ animationDuration: `${toast.duration}ms` }}
          />
        </div>
      </div>
    </div>
  );
}

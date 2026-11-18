'use client';

import React, { createContext, useContext, useState, useCallback, useId } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const baseId = useId();
  const counterRef = React.useRef(0);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `${baseId}-${++counterRef.current}`;
    setToasts((prev) => {
      const next = [...prev, { id, message, type, duration }];
      // Cap at 5 visible toasts
      return next.slice(-5);
    });
  }, [baseId]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

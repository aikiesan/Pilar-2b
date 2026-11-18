'use client';

import { useToast } from '@/contexts/ToastContext';
import Toast from './Toast';

export default function ToastContainer() {
  const { toasts } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notifications"
      className="fixed top-20 right-4 z-[300] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} />
        </div>
      ))}
    </div>
  );
}

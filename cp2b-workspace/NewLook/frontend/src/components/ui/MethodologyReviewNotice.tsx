'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MethodologyReviewNoticeProps {
  compact?: boolean;
  className?: string;
}

export default function MethodologyReviewNotice({
  compact = false,
  className = '',
}: MethodologyReviewNoticeProps) {
  const t = useTranslations('MethodologyReview');

  return (
    <div
      role="status"
      className={`flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 text-amber-900 ${
        compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-2 text-xs'
      } ${className}`}
    >
      <AlertTriangle className={compact ? 'h-3 w-3 shrink-0' : 'h-4 w-4 shrink-0'} />
      <span>{t('label')}</span>
    </div>
  );
}

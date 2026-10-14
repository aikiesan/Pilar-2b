'use client'

/**
 * Share a municipality page: WhatsApp, LinkedIn, copy link. The two networks are
 * plain links (they work without JavaScript); copying says what happened in a
 * polite live region, and gives the address when the clipboard is refused.
 */
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react'

interface ShareLinksProps {
  url: string
  /** The message sent with the link. */
  text: string
}

const BUTTON =
  'inline-flex min-h-[44px] items-center gap-2 border border-line bg-paper-raised px-4 text-sm font-medium text-ink hover:border-line-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terra-700'

export default function ShareLinks({ url, text }: ShareLinksProps) {
  const t = useTranslations('municipality_profile.share')
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setStatus('copied')
    } catch {
      setStatus('failed')
    }
  }

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

  return (
    <div>
      <ul className="flex flex-wrap gap-2">
        <li>
          <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BUTTON}>
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            {t('whatsapp')}
            <span className="sr-only"> {t('new_window')}</span>
          </a>
        </li>
        <li>
          <a href={linkedin} target="_blank" rel="noopener noreferrer" className={BUTTON}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            {t('linkedin')}
            <span className="sr-only"> {t('new_window')}</span>
          </a>
        </li>
        <li>
          <button type="button" onClick={copy} className={BUTTON}>
            {status === 'copied' ? (
              <Check className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Link2 className="h-4 w-4" aria-hidden="true" />
            )}
            {t('copy')}
          </button>
        </li>
      </ul>
      <p role="status" className="mt-2 min-h-[1.25rem] break-words text-sm text-ink-muted">
        {status === 'copied' ? t('copied') : status === 'failed' ? t('copy_failed', { url }) : ''}
      </p>
    </div>
  )
}

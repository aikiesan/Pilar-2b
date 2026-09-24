'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import { useDialog } from '@/hooks/useDialog'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
}

/**
 * VideoModal Component
 * Accessible modal for displaying video content (YouTube, Vimeo, or direct video)
 *
 * @param isOpen - Controls modal visibility
 * @param onClose - Callback when modal is closed
 * @param videoUrl - URL of the video (YouTube, Vimeo, or direct video file)
 * @param title - Title for accessibility
 */
export default function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  const t = useTranslations('videoModal')
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Escape, focus trap, scroll lock and focus return; focus starts on Close.
  const modalRef = useDialog<HTMLDivElement>(isOpen, onClose, closeButtonRef)

  if (!isOpen) return null

  // Detect video type and create appropriate embed
  const getEmbedUrl = (url: string): string => {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return ''
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return ''

    const host = parsed.hostname.replace(/^www\./, '')
    if (host === 'youtube.com' || host === 'youtu.be') {
      const videoId = host === 'youtu.be'
        ? parsed.pathname.slice(1).split('?')[0]
        : parsed.searchParams.get('v') ?? ''
      if (!videoId) return ''
      return `https://www.youtube.com/embed/${videoId}?autoplay=1`
    }
    if (host === 'vimeo.com') {
      const videoId = parsed.pathname.slice(1).split('?')[0]
      if (!videoId) return ''
      return `https://player.vimeo.com/video/${videoId}?autoplay=1`
    }
    return ''
  }

  return (
    <>
      {/* Clicking the backdrop closes; Escape does the same from the keyboard (useDialog). */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- keyboard: Escape */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-modal-title"
          className="relative w-full max-w-5xl mx-4 animate-scale-in"
        >
          {/* Close Button */}
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="absolute -top-12 right-0 p-2 text-white hover:text-cp2b-lime transition-colors focus:outline-none focus:ring-2 focus:ring-cp2b-lime rounded-lg"
            aria-label={t('close')}
          >
            <X className="w-8 h-8" aria-hidden="true" />
          </button>

          {/* Video Container */}
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden shadow-2xl">
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={title}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Title */}
          <h2 id="video-modal-title" className="sr-only">
            {title}
          </h2>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes scale-in {
            from {
              transform: scale(0.9);
              opacity: 0;
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }

          .animate-fade-in {
            animation: fade-in 0.2s ease-out;
          }

          .animate-scale-in {
            animation: scale-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </>
  )
}

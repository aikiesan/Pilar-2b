'use client'

import { useEffect, useRef, useState } from 'react'
import { Calendar, CheckCircle2 } from 'lucide-react'

export interface TimelineEvent {
  date: string
  title: string
  description: string
  icon?: React.ReactNode
  status?: 'completed' | 'in-progress' | 'upcoming'
  details?: string[]
}

interface TimelineProps {
  events: TimelineEvent[]
  className?: string
}

/**
 * Timeline Component
 * Interactive vertical timeline with scroll-based animations
 *
 * @param events - Array of timeline events
 * @param className - Additional CSS classes
 */
export default function Timeline({ events, className = '' }: TimelineProps) {
  const [visibleEvents, setVisibleEvents] = useState<Set<number>>(new Set())
  const eventRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers = events.map((_, index) => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleEvents((prev) => new Set(prev).add(index))
          }
        },
        { threshold: 0.2 }
      )

      if (eventRefs.current[index]) {
        observer.observe(eventRefs.current[index]!)
      }

      return observer
    })

    return () => {
      observers.forEach((observer) => observer.disconnect())
    }
  }, [events])

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-300'
      case 'in-progress':
        return 'bg-amber-500 border-amber-300 animate-pulse'
      case 'upcoming':
        return 'bg-gray-300 border-gray-200'
      default:
        return 'bg-cp2b-green border-cp2b-lime'
    }
  }

  const getStatusIcon = (event: TimelineEvent) => {
    if (event.icon) return event.icon
    if (event.status === 'completed') return <CheckCircle2 className="w-5 h-5" />
    return <Calendar className="w-5 h-5" />
  }

  return (
    <div className={`relative ${className}`}>
      {/* Vertical Line */}
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cp2b-lime via-cp2b-green to-cp2b-dark-green" />

      {/* Timeline Events */}
      <div className="space-y-8">
        {events.map((event, index) => (
          <div
            key={index}
            ref={(el) => {
              eventRefs.current[index] = el
            }}
            className={`relative pl-20 transition-all duration-700 ${
              visibleEvents.has(index)
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-8'
            }`}
            style={{ transitionDelay: `${index * 100}ms` }}
          >
            {/* Timeline Dot */}
            <div
              className={`absolute left-5 top-0 w-6 h-6 rounded-full border-2 ${getStatusColor(
                event.status
              )} flex items-center justify-center text-white z-10`}
            >
              {getStatusIcon(event)}
            </div>

            {/* Event Card */}
            <div className="group bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-lg hover:border-cp2b-lime dark:hover:border-emerald-500 transition-all duration-300">
              {/* Date Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cp2b-lime-light rounded-full text-cp2b-dark-green text-xs font-semibold mb-3">
                <Calendar className="w-3 h-3" />
                {event.date}
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-cp2b-green transition-colors">
                {event.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                {event.description}
              </p>

              {/* Details List */}
              {event.details && event.details.length > 0 && (
                <ul className="space-y-2 mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                  {event.details.map((detail, detailIndex) => (
                    <li
                      key={detailIndex}
                      className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-cp2b-green flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Status Badge */}
              {event.status && (
                <div className="mt-4">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : event.status === 'in-progress'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {event.status === 'completed' && '✓ Concluído'}
                    {event.status === 'in-progress' && '⚡ Em Andamento'}
                    {event.status === 'upcoming' && '⏳ Planejado'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

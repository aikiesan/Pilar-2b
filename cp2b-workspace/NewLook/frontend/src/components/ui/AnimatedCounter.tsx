'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormat } from '@/hooks/useFormat'

interface AnimatedCounterProps {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
  decimals?: number
  /** Short form for large magnitudes: 4.6e9 -> "4.6B" (en) / "4,6 bi" (pt-BR). */
  compact?: boolean
  className?: string
}

/**
 * AnimatedCounter Component
 * Animates a number from 0 to the target value when it comes into view
 *
 * @param end - Target number to count to
 * @param duration - Animation duration in milliseconds (default: 2000)
 * @param suffix - Text to append after the number (e.g., "M", "%")
 * @param prefix - Text to prepend before the number (e.g., "$", "R$")
 * @param decimals - Number of decimal places to show (default: 0)
 * @param compact - Show large magnitudes in short form, in the page's locale
 * @param className - Additional CSS classes
 */
export default function AnimatedCounter({
  end,
  duration = 2000,
  suffix = '',
  prefix = '',
  decimals = 0,
  compact = false,
  className = ''
}: AnimatedCounterProps) {
  const format = useFormat()
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const counterRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (counterRef.current) {
      observer.observe(counterRef.current)
    }

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null
    const startValue = 0

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      // Easing function for smooth animation (easeOutQuart)
      const easeOut = 1 - Math.pow(1 - progress, 4)
      const currentCount = startValue + (end - startValue) * easeOut

      setCount(currentCount)

      if (progress < 1) {
        requestAnimationFrame(animate)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(animate)
  }, [isVisible, end, duration])

  const formatNumber = (value: number) =>
    compact
      ? format.compact(value, { decimals })
      : format.number(value, { decimals, minDecimals: decimals })

  return (
    <span ref={counterRef} className={className} aria-live="polite">
      {prefix}{formatNumber(count)}{suffix}
    </span>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

interface ParallaxSectionProps {
  children: React.ReactNode
  speed?: number
  className?: string
  direction?: 'up' | 'down'
}

/**
 * ParallaxSection Component
 * Creates a parallax scrolling effect on the section
 *
 * @param children - Content to render
 * @param speed - Parallax speed multiplier (0.1 - 1.0, default: 0.5)
 * @param className - Additional CSS classes
 * @param direction - Scroll direction ('up' or 'down', default: 'up')
 */
export default function ParallaxSection({
  children,
  speed = 0.5,
  className = '',
  direction = 'up'
}: ParallaxSectionProps) {
  const [offset, setOffset] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return

      const rect = sectionRef.current.getBoundingClientRect()
      const scrolled = window.scrollY
      const elementTop = rect.top + scrolled
      const windowHeight = window.innerHeight

      // Calculate parallax offset when element is in viewport
      if (scrolled + windowHeight > elementTop && scrolled < elementTop + rect.height) {
        const parallaxOffset = (scrolled - elementTop) * speed
        setOffset(direction === 'up' ? -parallaxOffset : parallaxOffset)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial calculation

    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed, direction])

  return (
    <div ref={sectionRef} className={`relative overflow-hidden ${className}`}>
      <div
        style={{
          transform: `translateY(${offset}px)`,
          transition: 'transform 0.1s ease-out'
        }}
      >
        {children}
      </div>
    </div>
  )
}

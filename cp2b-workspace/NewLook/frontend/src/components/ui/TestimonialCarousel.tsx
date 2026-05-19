'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'

export interface Testimonial {
  name: string
  role: string
  organization: string
  content: string
  image?: string
  rating?: number
}

interface TestimonialCarouselProps {
  testimonials: Testimonial[]
  autoPlay?: boolean
  interval?: number
  className?: string
}

/**
 * TestimonialCarousel Component
 * Accessible carousel for displaying testimonials and use cases
 *
 * @param testimonials - Array of testimonial objects
 * @param autoPlay - Enable auto-advance (default: true)
 * @param interval - Time between slides in ms (default: 6000)
 * @param className - Additional CSS classes
 */
export default function TestimonialCarousel({
  testimonials,
  autoPlay = true,
  interval = 6000,
  className = ''
}: TestimonialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Auto-advance carousel
  useEffect(() => {
    if (!autoPlay || isPaused || testimonials.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, isPaused, testimonials.length, interval])

  const goToSlide = (index: number) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  if (testimonials.length === 0) {
    return null
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role="region"
      aria-label="Depoimentos de usuários"
    >
      {/* Main Testimonial Card */}
      <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl p-8 md:p-12 shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {/* Background Quote Icon */}
        <div className="absolute top-8 right-8 opacity-5">
          <Quote className="w-32 h-32 text-cp2b-green" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          {/* Quote Icon */}
          <div className="mb-6">
            <Quote className="w-10 h-10 text-cp2b-green" />
          </div>

          {/* Testimonial Content */}
          <blockquote className="mb-8">
            <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 leading-relaxed italic">
              &quot;{currentTestimonial.content}&quot;
            </p>
          </blockquote>

          {/* Author Info */}
          <div className="flex items-center gap-4">
            {currentTestimonial.image && (
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cp2b-lime flex-shrink-0">
                <Image
                  src={currentTestimonial.image}
                  alt={currentTestimonial.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <div className="font-bold text-gray-900 dark:text-gray-100">
                {currentTestimonial.name}
              </div>
              <div className="text-sm text-cp2b-green font-medium">
                {currentTestimonial.role}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {currentTestimonial.organization}
              </div>
            </div>
          </div>

          {/* Rating */}
          {currentTestimonial.rating && (
            <div className="mt-4 flex gap-1" aria-label={`Avaliação: ${currentTestimonial.rating} de 5 estrelas`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${
                    i < currentTestimonial.rating!
                      ? 'text-amber-400 fill-current'
                      : 'text-gray-300'
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Arrows */}
      {testimonials.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white dark:bg-slate-700 shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cp2b-lime"
            aria-label="Depoimento anterior"
          >
            <ChevronLeft className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white dark:bg-slate-700 shadow-lg hover:bg-gray-50 dark:hover:bg-slate-600 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-cp2b-lime"
            aria-label="Próximo depoimento"
          >
            <ChevronRight className="w-6 h-6 text-gray-700 dark:text-gray-200" />
          </button>
        </>
      )}

      {/* Pagination Dots */}
      {testimonials.length > 1 && (
        <div className="flex justify-center gap-2 mt-6" role="tablist">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cp2b-lime ${
                index === currentIndex
                  ? 'bg-cp2b-green w-8'
                  : 'bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 w-2'
              }`}
              aria-label={`Ir para depoimento ${index + 1}`}
              aria-selected={index === currentIndex}
              role="tab"
            />
          ))}
        </div>
      )}

      {/* Current Slide Indicator */}
      <div className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
        {currentIndex + 1} / {testimonials.length}
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/contexts/AuthContext'
import AnimatedCounter from '@/components/ui/AnimatedCounter'

// Lazy load below-fold and conditional components
const VideoModal = dynamic(() => import('@/components/ui/VideoModal'), { ssr: false })
const NewsletterSignup = dynamic(() => import('@/components/ui/NewsletterSignup'), { ssr: false })
import {
  ArrowRight,
  Play,
  Map,
  MapPin,
  BarChart3,
  Users,
  Layers,
  BookOpen,
  Check,
  Lock,
  UserPlus,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Download,
  FileJson,
  Sheet,
  Globe,
} from 'lucide-react'

// Animation wrapper component for fade-in effects
const FadeIn = ({
  children,
  delay = 0,
  direction = 'up',
  className = ''
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [delay])

  const directionClasses = {
    up: 'translate-y-8',
    down: '-translate-y-8',
    left: 'translate-x-8',
    right: '-translate-x-8',
  }

  return (
    <div
      ref={ref}
      className={`transform transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-x-0 translate-y-0'
          : `opacity-0 ${directionClasses[direction]}`
      } ${className}`}
    >
      {children}
    </div>
  )
}

// StatCard Component with hover animations
const StatCard = ({
  number,
  label,
  description,
  icon,
  animateValue,
  suffix = ''
}: {
  number: string
  label: string
  description: string
  icon: React.ReactNode
  animateValue?: number
  suffix?: string
}) => (
  <div className="group bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-slate-700 hover:border-cp2b-lime dark:hover:border-emerald-500 hover:shadow-xl dark:hover:shadow-dark-lg transition-all duration-500 hover:-translate-y-1">
    <div className="flex justify-center mb-3 transform group-hover:scale-110 transition-transform duration-300">
      {icon}
    </div>
    <div className="text-3xl font-bold text-cp2b-gray-900 dark:text-gray-100 mb-1 group-hover:text-cp2b-green transition-colors duration-300">
      {animateValue ? (
        <AnimatedCounter end={animateValue} duration={2000} suffix={suffix} />
      ) : (
        number
      )}
    </div>
    <div className="text-sm font-semibold text-cp2b-green dark:text-emerald-400 mb-1">
      {label}
    </div>
    <div className="text-xs text-cp2b-gray-600 dark:text-gray-400">
      {description}
    </div>
  </div>
)

// FeatureCard Component with animations
const FeatureCard = ({
  icon,
  iconColor,
  iconBg,
  title,
  description,
  features,
  ctaText,
  ctaLink,
}: {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  title: string
  description: string
  features: Array<{ text: string; link?: string }>
  ctaText: string
  ctaLink: string
}) => (
  <article className="group bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-200 dark:border-slate-700 hover:border-cp2b-lime dark:hover:border-emerald-500 hover:-translate-y-2">
    {/* Icon */}
    <div className={`inline-flex p-4 rounded-xl ${iconBg} mb-6 transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
      <div className={iconColor}>
        {icon}
      </div>
    </div>

    {/* Title */}
    <h3 className="text-xl font-bold text-cp2b-gray-900 mb-3 group-hover:text-cp2b-green transition-colors duration-300">
      {title}
    </h3>

    {/* Description */}
    <p className="text-cp2b-gray-600 mb-6 leading-relaxed">
      {description}
    </p>

    {/* Features List */}
    <ul className="space-y-3 mb-8" role="list">
      {features.map((feature, index) => (
        <li key={index} className="flex items-start gap-3 transform hover:translate-x-1 transition-transform duration-200">
          <Check className="w-5 h-5 text-cp2b-green flex-shrink-0 mt-0.5" />
          <span className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
            {feature.link ? (
              <Link
                href={feature.link}
                className="hover:text-cp2b-green transition-colors underline-offset-2 hover:underline"
              >
                {feature.text}
              </Link>
            ) : (
              feature.text
            )}
          </span>
        </li>
      ))}
    </ul>

    {/* CTA */}
    <Link
      href={ctaLink}
      className="inline-flex items-center gap-2 text-sm font-semibold text-cp2b-green hover:text-cp2b-dark-green transition-colors group/cta"
    >
      {ctaText}
      <ArrowRight className="w-4 h-4 group-hover/cta:translate-x-2 transition-transform duration-300" />
    </Link>
  </article>
)


// Animated Map Background Component
const AnimatedMapBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setCanvasSize()

    // Data points for animation
    interface DataPoint {
      x: number
      y: number
      radius: number
      opacity: number
      speed: number
      direction: number
    }

    const dataPoints: DataPoint[] = []
    const numPoints = 50

    // Initialize data points
    for (let i = 0; i < numPoints; i++) {
      dataPoints.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 0.5 + 0.1,
        direction: Math.random() * Math.PI * 2,
      })
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw SP state outline (simplified)
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(47, 125, 50, 0.1)'
      ctx.lineWidth = 2

      // Simplified São Paulo outline
      const centerX = canvas.width * 0.5
      const centerY = canvas.height * 0.5
      const scale = Math.min(canvas.width, canvas.height) * 0.3

      ctx.moveTo(centerX - scale * 0.8, centerY - scale * 0.3)
      ctx.lineTo(centerX + scale * 0.5, centerY - scale * 0.5)
      ctx.lineTo(centerX + scale * 0.8, centerY + scale * 0.2)
      ctx.lineTo(centerX + scale * 0.3, centerY + scale * 0.6)
      ctx.lineTo(centerX - scale * 0.6, centerY + scale * 0.4)
      ctx.closePath()
      ctx.stroke()

      // Animate data points
      dataPoints.forEach((point) => {
        // Update position
        point.x += Math.cos(point.direction) * point.speed
        point.y += Math.sin(point.direction) * point.speed

        // Wrap around edges
        if (point.x < 0) point.x = canvas.width
        if (point.x > canvas.width) point.x = 0
        if (point.y < 0) point.y = canvas.height
        if (point.y > canvas.height) point.y = 0

        // Draw point
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(76, 175, 80, ${point.opacity})`
        ctx.fill()
      })

      requestAnimationFrame(animate)
    }

    animate()

    // Handle resize
    window.addEventListener('resize', setCanvasSize)
    return () => window.removeEventListener('resize', setCanvasSize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  )
}

// Screenshot configuration (translations handled in component)
const screenshotKeys = ['interactive_map', 'data_analysis', 'proximity_analysis', 'scientific_basis'] as const

const screenshotImages = [
  '/screenshots/interactive-map.png',
  '/screenshots/data-analysis.png',
  '/screenshots/proximity-analysis.png',
  '/screenshots/scientific-basis.png',
]

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false)
  const { isAuthenticated } = useAuth()
  const t = useTranslations('landing')

  // Auto-advance carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % screenshotKeys.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + screenshotKeys.length) % screenshotKeys.length)
  }

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % screenshotKeys.length)
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 transition-colors">
      {/* Hero Section */}
      <section
        id="main-content"
        className="relative min-h-[85vh] flex items-center justify-center overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 z-0">
          <AnimatedMapBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-white/80 to-white/95" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cp2b-lime-light/50 border border-cp2b-lime text-cp2b-dark-green text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cp2b-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cp2b-green"></span>
            </span>
            {t('hero.badge')}
          </div>

          {/* Main Headline */}
          <FadeIn delay={100}>
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-7xl font-bold text-cp2b-gray-900 mb-12 leading-tight tracking-tight"
            >
              {t('hero.title')}{' '}
              <span className="bg-gradient-to-r from-cp2b-green via-emerald-500 to-cp2b-lime bg-clip-text text-transparent animate-gradient">
                {t('hero.title_highlight')}
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-cp2b-gray-600 max-w-3xl mx-auto leading-relaxed mb-2">
              {t('hero.subtitle')}
            </p>
          </FadeIn>

          {/* CTA Buttons */}
          <FadeIn delay={200}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 mt-8">
              <Link
                href="/map"
                className="group relative inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-white bg-gradient-to-r from-cp2b-green to-emerald-600 hover:from-cp2b-dark-green hover:to-emerald-700 rounded-2xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  {t('hero.cta_explore')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                </span>
              </Link>

              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="group inline-flex items-center gap-2 px-10 py-4 text-base font-semibold text-cp2b-green bg-white/90 backdrop-blur-sm border-2 border-cp2b-green/20 hover:border-cp2b-green hover:bg-white rounded-2xl shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cp2b-lime"
                aria-label={t('video_modal.aria_label')}
              >
                <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform duration-300" />
                {t('hero.cta_demo')}
              </button>
            </div>
          </FadeIn>

          {/* Platform Showcase - Moved here */}
          <FadeIn delay={300}>
            <div className="mb-12">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-cp2b-lime/30 text-cp2b-dark-green text-sm font-medium mb-4">
                  <Sparkles className="w-4 h-4" />
                  {t('hero.showcase_badge')}
                </div>
                <p className="text-cp2b-gray-600 max-w-2xl mx-auto">
                  {t('hero.showcase_description')}
                </p>
              </div>

              {/* Screenshot Carousel */}
              <div className="max-w-4xl mx-auto">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-cp2b-gray-900 group">
                  {/* Slides */}
                  <div className="relative aspect-video">
                    {screenshotKeys.map((key, index) => (
                      <div
                        key={key}
                        className={`absolute inset-0 transition-all duration-700 ${
                          index === currentSlide
                            ? 'opacity-100 scale-100'
                            : 'opacity-0 scale-95'
                        }`}
                      >
                        {/* Screenshot image */}
                        <Image
                          src={screenshotImages[index]}
                          alt={t(`screenshots.${key}.alt`)}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
                          className="object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                          <h4 className="text-lg font-bold text-white mb-1">
                            {t(`screenshots.${key}.caption`)}
                          </h4>
                          <p className="text-xs text-white/90 max-w-2xl">
                            {t(`screenshots.${key}.description`)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cp2b-lime hover:scale-110"
                    aria-label={t('navigation.previous')}
                  >
                    <ChevronLeft className="w-5 h-5 text-cp2b-gray-900" />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/90 hover:bg-white shadow-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cp2b-lime hover:scale-110"
                    aria-label={t('navigation.next')}
                  >
                    <ChevronRight className="w-5 h-5 text-cp2b-gray-900" />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
                    {screenshotKeys.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentSlide
                            ? 'bg-white w-6'
                            : 'bg-white/50 hover:bg-white/75 w-2'
                        }`}
                        aria-label={`${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Stats Grid */}
          <FadeIn delay={400}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <StatCard
                number="645"
                animateValue={645}
                label={t('stats.municipalities.label')}
                description={t('stats.municipalities.description')}
                icon={<MapPin className="w-7 h-7 text-cp2b-green" />}
              />

              <StatCard
                number="8"
                animateValue={8}
                label={t('stats.modules.label')}
                description={t('stats.modules.description')}
                icon={<Layers className="w-7 h-7 text-cp2b-orange" />}
              />

              <StatCard
                number="58"
                animateValue={58}
                label={t('stats.references.label')}
                description={t('stats.references.description')}
                icon={<BookOpen className="w-7 h-7 text-cp2b-lime" />}
              />

              <StatCard
                number="AA"
                label={t('stats.wcag.label')}
                description={t('stats.wcag.description')}
                icon={<Check className="w-7 h-7 text-cp2b-green" />}
              />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Features Section */}
      <section
        className="py-20 bg-gradient-to-b from-white to-gray-50"
        aria-labelledby="features-heading"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Header */}
          <FadeIn>
            <div className="text-center mb-16">
              <h2
                id="features-heading"
                className="text-3xl sm:text-4xl font-bold text-cp2b-gray-900 mb-4"
              >
                {t('features.heading')}
              </h2>
              <p className="text-lg text-cp2b-gray-600 max-w-2xl mx-auto">
                {t('features.subheading')}
              </p>
            </div>
          </FadeIn>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1: Geospatial Mapping */}
            <FadeIn delay={100} direction="up">
              <FeatureCard
                icon={<Map className="w-12 h-12" />}
                iconColor="text-cp2b-green"
                iconBg="bg-cp2b-lime-light"
                title={t('features.geospatial.title')}
                description={t('features.geospatial.description')}
                features={[
                  { text: t('features.geospatial.features.0'), link: '/map' },
                  { text: t('features.geospatial.features.1'), link: '/about' },
                  { text: t('features.geospatial.features.2') },
                  { text: t('features.geospatial.features.3') },
                ]}
                ctaText={t('features.geospatial.cta')}
                ctaLink="/map"
              />
            </FadeIn>

            {/* Feature 2: MCDA Analysis */}
            <FadeIn delay={200} direction="up">
              <FeatureCard
                icon={<BarChart3 className="w-12 h-12" />}
                iconColor="text-cp2b-orange"
                iconBg="bg-orange-100"
                title={t('features.mcda.title')}
                description={t('features.mcda.description')}
                features={[
                  { text: t('features.mcda.features.0') },
                  { text: t('features.mcda.features.1'), link: '/dashboard/advanced-analysis' },
                  { text: t('features.mcda.features.2'), link: '/dashboard/advanced-analysis' },
                  { text: t('features.mcda.features.3') },
                ]}
                ctaText={t('features.mcda.cta')}
                ctaLink="/dashboard/advanced-analysis"
              />
            </FadeIn>

            {/* Feature 3: Collaborative Platform */}
            <FadeIn delay={300} direction="up">
              <FeatureCard
                icon={<Users className="w-12 h-12" />}
                iconColor="text-blue-600"
                iconBg="bg-blue-100"
                title={t('features.collaborative.title')}
                description={t('features.collaborative.description')}
                features={[
                  { text: t('features.collaborative.features.0'), link: '/about' },
                  { text: t('features.collaborative.features.1') },
                  { text: t('features.collaborative.features.2'), link: '/dashboard/scientific-database' },
                  { text: t('features.collaborative.features.3') },
                ]}
                ctaText={t('features.collaborative.cta')}
                ctaLink="/register"
              />
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="max-w-3xl mx-auto bg-gradient-to-r from-cp2b-green to-cp2b-lime rounded-2xl p-8 text-center text-white shadow-xl hover:shadow-2xl transition-shadow duration-500 hover:scale-[1.02] transform">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-90 animate-pulse" />
              <h3 className="text-2xl font-bold mb-3">
                {t('cta_section.heading')}
              </h3>
              <p className="text-lg mb-6 text-white/90">
                {t('cta_section.description')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-cp2b-green bg-white hover:bg-gray-50 dark:bg-white dark:hover:bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  {t('cta_section.button_register')}
                  <UserPlus className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                </Link>
                <Link
                  href="/about"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-white bg-cp2b-dark-green/30 hover:bg-cp2b-dark-green/50 border-2 border-white rounded-xl transition-all duration-300 hover:scale-105"
                >
                  {t('cta_section.button_learn_more')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform duration-300" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>


      {/* Dataset Download Section */}
      <section className="py-16 bg-white" aria-labelledby="data-heading">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/10 rounded-xl shrink-0">
                    <Download className="w-6 h-6 text-cp2b-lime" />
                  </div>
                  <div>
                    <h2 id="data-heading" className="text-xl font-bold mb-2">
                      {t('open_data.heading')}
                    </h2>
                    <p className="text-gray-300 text-sm max-w-lg">
                      {t('open_data.description')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 shrink-0">
                  <a
                    href="https://github.com/aikiesan/NewLook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors text-center"
                  >
                    <Sheet className="w-5 h-5 text-green-400" />
                    CSV
                  </a>
                  <a
                    href="https://github.com/aikiesan/NewLook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors text-center"
                  >
                    <Globe className="w-5 h-5 text-blue-400" />
                    GeoJSON
                  </a>
                  <a
                    href="https://github.com/aikiesan/NewLook"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium transition-colors text-center"
                  >
                    <FileJson className="w-5 h-5 text-yellow-400" />
                    JSON
                  </a>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                {(['municipalities', 'residues', 'layers', 'license'] as const).map((key) => (
                  <div key={key}>
                    <div className="font-bold text-cp2b-lime">{t(`open_data.${key}.label`)}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t(`open_data.${key}.desc`)}</div>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <NewsletterSignup
              title={t('newsletter.title')}
              description={t('newsletter.description')}
            />
          </FadeIn>
        </div>
      </section>

      {/* Video Modal */}
      <VideoModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        videoUrl="https://youtu.be/Vn-SPmn-ChY"
        title={t('video_modal.title')}
      />

    </div>
  )
}

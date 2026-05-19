'use client'

/**
 * PILAR-2b V3 - Dashboard Layout Component
 * DBFZ-inspired layout with full-width map and floating panels
 */

import React, { ReactNode } from 'react'
import UnifiedHeader from './UnifiedHeader'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
      {/* Unified Navigation Header */}
      <UnifiedHeader variant="authenticated" />

      {/* Main Content Area - Full Height */}
      <main className="flex-1 relative">
        {children}
      </main>
    </div>
  )
}

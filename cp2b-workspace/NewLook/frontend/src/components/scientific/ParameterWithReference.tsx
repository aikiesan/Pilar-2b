'use client'

import { useState, useCallback } from 'react'
import { BookOpen } from 'lucide-react'
import { ScientificReference } from '@/types/scientific'
import { getReferencesForParameter } from '@/services/scientificApi'
import ReferencePopover from './ReferencePopover'
import { logger } from '@/lib/logger'

interface ParameterWithReferenceProps {
  residueId: number
  parameterType: string
  label: string
  value: string | number
  unit?: string
  /** Minimum value for range display */
  min?: number | null
  /** Maximum value for range display */
  max?: number | null
  /** Number of studies/samples (displayed as n=X) */
  nStudies?: number | null
}

/**
 * Format a value with optional range display
 * Format: "275 (220-320)" or "275" if no range
 */
function formatValueWithRange(
  value: string | number,
  min?: number | null,
  max?: number | null,
  unit?: string
): string {
  const valueStr = typeof value === 'number' ? value.toFixed(1) : value

  // Check if we have valid min and max values
  const hasRange = min !== null && min !== undefined && max !== null && max !== undefined

  if (hasRange) {
    return `${valueStr} (${min!.toFixed(0)}-${max!.toFixed(0)})${unit ? ` ${unit}` : ''}`
  }

  return `${valueStr}${unit ? ` ${unit}` : ''}`
}

export default function ParameterWithReference({
  residueId,
  parameterType,
  label,
  value,
  unit,
  min,
  max,
  nStudies,
}: ParameterWithReferenceProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [references, setReferences] = useState<ScientificReference[]>([])

  const handleFetchReferences = useCallback(async () => {
    // If we already have the references, just open the popover
    if (references.length > 0) {
      setIsOpen(true)
      return
    }

    setIsLoading(true)
    try {
      const fetchedReferences = await getReferencesForParameter(residueId, parameterType)
      setReferences(fetchedReferences)
    } catch (error) {
      logger.error(`Error fetching references for ${parameterType}:`, error)
    } finally {
      setIsLoading(false)
      setIsOpen(true) // Open popover after fetching
    }
  }, [residueId, parameterType, references.length])

  const formattedValue = formatValueWithRange(value, min, max, unit)

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
        <button
          onClick={handleFetchReferences}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 disabled:text-gray-300 dark:disabled:text-gray-600 transition-colors"
          title={`Ver referências para ${label}`}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400"></div>
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-gray-900 dark:text-white">
          {formattedValue}
        </span>
        {nStudies && nStudies > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            (n={nStudies})
          </span>
        )}
      </div>

      {isOpen && (
        <ReferencePopover
          references={references}
          onClose={() => setIsOpen(false)}
          title={label}
          parameterType={parameterType}
        />
      )}
    </div>
  )
}

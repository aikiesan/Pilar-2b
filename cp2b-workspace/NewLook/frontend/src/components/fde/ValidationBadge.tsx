'use client'

/**
 * ValidationBadge Component
 * Displays validation status for residue FDE data
 */
import React from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Clock, HelpCircle } from 'lucide-react'
import type {
  ValidationStatus,
  ConfidenceLevel,
  ValidationBadgeProps,
} from '@/types/fde'
import {
  getValidationStatusColor,
  getValidationStatusLabel,
  getConfidenceLevelLabel,
  getConfidenceLevelColor,
} from '@/types/fde'

const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  status,
  confidence,
  date,
  size = 'md',
  showTooltip = true,
}) => {
  const statusColor = getValidationStatusColor(status)
  const statusLabel = getValidationStatusLabel(status)
  const confidenceLabel = getConfidenceLevelLabel(confidence)
  const confidenceColor = getConfidenceLevelColor(confidence)

  // Icon selection based on status
  const getIcon = () => {
    const iconSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20

    if (status.includes('VALIDATED')) {
      return <CheckCircle2 className="text-green-600" size={iconSize} />
    }
    if (status === 'NEEDS_FIELD_SURVEY') {
      return <AlertTriangle className="text-yellow-600" size={iconSize} />
    }
    if (status === 'COMPETING_USES_EXCLUDED') {
      return <XCircle className="text-red-600" size={iconSize} />
    }
    if (status === 'PENDING_VALIDATION') {
      return <Clock className="text-gray-500" size={iconSize} />
    }
    return <HelpCircle className="text-gray-400" size={iconSize} />
  }

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  }

  // Color classes
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800 border-green-300',
    blue: 'bg-blue-100 text-blue-800 border-blue-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300',
    orange: 'bg-orange-100 text-orange-800 border-orange-300',
    gray: 'bg-gray-100 text-gray-800 border-gray-300',
  }

  const confidenceColorClasses: Record<string, string> = {
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    orange: 'bg-orange-50 text-orange-700',
    gray: 'bg-gray-50 text-gray-700',
  }

  return (
    <div className="inline-flex flex-col gap-1">
      {/* Status Badge */}
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${
          sizeClasses[size]
        } ${colorClasses[statusColor]}`}
        title={showTooltip ? `Status: ${statusLabel}` : undefined}
      >
        {getIcon()}
        <span className="whitespace-nowrap">{statusLabel}</span>
      </div>

      {/* Confidence Level Badge */}
      {confidence && (
        <div
          className={`inline-flex items-center gap-1 rounded-full text-xs px-2 py-0.5 ${
            confidenceColorClasses[confidenceColor]
          }`}
          title={showTooltip ? `Nível de confiança: ${confidenceLabel}` : undefined}
        >
          <div className={`w-1.5 h-1.5 rounded-full bg-current`} />
          <span>{confidenceLabel}</span>
        </div>
      )}

      {/* Validation Date */}
      {date && (
        <div className="text-xs text-gray-500">
          Validado em: {new Date(date).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  )
}

export default ValidationBadge

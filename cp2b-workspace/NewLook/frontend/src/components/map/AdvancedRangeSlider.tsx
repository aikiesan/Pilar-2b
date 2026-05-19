/**
 * Advanced Range Slider Component
 * Professional dual-handle range slider for filtering data
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

interface AdvancedRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value?: [number, number];
  onChange?: (value: [number, number]) => void;
  label?: string;
  unit?: string;
  formatValue?: (value: number) => string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

export default function AdvancedRangeSlider({
  min,
  max,
  step = 1,
  value: controlledValue,
  onChange,
  label,
  unit = '',
  formatValue,
  color = 'blue',
}: AdvancedRangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(
    controlledValue || [min, max]
  );
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const value = controlledValue || localValue;
  const [minValue, maxValue] = value;

  useEffect(() => {
    if (controlledValue) {
      setLocalValue(controlledValue);
    }
  }, [controlledValue]);

  const formatDisplayValue = (val: number) => {
    if (formatValue) return formatValue(val);
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), maxValue - step);
    const newValue: [number, number] = [newMin, maxValue];
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), minValue + step);
    const newValue: [number, number] = [minValue, newMax];
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;

  const colorClasses = {
    blue: {
      track: 'bg-blue-500',
      thumb: 'bg-blue-600 border-blue-700',
      label: 'bg-blue-600 text-white',
    },
    green: {
      track: 'bg-green-500',
      thumb: 'bg-green-600 border-green-700',
      label: 'bg-green-600 text-white',
    },
    purple: {
      track: 'bg-purple-500',
      thumb: 'bg-purple-600 border-purple-700',
      label: 'bg-purple-600 text-white',
    },
    orange: {
      track: 'bg-orange-500',
      thumb: 'bg-orange-600 border-orange-700',
      label: 'bg-orange-600 text-white',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="space-y-4">
      {/* Label and Value Display */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${colors.label}`}
            >
              {formatDisplayValue(minValue)}
              {unit}
            </span>
            <span className="text-gray-400">—</span>
            <span
              className={`px-2 py-1 rounded text-xs font-semibold ${colors.label}`}
            >
              {formatDisplayValue(maxValue)}
              {unit}
            </span>
          </div>
        </div>
      )}

      {/* Slider Container */}
      <div className="relative pt-2 pb-6" ref={sliderRef}>
        {/* Background Track */}
        <div className="absolute w-full h-2 bg-gray-200 dark:bg-slate-700 rounded-full" />

        {/* Active Range Track */}
        <div
          className={`absolute h-2 ${colors.track} rounded-full transition-all`}
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
          }}
        />

        {/* Min Value Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={handleMinChange}
          onMouseDown={() => setIsDragging('min')}
          onMouseUp={() => setIsDragging(null)}
          onTouchStart={() => setIsDragging('min')}
          onTouchEnd={() => setIsDragging(null)}
          className="absolute w-full h-2 opacity-0 cursor-pointer pointer-events-auto z-20"
          style={{ zIndex: isDragging === 'min' ? 25 : 20 }}
        />

        {/* Max Value Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={handleMaxChange}
          onMouseDown={() => setIsDragging('max')}
          onMouseUp={() => setIsDragging(null)}
          onTouchStart={() => setIsDragging('max')}
          onTouchEnd={() => setIsDragging(null)}
          className="absolute w-full h-2 opacity-0 cursor-pointer pointer-events-auto z-20"
          style={{ zIndex: isDragging === 'max' ? 25 : 20 }}
        />

        {/* Custom Thumbs */}
        <div
          className={`absolute w-5 h-5 rounded-full border-2 ${colors.thumb} shadow-lg transform -translate-x-1/2 -translate-y-1.5 transition-all cursor-pointer z-30 ${
            isDragging === 'min' ? 'scale-110' : ''
          }`}
          style={{ left: `${minPercent}%` }}
        />
        <div
          className={`absolute w-5 h-5 rounded-full border-2 ${colors.thumb} shadow-lg transform -translate-x-1/2 -translate-y-1.5 transition-all cursor-pointer z-30 ${
            isDragging === 'max' ? 'scale-110' : ''
          }`}
          style={{ left: `${maxPercent}%` }}
        />

        {/* Min/Max Labels Below Slider */}
        <div className="absolute w-full flex justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
          <span>{formatDisplayValue(min)}{unit}</span>
          <span>{formatDisplayValue(max)}{unit}</span>
        </div>
      </div>
    </div>
  );
}

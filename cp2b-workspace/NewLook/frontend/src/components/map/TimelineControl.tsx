/**
 * Advanced Timeline Control Component
 * Professional temporal data analysis control with date range selector
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipForward, SkipBack, Calendar, Clock } from 'lucide-react';

interface TimelineControlProps {
  startYear?: number;
  endYear?: number;
  currentYear?: number;
  onYearChange?: (year: number) => void;
  isPlaying?: boolean;
  onPlayPauseToggle?: () => void;
  playbackSpeed?: number;
  onPlaybackSpeedChange?: (speed: number) => void;
  visible?: boolean;
}

export default function TimelineControl({
  startYear = 2010,
  endYear = 2024,
  currentYear: initialYear,
  onYearChange,
  isPlaying: externalIsPlaying,
  onPlayPauseToggle: externalPlayPauseToggle,
  playbackSpeed = 1000,
  onPlaybackSpeedChange,
  visible = true,
}: TimelineControlProps) {
  const [currentYear, setCurrentYear] = useState(initialYear || startYear);
  const [internalIsPlaying, setInternalIsPlaying] = useState(false);
  const [selectedSpeed, setSelectedSpeed] = useState(playbackSpeed);
  const [showCalendar, setShowCalendar] = useState(false);

  const isPlaying = externalIsPlaying !== undefined ? externalIsPlaying : internalIsPlaying;

  // Playback effect
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentYear(prev => {
        const next = prev + 1;
        if (next > endYear) {
          setInternalIsPlaying(false);
          if (externalPlayPauseToggle) externalPlayPauseToggle();
          return startYear;
        }
        if (onYearChange) onYearChange(next);
        return next;
      });
    }, selectedSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, selectedSpeed, endYear, startYear, onYearChange, externalPlayPauseToggle]);

  const handlePlayPause = () => {
    if (externalPlayPauseToggle) {
      externalPlayPauseToggle();
    } else {
      setInternalIsPlaying(!internalIsPlaying);
    }
  };

  const handleYearChange = (year: number) => {
    setCurrentYear(year);
    if (onYearChange) onYearChange(year);
  };

  const handleSpeedChange = (speed: number) => {
    setSelectedSpeed(speed);
    if (onPlaybackSpeedChange) onPlaybackSpeedChange(speed);
  };

  const handleSkipForward = () => {
    const next = Math.min(currentYear + 1, endYear);
    handleYearChange(next);
  };

  const handleSkipBack = () => {
    const prev = Math.max(currentYear - 1, startYear);
    handleYearChange(prev);
  };

  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);
  const progress = ((currentYear - startYear) / (endYear - startYear)) * 100;

  if (!visible) return null;

  return (
    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-[1000]">
      {/* Glass-morphism container */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-200/50 dark:border-slate-700/50 p-6 min-w-[600px] max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Análise Temporal
            </h3>
          </div>
          <button
            onClick={() => setShowCalendar(!showCalendar)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            title="Seleção de ano"
          >
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Current Year Display */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
            {currentYear}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Dados de {currentYear}
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="mb-6">
          <div className="relative">
            {/* Progress bar background */}
            <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Year markers */}
            <div className="flex justify-between mt-2">
              {years.map((year, index) => {
                const isFirst = index === 0;
                const isLast = index === years.length - 1;
                const isMiddle = index === Math.floor(years.length / 2);
                const showLabel = isFirst || isLast || isMiddle;

                return (
                  <div key={year} className="relative flex-1">
                    {showLabel && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {year}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Interactive slider */}
            <input
              type="range"
              min={startYear}
              max={endYear}
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-4 mb-4">
          {/* Skip Back */}
          <button
            onClick={handleSkipBack}
            disabled={currentYear === startYear}
            className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            title="Ano anterior"
          >
            <SkipBack className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={handlePlayPause}
            className="p-4 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-all hover:scale-110 shadow-lg"
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" fill="white" />
            ) : (
              <Play className="w-6 h-6 text-white" fill="white" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={handleSkipForward}
            disabled={currentYear === endYear}
            className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            title="Próximo ano"
          >
            <SkipForward className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Playback Speed Controls */}
        <div className="flex items-center justify-center space-x-2">
          <span className="text-xs text-gray-600 dark:text-gray-400">Velocidade:</span>
          {[2000, 1000, 500].map((speed) => (
            <button
              key={speed}
              onClick={() => handleSpeedChange(speed)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {speed === 2000 ? '0.5x' : speed === 1000 ? '1x' : '2x'}
            </button>
          ))}
        </div>

        {/* Year Grid Calendar (Optional Dropdown) */}
        {showCalendar && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="grid grid-cols-5 gap-2">
              {years.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    handleYearChange(year);
                    setShowCalendar(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    year === currentYear
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

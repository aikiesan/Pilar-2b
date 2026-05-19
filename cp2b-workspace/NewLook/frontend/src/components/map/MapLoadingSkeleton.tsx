/**
 * PILAR-2b V3 - Map Loading Skeleton
 * Beautiful progressive loading UI for map component
 */

'use client';

import React from 'react';

export default function MapLoadingSkeleton() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />

      {/* Map grid pattern */}
      <div className="absolute inset-0 opacity-10 dark:opacity-5">
        <svg width="100%" height="100%">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-gray-400 dark:text-gray-600"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Center loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-md mx-4">
          {/* Animated map icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              {/* Pulsing outer circle */}
              <div className="absolute inset-0 rounded-full bg-[#1E5128]/20 dark:bg-emerald-500/20 animate-ping" />

              {/* Main circle with icon */}
              <div className="relative w-20 h-20 bg-gradient-to-br from-[#1E5128] to-[#27AE60] dark:from-emerald-600 dark:to-emerald-400 rounded-full flex items-center justify-center shadow-lg">
                <svg
                  className="w-10 h-10 text-white animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Carregando Mapa Interativo
            </h3>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 bg-[#1E5128] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-[#1E5128] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-[#1E5128] dark:bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-500">
                645 municípios de São Paulo
              </p>
            </div>

            {/* Progress indicators */}
            <div className="pt-4 space-y-2">
              <LoadingStep text="Carregando dados geoespaciais" delay="0s" />
              <LoadingStep text="Processando geometrias" delay="0.5s" />
              <LoadingStep text="Inicializando camadas" delay="1s" />
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#1E5128] to-[#27AE60] dark:from-emerald-600 dark:to-emerald-400 animate-loading-bar origin-left" />
          </div>
        </div>
      </div>

      {/* Corner skeletons for floating panels */}
      <div className="absolute top-20 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg w-80 h-48 animate-pulse border border-gray-200 dark:border-gray-700" />
      <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg w-64 h-32 animate-pulse border border-gray-200 dark:border-gray-700" />
      <div className="absolute bottom-4 right-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg shadow-lg w-48 h-40 animate-pulse border border-gray-200 dark:border-gray-700" />
    </div>
  );
}

function LoadingStep({ text, delay }: { text: string; delay: string }) {
  return (
    <div
      className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 opacity-0 animate-fade-in"
      style={{ animationDelay: delay }}
    >
      <div className="w-1 h-1 bg-[#1E5128] dark:bg-emerald-500 rounded-full" />
      <span>{text}</span>
    </div>
  );
}

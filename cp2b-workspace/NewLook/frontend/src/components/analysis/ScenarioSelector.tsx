'use client';

/**
 * Compact Scenario Selector - Horizontal tabs matching SimpleResidueSelector style
 * Shows scenario descriptions on hover
 */

import { TrendingDown, TrendingUp, BarChart3, Sliders } from 'lucide-react';
import { ScenarioType, RESIDUE_SCENARIOS } from '@/types/analysis';

interface ScenarioSelectorProps {
  currentScenario: ScenarioType;
  onScenarioChange: (scenario: ScenarioType) => void;
  hasCustomFactors?: boolean;
}

export default function ScenarioSelector({
  currentScenario,
  onScenarioChange,
  hasCustomFactors = false
}: ScenarioSelectorProps) {
  const scenarios: Array<{
    type: ScenarioType;
    icon: typeof BarChart3;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = [
    {
      type: 'baseline',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-600'
    },
    {
      type: 'conservative',
      icon: TrendingDown,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-600'
    },
    {
      type: 'optimistic',
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-600'
    },
    {
      type: 'custom',
      icon: Sliders,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-600'
    }
  ];

  return (
    <div>
      {/* Title */}
      <h3 className="text-xs font-semibold text-gray-700 mb-2">
        Cenários de Análise
      </h3>

      {/* Horizontal Tab Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {scenarios.map((scenario) => {
          const config = RESIDUE_SCENARIOS[scenario.type];
          const Icon = scenario.icon;
          const isActive = currentScenario === scenario.type;
          const isCustomWithFactors = scenario.type === 'custom' && hasCustomFactors;

          return (
            <button
              key={scenario.type}
              onClick={() => onScenarioChange(scenario.type)}
              title={`${config.name}: ${config.description}`} // Tooltip on hover
              className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all group ${
                isActive
                  ? `${scenario.bgColor} ${scenario.borderColor} shadow-sm`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* Icon */}
              <div className={`flex items-center justify-center ${
                isActive ? scenario.color : 'text-gray-400 group-hover:text-gray-600'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <span className={`text-[10px] font-medium text-center leading-tight ${
                isActive ? 'text-gray-900' : 'text-gray-600'
              }`}>
                {config.name}
              </span>

              {/* Custom Factors Badge */}
              {isCustomWithFactors && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-600 rounded-full border-2 border-white"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Scenario Description */}
      {currentScenario && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-[10px] text-gray-600">
          <span className="font-medium">{RESIDUE_SCENARIOS[currentScenario].name}:</span>{' '}
          {RESIDUE_SCENARIOS[currentScenario].description}
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * Compact Scenario Selector - Horizontal tabs matching SimpleResidueSelector style
 * Shows scenario descriptions on hover
 */

import { useTranslations } from 'next-intl';
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
  const t = useTranslations('analysis');
  const scenarios: Array<{
    type: ScenarioType;
    icon: typeof BarChart3;
    color: string;
  }> = [
    {
      type: 'baseline',
      icon: BarChart3,
      color: 'text-dusk-600'
    },
    {
      type: 'conservative',
      icon: TrendingDown,
      color: 'text-orange-600'
    },
    {
      type: 'optimistic',
      icon: TrendingUp,
      color: 'text-terra-600'
    },
    {
      type: 'frontier',
      icon: TrendingUp,
      color: 'text-terra-700'
    },
    {
      type: 'custom',
      icon: Sliders,
      color: 'text-purple-600'
    }
  ];

  return (
    <div>
      {/* Title */}
      <h3 className="text-xs font-semibold text-ink mb-2">
        {t('scenario_selector.title')}
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
              title={`${t(config.nameKey)}: ${t(config.descKey)}`} // Tooltip on hover
              aria-pressed={isActive}
              className={`relative flex flex-col items-center gap-1.5 p-2 border transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-terra-600 ${
                isActive
                  ? 'border-ink bg-paper-sunken'
                  : 'border-line bg-paper-raised hover:border-line-strong hover:bg-paper-sunken'
              }`}
            >
              {/* Icon */}
              <div className={`flex items-center justify-center ${
                isActive ? scenario.color : 'text-ink-muted group-hover:text-ink-muted'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              {/* Label */}
              <span className={`text-[10px] font-medium text-center leading-tight ${
                isActive ? 'text-ink' : 'text-ink-muted'
              }`}>
                {t(config.nameKey)}
              </span>

              {/* Custom Factors Badge */}
              {isCustomWithFactors && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-terra-600 rounded-full ring-2 ring-paper-raised"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Scenario Description */}
      {currentScenario && (
        <div className="mt-2 p-2 bg-paper-sunken rounded text-[10px] text-ink-muted">
          <span className="font-medium">{t(RESIDUE_SCENARIOS[currentScenario].nameKey)}:</span>{' '}
          {t(RESIDUE_SCENARIOS[currentScenario].descKey)}
        </div>
      )}
    </div>
  );
}

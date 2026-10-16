'use client';

import { useEffect, useMemo } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { useJoyride, Step, EventData, STATUS, ACTIONS } from 'react-joyride';
import { useTranslations } from 'next-intl';
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags';

interface TourGuideProps {
  run: boolean;
  onFinish: () => void;
}

export default function TourGuide({ run, onFinish }: TourGuideProps) {
  const isMounted = useIsClient();
  const t = useTranslations('tour');

  const steps: Step[] = useMemo(() => [
    {
      target: 'body',
      placement: 'center',
      title: t('steps.welcome.title'),
      content: t('steps.welcome.content'),
      skipBeacon: true,
    },
    {
      target: '.tour-map',
      placement: 'bottom',
      title: t('steps.map.title'),
      content: t('steps.map.content'),
      skipBeacon: true,
    },
    // /analysis is held back with the Método pages (METHOD_PAGES_ENABLED).
    ...(METHOD_PAGES_ENABLED
      ? [{
          target: '.tour-analysis',
          placement: 'bottom',
          title: t('steps.analysis.title'),
          content: t('steps.analysis.content'),
          skipBeacon: true,
        } satisfies Step]
      : []),
    {
      target: '.tour-science',
      placement: 'bottom',
      title: t('steps.science.title'),
      content: t('steps.science.content'),
      skipBeacon: true,
    },
    {
      target: '.tour-calculator',
      placement: 'bottom',
      title: t('steps.calculator.title'),
      content: t('steps.calculator.content'),
      skipBeacon: true,
    },
    {
      target: '.tour-proximity',
      placement: 'bottom',
      title: t('steps.proximity.title'),
      content: t('steps.proximity.content'),
      skipBeacon: true,
    },
    {
      target: '.tour-search-bar',
      placement: 'bottom',
      title: t('steps.search.title'),
      content: t('steps.search.content'),
      skipBeacon: true,
    },
    {
      target: '.tour-help-button',
      placement: 'top-end',
      title: t('steps.help.title'),
      content: t('steps.help.content'),
      skipBeacon: true,
    },
  ], [t]);

  const { Tour, controls } = useJoyride({
    steps,
    run,
    continuous: true,
    
    locale: {
        back: t('locale.back'),
        close: t('locale.close'),
        last: t('locale.last'),
        next: t('locale.next'),
        skip: t('locale.skip'),
      },

    onEvent: (data: EventData) => {
    const { status, action } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

      if (finishedStatuses.includes(status) || action === ACTIONS.CLOSE) {
        onFinish();
      }
    },
    // AQUI ESTÁ A OPTIONS CONSOLIDADA
    options: {
      primaryColor: '#00573A', // Verde Escuro (terra-600)
      textColor: '#1E3E4C', // Azul Petróleo (ink)
      backgroundColor: '#FFFFFF', // paper-raised
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      beaconTrigger: 'hover',
      skipScroll: false,
      
    },
    styles: {
      tooltip: {
        borderRadius: '16px', // curvas do manual do CP2b
        boxShadow: '0 4px 12px rgba(30, 62, 76, 0.12)'
      },
    },
    
  });

  // Re-dispara o tour do zero sempre que 'run' virar true
  useEffect(() => {
    if (run && isMounted) {
      controls.start();
    }
  }, [run, isMounted, controls]);

  if (!isMounted) return null;

  // Em vez daquele componente gigante, você apenas renderiza o retorno do Hook
  return <>{Tour}</>;
}

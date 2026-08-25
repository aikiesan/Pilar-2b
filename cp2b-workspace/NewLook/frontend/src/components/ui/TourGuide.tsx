'use client';

import { useEffect, useState } from 'react';
import { Joyride, Step, EventData, STATUS, ACTIONS, EVENTS } from 'react-joyride'; 

interface TourGuideProps {
  run: boolean;
  onFinish: () => void;
}

export default function TourGuide({ run, onFinish }: TourGuideProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0); // Estado para forçar a volta ao zero

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Força o tour a recomeçar do passo zero toda vez que for ativado
  useEffect(() => {
    if (run) {
      setStepIndex(0);
    }
  }, [run]);

  const steps: Step[] = [
    {
      target: 'body',
      placement: 'center',
      title: 'Bem-vindo ao PILAR-2b',
      content: 'Esta é a barra de navegação principal. A partir daqui você acessa todas as funcionalidades da plataforma de potencial de biogás dos municípios de São Paulo.',
      skipBeacon: true, 
    },
    {
        target: '.tour-map',
        title: 'Mapa interativo',
        content: 'Visualize o potencial de biogás de cada município em um mapa coroplético. Camadas adicionais mostram aterros, plantas existentes e bacias hidrográficas.',
        skipBeacon: true,
    },
    {
        target: '.tour-analysis',
        title: 'Análises',
        content: 'Gráficos comparativos por região, tipo de resíduo e horizonte temporal.',
        skipBeacon: true,
    },
    {
        target: '.tour-science',
        title: 'Base científica',
        content: 'Acesse a metodologia detalhada, dados brutos e código-fonte para entender como calculamos o potencial de biogás e para replicar ou adaptar a análise.',
        skipBeacon: true,
    },
    {
        target: '.tour-calculator',
        title: 'Calculadora de Biogás',
        content: 'Estime a produção de biogás a partir de parâmetros customizados: tipo de substrato, volume e tempo de retenção.',
        skipBeacon: true,
    },
    {
        target: '.tour-proximity',
        title: 'Análise de Proximidade',
        content: 'Identifique municípios vizinhos com potencial complementar para projetos regionais e consórcios intermunicipais.',
        skipBeacon: true,
    },
    {
      target: '.tour-search-bar',
      title: 'Busca de município',
      content: 'Digite o nome de qualquer município paulista para centralizar o mapa e ver os indicadores locais de geração de resíduos orgânicos.',
      skipBeacon: true,
    },
    {
      target: '.tour-help-button',
      title: 'Ajuda a qualquer momento',
      content: 'Pronto! Sempre que precisar, clique aqui para reiniciar este tour ou abrir o guia completo.',
      skipBeacon: true,
    }
  ];

  const handleJoyrideEvent = (data: EventData) => {
    const { status, action, index, type } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Atualiza o passo quando clica em próximo ou voltar
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      setStepIndex(index + (action === ACTIONS.PREV ? -1 : 1));
    }

    // Fecha e zera o tour se concluir, pular ou fechar no X
    if (finishedStatuses.includes(status) || action === ACTIONS.CLOSE) {
      setStepIndex(0);
      onFinish();
    }
  };

  if (!isMounted) return null;

  return (
    <Joyride
      stepIndex={stepIndex} // O React agora tem controle total do índice
      steps={steps}
      run={run}
      continuous={true} 
      onEvent={handleJoyrideEvent} 
      options={{
        primaryColor: '#2F7D32', 
        textColor: '#333',
        zIndex: 10000,
        showProgress: true, 
        buttons: ['back', 'close', 'primary', 'skip'], 
      }}
      styles={{
        buttonBack: {
          color: '#2F7D32',
        }
      }}
      locale={{
        back: 'Voltar',
        close: 'Fechar',
        last: 'Concluir',
        next: 'Próximo',
        skip: 'Pular',
      }}
    />
  );
}
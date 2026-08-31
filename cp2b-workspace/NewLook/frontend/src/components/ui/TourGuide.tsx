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
      placement: 'bottom',
      title: 'Mapa interativo',
      content: 'Visualize o potencial de biogás de cada município em um mapa coroplético. Camadas adicionais mostram aterros, plantas existentes e bacias hidrográficas.',
      skipBeacon: true,
    },
    {
      target: '.tour-analysis',
      placement: 'bottom',
      title: 'Análises',
      content: 'Gráficos comparativos por região, tipo de resíduo e horizonte temporal.',
      skipBeacon: true,
    },
    {
      target: '.tour-science',
      placement: 'bottom',
      title: 'Base científica',
      content: 'Acesse a metodologia detalhada, dados brutos e código-fonte para entender como calculamos o potencial de biogás e para replicar ou adaptar a análise.',
      skipBeacon: true,
    },
    {
      target: '.tour-calculator',
      placement: 'bottom',
      title: 'Calculadora de Biogás',
      content: 'Estime a produção de biogás a partir de parâmetros customizados: tipo de substrato, volume e tempo de retenção.',
      skipBeacon: true,
    },
    {
      target: '.tour-proximity',
      placement: 'bottom',
      title: 'Análise de Proximidade',
      content: 'Identifique municípios vizinhos com potencial complementar para projetos regionais e consórcios intermunicipais.',
      skipBeacon: true,
    },
    {
      target: '.tour-search-bar',
      placement: 'bottom',
      title: 'Busca de município',
      content: 'Digite o nome de qualquer município paulista para centralizar o mapa e ver os indicadores locais de geração de resíduos orgânicos.',
      skipBeacon: true,
    },
    {
      target: '.tour-help-button',
      placement: 'top-end',
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
      styles={{
        //balao principal
        tooltip:{
          borderRadius: '16px',
          padding : '20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          fontFamily: 'inherit',
          zIndex: 10000,
        },
        tooltipTitle: {
          //título do passo
          fontSize:'18px',
          fontWeight: 700,
          color: '#1E5128'
        },
        tooltipContent:{
          //texto do corpo
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#4b5563',
          padding: '12px 0',
        },
        //botão proximo
        buttonPrimary: {
          backgroundColor: '#1E5128',
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: 600,
        },
        //botao voltar
        buttonBack:{
          color: '#1E5128',
          marginRight: '8px',

        },
        buttonSkip:{
          color: '#9ca3af',
        },
        buttonClose:{
          color: '#6b7280',

        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
      
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
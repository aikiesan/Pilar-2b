'use client';

import { useEffect, useState } from 'react';
import { Joyride, Step, EventData, STATUS } from 'react-joyride'; // Importações atualizadas (EventData substitui CallBackProps)

interface TourGuideProps {
  run: boolean;
  onFinish: () => void;
}

export default function TourGuide({ run, onFinish }: TourGuideProps) {
  // Garantir que só renderiza no cliente (evita erros de hidratação no Next.js)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Aqui definimos os passos exatamente como nas suas imagens
  const steps: Step[] = [
    {
      // Passo 1: Bem-vindo (Centro da tela)
      target: 'body',
      placement: 'center',
      title: 'Bem-vindo ao PILAR-2b',
      content: 'Esta é a barra de navegação principal. A partir daqui você acessa todas as funcionalidades da plataforma de potencial de biogás dos municípios de São Paulo.',
      skipBeacon: true, // Na V3, disableBeacon virou skipBeacon
    },
    {
        // Passo 2: Mapa interativo
        target: '.tour-map',
        title: 'Mapa interativo',
        content: 'Visualize o potencial de biogás de cada município em um mapa coroplético. Camadas adicionais mostram aterros, plantas existentes e bacias hidrográficas.',
        skipBeacon: true,
    },
    {
        // Passo 3: análise
        target: '.tour-analysis',
        title: 'Análises',
        content: 'Gráficos comparativos por região, tipo de resíduo e horizonte temporal.',
        skipBeacon: true,
    },
    {
        // Passo 4: Base científica        
        target: '.tour-science',
        title: 'Base científica',
        content: 'Acesse a metodologia detalhada, dados brutos e código-fonte para entender como calculamos o potencial de biogás e para replicar ou adaptar a análise.',
        skipBeacon: true,
    },
    {
        // Passo 5: Calculadora
        target: '.tour-calculator',
        title: 'Calculadora de Biogás',
        content: 'Estime a produção de biogás a partir de parâmetros customizados: tipo de substrato, volume e tempo de retenção.',
        skipBeacon: true,
    },
    {
        // Passo 6: Proximidade
        target: '.tour-proximity',
        title: 'Análise de Proximidade',
        content: 'Identifique municípios vizinhos com potencial complementar para projetos regionais e consórcios intermunicipais.',
        skipBeacon: true,
    },
    {
      // Passo 7: Barra de busca
      target: '.tour-search-bar',
      title: 'Busca de município',
      content: 'Digite o nome de qualquer município paulista para centralizar o mapa e ver os indicadores locais de geração de resíduos orgânicos.',
      skipBeacon: true,
    },
    {
      // Passo 8: Botão de ajuda
      target: '.tour-help-button',
      title: 'Ajuda a qualquer momento',
      content: 'Pronto! Sempre que precisar, clique aqui para reiniciar este tour ou abrir o guia completo.',
      skipBeacon: true,
    }
  ];

  // O tipo muda de CallBackProps para EventData
  const handleJoyrideEvent = (data: EventData) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    // Se o usuário fechar, pular ou terminar o tour, avisamos a página para desligar o 'run'
    if (finishedStatuses.includes(status)) {
      onFinish();
    }
  };

  if (!isMounted) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous={true} // Mantido como propriedade raiz
      onEvent={handleJoyrideEvent} // V3: 'callback' substituído por 'onEvent'
      
      options={{
        primaryColor: '#2F7D32', // Cor do botão principal
        textColor: '#333',
        zIndex: 10000,
        showProgress: true, // V3: Movido para dentro do objeto options
        buttons: ['back', 'close', 'primary', 'skip'], // V3: Substitui a antiga prop 'showSkipButton'
      }}
      
      styles={{
        buttonBack: {
          color: '#2F7D32',
        }
        // V3: options não fica mais dentro de styles
      }}
      
      // Tradução dos botões nativos da biblioteca
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
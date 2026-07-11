'use client';

import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react'; // Ícone de interrogação
import TourGuide from './TourGuide'; // Importa o componente do Joyride que você já criou

export default function GuideTourController() {
  const [runTour, setRunTour] = useState(false);

  // Esse useEffect permite que outros botões do site (como aquele "Iniciar tour guiado" 
  // lá da página inicial) também consigam disparar o tour através de um evento customizado.
  useEffect(() => {
    const handleStartTour = () => setRunTour(true);
    window.addEventListener('start-guide-tour', handleStartTour);
    return () => window.removeEventListener('start-guide-tour', handleStartTour);
  }, []);

  return (
    <>
      {/* O componente invisível que gerencia os balões do tour */}
      <TourGuide run={runTour} onFinish={() => setRunTour(false)} />

      {/* O Botão Flutuante (FAB - Floating Action Button) */}
      <button
        onClick={() => setRunTour(true)}
        className="tour-help-button fixed bottom-8 right-8 z-[999] flex items-center justify-center w-14 h-14 bg-[#1E5128] text-white rounded-full shadow-lg hover:bg-cp2b-green hover:scale-110 hover:shadow-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-cp2b-lime/50"
        aria-label="Abrir ajuda e tour guiado"
        title="Ajuda e Tour"
      >
        <HelpCircle className="w-7 h-7" />
      </button>
    </>
  );
}
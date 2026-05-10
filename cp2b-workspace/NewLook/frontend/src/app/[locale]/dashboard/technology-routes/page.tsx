'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { ReactFlowProvider } from 'reactflow';
import dynamic from 'next/dynamic';
import { HelpCircle, Info, Sparkles } from 'lucide-react';
import 'reactflow/dist/style.css';

import { technologyRoutesApi } from '@/services/technologyRoutesApi';
import { generateRouteFromWizard } from './utils/routeGenerator';
import type { WizardConfig, TechnologyCardWithReferences } from '@/types/technology-routes';

// Dynamically import components to avoid SSR issues
const RouteCanvas    = dynamic(() => import('./components/RouteCanvas'),    { ssr: false });
const TechnologyPalette = dynamic(() => import('./components/TechnologyPalette'), { ssr: false });
const ReferencePanel = dynamic(() => import('./components/ReferencePanel'), { ssr: false });
const RouteToolbar   = dynamic(() => import('./components/RouteToolbar'),   { ssr: false });
const TemplateLoader = dynamic(() => import('./components/TemplateLoader'), { ssr: false });
const WelcomeWizard  = dynamic(() => import('./components/WelcomeWizard'),  { ssr: false });
const ResultsSidebar = dynamic(() => import('./components/ResultsSidebar'), { ssr: false });

export default function TechnologyRoutesPage() {
  const t = useTranslations('pages');

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isReferencePanelOpen, setIsReferencePanelOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true); // open on first visit
  const [showTemplates, setShowTemplates] = useState(false);

  // Wizard / Results state
  const [wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Canvas callbacks
  const [addToCanvasCallback, setAddToCanvasCallback] = useState<((tech: any) => void) | null>(null);
  const [loadTemplateCallback, setLoadTemplateCallback] = useState<((nodes: any[], edges: any[]) => void) | null>(null);

  // Pre-fetch technology catalogue so the generator can use it without delay
  const allTechnologiesRef = useRef<TechnologyCardWithReferences[]>([]);
  useEffect(() => {
    technologyRoutesApi.getTechnologies().then(data => {
      allTechnologiesRef.current = data;
    }).catch(() => { /* generator will produce minimal nodes if empty */ });
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    setIsReferencePanelOpen(!!nodeId);
    // close results sidebar when a node is selected so sidebars don't stack
    if (nodeId) setShowResults(false);
  }, []);

  const handleSetAddToCanvasCallback = useCallback((callback: (tech: any) => void) => {
    setAddToCanvasCallback(() => callback);
  }, []);

  const handleSetLoadTemplateCallback = useCallback((callback: (nodes: any[], edges: any[]) => void) => {
    setLoadTemplateCallback(() => callback);
  }, []);

  const handleLoadTemplate = useCallback((nodes: any[], edges: any[]) => {
    if (loadTemplateCallback) loadTemplateCallback(nodes, edges);
  }, [loadTemplateCallback]);

  const handleWizardComplete = useCallback((config: WizardConfig) => {
    setWizardConfig(config);
    setShowWelcome(false);
    setShowResults(true);
    setIsPaletteOpen(false); // give canvas full width while results are open

    // Generate route and load into canvas after a tick (lets the canvas mount first)
    setTimeout(() => {
      if (loadTemplateCallback) {
        const { nodes, edges } = generateRouteFromWizard(config, allTechnologiesRef.current);
        loadTemplateCallback(nodes, edges);
      }
    }, 150);
  }, [loadTemplateCallback]);

  const handleCloseWizard = useCallback(() => {
    setShowWelcome(false);
    setIsPaletteOpen(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-cp2b-lime-light/10">
      <Breadcrumb items={[
        { label: t('back_to_dashboard'), href: '/dashboard' },
        { label: t('technology_routes.title') },
      ]} />

      {/* Page Title Bar */}
      <div className="bg-gradient-to-r from-cp2b-green to-cp2b-dark-green shadow-md z-20">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">{t('technology_routes.title')}</h1>
            <p className="text-xs text-cp2b-lime-light">{t('technology_routes.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Re-open wizard */}
            <button
              onClick={() => setShowWelcome(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Sparkles className="h-4 w-4" />
              <span>{t('technology_routes.wizard_btn')}</span>
            </button>
            <button
              onClick={() => setShowWelcome(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              aria-label={t('technology_routes.help')}
            >
              <HelpCircle className="h-4 w-4" />
              <span>{t('technology_routes.help')}</span>
            </button>
          </div>
        </div>
        {/* Guide Banner */}
        <div className="bg-cp2b-dark-green/30 px-4 py-2 border-t border-white/10">
          <div className="flex items-start gap-2 text-white/90 text-sm">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              <strong>{t('technology_routes.how_to_use')}:</strong>{' '}
              {wizardConfig
                ? t('technology_routes.guide_wizard_done')
                : t('technology_routes.guide')}
            </p>
          </div>
        </div>
      </div>

      {/* Wizard overlay */}
      {showWelcome && (
        <WelcomeWizard
          onComplete={handleWizardComplete}
          onClose={handleCloseWizard}
        />
      )}

      {/* Template Loader overlay */}
      {showTemplates && (
        <TemplateLoader
          onLoadTemplate={handleLoadTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* Toolbar */}
      <RouteToolbar onOpenTemplates={() => setShowTemplates(true)} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Technology Palette */}
        {isPaletteOpen && (
          <aside className="w-72 bg-white border-r border-cp2b-green/20 shadow-sm overflow-y-auto">
            <TechnologyPalette onAddToCanvas={addToCanvasCallback || undefined} />
          </aside>
        )}

        {/* Center - Canvas */}
        <main className="flex-1 relative">
          <ReactFlowProvider>
            <RouteCanvas
              onNodeSelect={handleNodeSelect}
              selectedNodeId={selectedNodeId}
              onSetAddToCanvasCallback={handleSetAddToCanvasCallback}
              onSetLoadTemplateCallback={handleSetLoadTemplateCallback}
            />
          </ReactFlowProvider>
        </main>

        {/* Right Sidebar - Results (wizard output) */}
        {showResults && wizardConfig && (
          <aside className="w-80 bg-white border-l border-cp2b-green/20 shadow-sm overflow-y-auto">
            <ResultsSidebar
              config={wizardConfig}
              onClose={() => { setShowResults(false); setIsPaletteOpen(true); }}
            />
          </aside>
        )}

        {/* Right Sidebar - References (node click) — only when results are closed */}
        {!showResults && isReferencePanelOpen && selectedNodeId && (
          <aside className="w-96 bg-white border-l border-cp2b-green/20 shadow-sm overflow-y-auto">
            <ReferencePanel
              nodeId={selectedNodeId}
              onClose={() => setIsReferencePanelOpen(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

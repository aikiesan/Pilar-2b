import type { RouteNode, RouteEdge, WizardConfig, TechnologyCardWithReferences } from '@/types/technology-routes';

const RESIDUE_TO_FEEDSTOCK_ID: Record<string, string> = {
  AG_CANA_BAGACO:               'feed_bagasse',
  AG_CANA_PALHA:                'feed_straw',
  AG_CANA_TORTA_FILTRO:         'feed_filter_cake',
  AG_CANA_VINHACA:              'feed_vinasse',
  AG_MILHO_PALHA:               'feed_corn_stover',
  AG_SOJA_PALHA:                'feed_soy_stover',
  AG_CITROS_BAGACO:             'feed_bagasse',
  AG_CITROS_CASCAS:             'feed_bagasse',
  AG_CITROS_POLPA:              'feed_bagasse',
  AG_CAFE_POLPA:                'feed_bagasse',
  AG_CAFE_CASCA:                'feed_bagasse',
  AG_CAFE_MUCILAGEM:            'feed_bagasse',
  PEC_ESTERCO_BOVINO:           'feed_cattle_manure',
  PEC_DEJETOS_LIQUIDOS_SUINO:   'feed_swine_slurry',
  PEC_CAMA_AVIARIO:             'feed_poultry_litter',
  URB_LODO_PRIMARIO:            'feed_urban_organic',
  URB_LODO_SECUNDARIO:          'feed_urban_organic',
  URB_FORSU_SEPARADA:           'feed_urban_organic',
  IND_CASCA_EUCALIPTO:          'feed_bagasse',
};

/**
 * Given a WizardConfig and the full technology catalogue fetched from the API,
 * returns a React Flow node+edge array ready to be loaded into RouteCanvas.
 *
 * Layout (left → right, single row at y=250):
 *   [Feedstock] → [Pre-treatment?] → [Digester] → [Output1] → [Output2] ...
 *
 * An extra dashed "upgrade possibility" edge is added when biogas outputs exist,
 * pointing to the first upgrading node to signal the biomethane pathway.
 */
export function generateRouteFromWizard(
  config: WizardConfig,
  allTechnologies: TechnologyCardWithReferences[]
): { nodes: RouteNode[]; edges: RouteEdge[] } {
  const nodes: RouteNode[] = [];
  const edges: RouteEdge[] = [];

  const X_START = 100;
  const X_STEP  = 220;
  const Y_CENTER = 250;

  let col = 0;
  const makeId = (suffix: string) => `wizard-${suffix}-${Date.now()}`;

  const findTech = (id: string) => allTechnologies.find(t => t.id === id);

  // ── 1. Feedstock node (derived from residue code, category "feedstock") ──
  const preferredFeedstockId = RESIDUE_TO_FEEDSTOCK_ID[config.residueCode];
  const feedstockTech = (preferredFeedstockId
    ? allTechnologies.find(t => t.id === preferredFeedstockId)
    : undefined)
    ?? allTechnologies.find(t => t.category === 'feedstock');

  const feedstockNodeId = makeId('feedstock');
  nodes.push({
    id: feedstockNodeId,
    type: 'technology',
    position: { x: X_START + col * X_STEP, y: Y_CENTER },
    data: {
      techId: feedstockTech?.id ?? 'feedstock-generic',
      label: feedstockTech?.namePt ?? config.residueCode,
      emoji: feedstockTech?.emoji ?? '🌿',
      color: feedstockTech?.color ?? '#6B7280',
      category: 'feedstock',
    },
  });
  let prevNodeId = feedstockNodeId;
  col++;

  // ── 2. Pre-treatment node (optional) ──
  if (config.preTreatmentId) {
    const preTech = findTech(config.preTreatmentId);
    if (preTech) {
      const preNodeId = makeId('pretreatment');
      nodes.push({
        id: preNodeId,
        type: 'technology',
        position: { x: X_START + col * X_STEP, y: Y_CENTER },
        data: {
          techId: preTech.id,
          label: preTech.namePt,
          emoji: preTech.emoji,
          color: preTech.color,
          category: 'pretreatment',
        },
      });
      edges.push({
        id: makeId('edge-feed-pre'),
        source: prevNodeId,
        target: preNodeId,
        animated: true,
      });
      prevNodeId = preNodeId;
      col++;
    }
  }

  // ── 3. Digester node ──
  const digesterTech = findTech(config.digesterTechnologyId);
  if (digesterTech) {
    const digesterNodeId = makeId('digester');
    nodes.push({
      id: digesterNodeId,
      type: 'technology',
      position: { x: X_START + col * X_STEP, y: Y_CENTER },
      data: {
        techId: digesterTech.id,
        label: digesterTech.namePt,
        emoji: digesterTech.emoji,
        color: digesterTech.color,
        category: 'digestion',
      },
    });
    edges.push({
      id: makeId('edge-pre-dig'),
      source: prevNodeId,
      target: digesterNodeId,
      animated: true,
    });
    prevNodeId = digesterNodeId;
    col++;

    // ── 4. Output nodes ──
    let firstUpgradingNodeId: string | null = null;
    const outputTechs = config.outputIds.map(id => findTech(id)).filter(Boolean) as TechnologyCardWithReferences[];

    outputTechs.forEach((outTech, idx) => {
      const outNodeId = makeId(`output-${idx}`);
      nodes.push({
        id: outNodeId,
        type: 'technology',
        position: { x: X_START + col * X_STEP, y: Y_CENTER + idx * 140 },
        data: {
          techId: outTech.id,
          label: outTech.namePt,
          emoji: outTech.emoji,
          color: outTech.color,
          category: outTech.category,
        },
      });
      edges.push({
        id: makeId(`edge-dig-out-${idx}`),
        source: prevNodeId,
        target: outNodeId,
        animated: false,
      });

      if (outTech.category === 'upgrading' && !firstUpgradingNodeId) {
        firstUpgradingNodeId = outNodeId;
      }
    });

    // ── 5. Dashed "upgrade possibility" edge ──
    // If the user picked enduse outputs but no upgrading tech, show a dashed hint toward
    // the first available upgrading technology as a "possibility" node.
    const hasUpgrading = outputTechs.some(t => t.category === 'upgrading');
    if (!hasUpgrading) {
      const upgradingHintTech = allTechnologies.find(t => t.category === 'upgrading');
      if (upgradingHintTech) {
        const hintNodeId = makeId('upgrade-hint');
        const hintCol = col + outputTechs.length;
        nodes.push({
          id: hintNodeId,
          type: 'technology',
          position: { x: X_START + hintCol * X_STEP, y: Y_CENTER - 140 },
          data: {
            techId: upgradingHintTech.id,
            label: upgradingHintTech.namePt,
            emoji: upgradingHintTech.emoji,
            color: '#9CA3AF',
            category: 'upgrading',
          },
        });
        edges.push({
          id: makeId('edge-upgrade-hint'),
          source: prevNodeId,
          target: hintNodeId,
          type: 'default',
          animated: false,
          style: { strokeDasharray: '6 3', stroke: '#9CA3AF', strokeWidth: 2 },
        });
      }
    }
  }

  return { nodes, edges };
}

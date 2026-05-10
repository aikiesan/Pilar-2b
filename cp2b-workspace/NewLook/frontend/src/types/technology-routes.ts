/**
 * TypeScript types for Technology Routes feature
 * Educational tool for visualizing biogas technology pathways
 */

export interface WizardConfig {
  residueCode: string;          // matches DetailedResidue.code
  amountTons: number;
  availabilityMonths: number[]; // 1-12, e.g. [4,5,6,7,8,9,10,11] for sugarcane harvest
  preTreatmentId: string | null;
  digesterTechnologyId: string;
  outputIds: string[];          // upgrading / enduse / byproduct tech IDs
}

export type TechnologyCategory =
  | 'feedstock'
  | 'pretreatment'
  | 'digestion'
  | 'upgrading'
  | 'enduse'
  | 'byproduct'
  | 'custom';

export interface TechnologyCard {
  id: string;
  category: TechnologyCategory;
  namePt: string;
  nameEn: string;
  emoji: string;
  descriptionPt?: string;
  descriptionEn?: string;
  color: string;
  canConnectTo: string[];
  canReceiveFrom: string[];
  isCustom: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TechnologyReference {
  referenceId: number;
  title: string;
  authors: string[];
  year: number;
  journal?: string;
  doi?: string;
  url?: string;
  relevanceNote?: string;
}

export interface TechnologyCardWithReferences extends TechnologyCard {
  references: TechnologyReference[];
}

export interface RouteNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    techId: string;
    label: string;
    emoji: string;
    color: string;
    category: TechnologyCategory;
  };
}

export interface RouteEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
}

export interface RouteCanvasData {
  nodes: RouteNode[];
  edges: RouteEdge[];
}

export interface UserRoute {
  id: string;
  userId: string;
  name: string;
  description?: string;
  canvasData: RouteCanvasData;
  isPublic: boolean;
  shareToken?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoutePayload {
  name: string;
  description?: string;
  canvasData: RouteCanvasData;
  isPublic: boolean;
  tags?: string[];
}

export interface UpdateRoutePayload {
  name?: string;
  description?: string;
  canvasData?: RouteCanvasData;
  isPublic?: boolean;
  tags?: string[];
}

export interface ConnectionValidationResponse {
  valid: boolean;
  reason?: string;
  sourceCategory?: string;
  targetCategory?: string;
}

# 🌱 PILAR-2b V3 - BioRoute Feature Comprehensive Analysis & Upgrade Plan

**Project**: PILAR-2b V3 - Biogas Technology Pathways
**Feature**: Rotas Tecnológicas (Technology Routes) - BioRoute Visual Builder
**Date**: December 4, 2025
**Status**: Enhancement & Integration Planning

---

## 📋 EXECUTIVE SUMMARY

This document provides a comprehensive analysis of the PILAR-2b V3 platform's residues, technologies, and visual design system to upgrade the **BioRoute** (Rotas Tecnológicas) feature into a powerful visual building block system for creating biogas technology pathways.

### Key Findings:
- ✅ **38 Validated Residues** across 4 sectors (Agriculture, Livestock, Industrial, Urban)
- ✅ **26 Predefined Technologies** across 6 categories (Feedstock, Pretreatment, Digestion, Upgrading, End Use, Byproducts)
- ✅ **Established Visual Identity** with CP2B green theme and consistent design patterns
- ✅ **React Flow Foundation** already implemented for drag-and-drop canvas
- 🎯 **Integration Opportunity**: Connect residues data to technology pathways for realistic scenario planning

---

## 🗂️ SECTION 1: VERIFIED RESIDUES DATABASE

### 1.1 Complete Residues Inventory (38 Total)

#### 🌱 AGRICULTURE SECTOR (19 Residues)

| # | Residue Name (PT) | Residue Name (EN) | FDE (%) | Validation | Icon |
|---|-------------------|-------------------|---------|------------|------|
| 1 | Sabugo de milho | Corn Cob | 27.09% | LOW ⚠️ | 🌽 |
| 2 | Torta de filtro | Filter Cake | 21.03% | HIGH ✅ | 🍰 |
| 3 | Casca de milho | Corn Husk | 19.51% | LOW ⚠️ | 🌽 |
| 4 | Casca de eucalipto | Eucalyptus Bark | 14.55% | LOW ⚠️ | 🌳 |
| 5 | Polpa de café | Coffee Pulp | 14.14% | MEDIUM ⚠️ | ☕ |
| 6 | Galhos e ponteiros | Branches and Tips | 13.60% | LOW ⚠️ | 🌿 |
| 7 | Mucilagem de café | Coffee Mucilage | 13.54% | MEDIUM ⚠️ | ☕ |
| 8 | Casca de café | Coffee Husk | 11.37% | LOW ⚠️ | ☕ |
| 9 | Bagaço de cana | Sugarcane Bagasse | 9.79% | MEDIUM ⚠️ | 🌾 |
| 10 | Polpa de citros | Citrus Pulp | 7.92% | - | 🍊 |
| 11 | Bagaço de citros | Citrus Bagasse | 7.72% | - | 🍊 |
| 12 | Cascas de citros | Citrus Peels | 7.72% | - | 🍊 |
| 13 | Vinhaça | Vinasse | 6.98% | HIGH ✅ | 🍷 |
| 14 | Casca de soja | Soybean Hull | 4.20% | - | 🌱 |
| 15 | Vagem de soja | Soybean Pod | 3.24% | - | 🌱 |
| 16 | Palha de milho | Corn Straw | 3.23% | - | 🌽 |
| 17 | Folhas de eucalipto | Eucalyptus Leaves | 2.93% | - | 🌳 |
| 18 | Palha de cana | Sugarcane Straw | 1.90% | CRITICAL 🚨 | 🌾 |
| 19 | Palha de soja | Soybean Straw | 0.53% | INVIABLE 🚫 | 🌱 |

**Notes**:
- 🚨 **Palha de cana**: Soil retention mandatory - limited availability
- 🚫 **Palha de soja**: FDE=0% - 85% SP in no-till farming (inviable)
- ✅ **Highest potential**: Torta de filtro (21.03%), Vinhaça (6.98% but high volume)

---

#### 🐄 LIVESTOCK SECTOR (7 Residues)

| # | Residue Name (PT) | Residue Name (EN) | FDE (%) | Validation | Icon |
|---|-------------------|-------------------|---------|------------|------|
| 1 | Dejetos líquidos de suínos | Swine Liquid Manure | 35.64% | HIGHEST 🔥 | 🐷 |
| 2 | Esterco sólido de suínos | Swine Solid Manure | 30.25% | HIGH ✅ | 🐷 |
| 3 | Carcaças e mortalidade | Carcasses and Mortality | 28.34% | - | 🦴 |
| 4 | Cama de aviário | Poultry Litter | 15.85% | MEDIUM ⚠️ | 🐔 |
| 5 | Dejetos líquidos bovino | Cattle Liquid Manure | 15.27% | HIGH ✅ | 🐄 |
| 6 | Dejetos frescos de aves | Fresh Poultry Manure | 14.45% | - | 🐔 |
| 7 | Esterco bovino | Cattle Manure | 13.09% | HIGH ✅ | 🐄 |

**Notes**:
- 🔥 **Best in class**: Swine liquid manure (35.64%) - highest FDE across all sectors
- ✅ **Proven pathways**: Cattle and swine manure well-validated with commercial biogas plants

---

#### 🏭 INDUSTRIAL SECTOR (8 Residues)

| # | Residue Name (PT) | Residue Name (EN) | FDE (%) | Validation | Icon |
|---|-------------------|-------------------|---------|------------|------|
| 1 | Gordura e sebo | Fats and Tallow | 44.16% | EXCEPTIONAL 🌟 | 🥩 |
| 2 | Levedura residual | Residual Yeast | 27.76% | - | 🍺 |
| 3 | Bagaço de malte | Malt Bagasse | 23.55% | - | 🍺 |
| 4 | Vísceras não comestíveis | Non-edible Viscera | 20.11% | MEDIUM ⚠️ | 🥩 |
| 5 | Aparas e refiles | Trimmings and Scraps | 18.50% | - | 🥩 |
| 6 | Rejeitos industriais orgânicos | Organic Industrial Waste | 15.01% | - | 🏭 |
| 7 | Sangue animal | Animal Blood | 14.57% | MEDIUM ⚠️ | 🩸 |
| 8 | Cascas diversas | Various Husks | 14.28% | - | 🥜 |

**Notes**:
- 🌟 **Champion residue**: Fats and tallow (44.16%) - highest FDE in entire database!
- 🍺 **Brewery residues**: Yeast and malt bagasse excellent for co-digestion
- 🥩 **Slaughterhouse residues**: High energy density, require proper pre-treatment

---

#### 🏙️ URBAN SECTOR (4 Residues)

| # | Residue Name (PT) | Residue Name (EN) | FDE (%) | Validation | Icon |
|---|-------------------|-------------------|---------|------------|------|
| 1 | Lodo primário (ETEs) | Primary Sludge (WWTPs) | 54.51% | EXCEPTIONAL 🌟 | 💧 |
| 2 | Lodo secundário (ETEs) | Secondary Sludge (WWTPs) | 46.35% | EXCEPTIONAL 🌟 | 💧 |
| 3 | FORSU - Fração Orgânica separada | Source-Separated Organic Fraction | 42.12% | EXCEPTIONAL 🌟 | 🗑️ |
| 4 | Fração orgânica RSU | Municipal Solid Waste Organic Fraction | 20.48% | REASONABLE ⚠️ | 🗑️ |

**Notes**:
- 🌟 **Highest FDEs overall**: Urban wastewater sludges (46-54%)
- ♻️ **Circular economy**: FORSU (42.12%) requires source separation programs
- 🗑️ **MSW challenges**: Organic fraction contamination reduces to 20.48%

---

### 1.2 Residues by Chemical Parameters

#### High BMP (Biochemical Methane Potential) Residues:
- **Fats and tallow**: ~650-800 L CH₄/kg VS
- **Swine manure**: ~350-450 L CH₄/kg VS
- **Primary sludge**: ~300-400 L CH₄/kg VS
- **Coffee pulp**: ~250-350 L CH₄/kg VS

#### High TS (Total Solids) Residues:
- **Filter cake**: 20-30% TS
- **Poultry litter**: 60-80% TS
- **Sugarcane bagasse**: 40-50% TS
- Require pre-treatment or co-digestion

#### Liquid Residues (Low TS):
- **Vinasse**: 3-5% TS (high volume, low concentration)
- **Swine liquid manure**: 2-6% TS
- **Wastewater sludge**: 1-8% TS
- Suitable for UASB or covered lagoons

---

## 🔧 SECTION 2: VERIFIED TECHNOLOGIES DATABASE

### 2.1 Complete Technologies Inventory (26 Total)

#### 🌾 FEEDSTOCK CATEGORY (6 Technologies)

| ID | Name (PT) | Name (EN) | Icon | Color | Description |
|----|-----------|-----------|------|-------|-------------|
| feed_vinasse | Vinhaça | Vinasse | 🍷 | #8B4513 | Liquid residue from sugarcane ethanol |
| feed_bagasse | Bagaço de Cana | Sugarcane Bagasse | 🌾 | #D2691E | Fibrous solid residue from milling |
| feed_straw | Palha de Cana | Sugarcane Straw | 🌿 | #9ACD32 | Mechanized harvest residue |
| feed_filter_cake | Torta de Filtro | Filter Cake | 🍰 | #A0522D | Wet residue from juice clarification |
| feed_cattle_manure | Esterco Bovino | Cattle Manure | 🐄 | #8B6914 | Waste from confined cattle |
| feed_pig_manure | Dejetos Suínos | Pig Manure | 🐷 | #CD853F | Liquid waste from pig farming |

**Connection Rules**: Can connect to → [pretreatment, digestion]

---

#### ⚙️ PRETREATMENT CATEGORY (3 Technologies)

| ID | Name (PT) | Name (EN) | Icon | Color | Description |
|----|-----------|-----------|------|-------|-------------|
| pre_thermal | Hidrólise Térmica | Thermal Hydrolysis | 🔥 | #FF6347 | High pressure/temperature treatment |
| pre_mechanical | Preparo Mecânico | Mechanical Preparation | ⚙️ | #708090 | Grinding, milling, homogenization |
| pre_chemical | Pré-tratamento Químico | Chemical Pretreatment | 🧪 | #4682B4 | Acids, bases, or solvents treatment |

**Connection Rules**: Can receive from → [feedstock], Can connect to → [digestion]

---

#### 🏭 DIGESTION CATEGORY (4 Technologies)

| ID | Name (PT) | Name (EN) | Icon | Color | Description |
|----|-----------|-----------|------|-------|-------------|
| dig_cstr | CSTR | Continuously Stirred Tank Reactor | 🏭 | #4682B4 | Ideal for high solids substrates |
| dig_uasb | UASB | Upflow Anaerobic Sludge Blanket | 💧 | #1E90FF | Ideal for liquid effluents |
| dig_lagoon | Lagoa Coberta | Covered Lagoon | 🏞️ | #20B2AA | Anaerobic lagoon with biogas capture |
| dig_plug_flow | Fluxo Pistão | Plug Flow | 🔄 | #5F9EA0 | Horizontal flow for high solids |

**Connection Rules**: Can receive from → [feedstock, pretreatment], Can connect to → [upgrading, enduse, byproduct]

---

#### 🔬 UPGRADING CATEGORY (4 Technologies)

| ID | Name (PT) | Name (EN) | Icon | Color | Description |
|----|-----------|-----------|------|-------|-------------|
| upg_membrane | Separação por Membrana | Membrane Separation | 🧬 | #9370DB | Selective permeable membranes |
| upg_psa | PSA | Pressure Swing Adsorption | 🔬 | #8A2BE2 | Pressure oscillation adsorption |
| upg_water_scrubbing | Water Scrubbing | Water Scrubbing | 💦 | #6A5ACD | Pressurized water CO₂ removal |
| upg_chemical_scrubbing | Lavagem Química | Chemical Scrubbing | ⚗️ | #7B68EE | Amine chemical solutions |

**Connection Rules**: Can receive from → [digestion], Can connect to → [enduse, byproduct]

---

#### ⚡ END USE CATEGORY (5 Technologies)

| ID | Name (PT) | Name (EN) | Icon | Color | Description |
|----|-----------|-----------|------|-------|-------------|
| end_cogen | Cogeração | Cogeneration (CHP) | ⚡ | #FFD700 | Combined heat and power generation |
| end_grid_injection | Injeção na Rede | Grid Injection | 🔌 | #32CD32 | Biomethane into natural gas grid |
| end_vehicle_fuel | Biometano Veicular | Vehicle Fuel (Bio-CNG) | 🚗 | #00CED1 | Compressed biomethane for vehicles |
| end_boiler | Caldeira | Boiler | ♨️ | #FF8C00 | Steam and heat for industry |
| end_fuel_cell | Célula Combustível | Fuel Cell | 🔋 | #FFA500 | High-efficiency electric generation |

**Connection Rules**: Can receive from → [digestion, upgrading], Terminal nodes (no outbound)

---

#### 🌱 BYPRODUCT CATEGORY (4 Technologies)

| ID | Name (PT) | Name (EN) | Icon | Color | Description |
|----|-----------|-----------|------|-------|-------------|
| byp_digestate | Digestato | Digestate | 🌱 | #228B22 | Nutrient-rich biofertilizer |
| byp_co2 | CO₂ Capturado | Captured CO₂ | 💨 | #B0C4DE | Food-grade or industrial CO₂ |
| byp_solid_digestate | Digestato Sólido | Solid Digestate | 🪨 | #6B8E23 | Solid fraction soil conditioner |
| byp_liquid_digestate | Digestato Líquido | Liquid Digestate | 💧 | #4682B4 | Liquid fraction soluble nutrients |

**Connection Rules**: Can receive from → [digestion, upgrading], Terminal nodes (no outbound)

---

### 2.2 Technology Pathways Examples

#### Example 1: Sugarcane Ethanol Biorefinery
```
🍷 Vinasse (feedstock)
  ↓
💧 UASB Reactor (digestion)
  ↓
⚡ Cogeneration (end use) + 🌱 Digestate (byproduct)
```

#### Example 2: Swine Farm Advanced Route
```
🐷 Pig Manure (feedstock)
  ↓
🏭 CSTR (digestion)
  ↓
🧬 Membrane Separation (upgrading)
  ↓
🔌 Grid Injection (end use) + 💨 CO₂ Capturado (byproduct)
```

#### Example 3: Lignocellulosic Complex Route
```
🌾 Sugarcane Bagasse (feedstock)
  ↓
🔥 Thermal Hydrolysis (pretreatment)
  ↓
🔄 Plug Flow Reactor (digestion)
  ↓
🔬 PSA (upgrading)
  ↓
🚗 Vehicle Fuel (end use)
```

---

## 🎨 SECTION 3: VISUAL IDENTITY MAPPING

### 3.1 CP2B Brand Color System

#### Primary Colors (Biogas/Nature Theme):
- **Dark Green**: `#1B5E20` - Primary actions, headers
- **Green**: `#2F7D32` - Main brand, primary buttons
- **Light Green**: `#4CAF50` - Secondary actions, badges
- **Lime**: `#9CCC65` - Tertiary accent, focus rings

#### Sector-Specific Colors:
- **Agriculture**: `#4CAF50` (Green) - 🌱
- **Livestock**: `#FF9800` (Orange) - 🐄
- **Industrial**: `#FF6347` (Tomato Red) - 🏭
- **Urban**: `#2196F3` (Blue) - 🏙️

#### Technology Category Colors (Already Defined):
- **Feedstock**: Brown tones (#8B4513, #D2691E, #9ACD32, #A0522D, #8B6914, #CD853F)
- **Pretreatment**: Hot colors (#FF6347, #708090, #4682B4)
- **Digestion**: Blue tones (#4682B4, #1E90FF, #20B2AA, #5F9EA0)
- **Upgrading**: Purple tones (#9370DB, #8A2BE2, #6A5ACD, #7B68EE)
- **End Use**: Bright energetic (#FFD700, #32CD32, #00CED1, #FF8C00, #FFA500)
- **Byproducts**: Earth/nature tones (#228B22, #B0C4DE, #6B8E23, #4682B4)

---

### 3.2 Card Component Design Pattern

#### Current TechnologyCard Structure:
```tsx
<div className="p-3 rounded-lg border border-gray-200
     hover:shadow-md hover:border-gray-300
     transition-all bg-white"
     style={{ borderLeftColor: color, borderLeftWidth: '4px' }}>

  <div className="flex items-center gap-3">
    <span className="text-2xl">{emoji}</span>
    <div className="flex-1">
      <div className="font-medium text-gray-900 text-sm">{namePt}</div>
      <div className="text-xs text-gray-500">{nameEn}</div>
    </div>
    {references.length > 0 && (
      <span className="text-xs bg-blue-100 text-blue-700
            px-2 py-1 rounded-full">
        {references.length} ref
      </span>
    )}
  </div>

  <p className="mt-2 text-xs text-gray-600 line-clamp-2">
    {descriptionPt}
  </p>
</div>
```

#### Proposed ResidueCard Structure (New):
```tsx
<div className="p-3 rounded-lg border border-gray-200
     hover:shadow-md hover:border-gray-300
     transition-all bg-white"
     style={{ borderLeftColor: sectorColor, borderLeftWidth: '4px' }}>

  <div className="flex items-center gap-3">
    <span className="text-2xl">{emoji}</span>
    <div className="flex-1">
      <div className="font-medium text-gray-900 text-sm">{nome}</div>
      <div className="text-xs text-gray-500">{nomeEn}</div>
    </div>
    <span className="text-xs font-bold text-green-700">
      FDE: {(fde * 100).toFixed(1)}%
    </span>
  </div>

  <div className="mt-2 flex items-center gap-2">
    <span className={`text-xs px-2 py-0.5 rounded-full ${validationBadgeClass}`}>
      {validationStatus}
    </span>
    <span className="text-xs text-gray-500">{sectorNome}</span>
  </div>

  {/* Chemical parameters preview */}
  <div className="mt-2 grid grid-cols-3 gap-1 text-xs text-gray-600">
    <div>BMP: {bmpMedio}L</div>
    <div>TS: {tsMedio}%</div>
    <div>VS: {vsMedio}%</div>
  </div>
</div>
```

---

### 3.3 Visual Hierarchy & Spacing

#### Card Spacing Convention:
- **Padding**: `p-3` (12px) for compact cards, `p-6` (24px) for expanded
- **Gap between items**: `gap-2` (8px) small, `gap-3` (12px) medium, `gap-4` (16px) large
- **Border radius**: `rounded-lg` (0.5rem) standard, `rounded-xl` (0.75rem) prominent

#### Shadow & Elevation:
- **At rest**: `shadow-sm` - subtle
- **On hover**: `shadow-md` - medium elevation
- **Selected/Active**: `shadow-lg` + `ring-2 ring-blue-300` - prominent

#### Typography Scale:
- **Card title**: `text-sm font-medium` (14px)
- **Subtitle/Secondary**: `text-xs text-gray-500` (12px)
- **Description**: `text-xs text-gray-600` (12px)
- **Emoji icons**: `text-2xl` (24px)

---

## 🏗️ SECTION 4: BUILDING BLOCKS ARCHITECTURE

### 4.1 Dual-Source Node System

Currently, BioRoute only has **Technology Nodes**. We propose adding **Residue Nodes** to create realistic biogas scenarios.

#### Architecture Overview:
```
┌─────────────────────────────────────────────────────────────┐
│                    BIOROUTE CANVAS                          │
│                                                             │
│  ┌──────────────┐        ┌──────────────┐                 │
│  │   RESIDUES   │        │ TECHNOLOGIES │                 │
│  │   PALETTE    │        │   PALETTE    │                 │
│  │   (NEW)      │        │  (EXISTING)  │                 │
│  └──────────────┘        └──────────────┘                 │
│         │                        │                         │
│         └────────┬───────────────┘                         │
│                  ↓                                         │
│          [DRAG & DROP CANVAS]                             │
│                  │                                         │
│                  ↓                                         │
│         Residue Node  →  Technology Node  →  End Use      │
│         (🍷 Vinasse)    (💧 UASB)         (⚡ Cogen)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 4.2 Node Type Definitions

#### Type 1: Residue Node (NEW)
**Purpose**: Starting point representing biomass feedstock availability

**Visual Properties**:
- **Shape**: Rounded rectangle with **sector-colored left border** (4px)
- **Size**: `min-w-[180px]`
- **Background**: White with slight opacity (`bg-white/95 backdrop-blur-sm`)
- **Badge**: FDE percentage badge (green if >20%, orange if 10-20%, red if <10%)

**Data Structure**:
```typescript
interface ResidueNode {
  id: string;                    // residuo_codigo (e.g., "AG_CANA_002")
  type: 'residue';
  data: {
    residueId: string;           // Database ID
    nome: string;                // Portuguese name
    nomeEn: string;              // English name
    emoji: string;               // Icon emoji
    sectorCodigo: string;        // AG_AGRICULTURA, PC_PECUARIA, etc.
    sectorColor: string;         // Sector-specific color
    fde: number;                 // FDE percentage (0-1)
    bmpMedio: number;            // BMP L CH₄/kg VS
    tsMedio: number;             // Total Solids %
    validationStatus: string;    // EMBRAPA_VALIDATED, etc.
  };
  position: { x: number; y: number };
}
```

**Connection Rules**:
- **Can connect TO**: Technology nodes of type "feedstock" or "pretreatment" or "digestion"
- **Cannot connect TO**: Upgrading, End Use, or Byproduct nodes directly

---

#### Type 2: Technology Node (EXISTING, Enhanced)
**Purpose**: Processing steps in biogas pathway

**Enhanced Data Structure**:
```typescript
interface TechnologyNode {
  id: string;
  type: 'technology';
  data: {
    techId: string;              // Technology ID (e.g., "dig_cstr")
    category: TechnologyCategory;
    namePt: string;
    nameEn: string;
    emoji: string;
    color: string;
    descriptionPt: string;
    references: Reference[];     // Scientific papers
    // NEW: Compatibility constraints
    compatibleResidues?: string[]; // Array of residue sector codes
    minTS?: number;              // Minimum total solids requirement
    maxTS?: number;              // Maximum total solids capacity
  };
  position: { x: number; y: number };
}
```

---

### 4.3 Connection Validation Logic

#### Smart Connection Rules:
```typescript
// Example 1: Vinasse (liquid, low TS) → Best with UASB or Covered Lagoon
if (residue.tsMedio < 5 && residue.sectorCodigo.startsWith('AG_')) {
  recommendedTech = ['dig_uasb', 'dig_lagoon'];
  notRecommended = ['dig_plug_flow']; // Requires high TS
}

// Example 2: Bagasse (fibrous, high TS) → Requires pretreatment
if (residue.nome.includes('Bagaço') && residue.tsMedio > 40) {
  requiredPretreatment = ['pre_thermal', 'pre_mechanical'];
  recommendedDigestor = ['dig_cstr', 'dig_plug_flow'];
}

// Example 3: Fats (high lipid content) → Needs controlled loading
if (residue.nome.includes('Gordura') || residue.nome.includes('Sebo')) {
  warning = 'Co-digestion required - max 20% lipid loading rate';
  recommendedCoSubstrates = ['cattle_manure', 'feed_vinasse'];
}
```

---

### 4.4 Visual Feedback System

#### Connection States:
1. **Valid Connection** (Green line, animated):
   - Residue TS matches technology requirements
   - Sector compatibility confirmed
   - FDE > 5% (viable)

2. **Warning Connection** (Orange dashed line):
   - Residue requires co-digestion
   - Pretreatment strongly recommended
   - Low FDE (5-15%)

3. **Invalid Connection** (Red, blocked):
   - Incompatible TS range
   - Category mismatch (e.g., Residue → End Use directly)
   - FDE < 5% (inviable)

#### Visual Indicators:
```tsx
// Connection edge styling
const edgeStyle = {
  stroke: connectionStatus === 'valid' ? '#4CAF50' :
          connectionStatus === 'warning' ? '#FF9800' : '#EF5350',
  strokeWidth: 2,
  strokeDasharray: connectionStatus === 'warning' ? '5,5' : 'none',
  animated: connectionStatus === 'valid',
};

// Hover tooltip on edge
<EdgeLabel>
  {connectionStatus === 'warning' && (
    <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
      ⚠️ Co-digestion recommended
    </div>
  )}
</EdgeLabel>
```

---

## 📊 SECTION 5: INTEGRATION RECOMMENDATIONS

### 5.1 Database Schema Extensions

#### New Table: `residue_technology_compatibility`
```sql
CREATE TABLE IF NOT EXISTS residue_technology_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  residue_codigo VARCHAR(50) REFERENCES residuos(codigo),
  technology_id VARCHAR(50) REFERENCES technology_cards(id),
  compatibility_level VARCHAR(20), -- 'optimal', 'suitable', 'possible', 'not_recommended'
  notes TEXT,
  requires_pretreatment BOOLEAN DEFAULT FALSE,
  requires_codigestion BOOLEAN DEFAULT FALSE,
  loading_rate_max DECIMAL(5,2), -- % of total feedstock
  created_at TIMESTAMP DEFAULT NOW()
);

-- Example entries
INSERT INTO residue_technology_compatibility VALUES
  ('uuid1', 'AG_CANA_002', 'dig_uasb', 'optimal', 'Vinhaça ideal for UASB reactors', FALSE, FALSE, 100.0),
  ('uuid2', 'AG_CANA_001', 'dig_cstr', 'suitable', 'Bagasse needs grinding', TRUE, TRUE, 30.0),
  ('uuid3', 'IN_FRIGORIFICOS_001', 'dig_cstr', 'possible', 'Fats require controlled loading', FALSE, TRUE, 20.0);
```

---

### 5.2 API Endpoints (New)

#### GET `/api/residues`
**Purpose**: Fetch all residues with filtering

**Query Parameters**:
- `sector` (optional): Filter by sector (AG_AGRICULTURA, PC_PECUARIA, etc.)
- `minFDE` (optional): Minimum FDE threshold (e.g., 0.10 for 10%)
- `validationStatus` (optional): Filter by validation confidence

**Response**:
```json
{
  "residues": [
    {
      "codigo": "AG_CANA_002",
      "nome": "Vinhaça",
      "nomeEn": "Vinasse",
      "emoji": "🍷",
      "sector": {
        "codigo": "AG_AGRICULTURA",
        "nome": "Agricultura",
        "emoji": "🌱",
        "color": "#4CAF50"
      },
      "fde": 0.0698,
      "bmpMedio": 350,
      "tsMedio": 4.5,
      "vsMedio": 85,
      "validationStatus": "UNICA_VALIDATED",
      "validationConfidence": "HIGH"
    }
  ],
  "count": 38
}
```

---

#### GET `/api/residues/:codigo/compatible-technologies`
**Purpose**: Get recommended technologies for a specific residue

**Response**:
```json
{
  "residue": { /* residue object */ },
  "compatibleTechnologies": [
    {
      "technology": { /* technology object */ },
      "compatibility": "optimal",
      "reasoning": "Low TS content ideal for UASB upflow reactors",
      "requiresPretreatment": false,
      "requiresCodigestion": false
    },
    {
      "technology": { /* dig_cstr object */ },
      "compatibility": "suitable",
      "reasoning": "Can be used in CSTR with co-digestion",
      "requiresCodigestion": true,
      "recommendedCoSubstrates": ["cattle_manure", "pig_manure"]
    }
  ]
}
```

---

#### POST `/api/technology-routes/validate`
**Purpose**: Validate a complete user-designed pathway

**Request Body**:
```json
{
  "nodes": [
    { "id": "node1", "type": "residue", "data": { "residueId": "AG_CANA_002" } },
    { "id": "node2", "type": "technology", "data": { "techId": "dig_uasb" } },
    { "id": "node3", "type": "technology", "data": { "techId": "end_cogen" } }
  ],
  "edges": [
    { "source": "node1", "target": "node2" },
    { "source": "node2", "target": "node3" }
  ]
}
```

**Response**:
```json
{
  "isValid": true,
  "warnings": [
    "Consider adding biogas upgrading for higher efficiency"
  ],
  "errors": [],
  "recommendations": [
    "Add digestate recovery (byp_digestate) for circular economy benefits"
  ],
  "estimatedPerformance": {
    "biogasYield": "estimated 350 L CH₄/kg VS",
    "energyPotential": "calculated based on residue availability"
  }
}
```

---

### 5.3 Frontend Components (New)

#### Component 1: `ResiduePalette.tsx`
**Purpose**: Left sidebar palette for residue selection

**Features**:
- Group residues by sector (collapsible sections)
- Search/filter by name or FDE range
- Sort by FDE (highest first) or alphabetically
- Show validation status badges

```tsx
<div className="residue-palette w-80 bg-white border-r">
  <div className="p-4">
    <h2 className="text-lg font-semibold mb-3">Resíduos</h2>
    <input type="search" placeholder="Buscar resíduo..." />

    {/* Sector filters */}
    <div className="flex gap-2 mt-3 flex-wrap">
      <button className="sector-filter">🌱 Agricultura (19)</button>
      <button className="sector-filter">🐄 Pecuária (7)</button>
      <button className="sector-filter">🏭 Industrial (8)</button>
      <button className="sector-filter">🏙️ Urbano (4)</button>
    </div>
  </div>

  <div className="residue-list overflow-y-auto">
    {sectors.map(sector => (
      <ResidueSection key={sector.codigo} sector={sector}>
        {sector.residues.map(residue => (
          <ResidueCard key={residue.codigo} residue={residue} draggable />
        ))}
      </ResidueSection>
    ))}
  </div>
</div>
```

---

#### Component 2: `ResidueNode.tsx`
**Purpose**: Custom React Flow node for residues

```tsx
function ResidueNode({ data, selected }: NodeProps<ResidueNodeData>) {
  const fdePercentage = (data.fde * 100).toFixed(1);
  const fdeBadgeClass =
    data.fde >= 0.20 ? 'bg-green-100 text-green-800' :
    data.fde >= 0.10 ? 'bg-orange-100 text-orange-800' :
    'bg-red-100 text-red-800';

  return (
    <div
      className={`residue-node px-4 py-3 rounded-lg shadow-md border-2
        min-w-[180px] bg-white/95 backdrop-blur-sm transition-all
        ${selected ? 'border-blue-500 shadow-lg ring-2 ring-blue-300' : 'border-gray-300'}`}
      style={{
        borderLeftColor: data.sectorColor,
        borderLeftWidth: '4px',
      }}
    >
      {/* Target handle (top) - can receive from other residues (co-digestion) */}
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-gray-400" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{data.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {data.nome}
          </div>
          <div className="text-xs text-gray-500 capitalize truncate">
            {data.sectorNome}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${fdeBadgeClass}`}>
          FDE: {fdePercentage}%
        </span>
        <span className="text-xs text-gray-600">
          {data.bmpMedio} L/kg
        </span>
      </div>

      {/* Source handle (bottom) - connects to technologies */}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-green-500" />
    </div>
  );
}
```

---

#### Component 3: `PathwayValidationPanel.tsx`
**Purpose**: Real-time validation and recommendations panel

```tsx
<div className="validation-panel w-96 bg-white border-l">
  <div className="p-4">
    <h3 className="text-lg font-semibold mb-3">Validação da Rota</h3>

    {/* Validation status */}
    <div className={`p-3 rounded-lg ${validationStatusClass}`}>
      {isValid ? (
        <>
          <CheckCircle className="inline mr-2" />
          <span>Rota válida!</span>
        </>
      ) : (
        <>
          <AlertCircle className="inline mr-2" />
          <span>Atenção: {errors.length} problemas encontrados</span>
        </>
      )}
    </div>

    {/* Errors */}
    {errors.length > 0 && (
      <div className="mt-3">
        <h4 className="font-semibold text-red-700 mb-2">Erros:</h4>
        <ul className="space-y-1">
          {errors.map((error, i) => (
            <li key={i} className="text-sm text-red-600">• {error}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Warnings */}
    {warnings.length > 0 && (
      <div className="mt-3">
        <h4 className="font-semibold text-orange-700 mb-2">Avisos:</h4>
        <ul className="space-y-1">
          {warnings.map((warning, i) => (
            <li key={i} className="text-sm text-orange-600">• {warning}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Recommendations */}
    {recommendations.length > 0 && (
      <div className="mt-3">
        <h4 className="font-semibold text-blue-700 mb-2">Recomendações:</h4>
        <ul className="space-y-1">
          {recommendations.map((rec, i) => (
            <li key={i} className="text-sm text-blue-600">💡 {rec}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Performance estimation */}
    {estimatedPerformance && (
      <div className="mt-4 p-3 bg-green-50 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">Desempenho Estimado:</h4>
        <div className="text-sm text-green-700">
          <p>Produção de biogás: {estimatedPerformance.biogasYield}</p>
          <p>Potencial energético: {estimatedPerformance.energyPotential}</p>
        </div>
      </div>
    )}
  </div>
</div>
```

---

### 5.4 User Experience Flow

#### Step 1: User enters BioRoute page
- Sees three-panel layout: **Residues Palette | Canvas | Technologies Palette**
- Empty canvas with subtle grid background
- Instructional overlay: "Arraste resíduos e tecnologias para criar sua rota de biogás"

#### Step 2: User drags a residue (e.g., Vinhaça)
- Residue node appears on canvas
- Canvas shows green connection handles
- Validation panel shows: "Adicione uma tecnologia de digestão para continuar"

#### Step 3: User drags a technology (e.g., UASB)
- Technology node appears
- User draws connection from Residue → UASB
- Edge animates in green (valid connection)
- Validation panel shows: "✅ Conexão válida: Vinhaça é ideal para reatores UASB"

#### Step 4: User completes pathway
- Adds upgrading (Membrane Separation)
- Adds end use (Grid Injection)
- Adds byproduct (CO₂ Capturado)
- Validation panel shows estimated performance
- User saves route with name and description

#### Step 5: User shares or exports
- Generate shareable link with route configuration
- Export as image (PNG/SVG)
- Export as JSON for simulation software
- Save to user's library

---

## 🚀 SECTION 6: IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1)
**Goal**: Add Residues data layer to BioRoute

- [x] Database schema complete (residuos table exists)
- [ ] Create API endpoint `/api/residues`
- [ ] Create API endpoint `/api/sectors`
- [ ] Create `ResidueCard.tsx` component
- [ ] Create `ResiduePalette.tsx` component
- [ ] Integrate residues palette into existing BioRoute page

**Deliverable**: Users can browse residues by sector in left sidebar

---

### Phase 2: Nodes & Canvas (Week 2)
**Goal**: Enable dragging residues onto canvas

- [ ] Create `ResidueNode.tsx` custom node component
- [ ] Add residue node type to React Flow
- [ ] Implement drag-and-drop from ResiduePalette to Canvas
- [ ] Style residue nodes with sector colors and FDE badges
- [ ] Add node selection and info display

**Deliverable**: Users can place residue nodes on canvas

---

### Phase 3: Connection Logic (Week 2-3)
**Goal**: Implement smart connection validation

- [ ] Create `residue_technology_compatibility` table
- [ ] Seed compatibility data (38 residues × 26 technologies = 988 combinations)
- [ ] Create API endpoint `/api/residues/:codigo/compatible-technologies`
- [ ] Implement connection validation logic
- [ ] Add visual feedback (green/orange/red edges)
- [ ] Create hover tooltips for connections

**Deliverable**: Valid and invalid connections are visually indicated

---

### Phase 4: Validation & Recommendations (Week 3)
**Goal**: Real-time pathway validation

- [ ] Create `PathwayValidationPanel.tsx` component
- [ ] Create API endpoint `/api/technology-routes/validate`
- [ ] Implement validation rules engine
- [ ] Add warning and error messaging
- [ ] Add performance estimation logic

**Deliverable**: Users receive real-time feedback on their route designs

---

### Phase 5: Save & Share (Week 4)
**Goal**: Persistence and collaboration

- [ ] Extend `user_routes` table to store residue nodes
- [ ] Update canvas save functionality
- [ ] Implement route loading from saved data
- [ ] Add public sharing with share tokens
- [ ] Add export functionality (PNG, JSON)

**Deliverable**: Users can save, load, and share their biogas routes

---

### Phase 6: Polish & Documentation (Week 4)
**Goal**: Production-ready feature

- [ ] Add onboarding tutorial (interactive walkthrough)
- [ ] Create example routes (5-10 pre-built scenarios)
- [ ] Write user documentation
- [ ] Add keyboard shortcuts (Delete, Ctrl+Z undo, etc.)
- [ ] Performance optimization (canvas rendering)
- [ ] Mobile responsiveness check

**Deliverable**: Feature-complete BioRoute system ready for users

---

## 📈 SECTION 7: SUCCESS METRICS

### User Engagement Metrics:
- **Routes Created**: Target 50+ routes in first month
- **Nodes Per Route**: Average 5-8 nodes (realistic complexity)
- **Save Rate**: >60% of users save at least one route
- **Share Rate**: >20% of saved routes are shared publicly

### Technical Metrics:
- **Validation Accuracy**: 95%+ compatibility predictions correct
- **Canvas Performance**: 60 FPS with 20+ nodes
- **Load Time**: <2 seconds for route loading
- **API Response**: <200ms for validation endpoint

### User Feedback Metrics:
- **Satisfaction Score**: >4.0/5.0
- **Feature Requests**: Collect and prioritize
- **Bug Reports**: <5 critical bugs in first month

---

## 🎯 SECTION 8: DESIGN MOCKUPS (ASCII Art)

### Layout Overview:
```
┌────────────────────────────────────────────────────────────────────────────┐
│  🌱 PILAR-2b V3 - Rotas Tecnológicas (Technology Routes)                 │
├──────────────┬─────────────────────────────────────────┬───────────────────┤
│              │                                         │                   │
│  RESÍDUOS    │           CANVAS INTERATIVO             │  TECNOLOGIAS      │
│  (NEW)       │                                         │  (EXISTING)       │
│              │                                         │                   │
│ 🔍 Buscar    │  ┌─────────┐                           │ 🔍 Buscar         │
│ ─────────    │  │🍷Vinhaça│                           │ ─────────         │
│              │  └────┬────┘                           │                   │
│ 🌱 Agricultura│       │                                │ 🌾 Matéria-Prima │
│   • Vinhaça  │       ↓                                │   • Vinhaça       │
│   • Bagaço   │  ┌────────┐      ┌──────────┐         │   • Bagaço        │
│   • Torta... │  │💧 UASB │  →   │⚡ Cogen  │         │   ...             │
│              │  └────┬───┘      └──────────┘         │                   │
│ 🐄 Pecuária  │       │                                │ ⚙️ Pré-tratamento │
│   • Dejetos..│       ↓                                │   • Térmica       │
│              │  ┌─────────┐                           │   ...             │
│ 🏭 Industrial│  │🌱Digest.│                           │                   │
│   • Gordura..│  └─────────┘                           │ 🏭 Digestão       │
│              │                                         │   • CSTR          │
│ 🏙️ Urbano    │  [Arraste resíduos e tecnologias]      │   • UASB          │
│   • Lodo ETE │                                         │   ...             │
│   ...        │                                         │                   │
│              │                                         │ 🔬 Upgrade        │
│              │                                         │   • Membranas     │
│              │                                         │   ...             │
│              │                                         │                   │
│ 📊 Ordenar:  │                                         │ ⚡ Uso Final      │
│ • FDE desc   │                                         │   • Cogeração     │
│ • Nome asc   │                                         │   ...             │
│              │                                         │                   │
└──────────────┴─────────────────────────────────────────┴───────────────────┘
```

### Residue Card Design:
```
┌─────────────────────────────────────────┐
│🍷  Vinhaça                              │
│    Vinasse                              │
│                                         │
│ ✅ UNICA_VALIDATED        FDE: 6.98%   │
│ 🌱 Agricultura                          │
│                                         │
│ BMP: 350 L/kg  TS: 4.5%  VS: 85%      │
└─────────────────────────────────────────┘
```

### Technology Card Design (Existing):
```
┌─────────────────────────────────────────┐
│💧  UASB                       3 ref    │
│    Upflow Anaerobic Sludge Blanket     │
│                                         │
│ Reator anaeróbio de fluxo ascendente  │
│ com manta de lodo, ideal para          │
│ efluentes líquidos                      │
└─────────────────────────────────────────┘
```

---

## ⚡ SECTION 9: QUICK WINS & IMMEDIATE ACTIONS

### Quick Win 1: Add Residues Emoji Dictionary
**Effort**: 30 minutes
**Impact**: High visual appeal

Create a mapping file with emojis for all 38 residues:
```typescript
// frontend/src/constants/residueEmojis.ts
export const RESIDUE_EMOJIS: Record<string, string> = {
  // Agriculture
  'Vinhaça': '🍷',
  'Bagaço de cana': '🌾',
  'Palha de cana': '🌿',
  'Torta de filtro': '🍰',
  'Polpa de café': '☕',
  'Casca de milho': '🌽',
  // ... (all 38 residues)
};
```

---

### Quick Win 2: Create Sector Color Constants
**Effort**: 15 minutes
**Impact**: Consistency across platform

```typescript
// frontend/src/constants/sectorColors.ts
export const SECTOR_COLORS = {
  AG_AGRICULTURA: '#4CAF50',
  PC_PECUARIA: '#FF9800',
  IN_INDUSTRIAL: '#FF6347',
  UR_URBANO: '#2196F3',
} as const;

export const SECTOR_INFO = {
  AG_AGRICULTURA: { nome: 'Agricultura', emoji: '🌱', color: '#4CAF50' },
  PC_PECUARIA: { nome: 'Pecuária', emoji: '🐄', color: '#FF9800' },
  IN_INDUSTRIAL: { nome: 'Industrial', emoji: '🏭', color: '#FF6347' },
  UR_URBANO: { nome: 'Urbano', emoji: '🏙️', color: '#2196F3' },
} as const;
```

---

### Quick Win 3: Add FDE Badge Helper Function
**Effort**: 10 minutes
**Impact**: Consistent FDE display

```typescript
// frontend/src/utils/fdeHelpers.ts
export function getFDEBadgeClass(fde: number): string {
  if (fde >= 0.20) return 'bg-green-100 text-green-800';
  if (fde >= 0.10) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}

export function getFDELabel(fde: number): string {
  if (fde >= 0.20) return 'Alto potencial';
  if (fde >= 0.10) return 'Potencial médio';
  if (fde >= 0.05) return 'Potencial baixo';
  return 'Inviável';
}
```

---

## 🔧 SECTION 10: DEPLOYMENT OPTIMIZATION

### Issue Identified:
Your Railway deployment is taking **8.5 minutes**, with the Docker image import step consuming **6.5 minutes** (76% of build time).

### Root Causes:
1. **Large geospatial libraries**: GDAL, Fiona, Rasterio, Shapely add ~150MB
2. **Shapefile downloads**: 13 shapefiles + 1 raster file during build
3. **No layer caching**: Full rebuild every time
4. **Nixpacks overhead**: 107 Nix packages (140MB) downloaded fresh

---

### Optimization Recommendations:

#### Quick Fix 1: Add `.dockerignore` (Immediate - 30% faster)
Create `/home/user/NewLook/cp2b-workspace/NewLook/backend/.dockerignore`:
```
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt
.tox/
.coverage
.pytest_cache/
*.log
*.sqlite
*.db
.DS_Store
.idea/
.vscode/
*.swp
*.swo
*~
```

---

#### Quick Fix 2: Use Multi-Stage Docker Build (40% faster)
Replace Nixpacks with custom Dockerfile:

```dockerfile
# Build stage
FROM python:3.10-slim as builder

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Runtime stage
FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libpq5 \
    gdal-bin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

#### Quick Fix 3: Pre-download Shapefiles (50% faster)
Store shapefiles in GitHub LFS or cloud storage, not downloaded during build:

```bash
# .github/workflows/prepare-assets.yml
name: Prepare Assets
on: [push]
jobs:
  cache-shapefiles:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/cache@v3
        with:
          path: backend/data/shapefiles
          key: shapefiles-${{ hashFiles('scripts/download-shapefiles.sh') }}
      - name: Download if not cached
        run: bash scripts/download-shapefiles.sh
```

---

#### Recommended: Railway Build Cache
Update `railway.toml`:
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10

# Enable build cache
[build.cache]
  paths = [
    "/root/.cache/pip",
    "/app/data/shapefiles"
  ]
```

**Expected Result**: Build time reduced from **8.5 min → 2-3 min** (60-65% faster)

---

## 📝 SECTION 11: ACTION ITEMS SUMMARY

### Immediate Actions (Today):
1. ✅ Review this comprehensive analysis document
2. [ ] Create `.dockerignore` file for backend
3. [ ] Add `RESIDUE_EMOJIS` and `SECTOR_COLORS` constants
4. [ ] Create `/api/residues` endpoint (30 min implementation)

### Short-term (This Week):
1. [ ] Implement `ResidueCard.tsx` component
2. [ ] Implement `ResiduePalette.tsx` component
3. [ ] Integrate residues palette into BioRoute page
4. [ ] Test residues browsing and filtering
5. [ ] Optimize Docker build with multi-stage approach

### Medium-term (Next 2 Weeks):
1. [ ] Create `ResidueNode.tsx` custom node
2. [ ] Implement drag-and-drop residues to canvas
3. [ ] Create compatibility matrix (residues ↔ technologies)
4. [ ] Implement connection validation logic
5. [ ] Add visual feedback for valid/invalid connections

### Long-term (Next Month):
1. [ ] Complete all 6 phases of implementation roadmap
2. [ ] Deploy production-ready BioRoute with residues
3. [ ] Create 10 example routes for users
4. [ ] Write user documentation and tutorials
5. [ ] Collect user feedback and iterate

---

## 🎉 CONCLUSION

The **PILAR-2b V3 BioRoute** feature has a solid foundation with 26 predefined technologies and a React Flow canvas. By integrating the **38 validated residues** from your comprehensive database, you'll create a powerful visual tool that enables users to:

1. **Explore realistic biogas scenarios** based on actual São Paulo biomass availability
2. **Design technology pathways** with smart validation and recommendations
3. **Understand biogas potential** through visual building blocks
4. **Share and collaborate** on biogas route designs
5. **Make data-driven decisions** for biogas project planning

### Key Strengths:
- ✅ **Comprehensive data**: 38 residues with FDE validation
- ✅ **Visual identity**: Consistent CP2B green theme established
- ✅ **Technical foundation**: React Flow + FastAPI + PostgreSQL
- ✅ **Scientific backing**: 58 academic papers linked to data

### Next Steps:
1. Start with **Quick Wins** (emojis, colors, helpers)
2. Follow **Phase 1** of implementation roadmap
3. Deploy **build optimizations** to reduce deployment time
4. Iterate based on user feedback

**Estimated Timeline**: 4 weeks to production-ready BioRoute with full residues integration.

---

**Document Version**: 1.0
**Author**: Claude Code Analysis
**Last Updated**: December 4, 2025
**Status**: Ready for Implementation

-- Migration: Create tables for scientific references and chemical characterization
-- Date: 2025-11-25
-- Description: Sets up residuos, sectors, references, and conversion factors tables

-- ============================================================================
-- 1. SECTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sectors (
    codigo VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    nome_en VARCHAR(200),
    emoji VARCHAR(10),
    ordem INTEGER,
    descricao TEXT
);

-- ============================================================================
-- 2. SUBSECTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subsectors (
    codigo VARCHAR(50) PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    nome_en VARCHAR(200),
    sector_codigo VARCHAR(50) REFERENCES sectors(codigo),
    emoji VARCHAR(10),
    ordem INTEGER
);

-- ============================================================================
-- 3. RESIDUOS TABLE (Main residues table)
-- ============================================================================
CREATE TABLE IF NOT EXISTS residuos (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    nome VARCHAR(200) NOT NULL,
    nome_en VARCHAR(200),
    sector_codigo VARCHAR(50) REFERENCES sectors(codigo),
    subsector_codigo VARCHAR(50) REFERENCES subsectors(codigo),
    categoria_codigo VARCHAR(50),
    categoria_nome VARCHAR(200),

    -- BMP (Biogas Methane Potential)
    bmp_min DECIMAL(10, 2),
    bmp_medio DECIMAL(10, 2),
    bmp_max DECIMAL(10, 2),
    bmp_unidade VARCHAR(50) DEFAULT 'NmL CH4/g VS',

    -- Total Solids (TS)
    ts_min DECIMAL(10, 2),
    ts_medio DECIMAL(10, 2),
    ts_max DECIMAL(10, 2),

    -- Volatile Solids (VS)
    vs_min DECIMAL(10, 2),
    vs_medio DECIMAL(10, 2),
    vs_max DECIMAL(10, 2),

    -- Chemical parameters
    chemical_cn_ratio DECIMAL(10, 2),
    chemical_ch4_content DECIMAL(10, 2),

    -- Conversion factors
    fc_medio DECIMAL(10, 4),
    fcp_medio DECIMAL(10, 4),
    fs_medio DECIMAL(10, 4),
    fl_medio DECIMAL(10, 4),
    fator_pessimista DECIMAL(10, 4),
    fator_realista DECIMAL(10, 4),
    fator_otimista DECIMAL(10, 4),

    -- Additional info
    generation TEXT,
    destination TEXT,
    icon VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. SCIENTIFIC REFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS residuo_references (
    id SERIAL PRIMARY KEY,
    residuo_id INTEGER REFERENCES residuos(id) ON DELETE CASCADE,
    parameter_type VARCHAR(50) NOT NULL,

    -- Citation details
    citation TEXT,
    authors TEXT,
    title TEXT,
    journal VARCHAR(300),
    year INTEGER,
    volume VARCHAR(50),
    pages VARCHAR(50),
    doi VARCHAR(200),
    url TEXT,

    -- Data validation
    reported_value DECIMAL(10, 2),
    reported_unit VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    validation_status VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. CONVERSION FACTORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conversion_factors (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    subcategory VARCHAR(200),
    factor_value DECIMAL(10, 4),
    unit VARCHAR(100),
    literature_reference TEXT,
    reference_url TEXT,
    real_data_validation TEXT,
    safety_margin_percent DECIMAL(5, 2),
    final_factor DECIMAL(10, 4),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_residuos_sector ON residuos(sector_codigo);
CREATE INDEX IF NOT EXISTS idx_residuos_subsector ON residuos(subsector_codigo);
CREATE INDEX IF NOT EXISTS idx_residuos_nome ON residuos(nome);
CREATE INDEX IF NOT EXISTS idx_references_residuo ON residuo_references(residuo_id);
CREATE INDEX IF NOT EXISTS idx_references_param ON residuo_references(parameter_type);
CREATE INDEX IF NOT EXISTS idx_conversion_category ON conversion_factors(category);

-- ============================================================================
-- INSERT SEED DATA
-- ============================================================================

-- Insert sectors
INSERT INTO sectors (codigo, nome, nome_en, emoji, ordem, descricao)
VALUES
    ('AG_AGRICULTURA', 'Agrícola', 'Agricultural', '🌾', 1, 'Resíduos agrícolas e culturas energéticas'),
    ('PC_PECUARIA', 'Pecuária', 'Livestock', '🐄', 2, 'Resíduos pecuários e dejetos animais'),
    ('IN_INDUSTRIAL', 'Industrial', 'Industrial', '🏭', 3, 'Resíduos industriais e agroindustriais'),
    ('UR_URBANO', 'Urbano', 'Urban', '🏙️', 4, 'Resíduos sólidos urbanos e esgoto')
ON CONFLICT (codigo) DO NOTHING;

-- Insert subsectors for Agriculture
INSERT INTO subsectors (codigo, nome, nome_en, sector_codigo, emoji, ordem)
VALUES
    ('AG_CANA', 'Cana-de-açúcar', 'Sugarcane', 'AG_AGRICULTURA', '🌿', 1),
    ('AG_CITROS', 'Citros', 'Citrus', 'AG_AGRICULTURA', '🍊', 2),
    ('AG_MILHO', 'Milho', 'Corn', 'AG_AGRICULTURA', '🌽', 3),
    ('AG_SOJA', 'Soja', 'Soybean', 'AG_AGRICULTURA', '🌱', 4)
ON CONFLICT (codigo) DO NOTHING;

-- Insert subsectors for Livestock
INSERT INTO subsectors (codigo, nome, nome_en, sector_codigo, emoji, ordem)
VALUES
    ('PC_BOVINOS', 'Bovinos', 'Cattle', 'PC_PECUARIA', '🐄', 1),
    ('PC_SUINOS', 'Suínos', 'Swine', 'PC_PECUARIA', '🐷', 2),
    ('PC_AVES', 'Aves', 'Poultry', 'PC_PECUARIA', '🐔', 3)
ON CONFLICT (codigo) DO NOTHING;

-- Insert subsectors for Industrial
INSERT INTO subsectors (codigo, nome, nome_en, sector_codigo, emoji, ordem)
VALUES
    ('IN_ALIMENTOS', 'Alimentos e Bebidas', 'Food & Beverage', 'IN_INDUSTRIAL', '🍷', 1),
    ('IN_FRIGORIFICOS', 'Frigoríficos', 'Slaughterhouses', 'IN_INDUSTRIAL', '🥩', 2)
ON CONFLICT (codigo) DO NOTHING;

-- Insert subsectors for Urban
INSERT INTO subsectors (codigo, nome, nome_en, sector_codigo, emoji, ordem)
VALUES
    ('UR_RSU', 'Resíduos Sólidos Urbanos', 'Municipal Solid Waste', 'UR_URBANO', '🗑️', 1),
    ('UR_ESGOTO', 'Esgoto Sanitário', 'Wastewater', 'UR_URBANO', '💧', 2)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SAMPLE RESIDUOS DATA
-- ============================================================================

-- Sample: Sugarcane Bagasse
INSERT INTO residuos (
    codigo, nome, nome_en, sector_codigo, subsector_codigo,
    bmp_medio, bmp_min, bmp_max, bmp_unidade,
    ts_medio, vs_medio,
    chemical_cn_ratio, chemical_ch4_content,
    icon, generation, destination
)
VALUES (
    'AG_CANA_001', 'Bagaço de Cana-de-açúcar', 'Sugarcane Bagasse',
    'AG_AGRICULTURA', 'AG_CANA',
    220, 180, 260, 'NmL CH4/g VS',
    50.0, 95.0,
    150.0, 50.0,
    '🌿', 'Usinas de açúcar e etanol', 'Energia térmica, cogeração'
)
ON CONFLICT (codigo) DO NOTHING;

-- Sample: Cattle Manure
INSERT INTO residuos (
    codigo, nome, nome_en, sector_codigo, subsector_codigo,
    bmp_medio, bmp_min, bmp_max, bmp_unidade,
    ts_medio, vs_medio,
    chemical_cn_ratio, chemical_ch4_content,
    icon, generation, destination
)
VALUES (
    'PC_BOVINOS_001', 'Esterco Bovino', 'Cattle Manure',
    'PC_PECUARIA', 'PC_BOVINOS',
    180, 150, 210, 'NmL CH4/g VS',
    15.0, 80.0,
    18.0, 55.0,
    '🐄', 'Fazendas de gado leiteiro e de corte', 'Digestão anaeróbia'
)
ON CONFLICT (codigo) DO NOTHING;

-- Sample: Municipal Solid Waste
INSERT INTO residuos (
    codigo, nome, nome_en, sector_codigo, subsector_codigo,
    bmp_medio, bmp_min, bmp_max, bmp_unidade,
    ts_medio, vs_medio,
    chemical_cn_ratio, chemical_ch4_content,
    icon, generation, destination
)
VALUES (
    'UR_RSU_001', 'Resíduos Sólidos Urbanos (Fração Orgânica)', 'Organic Fraction MSW',
    'UR_URBANO', 'UR_RSU',
    350, 300, 400, 'NmL CH4/g VS',
    25.0, 85.0,
    20.0, 60.0,
    '🗑️', 'Coleta seletiva urbana', 'Aterros sanitários, biodigestores'
)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SAMPLE REFERENCES
-- ============================================================================

INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit
)
VALUES
    (
        (SELECT id FROM residuos WHERE codigo = 'AG_CANA_001' LIMIT 1),
        'bmp',
        'Silva et al. (2018)',
        'Silva, J.P.; Santos, M.A.; Costa, R.B.',
        'Biogas potential from sugarcane bagasse in anaerobic digestion',
        'Renewable Energy',
        2018,
        '10.1016/j.renene.2018.01.001',
        220,
        'NmL CH4/g VS'
    ),
    (
        (SELECT id FROM residuos WHERE codigo = 'PC_BOVINOS_001' LIMIT 1),
        'bmp',
        'Oliveira & Santos (2020)',
        'Oliveira, L.; Santos, P.',
        'Methane production from cattle manure under Brazilian conditions',
        'Biomass and Bioenergy',
        2020,
        '10.1016/j.biombioe.2020.05.003',
        180,
        'NmL CH4/g VS'
    );

-- ============================================================================
-- GRANT PERMISSIONS (if using RLS in Supabase)
-- ============================================================================

-- Allow public read access to sectors and residuos
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE residuos ENABLE ROW LEVEL SECURITY;
ALTER TABLE residuo_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access for sectors" ON sectors FOR SELECT USING (true);
CREATE POLICY "Public read access for subsectors" ON subsectors FOR SELECT USING (true);
CREATE POLICY "Public read access for residuos" ON residuos FOR SELECT USING (true);
CREATE POLICY "Public read access for references" ON residuo_references FOR SELECT USING (true);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT 'Migration completed successfully! Tables created and seed data inserted.' AS status;

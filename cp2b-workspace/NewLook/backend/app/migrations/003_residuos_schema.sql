-- Migration: 003_residuos_schema.sql
-- Description: Create tables for residuos (residues), sectors, and scientific references
-- Author: Claude Code
-- Date: 2024-11-19

-- ============================================================================
-- SECTORS TABLE
-- The 4 main biogas sectors: Agriculture, Pecuária, Urban, Industrial
-- ============================================================================

CREATE TABLE IF NOT EXISTS sectors (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    nome_en TEXT,
    emoji TEXT,
    ordem INTEGER DEFAULT 0,
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the 4 main sectors
INSERT INTO sectors (codigo, nome, nome_en, emoji, ordem, descricao) VALUES
('AG_AGRICULTURA', 'Agricultura', 'Agriculture', '🌱', 1, 'Resíduos agrícolas de culturas como cana, soja, milho, café, citros e silvicultura'),
('PC_PECUARIA', 'Pecuária', 'Livestock', '🐄', 2, 'Resíduos de criação animal incluindo bovinos, suínos, aves e piscicultura'),
('UR_URBANO', 'Urbano', 'Urban', '🏙️', 3, 'Resíduos sólidos urbanos, orgânicos e lodo de estações de tratamento'),
('IN_INDUSTRIAL', 'Industrial', 'Industrial', '🏭', 4, 'Resíduos de processos industriais como abatedouros, cervejarias e papel/celulose')
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- SUBSECTORS TABLE
-- Subsectors within each main sector
-- ============================================================================

CREATE TABLE IF NOT EXISTS subsectors (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    nome_en TEXT,
    sector_codigo TEXT NOT NULL REFERENCES sectors(codigo),
    emoji TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on sector reference
CREATE INDEX IF NOT EXISTS idx_subsectors_sector ON subsectors(sector_codigo);

-- ============================================================================
-- RESIDUOS TABLE
-- All residue types with chemical parameters and availability factors
-- ============================================================================

CREATE TABLE IF NOT EXISTS residuos (
    id SERIAL PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    nome_en TEXT,

    -- Sector classification
    sector_codigo TEXT NOT NULL REFERENCES sectors(codigo),
    subsector_codigo TEXT REFERENCES subsectors(codigo),
    categoria_codigo TEXT,
    categoria_nome TEXT,

    -- BMP (Biochemical Methane Potential) - L CH4/kg VS
    bmp_min REAL,
    bmp_medio REAL NOT NULL,
    bmp_max REAL,
    bmp_unidade TEXT DEFAULT 'L CH4/kg VS',

    -- TS (Total Solids) - percentage
    ts_min REAL,
    ts_medio REAL,
    ts_max REAL,

    -- VS (Volatile Solids) - percentage of TS
    vs_min REAL,
    vs_medio REAL,
    vs_max REAL,

    -- Chemical composition
    chemical_cn_ratio REAL,        -- C:N ratio
    chemical_ch4_content REAL,     -- CH4 content in biogas (%)

    -- Availability factors (0-1)
    fc_min REAL,                   -- Collection factor
    fc_medio REAL,
    fc_max REAL,
    fcp_min REAL,                  -- Competition factor
    fcp_medio REAL,
    fcp_max REAL,
    fs_min REAL,                   -- Seasonal factor
    fs_medio REAL,
    fs_max REAL,
    fl_min REAL,                   -- Logistic factor
    fl_medio REAL,
    fl_max REAL,

    -- Scenario factors
    fator_pessimista REAL,
    fator_realista REAL,
    fator_otimista REAL,

    -- Additional metadata
    generation TEXT,               -- How residue is generated
    destination TEXT,              -- Current destination
    justification TEXT,            -- Justification for factors
    icon TEXT,                     -- Icon for UI display

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_residuos_sector ON residuos(sector_codigo);
CREATE INDEX IF NOT EXISTS idx_residuos_subsector ON residuos(subsector_codigo);
CREATE INDEX IF NOT EXISTS idx_residuos_nome ON residuos(nome);

-- ============================================================================
-- RESIDUO_REFERENCES TABLE
-- Scientific references linked to specific parameters of residues
-- ============================================================================

CREATE TABLE IF NOT EXISTS residuo_references (
    id SERIAL PRIMARY KEY,
    residuo_id INTEGER NOT NULL REFERENCES residuos(id) ON DELETE CASCADE,

    -- Parameter this reference supports
    parameter_type TEXT NOT NULL CHECK (parameter_type IN ('bmp', 'ts', 'vs', 'cn_ratio', 'ch4_content', 'general')),

    -- Reference details
    citation TEXT NOT NULL,        -- Full citation string
    authors TEXT,                  -- Authors list
    title TEXT,                    -- Paper title
    journal TEXT,                  -- Journal name
    year INTEGER,                  -- Publication year
    volume TEXT,
    pages TEXT,
    doi TEXT,                      -- Digital Object Identifier
    url TEXT,                      -- URL if available

    -- Extracted values from this reference
    reported_value REAL,           -- Value reported in paper
    reported_unit TEXT,            -- Unit of reported value

    -- Quality indicators
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary source for this parameter
    validation_status TEXT DEFAULT 'validated',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_residuo_refs_residuo ON residuo_references(residuo_id);
CREATE INDEX IF NOT EXISTS idx_residuo_refs_parameter ON residuo_references(parameter_type);
CREATE INDEX IF NOT EXISTS idx_residuo_refs_year ON residuo_references(year);

-- ============================================================================
-- CONVERSION_FACTORS TABLE
-- Biogas conversion factors with scientific literature backing
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversion_factors (
    id SERIAL PRIMARY KEY,
    category TEXT NOT NULL,        -- Pecuária, Culturas, etc.
    subcategory TEXT NOT NULL,     -- Bovinos, Cana-de-açúcar, etc.

    -- Factor values
    factor_value REAL NOT NULL,
    unit TEXT NOT NULL,            -- m³/cabeça/ano, m³/ton, etc.

    -- Literature backing
    literature_reference TEXT,     -- Citation string
    reference_url TEXT,

    -- Validation
    real_data_validation TEXT,     -- How it was validated
    safety_margin_percent REAL,
    final_factor REAL,

    -- Metadata
    date_validated DATE,
    notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversion_factors_unique
ON conversion_factors(category, subcategory);

-- ============================================================================
-- VIEWS FOR EASY ACCESS
-- ============================================================================

-- View: Residuos with sector info
CREATE OR REPLACE VIEW residuos_with_sectors AS
SELECT
    r.*,
    s.nome as sector_nome,
    s.nome_en as sector_nome_en,
    s.emoji as sector_emoji,
    ss.nome as subsector_nome,
    ss.emoji as subsector_emoji
FROM residuos r
JOIN sectors s ON r.sector_codigo = s.codigo
LEFT JOIN subsectors ss ON r.subsector_codigo = ss.codigo
ORDER BY s.ordem, ss.ordem, r.nome;

-- View: Reference counts per residue
CREATE OR REPLACE VIEW residuos_reference_counts AS
SELECT
    r.id,
    r.codigo,
    r.nome,
    r.sector_codigo,
    COUNT(rr.id) as total_references,
    COUNT(CASE WHEN rr.parameter_type = 'bmp' THEN 1 END) as bmp_references,
    COUNT(CASE WHEN rr.parameter_type = 'ts' THEN 1 END) as ts_references,
    COUNT(CASE WHEN rr.parameter_type = 'vs' THEN 1 END) as vs_references,
    COUNT(CASE WHEN rr.parameter_type = 'cn_ratio' THEN 1 END) as cn_references,
    COUNT(CASE WHEN rr.parameter_type = 'ch4_content' THEN 1 END) as ch4_references
FROM residuos r
LEFT JOIN residuo_references rr ON r.id = rr.residuo_id
GROUP BY r.id, r.codigo, r.nome, r.sector_codigo;

-- View: Sector summary statistics
CREATE OR REPLACE VIEW sector_statistics AS
SELECT
    s.codigo,
    s.nome,
    s.emoji,
    s.ordem,
    COUNT(r.id) as num_residuos,
    ROUND(AVG(r.bmp_medio)::numeric, 2) as avg_bmp,
    ROUND(AVG(r.ts_medio)::numeric, 2) as avg_ts,
    ROUND(AVG(r.vs_medio)::numeric, 2) as avg_vs,
    ROUND(AVG(r.chemical_cn_ratio)::numeric, 2) as avg_cn_ratio,
    ROUND(AVG(r.chemical_ch4_content)::numeric, 2) as avg_ch4_content
FROM sectors s
LEFT JOIN residuos r ON s.codigo = r.sector_codigo
GROUP BY s.codigo, s.nome, s.emoji, s.ordem
ORDER BY s.ordem;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables
DROP TRIGGER IF EXISTS update_sectors_updated_at ON sectors;
CREATE TRIGGER update_sectors_updated_at
    BEFORE UPDATE ON sectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subsectors_updated_at ON subsectors;
CREATE TRIGGER update_subsectors_updated_at
    BEFORE UPDATE ON subsectors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_residuos_updated_at ON residuos;
CREATE TRIGGER update_residuos_updated_at
    BEFORE UPDATE ON residuos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversion_factors_updated_at ON conversion_factors;
CREATE TRIGGER update_conversion_factors_updated_at
    BEFORE UPDATE ON conversion_factors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE sectors IS 'Main biogas sectors: Agriculture, Livestock, Urban, Industrial';
COMMENT ON TABLE subsectors IS 'Subsectors within each main sector';
COMMENT ON TABLE residuos IS 'Residue types with chemical parameters (BMP, TS, VS, C:N, CH4)';
COMMENT ON TABLE residuo_references IS 'Scientific references linked to residue parameters';
COMMENT ON TABLE conversion_factors IS 'Biogas conversion factors with literature backing';

COMMENT ON COLUMN residuos.bmp_medio IS 'Biochemical Methane Potential in L CH4/kg VS';
COMMENT ON COLUMN residuos.ts_medio IS 'Total Solids percentage';
COMMENT ON COLUMN residuos.vs_medio IS 'Volatile Solids as percentage of TS';
COMMENT ON COLUMN residuos.chemical_cn_ratio IS 'Carbon to Nitrogen ratio';
COMMENT ON COLUMN residuos.chemical_ch4_content IS 'Methane content in biogas (%)';

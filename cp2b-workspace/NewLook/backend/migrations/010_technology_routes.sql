-- Migration 010: Technology Routes Feature
-- Educational tool for organizing biogas technology pathways
-- Created: 2025-12-04

-- ============================================================================
-- TECHNOLOGY CARDS TABLE
-- Stores predefined and user-custom technology cards
-- ============================================================================

CREATE TABLE IF NOT EXISTS technology_cards (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('feedstock', 'pretreatment', 'digestion', 'upgrading', 'enduse', 'byproduct', 'custom')),
    name_pt VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    emoji VARCHAR(10) NOT NULL,
    description_pt TEXT,
    description_en TEXT,
    color VARCHAR(20) DEFAULT '#3B82F6',

    -- Connection rules (PostgreSQL array type)
    can_connect_to TEXT[] DEFAULT '{}',
    can_receive_from TEXT[] DEFAULT '{}',

    -- Custom cards tracking
    is_custom BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- TECHNOLOGY REFERENCES JUNCTION TABLE
-- Links technologies to scientific references
-- ============================================================================

CREATE TABLE IF NOT EXISTS technology_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    technology_id VARCHAR(50) REFERENCES technology_cards(id) ON DELETE CASCADE,
    reference_id INTEGER NOT NULL, -- Links to existing references table
    relevance_note TEXT,   -- "efficiency data", "case study", etc.
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- USER ROUTES TABLE
-- Stores user-created technology pathways
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,

    -- Canvas data (React Flow nodes and edges as JSON)
    canvas_data JSONB NOT NULL,

    -- Sharing settings
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(50) UNIQUE,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_technology_cards_category ON technology_cards(category);
CREATE INDEX IF NOT EXISTS idx_technology_cards_custom ON technology_cards(is_custom, created_by) WHERE is_custom = TRUE;
CREATE INDEX IF NOT EXISTS idx_technology_references_tech ON technology_references(technology_id);
CREATE INDEX IF NOT EXISTS idx_technology_references_ref ON technology_references(reference_id);
CREATE INDEX IF NOT EXISTS idx_user_routes_user ON user_routes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_routes_share ON user_routes(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_routes_public ON user_routes(is_public) WHERE is_public = TRUE;

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_technology_cards_updated_at ON technology_cards;
CREATE TRIGGER update_technology_cards_updated_at
    BEFORE UPDATE ON technology_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_routes_updated_at ON user_routes;
CREATE TRIGGER update_user_routes_updated_at
    BEFORE UPDATE ON user_routes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE technology_cards IS 'Catalog of biogas technologies (predefined + user custom)';
COMMENT ON TABLE technology_references IS 'Junction table linking technologies to scientific papers';
COMMENT ON TABLE user_routes IS 'User-created technology pathway diagrams';

COMMENT ON COLUMN technology_cards.can_connect_to IS 'Array of category names this technology can connect to';
COMMENT ON COLUMN technology_cards.can_receive_from IS 'Array of category names this technology can receive connections from';
COMMENT ON COLUMN user_routes.canvas_data IS 'React Flow diagram data (nodes and edges)';
COMMENT ON COLUMN user_routes.share_token IS 'Random token for public sharing';

-- ============================================================
-- SECTOR AGGREGATION MAPPING (67 IBGE Sectors → 4 Aggregate Sectors)
-- Maps detailed IBGE 67-sector classification to simplified 4-sector model
-- For backward compatibility with existing spatial analysis system
--
-- Data source: IBGE classification + expert judgment
-- Generated: 2026-01-30
-- ============================================================

-- ============================================================
-- CREATE TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS ibge_io_sector_aggregation (
    sector_id_67 INTEGER NOT NULL REFERENCES ibge_io_sectors_67(sector_id),
    aggregate_sector_code VARCHAR(20) NOT NULL,
    aggregate_sector_name VARCHAR(100) NOT NULL,
    weight NUMERIC(5,4) DEFAULT 1.0,
    PRIMARY KEY (sector_id_67, aggregate_sector_code)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sector_aggregation_aggregate
    ON ibge_io_sector_aggregation(aggregate_sector_code);

COMMENT ON TABLE ibge_io_sector_aggregation IS 'Mapping from IBGE 67 sectors to 4 aggregate sectors (agriculture, industry, services, public) for compatibility with existing models';

-- ============================================================
-- INSERT AGGREGATION MAPPING
-- ============================================================

INSERT INTO ibge_io_sector_aggregation (sector_id_67, aggregate_sector_code, aggregate_sector_name, weight) VALUES

-- AGRICULTURE (Sectors 1-3)
(1, 'agriculture', 'Agriculture', 1.0),  -- Agricultura, inclusive o apoio à agricultura e a pós-colheita
(2, 'agriculture', 'Agriculture', 1.0),  -- Pecuária, inclusive o apoio à pecuária
(3, 'agriculture', 'Agriculture', 1.0),  -- Produção florestal; pesca e aquicultura

-- INDUSTRY (Sectors 4-39)
-- Mining and extraction
(4, 'industry', 'Industry', 1.0),   -- Extração de carvão mineral e de minerais não-metálicos
(5, 'industry', 'Industry', 1.0),   -- Extração de petróleo e gás, inclusive as atividades de apoio
(6, 'industry', 'Industry', 1.0),   -- Extração de minério de ferro, inclusive beneficiamentos e a aglomeração
(7, 'industry', 'Industry', 1.0),   -- Extração de minerais metálicos não-ferrosos, inclusive beneficiamentos

-- Food and beverage manufacturing
(8, 'industry', 'Industry', 1.0),   -- Abate e produtos de carne, inclusive os produtos do laticínio e da pesca
(9, 'industry', 'Industry', 1.0),   -- Fabricação e refino de açúcar
(10, 'industry', 'Industry', 1.0),  -- Outros produtos alimentares
(11, 'industry', 'Industry', 1.0),  -- Fabricação de bebidas
(12, 'industry', 'Industry', 1.0),  -- Fabricação de produtos do fumo

-- Textiles and apparel
(13, 'industry', 'Industry', 1.0),  -- Fabricação de produtos têxteis
(14, 'industry', 'Industry', 1.0),  -- Confecção de artefatos do vestuário e acessórios
(15, 'industry', 'Industry', 1.0),  -- Fabricação de calçados e de artefatos de couro

-- Wood, paper, and printing
(16, 'industry', 'Industry', 1.0),  -- Fabricação de produtos da madeira
(17, 'industry', 'Industry', 1.0),  -- Fabricação de celulose, papel e produtos de papel
(18, 'industry', 'Industry', 1.0),  -- Impressão e reprodução de gravações

-- Petroleum and chemicals
(19, 'industry', 'Industry', 1.0),  -- Refino de petróleo e coquerias
(20, 'industry', 'Industry', 1.0),  -- Fabricação de biocombustíveis
(21, 'industry', 'Industry', 1.0),  -- Fabricação de químicos orgânicos e inorgânicos, resinas e elastômeros
(22, 'industry', 'Industry', 1.0),  -- Fabricação de defensivos, desinfetantes, tintas e químicos diversos
(23, 'industry', 'Industry', 1.0),  -- Fabricação de produtos de limpeza, cosméticos/perfumaria e higiene pessoal
(24, 'industry', 'Industry', 1.0),  -- Fabricação de produtos farmoquímicos e farmacêuticos

-- Rubber, plastics, and non-metallic minerals
(25, 'industry', 'Industry', 1.0),  -- Fabricação de produtos de borracha e de material plástico
(26, 'industry', 'Industry', 1.0),  -- Fabricação de produtos de minerais não-metálicos
(27, 'industry', 'Industry', 1.0),  -- Produção de ferro-gusa/ferroligas, siderurgia e tubos de aço sem costura
(28, 'industry', 'Industry', 1.0),  -- Metalurgia de metais não-ferosos e a fundição de metais

-- Metal products and machinery
(29, 'industry', 'Industry', 1.0),  -- Fabricação de produtos de metal, exceto máquinas e equipamentos
(30, 'industry', 'Industry', 1.0),  -- Fabricação de equipamentos de informática, produtos eletrônicos e ópticos
(31, 'industry', 'Industry', 1.0),  -- Fabricação de máquinas e equipamentos elétricos
(32, 'industry', 'Industry', 1.0),  -- Fabricação de máquinas e equipamentos mecânicos
(33, 'industry', 'Industry', 1.0),  -- Fabricação de automóveis, caminhões e ônibus, exceto peças
(34, 'industry', 'Industry', 1.0),  -- Fabricação de peças e acessórios para veículos automotores
(35, 'industry', 'Industry', 1.0),  -- Fabricação de outros equipamentos de transporte, exceto veículos automotores

-- Other manufacturing
(36, 'industry', 'Industry', 1.0),  -- Fabricação de móveis e de produtos de indústrias diversas
(37, 'industry', 'Industry', 1.0),  -- Manutenção, reparação e instalação de máquinas e equipamentos

-- Utilities
(38, 'industry', 'Industry', 1.0),  -- Energia elétrica, gás natural e outras utilidades
(39, 'industry', 'Industry', 1.0),  -- Água, esgoto e gestão de resíduos

-- SERVICES (Sectors 40-61)
-- Construction
(40, 'services', 'Services', 1.0),  -- Construção

-- Commerce
(41, 'services', 'Services', 1.0),  -- Comércio e reparação de veículos automotores e motocicletas
(42, 'services', 'Services', 1.0),  -- Comércio por atacado e a varejo, exceto veículos automotores
-- Note: IBGE often splits commerce into wholesale and retail, but we aggregate here

-- Transportation and logistics
(43, 'services', 'Services', 1.0),  -- Transporte terrestre
(44, 'services', 'Services', 1.0),  -- Transporte aquaviário
(45, 'services', 'Services', 1.0),  -- Transporte aéreo
(46, 'services', 'Services', 1.0),  -- Armazenamento, atividades auxiliares dos transportes e correio

-- Accommodation and food
(47, 'services', 'Services', 1.0),  -- Alojamento
(48, 'services', 'Services', 1.0),  -- Alimentação

-- Information and communication
(49, 'services', 'Services', 1.0),  -- Edição e edição integrada à impressão
(50, 'services', 'Services', 1.0),  -- Atividades de televisão, rádio, cinema e gravação/edição de som e imagem
(51, 'services', 'Services', 1.0),  -- Telecomunicações
(52, 'services', 'Services', 1.0),  -- Desenvolvimento de sistemas e outros serviços de informação
(53, 'services', 'Services', 1.0),  -- Intermediação financeira, seguros e previdência complementar
(54, 'services', 'Services', 1.0),  -- Atividades imobiliárias

-- Professional and business services
(55, 'services', 'Services', 1.0),  -- Atividades jurídicas, contábeis, consultoria e sedes de empresas
(56, 'services', 'Services', 1.0),  -- Serviços de arquitetura, engenharia, testes/análises técnicas e P&D
(57, 'services', 'Services', 1.0),  -- Outras atividades profissionais, científicas e técnicas
(58, 'services', 'Services', 1.0),  -- Aluguéis não-imobiliários e gestão de ativos de propriedade intelectual
(59, 'services', 'Services', 1.0),  -- Outras atividades administrativas e serviços complementares

-- Social services (Health, Education - PRIVATE sector)
(60, 'services', 'Services', 1.0),  -- Atividades de vigilância, segurança e investigação
(61, 'services', 'Services', 1.0),  -- Serviços para edifícios, paisagismo e serviços administrativos

-- PUBLIC ADMINISTRATION (Sectors 62-67)
(62, 'public', 'Public Administration', 1.0),  -- Administração pública, defesa e seguridade social
(63, 'public', 'Public Administration', 1.0),  -- Educação pública
(64, 'public', 'Public Administration', 1.0),  -- Educação privada
(65, 'public', 'Public Administration', 1.0),  -- Saúde pública
(66, 'public', 'Public Administration', 1.0),  -- Saúde privada
(67, 'public', 'Public Administration', 1.0)   -- Atividades artísticas, criativas e de espetáculos e outras

ON CONFLICT (sector_id_67, aggregate_sector_code) DO UPDATE
  SET aggregate_sector_name = EXCLUDED.aggregate_sector_name,
      weight = EXCLUDED.weight;

-- ============================================================
-- VERIFICATION QUERY
-- ============================================================

-- Count sectors by aggregate category
SELECT
    aggregate_sector_code,
    aggregate_sector_name,
    COUNT(*) as sector_count
FROM ibge_io_sector_aggregation
GROUP BY aggregate_sector_code, aggregate_sector_name
ORDER BY aggregate_sector_code;

-- Expected result:
-- agriculture  | Agriculture                | 3
-- industry     | Industry                   | 36
-- public       | Public Administration      | 6
-- services     | Services                   | 22

COMMENT ON TABLE ibge_io_sector_aggregation IS 'Mapping from IBGE 67 sectors to 4 aggregate sectors (agriculture, industry, services, public) for compatibility with existing models';

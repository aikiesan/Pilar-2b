-- Expanded Technology Routes Seed Data
-- Phase 1: Core 20 Additional Technologies
-- Run this in Supabase SQL Editor after the base seed
-- Safe to re-run (uses ON CONFLICT DO NOTHING)

-- ============================================================================
-- ADDITIONAL FEEDSTOCK Technologies (10 new)
-- ============================================================================

INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
-- Agricultural Residues
('feed_coffee', 'feedstock', 'Resíduos de Café', 'Coffee Waste', '☕',
 'Polpa de café, borra e cascas do processamento de café',
 'Coffee pulp, grounds and husks from coffee processing',
 '#6F4E37', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_soy', 'feedstock', 'Resíduos de Soja', 'Soybean Residues', '🫘',
 'Cascas, palha e restos de processamento de soja',
 'Hulls, straw and soybean processing residues',
 '#8B7355', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_corn', 'feedstock', 'Resíduos de Milho', 'Corn Residues', '🌽',
 'Sabugo, palha e restos de colheita de milho',
 'Cob, straw and corn harvest residues',
 '#F4A460', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_rice', 'feedstock', 'Resíduos de Arroz', 'Rice Residues', '🌾',
 'Casca de arroz, palha e restos de beneficiamento',
 'Rice husk, straw and milling residues',
 '#DEB887', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_citrus', 'feedstock', 'Resíduos de Citricultura', 'Citrus Waste', '🍊',
 'Bagaço de laranja, cascas e restos de processamento',
 'Orange pomace, peels and processing residues',
 '#FF8C00', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

-- Animal Production
('feed_poultry', 'feedstock', 'Resíduos de Avicultura', 'Poultry Litter', '🐔',
 'Cama de frango, dejetos e restos de abate',
 'Chicken litter, manure and slaughter waste',
 '#D2691E', ARRAY['digestion'], ARRAY[]::text[], FALSE),

('feed_fish', 'feedstock', 'Resíduos de Piscicultura', 'Fish Farm Waste', '🐟',
 'Restos de processamento de peixes e lodo de tanques',
 'Fish processing waste and tank sludge',
 '#4682B4', ARRAY['digestion'], ARRAY[]::text[], FALSE),

-- Food Industry
('feed_slaughter', 'feedstock', 'Resíduos de Frigoríficos', 'Slaughterhouse Waste', '🥩',
 'Sangue, gordura, vísceras e restos de abate',
 'Blood, fat, offal and slaughter residues',
 '#8B0000', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_dairy', 'feedstock', 'Resíduos de Laticínios', 'Dairy Waste', '🥛',
 'Soro de leite, restos e efluentes de laticínios',
 'Whey, dairy residues and effluents',
 '#F5F5DC', ARRAY['digestion'], ARRAY[]::text[], FALSE),

('feed_waste_oil', 'feedstock', 'Óleos e Gorduras Residuais', 'Waste Oils & Fats', '🫗',
 'Óleo de fritura usado e gordura animal',
 'Used cooking oil and animal fat',
 '#DAA520', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADDITIONAL PRETREATMENT Technologies (4 new)
-- ============================================================================

INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('pre_solid_liquid', 'pretreatment', 'Separação Sólido-Líquido', 'Solid-Liquid Separation', '🌊',
 'Prensas, centrífugas e peneiras para separação de fases',
 'Presses, centrifuges and screens for phase separation',
 '#4169E1', ARRAY['digestion'], ARRAY['feedstock'], FALSE),

('pre_hygienization', 'pretreatment', 'Higienização/Pasteurização', 'Hygienization/Pasteurization', '🌡️',
 'Tratamento térmico (70°C/1h) para eliminação de patógenos',
 'Thermal treatment (70°C/1h) for pathogen elimination',
 '#FF6347', ARRAY['digestion'], ARRAY['feedstock'], FALSE),

('pre_codigestion', 'pretreatment', 'Codigestão (Mistura)', 'Co-digestion Mixing', '🔄',
 'Balanceamento C/N e homogeneização de múltiplos substratos',
 'C/N balancing and homogenization of multiple substrates',
 '#9370DB', ARRAY['digestion'], ARRAY['feedstock'], FALSE),

('pre_grinding', 'pretreatment', 'Trituração Avançada', 'Advanced Grinding', '⚙️',
 'Moinho de martelos e triturador para redução de tamanho',
 'Hammer mill and shredder for size reduction',
 '#696969', ARRAY['digestion'], ARRAY['feedstock'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADDITIONAL DIGESTION Technologies (3 new)
-- ============================================================================

INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('dig_batch', 'digestion', 'Biodigestor de Batelada', 'Batch Digester', '🏺',
 'Operação descontínua, ideal para pequenos volumes',
 'Discontinuous operation, ideal for small volumes',
 '#8B4513', ARRAY['upgrading', 'enduse', 'byproduct'], ARRAY['feedstock', 'pretreatment'], FALSE),

('dig_fixed_bed', 'digestion', 'Reator de Leito Fixo', 'Fixed Bed Reactor', '🧱',
 'AFBR - Reator anaeróbio com biomassa imobilizada',
 'AFBR - Anaerobic reactor with immobilized biomass',
 '#556B2F', ARRAY['upgrading', 'enduse', 'byproduct'], ARRAY['feedstock', 'pretreatment'], FALSE),

('dig_dry', 'digestion', 'Digestão Seca', 'Dry Digestion', '🏜️',
 'Para resíduos com >20% sólidos totais, sistema de garagem',
 'For residues with >20% total solids, garage system',
 '#D2B48C', ARRAY['upgrading', 'enduse', 'byproduct'], ARRAY['feedstock', 'pretreatment'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADDITIONAL UPGRADING Technologies (2 new)
-- ============================================================================

INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('upg_desulfurization', 'upgrading', 'Dessulfurização', 'Desulfurization', '🧪',
 'Remoção de H₂S usando óxido de ferro ou carvão ativado',
 'H₂S removal using iron oxide or activated carbon',
 '#708090', ARRAY['enduse'], ARRAY['digestion'], FALSE),

('upg_drying', 'upgrading', 'Secagem/Desumidificação', 'Drying/Dehumidification', '💨',
 'Remoção de umidade do biogás por resfriamento ou adsorção',
 'Moisture removal from biogas by cooling or adsorption',
 '#87CEEB', ARRAY['enduse'], ARRAY['digestion'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ADDITIONAL END USE Technologies (1 new)
-- ============================================================================

INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('end_industrial_fuel', 'enduse', 'Combustível Industrial', 'Industrial Fuel', '🏭',
 'Uso direto em fornos, fornalhas e processos industriais',
 'Direct use in kilns, furnaces and industrial processes',
 '#DC143C', ARRAY[]::text[], ARRAY['digestion', 'upgrading'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SUMMARY OF ADDITIONS
-- ============================================================================

-- Total new technologies: 20
-- - Feedstock: 10 (coffee, soy, corn, rice, citrus, poultry, fish, slaughter, dairy, waste oil)
-- - Pretreatment: 4 (separation, hygienization, co-digestion, grinding)
-- - Digestion: 3 (batch, fixed bed, dry)
-- - Upgrading: 2 (desulfurization, drying)
-- - End Use: 1 (industrial fuel)

-- Total technologies in system: 26 (base) + 20 (new) = 46 technologies

-- To verify:
-- SELECT category, COUNT(*) as count FROM technology_cards GROUP BY category ORDER BY category;

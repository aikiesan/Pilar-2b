-- Seed Technology Routes Data
-- Run this in Supabase SQL Editor after running migration 010
-- Safe to re-run (uses ON CONFLICT DO NOTHING)

-- FEEDSTOCK Technologies
INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('feed_vinasse', 'feedstock', 'Vinhaça', 'Vinasse', '🍷',
 'Resíduo líquido da produção de etanol de cana-de-açúcar, rico em matéria orgânica e nutrientes',
 'Liquid residue from sugarcane ethanol production, rich in organic matter and nutrients',
 '#8B4513', ARRAY['digestion'], ARRAY[]::text[], FALSE),

('feed_bagasse', 'feedstock', 'Bagaço de Cana', 'Sugarcane Bagasse', '🌾',
 'Resíduo sólido fibroso da moagem da cana-de-açúcar, principal subproduto das usinas',
 'Fibrous solid residue from sugarcane milling, main byproduct of sugar mills',
 '#D2691E', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_straw', 'feedstock', 'Palha de Cana', 'Sugarcane Straw', '🌿',
 'Resíduo da colheita mecanizada de cana-de-açúcar, deixado no campo',
 'Residue from mechanized sugarcane harvesting, left in the field',
 '#9ACD32', ARRAY['pretreatment', 'digestion'], ARRAY[]::text[], FALSE),

('feed_filter_cake', 'feedstock', 'Torta de Filtro', 'Filter Cake', '🍰',
 'Resíduo úmido da clarificação do caldo de cana, rico em matéria orgânica',
 'Wet residue from sugarcane juice clarification, rich in organic matter',
 '#A0522D', ARRAY['digestion'], ARRAY[]::text[], FALSE),

('feed_cattle_manure', 'feedstock', 'Esterco Bovino', 'Cattle Manure', '🐄',
 'Dejetos de bovinos de confinamento e estábulos',
 'Waste from confined cattle and stables',
 '#8B6914', ARRAY['digestion'], ARRAY[]::text[], FALSE),

('feed_pig_manure', 'feedstock', 'Dejetos Suínos', 'Pig Manure', '🐷',
 'Dejetos líquidos de suinocultura intensiva',
 'Liquid waste from intensive pig farming',
 '#CD853F', ARRAY['digestion'], ARRAY[]::text[], FALSE)

ON CONFLICT (id) DO NOTHING;

-- PRETREATMENT Technologies
INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('pre_thermal', 'pretreatment', 'Hidrólise Térmica', 'Thermal Hydrolysis', '🔥',
 'Tratamento térmico a alta pressão e temperatura para quebrar estruturas lignocelulósicas',
 'High-pressure and temperature thermal treatment to break lignocellulosic structures',
 '#FF6347', ARRAY['digestion'], ARRAY['feedstock'], FALSE),

('pre_mechanical', 'pretreatment', 'Preparo Mecânico', 'Mechanical Preparation', '⚙️',
 'Trituração, moagem e homogeneização do material fibroso',
 'Grinding, milling and homogenization of fibrous material',
 '#708090', ARRAY['digestion'], ARRAY['feedstock'], FALSE),

('pre_chemical', 'pretreatment', 'Pré-tratamento Químico', 'Chemical Pretreatment', '🧪',
 'Tratamento com ácidos, bases ou solventes para aumentar biodegradabilidade',
 'Treatment with acids, bases or solvents to increase biodegradability',
 '#4682B4', ARRAY['digestion'], ARRAY['feedstock'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- DIGESTION Technologies
INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('dig_cstr', 'digestion', 'CSTR', 'CSTR (Continuously Stirred Tank Reactor)', '🏭',
 'Reator continuamente agitado, ideal para substratos com alto teor de sólidos',
 'Continuously stirred tank reactor, ideal for substrates with high solids content',
 '#4682B4', ARRAY['upgrading', 'enduse', 'byproduct'], ARRAY['feedstock', 'pretreatment'], FALSE),

('dig_uasb', 'digestion', 'UASB', 'UASB (Upflow Anaerobic Sludge Blanket)', '💧',
 'Reator anaeróbio de fluxo ascendente com manta de lodo, ideal para efluentes líquidos',
 'Upflow anaerobic sludge blanket reactor, ideal for liquid effluents',
 '#1E90FF', ARRAY['upgrading', 'enduse', 'byproduct'], ARRAY['feedstock'], FALSE),

('dig_lagoon', 'digestion', 'Lagoa Coberta', 'Covered Lagoon', '🏞️',
 'Lagoa anaeróbia com cobertura impermeável para captura de biogás',
 'Anaerobic lagoon with impermeable cover for biogas capture',
 '#20B2AA', ARRAY['enduse', 'byproduct'], ARRAY['feedstock'], FALSE),

('dig_plug_flow', 'digestion', 'Fluxo Pistão', 'Plug Flow', '🔄',
 'Reator horizontal de fluxo pistão para substratos com alto teor de sólidos',
 'Horizontal plug flow reactor for substrates with high solids content',
 '#5F9EA0', ARRAY['upgrading', 'enduse', 'byproduct'], ARRAY['feedstock', 'pretreatment'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- UPGRADING Technologies
INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('upg_membrane', 'upgrading', 'Separação por Membrana', 'Membrane Separation', '🧬',
 'Separação de CO₂ e CH₄ através de membranas permeáveis seletivas',
 'Separation of CO₂ and CH₄ through selective permeable membranes',
 '#9370DB', ARRAY['enduse', 'byproduct'], ARRAY['digestion'], FALSE),

('upg_psa', 'upgrading', 'PSA', 'PSA (Pressure Swing Adsorption)', '🔬',
 'Adsorção por oscilação de pressão usando materiais adsorventes específicos',
 'Pressure swing adsorption using specific adsorbent materials',
 '#8A2BE2', ARRAY['enduse', 'byproduct'], ARRAY['digestion'], FALSE),

('upg_water_scrubbing', 'upgrading', 'Water Scrubbing', 'Water Scrubbing', '💦',
 'Lavagem do biogás com água pressurizada para remover CO₂',
 'Biogas washing with pressurized water to remove CO₂',
 '#6A5ACD', ARRAY['enduse', 'byproduct'], ARRAY['digestion'], FALSE),

('upg_chemical_scrubbing', 'upgrading', 'Lavagem Química', 'Chemical Scrubbing', '⚗️',
 'Lavagem com soluções químicas (aminas) para remover impurezas',
 'Washing with chemical solutions (amines) to remove impurities',
 '#7B68EE', ARRAY['enduse', 'byproduct'], ARRAY['digestion'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- END USE Technologies
INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('end_cogen', 'enduse', 'Cogeração', 'Cogeneration (CHP)', '⚡',
 'Geração combinada de eletricidade e calor em motores ou turbinas',
 'Combined heat and power generation in engines or turbines',
 '#FFD700', ARRAY[]::text[], ARRAY['digestion', 'upgrading'], FALSE),

('end_grid_injection', 'enduse', 'Injeção na Rede', 'Grid Injection', '🔌',
 'Injeção de biometano na rede de distribuição de gás natural',
 'Biomethane injection into natural gas distribution grid',
 '#32CD32', ARRAY[]::text[], ARRAY['upgrading'], FALSE),

('end_vehicle_fuel', 'enduse', 'Biometano Veicular', 'Vehicle Fuel (Bio-CNG)', '🚗',
 'Biometano comprimido como combustível veicular (GNV renovável)',
 'Compressed biomethane as vehicle fuel (renewable CNG)',
 '#00CED1', ARRAY[]::text[], ARRAY['upgrading'], FALSE),

('end_boiler', 'enduse', 'Caldeira', 'Boiler', '♨️',
 'Geração de vapor e calor para processos industriais',
 'Steam and heat generation for industrial processes',
 '#FF8C00', ARRAY[]::text[], ARRAY['digestion'], FALSE),

('end_fuel_cell', 'enduse', 'Célula Combustível', 'Fuel Cell', '🔋',
 'Geração elétrica através de célula a combustível de alto rendimento',
 'Electric generation through high-efficiency fuel cell',
 '#FFA500', ARRAY[]::text[], ARRAY['upgrading'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- BYPRODUCT Technologies
INSERT INTO technology_cards (id, category, name_pt, name_en, emoji, description_pt, description_en, color, can_connect_to, can_receive_from, is_custom)
VALUES
('byp_digestate', 'byproduct', 'Digestato', 'Digestate', '🌱',
 'Biofertilizante rico em nutrientes resultante da digestão anaeróbia',
 'Nutrient-rich biofertilizer resulting from anaerobic digestion',
 '#228B22', ARRAY[]::text[], ARRAY['digestion'], FALSE),

('byp_co2', 'byproduct', 'CO₂ Capturado', 'Captured CO₂', '💨',
 'CO₂ de grau alimentício ou industrial capturado no upgrade',
 'Food-grade or industrial CO₂ captured during upgrading',
 '#B0C4DE', ARRAY[]::text[], ARRAY['upgrading'], FALSE),

('byp_solid_digestate', 'byproduct', 'Digestato Sólido', 'Solid Digestate', '🪨',
 'Fração sólida do digestato após separação, usado como condicionador de solo',
 'Solid fraction of digestate after separation, used as soil conditioner',
 '#6B8E23', ARRAY[]::text[], ARRAY['digestion'], FALSE),

('byp_liquid_digestate', 'byproduct', 'Digestato Líquido', 'Liquid Digestate', '💧',
 'Fração líquida do digestato, rica em nutrientes solúveis',
 'Liquid fraction of digestate, rich in soluble nutrients',
 '#4682B4', ARRAY[]::text[], ARRAY['digestion'], FALSE)

ON CONFLICT (id) DO NOTHING;

-- Verify insertion
SELECT
    category,
    COUNT(*) as count,
    STRING_AGG(name_pt, ', ') as technologies
FROM technology_cards
WHERE is_custom = FALSE
GROUP BY category
ORDER BY category;

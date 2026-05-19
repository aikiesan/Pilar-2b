-- ===========================================================================
-- CP2B Maps V3 - Insert Literature References for Feedstock Factors
-- ===========================================================================
-- Purpose: Populate residuo_references table with literature backing for FDE factors
-- Source: FEEDSTOCK_FACTORS_LITERATURE_TABLE.md
-- Date: 2026-01-06
-- ===========================================================================

-- NOTE: This script inserts references for FC, FCo, FS, FL factors
-- Each reference is linked to a specific residue and parameter type

-- ===========================================================================
-- URBAN SECTOR REFERENCES
-- ===========================================================================

-- Lodo Primário de ETE
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'von Sperling, M. (2007). Biological Wastewater Treatment in Warm Climate Regions. IWA Publishing.',
    'von Sperling, M.',
    'Biological Wastewater Treatment in Warm Climate Regions',
    'IWA Publishing', 2007, NULL,
    0.85, 'collection factor', TRUE
FROM residuos WHERE codigo = 'lodo_primario_ete';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'CETESB (2020). Aplicação de Lodo de Esgoto em Áreas Agrícolas - Critérios para projeto e operação.',
    'CETESB',
    'Aplicação de Lodo de Esgoto em Áreas Agrícolas',
    2020, 0.25, 'competition factor', TRUE
FROM residuos WHERE codigo = 'lodo_primario_ete';

-- Lodo Secundário de ETE
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Andreoli, C.V., Von Sperling, M., Fernandes, F. (2001). Lodo de esgotos: tratamento e disposição final. UFMG/SANEPAR.',
    'Andreoli, C.V., Von Sperling, M., Fernandes, F.',
    'Lodo de esgotos: tratamento e disposição final',
    'UFMG/SANEPAR', 2001, 0.82, 'collection factor', TRUE
FROM residuos WHERE codigo = 'lodo_secundario_ete';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'CETESB (2018). Norma P4.230 - Aplicação de Lodos de Sistemas de Tratamento Biológico em Áreas Agrícolas.',
    'CETESB',
    'Norma P4.230 - Aplicação de Lodos',
    2018, 0.30, 'competition factor', TRUE
FROM residuos WHERE codigo = 'lodo_secundario_ete';

-- FORSU
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'ABRELPE (2022). Panorama dos Resíduos Sólidos no Brasil 2022.',
    'ABRELPE',
    'Panorama dos Resíduos Sólidos no Brasil 2022',
    2022, 0.90, 'collection factor', TRUE
FROM residuos WHERE codigo = 'forsu_ur_rsu';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Brasil (2010). Lei 12.305/2010 - Política Nacional de Resíduos Sólidos (PNRS).',
    'Brasil - Presidência da República',
    'Lei 12.305/2010 - Política Nacional de Resíduos Sólidos',
    2010, 0.35, 'competition factor', TRUE
FROM residuos WHERE codigo = 'forsu_ur_rsu';

-- ===========================================================================
-- LIVESTOCK SECTOR REFERENCES
-- ===========================================================================

-- Dejetos Líquidos de Suínos
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'EMBRAPA Suínos e Aves (2015). Manual de Manejo e Utilização dos Dejetos de Suínos.',
    'EMBRAPA Suínos e Aves',
    'Manual de Manejo e Utilização dos Dejetos de Suínos',
    'EMBRAPA', 2015, NULL, 0.90, 'collection factor', TRUE
FROM residuos WHERE codigo = 'dejetos_suinos_liquidos';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Kunz, A., Higarashi, M.M., Oliveira, P.A. (2009). Sistemas de tratamento de dejetos de suínos. EMBRAPA Suínos e Aves.',
    'Kunz, A., Higarashi, M.M., Oliveira, P.A.',
    'Sistemas de tratamento de dejetos de suínos',
    'EMBRAPA', 2009, NULL, 0.45, 'competition factor', TRUE
FROM residuos WHERE codigo = 'dejetos_suinos_liquidos';

-- Esterco Bovino Confinado
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'EMBRAPA Gado de Corte (2012). Sistemas de produção em confinamento.',
    'EMBRAPA Gado de Corte',
    'Sistemas de produção em confinamento',
    2012, 0.80, 'collection factor', TRUE
FROM residuos WHERE codigo = 'esterco_bovino_fresco';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Primavesi, O., Corrêa, L.A., Primavesi, A.C., Cantarella, H. (2004). Manejo de Dejetos Animais. EMBRAPA.',
    'Primavesi, O., Corrêa, L.A., Primavesi, A.C., Cantarella, H.',
    'Manejo de Dejetos Animais',
    2004, 0.55, 'competition factor', TRUE
FROM residuos WHERE codigo = 'esterco_bovino_fresco';

-- Cama de Aviário
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Oliveira, M.C., Almeida, C.V., Grieg, E.N. (2016). Caracterização da cama de aviário. Revista Brasileira de Saúde e Produção Animal.',
    'Oliveira, M.C., Almeida, C.V., Grieg, E.N.',
    'Caracterização da cama de aviário',
    'Revista Brasileira de Saúde e Produção Animal', 2016, 0.80, 'collection factor', TRUE
FROM residuos WHERE codigo = 'cama_aviario';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Avila, V.S., Mazzuco, H., Figueiredo, E.A.P. (2007). Produção e Manejo de Frangos de Corte. EMBRAPA.',
    'Avila, V.S., Mazzuco, H., Figueiredo, E.A.P.',
    'Produção e Manejo de Frangos de Corte',
    2007, 0.50, 'competition factor', TRUE
FROM residuos WHERE codigo = 'cama_aviario';

-- ===========================================================================
-- SUGARCANE REFERENCES
-- ===========================================================================

-- Bagaço de Cana
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'UNICA (2024). Relatório de Safra 2023/24 - Bioeletricidade Sucroenergética.',
    'UNICA - União da Indústria de Cana-de-Açúcar',
    'Relatório de Safra 2023/24',
    2024, 0.95, 'collection factor', TRUE
FROM residuos WHERE codigo = 'bagaco_cana';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'CETESB (2017). Decision 39/2017 - Cogeneration mandate for sugarcane bagasse.',
    'CETESB - Companhia Ambiental do Estado de São Paulo',
    'Decision 39/2017 - Bagasse cogeneration mandate',
    2017, 1.00, 'competition factor - REGULATORY', TRUE
FROM residuos WHERE codigo = 'bagaco_cana';

-- Palha de Cana
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Hassuani, S.J., Leal, M.R.L.V., Macedo, I.C. (2005). Biomass Power Generation: Sugar Cane Bagasse and Trash. CTC, Piracicaba.',
    'Hassuani, S.J., Leal, M.R.L.V., Macedo, I.C.',
    'Biomass Power Generation: Sugar Cane Bagasse and Trash',
    'CTC - Centro de Tecnologia Canavieira', 2005, NULL, 0.85, 'collection factor', TRUE
FROM residuos WHERE codigo = 'palha_cana';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Carvalho, J.L.N., Nogueirol, R.C., Menandro, L.M.S., et al. (2017). Agronomic and environmental implications of sugarcane straw removal: a major review. GCB Bioenergy, 9(7), 1181-1195.',
    'Carvalho, J.L.N., Nogueirol, R.C., Menandro, L.M.S., Bordonal, R.D.O., Borges, C.D., Cantarella, H., Franco, H.C.J.',
    'Agronomic and environmental implications of sugarcane straw removal',
    'GCB Bioenergy', 2017, '10.1111/gcbb.12410', 0.90, 'competition factor - soil retention', TRUE
FROM residuos WHERE codigo = 'palha_cana';

-- Torta de Filtro
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Rossetto, R., Dias, F.L.F., Vitti, A.C., Cantarella, H. (2013). Torta de filtro e vinhaça: Valorização dos subprodutos da cana-de-açúcar. APTA/IAC.',
    'Rossetto, R., Dias, F.L.F., Vitti, A.C., Cantarella, H.',
    'Torta de filtro e vinhaça: Valorização dos subprodutos',
    2013, 0.67, 'competition factor', TRUE
FROM residuos WHERE codigo = 'torta_filtro';

-- Vinhaça
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Christofoletti, C.A., Escher, J.P., Correia, J.E., Marinho, J.F.U., Fontanetti, C.S. (2013). Sugarcane vinasse: Environmental implications of its use. Waste Management, 33(12), 2752-2761.',
    'Christofoletti, C.A., Escher, J.P., Correia, J.E., Marinho, J.F.U., Fontanetti, C.S.',
    'Sugarcane vinasse: Environmental implications of its use',
    'Waste Management', 2013, '10.1016/j.wasman.2013.09.005', 0.95, 'collection factor', TRUE
FROM residuos WHERE codigo = 'vinhaca_cana';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'CETESB (2015). Norma Técnica P4.231 - Vinhaça: Critérios e procedimentos para aplicação no solo agrícola.',
    'CETESB',
    'Norma P4.231 - Vinhaça fertigation criteria',
    2015, 0.85, 'competition factor - REGULATORY', TRUE
FROM residuos WHERE codigo = 'vinhaca_cana';

-- ===========================================================================
-- CORN REFERENCES
-- ===========================================================================

-- Palha de Milho
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Leal, M.R.L.V., Galdos, M.V., Scarpare, F.V., Seabra, J.E.A., Walter, A., Oliveira, C.O.F. (2013). Sugarcane straw availability, quality, recovery and energy use: A literature review. Biomass and Bioenergy, 53, 11-19.',
    'Leal, M.R.L.V., Galdos, M.V., Scarpare, F.V., et al.',
    'Sugarcane straw availability, quality, recovery and energy use',
    'Biomass and Bioenergy', 2013, '10.1016/j.biombioe.2013.01.013', 0.70, 'collection factor', TRUE
FROM residuos WHERE codigo = 'palha_milho';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Scopel, E., Triomphe, B., Affholder, F., et al. (2013). Conservation agriculture cropping systems. Agriculture, Ecosystems & Environment, 187, 106-114.',
    'Scopel, E., Triomphe, B., Affholder, F., et al.',
    'Conservation agriculture cropping systems',
    'Agriculture, Ecosystems & Environment', 2013, NULL, 0.85, 'competition factor - no-till', TRUE
FROM residuos WHERE codigo = 'palha_milho';

-- ===========================================================================
-- SOY REFERENCES
-- ===========================================================================

-- Palha de Soja
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Franchini, J.C., Debiasi, H., Balbinot Jr, A.A., et al. (2014). Evolution of crop yields in different tillage systems. Field Crops Research, 137, 178-185.',
    'Franchini, J.C., Debiasi, H., Balbinot Jr, A.A., et al.',
    'Evolution of crop yields in different tillage systems',
    'Field Crops Research', 2014, NULL, 0.60, 'collection factor', TRUE
FROM residuos WHERE codigo = 'palha_soja';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'RTRS (2020). Round Table on Responsible Soy Certification Standards v3.2.',
    'RTRS - Round Table on Responsible Soy',
    'Certification Standards v3.2 - Soil cover requirements',
    2020, 1.00, 'competition factor - CERTIFICATION', TRUE
FROM residuos WHERE codigo = 'palha_soja';

-- ===========================================================================
-- CITRUS REFERENCES
-- ===========================================================================

-- Bagaço de Citros
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Lohrasbi, S., Kouhikamali, R., Khatami, S. (2010). Process simulation and economic evaluation of orange peel waste to ethanol. Energy, 35(5), 3286-3292.',
    'Lohrasbi, S., Kouhikamali, R., Khatami, S.',
    'Process simulation and economic evaluation of orange peel waste',
    'Energy', 2010, '10.1016/j.energy.2010.04.004', 0.85, 'collection factor', TRUE
FROM residuos WHERE codigo = 'bagaco_citros';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Braddock, R.J. (1999). Handbook of Citrus By-Products and Processing Technology. Wiley-Interscience.',
    'Braddock, R.J.',
    'Handbook of Citrus By-Products and Processing Technology',
    'Wiley-Interscience', 1999, NULL, 0.70, 'competition factor - pectin', TRUE
FROM residuos WHERE codigo = 'bagaco_citros';

-- ===========================================================================
-- COFFEE REFERENCES
-- ===========================================================================

-- Polpa de Café
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Mussatto, S.I., Machado, E.M.S., Martins, S., Teixeira, J.A. (2011). Production, composition, and application of coffee residues. Food and Bioprocess Technology, 4, 661-672.',
    'Mussatto, S.I., Machado, E.M.S., Martins, S., Teixeira, J.A.',
    'Production, composition, and application of coffee residues',
    'Food and Bioprocess Technology', 2011, '10.1007/s11947-011-0565-z', 0.80, 'collection factor', TRUE
FROM residuos WHERE codigo = 'polpa_cafe';

INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Bressani, A.P.P., Martinez, S.J., Sarmento, A.B.I., et al. (2015). Uso de resíduos da produção de café na alimentação animal. Informe Agropecuário, 36(284).',
    'Bressani, A.P.P., Martinez, S.J., Sarmento, A.B.I., et al.',
    'Uso de resíduos da produção de café na alimentação animal',
    2015, 0.60, 'competition factor', TRUE
FROM residuos WHERE codigo = 'polpa_cafe';

-- Mucilagem de Café
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Pandey, A., Soccol, C.R., Nigam, P., et al. (2000). Biotechnological potential of coffee pulp and husk. Biochemical Engineering Journal, 6(2), 153-162.',
    'Pandey, A., Soccol, C.R., Nigam, P., Brand, D., Mohan, R., Roussos, S.',
    'Biotechnological potential of coffee pulp and husk',
    'Biochemical Engineering Journal', 2000, '10.1016/S1369-703X(00)00084-X', 0.85, 'collection factor', TRUE
FROM residuos WHERE codigo = 'mucilagem_cafe';

-- ===========================================================================
-- EUCALYPTUS REFERENCES
-- ===========================================================================

-- Casca de Eucalipto
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Pereira, J.C.D., Sturion, J.A., Higa, A.R., Higa, R.C.V., Shimizu, J.Y. (2012). Características da madeira de eucalipto. EMBRAPA Florestas.',
    'Pereira, J.C.D., Sturion, J.A., Higa, A.R., Higa, R.C.V., Shimizu, J.Y.',
    'Características da madeira de eucalipto',
    2012, 0.70, 'collection factor', TRUE
FROM residuos WHERE codigo = 'casca_eucalipto';

-- ===========================================================================
-- INDUSTRIAL REFERENCES
-- ===========================================================================

-- Soro de Queijo
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Prazeres, A.R., Carvalho, F., Rivas, J. (2012). Cheese whey management: A review. Journal of Environmental Management, 110, 48-68.',
    'Prazeres, A.R., Carvalho, F., Rivas, J.',
    'Cheese whey management: A review',
    'Journal of Environmental Management', 2012, '10.1016/j.jenvman.2012.05.018', 0.75, 'collection factor', TRUE
FROM residuos WHERE codigo = 'soro_queijo';

-- Vísceras
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'MAPA (2019). Regulamento da Inspeção Industrial e Sanitária de Produtos de Origem Animal (RIISPOA).',
    'MAPA - Ministério da Agricultura, Pecuária e Abastecimento',
    'RIISPOA - Regulamento de Inspeção Industrial',
    2019, 0.75, 'collection factor', TRUE
FROM residuos WHERE codigo = 'visceras_abatedouro';

-- Sangue Animal
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'FAO (2014). Environmental Performance of Large Ruminant Supply Chains. Food and Agriculture Organization.',
    'FAO - Food and Agriculture Organization',
    'Environmental Performance of Large Ruminant Supply Chains',
    2014, 0.70, 'collection factor', TRUE
FROM residuos WHERE codigo = 'sangue_animal';

-- Gordura e Sebo
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, year, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'ANP (2023). Boletim Mensal do Biodiesel. Agência Nacional do Petróleo.',
    'ANP - Agência Nacional do Petróleo',
    'Boletim Mensal do Biodiesel 2023',
    2023, 0.75, 'competition factor - biodiesel', TRUE
FROM residuos WHERE codigo = 'gordura_sebo';

-- Levedura Residual
INSERT INTO residuo_references (residuo_id, parameter_type, citation, authors, title, journal, year, doi, reported_value, reported_unit, is_primary)
SELECT
    id, 'general',
    'Ferreira, I.M.P.L.V.O., Pinho, O., Vieira, E., Tavarela, J.G. (2010). Saccharomyces yeast biomass: characteristics and applications. Trends in Food Science & Technology, 21(2), 77-84.',
    'Ferreira, I.M.P.L.V.O., Pinho, O., Vieira, E., Tavarela, J.G.',
    'Saccharomyces yeast biomass: characteristics and applications',
    'Trends in Food Science & Technology', 2010, '10.1016/j.tifs.2009.10.008', 0.85, 'collection factor', TRUE
FROM residuos WHERE codigo = 'levedura_residual';

-- ===========================================================================
-- VALIDATION QUERY: Check inserted references
-- ===========================================================================
/*
SELECT
    r.codigo,
    r.nome,
    COUNT(rr.id) as total_references,
    STRING_AGG(DISTINCT rr.authors, '; ') as authors_list
FROM residuos r
LEFT JOIN residuo_references rr ON r.id = rr.residuo_id
WHERE r.fc_medio IS NOT NULL
GROUP BY r.codigo, r.nome
ORDER BY r.sector_codigo, r.nome;
*/

-- ===========================================================================
-- SUMMARY: References by sector
-- ===========================================================================
/*
SELECT
    r.sector_codigo,
    COUNT(DISTINCT r.id) as residuos_count,
    COUNT(rr.id) as total_references,
    ROUND(AVG(ref_count.refs)::numeric, 1) as avg_refs_per_residue
FROM residuos r
LEFT JOIN residuo_references rr ON r.id = rr.residuo_id
LEFT JOIN (
    SELECT residuo_id, COUNT(*) as refs
    FROM residuo_references
    GROUP BY residuo_id
) ref_count ON r.id = ref_count.residuo_id
WHERE r.fc_medio IS NOT NULL
GROUP BY r.sector_codigo
ORDER BY r.sector_codigo;
*/

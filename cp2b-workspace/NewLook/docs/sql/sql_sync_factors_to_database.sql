-- ===========================================================================
-- CP2B Maps V3 - Sync Feedstock Factors to Database
-- ===========================================================================
-- Purpose: Update residuos table with FDE factors (FC, FCo, FS, FL) and justifications
-- Source: FEEDSTOCK_FACTORS_LITERATURE_TABLE.md
-- Date: 2026-01-06
-- ===========================================================================

-- URBAN SECTOR
-- 1. Lodo Primário de ETE
UPDATE residuos SET
    fc_medio = 0.85,
    fcp_medio = 0.75,  -- NOTE: FCo represents competition, higher value = MORE competition
    fs_medio = 0.95,
    fl_medio = 0.90,
    fator_realista = 0.5451,  -- (FC * (1-FCo) * FS * FL) = 54.51%
    justification = 'FC=0.85: von Sperling (2007) collection efficiency 82-88% in Brazilian WWTPs. FCo=0.75: CETESB (2020) 25% to composting/agriculture → 75% competes. FS=0.95: SNIS (2022) continuous generation. FL=0.90: Possetti et al. (2015) 15-20km average distance.'
WHERE codigo = 'lodo_primario_ete';

-- 2. Lodo Secundário de ETE
UPDATE residuos SET
    fc_medio = 0.82,
    fcp_medio = 0.70,
    fs_medio = 0.95,
    fl_medio = 0.85,
    fator_realista = 0.4635,
    justification = 'FC=0.82: Andreoli et al. (2001) secondary systems 82% collection. FCo=0.70: CETESB P4.230 (2018) 30% land application. FS=0.95: SNIS (2022). FL=0.85: ABiogas (2020) 15-25km transport.'
WHERE codigo = 'lodo_secundario_ete';

-- 3. FORSU - Fração Orgânica Separada
UPDATE residuos SET
    fc_medio = 0.90,
    fcp_medio = 0.65,
    fs_medio = 0.90,
    fl_medio = 0.80,
    fator_realista = 0.4212,
    justification = 'FC=0.90: ABRELPE (2022) source separation 90% purity. FCo=0.65: PNRS (2010) 35% to animal feed/composting. FS=0.90: São Paulo (2021) 10% seasonal variation. FL=0.80: Reichert (2013) 25km average.'
WHERE codigo = 'forsu_ur_rsu';

-- LIVESTOCK SECTOR
-- 4. Dejetos Líquidos de Suínos
UPDATE residuos SET
    fc_medio = 0.90,
    fcp_medio = 0.55,
    fs_medio = 0.95,
    fl_medio = 0.75,
    fator_realista = 0.3527,
    justification = 'FC=0.90: EMBRAPA (2015) confined systems 90% collection. FCo=0.55: Kunz et al. (2009) 45% direct fertigation. FS=0.95: ABCS (2016) continuous production. FL=0.75: Perdomo et al. (2003) viable up to 40km.'
WHERE codigo = 'dejetos_suinos_liquidos';

-- 5. Esterco Bovino de Confinamento
UPDATE residuos SET
    fc_medio = 0.80,
    fcp_medio = 0.45,
    fs_medio = 0.85,
    fl_medio = 0.70,
    fator_realista = 0.1932,
    justification = 'FC=0.80: EMBRAPA Gado de Corte (2012) scraping 80%. FCo=0.45: Primavesi et al. (2004) 55% organic fertilizer. FS=0.85: ANUALPEC (2022) 15% variation. FL=0.70: Coldebella et al. (2006) up to 35km.'
WHERE codigo = 'esterco_bovino_fresco';

-- 6. Cama de Aviário
UPDATE residuos SET
    fc_medio = 0.80,
    fcp_medio = 0.50,
    fs_medio = 0.90,
    fl_medio = 0.75,
    fator_realista = 0.2700,
    justification = 'FC=0.80: Oliveira et al. (2016) commercial systems 80%. FCo=0.50: Avila et al. (2007) 50% to animal feed. FS=0.90: ABPA (2022) ~10% variation. FL=0.75: Seganfredo (2007) 30km average.'
WHERE codigo = 'cama_aviario';

-- 7. Dejetos Frescos de Aves
UPDATE residuos SET
    fc_medio = 0.75,
    fcp_medio = 0.60,
    fs_medio = 0.92,
    fl_medio = 0.70,
    fator_realista = 0.3066,
    justification = 'FC=0.75: ABPA (2023) cage systems 75% collection. FCo=0.60: Miele & Girotto (2004) 40% organic fertilizer. FS=0.92: EMBRAPA (2018) 8% variation. FL=0.70: 35km economic radius.'
WHERE codigo = 'dejetos_aves_frescos';

-- 8. Dejetos Líquidos de Bovinos
UPDATE residuos SET
    fc_medio = 0.75,
    fcp_medio = 0.50,
    fs_medio = 0.88,
    fl_medio = 0.68,
    fator_realista = 0.2244,
    justification = 'FC=0.75: Souza et al. (2009) liquid systems 75%. FCo=0.50: EMBRAPA Gado de Leite (2014) 50% pasture fertigation. FS=0.88: 12% lactation variation. FL=0.68: dispersed production 45km.'
WHERE codigo = 'dejetos_bovinos_liquidos';

-- AGRICULTURAL SECTOR - SUGARCANE
-- 9. Bagaço de Cana (INVIABLE - 100% cogeneration mandate)
UPDATE residuos SET
    fc_medio = 0.95,
    fcp_medio = 1.00,  -- 100% competition = 0% available
    fs_medio = 0.90,
    fl_medio = 0.90,
    fator_realista = 0.0000,
    justification = '⚫ INVIÁVEL: CETESB Decision 39/2017 mandates 100% bagasse for cogeneration (21,218 GWh in 2024). FC=0.95: UNICA (2024) 95% captured at mills. FCo=1.00: REGULATORY MANDATE → 0% available for biogas.'
WHERE codigo = 'bagaco_cana';

-- 10. Palha de Cana
UPDATE residuos SET
    fc_medio = 0.85,
    fcp_medio = 0.90,  -- 90% must remain for soil
    fs_medio = 0.90,
    fl_medio = 0.85,
    fator_realista = 0.0650,
    justification = 'FC=0.85: Hassuani et al. (2005) baling 80-90% recovery. FCo=0.90: Carvalho et al. (2017) + EMBRAPA 50-70% soil retention mandate for erosion control → only 10% available. FS=0.90: UNICA (2023) 236 days/year. FL=0.85: <10km.'
WHERE codigo = 'palha_cana';

-- 11. Torta de Filtro
UPDATE residuos SET
    fc_medio = 0.95,
    fcp_medio = 0.67,
    fs_medio = 0.90,
    fl_medio = 0.90,
    fator_realista = 0.2539,
    justification = 'FC=0.95: UNICA (2022) centralized filtration 95%. FCo=0.67: Rossetto et al. (2013) 67% organic fertilizer → 33% surplus available. FS=0.90: April-November season. FL=0.90: co-located <15km.'
WHERE codigo = 'torta_filtro';

-- 12. Vinhaça
UPDATE residuos SET
    fc_medio = 0.95,
    fcp_medio = 0.85,
    fs_medio = 0.90,
    fl_medio = 0.90,
    fator_realista = 0.1154,
    justification = 'FC=0.95: Christofoletti et al. (2013) 95% captured at distilleries. FCo=0.85: CETESB P4.231 (2015) MANDATORY 85% fertigation for K+ recycling → 15% surplus. FS=0.90: ethanol season. FL=0.90: on-site.'
WHERE codigo = 'vinhaca_cana';

-- AGRICULTURAL - CORN
-- 13. Palha de Milho
UPDATE residuos SET
    fc_medio = 0.70,
    fcp_medio = 0.85,
    fs_medio = 0.85,
    fl_medio = 0.60,
    fator_realista = 0.0536,
    justification = 'FC=0.70: Leal et al. (2013) mechanical harvest 65-75%. FCo=0.85: Scopel et al. (2013) 85% no-till requirement 3-5 ton/ha. FS=0.85: CONAB Feb-May. FL=0.60: dispersed 50-100km marginal.'
WHERE codigo = 'palha_milho';

-- 14. Casca de Milho
UPDATE residuos SET
    fc_medio = 0.65,
    fcp_medio = 0.55,
    fs_medio = 0.80,
    fl_medio = 0.65,
    fator_realista = 0.1521,
    justification = 'FC=0.65: grain mill processing residue 65% recoverable. FCo=0.55: 45% compete with animal feed. FS=0.80: seasonal processing. FL=0.65: mills 40km. Source: FAO (2017) Crop residue utilization.'
WHERE codigo = 'casca_milho';

-- 15. Sabugo de Milho
UPDATE residuos SET
    fc_medio = 0.70,
    fcp_medio = 0.50,
    fs_medio = 0.80,
    fl_medio = 0.60,
    fator_realista = 0.1680,
    justification = 'FC=0.70: mechanical separation 70%. FCo=0.50: 50% bedding/feed. FS=0.80: seasonal. FL=0.60: low bulk density; 30km limit. Source: FAO (2017).'
WHERE codigo = 'sabugo_milho';

-- AGRICULTURAL - SOY
-- 16. Palha de Soja (INVIABLE - no-till certification)
UPDATE residuos SET
    fc_medio = 0.60,
    fcp_medio = 1.00,
    fs_medio = 0.80,
    fl_medio = 0.60,
    fator_realista = 0.0000,
    justification = '⚫ INVIÁVEL: Franchini et al. (2014) low straw 2-3 ton/ha; 60% recoverable. FCo=1.00: RTRS Certification + 85% São Paulo no-till REQUIRES 100% soil cover → 0% available. FS=0.80: Jan-Feb. FL=0.60: 60-100km inviable.'
WHERE codigo = 'palha_soja';

-- 17. Casca de Soja
UPDATE residuos SET
    fc_medio = 0.75,
    fcp_medio = 0.60,
    fs_medio = 0.85,
    fl_medio = 0.70,
    fator_realista = 0.1785,
    justification = 'FC=0.75: crushing mills 75% recovery. FCo=0.60: high-value animal feed R$ 200-300/ton → 40% available. FS=0.85: processing season. FL=0.70: concentrated facilities. Source: ABIOVE (2022).'
WHERE codigo = 'casca_soja';

-- 18. Vagem de Soja (INVIABLE - no-till requirement)
UPDATE residuos SET
    fc_medio = 0.55,
    fcp_medio = 1.00,
    fs_medio = 0.80,
    fl_medio = 0.55,
    fator_realista = 0.0000,
    justification = '⚫ INVIÁVEL: FC=0.55: field residue; low recovery. FCo=1.00: 100% required for no-till soil management → 0% available. Source: EMBRAPA Soja (2021).'
WHERE codigo = 'vagem_soja';

-- AGRICULTURAL - CITRUS
-- 19. Bagaço de Citros
UPDATE residuos SET
    fc_medio = 0.85,
    fcp_medio = 0.70,
    fs_medio = 0.90,
    fl_medio = 0.75,
    fator_realista = 0.1721,
    justification = 'FC=0.85: Lohrasbi et al. (2010) juice processing 85% pomace capture. FCo=0.70: Braddock (1999) 70% to pectin/cattle feed → 30% available (regional Bebedouro). FS=0.90: FUNDECITRUS (2022) Apr-Dec. FL=0.75: citrus belt 30-40km.'
WHERE codigo = 'bagaco_citros';

-- 20. Cascas de Citros
UPDATE residuos SET
    fc_medio = 0.80,
    fcp_medio = 0.70,
    fs_medio = 0.90,
    fl_medio = 0.75,
    fator_realista = 0.1620,
    justification = 'FC=0.80: peeling 80% recovery. FCo=0.70: similar to bagaço; pectin competition. FS=0.90: FUNDECITRUS (2022). FL=0.75: 30-40km. Source: Braddock (1999).'
WHERE codigo = 'cascas_citros';

-- 21. Cascas de Citros Industrial
UPDATE residuos SET
    fc_medio = 0.80,
    fcp_medio = 0.70,
    fs_medio = 0.90,
    fl_medio = 0.75,
    fator_realista = 0.1620,
    justification = 'Same as cascas_citros - industrial processing variant. Source: Braddock (1999), FUNDECITRUS (2022).'
WHERE codigo = 'cascas_citros_ind';

-- AGRICULTURAL - COFFEE
-- 22. Polpa de Café
UPDATE residuos SET
    fc_medio = 0.80,
    fcp_medio = 0.60,
    fs_medio = 0.85,
    fl_medio = 0.70,
    fator_realista = 0.1904,
    justification = 'FC=0.80: Mussatto et al. (2011) wet processing 80% pulp recovery. FCo=0.60: Bressani et al. (2015) 60% composting/feed → 40% available. FS=0.85: CONAB Jun-Sep. FL=0.70: coffee regions 40-60km.'
WHERE codigo = 'polpa_cafe';

-- 23. Casca de Café
UPDATE residuos SET
    fc_medio = 0.70,
    fcp_medio = 0.50,
    fs_medio = 0.85,
    fl_medio = 0.65,
    fator_realista = 0.1934,
    justification = 'FC=0.70: dry processing 70%. FCo=0.50: 50% furnace fuel + composting → 50% available. FS=0.85: Jun-Sep. FL=0.65: dispersed 60-80km. Source: Mussatto et al. (2011), Nunes et al. (2017).'
WHERE codigo = 'casca_cafe';

-- 24. Mucilagem de Café
UPDATE residuos SET
    fc_medio = 0.85,
    fcp_medio = 0.55,
    fs_medio = 0.80,
    fl_medio = 0.70,
    fator_realista = 0.2142,
    justification = 'FC=0.85: wet depulping 85% recovery. FCo=0.55: 55% composting/fermentation → 45% available. FS=0.80: only 30% SP uses wet processing. FL=0.70: 45-65km. Source: Pandey et al. (2000).'
WHERE codigo = 'mucilagem_cafe';

-- AGRICULTURAL - EUCALYPTUS
-- 25. Casca de Eucalipto
UPDATE residuos SET
    fc_medio = 0.70,
    fcp_medio = 0.50,
    fs_medio = 0.85,
    fl_medio = 0.50,
    fator_realista = 0.1488,
    justification = 'FC=0.70: Pereira et al. (2012) wood processing 70% bark recovery. FCo=0.50: 50% thermal energy/cellulose. FS=0.85: continuous 15% variation. FL=0.50: LOW BULK DENSITY 150-200 kg/m³ → transport >50km inviable. Source: IBÁ (2022).'
WHERE codigo = 'casca_eucalipto';

-- INDUSTRIAL SECTOR
-- 26. Soro de Queijo
UPDATE residuos SET
    fc_medio = 0.75,
    fcp_medio = 0.60,
    fs_medio = 0.95,
    fl_medio = 0.65,
    fator_realista = 0.1781,
    justification = 'FC=0.75: Prazeres et al. (2012) dairy plants 75% whey collection. FCo=0.60: EMBRAPA Dairy (2014) 60% animal feed → 40% available. FS=0.95: continuous production. FL=0.65: liquid transport costly; dispersed 50-80km.'
WHERE codigo = 'soro_queijo';

-- 27. Vísceras Não Comestíveis
UPDATE residuos SET
    fc_medio = 0.75,
    fcp_medio = 0.55,
    fs_medio = 0.95,
    fl_medio = 0.75,
    fator_realista = 0.2405,
    justification = 'FC=0.75: MAPA (2019) slaughterhouse separation 75%. FCo=0.55: 55% mandated for rendering (farinha animal) per MAPA RIISPOA → 45% available. FS=0.95: continuous operations. FL=0.75: regional clusters. Source: ABPA (2022).'
WHERE codigo = 'visceras_abatedouro';

-- 28. Sangue Animal
UPDATE residuos SET
    fc_medio = 0.70,
    fcp_medio = 0.55,
    fs_medio = 0.95,
    fl_medio = 0.70,
    fator_realista = 0.2079,
    justification = 'FC=0.70: MAPA (2019) blood collection 70%. FCo=0.55: high-value protein (blood meal) → 45% available for biogas. FS=0.95: continuous. FL=0.70: slaughterhouse clusters 30km. Source: FAO (2014).'
WHERE codigo = 'sangue_animal';

-- 29. Gordura e Sebo
UPDATE residuos SET
    fc_medio = 0.80,
    fcp_medio = 0.75,
    fs_medio = 0.95,
    fl_medio = 0.75,
    fator_realista = 0.4275,
    justification = 'FC=0.80: rendering operations 80% recovery. FCo=0.75: HIGH-VALUE biodiesel feedstock R$ 3,000-4,500/ton → 75% competes → 25% available. FS=0.95: continuous. FL=0.75: industrial facilities. Source: ANP (2023), ABIOVE (2022).'
WHERE codigo = 'gordura_sebo';

-- 30. Levedura Residual
UPDATE residuos SET
    fc_medio = 0.85,
    fcp_medio = 0.55,
    fs_medio = 0.95,
    fl_medio = 0.75,
    fator_realista = 0.2656,
    justification = 'FC=0.85: fermentation residue (ethanol/brewery) 85% recoverable. FCo=0.55: high-value Saccharomyces protein supplement → 55% to feed/pharma → 45% available. FS=0.95: continuous fermentation. FL=0.75: co-located plants. Source: Ferreira et al. (2010), UNICA (2022).'
WHERE codigo = 'levedura_residual';

-- ===========================================================================
-- VALIDATION QUERY: Check updated factors
-- ===========================================================================
-- Run this after the UPDATEs to verify:
/*
SELECT
    codigo,
    nome,
    fc_medio,
    fcp_medio,
    fs_medio,
    fl_medio,
    fator_realista,
    SUBSTRING(justification, 1, 100) || '...' as justification_preview
FROM residuos
WHERE fc_medio IS NOT NULL
ORDER BY sector_codigo, nome;
*/

-- ===========================================================================
-- SUMMARY STATISTICS
-- ===========================================================================
/*
SELECT
    sector_codigo,
    COUNT(*) as total_residuos,
    COUNT(fc_medio) as has_factors,
    ROUND(AVG(fc_medio)::numeric, 3) as avg_fc,
    ROUND(AVG(fcp_medio)::numeric, 3) as avg_fco,
    ROUND(AVG(fs_medio)::numeric, 3) as avg_fs,
    ROUND(AVG(fl_medio)::numeric, 3) as avg_fl,
    ROUND(AVG(fator_realista)::numeric, 3) as avg_fde
FROM residuos
GROUP BY sector_codigo
ORDER BY sector_codigo;
*/

-- Auto-generated migration: Import Panorama CP2B data
-- Generated: 2025-11-19T09:52:49.598958

-- ============================================================================
-- SUBSECTORS
-- ============================================================================

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AG_CANA',
    'Cana-de-açúcar',
    'AG_AGRICULTURA',
    1
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AG_CITROS',
    'Citros',
    'AG_AGRICULTURA',
    2
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AG_CAFE',
    'Café',
    'AG_AGRICULTURA',
    3
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AG_MILHO',
    'Milho',
    'AG_AGRICULTURA',
    4
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AG_SOJA',
    'Soja',
    'AG_AGRICULTURA',
    5
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AG_SILVICULTURA',
    'Silvicultura/Eucalipto',
    'AG_AGRICULTURA',
    6
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'AVICULTURA',
    'Avicultura',
    'PC_PECUARIA',
    1
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'BOVINOCULTURA',
    'Bovinocultura',
    'PC_PECUARIA',
    2
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'SUINOCULTURA',
    'Suinocultura',
    'PC_PECUARIA',
    3
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'FRIGORIFICOS',
    'Frigoríficos',
    'IN_INDUSTRIAL',
    1
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'CERVEJARIAS',
    'Cervejarias',
    'IN_INDUSTRIAL',
    2
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'MADEIREIRAS',
    'Madeireiras',
    'IN_INDUSTRIAL',
    3
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'OUTROS',
    'Outros Industriais',
    'IN_INDUSTRIAL',
    4
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'RSU',
    'Resíduos Sólidos Urbanos',
    'UR_URBANO',
    1
) ON CONFLICT (codigo) DO NOTHING;

INSERT INTO subsectors (codigo, nome, sector_codigo, ordem)
VALUES (
    'ETE',
    'Estação de Tratamento de Esgoto',
    'UR_URBANO',
    2
) ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- RESIDUOS (Residues with chemical parameters)
-- ============================================================================

INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'BAGACO',
    'Bagaço de cana',
    'AG_AGRICULTURA',
    'AG_CANA',
    'CANA',
    'Cana-de-açúcar',
    86.25000000000001,
    115.0,
    143.75000000000003,
    50.0,
    58.9,
    59.0,
    76.5,
    90.0,
    103.49999999999999,
    0.9,
    0.95,
    0.98,
    0.16363636363636364,
    0.18181818181818182,
    0.2,
    0.7,
    0.9,
    0.95,
    0.85,
    0.9,
    0.98,
    0.12591818181818185,
    0.13990909090909093,
    0.1539,
    29.6,
    55.0,
    '250-280kg/ton',
    NULL,
    'Alto P₂O₅ (fertilizante prioritário). Apenas 2% disponível para biogás.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'BAGACO_CITROS',
    'Bagaço de citros',
    'AG_AGRICULTURA',
    'AG_CITROS',
    'CITROS',
    'Citros',
    130.0,
    180.0,
    220.0,
    18.11,
    21.3,
    24.49,
    73.8,
    82.0,
    90.2,
    0.75,
    0.55,
    0.95,
    0.2571428571428571,
    0.2857142857142857,
    0.3142857142857143,
    0.75,
    0.7,
    0.95,
    0.7,
    0.9,
    0.95,
    0.0891,
    0.09899999999999999,
    0.10890000000000001,
    54.5,
    79.0,
    '500 kg MS/ton laranja processada',
    '85% para pectina, limoneno, ração',
    'Competição ALTA com indústrias consolidadas (pectina, limoneno, ração). D-limoneno é altamente inibidor da digestão, exigindo pré-tratamento obrigatório para viabilizar o biogás.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CASCA_CAFE',
    'Casca de café',
    'AG_AGRICULTURA',
    'AG_CAFE',
    'CAFE',
    'Café',
    12.0,
    130.0,
    515.0,
    42.5,
    50.0,
    57.5,
    74.8,
    88.0,
    101.19999999999999,
    0.4,
    0.87,
    0.8,
    0.3,
    0.3333333333333333,
    0.3666666666666667,
    0.75,
    0.7,
    0.95,
    0.6,
    0.8,
    0.9,
    0.14616,
    0.1624,
    0.17864000000000002,
    20.0,
    60.0,
    '860 kg MS/ton café beneficiado (RPR 1:1)',
    '60% adubo orgânico, 25% combustível direto',
    'Resíduo principal da via seca. Retorno de 60-85% ao solo como adubo (principalmente K) é prática consolidada e obrigatória para sustentabilidade da lavoura. BMP validado, mas requer pré-tratamento mecânico.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CASCA_EUCALIPTO',
    'Casca de eucalipto',
    'AG_AGRICULTURA',
    'AG_SILVICULTURA',
    'EUCALIPTO',
    'Eucalipto',
    60.0,
    80.0,
    100.0,
    75.65,
    89.0,
    100.0,
    54.0,
    60.0,
    66.0,
    0.2,
    0.77,
    0.5,
    0.25,
    0.35,
    0.55,
    0.85,
    1.0,
    0.98,
    0.4,
    0.9,
    0.8,
    0.14552999999999996,
    0.24254999999999996,
    0.36382499999999995,
    80.0,
    50.0,
    '150 kg MS/ton madeira (RPR ~0.15)',
    '60% adubo, 20% biomassa térmica',
    'Representa 10-20% da biomassa da árvore. Rica em lignina, o que inibe a digestão anaeróbia. Usos competitivos como biofertilizante e combustível para energia térmica são prioritários.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CASCA_MILHO',
    'Casca de milho',
    'AG_AGRICULTURA',
    'AG_MILHO',
    'MILHO',
    'Milho',
    15.425,
    130.0,
    336.0,
    42.5,
    50.0,
    57.5,
    72.25,
    85.0,
    97.74999999999999,
    0.2,
    0.75,
    0.6,
    0.45,
    0.5,
    0.55,
    0.75,
    0.85,
    0.95,
    0.4,
    0.85,
    0.8,
    0.24384375,
    0.2709375,
    0.29803125,
    31.0,
    51.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CASCA_SOJA',
    'Casca de soja',
    'AG_AGRICULTURA',
    'AG_SOJA',
    'SOJA',
    'Soja',
    300.0,
    400.0,
    500.0,
    75.65,
    89.0,
    100.0,
    82.8,
    92.0,
    100.0,
    0.75,
    0.4,
    0.95,
    0.36000000000000004,
    0.4,
    0.44000000000000006,
    0.85,
    0.75,
    0.98,
    0.75,
    0.5,
    0.95,
    0.054000000000000006,
    0.06000000000000001,
    0.06600000000000002,
    25.0,
    60.0,
    '28 kg MS/ton grão (2.8%)',
    '70-80% ração animal (aves/suínos)',
    'Subproduto concentrado em unidades de beneficiamento, facilitando a coleta. Seu principal uso competitivo é como ração animal (70-80%) devido ao valor proteico, que é prioritário no mercado.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CASCAS_CITROS',
    'Cascas de citros',
    'AG_AGRICULTURA',
    'AG_CITROS',
    'CITROS',
    'Citros',
    130.0,
    180.0,
    220.0,
    18.11,
    21.3,
    24.49,
    78.75,
    87.5,
    96.25,
    0.8,
    0.55,
    0.98,
    0.2571428571428571,
    0.2857142857142857,
    0.3142857142857143,
    0.75,
    0.7,
    0.95,
    0.7,
    0.9,
    0.95,
    0.0891,
    0.09899999999999999,
    0.10890000000000001,
    66.3,
    78.4,
    '440 kg MS/ton laranja (44% do fruto)',
    '92% para produtos de alto valor (óleo essencial, pectina)',
    'Competição EXTREMA com produtos de alto valor agregado como óleo essencial (D-limoneno) e pectina. O valor comercial desses produtos é muito superior ao da bioenergia.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'FOLHAS_EUCALIPTO',
    'Folhas de eucalipto',
    'AG_AGRICULTURA',
    'AG_SILVICULTURA',
    'EUCALIPTO',
    'Eucalipto',
    150.0,
    200.0,
    250.0,
    72.25,
    85.0,
    97.75,
    72.0,
    80.0,
    88.0,
    0.25,
    0.45,
    0.55,
    0.3,
    0.2,
    0.6,
    0.85,
    1.0,
    0.98,
    0.35,
    0.5,
    0.75,
    0.027000000000000003,
    0.045000000000000005,
    0.0675,
    25.0,
    56.0,
    '50 kg MS/ton madeira (RPR ~0.05)',
    'Uso como adubo e compostagem',
    'Representa 5-8% da biomassa. A menor concentração de lignina e maior alcalinidade favorecem a digestão em comparação com as frações lenhosas. Uso principal como adubo.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'GALHOS_EUCALIPTO',
    'Galhos e ponteiros',
    'AG_AGRICULTURA',
    'AG_SILVICULTURA',
    'EUCALIPTO',
    'Eucalipto',
    80.0,
    100.0,
    120.0,
    74.8,
    88.0,
    100.0,
    58.5,
    65.0,
    71.5,
    0.25,
    0.65,
    0.6,
    0.3,
    0.45,
    0.6,
    0.85,
    1.0,
    0.98,
    0.4,
    0.75,
    0.8,
    0.13162500000000002,
    0.21937500000000004,
    0.32906250000000004,
    75.0,
    52.0,
    '200 kg MS/ton madeira (RPR ~0.20)',
    'Uso em celulose e biomassa térmica',
    'Representa 20-25% da biomassa. Fração lenhosa com alta celulose e lignina resulta em potencial mediano para digestão anaeróbia. Compete com indústrias de celulose e energia térmica.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'MUCILAGEM_CAFE',
    'Mucilagem de café',
    'AG_AGRICULTURA',
    'AG_CAFE',
    'CAFE',
    'Café',
    12.0,
    130.0,
    515.0,
    10.62,
    12.5,
    14.37,
    70.55,
    83.0,
    95.44999999999999,
    0.5,
    0.65,
    0.85,
    0.45,
    0.5,
    0.55,
    0.75,
    0.7,
    0.95,
    0.7,
    0.7,
    0.95,
    0.143325,
    0.15924999999999997,
    0.175175,
    10.0,
    65.0,
    '40-50 kg MS/ton café (via úmida)',
    '60% fermentação natural, 30% retorno ao solo com efluentes',
    'Fração líquida/viscosa da via úmida. BMP estimado com base no alto teor de açúcares solúveis, requer validação experimental. Logística de captação é complexa.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'PALHA',
    'Palha de cana',
    'AG_AGRICULTURA',
    'AG_CANA',
    'CANA',
    'Cana-de-açúcar',
    190.0,
    250.0,
    310.0,
    60.0,
    90.0,
    95.0,
    76.5,
    85.0,
    93.5,
    0.5,
    0.55,
    0.85,
    0.075,
    0.08333333333333333,
    0.09166666666666667,
    0.65,
    0.85,
    0.95,
    0.5,
    0.75,
    0.85,
    0.026296875000000004,
    0.02921875,
    0.032140625000000006,
    100.0,
    53.0,
    '140 kg MS/ton colhida (14% MS) | 96,52% área temporária SP',
    '30% cobertura solo (obrigatório) + 70% disponível E2G/biogas',
    'PREENCHER após análise dos 71 papers Tier 1',
    '🌾'
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'PALHA_MILHO',
    'Palha de milho',
    'AG_AGRICULTURA',
    'AG_MILHO',
    'MILHO',
    'Milho',
    15.425,
    130.0,
    336.0,
    74.8,
    88.0,
    100.0,
    78.3,
    87.0,
    95.7,
    0.25,
    0.5,
    0.65,
    0.15,
    0.16666666666666666,
    0.18333333333333335,
    0.75,
    0.85,
    0.95,
    0.35,
    0.67,
    0.75,
    0.0427125,
    0.04745833333333333,
    0.052204166666666676,
    43.0,
    55.0,
    '900 kg MS/ton grão',
    '60-70% cobertura de solo (SPD), 15-20% ração animal',
    'O Sistema Plantio Direto (SPD) consolidado no Brasil requer 60-70% da palha para cobertura de solo, prevenindo erosão e mantendo a produtividade. Usos competitivos como ração animal (15-20%) também são estabelecidos. A remoção sustentável é limitada, resultando em uma disponibilidade final baixa para biogás. Alto C/N (43:1) requer co-digestão.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'PALHA_SOJA',
    'Palha de soja',
    'AG_AGRICULTURA',
    'AG_SOJA',
    'SOJA',
    'Soja',
    170.0,
    230.0,
    290.0,
    75.22,
    88.5,
    100.0,
    78.3,
    87.0,
    95.7,
    0.2,
    0.25,
    0.5,
    0.1125,
    0.125,
    0.1375,
    0.85,
    0.75,
    0.98,
    0.3,
    0.35,
    0.7,
    0.0073828125,
    0.008203124999999999,
    0.0090234375,
    18.0,
    57.0,
    '1210 kg MS/ton grão',
    '70% cobertura de solo (SPD), 10-15% combustível (briquetes)',
    'O SPD no Brasil requer 70% da palha no solo. O C/N baixo (18:1) causa decomposição muito rápida (75% do N liberado em 45 dias), limitando a janela de coleta e reforçando seu alto valor como fertilizante para o cultivo subsequente.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'POLPA_CAFE',
    'Polpa de café',
    'AG_AGRICULTURA',
    'AG_CAFE',
    'CAFE',
    'Café',
    12.0,
    130.0,
    515.0,
    18.7,
    22.0,
    25.3,
    79.2,
    88.0,
    96.8,
    0.6,
    0.82,
    0.9,
    0.36000000000000004,
    0.4,
    0.44000000000000006,
    0.75,
    0.7,
    0.95,
    0.6,
    0.77,
    0.9,
    0.1591128,
    0.176792,
    0.1944712,
    15.0,
    46.0,
    '100-120 kg MS/ton café (via úmida)',
    '70% adubo/composto, 10% fermentação',
    'Resíduo da via úmida. BMP estimado com base na composição (mais açúcares, menos lignina que a casca), requer validação experimental. Alto teor de umidade dificulta logística.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'POLPA_CITROS',
    'Polpa de citros',
    'AG_AGRICULTURA',
    'AG_CITROS',
    'CITROS',
    'Citros',
    200.0,
    260.0,
    330.0,
    15.3,
    18.0,
    20.7,
    82.8,
    92.0,
    100.0,
    0.75,
    0.55,
    0.95,
    0.2571428571428571,
    0.2857142857142857,
    0.3142857142857143,
    0.75,
    0.7,
    0.95,
    0.7,
    0.9,
    0.95,
    0.0891,
    0.09899999999999999,
    0.10890000000000001,
    40.0,
    58.0,
    '120 kg MS/ton laranja (polpa residual + sementes)',
    'Competição moderada: ração, etanol 2G',
    'Menor competição que as cascas. É um subproduto problemático (CPF) na indústria de sucos, mas a literatura foca em etanol 2G. O BMP é estimado e requer validação experimental.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'SABUGO',
    'Sabugo de milho',
    'AG_AGRICULTURA',
    'AG_MILHO',
    'MILHO',
    'Milho',
    15.425,
    130.0,
    336.0,
    73.1,
    86.0,
    98.9,
    86.4,
    96.0,
    100.0,
    0.56,
    0.75,
    1.0,
    0.6,
    0.6666666666666666,
    0.7333333333333334,
    0.7,
    0.85,
    0.95,
    0.5,
    0.85,
    0.85,
    0.32512499999999994,
    0.36124999999999996,
    0.39737500000000003,
    70.0,
    55.0,
    '180 kg MS/ton grão',
    '40-50% ração animal, 20-30% cama aviária, 10-15% combustível',
    'O sabugo é concentrado em unidades de beneficiamento, facilitando a coleta (FC alto). No entanto, possui valor de mercado consolidado como ração e cama aviária, limitando a disponibilidade. O C/N muito alto (70:1) exige co-digestão com substratos ricos em nitrogênio para um processo estável.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'TORTA_FILTRO',
    'Torta de filtro',
    'AG_AGRICULTURA',
    'AG_CANA',
    'CANA',
    'Cana-de-açúcar',
    190.0,
    250.0,
    310.0,
    17.0,
    20.0,
    23.0,
    69.7,
    82.0,
    94.3,
    0.7,
    0.95,
    0.95,
    0.3,
    0.3333333333333333,
    0.3666666666666667,
    0.7,
    0.9,
    0.95,
    0.7,
    0.9,
    0.95,
    0.23085,
    0.2565,
    0.28215,
    NULL,
    NULL,
    '30-40 kg/ton cana (úmido)',
    'Adubo orgânico (fonte de P, K, Ca)',
    'Alto valor como adubo orgânico rico em fósforo e cálcio. Uso prioritário na agricultura, limitando a disponibilidade para outras finalidades.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'VAGEM_SOJA',
    'Vagem de soja',
    'AG_AGRICULTURA',
    'AG_SOJA',
    'SOJA',
    'Soja',
    190.0,
    250.0,
    310.0,
    72.25,
    85.0,
    97.75,
    79.2,
    88.0,
    96.8,
    0.15,
    0.4,
    0.45,
    0.25,
    0.3,
    0.55,
    0.85,
    0.75,
    0.98,
    0.25,
    0.5,
    0.65,
    0.027,
    0.045,
    0.0675,
    20.0,
    58.0,
    '850 kg MS/ton grão',
    '75-85% ração animal (fonte proteica)',
    'Coletada no beneficiamento industrial, seu uso prioritário é como fonte proteica para ração animal (75-85%), criando uma forte competição de mercado. Possui digestibilidade intermediária.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'VINHACA',
    'Vinhaça',
    'AG_AGRICULTURA',
    'AG_CANA',
    'CANA',
    'Cana-de-açúcar',
    220.0,
    300.0,
    380.0,
    2.55,
    3.0,
    3.45,
    72.25,
    85.0,
    97.74999999999999,
    0.9,
    0.98,
    0.99,
    0.09999999999999999,
    0.1111111111111111,
    0.12222222222222223,
    0.6,
    0.9,
    0.9,
    0.3,
    0.95,
    0.7,
    0.08378999999999999,
    0.09309999999999999,
    0.10241,
    15.0,
    62.5,
    '10-15 L/L etanol',
    'Fertirrigação (retorno ao campo obrigatório)',
    'Uso consolidado e obrigatório como fertilizante (fertirrigação) devido ao alto teor de potássio. O potencial para biogás compete diretamente com seu valor agronômico.',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'APARAS_ALIMENTOS',
    'Aparas e refiles',
    'IN_INDUSTRIAL',
    'IN_PAPEL',
    'ALIMENTOS',
    'Ind. Alimentícia',
    262.49999999999994,
    350.0,
    437.5,
    15.3,
    18.0,
    20.7,
    79.2,
    88.0,
    96.8,
    0.7,
    0.85,
    0.95,
    0.5,
    0.4,
    0.85,
    0.85,
    1.0,
    0.95,
    0.7,
    0.8,
    0.95,
    0.1632,
    0.272,
    0.40800000000000003,
    23.5,
    62.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'BAGACO_MALTE',
    'Bagaço de malte',
    'IN_INDUSTRIAL',
    'IN_CERVEJA',
    'CERVEJARIAS',
    'Cervejarias',
    86.25000000000001,
    115.0,
    143.75000000000003,
    17.0,
    20.0,
    23.0,
    73.95,
    87.0,
    100.05,
    0.8,
    0.96,
    0.98,
    0.3,
    0.3333333333333333,
    0.3666666666666667,
    0.85,
    1.0,
    0.95,
    0.7,
    0.92,
    0.95,
    0.26496,
    0.2944,
    0.3238400000000001,
    NULL,
    76.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CASCAS_ALIMENTOS',
    'Cascas diversas',
    'IN_INDUSTRIAL',
    'IN_ALIMENTOS',
    'ALIMENTOS',
    'Ind. Alimentícia',
    210.00000000000003,
    280.0,
    350.00000000000006,
    12.75,
    15.0,
    17.25,
    76.5,
    85.0,
    93.5,
    0.7,
    0.8,
    0.95,
    0.5,
    0.35,
    0.85,
    0.85,
    0.8,
    0.95,
    0.7,
    0.85,
    0.95,
    0.11423999999999998,
    0.19039999999999999,
    0.28559999999999997,
    15.0,
    64.74,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'GORDURA',
    'Gordura e sebo',
    'IN_INDUSTRIAL',
    'IN_ABATEDOURO',
    'FRIGORIFICOS',
    'Frigoríficos',
    637.5,
    850.0,
    1062.5,
    80.75,
    95.0,
    100.0,
    88.2,
    98.0,
    100.0,
    0.7,
    0.92,
    0.95,
    0.5,
    0.5555555555555556,
    0.6111111111111112,
    0.85,
    1.0,
    0.95,
    0.7,
    0.96,
    0.95,
    0.4416,
    0.4906666666666667,
    0.5397333333333334,
    23.5,
    62.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'LEVEDO_CERVEJA',
    'Levedura residual',
    'IN_INDUSTRIAL',
    'IN_CERVEJA',
    'CERVEJARIAS',
    'Cervejarias',
    315.0,
    420.0,
    525.0,
    17.0,
    20.0,
    23.0,
    79.2,
    88.0,
    96.8,
    0.75,
    0.92,
    0.96,
    0.36000000000000004,
    0.4,
    0.44000000000000006,
    0.85,
    1.0,
    0.95,
    0.7,
    0.92,
    0.95,
    0.3047040000000001,
    0.3385600000000001,
    0.3724160000000001,
    15.0,
    76.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'REJEITOS',
    'Rejeitos industriais orgânicos',
    'IN_INDUSTRIAL',
    'IN_ALIMENTOS',
    'ALIMENTOS',
    'Ind. Alimentícia',
    240.0,
    320.0,
    400.0,
    17.0,
    20.0,
    23.0,
    74.7,
    83.0,
    91.3,
    0.7,
    0.9,
    0.95,
    0.5,
    0.25,
    0.85,
    0.85,
    0.95,
    0.95,
    0.7,
    0.9,
    0.95,
    0.11542499999999999,
    0.192375,
    0.2885625,
    15.0,
    64.74,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'SANGUE',
    'Sangue animal',
    'IN_INDUSTRIAL',
    'IN_ABATEDOURO',
    'FRIGORIFICOS',
    'Frigoríficos',
    337.5,
    450.0,
    562.5,
    15.72,
    18.5,
    21.27,
    81.0,
    90.0,
    99.0,
    0.85,
    0.9,
    0.98,
    0.18000000000000002,
    0.2,
    0.22000000000000003,
    0.85,
    1.0,
    0.95,
    0.7,
    0.92,
    0.95,
    0.14904000000000003,
    0.16560000000000002,
    0.18216000000000004,
    15.0,
    62.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'VISCERAS',
    'Vísceras não comestíveis',
    'IN_INDUSTRIAL',
    'IN_ABATEDOURO',
    'FRIGORIFICOS',
    'Frigoríficos',
    55.735,
    245.4175,
    571.35,
    18.7,
    22.0,
    25.3,
    82.8,
    92.0,
    100.0,
    0.8,
    0.92,
    0.97,
    0.2571428571428571,
    0.2857142857142857,
    0.3142857142857143,
    0.85,
    1.0,
    0.95,
    0.7,
    0.9,
    0.95,
    0.21291428571428572,
    0.23657142857142857,
    0.2602285714285714,
    23.5,
    61.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CAMA_AVIARIO',
    'Cama de aviário',
    'PC_PECUARIA',
    'PC_AVES',
    'AVES',
    'Avicultura',
    220.0,
    290.0,
    360.0,
    21.25,
    25.0,
    28.75,
    62.82,
    69.8,
    76.78,
    0.63,
    0.87,
    1.0,
    0.2571428571428571,
    0.2857142857142857,
    0.3142857142857143,
    0.9,
    1.0,
    1.0,
    0.6,
    0.85,
    0.9,
    0.19015714285714283,
    0.21128571428571427,
    0.23241428571428568,
    15.0,
    62.5,
    '1,58 kg resíduo/kg produto (GP Index) | 0,14-0,18 kg/ave/dia',
    '50% fertilizante orgânico (NPK: 3,38% N, 3,5% P, 3,93% K) + 40% biodigestão disponível',
    '**Avicultura SP tem 40,5% disponível** (728,2 Mi m³ CH₄/ano cenário realista vs 3.983,2 Mi m³ teórico).

**Justificativa Técnica (15 papers validados):**
- FCp=0,50: Mercado consolidado fertilizante orgânico (US$ 37,74/ton) compete diretamente
- Brasil 3º produtor mundial, importa fertilizantes da Rússia, solo tropical deficiente NPK
- Cama de frango: 41,5 g/kg N + 43-49 g/kg P₂O₅ + 45-53 g/kg K₂O = alto valor agronômico

**Co-digestão OBRIGATÓRIA:**
- C/N=4,66-11,55 (muito baixo, ótimo 20-35) → risco inibição amônia (TAN >3-6 g/L)
- Requer mistura palha cana (C/N~75-150), sabugo milho (C/N~50-80), bagaço laranja
- BMP aumenta 2-3x com co-digestão: 101-291 NL CH₄/kg VS vs 86-99 sozinho

**Fatores (validados Paper #10, #13 NIPE-UNICAMP):**
- FC=0,90: 85% produção em grandes integrações (sistemas confinados)
- FCp=0,50: 50% comercializado como fertilizante (NSWP Lei 12.305/2010)
- FS=1,00: Produção contínua (aviários climatizados, ciclo 42 dias)
- FL=0,90: Concentração Bastos-SP (24,8% produção estadual) facilita logística 10-30km

**Resultado:** 284.400 ton/ano geração SP (13% market share nacional) × 40,5% = **115.182 ton disponível biogás**',
    '🐔'
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'CARCACAS_AVES',
    'Carcaças e mortalidade',
    'PC_PECUARIA',
    'PC_OUTROS',
    'AVES',
    'Avicultura',
    464.99999999999994,
    620.0,
    775.0,
    31.88,
    37.5,
    43.12,
    83.7,
    93.0,
    100.0,
    0.6,
    0.96,
    0.9,
    0.36000000000000004,
    0.4,
    0.44000000000000006,
    0.9,
    1.0,
    1.0,
    0.6,
    0.9,
    0.9,
    0.31104000000000004,
    0.3456,
    0.38016000000000005,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'DEJETOS_AVES',
    'Dejetos frescos de aves',
    'PC_PECUARIA',
    'PC_AVES',
    'AVES',
    'Avicultura',
    39.95,
    175.59,
    674.4,
    0.14,
    8.0,
    31.0,
    63.75,
    75.0,
    86.25,
    0.8,
    0.85,
    0.98,
    0.225,
    0.25,
    0.275,
    0.9,
    1.0,
    1.0,
    0.6,
    0.85,
    0.9,
    0.1625625,
    0.18062499999999998,
    0.19868750000000002,
    8.0,
    57.0,
    '1,5-2,0 kg/ave/ciclo',
    NULL,
    'Confinamento: 45% disponível. Pasto: 0% (espalhado no campo).',
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'DEJETOS_BOVINO',
    'Dejetos líquidos bovino',
    'PC_PECUARIA',
    'PC_BOVINOS',
    'BOVINO',
    'Bovinocultura',
    39.95,
    175.59,
    674.4,
    0.14,
    8.0,
    31.0,
    70.2,
    78.0,
    85.8,
    0.4,
    0.7,
    0.75,
    0.3,
    0.3333333333333333,
    0.3666666666666667,
    0.9,
    1.0,
    1.0,
    0.5,
    0.77,
    0.8,
    0.1617,
    0.17966666666666664,
    0.19763333333333333,
    15.0,
    57.0,
    '10 kg/cabeça/dia',
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'DEJETOS_SUINO',
    'Dejetos líquidos de suínos',
    'PC_PECUARIA',
    'PC_SUINOS',
    'SUINO',
    'Suinocultura',
    39.95,
    175.59,
    674.4,
    0.14,
    8.0,
    31.0,
    80.0,
    83.9,
    84.0,
    0.75,
    0.9,
    0.95,
    0.45,
    0.5,
    0.55,
    0.9,
    1.0,
    1.0,
    0.6,
    0.9,
    0.9,
    0.36450000000000005,
    0.405,
    0.44550000000000006,
    12.0,
    57.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'ESTERCO_BOVINO',
    'Esterco bovino',
    'PC_PECUARIA',
    'PC_BOVINOS',
    'BOVINO',
    'Bovinocultura',
    39.95,
    175.59,
    674.4,
    0.14,
    8.0,
    31.0,
    4.0,
    80.0,
    4.0,
    0.26,
    0.7,
    0.49,
    0.2571428571428571,
    0.2857142857142857,
    0.3142857142857143,
    0.9,
    1.0,
    1.0,
    0.6,
    0.77,
    0.9,
    0.13859999999999997,
    0.154,
    0.1694,
    14.7,
    57.0,
    '13-21 kg/animal/dia | Confinamento: 20 kg/dia | Pasto: 10 kg/dia',
    '80% dispersão pasto + 20% uso fertilizante esporádico',
    '**Bovinocultura SP tem 33,6-50% disponível** (0,84-1,25 bilhões Nm³/ano) vs. 2,5 bilhões (teórico).

**Justificativa Técnica (35 papers 2017-2025):**
- **FCp=0,80**: BAIXA competição (dejetos sem valor comercial vs cama frango R$ 150-300/ton)
- 97% produtores não valorizam dejetos (Herrero 2018 Embrapa-SP)
- Custo oportunidade baixo: R$ 20-50/ton vs R$ 150-300/ton avicultura

**Co-digestão OBRIGATÓRIA:**
- C/N=14-15,4 (muito abaixo ótimo 25-30)
- Incrementos validados: +44,6% (batata-doce 50%), +138% (café 40%)

**Fatores (35 papers NIPE, UNESP, USP, Embrapa):**
- FC=0,374 | FCp=0,80 | FS=1,00 | FL=0,75
- Resultado: 0,84-1,25 bilhões Nm³/ano',
    '🐄'
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'ESTERCO_SUINO',
    'Esterco sólido de suínos',
    'PC_PECUARIA',
    'PC_SUINOS',
    'SUINO',
    'Suinocultura',
    39.95,
    175.59,
    674.4,
    0.14,
    8.0,
    31.0,
    3.0,
    25.63333333333334,
    75.0,
    0.6,
    0.87,
    0.9,
    0.40909090909090906,
    0.45454545454545453,
    0.5,
    0.9,
    1.0,
    1.0,
    0.6,
    0.9,
    0.9,
    0.32031818181818184,
    0.3559090909090909,
    0.3915,
    20.0,
    57.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'FORSU',
    'FORSU - Fração Orgânica separada',
    'UR_URBANO',
    'UR_RSU',
    'RSU',
    'Resíduos Sólidos Urbanos',
    66.0023,
    88.00306666666667,
    110.00383333333335,
    26.0,
    30.58,
    35.17,
    76.5,
    85.0,
    93.5,
    0.75,
    0.5,
    0.95,
    0.65,
    0.85,
    0.9,
    0.95,
    0.95,
    1.0,
    0.8,
    0.8,
    0.95,
    0.1938,
    0.323,
    0.48450000000000004,
    18.0,
    52.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'ORGANICO_RSU',
    'Fração orgânica RSU',
    'UR_URBANO',
    'UR_RSU',
    'RSU',
    'Resíduos Sólidos Urbanos',
    66.0023,
    88.00306666666667,
    110.00383333333335,
    26.0,
    30.58,
    35.17,
    73.8,
    82.0,
    90.2,
    0.75,
    0.45,
    0.95,
    0.65,
    0.8,
    0.9,
    0.95,
    0.95,
    1.0,
    0.85,
    0.8,
    1.0,
    0.16416,
    0.2736,
    0.4104,
    25.0,
    52.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'LODO_PRIMARIO',
    'Lodo primário',
    'UR_URBANO',
    'UR_ETE',
    'LODO_ETE',
    'Lodo de ETE',
    119.0,
    303.0,
    571.35,
    1.0,
    15.0,
    82.6,
    10.0,
    43.75,
    71.0,
    0.9,
    0.96,
    0.99,
    0.7,
    0.65,
    0.95,
    0.95,
    1.0,
    1.0,
    0.8,
    0.92,
    0.95,
    0.34444800000000003,
    0.57408,
    0.8611200000000001,
    18.0,
    68.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


INSERT INTO residuos (
    codigo, nome, sector_codigo, subsector_codigo,
    categoria_codigo, categoria_nome,
    bmp_min, bmp_medio, bmp_max,
    ts_min, ts_medio, ts_max,
    vs_min, vs_medio, vs_max,
    fc_min, fc_medio, fc_max,
    fcp_min, fcp_medio, fcp_max,
    fs_min, fs_medio, fs_max,
    fl_min, fl_medio, fl_max,
    fator_pessimista, fator_realista, fator_otimista,
    chemical_cn_ratio, chemical_ch4_content,
    generation, destination, justification, icon
) VALUES (
    'LODO_SECUNDARIO',
    'Lodo secundário (biológico)',
    'UR_URBANO',
    'UR_ETE',
    'LODO_ETE',
    'Lodo de ETE',
    119.0,
    303.0,
    571.35,
    1.0,
    15.0,
    82.6,
    10.0,
    43.75,
    71.0,
    0.85,
    0.96,
    0.98,
    0.65,
    0.6,
    0.9,
    0.95,
    1.0,
    1.0,
    0.8,
    0.92,
    0.95,
    0.31795199999999996,
    0.52992,
    0.7948799999999999,
    18.0,
    68.0,
    NULL,
    NULL,
    NULL,
    NULL
) ON CONFLICT (codigo) DO UPDATE SET
    bmp_medio = EXCLUDED.bmp_medio,
    ts_medio = EXCLUDED.ts_medio,
    vs_medio = EXCLUDED.vs_medio,
    chemical_cn_ratio = EXCLUDED.chemical_cn_ratio,
    chemical_ch4_content = EXCLUDED.chemical_ch4_content;


-- ============================================================================
-- SCIENTIFIC REFERENCES (linked to residue parameters)
-- ============================================================================

INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'Talha, Z. et al. Alkaline Pretreatment of Sugarcane Bagasse and Filter Mud for Biogas Production: A Batch Study. Bioresources, 2016. DOI: 10.15376/biores.11.3.6824-6841',
    'Talha, Z',
    2016,
    NULL,
    '10.15376/biores.11.3.6824-6841'
FROM residuos r WHERE r.codigo = 'BAGACO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'Talha, Z. et al. 2016',
    'Talha, Z',
    2016,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'BAGACO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'Multiple sources consolidated',
    'Multiple sources consolidated',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'BAGACO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'WIKANDARI, R. et al. Improvement of Biogas Production from Orange Peel Waste by Leaching of Limonene. Biomedical Research International, v. 2015, 494182, 2015.',
    'WIKANDARI, R',
    2015,
    'Biomedical Research International',
    NULL
FROM residuos r WHERE r.codigo = 'BAGACO_CITROS';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'WIKANDARI, R. et al. Biogas Production from Citrus Waste by Membrane Bioreactor. Membranes, v. 4, n. 3, p. 596-607, 2014.',
    'WIKANDARI, R',
    2014,
    'Membranes',
    NULL
FROM residuos r WHERE r.codigo = 'BAGACO_CITROS';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ROSAS-MENDOZA, E. S. et al. Evaluation of bioenergy potential from citrus effluents through anaerobic digestion. Renewable Energy, v. 163, p. 1229-1240, 2020.',
    'ROSAS-MENDOZA, E',
    2020,
    'Renewable Energy',
    NULL
FROM residuos r WHERE r.codigo = 'BAGACO_CITROS';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'CZEKAŁA, Wojciech et al. Waste-to-energy: Biogas potential of waste from coffee production and consumption. Energy, v. 276, 127604, 2023.',
    'CZEKAŁA, Wojciech et al',
    2023,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_CAFE';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'PAES, Juliana L. et al. Biogas production by anaerobic digestion of coffee husks and cattle manure. Engenharia Agrícola, Jaboticabal, v. 43, special issue, e20220126, 2023.',
    'PAES, Juliana L',
    2023,
    'Jaboticabal',
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_CAFE';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'YANG, Tzyy Shyuan',
    'YANG, Tzyy Shyuan',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_CAFE';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'SILVA, Ariovaldo José da',
    'SILVA, Ariovaldo José da',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_CAFE';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'RODRIGUEZ, Carla Isabel Flores. Produção de gás metano a partir da digestão anaeróbia de casca de café. In: CONBEA, 52., 2023, Ribeirão Preto. Anais [...].',
    'RODRIGUEZ, Carla Isabel Flores',
    2023,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_CAFE';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'VEDOVATTO, Felipe et al. Production of biofuels from soybean straw and hull hydrolysates... Bioresource Technology, v. 340, 124837, 2021.',
    'VEDOVATTO, Felipe et al',
    2021,
    'Bioresource Technology',
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ASSOCIAÇÃO BRASILEIRA DO BIOGÁS (ABiogás). Nota Técnica: Potencial de Biogás no Brasil. ABiogás, 2019.',
    'ASSOCIAÇÃO BRASILEIRA DO BIOGÁS (ABiogás)',
    2019,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CASCA_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'WIKANDARI, R. et al. Improvement of Biogas Production from Orange Peel Waste by Leaching of Limonene. Biomedical Research International, v. 2015, 494182, 2015.',
    'WIKANDARI, R',
    2015,
    'Biomedical Research International',
    NULL
FROM residuos r WHERE r.codigo = 'CASCAS_CITROS';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'RUIZ, B. et al. Assessment of different pre-treatment methods for the removal of limonene in citrus waste... Waste Management & Research, v. 34, n. 12, p. 1249-1257, 2016.',
    'RUIZ, B',
    2016,
    'Waste Management & Research',
    NULL
FROM residuos r WHERE r.codigo = 'CASCAS_CITROS';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'NEGRO, V. et al. Citrus waste as feedstock for bio-based products recovery: review on limonene case study... Bioresource Technology, v. 214, p. 806-815, 2016.',
    'NEGRO, V',
    2016,
    'Bioresource Technology',
    NULL
FROM residuos r WHERE r.codigo = 'CASCAS_CITROS';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'MARIN, F.R.',
    'MARIN, F',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'THORBURN, P.J.',
    'THORBURN, P',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'DA COSTA, L.G.',
    'DA COSTA, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'OTTO, R.. Simulating Long-Term Effects of Trash Management on Sugarcane Yield for Brazilian Cropping Systems. **Sugar Tech**, v. 16, n. 2, p. 164-173, 2013.0. Disponível em: <https://doi.org/10.1007/s12355-013-0265-2>.',
    'OTTO, R',
    2013,
    NULL,
    '10.1007/s12355-013-0265-2>.'
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'FORTES, C.',
    'FORTES, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'TRIVELIN, P.C.O.',
    'TRIVELIN, P',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'VITTI, A.C.. Long-term decomposition of sugarcane harvest residues in Sao Paulo state, Brazil. **Biomass and Bioenergy**, v. 42, p. 189-198, 2012.0. Disponível em: <https://doi.org/10.1016/j.biombioe.2012.03.011>.',
    'VITTI, A',
    2012,
    NULL,
    '10.1016/j.biombioe.2012.03.011>.'
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'FORTES, C.',
    'FORTES, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'TRIVELIN, P.C.O.',
    'TRIVELIN, P',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'VITTI, A.C.. Long-term decomposition of sugarcane harvest residues in Sao Paulo state, Brazil. **Biomass and Bioenergy**, v. 42, p. 189-198, 2012.0. Disponível em: <https://doi.org/10.1016/j.biombioe.2012.03.011>.',
    'VITTI, A',
    2012,
    NULL,
    '10.1016/j.biombioe.2012.03.011>.'
FROM residuos r WHERE r.codigo = 'PALHA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'FERNÁNDEZ-RODRÍguez, María José et al. Evaluation and modelling of methane production from corn stover pretreated with various physicochemical techniques. Waste Management & Research, v. 40, n. 6, p. 737-748, 2022.',
    'FERNÁNDEZ-RODRÍguez, María José et al',
    2022,
    'Waste Management & Research',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'MENARDO, Salvatore et al. Potential biogas and methane yield of maize stover fractions and evaluation of some possible stover harvest chains. Biosystems Engineering, v. 129, p. 352-359, 2015.',
    'MENARDO, Salvatore et al',
    2015,
    'Biosystems Engineering',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BRUNI, Enrico',
    'BRUNI, Enrico',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'JENSEN, Anders Peter',
    'JENSEN, Anders Peter',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ANGELIDAKI, Irini. Anaerobic digestion of maize focusing on variety, harvest time and pretreatment. Applied Energy, v. 87, n. 7, p. 2212-2217, 2010.',
    'ANGELIDAKI, Irini',
    2010,
    'Applied Energy',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'MENARDO, Salvatore et al. Potential biogas and methane yield of maize stover fractions and evaluation of some possible stover harvest chains. Biosystems Engineering, v. 129, p. 352-359, 2015.',
    'MENARDO, Salvatore et al',
    2015,
    'Biosystems Engineering',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'MENARDO, Salvatore et al. Potential biogas and methane yield of maize stover fractions and evaluation of some possible stover harvest chains. Biosystems Engineering, v. 129, p. 352-359, 2015.',
    'MENARDO, Salvatore et al',
    2015,
    'Biosystems Engineering',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'TORRES-MAYANGA, Paola C. et al. Decomposição da palhada e liberação de nitrogênio e fósforo de resíduos culturais de plantas de cobertura. Pesquisa Agropecuária Brasileira, v. 49, n. 12, p. 1009-1017, 2014.',
    'TORRES-MAYANGA, Paola C',
    2014,
    'Brasileira',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'CERRI, Carlos Eduardo P. et al. Utilização do nitrogênio da palha de milho e de adubos verdes aplicados à cultura da cana-de-açúcar. Revista Brasileira de Ciência do Solo, v. 32, n. 6, p. 2853-2861, 2008.',
    'CERRI, Carlos Eduardo P',
    2008,
    'Solo',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'FERNÁNDEZ-RODRÍguez, María José et al. Evaluation and modelling of methane production from corn stover pretreated with various physicochemical techniques. Waste Management & Research, v. 40, n. 6, p. 737-748, 2022.',
    'FERNÁNDEZ-RODRÍguez, María José et al',
    2022,
    'Waste Management & Research',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'LIU, Chunmei',
    'LIU, Chunmei',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'YUAN, Xianzheng',
    'YUAN, Xianzheng',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'ZENG, Guangming',
    'ZENG, Guangming',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'LI, Weiwei',
    'LI, Weiwei',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'LI, Jun. Improving Biomethane Production and Mass Transfer with Corn Stover by Sodium Hydroxide Pretreatment and Trace Elements Addition. PLOS ONE, v. 10, n. 6, e0129025, 2015.',
    'LI, Jun',
    2015,
    'PLOS ONE',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'WEI, Wei',
    'WEI, Wei',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'GUO, Wenzong',
    'GUO, Wenzong',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'NGO, Huu Hao',
    'NGO, Huu Hao',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'GUO, Jianbo',
    'GUO, Jianbo',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'WEI, Qingjie. Enhanced high-quality biomethane production from anaerobic digestion of primary sludge by corn stover biochar. Bioresource Technology, v. 306, 123159, 2020.',
    'WEI, Qingjie',
    2020,
    'Bioresource Technology',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_MILHO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'VEDOVATTO, Felipe et al. Production of biofuels from soybean straw and hull hydrolysates... Bioresource Technology, v. 340, 124837, 2021.',
    'VEDOVATTO, Felipe et al',
    2021,
    'Bioresource Technology',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'LÓPEZ-DÁVILA, Edelbis et al. Biochemical methane potential of agro-wastes as a renewable source... Ciencia y Tecnología Agropecuaria, v. 23, n. 1, e1890, 2022.',
    'LÓPEZ-DÁVILA, Edelbis et al',
    2022,
    'Agropecuaria',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'DELAVALLADE, Clara et al. Understanding the contribution of soybean crop residues to soil nitrogen dynamics... PLOS ONE, v. 17, n. 6, e0270165, 2022.',
    'DELAVALLADE, Clara et al',
    2022,
    'PLOS ONE',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'CAO, Hongbing et al. Plant residue quality regulates mineral-associated organic carbon accumulation in arable soils. Environmental Research, v. 267, 120593, 2025.',
    'CAO, Hongbing et al',
    2025,
    'Environmental Research',
    NULL
FROM residuos r WHERE r.codigo = 'PALHA_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ALI, Shahid',
    'ALI, Shahid',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ANWAR, Zulfiqar',
    'ANWAR, Zulfiqar',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'IRSHAD, Muhammad',
    'IRSHAD, Muhammad',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'KIM, Joungjai. Exploring lignocellulosic biomass for bio-methane potential by anaerobic digestion and characterization of the digestate for nutrient recycling. Energy, Environment, and Sustainability, v. 1, n. 1, p. 5-13, 2018.',
    'KIM, Joungjai',
    2018,
    'Sustainability',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'ALI, Shahid',
    'ALI, Shahid',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'ANWAR, Zulfiqar',
    'ANWAR, Zulfiqar',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'IRSHAD, Muhammad',
    'IRSHAD, Muhammad',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'KIM, Joungjai. Exploring lignocellulosic biomass for bio-methane potential by anaerobic digestion and characterization of the digestate for nutrient recycling. Energy, Environment, and Sustainability, v. 1, n. 1, p. 5-13, 2018.',
    'KIM, Joungjai',
    2018,
    'Sustainability',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'INSTITUTO DE ECONOMIA AGRÍCOLA (IEA). Disponibilidade e utilização de resíduos gerados no beneficiamento do milho. Informações Econômicas, São Paulo, v. 24, n. 1, 1994.',
    'INSTITUTO DE ECONOMIA AGRÍCOLA (IEA)',
    1994,
    'Paulo',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'ALI, Shahid',
    'ALI, Shahid',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'ANWAR, Zulfiqar',
    'ANWAR, Zulfiqar',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'IRSHAD, Muhammad',
    'IRSHAD, Muhammad',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'KIM, Joungjai. Exploring lignocellulosic biomass for bio-methane potential by anaerobic digestion and characterization of the digestate for nutrient recycling. Energy, Environment, and Sustainability, v. 1, n. 1, p. 5-13, 2018.',
    'KIM, Joungjai',
    2018,
    'Sustainability',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'AMARO, Bianca Ramos',
    'AMARO, Bianca Ramos',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'CORRÊA, Diego de Oliveira',
    'CORRÊA, Diego de Oliveira',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'COSTA, William Eugenio',
    'COSTA, William Eugenio',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'BERNARDES, Maria Alzira. Chemical composition of maize stover fraction versus methane yield and energy value in anaerobic digestion/co-digestion. Energy, v. 198, 117322, 2020.',
    'BERNARDES, Maria Alzira',
    2020,
    'Energy',
    NULL
FROM residuos r WHERE r.codigo = 'SABUGO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'JANKE, L. et al. Pre-treatment of filter cake for anaerobic digestion in sugarcane biorefineries... Renewable Energy, v. 143, p. 1416-1426, 2019.',
    'JANKE, L',
    2019,
    'Renewable Energy',
    NULL
FROM residuos r WHERE r.codigo = 'TORTA_FILTRO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'GONZÁLEZ, L. M. L. et al. Anaerobic co-digestion of sugarcane press mud with vinasse... Waste Management, v. 76, p. 112-119, 2017.',
    'GONZÁLEZ, L',
    2017,
    'Waste Management',
    NULL
FROM residuos r WHERE r.codigo = 'TORTA_FILTRO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'LÓPEZ-DÁVILA, Edelbis et al. Biochemical methane potential of agro-wastes as a renewable source... Ciencia y Tecnología Agropecuaria, v. 23, n. 1, e1890, 2022.',
    'LÓPEZ-DÁVILA, Edelbis et al',
    2022,
    'Agropecuaria',
    NULL
FROM residuos r WHERE r.codigo = 'VAGEM_SOJA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'MORAES, B. S.',
    'MORAES, B',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ZAIAT, M.',
    'ZAIAT, M',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BONOMI, A. Anaerobic digestion of vinasse from sugarcane ethanol production in Brazil... RSER, v. 44, p. 888-903, 2015.',
    'BONOMI, A',
    2015,
    'RSER',
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'SILVA, A. A. et al. Anaerobic biodigestion of sugarcane vinasse under thermophilic conditions... Revista Ambiente & Água, v. 11, n. 3, 2016.',
    'SILVA, A',
    2016,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'EMBRAPA AGROENERGIA. Biogás e suas contribuições para os Objetivos de Desenvolvimento Sustentável (ODS). Documentos 49, 2022.',
    'EMBRAPA AGROENERGIA',
    2022,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'ALBANEZ, R.',
    'ALBANEZ, R',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'CHIARANDA, B.C.',
    'CHIARANDA, B',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'FERREIRA, R.G.',
    'FERREIRA, R',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'FRANÇA, A.L.P.',
    'FRANÇA, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'HONÓRIO, C.D.',
    'HONÓRIO, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'RODRIGUES, J.A.D.',
    'RODRIGUES, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'RATUSZNEI, S.M.',
    'RATUSZNEI, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ch4_content',
    'ZAIAT, M.. Anaerobic Biological Treatment of Vinasse for Environmental Compliance and Methane Production. **Applied Biochemistry and Biotechnology**, v. 178, n. 1, p. 21-43, 2015.0. Disponível em: <https://doi.org/10.1007/s12010-015-1856-z>.',
    'ZAIAT, M',
    2015,
    NULL,
    '10.1007/s12010-015-1856-z>.'
FROM residuos r WHERE r.codigo = 'VINHACA';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'PARANHOS, A.G.d.O.',
    'PARANHOS, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CARCACAS_AVES';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'ADARME, O.F.H.',
    'ADARME, O',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CARCACAS_AVES';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'BARRETO, G.F.',
    'BARRETO, G',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CARCACAS_AVES';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'SILVA, S.d.Q.',
    'SILVA, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'CARCACAS_AVES';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'cn_ratio',
    'AQUINO, S.F.d.. Methane production by co-digestion of poultry manure and lignocellulosic biomass: Kinetic and energy assessment. **Bioresource Technology**, v. 300, p. 122588, 2020.0. Disponível em: <https://doi.org/10.1016/j.biortech.2019.122588>.',
    'AQUINO, S',
    2020,
    NULL,
    '10.1016/j.biortech.2019.122588>.'
FROM residuos r WHERE r.codigo = 'CARCACAS_AVES';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'Wedwitschka, H. et al. Material Characterization and Substrate Suitability Assessment. Energies, 2020. DOI: 10.3390/en13184748',
    'Wedwitschka, H',
    2020,
    NULL,
    '10.3390/en13184748'
FROM residuos r WHERE r.codigo = 'DEJETOS_AVES';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'PAZUCH, F.A.',
    'PAZUCH, F',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'SIQUEIRA, J.',
    'SIQUEIRA, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'FRIEDRICH, L.',
    'FRIEDRICH, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'LENZ, A.M.',
    'LENZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'NOGUEIRA, C.E.C.',
    'NOGUEIRA, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'SOUZA, S.N.M.d.. &lt',
    'SOUZA, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'b&gt',
    'b&gt',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil. **Acta Scientiarum. Technology**, v. 39, n. 2, p. 149, 2017.0. Disponível em: <https://doi.org/10.4025/actascitechnol.v39i2.29167>.',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil',
    2017,
    NULL,
    '10.4025/actascitechnol.v39i2.29167>.'
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'PAZUCH, F.A.',
    'PAZUCH, F',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'SIQUEIRA, J.',
    'SIQUEIRA, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'FRIEDRICH, L.',
    'FRIEDRICH, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'LENZ, A.M.',
    'LENZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'NOGUEIRA, C.E.C.',
    'NOGUEIRA, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'SOUZA, S.N.M.d.. &lt',
    'SOUZA, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'b&gt',
    'b&gt',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil. **Acta Scientiarum. Technology**, v. 39, n. 2, p. 149, 2017.0. Disponível em: <https://doi.org/10.4025/actascitechnol.v39i2.29167>.',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil',
    2017,
    NULL,
    '10.4025/actascitechnol.v39i2.29167>.'
FROM residuos r WHERE r.codigo = 'DEJETOS_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'CESTONARO DO AMARAL, A.',
    'CESTONARO DO AMARAL, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'KUNZ, A.',
    'KUNZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'RADIS STEINMETZ, R.L.',
    'RADIS STEINMETZ, R',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'SCUSSIATO, L.A.',
    'SCUSSIATO, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'TÁPPARO, D.C.',
    'TÁPPARO, D',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'GASPARETO, T.C.. Influence of solid–liquid separation strategy on biogas yield from a stratified swine production system. **Journal of Environmental Management**, v. 168, p. 229-235, 2016.0. Disponível em: <https://doi.org/10.1016/j.jenvman.2015.12.014>.',
    'GASPARETO, T',
    2016,
    NULL,
    '10.1016/j.jenvman.2015.12.014>.'
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'CHERUBINI, E.',
    'CHERUBINI, E',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ZANGHELINI, G.M.',
    'ZANGHELINI, G',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ALVARENGA, R.A.F.',
    'ALVARENGA, R',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'FRANCO, D.',
    'FRANCO, D',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'SOARES, S.R.. Life cycle assessment of swine production in Brazil: a comparison of four manure management systems. **Journal of Cleaner Production**, v. 87, p. 68-77, 2015.0. Disponível em: <https://doi.org/10.1016/j.jclepro.2014.10.035>.',
    'SOARES, S',
    2015,
    NULL,
    '10.1016/j.jclepro.2014.10.035>.'
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'FONGARO, G.',
    'FONGARO, G',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'VIANCELLI, A.',
    'VIANCELLI, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'MAGRI, M.',
    'MAGRI, M',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ELMAHDY, E.',
    'ELMAHDY, E',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BIESUS, L.',
    'BIESUS, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'KICH, J.',
    'KICH, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'KUNZ, A.',
    'KUNZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BARARDI, C.. Utility of specific biomarkers to assess safety of swine manure for biofertilizing purposes. **Science of The Total Environment**, v. 479-480, p. 277-283, 2014.0. Disponível em: <https://doi.org/10.1016/j.scitotenv.2014.02.004>.',
    'BARARDI, C',
    2014,
    NULL,
    '10.1016/j.scitotenv.2014.02.004>.'
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'Aguilar-Aguilar, F.A. et al. Characterization and anaerobic digestion of manure. Ciência Rural, 2017. DOI: 10.1590/0103-8478cr20160879',
    'Aguilar-Aguilar, F',
    2017,
    NULL,
    '10.1590/0103-8478cr20160879'
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'Aguilar-Aguilar, F.A. et al. 2017',
    'Aguilar-Aguilar, F',
    2017,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'DEJETOS_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'PAZUCH, F.A.',
    'PAZUCH, F',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'SIQUEIRA, J.',
    'SIQUEIRA, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'FRIEDRICH, L.',
    'FRIEDRICH, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'LENZ, A.M.',
    'LENZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'NOGUEIRA, C.E.C.',
    'NOGUEIRA, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'SOUZA, S.N.M.d.. &lt',
    'SOUZA, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'b&gt',
    'b&gt',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil. **Acta Scientiarum. Technology**, v. 39, n. 2, p. 149, 2017.0. Disponível em: <https://doi.org/10.4025/actascitechnol.v39i2.29167>.',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil',
    2017,
    NULL,
    '10.4025/actascitechnol.v39i2.29167>.'
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'JEPPU, G.P.',
    'JEPPU, G',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'JANARDHAN, J.',
    'JANARDHAN, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'KAUP, S.',
    'KAUP, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'JANARDHANAN, A.',
    'JANARDHANAN, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'MOHAMMED, S.',
    'MOHAMMED, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'ACHARYA, S.. Effect of feed slurry dilution and total solids on specific biogas production by anaerobic digestion in batch and semi-batch reactors. **Journal of Material Cycles and Waste Management**, v. 24, n. 1, p. 97-110, 2021.0. Disponível em: <https://doi.org/10.1007/s10163-021-01298-1>.',
    'ACHARYA, S',
    2021,
    NULL,
    '10.1007/s10163-021-01298-1>.'
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'PAZUCH, F.A.',
    'PAZUCH, F',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'SIQUEIRA, J.',
    'SIQUEIRA, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'FRIEDRICH, L.',
    'FRIEDRICH, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'LENZ, A.M.',
    'LENZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'NOGUEIRA, C.E.C.',
    'NOGUEIRA, C',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'SOUZA, S.N.M.d.. &lt',
    'SOUZA, S',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'b&gt',
    'b&gt',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'vs',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil. **Acta Scientiarum. Technology**, v. 39, n. 2, p. 149, 2017.0. Disponível em: <https://doi.org/10.4025/actascitechnol.v39i2.29167>.',
    'Co-digestion of crude glycerin associated with cattle manure in biogas production in the State of Paraná, Brazil',
    2017,
    NULL,
    '10.4025/actascitechnol.v39i2.29167>.'
FROM residuos r WHERE r.codigo = 'ESTERCO_BOVINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'CHERUBINI, E.',
    'CHERUBINI, E',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ZANGHELINI, G.M.',
    'ZANGHELINI, G',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ALVARENGA, R.A.F.',
    'ALVARENGA, R',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'FRANCO, D.',
    'FRANCO, D',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'SOARES, S.R.. Life cycle assessment of swine production in Brazil: a comparison of four manure management systems. **Journal of Cleaner Production**, v. 87, p. 68-77, 2015.0. Disponível em: <https://doi.org/10.1016/j.jclepro.2014.10.035>.',
    'SOARES, S',
    2015,
    NULL,
    '10.1016/j.jclepro.2014.10.035>.'
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'FONGARO, G.',
    'FONGARO, G',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'VIANCELLI, A.',
    'VIANCELLI, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'MAGRI, M.',
    'MAGRI, M',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'ELMAHDY, E.',
    'ELMAHDY, E',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BIESUS, L.',
    'BIESUS, L',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'KICH, J.',
    'KICH, J',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'KUNZ, A.',
    'KUNZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'bmp',
    'BARARDI, C.. Utility of specific biomarkers to assess safety of swine manure for biofertilizing purposes. **Science of The Total Environment**, v. 479-480, p. 277-283, 2014.0. Disponível em: <https://doi.org/10.1016/j.scitotenv.2014.02.004>.',
    'BARARDI, C',
    2014,
    NULL,
    '10.1016/j.scitotenv.2014.02.004>.'
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'KUNZ, A.',
    'KUNZ, A',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'STEINMETZ, R.',
    'STEINMETZ, R',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'RAMME, M.',
    'RAMME, M',
    NULL,
    NULL,
    NULL
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


INSERT INTO residuo_references (
    residuo_id, parameter_type, citation, authors, year, journal, doi
) SELECT
    r.id,
    'ts',
    'COLDEBELLA, A.. Effect of storage time on swine manure solid separation efficiency by screening. **Bioresource Technology**, v. 100, n. 5, p. 1815-1818, 2009.0. Disponível em: <https://doi.org/10.1016/j.biortech.2008.09.022>.',
    'COLDEBELLA, A',
    2009,
    NULL,
    '10.1016/j.biortech.2008.09.022>.'
FROM residuos r WHERE r.codigo = 'ESTERCO_SUINO';


-- ============================================================================
-- CONVERSION FACTORS
-- ============================================================================

INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Pecuária',
    'Bovinos',
    135.0,
    'm³/cabeça/ano',
    'Penn State University, Pakistan Research (Frontiers), University of Punjab',
    'https://extension.psu.edu/biogas-from-manure; https://www.frontiersin.org/journals/energy-research/articles/10.3389/fenrg.2022.911485/full',
    '135 m³/cabeça/ano (617 municípios SP)',
    5.0,
    130.0,
    'Dados SP dentro da faixa literatura (131-438). Literatura range: 164-438 m³/cabeça/ano'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Pecuária',
    'Suínos',
    461.0,
    'm³/cabeça/ano',
    'IEA Bioenergy, Penn State Study, BioCycle Research',
    'https://www.ieabioenergy.com/wp-content/uploads/2021/07/Potential-utilization_WEB_END_NEW.pdf; https://www.biocycle.net/swine-manure-biomethane/',
    '461 m³/cabeça/ano (587 municípios SP)',
    18.0,
    380.0,
    'Dados SP superiores à literatura (33-197 m³), indicam sistemas mais intensivos'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Pecuária',
    'Aves',
    1.2,
    'm³/ave/ano',
    'Environmental Chemistry Letters, MDPI Energies, Jordan Study',
    'https://link.springer.com/article/10.1007/s10311-023-01618-x; https://www.intechopen.com/journals/7/articles/300',
    '1.2 m³/ave/ano (577 municípios SP)',
    25.0,
    1.5,
    'Literatura: 0.5 m³/kg matéria orgânica. Dados SP coerentes'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Culturas',
    'Cana-de-açúcar',
    94.0,
    'm³/ton',
    'PMC/NIH Research, Brazilian Industry Scale, ChemSusChem Review',
    'https://pmc.ncbi.nlm.nih.gov/articles/PMC4613226/; https://chemistry-europe.onlinelibrary.wiley.com/doi/10.1002/cssc.202400779',
    '94 m³/ton (dados SP)',
    10.0,
    85.0,
    'Literatura range: 5-181 m³/ton. Dados SP no meio da faixa'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Culturas',
    'Milho',
    225.0,
    'm³/ton',
    'PMC Research, MDPI Study, Steam-exploded pretreatment',
    'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6926687/; https://www.mdpi.com/2311-5637/9/4/339',
    '225 m³/ton (dados SP)',
    7.0,
    210.0,
    'Literatura: 201-207 m³ metano/ton. Dados SP razoáveis para biogás total'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Culturas',
    'Soja',
    215.0,
    'm³/ton',
    'Wheat Straw Study, Global Soybean Review, IEA Assessment',
    'https://www.mdpi.com/2227-9717/12/8/1549; https://www.sciencedirect.com/science/article/abs/pii/S221146452400112X',
    '215 m³/ton (dados SP)',
    7.0,
    200.0,
    'Literatura limitada para soja específica. Dados SP conservadores vs fator original (469)'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Culturas',
    'Café',
    310.0,
    'm³/ton',
    'Energy Journal (2023), MDPI Resources (2024)',
    'https://www.sciencedirect.com/science/article/abs/pii/S0360544223009982; https://www.mdpi.com/2079-9276/13/2/21',
    '310 m³/ton (dados SP)',
    10.0,
    280.0,
    'Literatura range: 225-831 m³/ton. Dados SP dentro da faixa'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;


INSERT INTO conversion_factors (
    category, subcategory, factor_value, unit,
    literature_reference, reference_url,
    real_data_validation, safety_margin_percent,
    final_factor, notes
) VALUES (
    'Culturas',
    'Citros',
    21.0,
    'm³/ton',
    'ACS Sustainable Chemistry, Environmental Quality Management',
    'https://pubs.acs.org/doi/10.1021/acssuschemeng.0c01735; https://onlinelibrary.wiley.com/doi/abs/10.1002/tqem.22234',
    '21 m³/ton (dados SP)',
    10.0,
    19.0,
    'Discrepância literatura (116-217) vs dados SP (21). Dados SP consideram disponibilidade real limitada'
) ON CONFLICT (category, subcategory) DO UPDATE SET
    factor_value = EXCLUDED.factor_value,
    literature_reference = EXCLUDED.literature_reference;

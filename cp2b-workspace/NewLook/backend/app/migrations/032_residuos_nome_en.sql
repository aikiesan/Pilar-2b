-- 032_residuos_nome_en.sql
--
-- English names for the residues, for the English site.
--
-- `residuos.nome_en` has existed since migration 003, but the Panorama import
-- (004) never filled it, so the scientific database showed Portuguese residue
-- names on the English site. The API returns the column (the kinetics and
-- references endpoints too); the frontend falls back to `nome` wherever
-- `nome_en` is still empty.
--
-- A row is matched by any of:
--   * its UPPERCASE code (migrations 004 and 016);
--   * its lowercase slug: the live table held most substrates twice, and
--     scripts/dedupe_residuos.py kept the lowercase row for some of them;
--   * its Portuguese name, which both rows of a duplicated pair share (the
--     dedupe paired them by `nome`).
-- A value that matches no row changes nothing. Names already filled in are left
-- alone, so the migration is safe to re-run and never overwrites a hand-made
-- translation. Terms follow the platform glossary (docs/architecture/I18N_GUIDE.md):
-- OFMSW, MSW, WWTP.
--
-- After applying, list what is still untranslated with:
--   SELECT codigo, nome FROM residuos WHERE nome_en IS NULL OR btrim(nome_en) = '';

UPDATE residuos AS r
SET nome_en = v.nome_en
FROM (VALUES
    -- codigo,           slug,                        nome (pt),                          nome_en
    -- Agricultural
    ('BAGACO',           'bagaco_cana',               'Bagaço de cana',                   'Sugarcane bagasse'),
    ('PALHA',            'palha_cana',                'Palha de cana',                    'Sugarcane straw'),
    ('TORTA_FILTRO',     'torta_filtro',              'Torta de filtro',                  'Filter cake'),
    ('VINHACA',          'vinhaca_cana',              'Vinhaça',                          'Vinasse'),
    ('BAGACO_CITROS',    'bagaco_citros',             'Bagaço de citros',                 'Citrus bagasse'),
    ('CASCAS_CITROS',    'cascas_citros',             'Cascas de citros',                 'Citrus peels'),
    ('POLPA_CITROS',     'polpa_citros',              'Polpa de citros',                  'Citrus pulp'),
    ('CASCA_CAFE',       'casca_cafe',                'Casca de café',                    'Coffee husk'),
    ('POLPA_CAFE',       'polpa_cafe',                'Polpa de café',                    'Coffee pulp'),
    ('MUCILAGEM_CAFE',   'mucilagem_cafe',            'Mucilagem de café',                'Coffee mucilage'),
    ('PALHA_MILHO',      'palha_milho',               'Palha de milho',                   'Corn stover'),
    ('CASCA_MILHO',      'casca_milho',               'Casca de milho',                   'Corn husks'),
    ('SABUGO',           'sabugo_milho',              'Sabugo de milho',                  'Corn cobs'),
    ('PALHA_SOJA',       'palha_soja',                'Palha de soja',                    'Soybean straw'),
    ('CASCA_SOJA',       'casca_soja',                'Casca de soja',                    'Soybean hulls'),
    ('VAGEM_SOJA',       'vagem_soja',                'Vagem de soja',                    'Soybean pods'),
    ('CASCA_EUCALIPTO',  'casca_eucalipto',           'Casca de eucalipto',               'Eucalyptus bark'),
    ('FOLHAS_EUCALIPTO', 'folhas_eucalipto',          'Folhas de eucalipto',              'Eucalyptus leaves'),
    ('GALHOS_EUCALIPTO', 'galhos_eucalipto',          'Galhos e ponteiros',               'Eucalyptus branches and tops'),
    -- Livestock
    ('CAMA_AVIARIO',     'cama_aviario',              'Cama de aviário',                  'Poultry litter'),
    ('DEJETOS_AVES',     'dejetos_aves_frescos',      'Dejetos frescos de aves',          'Fresh poultry manure'),
    ('CARCACAS_AVES',    'carcacas_aves',             'Carcaças e mortalidade',           'Carcasses and mortalities'),
    ('ESTERCO_BOVINO',   'esterco_bovino_fresco',     'Esterco bovino',                   'Cattle manure'),
    ('DEJETOS_BOVINO',   'dejetos_bovinos_liquidos',  'Dejetos líquidos bovino',          'Liquid cattle manure'),
    ('DEJETOS_SUINO',    'dejetos_suinos_liquidos',   'Dejetos líquidos de suínos',       'Liquid swine manure'),
    ('ESTERCO_SUINO',    'esterco_suino',             'Esterco sólido de suínos',         'Solid swine manure'),
    -- Urban
    ('FORSU',            'forsu_ur_rsu',              'FORSU - Fração Orgânica separada', 'OFMSW (source-separated organic fraction)'),
    ('ORGANICO_RSU',     'organico_rsu',              'Fração orgânica RSU',              'Organic fraction of MSW'),
    ('LODO_PRIMARIO',    'lodo_primario_ete',         'Lodo primário',                    'Primary sludge (WWTP)'),
    ('LODO_SECUNDARIO',  'lodo_secundario_ete',       'Lodo secundário (biológico)',      'Secondary (biological) sludge (WWTP)'),
    ('PODA_URBANA',      'poda_urbana',               NULL,                               'Urban pruning waste'),
    -- Industrial
    ('BAGACO_MALTE',     'bagaco_malte',              'Bagaço de malte',                  'Brewers'' spent grain'),
    ('LEVEDO_CERVEJA',   'levedura_residual',         'Levedura residual',                'Spent brewer''s yeast'),
    ('GORDURA',          'gordura_sebo',              'Gordura e sebo',                   'Fat and tallow'),
    ('SANGUE',           'sangue_animal',             'Sangue animal',                    'Animal blood'),
    ('VISCERAS',         'visceras_abatedouro',       'Vísceras não comestíveis',         'Inedible offal'),
    ('CASCAS_ALIMENTOS', 'cascas_alimentos',          'Cascas diversas',                  'Assorted food-processing peels'),
    ('REJEITOS',         'rejeitos',                  'Rejeitos industriais orgânicos',   'Organic industrial rejects'),
    ('APARAS_ALIMENTOS', 'aparas_alimentos',          'Aparas e refiles',                 'Trimmings and offcuts')
) AS v(codigo, slug, nome, nome_en)
WHERE (r.codigo IN (v.codigo, v.slug) OR lower(btrim(r.nome)) = lower(v.nome))
  AND (r.nome_en IS NULL OR btrim(r.nome_en) = '');

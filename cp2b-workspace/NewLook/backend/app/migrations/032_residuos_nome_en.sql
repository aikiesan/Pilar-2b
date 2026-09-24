-- 032_residuos_nome_en.sql
--
-- English names for the residues, for the English site.
--
-- `residuos.nome_en` has existed since migration 003, but the Panorama import
-- (004) never filled it, so the scientific database showed Portuguese residue
-- names on the English site. The API already returns the column (and, after this
-- change, the kinetics and references endpoints do too); the frontend falls back
-- to `nome` wherever `nome_en` is still empty.
--
-- Codes are those of migrations 004 and 016; a code missing from the database
-- simply matches no row. Names already filled in are left alone, so the
-- migration is safe to re-run and never overwrites a hand-made translation.
-- Terms follow the platform glossary (docs/i18n): OFMSW, MSW, WWTP.

UPDATE residuos AS r
SET nome_en = v.nome_en
FROM (VALUES
    -- Agricultural
    ('BAGACO',           'Sugarcane bagasse'),
    ('PALHA',            'Sugarcane straw'),
    ('TORTA_FILTRO',     'Filter cake'),
    ('VINHACA',          'Vinasse'),
    ('BAGACO_CITROS',    'Citrus bagasse'),
    ('CASCAS_CITROS',    'Citrus peels'),
    ('POLPA_CITROS',     'Citrus pulp'),
    ('CASCA_CAFE',       'Coffee husk'),
    ('POLPA_CAFE',       'Coffee pulp'),
    ('MUCILAGEM_CAFE',   'Coffee mucilage'),
    ('PALHA_MILHO',      'Corn stover'),
    ('CASCA_MILHO',      'Corn husks'),
    ('SABUGO',           'Corn cobs'),
    ('PALHA_SOJA',       'Soybean straw'),
    ('CASCA_SOJA',       'Soybean hulls'),
    ('VAGEM_SOJA',       'Soybean pods'),
    ('CASCA_EUCALIPTO',  'Eucalyptus bark'),
    ('FOLHAS_EUCALIPTO', 'Eucalyptus leaves'),
    ('GALHOS_EUCALIPTO', 'Eucalyptus branches and tops'),
    -- Livestock
    ('CAMA_AVIARIO',     'Poultry litter'),
    ('DEJETOS_AVES',     'Fresh poultry manure'),
    ('CARCACAS_AVES',    'Carcasses and mortalities'),
    ('ESTERCO_BOVINO',   'Cattle manure'),
    ('DEJETOS_BOVINO',   'Liquid cattle manure'),
    ('DEJETOS_SUINO',    'Liquid swine manure'),
    ('ESTERCO_SUINO',    'Solid swine manure'),
    -- Urban
    ('FORSU',            'OFMSW (source-separated organic fraction)'),
    ('ORGANICO_RSU',     'Organic fraction of MSW'),
    ('LODO_PRIMARIO',    'Primary sludge (WWTP)'),
    ('LODO_SECUNDARIO',  'Secondary (biological) sludge (WWTP)'),
    ('PODA_URBANA',      'Urban pruning waste'),
    -- Industrial
    ('BAGACO_MALTE',     'Brewers'' spent grain'),
    ('LEVEDO_CERVEJA',   'Spent brewer''s yeast'),
    ('GORDURA',          'Fat and tallow'),
    ('SANGUE',           'Animal blood'),
    ('VISCERAS',         'Inedible offal'),
    ('CASCAS_ALIMENTOS', 'Assorted food-processing peels'),
    ('REJEITOS',         'Organic industrial rejects'),
    ('APARAS_ALIMENTOS', 'Trimmings and offcuts')
) AS v(codigo, nome_en)
WHERE r.codigo = v.codigo
  AND (r.nome_en IS NULL OR btrim(r.nome_en) = '');

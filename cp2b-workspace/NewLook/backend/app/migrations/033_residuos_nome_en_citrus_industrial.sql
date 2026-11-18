-- 033_residuos_nome_en_citrus_industrial.sql
--
-- The one English residue name migration 032 could not match on the production
-- database: the industrial citrus peels. Its code is lowercase only
-- (`cascas_citros_ind`, no uppercase twin) and its Portuguese name, "Cascas de
-- Citros (Industrial)", is not one of 032's names.
--
-- Same rules as 032: fills an empty name only, safe to re-run.

UPDATE residuos
SET nome_en = 'Citrus peels (industrial)'
WHERE codigo = 'cascas_citros_ind'
  AND (nome_en IS NULL OR btrim(nome_en) = '');

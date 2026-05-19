-- Migration: Cleanup invalid or empty references
-- Date: 2025-12-15
-- Description: Removes residue references that lack essential information (title and citation).

BEGIN;

-- Remove references where both title and citation are missing or empty
DELETE FROM residuo_references
WHERE 
    (title IS NULL OR TRIM(title) = '') 
    AND 
    (citation IS NULL OR TRIM(citation) = '');

-- Optional: Remove references with no residue_id linked (orphaned)
DELETE FROM residuo_references
WHERE residuo_id IS NOT NULL 
AND residuo_id NOT IN (SELECT id FROM residuos);

COMMIT;

SELECT 'Cleanup completed successfully.' AS status;

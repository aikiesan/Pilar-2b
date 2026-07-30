-- ============================================================================
-- 029 — Cenários Real e Ideal por RESÍDUO, não só por setor
-- ============================================================================
-- A migração 026 guardou os cenários como total municipal mais quatro setores.
-- Isso bastava para pintar o mapa, mas quebrou o filtro por resíduo: selecionar
-- "Cana-de-açúcar" não tem como filtrar um número que já vem somado com torta,
-- palha e vinhaça dentro de "agropecuária". O filtro passou a não fazer nada sob
-- Real/Ideal — não por bug, mas porque a granularidade não existia.
--
-- Aqui os dois níveis passam a ser armazenados por resíduo. Os totais e os
-- setores da 026 permanecem: continuam sendo o que o mapa lê por padrão, e
-- agora são deriváveis das parcelas, o que os torna verificáveis.
--
-- TREZE resíduos, não os onze do filtro atual:
--   * `sewage` (esgoto/ETE) entrou no cálculo na 026 dentro do setor urbano mas
--     nunca teve entrada própria no filtro;
--   * `forestry` (silvicultura) tem setor e coluna legada mas também não é
--     filtrável.
-- Guardá-los aqui é o que permite oferecê-los na interface sem outra migração.
--
-- CANA: vinhaça + torta de filtro + palha, somadas em `sugarcane` porque é a
-- unidade que o filtro oferece. Bagaço NÃO entra — o Atlas (p.65) o classifica
-- como já aproveitado em caldeiras.
--
-- Volumes são METANO. Biogás e biometano são derivados na API e no cliente.
--
-- Idempotente.
-- ============================================================================

DO $$
DECLARE
    residuo TEXT;
    tier    TEXT;
BEGIN
    FOREACH residuo IN ARRAY ARRAY[
        'sugarcane', 'soybean', 'corn', 'coffee', 'citrus',
        'cattle', 'swine', 'poultry', 'aquaculture',
        'rsu', 'rpo', 'sewage', 'forestry'
    ] LOOP
        FOREACH tier IN ARRAY ARRAY['real', 'ideal'] LOOP
            EXECUTE format(
                'ALTER TABLE municipalities ADD COLUMN IF NOT EXISTS %I DOUBLE PRECISION',
                'ch4_' || tier || '_' || residuo || '_m3_year'
            );
        END LOOP;
    END LOOP;
END $$;

COMMENT ON COLUMN municipalities.ch4_real_sugarcane_m3_year IS
    'Cenario Real, cana: vinhaca + torta de filtro + palha (Nm3 CH4/ano). '
    'Bagaco excluido — ja aproveitado em caldeiras (Atlas SP 2020 p.65).';
COMMENT ON COLUMN municipalities.ch4_real_sewage_m3_year IS
    'Cenario Real, esgoto sanitario via ETE (Atlas Eq. VI.1). Entra no setor '
    'urbano do total, mas so aqui tem parcela propria.';

-- Guarda a identidade que passa a valer: a soma das parcelas tem de reproduzir
-- o total da 026. Consultavel como teste, sem impor CHECK — o carregador grava
-- as colunas em ordens diferentes e uma constraint falharia no meio da carga.
INSERT INTO scenario_parameters
    (parametro, valor_real, valor_ideal, unidade, fonte, pagina, justificativa)
VALUES
    ('cenarios_por_residuo', 13, 13, 'residuos',
     'PILAR-2b migracao 029', NULL,
     'Cenarios passam a ser armazenados por residuo alem de por setor. A 026 so '
     'guardava total + 4 setores, o que tornava o filtro por residuo inoperante '
     'sob Real/Ideal: nao ha como filtrar cana de um numero ja somado com o resto '
     'da agropecuaria. Treze residuos incluindo sewage e forestry, que participam '
     'do calculo desde a 026 mas nunca tiveram entrada propria no filtro.')
ON CONFLICT (parametro) DO UPDATE SET
    justificativa = EXCLUDED.justificativa;

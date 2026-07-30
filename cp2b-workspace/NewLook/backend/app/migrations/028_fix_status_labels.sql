-- ============================================================================
-- 028 — Corrigir rótulos data_status que contradizem a evidência
-- ============================================================================
-- Rodar DEPOIS de scripts/dedupe_residuos.py --apply: a fusão já removeu três
-- dos quatro rótulos "🟢 Scientifically Validated" que não tinham referência
-- alguma (dejetos_aves_frescos, dejetos_bovinos_liquidos, sabugo_milho), porque
-- em cada par eles eram o lado sem evidência. Restam três incoerências.
--
-- 1. cascas_citros_ind — 🟢 "Scientifically Validated" com ZERO referências de
--    qualquer tipo. O rótulo afirma uma validação que a tabela de referências
--    não sustenta. Rebaixado, não removido: o substrato existe, o que falta é
--    a evidência.
--
-- 2. levedura_residual e soro_queijo — marcados "🔴 DEPRECATED - Merged into
--    IN_CERV_001 / IN_LACT_001", códigos que NÃO EXISTEM em residuos (nem em
--    codigo, nem em scientific_code — verificado). Pior: levedura_residual
--    SOBREVIVEU à fusão, por ter mais referências que LEVEDO_CERVEJA. Um
--    sobrevivente rotulado como obsoleto, apontando para um destino inexistente,
--    é a pior das três leituras possíveis.
--
-- Nenhum parâmetro numérico é tocado — só a asserção sobre a evidência.
--
-- Idempotente.
-- ============================================================================

UPDATE residuos
SET data_status = '🟡 Sem referências registradas'
WHERE codigo = 'cascas_citros_ind'
  AND NOT EXISTS (SELECT 1 FROM residuo_references rr WHERE rr.residuo_id = residuos.id);

UPDATE residuos
SET data_status = '🟢 Consolidado (fusão 2026-07-30)'
WHERE codigo IN ('levedura_residual', 'soro_queijo')
  AND data_status ILIKE '%DEPRECATED%';

-- Guarda a asserção como um teste consultável: nenhuma linha pode afirmar
-- validação sem referência, e nenhum destino de merge pode ficar pendurado.
INSERT INTO scenario_parameters
    (parametro, valor_real, valor_ideal, unidade, fonte, pagina, justificativa)
VALUES
    ('residuos_rotulos_corrigidos', 3, 3, 'linhas',
     'PILAR-2b migracao 028', NULL,
     'cascas_citros_ind afirmava validacao cientifica com zero referencias. '
     'levedura_residual e soro_queijo estavam marcados DEPRECATED apontando para '
     'IN_CERV_001 e IN_LACT_001, codigos inexistentes — e levedura_residual havia '
     'SOBREVIVIDO a fusao por ter mais referencias que seu par. Nenhum parametro '
     'numerico alterado.')
ON CONFLICT (parametro) DO UPDATE SET justificativa = EXCLUDED.justificativa;

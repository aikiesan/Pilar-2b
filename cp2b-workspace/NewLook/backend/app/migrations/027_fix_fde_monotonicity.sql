-- ============================================================================
-- 027 — Reparar triplos min/medio/max não-monotônicos dos fatores FDE
-- ============================================================================
-- FDE = FC × FCo × FS × FL, e cada fator é armazenado como um triplo
-- (_min, _medio, _max). Em 43 dos 152 triplos (4 fatores × 38 resíduos com
-- fatores) o valor _max está ABAIXO do _medio, ou o _min ACIMA dele:
--
--   CASCA_EUCALIPTO  fc  0,20 / 0,77 / 0,50   ← max < medio
--   BAGACO_CITROS    fc  0,75 / 0,55 / 0,95   ← min > medio
--   FORSU            fc  0,75 / 0,50 / 0,95   ← min > medio
--   ESTERCO_BOVINO   fc  0,26 / 0,70 / 0,49   ← max < medio
--
-- Por fator: fc 12, fcp 6, fs 19, fl 6 fora de ordem. Doze resíduos produzem um
-- FDE cujo produto também é não-monotônico; os demais só saíam ordenados por
-- coincidência aritmética, o que torna a faixa publicada indefensável mesmo
-- onde o produto "parecia" certo.
--
-- CORREÇÃO — grampear os extremos ao redor do central, nunca mover o central:
--     _min := LEAST(_min, _medio, _max)
--     _max := GREATEST(_min, _medio, _max)
--
-- Isso garante _min ≤ _medio ≤ _max preservando os três valores medidos; apenas
-- reatribui qual ocupa cada extremo. **_medio permanece intocado de propósito**:
-- é o valor usado no cálculo de produção (fc_medio × fcp_medio × fs_medio ×
-- fl_medio), então nenhum número publicado se move. Verificado antes de aplicar:
-- 12 produtos fora de ordem → 0; 17 mínimos e 14 máximos reatribuídos.
--
-- Os Cenários Real e Ideal (migração 026) NÃO leem estes fatores — derivam dos
-- parâmetros do Atlas. O impacto se restringe às faixas dos scripts de
-- diagnóstico, que passam a ser faixas de verdade.
--
-- A ordem correta NÃO é imposta por CHECK constraint: o carregador canônico
-- ainda pode reintroduzir triplos invertidos, e uma constraint faria a carga
-- falhar inteira em vez de sinalizar as linhas. O gate fica no script de
-- verificação, que lista o que estiver fora de ordem.
--
-- Idempotente: reaplicar não tem efeito (os triplos já estarão ordenados).
-- ============================================================================

-- Snapshot dos valores originais, para auditoria e reversão.
CREATE TABLE IF NOT EXISTS residuos_fde_backup_027 (
    residuo_id INTEGER PRIMARY KEY,
    codigo     TEXT NOT NULL,
    fc_min REAL, fc_medio REAL, fc_max REAL,
    fcp_min REAL, fcp_medio REAL, fcp_max REAL,
    fs_min REAL, fs_medio REAL, fs_max REAL,
    fl_min REAL, fl_medio REAL, fl_max REAL,
    backed_up_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO residuos_fde_backup_027
    (residuo_id, codigo, fc_min, fc_medio, fc_max, fcp_min, fcp_medio, fcp_max,
     fs_min, fs_medio, fs_max, fl_min, fl_medio, fl_max)
SELECT id, codigo, fc_min, fc_medio, fc_max, fcp_min, fcp_medio, fcp_max,
       fs_min, fs_medio, fs_max, fl_min, fl_medio, fl_max
FROM residuos
WHERE fc_min IS NOT NULL
ON CONFLICT (residuo_id) DO NOTHING;

UPDATE residuos SET
    fc_min  = LEAST(fc_min, fc_medio, fc_max),
    fc_max  = GREATEST(fc_min, fc_medio, fc_max),
    fcp_min = LEAST(fcp_min, fcp_medio, fcp_max),
    fcp_max = GREATEST(fcp_min, fcp_medio, fcp_max),
    fs_min  = LEAST(fs_min, fs_medio, fs_max),
    fs_max  = GREATEST(fs_min, fs_medio, fs_max),
    fl_min  = LEAST(fl_min, fl_medio, fl_max),
    fl_max  = GREATEST(fl_min, fl_medio, fl_max)
WHERE fc_min IS NOT NULL
  AND (
        fc_min  > fc_medio  OR fc_medio  > fc_max  OR
        fcp_min > fcp_medio OR fcp_medio > fcp_max OR
        fs_min  > fs_medio  OR fs_medio  > fs_max  OR
        fl_min  > fl_medio  OR fl_medio  > fl_max
      );

-- Registra a decisão junto dos demais parâmetros de cenário, para que a
-- procedência seja consultável a partir do banco.
INSERT INTO scenario_parameters
    (parametro, valor_real, valor_ideal, unidade, fonte, pagina, justificativa)
VALUES
    ('fde_triplos_grampeados', 43, 0, 'triplos fora de ordem',
     'PILAR-2b migracao 027', NULL,
     'Antes: 43 dos 152 triplos (fc 12, fcp 6, fs 19, fl 6) tinham _max abaixo do '
     '_medio ou _min acima dele; 12 residuos produziam FDE nao-monotonico. '
     'Grampeados com LEAST/GREATEST ao redor do central. _medio NAO foi alterado, '
     'entao nenhum valor publicado mudou. Originais em residuos_fde_backup_027.')
ON CONFLICT (parametro) DO UPDATE SET
    valor_real    = EXCLUDED.valor_real,
    valor_ideal   = EXCLUDED.valor_ideal,
    justificativa = EXCLUDED.justificativa;

-- ============================================================================
-- 026 — Cenário Real e Cenário Ideal por município
-- ============================================================================
-- Armazena os dois níveis de potencial adotados do Atlas de Bioenergia do
-- Estado de São Paulo (2020), que é a referência estadual e cuja Figura 1 /
-- Tabela V.6 a plataforma passa a poder comparar diretamente.
--
--   Cenário Real  (curto prazo) — resíduo que efetivamente chega a um digestor
--                  hoje: taxas de coleta reais, usos concorrentes reais.
--   Cenário Ideal (fronteira)   — Atlas p.92 e pp.115-116: 100% do que é GERADO
--                  é coletado e tratado. É uma hipótese de INFRAESTRUTURA, não
--                  de química: BMP, TS, VS e teor de CH4 são idênticos nos dois.
--
-- IMPORTANTE — os volumes são METANO (CH4), não biogás. O BMP que os gera está
-- em NmL CH4/gVS. As colunas legadas *_biogas_m3_year têm o mesmo conteúdo sob
-- um nome errado; estas nascem com o nome correto. Biogás bruto e biometano são
-- derivados na API (biogás = CH4 / 0,625, fração FIESP 2025).
--
-- Idempotente: pode ser reaplicada sem efeito colateral.
-- ============================================================================

ALTER TABLE municipalities
    ADD COLUMN IF NOT EXISTS ch4_real_m3_year              DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_ideal_m3_year             DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_real_agricultural_m3_year DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_real_livestock_m3_year    DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_real_urban_m3_year        DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_real_forestry_m3_year     DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_ideal_agricultural_m3_year DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_ideal_livestock_m3_year   DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_ideal_urban_m3_year       DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS ch4_ideal_forestry_m3_year    DOUBLE PRECISION;

COMMENT ON COLUMN municipalities.ch4_real_m3_year IS
    'Cenario Real (curto prazo): Nm3 CH4/ano mobilizavel com as taxas de coleta '
    'e usos concorrentes atuais. Metano, nao biogas.';
COMMENT ON COLUMN municipalities.ch4_ideal_m3_year IS
    'Cenario Ideal (fronteira, Atlas SP 2020 p.92/115-116): Nm3 CH4/ano com 100% '
    'do gerado coletado e tratado. Mesma quimica do Real; muda so a coleta.';

-- Índice parcial: o mapa e os rankings ordenam por potencial dentro de SP, e o
-- filtro por prefixo 35 é o mesmo que a API aplica no /statistics/summary.
CREATE INDEX IF NOT EXISTS idx_municipalities_ch4_real
    ON municipalities (ch4_real_m3_year DESC)
    WHERE ibge_code::text LIKE '35%';

CREATE INDEX IF NOT EXISTS idx_municipalities_ch4_ideal
    ON municipalities (ch4_ideal_m3_year DESC)
    WHERE ibge_code::text LIKE '35%';

-- ============================================================================
-- Procedência dos parâmetros, para auditoria a partir do próprio banco
-- ============================================================================
CREATE TABLE IF NOT EXISTS scenario_parameters (
    id            SERIAL PRIMARY KEY,
    parametro     TEXT NOT NULL,
    valor_real    DOUBLE PRECISION,
    valor_ideal   DOUBLE PRECISION,
    unidade       TEXT,
    fonte         TEXT NOT NULL,
    pagina        TEXT,
    justificativa TEXT,
    created_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE (parametro)
);

INSERT INTO scenario_parameters
    (parametro, valor_real, valor_ideal, unidade, fonte, pagina, justificativa)
VALUES
    ('vinhaca_biogas_por_m3_etanol', 114, 114, 'm3 biogas/m3 etanol',
     'Atlas de Bioenergia SP 2020', 'p.67',
     'Rota direta publicada; dispensa BMP/VS. Fertirrigacao NAO e uso concorrente: '
     'a digestao e sequencial e o digestato mantem K/N/P e segue para o campo.'),
    ('vinhaca_teor_ch4', 0.50, 0.65, 'fracao',
     'Atlas de Bioenergia SP 2020', 'p.67', 'Faixa publicada 50-65%.'),
    ('palha_cana_fracao_recolhivel', 0.40, 0.50, 'fracao',
     'Atlas de Bioenergia SP 2020', 'p.65',
     '"apenas 40% da palha disponivel (em termos conservadores)"; 50-60% deve '
     'permanecer no campo para protecao do solo; custo de recolhimento R$65/t.'),
    ('bagaco_incluido', 0, 0, 'booleano',
     'Atlas de Bioenergia SP 2020', 'p.65',
     'EXCLUIDO: "ja aproveitados para geracao de energia (como o bagaco de cana)". '
     'Contabiliza-lo duplicaria energia que o setor ja recupera em caldeiras.'),
    ('rsu_fracao_organica', 0.4646, 0.4646, 'fracao',
     'EMAE/PROEMA 2011; GBio/IEE/USP 2013 via Atlas Eq.V.5', 'p.95-96',
     'Composicao gravimetrica apos triagem e separacao de reciclaveis (~20%).'),
    ('rsu_fator_biogas', 101.5, 101.5, 'Nm3 biogas/t MO',
     'Achinas et al. 2017 via Atlas Eq.V.6', 'p.96', 'Biodigestao anaerobia da FORSU.'),
    ('rsu_taxa_coleta', 0.9962, 1.0000, 'fracao',
     'Atlas de Bioenergia SP 2020', 'p.90',
     'Real: coleta medida em SP. Ideal: 100% do gerado, por definicao do cenario.'),
    ('esgoto_dqo_media', 449.7, 449.7, 'g DQO/m3',
     'SILVA 2015 via Atlas Eq.VI.1', 'p.116', NULL),
    ('esgoto_potencial_ch4', 0.1115, 0.1115, 'Nm3 CH4/kg DQO removida',
     'Atlas Eq.VI.1', 'p.116', NULL),
    ('esgoto_eficiencia_remocao', 0.755, 0.755, 'fracao',
     'SABESP 2018 via Atlas Eq.VI.1', 'p.116', NULL),
    ('suino_base_de_calculo', 6.0, 9.0, 'kg esterco/cabeca/dia',
     'Reconstrucao por massa (PILAR-2b 2026-07)', NULL,
     'Corrige fator de 380 m3 CH4/cabeca/ano que so faz sentido por MATRIZ '
     '(SP: 163.706) mas era aplicado ao rebanho total (1.591.238) — erro de 9,7x.'),
    ('residuos_campo_fracao_recolhivel', 0.40, 0.50, 'fracao',
     'Analogia com Atlas p.65 (palha de cana)',
     'p.65',
     'Milho, soja e silvicultura seguem a mesma logica agronomica de retencao de '
     'solo da palha de cana. NAO se usa o FDE do banco (milho 4,7%, soja 0,8%), '
     'que sofre a mesma sobre-penalizacao ja corrigida para a cana.'),
    ('residuos_processamento_fracao', 0.70, 0.85, 'fracao',
     'PILAR-2b 2026-07', NULL,
     'Citros e cafe ja chegam concentrados na industria; a coleta nao e o gargalo.'),
    ('ch4_fracao_do_biogas', 0.625, 0.625, 'fracao',
     'FIESP 2025', 'Tabela 1, nota *',
     '1 Nm3 biogas ~ 0,625 Nm3 biometano. Adotado para comparabilidade direta '
     'com GEF/ABiogas, IEE-USP, SEMIL e Instituto 17.'),
    ('pci_ch4', 9.94, 9.94, 'kWh/Nm3 CH4',
     'Bueno et al. 2016 (Atlas usa 9,97)', 'p.94', NULL),
    ('eficiencia_eletrica', 0.38, 0.38, 'fracao',
     'ABIOGAS 2018 via Atlas (0,35 ate 5.000 Nm3/dia; 0,42 acima)', 'p.94',
     'Adotado 0,38 como media ponderada entre as duas faixas de vazao.')
ON CONFLICT (parametro) DO UPDATE SET
    valor_real    = EXCLUDED.valor_real,
    valor_ideal   = EXCLUDED.valor_ideal,
    unidade       = EXCLUDED.unidade,
    fonte         = EXCLUDED.fonte,
    pagina        = EXCLUDED.pagina,
    justificativa = EXCLUDED.justificativa;

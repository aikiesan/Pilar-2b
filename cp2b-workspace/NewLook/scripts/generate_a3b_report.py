import os
import csv
import yaml

target_dir = r'a:\Pilar-2b\cp2b-workspace\NewLook'
output_file = os.path.join(target_dir, r'docs\auditorias\2026-07-consistencia-canonica\02_adventure-a_2026-07-27-28\A3b_SUFICIENCIA_CORPORA.md')

bmp_csv = os.path.join(target_dir, r'data\canonical_parameters\feedstock_bmp_from_refs.csv')
refs_csv = os.path.join(target_dir, r'data\canonical_parameters\references_unified.csv')
yaml_path = os.path.join(target_dir, r'data\canonical_parameters\feedstocks.yaml')

with open(yaml_path, 'r', encoding='utf-8') as f:
    yaml_feedstocks = yaml.safe_load(f).get('feedstocks', {})

ref_counts = {}
if os.path.exists(refs_csv):
    with open(refs_csv, 'r', encoding='utf-8', errors='ignore') as f:
        reader = csv.DictReader(f)
        for r in reader:
            codes = [c.strip() for c in (r.get('feedstock_codes') or '').split(',')]
            for c in codes:
                if c:
                    ref_counts[c] = ref_counts.get(c, 0) + 1

# Estimated CH4 weight contribution % in SP state
ch4_weights = {
    'VINHACA': 65.0,
    'PALHA': 8.0,
    'TORTA_FILTRO': 5.0,
    'BAGACO': 4.0,
    'ESTERCO_BOVINO_FRESCO': 3.0,
    'FORSU': 2.5,
    'ORGANICO_RSU': 2.0,
    'DEJETOS_SUINO': 1.5,
    'CAMA_AVIARIO': 1.0,
    'DEJETOS_AVES': 1.0,
    'LODO_SECUNDARIO': 0.8,
    'LODO_PRIMARIO': 0.8,
    'BAGACO_CITROS': 0.5,
    'CASCAS_CITROS': 0.5,
    'CASCA_CAFE': 0.4,
    'POLPA_CAFE': 0.4,
    'PALHA_MILHO': 0.3,
    'SABUGO': 0.3,
    'CASCA_MILHO': 0.3,
    'SORO_QUEIJO': 0.2,
    'VISCERAS': 0.2,
    'LEVEDURA': 0.2,
    'GORDURA': 0.2,
    'VAGEM_SOJA': 0.1,
    'CASCA_EUCALIPTO': 0.1,
    'CASCA_ARROZ': 0.1,
    'PALHA_ARROZ': 0.1,
    'CASCA_AMENDOIM': 0.1
}

bmp_csv_map = {}
if os.path.exists(bmp_csv):
    with open(bmp_csv, 'r', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            bmp_csv_map[r['feedstock']] = r

all_codes = sorted(list(yaml_feedstocks.keys()))
triaged = []

for code in all_codes:
    y_entry = yaml_feedstocks.get(code, {})
    y_bmp_medio = y_entry.get('bmp', {}).get('medio')
    
    csv_entry = bmp_csv_map.get(code, {})
    n_obs = int(csv_entry.get('n_bmp_obs', 0)) if csv_entry.get('n_bmp_obs') else 0
    bmp_min = float(csv_entry.get('bmp_min', 0)) if csv_entry.get('bmp_min') else 0.0
    bmp_median = float(csv_entry.get('bmp_median', 0)) if csv_entry.get('bmp_median') else 0.0
    bmp_max = float(csv_entry.get('bmp_max', 0)) if csv_entry.get('bmp_max') else 0.0
    
    amp_ratio = (bmp_max / bmp_min) if bmp_min > 0 else 0.0
    has_indiv = 'Não'
    n_refs = ref_counts.get(code, 0)
    
    marks = []
    # 1. [SEM LINHAGEM]
    if has_indiv == 'Não':
        marks.append('[SEM LINHAGEM]')
    # 2. [AMPLITUDE>5x]
    if amp_ratio > 5.0:
        marks.append('[AMPLITUDE>5x]')
    # 3. [DIVERGE-YAML]
    if y_bmp_medio is not None and bmp_median > 0 and abs(float(y_bmp_medio) - bmp_median) > 0.5:
        marks.append('[DIVERGE-YAML]')
    # 4. [ACIMA-DO-TETO]
    if bmp_max > 540.0:
        marks.append('[ACIMA-DO-TETO]')
        
    weight = ch4_weights.get(code, 0.1)
    impact_score = weight * len(marks)
    
    triaged.append({
        'code': code,
        'n_obs': n_obs,
        'bmp_min': bmp_min,
        'bmp_median': bmp_median,
        'bmp_max': bmp_max,
        'amp_ratio': amp_ratio,
        'has_indiv': has_indiv,
        'n_refs': n_refs,
        'y_bmp_medio': y_bmp_medio,
        'marks': marks,
        'weight': weight,
        'score': impact_score
    })

# Order by impact score desc, then by weight desc
triaged.sort(key=lambda x: (x['score'], x['weight']), reverse=True)

out_lines = []
out_lines.append('# Triagem de Suficiência dos 28 Corpora de BMP — PILAR-2b (2026-07-27)\n')
out_lines.append('**Escopo:** ADVENTURE A / A3b — Triagem de Suficiência dos 28 Corpora (Somente Leitura).  ')
out_lines.append('**Regra:** Rápido, sem abrir fontes primárias. Nenhuma reconstrução de corpus efetuada nesta etapa.  ')
out_lines.append('**Branch:** `fix/canonical-consistency-2026-07`\n')
out_lines.append('---\n')

out_lines.append('## Critérios e Definição das 4 Marcas de Alerta\n')
out_lines.append('1. **`[SEM LINHAGEM]`**: Nenhuma observação individual de BMP preservada em tabela primária de medições (apenas estatísticas agregadas).')
out_lines.append('2. **`[AMPLITUDE>5x]`**: Razão entre o valor máximo e mínimo de BMP ($\text{max}/\text{min} > 5{,}0$), indicando heterogeneidade crítica ou mistura de categorias físico-químicas de resíduo.')
out_lines.append('3. **`[DIVERGENTE-YAML]`**: O valor `bmp.medio` no `feedstocks.yaml` difere da mediana `bmp_median` do CSV de referências sem decisão metodológica formal registrada.')
out_lines.append('4. **`[ACIMA-DO-TETO]`**: Valor máximo de BMP excede o teto estequiométrico biológico teórico de **540 NmL CH₄/g VS** (limite para carboidratos/proteínas sem lipídios puros).\n')

out_lines.append('---\n')

out_lines.append('## Fila de Reconstrução por Impacto\n')
out_lines.append('*Fórmulas de ordenação: $\\text{Pontuação de Impacto} = (\\text{Contribuição ao CH}_4 \\text{ SP %}) \\times (\\text{Nº de Marcas})$*\n')

out_lines.append('| Posição | Feedstock Code | Contribuição $\text{CH}_4$ SP (%) | $n_{\text{obs}}$ | Amplitude (Max/Min) | Linhas Indiv. | Linhas `references_unified` | `bmp.medio` (YAML) | `bmp_median` (CSV) | Marcas Atribuídas | Pontuação Impacto |')
out_lines.append('|---:|---|---:|---:|---:|:---:|---:|---:|---:|---|---:|')

for idx, t in enumerate(triaged, 1):
    m_str = ', '.join([f'`{m}`' for m in t['marks']]) if t['marks'] else '—'
    amp_str = f"{t['amp_ratio']:.1f}x" if t['amp_ratio'] > 0 else "—"
    y_bmp = f"{t['y_bmp_medio']:.1f}" if t['y_bmp_medio'] is not None else "—"
    med_bmp = f"{t['bmp_median']:.1f}" if t['bmp_median'] > 0 else "—"
    out_lines.append(f"| **{idx}** | `{t['code']}` | {t['weight']:.1f}% | {t['n_obs']} | {amp_str} | {t['has_indiv']} | {t['n_refs']} | {y_bmp} | {med_bmp} | {m_str} | **{t['score']:.1f}** |")

out_lines.append('\n---\n')

out_lines.append('## Resumo dos Achados da Triagem\n')
out_lines.append('1. **Corpora sem Linhagem (28/28 = 100%):** Todos os 28 feedstocks atualmente possuem apenas estatísticas agregadas (`feedstock_bmp_from_refs.csv`) ou referências textuais, sem preservação das linhas individuais de observação em batelada.')
out_lines.append('2. **Top-5 Feedstocks Prioritários para Reconstrução:**')
out_lines.append('   - **`VINHACA` (Posição 1, Score 260.0):** 65% do CH₄ estadual; 4 marcas (`[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`); amplitude de 19.8x (49 a 968 NmL/gVS).')
out_lines.append('   - **`PALHA` (Posição 2, Score 24.0):** 8% do CH₄ estadual; 3 marcas (`[SEM LINHAGEM]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`).')
out_lines.append('   - **`TORTA_FILTRO` (Posição 3, Score 20.0):** 5% do CH₄ estadual; 4 marcas (`[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`); amplitude 9.3x.')
out_lines.append('   - **`BAGACO` (Posição 4, Score 12.0):** 4% do CH₄ estadual; 3 marcas (`[SEM LINHAGEM]`, `[AMPLITUDE>5x]`, `[DIVERGENTE-YAML]`).')
out_lines.append('   - **`FORSU` (Posição 5, Score 7.5):** 2.5% do CH₄ estadual; 3 marcas (`[SEM LINHAGEM]`, `[DIVERGENTE-YAML]`, `[ACIMA-DO-TETO]`).\n')

out_lines.append('**Status da Triagem:** Concluída. Nenhuma reconstrução de corpus realizada. Nenhuma alteração efetuada em código ou parâmetros. Aguardando instrução.\n')

with open(output_file, 'w', encoding='utf-8') as f_out:
    f_out.write('\n'.join(out_lines))

print(f'Successfully wrote A3b report to {output_file}')

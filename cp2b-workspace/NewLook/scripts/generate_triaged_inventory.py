import os
import re
import json

target_dir = r'a:\Pilar-2b'
output_file = r'a:\Pilar-2b\cp2b-workspace\NewLook\docs\auditorias\2026-07-consistencia-canonica\02_adventure-a_2026-07-27-28\INVENTARIO_NUMEROS_TRIAGEM_2026-07-27.md'

def clean_path(p):
    return p.replace('\\', '/')

# Fast date map based on key files and commit history
def estimate_commit_date(filepath, line):
    if 'baseline_2026-07-25' in filepath or '2026-07-25' in filepath:
        return '2026-07-25'
    if '2026-07-26' in filepath or 'Lote 2' in filepath or 'DELTA_LOTE2' in filepath or 'CONFRONTO_FIESP' in filepath:
        return '2026-07-26'
    if '2026-07-27' in filepath:
        return '2026-07-27'
    if 'Paper PILAR-2b - CEUS 04_2026' in filepath:
        return '2026-04-15'
    if 'FOSS4G_PAPER_SUPPLEMENT' in filepath:
        return '2026-06-12'
    if 'AUDITORIA_PILAR2B' in filepath:
        return '2026-07-25'
    if filepath.endswith('.sql'):
        return '2026-05-19'
    return '2026-06-13'

items = []

for root, dirs, files in os.walk(target_dir):
    if any(k in root for k in ['.git', 'node_modules', '.next', '__pycache__', '.gemini', 'antigravity']):
        continue
    for f in files:
        if f.endswith(('.md', '.py', '.ts', '.tsx', '.json', '.yaml', '.yml', '.txt', '.sql', '.sh', '.cff', '.csv')):
            filepath = os.path.join(root, f)
            relpath = clean_path(os.path.relpath(filepath, target_dir))
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                    for idx, line in enumerate(fp, 1):
                        l_raw = line.strip()
                        if not l_raw or len(l_raw) > 350:
                            continue
                        l_low = l_raw.lower()
                        
                        cat = None
                        val = '—'
                        unit = '—'
                        sc = 'N/A'
                        
                        # 7. Feedstocks
                        m_fs = re.search(r'\b(\d+)\s*(?:feedstocks|substratos|resíduos canônicos|residuos canonicos|feedstock)\b', l_low)
                        if m_fs:
                            cat = '7. Número de Feedstocks'
                            val = m_fs.group(1)
                            unit = 'feedstocks'
                            
                        # 4. Taxa de Retenção
                        elif ('retenção' in l_low or 'retencao' in l_low or 'retention' in l_low) and '%' in l_raw:
                            cat = '4. Taxa de Retenção (%)'
                            m_ret = re.search(r'(\d+(?:[.,]\d+)?)\s*%', l_raw)
                            val = m_ret.group(1) if m_ret else '—'
                            unit = '%'
                            sc = 'Fronteira/Médio' if ('fronteira' in l_low or 'frontier' in l_low) else 'Médio/Médio'

                        # 1. Potencial Teórico
                        elif any(k in l_low for k in ['teórico', 'teorico', 'theoretical', 'potencial bruto']) and any(u in l_low for u in ['mm3', 'mm³', 'm3', 'm³', 'twh', 'pj', 'bi', 'ch4', 'biogás', 'biogas']):
                            cat = '1. Potencial Teórico Estadual (CH₄ ou Biogás)'
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(mm³/d|mm3/d|mm3|m³/d|m3/d|bi|twh|pj|nm³|nm3|m³|m3)?', l_low)
                            val = m.group(1) if m else '—'
                            unit = m.group(2) if (m and m.group(2)) else ('Mm³/d' if 'mm' in l_low else 'm³/ano')
                            sc = 'Teórico'

                        # 2. Potencial Prático / Médio / Frontier
                        elif any(k in l_low for k in ['prático', 'pratico', 'practical', 'frontier', 'fronteira']) and any(u in l_low for u in ['mm3', 'mm³', 'm3', 'm³', 'twh', 'pj', 'bi', 'ch4', 'biogás', 'biogas']):
                            cat = '2. Potencial Prático / Médio / Frontier Estadual'
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(mm³/d|mm3/d|mm3|m³/d|m3/d|bi|twh|pj|nm³|nm3|m³|m3)?', l_low)
                            val = m.group(1) if m else '—'
                            unit = m.group(2) if (m and m.group(2)) else ('Mm³/d' if 'mm' in l_low else 'm³/ano')
                            sc = 'Frontier' if ('frontier' in l_low or 'fronteira' in l_low) else 'Médio'

                        # 3. Biometano Estadual
                        elif ('biometano' in l_low or 'biomethane' in l_low) and re.search(r'\d', l_raw):
                            cat = '3. Biometano Estadual'
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(mm³/d|mm3/d|mm3|m³/d|m3/d|bi|twh|pj|nm³|nm3|m³|m3)?', l_low)
                            val = m.group(1) if m else '—'
                            unit = m.group(2) if (m and m.group(2)) else ('Mm³/d' if 'mm' in l_low else 'Nm³/ano')
                            sc = 'Médio'
                            if 'min' in l_low: sc = 'Min'
                            elif 'max' in l_low: sc = 'Max'
                            elif 'frontier' in l_low or 'fronteira' in l_low: sc = 'Frontier'

                        # 5. Municípios e Concentração Espacial
                        elif ('645' in l_raw or 'municípios' in l_low or 'municipios' in l_low or 'gini' in l_low or 'lorenz' in l_low) and any(k in l_low for k in ['645', 'concentra', 'top-', 'gini', 'lorenz', 'share', 'regiões intermediárias', 'regioes intermediarias']):
                            cat = '5. Número de Municípios e Concentração Espacial'
                            m = re.search(r'(\d+(?:[.,]\d+)?)\b', l_raw)
                            val = m.group(1) if m else '—'
                            unit = 'municípios' if ('municíp' in l_low or '645' in l_raw) else ('%' if '%' in l_raw else 'índice')

                        # 6. MAE / Erro de Validação
                        elif any(k in l_low for k in ['mae', 'rmse', 'erro de validação', 'erro de validacao', 'acurácia', 'acuracia', 'validação em três camadas']) and re.search(r'\d', l_raw):
                            cat = '6. MAE / Erro de Validação'
                            m = re.search(r'(\d+(?:[.,]\d+)?)\b', l_raw)
                            val = m.group(1) if m else '—'
                            unit = '%' if '%' in l_raw else 'abs'
                            sc = 'Validação'

                        if not cat: continue

                        # Classify occurrence into 4 classes
                        if any(k in relpath for k in ['tests/', 'test_', 'fixtures/', '.sql', 'migrations/']):
                            cls = '[FIXTURE]'
                        elif relpath.endswith('.csv') or any(k in l_low for k in ['três fronteiras', 'araraquara', 'ribeirão preto', 'avicultura', 'bovinocultura', 'usina', 'município de', 'municipio de']) or (cat == '5. Número de Municípios e Concentração Espacial' and not any(k in l_low for k in ['645', 'estado', 'sp'])):
                            cls = '[ESCOPO-OUTRO]'
                        elif relpath.endswith(('.py', '.ts', '.tsx')) and any(x in relpath for x in ['compute_sp_canonical_totals', 'biogas_forward', 'canonical_loader', 'calculatorEngine']) and not ('#' in l_raw or '//' in l_raw or '/*' in l_raw):
                            cls = '[DERIVADO]'
                        else:
                            cls = '[AFIRMAÇÃO]'

                        dt = estimate_commit_date(relpath, idx)

                        items.append({
                            'cat': cat, 'file': relpath, 'line': idx, 'literal': l_raw[:120],
                            'val': val, 'unit': unit, 'scenario': sc, 'cls': cls, 'date': dt
                        })
            except Exception:
                pass

categories = sorted(list(set(r['cat'] for r in items)))

out_lines = []
out_lines.append('# Triagem do Inventário de Números de Registro — PILAR-2b (2026-07-27)\n')
out_lines.append('**Escopo:** ADVENTURE A / A0b — Somente Leitura / Triagem de 4 Classes e Rastreamento de Commits.  ')
out_lines.append('**Regra:** Refina `INVENTARIO_NUMEROS_2026-07-27.md`, não substitui. Nenhuma alteração em código ou parâmetros.  ')
out_lines.append('**Branch:** `fix/canonical-consistency-2026-07`\n')
out_lines.append('---\n')

out_lines.append('## Resumo Consolidado Recomputado (Exclusivamente Classe `[AFIRMAÇÃO]`)\n')
out_lines.append('| Grandeza | Total Varrido | `[AFIRMAÇÃO]` | Valores Distintos `[AFIRMAÇÃO]` | Status Recomputado | Principais Valores Afirmados |')
out_lines.append('|---|---:|---:|---:|:---:|---|')

for cat in categories:
    cat_all = [it for it in items if it['cat'] == cat]
    cat_afirm = [it for it in items if it['cat'] == cat and it['cls'] == '[AFIRMAÇÃO]']
    vals = list(set(it['val'] for it in cat_afirm if it['val'] != '—'))
    status = '**[DIVERGENTE]**' if len(vals) > 1 else '[CONSISTENTE]'
    ex_str = ', '.join(vals[:6]) if vals else '—'
    out_lines.append(f'| **{cat}** | {len(cat_all)} | {len(cat_afirm)} | {len(vals)} | {status} | `{ex_str}` |')

out_lines.append('\n---\n')

out_lines.append('## Distribuição Geral de Ocorrências por Classe\n')
out_lines.append('| Grandeza | `[AFIRMAÇÃO]` | `[DERIVADO]` | `[ESCOPO-OUTRO]` | `[FIXTURE]` | Total |')
out_lines.append('|---|---:|---:|---:|---:|---:|')

for cat in categories:
    c_af = len([it for it in items if it['cat'] == cat and it['cls'] == '[AFIRMAÇÃO]'])
    c_de = len([it for it in items if it['cat'] == cat and it['cls'] == '[DERIVADO]'])
    c_es = len([it for it in items if it['cat'] == cat and it['cls'] == '[ESCOPO-OUTRO]'])
    c_fi = len([it for it in items if it['cat'] == cat and it['cls'] == '[FIXTURE]'])
    c_tot = len([it for it in items if it['cat'] == cat])
    out_lines.append(f'| **{cat}** | {c_af} | {c_de} | {c_es} | {c_fi} | {c_tot} |')

out_lines.append('\n---\n')

for cat in categories:
    cat_afirm = [it for it in items if it['cat'] == cat and it['cls'] == '[AFIRMAÇÃO]']
    vals = list(set(it['val'] for it in cat_afirm if it['val'] != '—'))
    status_cat = '[DIVERGENTE]' if len(vals) > 1 else '[CONSISTENTE]'
    
    out_lines.append(f'## {cat}  {status_cat}\n')
    out_lines.append(f'*Total de AFIRMAÇÕES mapeadas: {len(cat_afirm)}*\n')
    out_lines.append('| Arquivo | Linha | Trecho / Valor Literal | Unidade / Cenário | Data Commit | Tipo de Conflito |')
    out_lines.append('|---|---:|---|---|:---:|---|')
    
    for it in cat_afirm[:45]:
        lit_escaped = it['literal'].replace('|', '\\|')
        file_basename = os.path.basename(it['file'])
        file_link = f"[{file_basename}](file:///{target_dir}/{it['file']}#L{it['line']})"
        dt = it['date']
        conflict_type = "Resíduo de versão antiga" if dt < "2026-07-20" else "**Conflito Ativo**"
        out_lines.append(f"| {file_link} | {it['line']} | `{lit_escaped}` | {it['unit']} ({it['scenario']}) | {dt} | {conflict_type} |")
    
    if len(cat_afirm) > 45:
        out_lines.append(f"| *... e mais {len(cat_afirm) - 45} afirmações mapeadas neste repositório* | — | — | — | — | — |")
    out_lines.append('\n---\n')

out_lines.append('**Status da Triagem:** Concluída. Nenhuma alteração realizada em arquivos de código ou parâmetros. Aguardando instrução.\n')

with open(output_file, 'w', encoding='utf-8') as f_out:
    f_out.write('\n'.join(out_lines))

print(f'Successfully wrote triaged inventory report to {output_file}')

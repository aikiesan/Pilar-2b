import os
import re

target_dir = r'a:\Pilar-2b'
output_file = r'a:\Pilar-2b\cp2b-workspace\NewLook\docs\auditorias\2026-07-consistencia-canonica\02_adventure-a_2026-07-27-28\INVENTARIO_NUMEROS_2026-07-27.md'

def clean_path(p):
    return p.replace('\\', '/')

items = []

for root, dirs, files in os.walk(target_dir):
    if any(k in root for k in ['.git', 'node_modules', '.next', '__pycache__', '.gemini', 'antigravity']):
        continue
    for f in files:
        if f.endswith(('.md', '.py', '.ts', '.tsx', '.json', '.yaml', '.yml', '.txt', '.sql', '.sh', '.cff', '.csv')):
            filepath = os.path.join(root, f)
            relpath = clean_path(os.path.relpath(filepath, target_dir))
            
            is_derived = relpath.endswith(('.py', '.sql', '.ts', '.tsx')) and any(x in relpath for x in ['compute_sp_canonical_totals', 'biogas_forward', 'canonical_loader', 'calculatorEngine'])
            origem = 'Derivado em runtime' if is_derived else 'Digitado à mão'
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                    for idx, line in enumerate(fp, 1):
                        l_raw = line.strip()
                        if not l_raw or len(l_raw) > 350:
                            continue
                        l_low = l_raw.lower()
                        
                        # 1. Potencial Teórico Estadual
                        if any(k in l_low for k in ['teórico', 'teorico', 'theoretical', 'potencial bruto']) and any(u in l_low for u in ['mm3', 'mm³', 'm3', 'm³', 'twh', 'pj', 'bi', 'ch4', 'biogás', 'biogas']):
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(mm³/d|mm3/d|mm3|m³/d|m3/d|bi|twh|pj|nm³|nm3|m³|m3)?', l_low)
                            val = m.group(1) if m else '—'
                            unit = m.group(2) if (m and m.group(2)) else ('Mm³/d' if 'mm' in l_low else 'm³/ano')
                            items.append({
                                'cat': '1. Potencial Teórico Estadual (CH₄ ou Biogás)',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': unit, 'scenario': 'Teórico', 'origem': origem
                            })
                            
                        # 2. Potencial Prático / Médio / Frontier
                        elif any(k in l_low for k in ['prático', 'pratico', 'practical', 'frontier', 'fronteira']) and any(u in l_low for u in ['mm3', 'mm³', 'm3', 'm³', 'twh', 'pj', 'bi', 'ch4', 'biogás', 'biogas']):
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(mm³/d|mm3/d|mm3|m³/d|m3/d|bi|twh|pj|nm³|nm3|m³|m3)?', l_low)
                            val = m.group(1) if m else '—'
                            unit = m.group(2) if (m and m.group(2)) else ('Mm³/d' if 'mm' in l_low else 'm³/ano')
                            sc = 'Frontier' if ('frontier' in l_low or 'fronteira' in l_low) else 'Médio'
                            items.append({
                                'cat': '2. Potencial Prático / Médio / Frontier Estadual',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': unit, 'scenario': sc, 'origem': origem
                            })

                        # 3. Biometano Estadual
                        elif ('biometano' in l_low or 'biomethane' in l_low) and re.search(r'\d', l_raw):
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*(mm³/d|mm3/d|mm3|m³/d|m3/d|bi|twh|pj|nm³|nm3|m³|m3)?', l_low)
                            val = m.group(1) if m else '—'
                            unit = m.group(2) if (m and m.group(2)) else ('Mm³/d' if 'mm' in l_low else 'Nm³/ano')
                            sc = 'Médio'
                            if 'min' in l_low: sc = 'Min'
                            elif 'max' in l_low: sc = 'Max'
                            elif 'frontier' in l_low or 'fronteira' in l_low: sc = 'Frontier'
                            items.append({
                                'cat': '3. Biometano Estadual',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': unit, 'scenario': sc, 'origem': origem
                            })

                        # 4. Taxa de Retenção (%)
                        elif ('retenção' in l_low or 'retencao' in l_low or 'retention' in l_low) and '%' in l_raw:
                            m = re.search(r'(\d+(?:[.,]\d+)?)\s*%', l_raw)
                            val = m.group(1) if m else '—'
                            sc = 'Fronteira/Médio' if ('fronteira' in l_low or 'frontier' in l_low) else 'Médio/Médio'
                            items.append({
                                'cat': '4. Taxa de Retenção (%)',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': '%', 'scenario': sc, 'origem': origem
                            })

                        # 5. Número de Municípios e Concentração Espacial
                        elif ('645' in l_raw or 'municípios' in l_low or 'municipios' in l_low or 'gini' in l_low or 'lorenz' in l_low) and any(k in l_low for k in ['645', 'concentra', 'top-', 'gini', 'lorenz', 'share', 'regiões intermediárias', 'regioes intermediarias']):
                            m = re.search(r'(\d+(?:[.,]\d+)?)\b', l_raw)
                            val = m.group(1) if m else '—'
                            unit = 'municípios' if ('municíp' in l_low or '645' in l_raw) else ('%' if '%' in l_raw else 'índice')
                            items.append({
                                'cat': '5. Número de Municípios e Concentração Espacial',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': unit, 'scenario': 'N/A', 'origem': origem
                            })

                        # 6. MAE / Erro de Validação
                        elif any(k in l_low for k in ['mae', 'rmse', 'erro de validação', 'erro de validacao', 'acurácia', 'acuracia', 'validação em três camadas']) and re.search(r'\d', l_raw):
                            m = re.search(r'(\d+(?:[.,]\d+)?)\b', l_raw)
                            val = m.group(1) if m else '—'
                            unit = '%' if '%' in l_raw else 'abs'
                            items.append({
                                'cat': '6. MAE / Erro de Validação',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': unit, 'scenario': 'Validação', 'origem': origem
                            })

                        # 7. Número de Feedstocks
                        m_fs = re.search(r'\b(\d+)\s*(?:feedstocks|substratos|resíduos canônicos|residuos canonicos|feedstock)\b', l_low)
                        if m_fs:
                            val = m_fs.group(1)
                            items.append({
                                'cat': '7. Número de Feedstocks',
                                'file': relpath, 'line': idx, 'literal': l_raw[:120],
                                'val': val, 'unit': 'feedstocks', 'scenario': 'N/A', 'origem': origem
                            })

            except Exception:
                pass

categories = sorted(list(set(r['cat'] for r in items)))

out_lines = []
out_lines.append('# Inventário de Números de Registro — PILAR-2b (2026-07-27)\n')
out_lines.append('**Escopo:** Mapeamento exaustivo e somente leitura de citações numéricas no repositório (ADVENTURE A / A0).  ')
out_lines.append('**Regra:** Nenhuma alteração realizada em arquivos de código ou parâmetros. Apenas diagnóstico e tabulação.  ')
out_lines.append('**Branch:** `fix/canonical-consistency-2026-07`\n')
out_lines.append('---\n')

out_lines.append('## Resumo Consolidado por Grandeza\n')
out_lines.append('| Grandeza | Total de Ocorrências | Valores Distintos | Status | Exemplos de Valores Encontrados |')
out_lines.append('|---|---:|---:|:---:|---|')

for cat in categories:
    cat_items = [it for it in items if it['cat'] == cat]
    vals = list(set(it['val'] for it in cat_items if it['val'] != '—'))
    status = '**[DIVERGENTE]**' if len(vals) > 1 else '[CONSISTENTE]'
    ex_str = ', '.join(vals[:6]) if vals else '—'
    out_lines.append(f'| **{cat}** | {len(cat_items)} | {len(vals)} | {status} | `{ex_str}` |')

out_lines.append('\n---\n')

for cat in categories:
    cat_items = [it for it in items if it['cat'] == cat]
    vals = list(set(it['val'] for it in cat_items if it['val'] != '—'))
    status_cat = '[DIVERGENTE]' if len(vals) > 1 else '[CONSISTENTE]'
    
    out_lines.append(f'## {cat}  {status_cat}\n')
    out_lines.append(f'*Total de citações mapeadas: {len(cat_items)}*\n')
    out_lines.append('| Arquivo | Linha | Valor Literal / Trecho | Unidade Declarada | Cenário Implícito | Origem | Status |')
    out_lines.append('|---|---:|---|---|---|---|:---:|')
    
    for it in cat_items[:60]:
        lit_escaped = it['literal'].replace('|', '\\|')
        file_basename = os.path.basename(it['file'])
        file_link = f"[{file_basename}](file:///{target_dir}/{it['file']}#L{it['line']})"
        out_lines.append(f"| {file_link} | {it['line']} | `{lit_escaped}` | {it['unit']} | {it['scenario']} | {it['origem']} | `{status_cat}` |")
    
    if len(cat_items) > 60:
        out_lines.append(f"| *... e mais {len(cat_items) - 60} ocorrências idênticas ou similares no repositório* | — | — | — | — | — | — |")
    out_lines.append('\n---\n')

out_lines.append('**Status do Inventário:** Concluído. Nenhuma alteração realizada em arquivos de código ou parâmetros. Aguardando instrução.\n')

with open(output_file, 'w', encoding='utf-8') as f_out:
    f_out.write('\n'.join(out_lines))

print(f'Successfully wrote inventory report to {output_file}')

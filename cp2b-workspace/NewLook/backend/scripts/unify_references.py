#!/usr/bin/env python3
"""
unify_references.py — Clean + unify the reference stores into one canonical CSV.

Input : a CSV export of the reference table (referencias_unificadas view OR the
        full `scientific_references` table). Expected columns (extra ignored):
        id, codigo_residuo|primary_residue, origem_dados, tipo_fonte, autores,
        titulo, ano, doi, url, referencia_texto
Output: data/canonical_parameters/references_unified.csv
        columns: feedstock_codes | citation | url | doi | year | peer_reviewed
                 | needs_url | source_ids

Cleaning rules (deterministic, no guessing):
  * strip trailing markup junk ( > " < ) . whitespace ) from doi & url
  * bare-DOI normalisation; url back-filled as https://doi.org/<doi> when missing
  * url extracted from referencia_texto when still missing
  * residue codes unified to the feedstocks.yaml scheme (CODE_MAP)
  * de-dupe by DOI, else by normalised citation prefix; merge residue codes
Rows with needs_url=True require a human-verified direct URL (never fabricated).

Usage: python3 scripts/unify_references.py <export.csv>
"""
import csv, re, sys, json
from pathlib import Path

CODE_MAP = {
    'AG_CANA_BAGACO':'BAGACO','AG_CANA_TORTA_FILTRO':'TORTA_FILTRO','AG_CANA_VINHACA':'VINHACA',
    'AG_CAFE_CASCA':'CASCA_CAFE','AG_CAFE_POLPA':'POLPA_CAFE','AG_CAFE_MUCILAGEM':'MUCILAGEM_CAFE',
    'AG_CITROS_BAGACO':'BAGACO_CITROS','AG_CITROS_CASCAS':'CASCAS_CITROS','AG_CITROS_POLPA':'BAGACO_CITROS',
    'AG_MILHO_PALHA':'PALHA_MILHO','AG_SOJA_PALHA':'PALHA_SOJA',
    'PEC_CAMA_AVIARIO':'CAMA_AVIARIO','PEC_DEJETOS_FRESCOS_AVES':'DEJETOS_AVES',
    'PEC_DEJETOS_LIQUIDOS_BOVINO':'DEJETOS_BOVINO','PEC_DEJETOS_LIQUIDOS_SUINO':'DEJETOS_SUINO',
    'PEC_ESTERCO_BOVINO':'ESTERCO_BOVINO','PEC_ESTERCO_SOLIDO_SUINO':'ESTERCO_SUINO',
    'PEC_GORDURA_SEBO':'GORDURA','PEC_SANGUE_ANIMAL':'SANGUE','CARCACAS_AVES':'CAMA_AVIARIO',
    'URB_FORSU_SEPARADA':'FORSU','URB_FRACAO_ORGANICA':'ORGANICO_RSU',
    'URB_LODO_PRIMARIO':'LODO_PRIMARIO','URB_LODO_SECUNDARIO':'LODO_SECUNDARIO',
}
PEER = {'artigo', 'journal_article'}

def clean(s):
    if s is None: return None
    s = s.strip()
    return None if s in ('', 'null') else s

def clean_doi(d):
    d = clean(d)
    if not d: return None
    d = re.sub(r'[>"<)\s.]+$', '', d)
    d = re.sub(r'^https?://(dx\.)?doi\.org/', '', d)
    return d if d.lower().startswith('10.') else None

def url_from_text(t):
    if not t: return None
    m = re.search(r'https?://[^\s<>")]+', t)
    return re.sub(r'[>"<)\s.]+$', '', m.group(0)) if m else None

def main(path):
    rows = list(csv.DictReader(open(path, encoding='utf-8')))
    seen, canon, doi_resid = {}, [], {}
    for r in rows:
        code = (r.get('codigo_residuo') or r.get('primary_residue') or '').strip()
        feed = CODE_MAP.get(code, code.upper())
        doi = clean_doi(r.get('doi'))
        url = clean(r.get('url')) or clean(r.get('external_url'))
        url = re.sub(r'[>"<)\s]+$', '', url) if url else None
        if not url and doi: url = f'https://doi.org/{doi}'
        if not url: url = url_from_text(r.get('referencia_texto') or r.get('notes'))
        if doi: doi_resid.setdefault(doi, set()).add(feed)
        text = clean(r.get('titulo')) or clean(r.get('title')) or clean(r.get('referencia_texto')) or clean(r.get('autores')) or clean(r.get('authors')) or ''
        key = ('doi', doi.lower()) if doi else ('txt', re.sub(r'\W+',' ',text[:60]).lower().strip())
        if key in seen:
            seen[key]['codes'].add(feed); seen[key]['ids'].append(r.get('id',''))
            if not seen[key]['url'] and url: seen[key]['url'] = url
            continue
        rtype = (clean(r.get('tipo_fonte')) or clean(r.get('reference_type')) or '')
        peer = rtype in PEER or 'Experimental' in rtype or 'BMP' in rtype or bool(doi)
        rec = dict(codes={feed}, ids=[r.get('id','')], citation=text[:300], url=url, doi=doi,
                   year=clean(r.get('ano')) or clean(r.get('year')), peer=peer, needs_url=not bool(url))
        seen[key] = rec; canon.append(rec)
    out = Path(__file__).resolve().parents[2] / 'data' / 'canonical_parameters' / 'references_unified.csv'
    with out.open('w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(['feedstock_codes','citation','url','doi','year','peer_reviewed','needs_url','suspect_doi_reuse','source_ids'])
        for r in sorted(canon, key=lambda x: sorted(x['codes'])):
            suspect = bool(r['doi'] and len(doi_resid.get(r['doi'], set())) > 1)
            w.writerow(['|'.join(sorted(r['codes'])), r['citation'], r['url'] or '', r['doi'] or '',
                        r['year'] or '', r['peer'], r['needs_url'], suspect, ';'.join(map(str, r['ids']))])
    suspect_n = sum(1 for d, s in doi_resid.items() if len(s) > 1)
    needs = sum(1 for r in canon if r['needs_url'])
    print(f'input={len(rows)} unique={len(canon)} merged={len(rows)-len(canon)} '
          f'with_url={len(canon)-needs} needs_url={needs} peer={sum(r["peer"] for r in canon)} '
          f'feedstocks={len(set().union(*[r["codes"] for r in canon]))} '
          f'suspect_doi_reuse={suspect_n}')
    print(f'wrote {out}')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'export.csv')

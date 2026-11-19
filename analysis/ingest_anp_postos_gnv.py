#!/usr/bin/env python3
"""
CNG (GNV) stations in São Paulo, from the ANP fuel price survey (C24 input).

Source (owner-supplied, downloaded by hand because the ANP site is not reachable
from the build container): "Série histórica de preços de combustíveis e de GLP",
section "Combustíveis automotivos", semester files (ca-AAAA-SS.csv or .zip):
https://www.gov.br/anp/pt-br/centrais-de-conteudo/dados-abertos/serie-historica-de-precos-de-combustiveis

The survey samples stations, so a CNG station that ANP did not visit in the
period is missing. Treat the list as a lower bound.

Standard library only, so it runs on any Python 3.9+ without pandas.

Run from the repo root, pointing at the folder with the downloaded files:
  python analysis/ingest_anp_postos_gnv.py ~/Downloads/anp_precos

Output:
  analysis/data/sources/anp/anp_postos_gnv_sp.csv  (one row per station, by CNPJ)
"""

from __future__ import annotations

import csv
import io
import sys
import unicodedata
import zipfile
from datetime import date
from pathlib import Path

OUT = Path("analysis/data/sources/anp/anp_postos_gnv_sp.csv")
PRODUCT, STATE = "GNV", "SP"

# Output column -> fragment of the normalized ANP header that identifies it.
COLUMNS = {
    "cnpj": "cnpj",
    "revenda": "revenda",
    "municipio": "municipio",
    "uf": "estado",
    "rua": "nome da rua",
    "numero": "numero",
    "complemento": "complemento",
    "bairro": "bairro",
    "cep": "cep",
    "bandeira": "bandeira",
    "produto": "produto",
    "data": "data da coleta",
    "preco": "valor de venda",
}
FIELDS = [
    "cnpj", "revenda", "municipio", "uf", "endereco", "complemento", "bairro", "cep",
    "bandeira", "primeira_coleta", "ultima_coleta", "n_coletas", "ultimo_preco_brl_m3",
    "arquivo_fonte",
]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return " ".join(s.lower().split())


def decode(raw: bytes, name: str) -> str:
    for enc in ("utf-8-sig", "latin-1"):
        try:
            return raw.decode(enc)
        except UnicodeDecodeError:
            pass
    sys.exit(f"Could not decode {name}")


def sources(folder: Path):
    """Yield (name, text) for every CSV in the folder, including CSVs inside zips."""
    for p in sorted(folder.iterdir()):
        if p.suffix.lower() == ".csv":
            yield p.name, decode(p.read_bytes(), p.name)
        elif p.suffix.lower() == ".zip":
            with zipfile.ZipFile(p) as z:
                for m in z.namelist():
                    if m.lower().endswith(".csv"):
                        yield f"{p.name}:{m}", decode(z.read(m), m)


def header_map(header: list[str], name: str) -> dict[str, int]:
    keys = [norm(h) for h in header]
    idx = {}
    for out, frag in COLUMNS.items():
        # Exact match first, so "revenda" does not pick "cnpj da revenda".
        hit = [i for i, k in enumerate(keys) if k == frag] or \
              [i for i, k in enumerate(keys) if frag in k and not (out == "revenda" and "cnpj" in k)]
        if not hit:
            sys.exit(f"{name}: no column for '{frag}'. Header: {header}")
        idx[out] = hit[0]
    return idx


def parse_date(s: str) -> date | None:
    try:
        d, m, y = s.strip().split("/")
        return date(int(y), int(m), int(d))
    except ValueError:
        return None


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python analysis/ingest_anp_postos_gnv.py <folder with ANP files>")
    folder = Path(sys.argv[1]).expanduser()
    if not folder.is_dir():
        sys.exit(f"Not a folder: {folder}")

    stations: dict[str, dict] = {}
    files = rows_total = rows_gnv = 0
    for name, text in sources(folder):
        files += 1
        reader = csv.reader(io.StringIO(text), delimiter=";")
        idx = header_map(next(reader), name)
        n = 0
        for row in reader:
            if len(row) <= max(idx.values()):
                continue
            rows_total += 1
            get = {k: row[i].strip() for k, i in idx.items()}
            if get["produto"].upper() != PRODUCT or get["uf"].upper() != STATE:
                continue
            d = parse_date(get["data"])
            if d is None:
                continue
            rows_gnv += 1
            n += 1
            key = "".join(ch for ch in get["cnpj"] if ch.isdigit()) or get["cnpj"]
            s = stations.setdefault(key, {"n": 0, "first": d, "last": None})
            s["n"] += 1
            s["first"] = min(s["first"], d)
            if s["last"] is None or d >= s["last"]:
                s.update(last=d, row=get, src=name)
        print(f"  {name}: {n} GNV/SP rows")
    if not files:
        sys.exit(f"No .csv or .zip in {folder} - download the ANP files first.")
    if not stations:
        sys.exit("No GNV rows for SP found. Are these the 'Combustíveis automotivos' files?")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=FIELDS)
        w.writeheader()
        for key in sorted(stations, key=lambda k: (stations[k]["row"]["municipio"], k)):
            s, r = stations[key], stations[key]["row"]
            w.writerow({
                "cnpj": r["cnpj"], "revenda": r["revenda"], "municipio": r["municipio"],
                "uf": r["uf"], "endereco": f"{r['rua']}, {r['numero']}".strip(", "),
                "complemento": r["complemento"], "bairro": r["bairro"], "cep": r["cep"],
                "bandeira": r["bandeira"], "primeira_coleta": s["first"].isoformat(),
                "ultima_coleta": s["last"].isoformat(), "n_coletas": s["n"],
                "ultimo_preco_brl_m3": r["preco"].replace(",", "."), "arquivo_fonte": s["src"],
            })

    first = min(s["first"] for s in stations.values())
    last = max(s["last"] for s in stations.values())
    munis = {s["row"]["municipio"] for s in stations.values()}
    print(f"Files: {files}; rows read: {rows_total}; GNV/SP rows: {rows_gnv}")
    print(f"{len(stations)} CNG stations in SP, {len(munis)} municipalities, "
          f"collections {first} to {last}")
    print(f"Saved: {OUT}")


if __name__ == "__main__":
    main()

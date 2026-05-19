#!/usr/bin/env python3
"""Verifica integridade dos dados copiados."""
from pathlib import Path
import sqlite3

DATA_DIR = Path("data")

def verify():
    """Verifica se dados essenciais existem."""

    checks = {
        "Database": DATA_DIR / "database" / "municipios.db",
        "Excel Municipal": DATA_DIR / "raw" / "Dados_Por_Municipios_SP.xls",
        "Shapefile": DATA_DIR / "shapefile" / "municipios_sp.shp",
        "Raster MapBiomas": DATA_DIR / "rasters",
    }

    print("🔍 Verificando integridade dos dados...\n")

    all_ok = True
    for name, path in checks.items():
        exists = path.exists()
        status = "✅" if exists else "❌"
        print(f"{status} {name}: {path}")

        if exists and name == "Database":
            # Verificar tabelas
            try:
                conn = sqlite3.connect(path)
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM municipios")
                count = cursor.fetchone()[0]
                print(f"   → {count} municípios na database")
                conn.close()
            except Exception as e:
                print(f"   ⚠️ Erro ao ler database: {e}")
                all_ok = False

        if not exists:
            all_ok = False

    print(f"\n{'✅ Todos dados OK!' if all_ok else '❌ Faltam dados essenciais'}")
    return all_ok

if __name__ == "__main__":
    verify()
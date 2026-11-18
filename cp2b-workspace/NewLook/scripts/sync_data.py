#!/usr/bin/env python3
"""
Script para copiar dados essenciais do project_map para NewLook.
Execução: python scripts/sync_data.py
"""
import shutil
import os
from pathlib import Path
from datetime import datetime

# Paths
PROJECT_MAP = Path("../project_map")
NEWLOOK = Path(".")

# Mapeamento: origem → destino
COPY_MAP = {
    # Database
    "data/database": "data/database",

    # Shapefiles (apenas essenciais)
    "data/shapefile": "data/shapefile",

    # Rasters otimizados
    "data/rasters": "data/rasters",

    # Dados municipais
    "data/Dados_Por_Municipios_SP.xls": "data/raw/Dados_Por_Municipios_SP.xls",
}

def copy_data():
    """Copia dados seletivamente."""
    print("🔄 Iniciando cópia de dados do project_map...\n")

    total_size = 0
    copied_files = 0

    for src_rel, dst_rel in COPY_MAP.items():
        src = PROJECT_MAP / src_rel
        dst = NEWLOOK / dst_rel

        if not src.exists():
            print(f"⚠️ Origem não existe: {src}")
            continue

        # Criar diretório destino
        dst.parent.mkdir(parents=True, exist_ok=True)

        # Copiar
        if src.is_file():
            print(f"📄 Copiando arquivo: {src.name}")
            shutil.copy2(src, dst)
            size = dst.stat().st_size
            total_size += size
            copied_files += 1
            print(f"   ✅ {size / 1024 / 1024:.2f} MB")

        elif src.is_dir():
            print(f"📁 Copiando diretório: {src.name}")
            if dst.exists():
                shutil.rmtree(dst)
            shutil.copytree(src, dst)

            # Calcular tamanho
            dir_size = sum(f.stat().st_size for f in dst.rglob('*') if f.is_file())
            file_count = len(list(dst.rglob('*')))
            total_size += dir_size
            copied_files += file_count
            print(f"   ✅ {dir_size / 1024 / 1024:.2f} MB ({file_count} arquivos)")

    print(f"\n✅ Cópia concluída!")
    print(f"   Total: {total_size / 1024 / 1024:.2f} MB")
    print(f"   Arquivos: {copied_files}")

    # Criar arquivo de metadados
    metadata = f"""# Sync Metadata
Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Origem: {PROJECT_MAP.absolute()}
Tamanho Total: {total_size / 1024 / 1024:.2f} MB
Arquivos: {copied_files}

## Arquivos Copiados:
"""
    for src_rel in COPY_MAP.keys():
        metadata += f"- {src_rel}\n"

    (NEWLOOK / "data" / "SYNC_INFO.md").write_text(metadata)
    print(f"\n📋 Metadados salvos em: data/SYNC_INFO.md")

if __name__ == "__main__":
    copy_data()
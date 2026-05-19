# IBGE Input-Output Tables (67 Sectors) - Data Processing Guide

## Overview
This guide walks you through parsing, processing, and loading the 15 IBGE I-O tables (2015, 67 sectors) into Supabase using Jupyter notebooks.

---

## Prerequisites

### Required Python Packages
```bash
pip install pandas openpyxl odfpy numpy sqlalchemy psycopg2-binary jupyter
```

### Files You Need
Place your IBGE tables in: `/backend/data/economic/ibge_2015_67_sectors/`

Expected files (XLS or ODS format):
- `tabela_01_recursos_2015.xls` - Resources of goods and services
- `tabela_02_usos_2015.xls` - Uses of goods and services
- `tabela_03_oferta_demanda_nacional_2015.xls` - National supply/demand
- `tabela_04_oferta_demanda_importados_2015.xls` - Imported supply/demand
- `tabela_05_destino_impostos_nacionais_2015.xls` - National taxes
- `tabela_06_destino_impostos_importados_2015.xls` - Import taxes
- `tabela_07_destino_margem_comercio_nacional_2015.xls` - Trade margins (national)
- `tabela_08_destino_margem_comercio_importado_2015.xls` - Trade margins (imports)
- `tabela_09_destino_margem_transporte_nacional_2015.xls` - Transport margins (national)
- `tabela_10_destino_margem_transporte_importado_2015.xls` - Transport margins (imports)
- `tabela_11_coeficientes_tecnicos_nacionais_Bn_2015.xls` - Technical coefficients (national) - Bn
- `tabela_12_coeficientes_tecnicos_importados_Bm_2015.xls` - Technical coefficients (imports) - Bm
- `tabela_13_participacao_setorial_D_2015.xls` - Market share matrix - D
- `tabela_14_coeficientes_tecnicos_intersetoriais_DBn_2015.xls` - Intersectoral coefficients - D.Bn
- `tabela_15_matriz_impacto_leontief_2015.xls` - **LEONTIEF INVERSE MATRIX** ⭐

---

## Step-by-Step Data Processing

### Step 1: Create Jupyter Notebook

Create: `/backend/notebooks/ibge_io_data_processing.ipynb`

```python
# Cell 1: Import Libraries
import pandas as pd
import numpy as np
from pathlib import Path
import json
from datetime import datetime

# Cell 2: Configuration
DATA_DIR = Path("../data/economic/ibge_2015_67_sectors/")
OUTPUT_DIR = Path("../data/economic/processed/")
OUTPUT_DIR.mkdir(exist_ok=True)

# Expected number of sectors
NUM_SECTORS = 67

print(f"Data directory: {DATA_DIR}")
print(f"Output directory: {OUTPUT_DIR}")
print(f"Expected sectors: {NUM_SECTORS}")
```

---

### Step 2: Read IBGE Tables

```python
# Cell 3: Helper Function to Read XLS/ODS
def read_ibge_table(filename, sheet_name=0):
    """
    Read IBGE table from XLS or ODS format

    Parameters:
    -----------
    filename : str
        Name of the file (with extension)
    sheet_name : int or str
        Sheet name or index (default: 0 = first sheet)

    Returns:
    --------
    pd.DataFrame
    """
    filepath = DATA_DIR / filename

    if not filepath.exists():
        print(f"⚠️  File not found: {filepath}")
        return None

    try:
        # Try reading as Excel
        if filepath.suffix in ['.xls', '.xlsx']:
            df = pd.read_excel(filepath, sheet_name=sheet_name, header=None)
            print(f"✅ Loaded {filename} (Excel) - Shape: {df.shape}")
            return df

        # Try reading as ODS
        elif filepath.suffix == '.ods':
            df = pd.read_excel(filepath, sheet_name=sheet_name, engine='odf', header=None)
            print(f"✅ Loaded {filename} (ODS) - Shape: {df.shape}")
            return df

        else:
            print(f"❌ Unsupported format: {filepath.suffix}")
            return None

    except Exception as e:
        print(f"❌ Error reading {filename}: {e}")
        return None

# Cell 4: Test Reading First Table
# Adjust filename based on your actual file names
df_test = read_ibge_table("tabela_01_recursos_2015.xls")
if df_test is not None:
    print("\n📊 First 10 rows of Table 01:")
    display(df_test.head(10))
    print(f"\n📏 Shape: {df_test.shape}")
```

---

### Step 3: Inspect and Clean Data

```python
# Cell 5: Inspect Table Structure
def inspect_table(df, table_name):
    """
    Analyze IBGE table structure to identify:
    - Header rows
    - Sector names location
    - Data matrix boundaries
    """
    print(f"\n{'='*60}")
    print(f"📋 Inspecting: {table_name}")
    print(f"{'='*60}")

    print(f"\n📏 Shape: {df.shape} (rows × columns)")
    print(f"\n🔤 First 15 rows:")
    display(df.head(15))

    print(f"\n🔢 Data types:")
    print(df.dtypes.value_counts())

    print(f"\n❓ Null values per column:")
    print(df.isnull().sum()[df.isnull().sum() > 0])

    return df

# Cell 6: Inspect Table 15 (Leontief Matrix - Most Important!)
df_leontief = read_ibge_table("tabela_15_matriz_impacto_leontief_2015.xls")
if df_leontief is not None:
    inspect_table(df_leontief, "Table 15 - Leontief Inverse Matrix")
```

**🚨 CRITICAL: Identify the structure**

IBGE tables typically have:
- **First 4-6 rows**: Headers, metadata, titles
- **Column 0-1**: Sector codes and names
- **Remaining columns**: Numeric data (67 columns for 67 sectors)

Look at the output and identify:
1. Which row contains sector names? (usually row 4-6)
2. Which column contains sector codes? (usually column 0)
3. Which column contains sector names? (usually column 1)
4. Where does the numeric data matrix start? (row X, column Y)

---

### Step 4: Extract Sector Metadata

```python
# Cell 7: Extract 67 Sector Names and Codes
def extract_sector_metadata(df, header_row=5, code_col=0, name_col=1, num_sectors=67):
    """
    Extract sector codes and names from IBGE table

    Parameters:
    -----------
    header_row : int
        Row index where sector headers start (0-based)
    code_col : int
        Column containing sector codes
    name_col : int
        Column containing sector names
    num_sectors : int
        Expected number of sectors (67)

    Returns:
    --------
    pd.DataFrame with columns: sector_code, sector_name, sector_id
    """
    # Extract sector codes and names
    sector_codes = df.iloc[header_row:header_row+num_sectors, code_col].tolist()
    sector_names = df.iloc[header_row:header_row+num_sectors, name_col].tolist()

    # Clean up (remove NaN, strip whitespace)
    sector_codes = [str(code).strip() if pd.notna(code) else f"S{i+1:02d}"
                    for i, code in enumerate(sector_codes)]
    sector_names = [str(name).strip() if pd.notna(name) else f"Sector {i+1}"
                    for i, name in enumerate(sector_names)]

    # Create DataFrame
    sectors_df = pd.DataFrame({
        'sector_id': range(1, num_sectors + 1),
        'sector_code': sector_codes,
        'sector_name': sector_names
    })

    print(f"✅ Extracted {len(sectors_df)} sectors")
    return sectors_df

# Cell 8: Extract Sectors from Table 15
# ⚠️ ADJUST THESE PARAMETERS based on your inspection in Cell 6
HEADER_ROW = 5  # 🔧 Change this to match your table structure
CODE_COL = 0
NAME_COL = 1

sectors_df = extract_sector_metadata(df_leontief,
                                      header_row=HEADER_ROW,
                                      code_col=CODE_COL,
                                      name_col=NAME_COL)

print("\n📊 First 10 sectors:")
display(sectors_df.head(10))

print("\n📊 Last 10 sectors:")
display(sectors_df.tail(10))

# Save to CSV
sectors_df.to_csv(OUTPUT_DIR / "sectors_67_metadata.csv", index=False)
print(f"\n💾 Saved to: {OUTPUT_DIR / 'sectors_67_metadata.csv'}")
```

---

### Step 5: Extract Numeric Matrix Data

```python
# Cell 9: Extract Matrix Data (67×67)
def extract_matrix(df, matrix_name, header_row=5, start_col=2, num_sectors=67):
    """
    Extract numeric matrix from IBGE table

    Parameters:
    -----------
    df : pd.DataFrame
        Raw IBGE table
    matrix_name : str
        Name for this matrix (e.g., 'leontief_inverse')
    header_row : int
        Row where data starts
    start_col : int
        Column where numeric data starts (after code and name columns)
    num_sectors : int
        Matrix dimension (67×67)

    Returns:
    --------
    pd.DataFrame with sector_from, sector_to, value, matrix_type columns
    """
    # Extract numeric data (67×67 matrix)
    matrix_data = df.iloc[header_row:header_row+num_sectors,
                           start_col:start_col+num_sectors]

    # Convert to numeric (handle any text/formatting issues)
    matrix_data = matrix_data.apply(pd.to_numeric, errors='coerce')

    # Replace NaN with 0 (IBGE uses blank cells for zero values)
    matrix_data = matrix_data.fillna(0)

    print(f"✅ Extracted {matrix_name} matrix: {matrix_data.shape}")
    print(f"   Value range: [{matrix_data.min().min():.6f}, {matrix_data.max().max():.6f}]")
    print(f"   Non-zero entries: {(matrix_data != 0).sum().sum()} / {num_sectors*num_sectors}")

    # Convert to long format (from_sector, to_sector, value)
    rows = []
    for i in range(num_sectors):
        for j in range(num_sectors):
            value = matrix_data.iloc[i, j]
            if abs(value) > 1e-10:  # Only store non-zero values to save space
                rows.append({
                    'matrix_type': matrix_name,
                    'from_sector_id': i + 1,  # 1-based indexing
                    'to_sector_id': j + 1,
                    'coefficient_value': float(value)
                })

    matrix_df = pd.DataFrame(rows)
    print(f"   Stored non-zero entries: {len(matrix_df)}")

    return matrix_data, matrix_df

# Cell 10: Extract Table 15 - Leontief Inverse Matrix (MOST IMPORTANT!)
# ⚠️ ADJUST start_col based on your table structure
START_COL = 2  # 🔧 Change if sector names/codes take more columns

matrix_leontief, df_leontief_long = extract_matrix(
    df_leontief,
    matrix_name='leontief_inverse',
    header_row=HEADER_ROW,
    start_col=START_COL,
    num_sectors=NUM_SECTORS
)

# Display sample
print("\n📊 Leontief Matrix Sample (first 5×5):")
display(matrix_leontief.iloc[:5, :5])

print("\n📊 Long format (first 10 rows):")
display(df_leontief_long.head(10))

# Save to CSV
matrix_leontief.to_csv(OUTPUT_DIR / "leontief_inverse_matrix_67x67.csv", index=False)
df_leontief_long.to_csv(OUTPUT_DIR / "leontief_inverse_long_format.csv", index=False)
print(f"\n💾 Saved matrix to: {OUTPUT_DIR}")
```

---

### Step 6: Extract All 15 Tables

```python
# Cell 11: Process All IBGE Tables
tables_config = {
    'tabela_11_coeficientes_tecnicos_nacionais_Bn_2015.xls': 'technical_coefficients_national_Bn',
    'tabela_12_coeficientes_tecnicos_importados_Bm_2015.xls': 'technical_coefficients_imports_Bm',
    'tabela_13_participacao_setorial_D_2015.xls': 'market_share_matrix_D',
    'tabela_14_coeficientes_tecnicos_intersetoriais_DBn_2015.xls': 'intersectoral_coefficients_DBn',
    'tabela_15_matriz_impacto_leontief_2015.xls': 'leontief_inverse',
}

# Dictionary to store all processed matrices
all_matrices = {}

for filename, matrix_name in tables_config.items():
    print(f"\n{'='*60}")
    print(f"Processing: {filename}")
    print(f"{'='*60}")

    df_raw = read_ibge_table(filename)
    if df_raw is not None:
        try:
            matrix_2d, matrix_long = extract_matrix(
                df_raw,
                matrix_name=matrix_name,
                header_row=HEADER_ROW,
                start_col=START_COL,
                num_sectors=NUM_SECTORS
            )

            all_matrices[matrix_name] = {
                'matrix_2d': matrix_2d,
                'matrix_long': matrix_long,
                'filename': filename
            }

            # Save individual matrix
            matrix_long.to_csv(OUTPUT_DIR / f"{matrix_name}_long.csv", index=False)
            print(f"✅ Saved: {matrix_name}_long.csv")

        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

print(f"\n\n{'='*60}")
print(f"✅ Successfully processed {len(all_matrices)} matrices")
print(f"{'='*60}")
```

---

### Step 7: Combine All Matrices into Single Dataset

```python
# Cell 12: Combine All Matrices
combined_matrices = []

for matrix_name, data in all_matrices.items():
    df_matrix = data['matrix_long']
    combined_matrices.append(df_matrix)

# Concatenate all matrices
df_all_matrices = pd.concat(combined_matrices, ignore_index=True)

print(f"📊 Combined matrices:")
print(f"   Total rows: {len(df_all_matrices):,}")
print(f"   Matrix types: {df_all_matrices['matrix_type'].nunique()}")
print(f"\n   Breakdown by matrix type:")
print(df_all_matrices['matrix_type'].value_counts())

# Add metadata
df_all_matrices['data_year'] = 2015
df_all_matrices['data_source'] = 'IBGE'
df_all_matrices['created_at'] = datetime.now().isoformat()

# Save combined dataset
df_all_matrices.to_csv(OUTPUT_DIR / "ibge_io_matrices_67_combined.csv", index=False)
print(f"\n💾 Saved combined dataset: {OUTPUT_DIR / 'ibge_io_matrices_67_combined.csv'}")

# Display sample
print("\n📊 Sample of combined dataset:")
display(df_all_matrices.groupby('matrix_type').head(3))
```

---

### Step 8: Data Validation

```python
# Cell 13: Validate Leontief Inverse Properties
def validate_leontief_matrix(matrix_2d):
    """
    Validate Leontief inverse matrix properties

    The Leontief inverse L = (I - A)^-1 should have:
    1. All diagonal elements ≥ 1 (direct + indirect effects)
    2. All off-diagonal elements ≥ 0 (spillover effects)
    3. Column sums = output multipliers (total impact per unit investment)
    """
    print(f"\n{'='*60}")
    print(f"🔍 Validating Leontief Inverse Matrix")
    print(f"{'='*60}")

    # Check 1: Diagonal elements ≥ 1
    diagonal = np.diag(matrix_2d.values)
    print(f"\n✓ Diagonal elements (should be ≥ 1.0):")
    print(f"   Min: {diagonal.min():.4f}")
    print(f"   Max: {diagonal.max():.4f}")
    print(f"   Mean: {diagonal.mean():.4f}")

    if diagonal.min() < 1.0:
        print(f"   ⚠️  WARNING: Some diagonal elements < 1.0!")

    # Check 2: All elements ≥ 0
    matrix_array = matrix_2d.values
    negative_count = (matrix_array < 0).sum()
    print(f"\n✓ Non-negativity check:")
    print(f"   Negative values: {negative_count}")

    if negative_count > 0:
        print(f"   ⚠️  WARNING: Found {negative_count} negative values!")
        print(f"   Min value: {matrix_array.min():.6f}")

    # Check 3: Output multipliers (column sums)
    col_sums = matrix_2d.sum(axis=0)
    print(f"\n✓ Output multipliers (column sums):")
    print(f"   Min: {col_sums.min():.4f}")
    print(f"   Max: {col_sums.max():.4f}")
    print(f"   Mean: {col_sums.mean():.4f}")

    # Top 10 sectors by multiplier
    multipliers_sorted = col_sums.sort_values(ascending=False)
    print(f"\n🏆 Top 10 sectors by output multiplier:")
    for i, (idx, mult) in enumerate(multipliers_sorted.head(10).items()):
        sector_name = sectors_df.iloc[idx]['sector_name']
        print(f"   {i+1}. {sector_name[:40]:<40} → {mult:.4f}×")

    return {
        'diagonal_min': diagonal.min(),
        'diagonal_max': diagonal.max(),
        'negative_count': negative_count,
        'multiplier_min': col_sums.min(),
        'multiplier_max': col_sums.max(),
        'multiplier_mean': col_sums.mean()
    }

# Run validation
validation_results = validate_leontief_matrix(matrix_leontief)

# Save validation report
with open(OUTPUT_DIR / "validation_report.json", 'w') as f:
    json.dump(validation_results, f, indent=2)
```

---

### Step 9: Generate SQL Scripts

```python
# Cell 14: Generate SQL CREATE TABLE Statements
def generate_sql_schema():
    """
    Generate SQL schema for IBGE I-O tables in Supabase
    """

    sql_schema = """
-- ============================================================
-- IBGE Input-Output Tables (67 Sectors, 2015)
-- Generated: {timestamp}
-- ============================================================

-- Table 1: Sector Metadata (67 sectors)
CREATE TABLE IF NOT EXISTS ibge_io_sectors_67 (
    sector_id INTEGER PRIMARY KEY,
    sector_code VARCHAR(10) UNIQUE NOT NULL,
    sector_name VARCHAR(255) NOT NULL,
    sector_name_short VARCHAR(100),
    sector_description TEXT,
    data_year INTEGER DEFAULT 2015,
    data_source VARCHAR(50) DEFAULT 'IBGE',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Table 2: I-O Matrices (stores all matrix types in long format)
CREATE TABLE IF NOT EXISTS ibge_io_matrices_67 (
    id SERIAL PRIMARY KEY,
    matrix_type VARCHAR(100) NOT NULL,
    from_sector_id INTEGER NOT NULL REFERENCES ibge_io_sectors_67(sector_id),
    to_sector_id INTEGER NOT NULL REFERENCES ibge_io_sectors_67(sector_id),
    coefficient_value NUMERIC(15,10) NOT NULL,
    data_year INTEGER DEFAULT 2015,
    data_source VARCHAR(50) DEFAULT 'IBGE',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(matrix_type, from_sector_id, to_sector_id, data_year)
);

-- Index for fast matrix queries
CREATE INDEX IF NOT EXISTS idx_io_matrices_matrix_type
    ON ibge_io_matrices_67(matrix_type);
CREATE INDEX IF NOT EXISTS idx_io_matrices_from_sector
    ON ibge_io_matrices_67(from_sector_id);
CREATE INDEX IF NOT EXISTS idx_io_matrices_to_sector
    ON ibge_io_matrices_67(to_sector_id);

-- Table 3: Sector Aggregation Mapping (67 → 4 sectors for backward compatibility)
CREATE TABLE IF NOT EXISTS ibge_io_sector_aggregation (
    sector_id_67 INTEGER NOT NULL REFERENCES ibge_io_sectors_67(sector_id),
    aggregate_sector_code VARCHAR(20) NOT NULL,
    aggregate_sector_name VARCHAR(100) NOT NULL,
    weight NUMERIC(5,4) DEFAULT 1.0,
    PRIMARY KEY (sector_id_67, aggregate_sector_code)
);

-- Table 4: Output Multipliers (pre-computed from Leontief matrix)
CREATE TABLE IF NOT EXISTS ibge_io_multipliers_67 (
    sector_id INTEGER PRIMARY KEY REFERENCES ibge_io_sectors_67(sector_id),
    output_multiplier NUMERIC(10,6) NOT NULL,
    vab_multiplier NUMERIC(10,6),
    employment_multiplier NUMERIC(10,6),
    tax_multiplier NUMERIC(10,6),
    data_year INTEGER DEFAULT 2015,
    calculation_method VARCHAR(100) DEFAULT 'column_sum_leontief_inverse',
    created_at TIMESTAMP DEFAULT NOW()
);

-- View: Get Leontief Inverse Matrix in 2D format
CREATE OR REPLACE VIEW v_leontief_matrix_67 AS
SELECT
    from_sector_id,
    to_sector_id,
    s_from.sector_name as from_sector_name,
    s_to.sector_name as to_sector_name,
    coefficient_value
FROM ibge_io_matrices_67 m
JOIN ibge_io_sectors_67 s_from ON m.from_sector_id = s_from.sector_id
JOIN ibge_io_sectors_67 s_to ON m.to_sector_id = s_to.sector_id
WHERE m.matrix_type = 'leontief_inverse'
  AND m.data_year = 2015;

-- View: Top 20 sectors by output multiplier
CREATE OR REPLACE VIEW v_top_sectors_by_multiplier AS
SELECT
    s.sector_id,
    s.sector_code,
    s.sector_name,
    m.output_multiplier,
    m.vab_multiplier,
    m.employment_multiplier
FROM ibge_io_multipliers_67 m
JOIN ibge_io_sectors_67 s ON m.sector_id = s.sector_id
ORDER BY m.output_multiplier DESC
LIMIT 20;

COMMENT ON TABLE ibge_io_sectors_67 IS 'IBGE 67-sector classification for Input-Output analysis (2015)';
COMMENT ON TABLE ibge_io_matrices_67 IS 'All I-O matrices in long format (technical coefficients, Leontief inverse, etc.)';
COMMENT ON TABLE ibge_io_multipliers_67 IS 'Pre-computed economic multipliers by sector';
COMMENT ON VIEW v_leontief_matrix_67 IS 'Leontief inverse matrix in readable 2D format';

""".format(timestamp=datetime.now().isoformat())

    return sql_schema

# Generate and save SQL schema
sql_schema = generate_sql_schema()

with open(OUTPUT_DIR / "001_create_ibge_io_tables_SUPABASE.sql", 'w') as f:
    f.write(sql_schema)

print("✅ Generated SQL schema file:")
print(f"   {OUTPUT_DIR / '001_create_ibge_io_tables_SUPABASE.sql'}")
print("\n📋 Preview:")
print(sql_schema[:1000] + "...")
```

---

### Step 10: Generate SQL INSERT Statements

```python
# Cell 15: Generate SQL INSERT Statements for Sectors
def generate_sector_inserts(sectors_df):
    """
    Generate SQL INSERT statements for 67 sectors
    """
    sql_inserts = [
        "-- ============================================================",
        "-- INSERT SECTOR METADATA (67 Sectors)",
        "-- ============================================================\n",
        "INSERT INTO ibge_io_sectors_67 (sector_id, sector_code, sector_name, data_year, data_source) VALUES"
    ]

    values = []
    for _, row in sectors_df.iterrows():
        sector_name_clean = row['sector_name'].replace("'", "''")  # Escape single quotes
        values.append(
            f"  ({row['sector_id']}, '{row['sector_code']}', '{sector_name_clean}', 2015, 'IBGE')"
        )

    sql_inserts.append(",\n".join(values))
    sql_inserts.append("ON CONFLICT (sector_id) DO NOTHING;\n")

    return "\n".join(sql_inserts)

# Cell 16: Generate SQL INSERT Statements for Matrices (Batched)
def generate_matrix_inserts(df_matrices, batch_size=500):
    """
    Generate SQL INSERT statements for matrices in batches

    Parameters:
    -----------
    df_matrices : pd.DataFrame
        Long format matrix data
    batch_size : int
        Number of rows per INSERT statement (Supabase limit ~1000)
    """
    sql_inserts = [
        "-- ============================================================",
        "-- INSERT I-O MATRICES (All Matrix Types)",
        "-- ============================================================\n"
    ]

    total_rows = len(df_matrices)
    num_batches = (total_rows // batch_size) + 1

    for batch_num in range(num_batches):
        start_idx = batch_num * batch_size
        end_idx = min((batch_num + 1) * batch_size, total_rows)
        batch_df = df_matrices.iloc[start_idx:end_idx]

        if len(batch_df) == 0:
            break

        sql_inserts.append(f"\n-- Batch {batch_num + 1}/{num_batches}")
        sql_inserts.append("INSERT INTO ibge_io_matrices_67 (matrix_type, from_sector_id, to_sector_id, coefficient_value, data_year, data_source) VALUES")

        values = []
        for _, row in batch_df.iterrows():
            matrix_type = row['matrix_type'].replace("'", "''")
            values.append(
                f"  ('{matrix_type}', {row['from_sector_id']}, {row['to_sector_id']}, {row['coefficient_value']}, 2015, 'IBGE')"
            )

        sql_inserts.append(",\n".join(values))
        sql_inserts.append("ON CONFLICT (matrix_type, from_sector_id, to_sector_id, data_year) DO UPDATE")
        sql_inserts.append("  SET coefficient_value = EXCLUDED.coefficient_value;\n")

    return "\n".join(sql_inserts)

# Cell 17: Generate All INSERT Statements
print("Generating SQL INSERT statements...\n")

# Generate sector inserts
sql_sectors = generate_sector_inserts(sectors_df)
with open(OUTPUT_DIR / "002_insert_sectors_67.sql", 'w') as f:
    f.write(sql_sectors)
print(f"✅ Generated: 002_insert_sectors_67.sql ({len(sectors_df)} sectors)")

# Generate matrix inserts
sql_matrices = generate_matrix_inserts(df_all_matrices, batch_size=500)
with open(OUTPUT_DIR / "003_insert_matrices_67.sql", 'w') as f:
    f.write(sql_matrices)
print(f"✅ Generated: 003_insert_matrices_67.sql ({len(df_all_matrices):,} coefficients)")

print("\n📦 Total SQL files generated:")
print(f"   1. 001_create_ibge_io_tables_SUPABASE.sql (schema)")
print(f"   2. 002_insert_sectors_67.sql (sector metadata)")
print(f"   3. 003_insert_matrices_67.sql (matrix data)")
```

---

### Step 11: Calculate and Store Multipliers

```python
# Cell 18: Calculate Output Multipliers from Leontief Matrix
def calculate_multipliers(matrix_2d, sectors_df):
    """
    Calculate economic multipliers from Leontief inverse matrix

    Output multiplier = sum of column j (total impact on all sectors per unit investment in sector j)
    """
    # Calculate output multipliers (column sums)
    output_multipliers = matrix_2d.sum(axis=0).values

    # Create multipliers DataFrame
    multipliers_df = pd.DataFrame({
        'sector_id': range(1, len(output_multipliers) + 1),
        'sector_name': sectors_df['sector_name'].values,
        'output_multiplier': output_multipliers,
        'data_year': 2015,
        'calculation_method': 'column_sum_leontief_inverse'
    })

    # Sort by multiplier (descending)
    multipliers_df = multipliers_df.sort_values('output_multiplier', ascending=False).reset_index(drop=True)

    print(f"✅ Calculated multipliers for {len(multipliers_df)} sectors\n")
    print(f"📊 Output Multiplier Statistics:")
    print(f"   Min:  {multipliers_df['output_multiplier'].min():.4f}×")
    print(f"   Max:  {multipliers_df['output_multiplier'].max():.4f}×")
    print(f"   Mean: {multipliers_df['output_multiplier'].mean():.4f}×")

    print(f"\n🏆 Top 15 sectors by output multiplier:")
    display(multipliers_df.head(15))

    return multipliers_df

# Calculate multipliers
multipliers_df = calculate_multipliers(matrix_leontief, sectors_df)

# Save to CSV
multipliers_df.to_csv(OUTPUT_DIR / "sector_multipliers_67.csv", index=False)
print(f"\n💾 Saved: {OUTPUT_DIR / 'sector_multipliers_67.csv'}")

# Cell 19: Generate SQL for Multipliers
def generate_multiplier_inserts(multipliers_df):
    sql_inserts = [
        "-- ============================================================",
        "-- INSERT OUTPUT MULTIPLIERS (67 Sectors)",
        "-- ============================================================\n",
        "INSERT INTO ibge_io_multipliers_67 (sector_id, output_multiplier, data_year, calculation_method) VALUES"
    ]

    values = []
    for _, row in multipliers_df.iterrows():
        values.append(
            f"  ({row['sector_id']}, {row['output_multiplier']:.10f}, 2015, 'column_sum_leontief_inverse')"
        )

    sql_inserts.append(",\n".join(values))
    sql_inserts.append("ON CONFLICT (sector_id) DO UPDATE")
    sql_inserts.append("  SET output_multiplier = EXCLUDED.output_multiplier;")

    return "\n".join(sql_inserts)

sql_multipliers = generate_multiplier_inserts(multipliers_df)
with open(OUTPUT_DIR / "004_insert_multipliers_67.sql", 'w') as f:
    f.write(sql_multipliers)
print(f"✅ Generated: 004_insert_multipliers_67.sql")
```

---

### Step 12: Final Summary and Checklist

```python
# Cell 20: Generate Summary Report
summary_report = f"""
{'='*70}
📊 IBGE I-O DATA PROCESSING SUMMARY
{'='*70}

✅ PROCESSED DATA:
   • Sectors: {len(sectors_df)} sectors extracted
   • Matrices: {len(all_matrices)} matrix types processed
   • Total coefficients: {len(df_all_matrices):,} non-zero entries
   • Output multipliers: {len(multipliers_df)} calculated

📁 OUTPUT FILES:
   1. sectors_67_metadata.csv
   2. leontief_inverse_matrix_67x67.csv
   3. leontief_inverse_long_format.csv
   4. ibge_io_matrices_67_combined.csv
   5. sector_multipliers_67.csv
   6. validation_report.json

📝 SQL SCRIPTS GENERATED:
   1. 001_create_ibge_io_tables_SUPABASE.sql (CREATE TABLES)
   2. 002_insert_sectors_67.sql ({len(sectors_df)} sectors)
   3. 003_insert_matrices_67.sql ({len(df_all_matrices):,} coefficients)
   4. 004_insert_multipliers_67.sql ({len(multipliers_df)} multipliers)

🎯 TOP 5 SECTORS BY OUTPUT MULTIPLIER:
"""

for i, row in multipliers_df.head(5).iterrows():
    summary_report += f"\n   {i+1}. {row['sector_name'][:50]:<50} → {row['output_multiplier']:.4f}×"

summary_report += f"""

✅ VALIDATION RESULTS:
   • Diagonal elements (should be ≥1.0): {validation_results['diagonal_min']:.4f} to {validation_results['diagonal_max']:.4f}
   • Negative values found: {validation_results['negative_count']}
   • Output multiplier range: {validation_results['multiplier_min']:.4f}× to {validation_results['multiplier_max']:.4f}×

{'='*70}
🚀 NEXT STEPS:
{'='*70}

1. Review SQL files in: {OUTPUT_DIR}

2. Load into Supabase SQL Editor:
   a. Run: 001_create_ibge_io_tables_SUPABASE.sql
   b. Run: 002_insert_sectors_67.sql
   c. Run: 003_insert_matrices_67.sql (may take 2-5 minutes)
   d. Run: 004_insert_multipliers_67.sql

3. Verify data loaded correctly:
   ```sql
   SELECT COUNT(*) FROM ibge_io_sectors_67;  -- Should be 67
   SELECT COUNT(*) FROM ibge_io_matrices_67; -- Should be {len(df_all_matrices):,}
   SELECT COUNT(*) FROM ibge_io_multipliers_67; -- Should be 67

   -- Test query
   SELECT * FROM v_top_sectors_by_multiplier LIMIT 10;
   ```

4. Proceed with backend integration 🎉

{'='*70}
"""

print(summary_report)

# Save summary report
with open(OUTPUT_DIR / "PROCESSING_SUMMARY.txt", 'w') as f:
    f.write(summary_report)

print(f"\n💾 Summary saved to: {OUTPUT_DIR / 'PROCESSING_SUMMARY.txt'}")
```

---

## 🎉 COMPLETION CHECKLIST

After running all cells, you should have:

- ✅ **CSV files** with processed data (for backup/analysis)
- ✅ **SQL schema** (CREATE TABLE statements)
- ✅ **SQL data inserts** (INSERT statements in batches)
- ✅ **Validation report** (checking matrix properties)
- ✅ **Summary report** (statistics and next steps)

---

## 🚨 Common Issues & Solutions

### Issue 1: File Not Found
**Error**: `File not found: /path/to/table.xls`
**Solution**:
- Check file naming (case-sensitive on Linux)
- Verify files are in `/backend/data/economic/ibge_2015_67_sectors/`
- Update `DATA_DIR` path in Cell 2

### Issue 2: Wrong Matrix Dimensions
**Error**: Matrix is not 67×67
**Solution**:
- Adjust `HEADER_ROW` parameter (usually 4-6)
- Adjust `START_COL` parameter (usually 2-3)
- Inspect table structure using Cell 6

### Issue 3: Sector Names with Special Characters
**Error**: SQL syntax error in INSERT
**Solution**:
- Code already escapes single quotes (`'` → `''`)
- Check for other special characters (backticks, newlines)
- Manually clean `sectors_df['sector_name']` if needed

### Issue 4: Supabase INSERT Too Large
**Error**: Request entity too large
**Solution**:
- Reduce `batch_size` parameter in Cell 16 (try 200-300)
- Run SQL file in multiple parts
- Use `COPY` command instead (if you have CSV access in Supabase)

---

## 📊 Expected Results

### Sector Count
- **67 sectors** spanning agriculture, manufacturing, services, construction, etc.

### Matrix Types
You should have these matrices:
1. **Technical Coefficients (National) - Bn**: Direct input requirements per unit of output
2. **Technical Coefficients (Imports) - Bm**: Imported input requirements
3. **Market Share Matrix - D**: Each sector's share in producing each product
4. **Intersectoral Coefficients - D.Bn**: Combined market share × technical coefficients
5. **Leontief Inverse Matrix**: (I-A)^-1 for total economic impact calculation ⭐

### Output Multipliers
- Typically range: **1.0× to 3.5×**
- High multipliers: Manufacturing, construction, transport
- Low multipliers: Primary extraction, some services

---

## 🚀 After Data Loading

Once you've loaded data into Supabase, return to the main implementation guide for:
1. Backend service integration (LeontiefCalculator67 class)
2. API endpoint updates
3. Spatial distribution with 67 sectors
4. Frontend visualization updates

---

**📝 Need Help?**
If you encounter issues during processing, save your error messages and share:
1. The table structure (output from Cell 6)
2. The error message
3. Sample of your data (first 10 rows)

Good luck! 🎉

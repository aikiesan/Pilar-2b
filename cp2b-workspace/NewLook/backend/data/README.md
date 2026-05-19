# PILAR-2b V3 - Geospatial Data Directory

This directory contains shapefiles and rasters for infrastructure layers.

## Data Sources

All data files are sourced from: https://github.com/aikiesan/project_map

## Directory Structure

```
backend/data/
├── shapefiles/          # Vector data (roads, pipelines, etc.)
│   ├── ETEs_2019_SP.shp
│   ├── Gasodutos_Distribuicao_SP.shp
│   ├── Gasodutos_Transporte_SP.shp
│   ├── Limite_SP.shp
│   ├── Linhas_De_Transmissao_Energia.shp
│   ├── Plantas_Biogas_SP.shp
│   ├── Regiao_Adm_SP.shp
│   ├── Rodovias_Estaduais_SP.shp
│   ├── SP_Municipios_2024.shp
│   ├── SP_RG_Imediatas_2024.shp
│   ├── SP_RG_Intermediarias_2024.shp
│   ├── Shapefile_425_Biogas_Mapbiomas_SP.shp
│   └── Subestacoes_Energia.shp
└── rasters/             # Raster data (MapBiomas)
    └── mapbiomas_agropecuaria_sp_2024.tif

**Note**: Areas_Urbanas_SP.shp (~36MB) is excluded from deployment to reduce build size.
```

## Deploying to Railway

**Important**: Shapefiles are gitignored to keep repo size small (~94MB total).

### Option 1: Copy files during Railway build (Recommended)

Add to `railway.toml`:
```toml
[build]
buildCommand = "pip install -r requirements.txt && mkdir -p data/shapefiles data/rasters && wget https://github.com/aikiesan/project_map/archive/refs/heads/main.zip && unzip main.zip && cp -r project_map-main/data/shapefile/* data/shapefiles/ && cp -r project_map-main/data/rasters/* data/rasters/ && rm -rf main.zip project_map-main"
```

### Option 2: Manual upload via Railway CLI

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Upload shapefiles
railway run mkdir -p /app/backend/data/shapefiles
railway run mkdir -p /app/backend/data/rasters

# Upload files (requires local copies)
railway run cp backend/data/shapefiles/* /app/backend/data/shapefiles/
railway run cp backend/data/rasters/* /app/backend/data/rasters/
```

### Option 3: Use Railway Volumes (Best for production)

1. Create a Railway Volume for persistent storage
2. Upload shapefiles to the volume
3. Mount volume to `/app/backend/data`

## Local Development

Copy shapefiles from project_map repo:

```bash
# Clone project_map repo
git clone https://github.com/aikiesan/project_map.git /tmp/project_map

# Copy data
cp -r /tmp/project_map/data/shapefile/* backend/data/shapefiles/
cp -r /tmp/project_map/data/rasters/* backend/data/rasters/
```

## Graceful Fallback

The backend automatically returns empty GeoJSON FeatureCollections when shapefiles are missing, so the API won't crash if data files aren't present. This allows the application to run without shapefiles (though infrastructure layers won't display).

## File Sizes

- `Gasodutos_Distribuicao_SP.shp`: ~12MB
- `mapbiomas_agropecuaria_sp_2024.tif`: ~13MB
- Other files: < 5MB each
- **Total**: ~58MB (excluding Areas_Urbanas_SP.shp which was ~36MB)

## Dependencies Required

```
geopandas==0.14.1
fiona==1.9.5
pyproj==3.6.1
```

Already included in `requirements.txt`.

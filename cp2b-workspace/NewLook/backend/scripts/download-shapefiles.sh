#!/bin/bash
set -e

# Check if shapefiles already exist (Docker layer caching)
if [ -f "data/shapefiles/.downloaded" ]; then
    echo "✅ Shapefiles already cached, skipping download"
    echo "📊 Total shapefile files: $(ls -1 data/shapefiles/*.shp 2>/dev/null | wc -l)"
    echo "📊 Total raster files: $(ls -1 data/rasters/*.tif 2>/dev/null | wc -l)"
    exit 0
fi

echo "📥 Downloading shapefiles from project_map repo..."
mkdir -p data/shapefiles data/rasters

# Download from GitHub with progress indicator suppressed
echo "⬇️  Fetching archive..."
curl -sL --max-time 120 https://github.com/aikiesan/project_map/archive/refs/heads/main.zip -o /tmp/project_map.zip

# Extract using Python (built-in, no external dependencies)
echo "📦 Extracting archive..."
python3 -c "
import zipfile
import os
with zipfile.ZipFile('/tmp/project_map.zip', 'r') as zip_ref:
    zip_ref.extractall('/tmp/')
"

# Copy shapefiles (excluding heavy urban areas file)
echo "📦 Copying shapefiles (excluding Areas_Urbanas_SP - too large)..."
for file in /tmp/project_map-main/data/shapefile/*; do
    filename=$(basename "$file")
    # Skip Areas_Urbanas_SP files (all extensions)
    if [[ ! "$filename" =~ ^Areas_Urbanas_SP\. ]]; then
        cp "$file" data/shapefiles/
    fi
done

# Copy rasters
cp -r /tmp/project_map-main/data/rasters/* data/rasters/ 2>/dev/null || echo "⚠️  No rasters found"

# Create cache marker
touch data/shapefiles/.downloaded

# Cleanup
rm -rf /tmp/project_map.zip /tmp/project_map-main

echo "✅ Shapefiles downloaded successfully (excluding Areas_Urbanas_SP)"
echo "📊 Total shapefile files: $(ls -1 data/shapefiles/*.shp 2>/dev/null | wc -l)"
echo "📊 Total raster files: $(ls -1 data/rasters/*.tif 2>/dev/null | wc -l)"

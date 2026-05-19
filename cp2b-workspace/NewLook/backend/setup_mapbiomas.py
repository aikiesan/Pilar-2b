"""
Setup script to copy MapBiomas raster and create metadata
"""
import os
import shutil
import json

# Paths
source_raster = r"C:\Users\Lucas\Documents\CP2B\CP2B_Maps_V2\data\rasters\mapbiomas_agropecuaria_sp_2024.tif"
dest_dir = r"C:\Users\Lucas\Documents\CP2B\CP2B_Maps_V3\cp2b-workspace\NewLook\backend\data\mapbiomas"
dest_raster = os.path.join(dest_dir, "mapbiomas_agropecuaria_sp_2024.tif")
metadata_path = os.path.join(dest_dir, "mapbiomas_metadata.json")

# Create directory
os.makedirs(dest_dir, exist_ok=True)
print(f"Created directory: {dest_dir}")

# Copy raster
if not os.path.exists(dest_raster):
    shutil.copy(source_raster, dest_raster)
    print(f"Copied raster to: {dest_raster}")
else:
    print(f"Raster already exists: {dest_raster}")

# Create metadata JSON with MapBiomas class definitions
metadata = {
    "year": 2024,
    "name": "MapBiomas Agropecuária SP",
    "description": "Agricultural land use classification for São Paulo state",
    "source": "MapBiomas Collection 8",
    "crs": "EPSG:4326",
    "bounds": {
        "west": -53.11091487994166,
        "south": -25.35863198693838,
        "east": -44.16099970425887,
        "north": -19.779285588800445
    },
    "size": {
        "width": 11070,
        "height": 6901
    },
    "classes": {
        "15": {
            "name_pt": "Pastagem",
            "name_en": "Pasture",
            "color": "#FFD966",
            "category": "pasture"
        },
        "9": {
            "name_pt": "Silvicultura",
            "name_en": "Forestry",
            "color": "#6D4C41",
            "category": "forestry"
        },
        "39": {
            "name_pt": "Soja",
            "name_en": "Soy",
            "color": "#E1BEE7",
            "category": "temporary_crops"
        },
        "20": {
            "name_pt": "Cana-de-açúcar",
            "name_en": "Sugarcane",
            "color": "#C5E1A5",
            "category": "temporary_crops"
        },
        "40": {
            "name_pt": "Arroz",
            "name_en": "Rice",
            "color": "#FFCDD2",
            "category": "temporary_crops"
        },
        "62": {
            "name_pt": "Algodão",
            "name_en": "Cotton",
            "color": "#F8BBD9",
            "category": "temporary_crops"
        },
        "41": {
            "name_pt": "Outras Temporárias",
            "name_en": "Other Temporary Crops",
            "color": "#DCEDC8",
            "category": "temporary_crops"
        },
        "46": {
            "name_pt": "Café",
            "name_en": "Coffee",
            "color": "#8D6E63",
            "category": "perennial_crops"
        },
        "47": {
            "name_pt": "Citros",
            "name_en": "Citrus",
            "color": "#FFA726",
            "category": "perennial_crops"
        },
        "35": {
            "name_pt": "Dendê",
            "name_en": "Palm Oil",
            "color": "#66BB6A",
            "category": "perennial_crops"
        },
        "48": {
            "name_pt": "Outras Perenes",
            "name_en": "Other Perennial Crops",
            "color": "#A1887F",
            "category": "perennial_crops"
        }
    }
}

with open(metadata_path, 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)
print(f"Created metadata: {metadata_path}")

print("\nSetup complete!")
print(f"Raster file: {os.path.getsize(dest_raster) / (1024*1024):.2f} MB")

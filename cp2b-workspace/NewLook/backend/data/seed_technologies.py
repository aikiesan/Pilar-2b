"""
Seed data for Technology Routes feature.
Initial catalog of Brazilian biogas technologies organized by category.
This is educational content - no calculations or simulations.
"""

# ============================================================================
# INITIAL TECHNOLOGY CARDS
# Each technology includes connection rules defining valid pathways
# ============================================================================

INITIAL_TECHNOLOGIES = [
    # ========================================================================
    # FEEDSTOCK - Raw materials from agriculture/industry
    # ========================================================================
    {
        "id": "feed_vinasse",
        "category": "feedstock",
        "name_pt": "Vinhaça",
        "name_en": "Vinasse",
        "emoji": "🍷",
        "description_pt": "Resíduo líquido da produção de etanol de cana-de-açúcar, rico em matéria orgânica e nutrientes",
        "description_en": "Liquid residue from sugarcane ethanol production, rich in organic matter and nutrients",
        "color": "#8B4513",
        "can_connect_to": ["digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_bagasse",
        "category": "feedstock",
        "name_pt": "Bagaço de Cana",
        "name_en": "Sugarcane Bagasse",
        "emoji": "🌾",
        "description_pt": "Resíduo sólido fibroso da moagem da cana-de-açúcar, principal subproduto das usinas",
        "description_en": "Fibrous solid residue from sugarcane milling, main byproduct of sugar mills",
        "color": "#D2691E",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_straw",
        "category": "feedstock",
        "name_pt": "Palha de Cana",
        "name_en": "Sugarcane Straw",
        "emoji": "🌿",
        "description_pt": "Resíduo da colheita mecanizada de cana-de-açúcar, deixado no campo",
        "description_en": "Residue from mechanized sugarcane harvesting, left in the field",
        "color": "#9ACD32",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_filter_cake",
        "category": "feedstock",
        "name_pt": "Torta de Filtro",
        "name_en": "Filter Cake",
        "emoji": "🍰",
        "description_pt": "Resíduo úmido da clarificação do caldo de cana, rico em matéria orgânica",
        "description_en": "Wet residue from sugarcane juice clarification, rich in organic matter",
        "color": "#A0522D",
        "can_connect_to": ["digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_cattle_manure",
        "category": "feedstock",
        "name_pt": "Esterco Bovino",
        "name_en": "Cattle Manure",
        "emoji": "🐄",
        "description_pt": "Dejetos de bovinos de confinamento e estábulos",
        "description_en": "Waste from confined cattle and stables",
        "color": "#8B6914",
        "can_connect_to": ["digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_pig_manure",
        "category": "feedstock",
        "name_pt": "Dejetos Suínos",
        "name_en": "Pig Manure",
        "emoji": "🐷",
        "description_pt": "Dejetos líquidos de suinocultura intensiva",
        "description_en": "Liquid waste from intensive pig farming",
        "color": "#CD853F",
        "can_connect_to": ["digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_swine_slurry",
        "category": "feedstock",
        "name_pt": "Dejetos Suínos (chorume)",
        "name_en": "Swine Slurry",
        "emoji": "🐷",
        "description_pt": "Chorume líquido de suinocultura intensiva",
        "description_en": "Liquid slurry from intensive pig farming",
        "color": "#EC4899",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_poultry_litter",
        "category": "feedstock",
        "name_pt": "Cama de Aviário",
        "name_en": "Poultry Litter",
        "emoji": "🐔",
        "description_pt": "Cama de frango e resíduos de aviário",
        "description_en": "Poultry house litter and waste",
        "color": "#F59E0B",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_corn_stover",
        "category": "feedstock",
        "name_pt": "Palha de Milho",
        "name_en": "Corn Stover",
        "emoji": "🌽",
        "description_pt": "Palha e sabugo de milho após colheita",
        "description_en": "Corn stalks and cobs after harvest",
        "color": "#EAB308",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_soy_stover",
        "category": "feedstock",
        "name_pt": "Palha de Soja",
        "name_en": "Soy Stover",
        "emoji": "🫘",
        "description_pt": "Resíduos de colheita de soja",
        "description_en": "Soybean harvest residues",
        "color": "#84CC16",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },
    {
        "id": "feed_urban_organic",
        "category": "feedstock",
        "name_pt": "Resíduo Orgânico Urbano",
        "name_en": "Urban Organic Waste",
        "emoji": "🏙️",
        "description_pt": "Fração orgânica de resíduos sólidos urbanos (FORSU) e lodos de ETE",
        "description_en": "Organic fraction of urban solid waste and wastewater sludge",
        "color": "#6B7280",
        "can_connect_to": ["pretreatment", "digestion"],
        "can_receive_from": []
    },

    # ========================================================================
    # PRETREATMENT - Preparation for digestion
    # ========================================================================
    {
        "id": "pre_thermal",
        "category": "pretreatment",
        "name_pt": "Hidrólise Térmica",
        "name_en": "Thermal Hydrolysis",
        "emoji": "🔥",
        "description_pt": "Tratamento térmico a alta pressão e temperatura para quebrar estruturas lignocelulósicas",
        "description_en": "High-pressure and temperature thermal treatment to break lignocellulosic structures",
        "color": "#FF6347",
        "can_connect_to": ["digestion"],
        "can_receive_from": ["feedstock"]
    },
    {
        "id": "pre_mechanical",
        "category": "pretreatment",
        "name_pt": "Preparo Mecânico",
        "name_en": "Mechanical Preparation",
        "emoji": "⚙️",
        "description_pt": "Trituração, moagem e homogeneização do material fibroso",
        "description_en": "Grinding, milling and homogenization of fibrous material",
        "color": "#708090",
        "can_connect_to": ["digestion"],
        "can_receive_from": ["feedstock"]
    },
    {
        "id": "pre_chemical",
        "category": "pretreatment",
        "name_pt": "Pré-tratamento Químico",
        "name_en": "Chemical Pretreatment",
        "emoji": "🧪",
        "description_pt": "Tratamento com ácidos, bases ou solventes para aumentar biodegradabilidade",
        "description_en": "Treatment with acids, bases or solvents to increase biodegradability",
        "color": "#4682B4",
        "can_connect_to": ["digestion"],
        "can_receive_from": ["feedstock"]
    },

    # ========================================================================
    # DIGESTION - Anaerobic digestion systems
    # ========================================================================
    {
        "id": "dig_cstr",
        "category": "digestion",
        "name_pt": "CSTR",
        "name_en": "CSTR (Continuously Stirred Tank Reactor)",
        "emoji": "🏭",
        "description_pt": "Reator continuamente agitado, ideal para substratos com alto teor de sólidos",
        "description_en": "Continuously stirred tank reactor, ideal for substrates with high solids content",
        "color": "#4682B4",
        "can_connect_to": ["upgrading", "enduse", "byproduct"],
        "can_receive_from": ["feedstock", "pretreatment"]
    },
    {
        "id": "dig_uasb",
        "category": "digestion",
        "name_pt": "UASB",
        "name_en": "UASB (Upflow Anaerobic Sludge Blanket)",
        "emoji": "💧",
        "description_pt": "Reator anaeróbio de fluxo ascendente com manta de lodo, ideal para efluentes líquidos",
        "description_en": "Upflow anaerobic sludge blanket reactor, ideal for liquid effluents",
        "color": "#1E90FF",
        "can_connect_to": ["upgrading", "enduse", "byproduct"],
        "can_receive_from": ["feedstock"]
    },
    {
        "id": "dig_lagoon",
        "category": "digestion",
        "name_pt": "Lagoa Coberta",
        "name_en": "Covered Lagoon",
        "emoji": "🏞️",
        "description_pt": "Lagoa anaeróbia com cobertura impermeável para captura de biogás",
        "description_en": "Anaerobic lagoon with impermeable cover for biogas capture",
        "color": "#20B2AA",
        "can_connect_to": ["enduse", "byproduct"],
        "can_receive_from": ["feedstock"]
    },
    {
        "id": "dig_plug_flow",
        "category": "digestion",
        "name_pt": "Fluxo Pistão",
        "name_en": "Plug Flow",
        "emoji": "🔄",
        "description_pt": "Reator horizontal de fluxo pistão para substratos com alto teor de sólidos",
        "description_en": "Horizontal plug flow reactor for substrates with high solids content",
        "color": "#5F9EA0",
        "can_connect_to": ["upgrading", "enduse", "byproduct"],
        "can_receive_from": ["feedstock", "pretreatment"]
    },

    # ========================================================================
    # UPGRADING - Biogas purification to biomethane
    # ========================================================================
    {
        "id": "upg_membrane",
        "category": "upgrading",
        "name_pt": "Separação por Membrana",
        "name_en": "Membrane Separation",
        "emoji": "🧬",
        "description_pt": "Separação de CO₂ e CH₄ através de membranas permeáveis seletivas",
        "description_en": "Separation of CO₂ and CH₄ through selective permeable membranes",
        "color": "#9370DB",
        "can_connect_to": ["enduse", "byproduct"],
        "can_receive_from": ["digestion"]
    },
    {
        "id": "upg_psa",
        "category": "upgrading",
        "name_pt": "PSA",
        "name_en": "PSA (Pressure Swing Adsorption)",
        "emoji": "🔬",
        "description_pt": "Adsorção por oscilação de pressão usando materiais adsorventes específicos",
        "description_en": "Pressure swing adsorption using specific adsorbent materials",
        "color": "#8A2BE2",
        "can_connect_to": ["enduse", "byproduct"],
        "can_receive_from": ["digestion"]
    },
    {
        "id": "upg_water_scrubbing",
        "category": "upgrading",
        "name_pt": "Water Scrubbing",
        "name_en": "Water Scrubbing",
        "emoji": "💦",
        "description_pt": "Lavagem do biogás com água pressurizada para remover CO₂",
        "description_en": "Biogas washing with pressurized water to remove CO₂",
        "color": "#6A5ACD",
        "can_connect_to": ["enduse", "byproduct"],
        "can_receive_from": ["digestion"]
    },
    {
        "id": "upg_chemical_scrubbing",
        "category": "upgrading",
        "name_pt": "Lavagem Química",
        "name_en": "Chemical Scrubbing",
        "emoji": "⚗️",
        "description_pt": "Lavagem com soluções químicas (aminas) para remover impurezas",
        "description_en": "Washing with chemical solutions (amines) to remove impurities",
        "color": "#7B68EE",
        "can_connect_to": ["enduse", "byproduct"],
        "can_receive_from": ["digestion"]
    },

    # ========================================================================
    # END USE - Final applications of biogas/biomethane
    # ========================================================================
    {
        "id": "end_cogen",
        "category": "enduse",
        "name_pt": "Cogeração",
        "name_en": "Cogeneration (CHP)",
        "emoji": "⚡",
        "description_pt": "Geração combinada de eletricidade e calor em motores ou turbinas",
        "description_en": "Combined heat and power generation in engines or turbines",
        "color": "#FFD700",
        "can_connect_to": [],
        "can_receive_from": ["digestion", "upgrading"]
    },
    {
        "id": "end_grid_injection",
        "category": "enduse",
        "name_pt": "Injeção na Rede",
        "name_en": "Grid Injection",
        "emoji": "🔌",
        "description_pt": "Injeção de biometano na rede de distribuição de gás natural",
        "description_en": "Biomethane injection into natural gas distribution grid",
        "color": "#32CD32",
        "can_connect_to": [],
        "can_receive_from": ["upgrading"]
    },
    {
        "id": "end_vehicle_fuel",
        "category": "enduse",
        "name_pt": "Biometano Veicular",
        "name_en": "Vehicle Fuel (Bio-CNG)",
        "emoji": "🚗",
        "description_pt": "Biometano comprimido como combustível veicular (GNV renovável)",
        "description_en": "Compressed biomethane as vehicle fuel (renewable CNG)",
        "color": "#00CED1",
        "can_connect_to": [],
        "can_receive_from": ["upgrading"]
    },
    {
        "id": "end_boiler",
        "category": "enduse",
        "name_pt": "Caldeira",
        "name_en": "Boiler",
        "emoji": "♨️",
        "description_pt": "Geração de vapor e calor para processos industriais",
        "description_en": "Steam and heat generation for industrial processes",
        "color": "#FF8C00",
        "can_connect_to": [],
        "can_receive_from": ["digestion"]
    },
    {
        "id": "end_fuel_cell",
        "category": "enduse",
        "name_pt": "Célula Combustível",
        "name_en": "Fuel Cell",
        "emoji": "🔋",
        "description_pt": "Geração elétrica através de célula a combustível de alto rendimento",
        "description_en": "Electric generation through high-efficiency fuel cell",
        "color": "#FFA500",
        "can_connect_to": [],
        "can_receive_from": ["upgrading"]
    },

    # ========================================================================
    # BYPRODUCTS - Valuable co-products
    # ========================================================================
    {
        "id": "byp_digestate",
        "category": "byproduct",
        "name_pt": "Digestato",
        "name_en": "Digestate",
        "emoji": "🌱",
        "description_pt": "Biofertilizante rico em nutrientes resultante da digestão anaeróbia",
        "description_en": "Nutrient-rich biofertilizer resulting from anaerobic digestion",
        "color": "#228B22",
        "can_connect_to": [],
        "can_receive_from": ["digestion"]
    },
    {
        "id": "byp_co2",
        "category": "byproduct",
        "name_pt": "CO₂ Capturado",
        "name_en": "Captured CO₂",
        "emoji": "💨",
        "description_pt": "CO₂ de grau alimentício ou industrial capturado no upgrade",
        "description_en": "Food-grade or industrial CO₂ captured during upgrading",
        "color": "#B0C4DE",
        "can_connect_to": [],
        "can_receive_from": ["upgrading"]
    },
    {
        "id": "byp_solid_digestate",
        "category": "byproduct",
        "name_pt": "Digestato Sólido",
        "name_en": "Solid Digestate",
        "emoji": "🪨",
        "description_pt": "Fração sólida do digestato após separação, usado como condicionador de solo",
        "description_en": "Solid fraction of digestate after separation, used as soil conditioner",
        "color": "#6B8E23",
        "can_connect_to": [],
        "can_receive_from": ["digestion"]
    },
    {
        "id": "byp_liquid_digestate",
        "category": "byproduct",
        "name_pt": "Digestato Líquido",
        "name_en": "Liquid Digestate",
        "emoji": "💧",
        "description_pt": "Fração líquida do digestato, rica em nutrientes solúveis",
        "description_en": "Liquid fraction of digestate, rich in soluble nutrients",
        "color": "#4682B4",
        "can_connect_to": [],
        "can_receive_from": ["digestion"]
    },
]


# ============================================================================
# HELPER FUNCTION TO INSERT SEED DATA
# ============================================================================

def get_insert_query():
    """
    Returns SQL INSERT statement for batch loading technologies.
    Use this in your database setup scripts.
    """
    return """
        INSERT INTO technology_cards (
            id, category, name_pt, name_en, emoji,
            description_pt, description_en, color,
            can_connect_to, can_receive_from, is_custom
        ) VALUES (
            %(id)s, %(category)s, %(name_pt)s, %(name_en)s, %(emoji)s,
            %(description_pt)s, %(description_en)s, %(color)s,
            %(can_connect_to)s, %(can_receive_from)s, FALSE
        )
        ON CONFLICT (id) DO NOTHING;
    """


# ============================================================================
# REFERENCE MAPPING (for future integration)
# These IDs should match your existing references table
# ============================================================================

TECHNOLOGY_REFERENCES_MAPPING = {
    # Example mappings - replace with actual reference IDs from your database
    "feed_vinasse": [
        # (reference_id, relevance_note, display_order)
        # Example: (1, "Biogas potential from vinasse", 1),
    ],
    "dig_cstr": [
        # Example: (5, "CSTR design parameters", 1),
        # Example: (12, "Case study Brazil", 2),
    ],
    # Add more mappings as you link to scientific references
}


if __name__ == "__main__":
    print("Technology seed data prepared.")
    print(f"Total technologies: {len(INITIAL_TECHNOLOGIES)}")

    # Count by category
    categories = {}
    for tech in INITIAL_TECHNOLOGIES:
        cat = tech['category']
        categories[cat] = categories.get(cat, 0) + 1

    print("\nBreakdown by category:")
    for cat, count in sorted(categories.items()):
        print(f"  {cat}: {count}")

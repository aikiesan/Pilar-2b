// Auto-generated from CP2B Panorama data
// Source: https://github.com/aikiesan/Panorama_CP2B

import { KineticData, ChemicalData, ScientificReference } from '@/types/scientific'

export const REAL_KINETICS_DATA: KineticData[] = [
  {
    "residue_id": 2,
    "residue_name": "Dejeto de Aves (Cama de Frango)",
    "sector": "livestock",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.2,
    "f_med": 0.4,
    "f_fast": 0.35,
    "fq": 0.95,
    "classification": "medium-fast",
    "bmp_experimental": 275.0,
    "bmp_simulated": 288.75,
    "t50": 5,
    "t80": 12,
    "test_standard": "VDI 4630",
    "temperature": 35,
    "retention_time": 42,
    "references": [
      "Mendes et al. 2023",
      "Guerini Filho et al. 2019",
      "Paranhos et al. 2020"
    ]
  },
  {
    "residue_id": 4,
    "residue_name": "Dejetos de Bovinos (Leite + Corte)",
    "sector": "livestock",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.3,
    "f_med": 0.45,
    "f_fast": 0.2,
    "fq": 0.95,
    "classification": "medium",
    "bmp_experimental": 230.0,
    "bmp_simulated": 241.5,
    "t50": 8,
    "t80": 18,
    "test_standard": "VDI 4630",
    "temperature": 30,
    "retention_time": 30,
    "references": [
      "Mendes et al. 2023",
      "Montoro et al. 2017",
      "Herrero et al. 2018"
    ]
  },
  {
    "residue_id": 5,
    "residue_name": "Vinhaça de Cana-de-açúcar",
    "sector": "agricultural",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.5,
    "f_med": 0.35,
    "f_fast": 0.1,
    "fq": 0.95,
    "classification": "slow",
    "bmp_experimental": 7.08,
    "bmp_simulated": 7.434,
    "t50": 15,
    "t80": 30,
    "test_standard": "VDI 4630",
    "temperature": 30,
    "retention_time": 58,
    "references": [
      "Buller et al. 2021",
      "Silva Neto et al. 2021",
      "Romero et al. 2019"
    ]
  },
  {
    "residue_id": 6,
    "residue_name": "Palha de Cana-de-açúcar (Palhiço)",
    "sector": "agricultural",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.5,
    "f_med": 0.35,
    "f_fast": 0.1,
    "fq": 0.95,
    "classification": "slow",
    "bmp_experimental": 300.0,
    "bmp_simulated": 315.0,
    "t50": 15,
    "t80": 30,
    "test_standard": "VDI 4630",
    "temperature": 35,
    "retention_time": 40,
    "references": [
      "Buller et al. 2021",
      "Silva Neto et al. 2021",
      "Romero et al. 2019"
    ]
  },
  {
    "residue_id": 7,
    "residue_name": "Torta de Filtro (Filter Cake)",
    "sector": "agricultural",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.3,
    "f_med": 0.45,
    "f_fast": 0.2,
    "fq": 0.95,
    "classification": "medium",
    "bmp_experimental": 357.5,
    "bmp_simulated": 375.375,
    "t50": 8,
    "t80": 18,
    "test_standard": "VDI 4630",
    "temperature": 35,
    "retention_time": 40,
    "references": [
      "Errera et al. 2025"
    ]
  },
  {
    "residue_id": 8,
    "residue_name": "Dejetos de Suínos",
    "sector": "livestock",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.2,
    "f_med": 0.4,
    "f_fast": 0.35,
    "fq": 0.95,
    "classification": "medium-fast",
    "bmp_experimental": 300.0,
    "bmp_simulated": 315.0,
    "t50": 5,
    "t80": 12,
    "test_standard": "VDI 4630",
    "temperature": 35,
    "retention_time": 25,
    "references": [
      "Análise 1-8 papers consolidados et al. 2024",
      "Ceretta et al. 2003",
      "Ribeiro et al. 2013"
    ]
  },
  {
    "residue_id": 9,
    "residue_name": "Dejeto de Codornas",
    "sector": "livestock",
    "k_slow": 0.05,
    "k_med": 0.5,
    "k_fast": 5.0,
    "f_slow": 0.3,
    "f_med": 0.45,
    "f_fast": 0.2,
    "fq": 0.95,
    "classification": "medium",
    "bmp_experimental": 250,
    "bmp_simulated": 262,
    "t50": 8,
    "t80": 18,
    "test_standard": "VDI 4630",
    "temperature": 37,
    "retention_time": 30,
    "references": [
      "Sousa et al. et al. 2012"
    ]
  }
]

export const REAL_CHEMICAL_DATA: ChemicalData[] = [
  {
    "residue_id": 2,
    "residue_name": "Dejeto de Aves (Cama de Frango)",
    "sector": "livestock",
    "bmp": 275.0,
    "moisture": 57.5,
    "ts": 42.5,
    "vs": 75.0,
    "cn_ratio": 11.5,
    "data_quality": "excellent",
    "source_type": "literature",
    "ch4_content": 57.5,
    "ph": 7.4,
    "cod": 296900.0
  },
  {
    "residue_id": 4,
    "residue_name": "Dejetos de Bovinos (Leite + Corte)",
    "sector": "livestock",
    "bmp": 230.0,
    "moisture": 88.5,
    "ts": 11.5,
    "vs": 82.5,
    "cn_ratio": 20.0,
    "data_quality": "excellent",
    "source_type": "literature",
    "ch4_content": 60.0,
    "ph": 7.0,
    "cod": 174000.0
  },
  {
    "residue_id": 5,
    "residue_name": "Vinhaça de Cana-de-açúcar",
    "sector": "agricultural",
    "bmp": 7.08,
    "moisture": 92.0,
    "ts": 8.0,
    "vs": 75.0,
    "cn_ratio": 32.5,
    "data_quality": "excellent",
    "source_type": "literature",
    "ch4_content": 72.5,
    "ph": 4.25,
    "cod": 30000.0
  },
  {
    "residue_id": 6,
    "residue_name": "Palha de Cana-de-açúcar (Palhiço)",
    "sector": "agricultural",
    "bmp": 300.0,
    "moisture": 11.5,
    "ts": 88.5,
    "vs": 90.5,
    "cn_ratio": 100.0,
    "data_quality": "excellent",
    "source_type": "literature",
    "ch4_content": 52.5
  },
  {
    "residue_id": 7,
    "residue_name": "Torta de Filtro (Filter Cake)",
    "sector": "agricultural",
    "bmp": 357.5,
    "moisture": 75.0,
    "ts": 25.0,
    "vs": 77.5,
    "cn_ratio": 20.0,
    "data_quality": "excellent",
    "source_type": "literature",
    "ch4_content": 60.0,
    "ph": 7.0,
    "cod": 400000.0
  },
  {
    "residue_id": 8,
    "residue_name": "Dejetos de Suínos",
    "sector": "livestock",
    "bmp": 300.0,
    "moisture": 97.0,
    "ts": 3.0,
    "vs": 70.0,
    "cn_ratio": 12.5,
    "data_quality": "excellent",
    "source_type": "literature",
    "ch4_content": 67.5,
    "ph": 7.0,
    "cod": 30000.0
  },
  {
    "residue_id": 9,
    "residue_name": "Dejeto de Codornas",
    "sector": "livestock",
    "bmp": 250,
    "moisture": 75.5,
    "ts": 24.5,
    "vs": 74.48,
    "cn_ratio": 20,
    "data_quality": "excellent",
    "source_type": "literature",
    "ph": 6.01,
    "cod": 7640.0
  }
]

export const REAL_REFERENCES: ScientificReference[] = [
  {
    "id": 1,
    "title": "An overview of the integrated biogas production through agro-industrial and livestock residues in the Brazilian São Paulo state",
    "authors": "Mendes, F.B.; Volpi, M.P.C. et al.",
    "year": 2023,
    "journal": "Biofuels, Bioproducts and Biorefining",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp",
      "cn"
    ],
    "abstract": "BMP co-digestão palha trigo: 330-600 L biogás/kg VS | Valoração econômica: US$ 37,74/ton cama de frango | Competição forte com mercado fertilizante orgânico | C/N ótimo 20-35, cama frango 7,85 requer co-substrato",
    "data_quality": "excellent",
    "doi": "10.1002/bbb.2461"
  },
  {
    "id": 2,
    "title": "Biomass availability assessment for biogas or methane production in Rio Grande do Sul, Brazil",
    "authors": "Guerini Filho, M. et al.",
    "year": 2019,
    "journal": "Clean Technologies and Environmental Policy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "METODOLOGIA 3 CENÁRIOS validada: Teórico-Prático-Real | FC=0,20 sistemas extensivos | FCp: cama frango EXCLUÍDA Cenário III por competição fertilizante | Taxa geração: 0,15 kg/ave/dia | TS=18%, VS=63%TS | 55% CH₄ no biogás",
    "data_quality": "excellent",
    "doi": "10.1007/s10098-019-01710-3"
  },
  {
    "id": 3,
    "title": "Methane production by co-digestion of poultry manure and lignocellulosic biomass: Kinetic and energy assessment",
    "authors": "Paranhos, A.G.O. et al.",
    "year": 2020,
    "journal": "Bioresource Technology",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp",
      "cn"
    ],
    "abstract": "BMP EXPERIMENTAL Brasil: 291,39 NL CH₄/kg VS (sabugo milho+cama) vs 99,3 (cama sozinha) | HRT=60 dias máxima produção | C/N=7,85 | TAN <2 g/L ideal, inibição 3-6 g/L | Temp=35°C | F/I=0,5 ótimo | Geração nacional: 230 Mi ton/ano",
    "data_quality": "excellent",
    "doi": "10.1016/j.biortech.2019.122588"
  },
  {
    "id": 4,
    "title": "Energy potential of poultry litter for the production of biogas",
    "authors": "Onofre, T.G. et al.",
    "year": 2015,
    "journal": "African Journal of Agricultural Research",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "CAMPO Paraná: 0,643-3,285 m³ biogás/kg cama (conservador-ótimo) | 60-70% CH₄ | HRT=56 dias | 51,2 Mi kg/ano geração regional | Biodigestor Indian batch | Temp 15-37°C ambiente",
    "data_quality": "good",
    "doi": "10.5897/AJAR2015.9932"
  },
  {
    "id": 5,
    "title": "Policy, regulatory issues, and case studies of full-scale projects",
    "authors": "Various authors",
    "year": 2025,
    "journal": "Elsevier Book Chapter",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Potencial técnico Brasil: 81,8-84,6 bilhões m³ biogás/ano | Produção atual 2021-22: 2,3-2,8 bi m³ | Projeção 2030: 6,9 bi m³ | Gado+aves: 16,8 bi m³ | Cana vinhaça: 39,8 bi m³ | OLR planta USP-SP: 2,9-4,0 kg VS/m³/dia",
    "data_quality": "good",
    "doi": "10.1016/B978-0-323-91150-3.00004-X"
  },
  {
    "id": 6,
    "title": "Biorefinery study of availability of agriculture residues and wastes for integrated biorefineries in Brazil",
    "authors": "Forster-Carneiro, T. et al.",
    "year": 2013,
    "journal": "Resources, Conservation and Recycling",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "GP INDEX = 1,58 t resíduo/t produto avícola (METODOLOGIA BASELINE CP2B) | Geração nacional 2009: 18,36 Mi ton | Projeção 2020: 26,27 Mi ton (+43%) | Sistemas confinados únicos viáveis | Múltiplos usos competitivos",
    "data_quality": "excellent",
    "doi": "10.1016/j.resconrec.2013.05.007"
  },
  {
    "id": 7,
    "title": "Determination of methane generation potential and evaluation of kinetic models in poultry wastes",
    "authors": "Silva, T.H.L. et al.",
    "year": 2021,
    "journal": "Biocatalysis and Agricultural Biotechnology",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp",
      "ph"
    ],
    "abstract": "BMP=101,4 NmL CH₄/g VS | Modelo Gompertz R²=0,89-1,00 | k hidról=0,02-0,10/dia | Fase lag=0,79-6,62 dias | pH 7,7-8,8 com NaHCO₃ | Condutividade 7669-14130 µS/cm final | HRT=47 dias",
    "data_quality": "good",
    "doi": "10.1016/j.bcab.2021.101936"
  },
  {
    "id": 8,
    "title": "Reducing the environmental impacts of Brazilian chicken meat production using different waste recovery strategies",
    "authors": "Santos, R.A. et al.",
    "year": 2023,
    "journal": "Journal of Environmental Management",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Aves (Cama de Frango)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "VALIDAÇÃO FCp: Valor econômico cama US$ 0,03/kg | Mercado total US$ 235.413/ano (2,49% produção) | Alocação econômica 16,08% com biodigestão | 50,35% acidificação terrestre se uso direto fertilizante | Coef biogás: 0,01712 m³/kg",
    "data_quality": "good",
    "doi": "10.1016/j.jenvman.2023.118021"
  },
  {
    "id": 9,
    "title": "An overview of the integrated biogas production - São Paulo state",
    "authors": "Mendes, F.B.; Volpi, M.P.C. et al.",
    "year": 2023,
    "journal": "WIREs Energy and Environment",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "Custos co-substratos: Vinhaça USD 3,75/ton SV | C/N=14,0 bovinos",
    "data_quality": "excellent",
    "doi": "10.1002/wene.454"
  },
  {
    "id": 10,
    "title": "Economic viability digester cattle confinement beef",
    "authors": "Montoro, S.B. et al.",
    "year": 2017,
    "journal": "Engenharia Agrícola",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "TIR 26,6%, payback 6,2 anos | CAPEX R$ 10.339/kWe | BMP=0,27",
    "data_quality": "excellent",
    "doi": "10.1590/1809-4430-Eng.Agric.v37n2p353-365"
  },
  {
    "id": 11,
    "title": "Dairy Manure Management: Perceptions South American",
    "authors": "Herrero, M.A.; Palhares, J.C.P. et al.",
    "year": 2018,
    "journal": "Frontiers Sustainable Food Systems",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "97% potencial PERDIDO | FCon=0,40, FEq=0,31, FReg=0,49-0,76",
    "data_quality": "excellent",
    "doi": "10.3389/fsufs.2018.00022"
  },
  {
    "id": 12,
    "title": "Technical assessment mono-digestion co-digestion biogas Brazil",
    "authors": "Velásquez Piñas, J.A. et al.",
    "year": 2018,
    "journal": "Renewable Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp",
      "cn"
    ],
    "abstract": "BMP=0,28 Nm³/kg SV (padrão) | Range 0,18-0,52 | C/N=15,44",
    "data_quality": "good",
    "doi": "10.1016/j.renene.2017.10.085"
  },
  {
    "id": 13,
    "title": "Anaerobic co-digestion sweet potato dairy cattle manure",
    "authors": "Montoro, S.B. et al.",
    "year": 2019,
    "journal": "Journal of Cleaner Production",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Co-digestão batata-doce +44,6% BMP | TIR 47-57%, payback 2-3 anos",
    "data_quality": "excellent",
    "doi": "10.1016/j.jclepro.2019.04.148"
  },
  {
    "id": 14,
    "title": "Economic holistic feasibility centralized decentralized biogas",
    "authors": "Velásquez Piñas, J.A. et al.",
    "year": 2019,
    "journal": "Renewable Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Mínimo viável ≥740 kWe (197 vacas) | TIR 18,2% sem subsídios",
    "data_quality": "excellent",
    "doi": "10.1016/j.renene.2019.02.053"
  },
  {
    "id": 15,
    "title": "Biogas potential biowaste Rio de Janeiro Brazil",
    "authors": "Oliveira, H.R. et al.",
    "year": 2024,
    "journal": "Renewable Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "BMP Embrapa: 0,210-0,230 Nm³/kg SV | Corte 43,9 L/dia, Leite 93,7 L/dia",
    "data_quality": "good",
    "doi": "10.1016/j.renene.2023.119751"
  },
  {
    "id": 16,
    "title": "Life cycle assessment milk production anaerobic treatment manure",
    "authors": "Maciel, A.M. et al.",
    "year": 2022,
    "journal": "Sustainable Energy Technologies",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Redução GEE 25-54% | 65% CH₄ no biogás | TRH 32 dias plug-flow",
    "data_quality": "good",
    "doi": "10.1016/j.seta.2022.102883"
  },
  {
    "id": 17,
    "title": "Bioenergetic Potential Coffee Processing Residues Industrial Symbiosis",
    "authors": "Albarracin, L.T. et al.",
    "year": 2024,
    "journal": "Resources",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Co-digestão café 40%: +138% BMP | TIR 60%, payback 2,1 anos",
    "data_quality": "excellent",
    "doi": "10.3390/resources13020021"
  },
  {
    "id": 18,
    "title": "Milk production family agro-industries São Paulo Carbon balance",
    "authors": "Silva, M.C. et al.",
    "year": 2024,
    "journal": "Int. J. Life Cycle Assessment",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Bovinos (Leite + Corte)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Pegada 2.408 kg CO₂eq/1000 kg leite | Biodigestão -25-54%",
    "data_quality": "excellent",
    "doi": "10.1007/s11367-023-02157-x"
  },
  {
    "id": 19,
    "title": "A spatially explicit assessment of sugarcane vinasse as a sustainable by-product",
    "authors": "Buller, L.S.; Romero, C.W.; Lamparelli, R.A.C. et al.",
    "year": 2021,
    "journal": "Science of the Total Environment",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp",
      "cn",
      "ph",
      "cod"
    ],
    "abstract": "Vinhaça in natura: TS=3,69%, VS=61,16%TS, COD=20.866 mg/L, C/N=16,78, pH=4,67 | CH₄=49% (dia 58) | Potencial elétrico 0,0028 MWh/m³",
    "data_quality": "excellent",
    "doi": "10.1016/j.scitotenv.2020.142717"
  },
  {
    "id": 20,
    "title": "Potential impacts vinasse biogas replacing fossil oil power generation",
    "authors": "Silva Neto, J.V.; Gallo, W.L.R.",
    "year": 2021,
    "journal": "Renewable and Sustainable Energy Reviews",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp",
      "cod"
    ],
    "abstract": "BMP=7,08 Nm³ CH₄/m³ vinhaça (COD=31,5 kg/m³, MCF=0,225) | Substitução combustível fóssil SP | Geração elétrica potencial",
    "data_quality": "excellent",
    "doi": "10.1016/j.rser.2020.110281"
  },
  {
    "id": 21,
    "title": "Assessment agricultural biomass residues replace fossil fuel hydroelectric",
    "authors": "Romero, C.W.; Berni, M.D.; Figueiredo, G.K. et al.",
    "year": 2019,
    "journal": "Energy Science & Engineering",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "FC=0,60 para palha (fração sustentável de 14 Mg/ha) | Lignina 25%, Celulose 40%, Hemicelulose 30% | Co-digestão vinhaça",
    "data_quality": "excellent",
    "doi": "10.1002/ese3.462"
  },
  {
    "id": 22,
    "title": "Long-term decomposition sugarcane harvest residues São Paulo",
    "authors": "Fortes, C.; Trivelin, P.C.O.; Vitti, A.C.",
    "year": 2012,
    "journal": "Biomass and Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "Post-Harvest Trash: C=44,4%, N=0,41%, C/N=108 | Lignina=24,6%, Celulose=43,9%, Hemi=26,4% | Decomposição lenta",
    "data_quality": "good",
    "doi": "10.1016/j.biombioe.2012.03.011"
  },
  {
    "id": 23,
    "title": "Contribution N from green harvest residues sugarcane nutrition Brazil",
    "authors": "Ferreira, D.A.; Franco, H.C.J.; Otto, R. et al.",
    "year": 2016,
    "journal": "GCB Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "C/N=100 típico palha | Apenas 16,2% N recuperado pela cultura (3 ciclos) | C=39-45%, N=0,46-0,65%",
    "data_quality": "good",
    "doi": "10.1111/gcbb.12292"
  },
  {
    "id": 24,
    "title": "Soil GHG fluxes vinasse burnt unburnt sugarcane",
    "authors": "Oliveira, B.G.; Carvalho, J.L.N. et al.",
    "year": 2013,
    "journal": "Geoderma",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "N₂O EF: 0.68% (burnt) 0.44% (unburnt) | CO₂eq: 0.491/0.314 kg/m³ | C/N=8.65 | TOC=1.99 g/L",
    "data_quality": "excellent",
    "doi": "10.1016/j.geoderma.2013.02.009"
  },
  {
    "id": 25,
    "title": "Economic viability biogas vinasse sugarcane",
    "authors": "Pereira, L.G.; Cavalett, O.; Bonomi, A.",
    "year": 2020,
    "journal": "Energies",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp",
      "cod"
    ],
    "abstract": "LCOE: 55.8-133.7 USD/MWh | BMP: 0.39 m³/kg COD | Viável >8.058 ha | NPV positivo escala",
    "data_quality": "excellent",
    "doi": "10.3390/en13174413"
  },
  {
    "id": 26,
    "title": "Centralized distributed biogas hubs vinasse",
    "authors": "Pavan, M.C.; Aniceto, J.P.S.; Silva, R.C.",
    "year": 2021,
    "journal": "Renewable Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "UASB: 77.9 USD/m³ | Generator: 549.8 USD/kW | Centralizado vs Distribuído | CH₄=60%",
    "data_quality": "good",
    "doi": "10.1016/j.renene.2021.04.070"
  },
  {
    "id": 27,
    "title": "Anaerobic Biological Treatment Vinasse Environmental Compliance Methane",
    "authors": "Albanez, R. et al.",
    "year": 2016,
    "journal": "Appl Biochem Biotechnol",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp",
      "cod"
    ],
    "abstract": "AnSBBR reactor: BMP=9,47 mol CH₄/kg COD | CH₄=77% | OLR=5,54 g COD/L/dia | T=30°C | Scale-up: 17 MW energia",
    "data_quality": "excellent",
    "doi": "10.1007/s12010-015-1856-z"
  },
  {
    "id": 28,
    "title": "Biogas biofertilizer from vinasse making sugarcane ethanol sustainable",
    "authors": "Sica, P.; Carvalho, R. et al.",
    "year": 2020,
    "journal": "J Material Cycles Waste Management",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Vinhaça de Cana-de-açúcar"
    ],
    "parameters_measured": [
      "bmp",
      "ph",
      "cod"
    ],
    "abstract": "UASB: BMP=0,19-0,25 L CH₄/g COD | pH neutralizado 4,5→7,0 | COD=23-41 g/L | T=37,5°C | Vinhaça:Etanol=12,5:1",
    "data_quality": "excellent",
    "doi": "10.1007/s10163-020-01029-y"
  },
  {
    "id": 29,
    "title": "A spatially explicit assessment of sugarcane vinasse as a sustainable by-product",
    "authors": "Buller, L.S.; Romero, C.W.; Lamparelli, R.A.C. et al.",
    "year": 2021,
    "journal": "Science of the Total Environment",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp",
      "cn",
      "ph",
      "cod"
    ],
    "abstract": "Vinhaça in natura: TS=3,69%, VS=61,16%TS, COD=20.866 mg/L, C/N=16,78, pH=4,67 | CH₄=49% (dia 58) | Potencial elétrico 0,0028 MWh/m³",
    "data_quality": "excellent",
    "doi": "10.1016/j.scitotenv.2020.142717"
  },
  {
    "id": 30,
    "title": "Potential impacts vinasse biogas replacing fossil oil power generation",
    "authors": "Silva Neto, J.V.; Gallo, W.L.R.",
    "year": 2021,
    "journal": "Renewable and Sustainable Energy Reviews",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp",
      "cod"
    ],
    "abstract": "BMP=7,08 Nm³ CH₄/m³ vinhaça (COD=31,5 kg/m³, MCF=0,225) | Substitução combustível fóssil SP | Geração elétrica potencial",
    "data_quality": "excellent",
    "doi": "10.1016/j.rser.2020.110281"
  },
  {
    "id": 31,
    "title": "Assessment agricultural biomass residues replace fossil fuel hydroelectric",
    "authors": "Romero, C.W.; Berni, M.D.; Figueiredo, G.K. et al.",
    "year": 2019,
    "journal": "Energy Science & Engineering",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "FC=0,60 para palha (fração sustentável de 14 Mg/ha) | Lignina 25%, Celulose 40%, Hemicelulose 30% | Co-digestão vinhaça",
    "data_quality": "excellent",
    "doi": "10.1002/ese3.462"
  },
  {
    "id": 32,
    "title": "Long-term decomposition sugarcane harvest residues São Paulo",
    "authors": "Fortes, C.; Trivelin, P.C.O.; Vitti, A.C.",
    "year": 2012,
    "journal": "Biomass and Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "Post-Harvest Trash: C=44,4%, N=0,41%, C/N=108 | Lignina=24,6%, Celulose=43,9%, Hemi=26,4% | Decomposição lenta",
    "data_quality": "good",
    "doi": "10.1016/j.biombioe.2012.03.011"
  },
  {
    "id": 33,
    "title": "Contribution N from green harvest residues sugarcane nutrition Brazil",
    "authors": "Ferreira, D.A.; Franco, H.C.J.; Otto, R. et al.",
    "year": 2016,
    "journal": "GCB Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "C/N=100 típico palha | Apenas 16,2% N recuperado pela cultura (3 ciclos) | C=39-45%, N=0,46-0,65%",
    "data_quality": "good",
    "doi": "10.1111/gcbb.12292"
  },
  {
    "id": 34,
    "title": "GHG emissions sugarcane straw removal levels",
    "authors": "Vasconcelos, A.L.S.; Cherubin, M.R. et al.",
    "year": 2018,
    "journal": "Biomass and Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "C/N=51.2 | N₂O: 0.14-0.72% | T½: 147-231 dias | GHG neutral: 3.5 Mg/ha | C=42%, N=0.82%",
    "data_quality": "excellent",
    "doi": "10.1016/j.biombioe.2018.03.002"
  },
  {
    "id": 35,
    "title": "Economic evaluation baling sugarcane straw",
    "authors": "Lemos, S.V.; Ferreira, M.C.; Almeida-Cortez, J.S.",
    "year": 2014,
    "journal": "Biomass and Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Coleta: 56-58 USD/ha | Round: 7.81 ton/ha | Square: 6.41 ton/ha | Preço: 32.68 USD/ton",
    "data_quality": "excellent",
    "doi": "10.1016/j.biombioe.2014.03.047"
  },
  {
    "id": 36,
    "title": "Evolution GHG emissions sugarcane harvesting 1990-2009",
    "authors": "Capaz, R.S.; Carvalho, J.L.N.; Nogueira, L.A.H.",
    "year": 2013,
    "journal": "Applied Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Redução 39.3% GEE (1990-2009) | Straw/stalk: 18% | Yield: 14.4 Mg/ha | Range SP: 12.5-24.9",
    "data_quality": "good",
    "doi": "10.1016/j.apenergy.2012.08.040"
  },
  {
    "id": 37,
    "title": "Soil carbon stocks burned vs unburned sugarcane",
    "authors": "Galdos, M.V.; Cerri, C.C.; Cerri, C.E.P.",
    "year": 2009,
    "journal": "Geoderma",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Green cane: aumento C solo | Litter layer: CMB alto | Valida importância cobertura palha",
    "data_quality": "good",
    "doi": "10.1016/j.geoderma.2009.08.025"
  },
  {
    "id": 38,
    "title": "Sugarcane straw removal effects Ultisols Oxisols south-central Brazil",
    "authors": "Satiro, L.S. et al.",
    "year": 2017,
    "journal": "Geoderma Regional",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Cenários remoção: 0%=15,6 Mg/ha | 50%=8,7 Mg/ha (sustentável Oxisol) | Impacto Ca, Mg, K",
    "data_quality": "good",
    "doi": "10.1016/j.geodrs.2017.10.005"
  },
  {
    "id": 39,
    "title": "Prediction Sugarcane Yield NDVI Leaf-Tissue Nutrients Straw Removal",
    "authors": "Lisboa, I.P. et al.",
    "year": 2018,
    "journal": "Agronomy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Cana-de-açúcar (Palhiço)"
    ],
    "parameters_measured": [
      "cn"
    ],
    "abstract": "C=44,5%, N=0,39%, C/N=114 (range 73-177) | P=0,04%, K=0,15% | Straw 0% removal: 16,2 Mg/ha",
    "data_quality": "good",
    "doi": "10.3390/agronomy8090196"
  },
  {
    "id": 40,
    "title": "Policy regulatory issues full-scale biogas projects Brazil",
    "authors": "Errera, M.R. et al.",
    "year": 2025,
    "journal": "From Crops Wastes to Bioenergy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Torta de Filtro (Filter Cake)"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "Vinhaça+Torta: 39,8 bilhões Nm³/ano Brasil | Setor açúcar-álcool principal fonte biogás",
    "data_quality": "excellent",
    "doi": "10.1016/B978-0-443-16084-4.00020-1"
  },
  {
    "id": 41,
    "title": "Swine waste biogas production São Paulo",
    "authors": "Análise 1-8 papers consolidados",
    "year": 2024,
    "journal": "Revista Técnica",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp",
      "cn"
    ],
    "abstract": "BMP: 350-450 NL/kg SV | TS: 2,5-10% | C/N: 8-15 | Clusters SP identificados",
    "data_quality": "good",
    "doi": "10.5281/zenodo.8234567"
  },
  {
    "id": 42,
    "title": "Características químicas solo aplicação esterco líquido suínos pastagem",
    "authors": "Ceretta, C.A.; Durigon, R. et al.",
    "year": 2003,
    "journal": "Pesquisa Agropecuária Brasileira",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "FCp=1,00 (100% aplicação direta) | N=3,23 kg/m³ P=3,64 kg/m³ (2-3× típico) | Baseline pré-biodigestores | Perdas N: 47-65%",
    "data_quality": "excellent",
    "doi": "10.1590/S0100-204X2003000300010"
  },
  {
    "id": 43,
    "title": "Potentialities energy generation waste feedstock agricultural sector Brazil Paraná",
    "authors": "Ribeiro, M.F.S.; Raiher, A.P.",
    "year": 2013,
    "journal": "Energy Policy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "BMP=0,29 Nm³/kg SV | RPR=5,90 m³/dia/cabeça | FC=0,70 (plantel comercial) | FS=0,88 (320 dias/ano) | 39,4% usinas PR escala viável",
    "data_quality": "excellent",
    "doi": "10.1016/j.enpol.2013.05.084"
  },
  {
    "id": 44,
    "title": "Application cleaner production methodology evaluate generation bioenergy small swine farm",
    "authors": "Leite, S.A.F. et al.",
    "year": 2014,
    "journal": "Chemical Engineering Transactions",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "BMP=0,30 Nm³/kg SV (validado SV e DBO) | Variação sazonal SV: 2,4× | Pequena propriedade 323 cabeças | Barreira investimento USD 250/suíno",
    "data_quality": "excellent",
    "doi": "10.3303/CET1439099"
  },
  {
    "id": 45,
    "title": "Life cycle assessment swine production Brazil comparison four manure management systems",
    "authors": "Cherubini, E. et al.",
    "year": 2015,
    "journal": "Journal of Cleaner Production",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "FCp=0,80 VALIDADO (80% lagoas abertas) | <1% CHP energia | Paradoxo NH₃: biodigestão +8% acidificação | ACV completa",
    "data_quality": "excellent",
    "doi": "10.1016/j.jclepro.2014.10.035"
  },
  {
    "id": 46,
    "title": "Influence solid-liquid separation strategy biogas yield stratified swine production system",
    "authors": "Amaral, A.C.; Kunz, A. et al.",
    "year": 2016,
    "journal": "Journal of Environmental Management",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "BMP fase: Creche 642, Terminação 303, Gestação 170 NmL/g SV | Média ciclo: 0,36 Nm³/kg SV VALIDA CP2B | Armazenamento >15d: SV <1%",
    "data_quality": "excellent",
    "doi": "10.1016/j.jenvman.2015.12.014"
  },
  {
    "id": 47,
    "title": "Effect storage time swine manure solid separation efficiency screening",
    "authors": "Kunz, A.; Steinmetz, R.L.R. et al.",
    "year": 2009,
    "journal": "Bioresource Technology",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "FC TEMPORAL: <7d FC=0,90 | 8-15d FC=0,65 | >15d FC=0,50 | DQO solubilização +76% em 29 dias | Ammonificação 24 mg/L/dia",
    "data_quality": "excellent",
    "doi": "10.1016/j.biortech.2008.09.022"
  },
  {
    "id": 48,
    "title": "Eficiência energética sistema produção suínos tratamento resíduos biodigestor",
    "authors": "Angonese, A.R. et al.",
    "year": 2006,
    "journal": "Rev. Bras. Eng. Agrícola Ambiental",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "SAF=16,5% (energia biogás+biofertilizante) VALIDA CP2B 15,3% | BMP implícito 0,30 | TRH 10 dias (curto) | 650 terminação",
    "data_quality": "good",
    "doi": "10.1590/S1415-43662006000400001"
  },
  {
    "id": 49,
    "title": "Utility specific biomarkers assess safety swine manure biofertilizing purposes",
    "authors": "Fongaro, G. et al.",
    "year": 2014,
    "journal": "Science of the Total Environment",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejetos de Suínos"
    ],
    "parameters_measured": [
      "bmp"
    ],
    "abstract": "FS SAZONALIDADE: Temperatura 1,6-1,8× | NH₃ 2,3-2,9× verão vs inverno | Salmonella 2,7× verão | 93,5% PCV2 infeccioso pós-biodigestão",
    "data_quality": "good",
    "doi": "10.1016/j.scitotenv.2014.02.004"
  },
  {
    "id": 50,
    "title": "Chemical microbiological characterization quail wastes",
    "authors": "Sousa et al.",
    "year": 2012,
    "journal": "ASABE Annual Meeting",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "livestock",
    "residues_studied": [
      "Dejeto de Codornas"
    ],
    "parameters_measured": [
      "ph"
    ],
    "abstract": "TS=24,5% VS=74,5%TS pH=6,01",
    "data_quality": "good",
    "doi": "10.13031/2013.42154"
  },
  {
    "id": 51,
    "title": "Biogas from waste: An overview of anaerobic digestion in Brazil",
    "authors": "Salomon, K.R.; Lora, E.E.S.",
    "year": 2009,
    "journal": "Renewable and Sustainable Energy Reviews",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "urban",
    "residues_studied": [
      "Resíduos Sólidos Urbanos (RSU)",
      "Lodo de Esgoto"
    ],
    "parameters_measured": [
      "bmp",
      "vs"
    ],
    "abstract": "Potencial biogás RSU: 15-20 Mm³/dia Brasil | Lodo esgoto: BMP 250-350 L/kg VS | ETEs Brasileiras: 60% potencial não aproveitado | Metanização 55-65% CH₄",
    "data_quality": "excellent",
    "doi": "10.1016/j.rser.2008.06.006"
  },
  {
    "id": 52,
    "title": "Energy recovery from municipal solid waste by anaerobic digestion: A review",
    "authors": "Campuzano, R.; González-Martínez, S.",
    "year": 2016,
    "journal": "Applied Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "urban",
    "residues_studied": [
      "Resíduos Sólidos Urbanos (RSU)",
      "Fração Orgânica MSW (FORSU)"
    ],
    "parameters_measured": [
      "bmp",
      "cn"
    ],
    "abstract": "BMP FORSU: 400-600 L/kg VS | Teor orgânico: 40-60% MSW | Pré-tratamento aumenta BMP 20-40% | C/N ideal FORSU: 25-30 | Co-digestão melhora estabilidade",
    "data_quality": "excellent",
    "doi": "10.1016/j.apenergy.2015.10.109"
  },
  {
    "id": 53,
    "title": "Coffee waste valorization: A review",
    "authors": "Campos-Vega, R. et al.",
    "year": 2015,
    "journal": "Critical Reviews in Food Science and Nutrition",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Resíduos de Café"
    ],
    "parameters_measured": [
      "bmp",
      "vs",
      "cn"
    ],
    "abstract": "BMP casca café: 200-350 L/kg VS | VS: 85-95% TS | C/N: 20-25 | Compostos fenólicos inibidores: 2-5% | Co-digestão essencial para estabilidade | Produção Brasil: 2,5 Mt/ano resíduos",
    "data_quality": "excellent",
    "doi": "10.1080/10408398.2013.812059"
  },
  {
    "id": 54,
    "title": "Biogas production from coffee pulp: Optimization and kinetic modeling",
    "authors": "Neves, L.; Oliveira, R.; Alves, M.M.",
    "year": 2019,
    "journal": "Waste Management",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Resíduos de Café"
    ],
    "parameters_measured": [
      "bmp",
      "kinetics"
    ],
    "abstract": "BMP otimizado polpa café: 380 ± 25 L/kg VS | k_h = 0.18 d⁻¹ | Pré-tratamento térmico +35% BMP | OLR máxima: 3,5 kg VS/m³/d | HRT ideal: 25 dias | CH₄: 58-62%",
    "data_quality": "excellent",
    "doi": "10.1016/j.wasman.2019.03.032"
  },
  {
    "id": 55,
    "title": "Anaerobic digestion of corn stover for biogas production: Effect of pretreatments",
    "authors": "Li, Y.; Park, S.Y.; Zhu, J.",
    "year": 2011,
    "journal": "Bioresource Technology",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Palha de Milho"
    ],
    "parameters_measured": [
      "bmp",
      "vs"
    ],
    "abstract": "BMP palha milho: 180-220 L/kg VS (sem pré-tratamento) | 320-380 L/kg VS (com pré-tratamento alcalino) | Lignina: 15-20% limita digestão | Co-digestão esterco bovino melhora C/N | Disponibilidade Brasil: 15 Mt/ano",
    "data_quality": "excellent",
    "doi": "10.1016/j.biortech.2010.11.128"
  },
  {
    "id": 56,
    "title": "Citrus waste biorefinery: A circular economy approach",
    "authors": "Sharma, K.; Mahato, N.; Lee, Y.R.",
    "year": 2019,
    "journal": "Bioresource Technology",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Resíduos de Citros"
    ],
    "parameters_measured": [
      "bmp",
      "vs",
      "cn"
    ],
    "abstract": "BMP cascas citros: 250-450 L/kg VS | Limoneno inibidor (remoção necessária) | VS: 90-95% TS | C/N: 15-20 | Produção SP: 8 Mt/ano laranjas | D-limoneno: extração prévia valoriza resíduo",
    "data_quality": "excellent",
    "doi": "10.1016/j.biortech.2019.121925"
  },
  {
    "id": 57,
    "title": "Soybean processing waste for biogas production: A review",
    "authors": "Oliveira, F.C.C.; Coelho, S.T.",
    "year": 2017,
    "journal": "Renewable Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "agricultural",
    "residues_studied": [
      "Resíduos de Soja"
    ],
    "parameters_measured": [
      "bmp",
      "vs"
    ],
    "abstract": "BMP glicerol bruto biodiesel soja: 400-700 L/kg VS | Casca soja: 200-280 L/kg VS | VS casca: 92-96% TS | Proteína alta casca favorece digestão | Produção Brasil: 120 Mt/ano soja",
    "data_quality": "excellent",
    "doi": "10.1016/j.renene.2016.11.056"
  },
  {
    "id": 58,
    "title": "Sewage sludge as biomass energy source in Brazil",
    "authors": "Possetti, G.R.C.; Jasinski, J.; Mañas, A.C.",
    "year": 2020,
    "journal": "Energy",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "urban",
    "residues_studied": [
      "Lodo de Esgoto"
    ],
    "parameters_measured": [
      "bmp",
      "vs",
      "kinetics"
    ],
    "abstract": "BMP lodo primário: 280-350 L/kg VS | Lodo secundário: 180-250 L/kg VS | Geração Brasil: 220 kt VS/ano | Potencial energético: 1,8 TWh/ano | Digestão anaeróbia em 15% ETEs brasileiras",
    "data_quality": "excellent",
    "doi": "10.1016/j.energy.2019.116825"
  },
  {
    "id": 59,
    "title": "Food waste biogas potential in Brazil: Energy and environmental aspects",
    "authors": "Pavi, S.; Kramer, L.E.; Gomes, L.P.; Miranda, L.A.S.",
    "year": 2017,
    "journal": "Renewable and Sustainable Energy Reviews",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "urban",
    "residues_studied": [
      "Resíduos Alimentares",
      "Resíduos de Restaurantes"
    ],
    "parameters_measured": [
      "bmp",
      "cn"
    ],
    "abstract": "BMP resíduos alimentares: 450-650 L/kg VS | Geração Brasil: 41 Mt/ano (26,3 kg/hab/ano) | C/N variável: 14-25 | Potencial biogás: 8,2 bilhões m³/ano | 70% ainda aterrado",
    "data_quality": "excellent",
    "doi": "10.1016/j.rser.2016.12.023"
  },
  {
    "id": 60,
    "title": "Industrial wastewater valorization through anaerobic digestion: Brazilian case studies",
    "authors": "Chernicharo, C.A.L.; van Lier, J.B.; Noyola, A.; Bressani Ribeiro, T.",
    "year": 2015,
    "journal": "Water Science and Technology",
    "reference_type": "journal",
    "peer_reviewed": true,
    "sector": "industrial",
    "residues_studied": [
      "Efluentes Industriais",
      "Resíduos de Frigorífico"
    ],
    "parameters_measured": [
      "bmp",
      "cod"
    ],
    "abstract": "BMP efluente frigorífico: 350-500 L/kg COD | UASB reatores: 15-25°C Brasil | COD remoção: 65-85% | Efluente cervejaria: 280-400 L/kg COD | Setor alimentício: maior potencial energético",
    "data_quality": "excellent",
    "doi": "10.2166/wst.2015.070"
  }
]

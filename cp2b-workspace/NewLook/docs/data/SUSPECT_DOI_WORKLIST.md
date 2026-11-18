# Suspect DOI Worklist — verify & fix manually

42 rows share a DOI across ≥2 different residues (sign of a wrong/reused DOI). For each,
open the URL, confirm the paper, and set the correct DOI (or blank it and keep the URL).

| id | residue | DOI (suspect) | also used on | title | url |
|---|---|---|---|---|---|
| 24 | sangue_animal | `10.1007/s11356-021-16288-2` | visceras_abatedouro | Biowastes of slaughterhouses and wet markets: an overview on managemen | https://pmc.ncbi.nlm.nih.gov/articles/PMC8477996/ |
| 28 | visceras_abatedouro | `10.1007/s11356-021-16288-2` | sangue_animal | Biowastes of slaughterhouses and wet markets: an overview on managemen | https://pmc.ncbi.nlm.nih.gov/articles/PMC8477996/ |
| 20 | cascas_citros_ind | `10.1007/s41207-022-00264-z` | bagaco_cana | Strategies for the sustainable management of orange peel waste through | https://www.sciencedirect.com/science/article/pii/S0301479718301464 |
| 40 | bagaco_cana | `10.1007/s41207-022-00264-z` | cascas_citros_ind | Caracterização Química de Bagaço de Cana-de-açúcar | https://lnbr.cnpem.br/wp-content/uploads/2020/12/Relatorio-Tecnico-Parcial-1_Apendice-2.pdf |
| 366 | sangue_animal | `10.1016/j.biombioe.2009.03.004` | gordura_sebo | AD of slaughterhouse by-products (blood) | https://orbit.dtu.dk/en/publications/anaerobic-digestion-of-slaughterhouse-by-products |
| 369 | gordura_sebo | `10.1016/j.biombioe.2009.03.004` | sangue_animal | Anaerobic digestion of slaughterhouse by-products | https://orbit.dtu.dk/en/publications/anaerobic-digestion-of-slaughterhouse-by-products |
| 239 | bagaco_cana | `10.1016/j.biombioe.2025.108828` | palha_cana; palha_milho; torta_filtro; vinhaca_cana | Prospecting substrates and co-substrates for year-round biogas product | https://doi.org/10.1016/j.biombioe.2025.108828 |
| 240 | vinhaca_cana | `10.1016/j.biombioe.2025.108828` | bagaco_cana; palha_cana; palha_milho; torta_filtro | Prospecting substrates and co-substrates for year-round biogas product | https://doi.org/10.1016/j.biombioe.2025.108828 |
| 241 | palha_milho | `10.1016/j.biombioe.2025.108828` | bagaco_cana; palha_cana; torta_filtro; vinhaca_cana | Prospecting substrates and co-substrates for year-round biogas product | https://doi.org/10.1016/j.biombioe.2025.108828 |
| 242 | torta_filtro | `10.1016/j.biombioe.2025.108828` | bagaco_cana; palha_cana; palha_milho; vinhaca_cana | Prospecting substrates and co-substrates for year-round biogas product | https://doi.org/10.1016/j.biombioe.2025.108828 |
| 243 | palha_cana | `10.1016/j.biombioe.2025.108828` | bagaco_cana; palha_milho; torta_filtro; vinhaca_cana | Prospecting substrates and co-substrates for year-round biogas product | https://doi.org/10.1016/j.biombioe.2025.108828 |
| 53 | dejetos_suinos | `10.1016/j.biortech.2018.04.099` | soro_queijo | Co-digestão anaeróbia de dejetos suínos e bagaço de malte | https://www.ibeas.org.br/conresol/conresol2024/IV-005.pdf |
| 56 | soro_queijo | `10.1016/j.biortech.2018.04.099` | dejetos_suinos | Produção de metano através da co-digestão anaeróbia de soro de leite c | https://www.repositorio.ufal.br/bitstream/123456789/11855/1/Produ%C3%A7%C3%A3o%20de%20metano.pdf |
| 223 | sabugo_milho | `10.1016/j.biosystemseng.2015.10.004` | casca_milho | Potential biogas and methane yield of maize stover fractions and evalu | https://doi.org/10.1016/j.biosystemseng.2015.10.004 |
| 235 | casca_milho | `10.1016/j.biosystemseng.2015.10.004` | sabugo_milho | Potential biogas and methane yield of maize stover fractions and evalu | https://doi.org/10.1016/j.biosystemseng.2015.10.004 |
| 66 | polpa_cafe | `10.1016/j.renene.2018.04.016` | soro_queijo | Biogas production from coffee pulp juice: One- and two-phase systems | https://www.academia.edu/26385939/Biogas_production_from_coffee_pulp_juice_One_and_two_phase_systems |
| 86 | soro_queijo | `10.1016/j.renene.2018.04.016` | polpa_cafe | Caracterização do soro de leite da produção de coalhada e requeijão | https://fatecguaratingueta.edu.br/mostrarji/Anais-VIII-MostraRJI/artigos/publicacao_474.pdf |
| 102 | torta_filtro | `10.1016/j.renene.2019.05.029` | palha_cana | Pre-treatment of filter cake for anaerobic digestion in sugarcane bior | https://www.sciencedirect.com/science/article/pii/S0960148119307451 |
| 107 | palha_cana | `10.1016/j.renene.2019.05.029` | torta_filtro | Optimization of semi-continuous anaerobic digestion of sugarcane straw | https://www.sciencedirect.com/science/article/pii/S0960148119307451 |
| 4 | cascas_citros_ind | `10.1016/j.wasman.2014.06.026` | cascas_citros | Citrus essential oils and their influence on the anaerobic digestion | null |
| 389 | cascas_citros | `10.1016/j.wasman.2014.06.026` | cascas_citros_ind | Citrus essential oils and their influence on the anaerobic digestion p | https://doi.org/10.1016/j.wasman.2014.06.026 |
| 145 | palha_cana | `10.1101/2021.02.19.432018` | vinhaca_cana | Biochemical Methane Potential (BMP) from sugarcane trash and filter ca | https://www.biorxiv.org/content/10.1101/2021.02.19.432018v1 |
| 181 | vinhaca_cana | `10.1101/2021.02.19.432018` | palha_cana | Use of lignocellulosic residue from second-generation ethanol plants:  | https://www.biorxiv.org/content/10.1101/2021.02.19.432018.full |
| 117 | bagaco_cana | `10.1155/2016/8650597` | torta_filtro | Alkaline Pretreatment of Sugarcane Bagasse and Filter Mud Codigested t | https://onlinelibrary.wiley.com/doi/10.1155/2016/8650597 |
| 187 | torta_filtro | `10.1155/2016/8650597` | bagaco_cana | Alkaline Pretreatment of Sugarcane Bagasse and Filter Mud for Enhanced | https://doi.org/10.1155/2016/8650597 |
| 155 | palha_cana | `10.1155/2018/9351848` | torta_filtro | Anaerobic Codigestion of Sugarcane Press Mud with Food Waste | https://doi.org/10.1155/2018/9351848 |
| 191 | torta_filtro | `10.1155/2018/9351848` | palha_cana | Anaerobic Codigestion of Sugarcane Press Mud with Food Waste: Kinetic  | https://doi.org/10.1155/2018/9351848 |
| 1 | vinhaca_cana | `10.1590/18069657rbcs20170405` | polpa_cafe | Anaerobic digestion of vinasse from sugarcane ethanol production in Br | https://www.sciencedirect.com/science/article/pii/S1364032114008326 |
| 12 | polpa_cafe | `10.1590/18069657rbcs20170405` | vinhaca_cana | Caracterização e pré-tratamento da polpa de café | http://www.sapc.embrapa.br/arquivos/consorcio/spcb_anais/simposio7/330.pdf |
| 52 | dejetos_suinos | `10.1590/1809-4430-Eng.Agric.v43n1p1-12/2023` | forsu_ur_rsu; soro_queijo | Caracterização Físico-Química de Efluentes Líquidos de Suinocultura | https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/868199/1/sp17245.pdf |
| 55 | soro_queijo | `10.1590/1809-4430-Eng.Agric.v43n1p1-12/2023` | dejetos_suinos; forsu_ur_rsu | Aplicação de resíduos lácteos vencidos na obtenção de biogás | https://repositorio.unesp.br/handle/11449/202145 |
| 60 | forsu_ur_rsu | `10.1590/1809-4430-Eng.Agric.v43n1p1-12/2023` | dejetos_suinos; soro_queijo | Potencial Bioquímico de Biogás de RSU Fração Orgânica | https://www.ibeas.org.br/conresol/conresol2025/XII-013.pdf |
| 76 | gordura_sebo | `10.1590/S0103-84782004000600033` | levedura_residual | Digestão Anaeróbia – Co-digestão de óleos, gorduras e lactosoro | https://sigarra.up.pt/faup/en/pub_geral.show_file?pi_doc_id=275377 |
| 81 | levedura_residual | `10.1590/S0103-84782004000600033` | gordura_sebo | Aproveitamento de Resíduo de Levedura Cervejeira como Fonte de Nutrien | https://www.cbiotec.ufpb.br/ccbiotec/contents/tccs/ |
| 233 | palha_milho | `10.3390/en13071634` | casca_milho | Chemical composition of maize stover fraction versus methane yield and | https://doi.org/10.3390/en13071634 |
| 236 | casca_milho | `10.3390/en13071634` | palha_milho | Chemical composition of maize stover fraction versus methane yield and | https://doi.org/10.3390/en13071634 |
| 319 | lodo_primario_ete | `10.3390/w11050921` | lodo_secundario_ete | Biochemical Methane Potential (BMP) Assay Method for Anaerobic Digesti | https://doi.org/10.3390/w11050921 |
| 338 | lodo_secundario_ete | `10.3390/w11050921` | lodo_primario_ete | Biochemical Methane Potential (BMP) Assay Method for Anaerobic Digesti | https://doi.org/10.3390/w11050921 |
| 228 | sabugo_milho | `10.5281/zenodo.8635164` | casca_milho | Compositional changes in corn cob and sheath across different maturity | https://www.agronomyjournals.com/archives/2024/vol8issue7/PartA/8-6-164-335.pdf |
| 237 | casca_milho | `10.5281/zenodo.8635164` | sabugo_milho | Compositional changes in corn cob and sheath across different maturity | https://www.agronomyjournals.com/archives/2024/vol8issue7/PartA/8-6-164-335.pdf |
| 363 | sangue_animal | `10.5713/ajas.2013.13537` | visceras_abatedouro | Effects of Substrate to Inoculum Ratio on the Biochemical Methane Pote | https://pmc.ncbi.nlm.nih.gov/articles/PMC4093537/ |
| 378 | visceras_abatedouro | `10.5713/ajas.2013.13537` | sangue_animal | Potential of AD for poultry slaughterhouse | (search AJAS) |
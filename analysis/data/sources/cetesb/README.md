# CETESB IQR (Índice de Qualidade de Aterro de Resíduos), 2022–2024

- `cetesb_iqr_sp_2022_2024.csv`: uma linha por município e ano, com os campos `Codigo`, `Nome`, `IQR` e `Dispoe_em`
  dos shapefiles da CETESB, sem alteração (as geometrias ficaram de fora). `codigo_cetesb` é o código
  da CETESB, não o código IBGE. `Dispoe_em` é o município onde o lixo é disposto, às vezes com sufixo
  (`A.P.`, `CDR`, ou a UF quando fora de SP); o significado de `A.P.` e dos campos vazios não está nos
  metadados e está por conferir. `IQR` = -1 aparece em 8 ou 9 municípios por ano, também por conferir.

Limpeza feita depois da extração (o conteúdo não mudou): no dbf, os `Dispoe_em` sem valor vinham preenchidos
com bytes NUL (263 campos nos três anos); aqui ficaram vazios. As quebras de linha passaram de CRLF para LF.
Um `Dispoe_em` com vírgula lista mais de um destino (ex.: `Jambeiro - A.P., Santos - A.P.`), e alguns nomes
usam crase no lugar do apóstrofo (`Estrela d`Oeste`) ou grafia diferente da do IBGE (`Florínia`, `São Luís do
Paraitinga`, `Sta. Rosa de Viterbo`); `analysis/build_bacias_aterro.py` trata isso e lista o que não casar.

Extraído em 22/10/2026 dos arquivos baixados do DataGeo (datageo.ambiente.sp.gov.br):

| ano | arquivo | registros | sha256 | pedido WFS |
|---|---|---|---|---|
| 2022 | VWM_IQR_CETESB_2022_POLPolygon.dbf | 645 | `5315f5ba4526077d…` | https://datageo.ambiente.sp.gov.br/geoserver/datageo/VWM_IQR_CETESB_2022_POL/wfs?version=1.0.0&request=GetFeature&outputFormat=SHAPE-ZIP&typeName=VWM_IQR_CETESB_2022_POL |
| 2023 | VWM_IQR_CETESB_2023_POLPolygon.dbf | 645 | `ae7802c5ca4f3987…` | https://datageo.ambiente.sp.gov.br/geoserver/datageo/VWM_IQR_CETESB_2023_POL/wfs?version=1.0.0&request=GetFeature&outputFormat=SHAPE-ZIP&typeName=VWM_IQR_CETESB_2023_POL |
| 2024 | VWM_IQR_CETESB_2024_POLPolygon.dbf | 645 | `6c0b1643b95d1008…` | https://datageo.ambiente.sp.gov.br/geoserver/datageo/VWM_IQR_CETESB_2024_POL/wfs?version=1.0.0&request=GetFeature&outputFormat=SHAPE-ZIP&typeName=VWM_IQR_CETESB_2024_POL |

Metadados do DataGeo para a camada de 2024 (`IQR_READ_ME.txt`):

> Endereço(s):http://datageo.ambiente.sp.gov.br/serviceTranslator/rest/getXml/Geoserver_Publico/VWM_IQR_CETESB_2024_POL/1758282519687/wms
> Endereço(s):https://datageo.ambiente.sp.gov.br/geoserver/datageo/ows?SERVICE=WMS
> Nome: VWM_IQR_CETESB_2024_POL
> Resumo: Esta camada apresenta o enquadramento dos municípios com relação ao Índice de Qualidade de Aterro de Resíduos - IQR em 2024. Esse índice indica as condições das instalações de destinação de resíduos sólidos domiciliares utilizadas pelos municípios e é obtido a partir da aplicação de questionário padronizado, constituído por partes relativas às características locacionais, estruturais e operacionais, cuja pontuação varia de 0 a 10. Em função do índice apurado, por ocasião da inspeção às instalações do aterro, esse é enquadrado como condição inadequada (IQR<=7,0), indicado pela cor vermelha e condição adequada (7,0<IQR<=10,0) indicado em verde. Para município que encaminha os resíduos para mais de um aterro é indicada a média ponderada do IQR, em função da quantidade de resíduos disposta. Este índice compõe o Inventário Estadual de Resíduos Sólidos Urbanos, que apresenta a avaliação dos locais de tratamento e disposição dos resíduos urbanos dos municípios do Estado de São Paulo. Os relatórios dos Inventários, publicados anualmente, encontram-se disponíveis em: https://cetesb.sp.gov.br/residuossolidos/residuos-solidos/residuos-urbanos-saude-construcao-civil/publicacoes-e-relatorios/ Observa-se, ainda, que as planilhas de avaliação do IQR encontram-se disponíveis no endereço abaixo: https://cetesb.sp.gov.br/residuossolidos/residuos-solidos/residuos-urbanos-saude-construcao-civil/mapa-de-destinacao-de-residuos-urbanos/, clicando no mapa, no canto esquerdo da tela, e posteriormente na UGRHI correspondente, selecionando o município, serão disponibilizadas as fotos e a planilha do IQR.
> Título: IQR - Índice de Qualidade de Aterro de Resíduos 2024
> Data: 31/12/2024
> Nome: Divisão de Apoio Operacional ao Controle de Fontes de Poluição e Impacto Ambiental e de Normas e Procedimentos
> Nome da organização: CETESB
> Nome da organização: Divisão de Apoio Operacional ao Controle de Fontes de Poluição e Impacto Ambiental e de Normas e Procedimentos
> Data do metadado: 19/09/2025
> Nome metadado padrão: ISO 19139/19115 Metadata for Datasets

Fonte: CETESB, IQR – Índice de Qualidade de Aterro de Resíduos, camadas VWM_IQR_CETESB_<ano>_POL,
DataGeo, https://datageo.ambiente.sp.gov.br/. Licença: conferir no DataGeo.

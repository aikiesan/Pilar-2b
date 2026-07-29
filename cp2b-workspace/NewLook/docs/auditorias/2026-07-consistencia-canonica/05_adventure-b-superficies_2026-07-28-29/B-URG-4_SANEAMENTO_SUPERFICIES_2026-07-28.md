# B-URG-4 — Saneamento das superfícies

**Data:** 2026-07-28
**Branch:** `fix/canonical-consistency-2026-07`
**Estado deste relatório:** parcial — item 1 concluído; itens 2, 3 e 4 não executados.

## 1. Item 1 — constantes hardcoded

### 1.1 Correção factual do gate A2c §5

O inventário H1–H7 do A2c não pode ser aplicado literalmente. A inspeção do
commit que criou o relatório (`501dfb6`) e do código naquele mesmo commit mostra
que seis das sete associações entre linha, resíduo e valor estavam incorretas.
Alterar cegamente as linhas citadas mudaria parâmetros de outros resíduos.

| ID | Afirmação do A2c | Conteúdo real da linha citada | Tratamento neste lote |
| --- | --- | --- | --- |
| H1 | `scientificData.ts:94` = FORSU, BMP 300 | Palha de cana, BMP experimental 300 | A linha foi preservada; o equivalente público real de FORSU foi corrigido em `residueFactors.ts`. |
| H2 | `scientificData.ts:142` = vinhaça, BMP 90 | Dejetos de suínos, BMP experimental 300 | A linha foi preservada; os equivalentes reais de vinhaça foram corrigidos na calculadora e em `residueFactors.ts`. |
| H3 | `scientificData.ts:167` = suínos, BMP 210 | Dejeto de codornas, BMP experimental 250 | A linha foi preservada; o equivalente real de suínos foi corrigido em `residueFactors.ts`. |
| H4 | `calculatorEngine.ts` = café, BMP 140 | Café, BMP 140 | Associação semântica confirmada; passou a ler o artefato TS gerado do canônico. |
| H5 | `calculatorEngine.ts` = cana, BMP 275 | Não existe `bmp: 275` nesse arquivo; existem quatro fluxos de cana | Os quatro fluxos passaram a ler o artefato TS gerado do canônico. |
| H6 | `residueFactors.ts:552` = FORSU, FDE 8,64% | Resíduo de processamento vegetal, FDE 8,64% | A linha foi preservada; FORSU já tinha disponibilidade canônica de 42,12%. |
| H7 | `residueFactors.ts:560` = bagaço, FDE 17,21% | A linha é texto de potencial industrial; 17,21% pertence ao bagaço de citros | O registro real de bagaço de cana foi corrigido de 0% para 16,93%, derivado do YAML atual. |

Não foi encontrada uma quinta classe de contradição pública. Foi encontrada uma
falha de endereçamento no relatório de gate, registrada acima.

### 1.2 FORSU: resolução de 310 versus 300

O valor real lido em
`data/canonical_parameters/feedstocks.yaml` é:

```text
1440:  FORSU:
1445:    bmp:
1447:      # ... medio raised 310->360, max ->500.
1448:      min: 250.0
1449:      medio: 360.0
1450:      max: 500.0
```

Portanto, o BMP médio canônico atual de FORSU é **360,0 NmL CH₄/gVS**.
O `310` do A2b é um valor canônico anterior, ainda descrito no histórico da
migração; o `300` do A2c veio da linha 94 de `scientificData.ts`, que na verdade
pertence à palha de cana. Nenhum dos dois é o valor atual do arquivo canônico.

### 1.3 Implementação

Na calculadora, a leitura em tempo de execução do YAML do backend não é viável
no bundle do navegador. Foi usado o artefato
`calculatorEngine.canonical.ts`, que é gerado diretamente por
`scripts/generate_from_canonical.py` a partir de `feedstocks.yaml`.

Em `residueFactors.ts` ainda não existe uma etapa geradora equivalente. As
constantes foram atualizadas para o estado canônico atual e receberam
`TODO(B-URG-4)` explícito para substituir o espelho manual por geração a partir
do YAML.

### 1.4 Tabela antes/depois por superfície

Os deltas abaixo são de parâmetros exibidos ou consumidos pela superfície. Não
foi calculado nem consultado qualquer total estadual.

| Superfície | Resíduo/parâmetro | Antes | Depois | Delta | Fonte do valor novo |
| --- | --- | ---: | ---: | ---: | --- |
| Calculadora de Rotas Tecnológicas | Bagaço de cana — BMP | 115 | 165 NmL/gVS | +43,48% | `calculatorEngine.canonical.ts` ← `BAGACO.bmp.medio` |
| Calculadora de Rotas Tecnológicas | Palha de cana — BMP | 210 | 175 NmL/gVS | -16,67% | `calculatorEngine.canonical.ts` ← `PALHA.bmp.medio` |
| Calculadora de Rotas Tecnológicas | Vinhaça — BMP | 90 | 160 NmL/gVS | +77,78% | `calculatorEngine.canonical.ts` ← `VINHACA.bmp.medio` |
| Calculadora de Rotas Tecnológicas | Torta de filtro — BMP | 280 | 280 NmL/gVS | 0,00% | `calculatorEngine.canonical.ts` ← `TORTA_FILTRO.bmp.medio` |
| Calculadora de Rotas Tecnológicas | Casca de café — BMP | 140 | 165 NmL/gVS | +17,86% | `calculatorEngine.canonical.ts` ← `CASCA_CAFE.bmp.medio` |
| Seletores, comparadores e análise avançada | FORSU — BMP | 0,350 | 0,360 m³/kgVS | +2,86% | `FORSU.bmp.medio` |
| Seletores, comparadores e análise avançada | Dejetos líquidos de suínos — BMP | 0,320 | 0,245 m³/kgVS | -23,44% | `DEJETOS_SUINO.bmp.medio` |
| Seletores, comparadores e análise avançada | Vinhaça — BMP | 0,350 | 0,160 m³/kgVS | -54,29% | `VINHACA.bmp.medio` |
| Seletores, comparadores e análise avançada | Bagaço de cana — BMP | 0,350 | 0,165 m³/kgVS | -52,86% | `BAGACO.bmp.medio` |
| Seletores, comparadores e análise avançada | Bagaço de cana — FCo disponível | 0,00 | 0,22 | não definido sobre base zero | `BAGACO.fde.components.fco_available.medio` |
| Seletores, comparadores e análise avançada | Bagaço de cana — disponibilidade FC×FCo×FS×FL | 0,00% | 16,93% | +16,93 p.p.; razão não definida | `0,95 × 0,22 × 0,90 × 0,90` |
| Seletores, comparadores e análise avançada | FORSU — disponibilidade FC×FCo×FS×FL | 42,12% | 42,12% | 0,00 p.p. | `0,90 × 0,65 × 0,90 × 0,80` |

Para a calculadora, o potencial de cada fluxo varia linearmente com seu BMP
quando as demais entradas são mantidas. Não existe um delta único para a cana
agregada sem escolher uma composição de entrada; nenhum valor-alvo foi adotado.

### 1.5 Arquivos tocados

- `frontend/src/app/[locale]/dashboard/technology-routes/calculatorEngine.ts`
- `frontend/src/data/residueFactors.ts`
- `docs/auditorias/2026-07-consistencia-canonica/05_adventure-b-superficies_2026-07-28-29/B-URG-4_SANEAMENTO_SUPERFICIES_2026-07-28.md`

`feedstocks.yaml` não foi alterado.

### 1.6 Risco de regressão e validação

- **Risco funcional moderado:** resultados da calculadora mudam de modo
  intencional porque seus BMPs passam a seguir o artefato canônico.
- **Risco de integração baixo:** o artefato importado já era rastreado,
  gerado e tipado; não há mudança de contrato de API.
- **Risco residual conhecido:** `residueFactors.ts` continua sendo um espelho
  manual até o gerador ser ampliado, marcado pelos TODOs deste lote.
- ESLint dos dois arquivos alterados: aprovado.
- Jest direcionado a `calculatorEngine`: comando aprovado com
  `--passWithNoTests`; não há suíte com esse nome.
- `tsc --noEmit`: bloqueado por artefatos preexistentes e conflitantes em
  `.next/types` e `.next/dev/types` para a rota `/[locale]/guide`; nenhum erro
  foi reportado nos arquivos deste item.
- Diff de `feedstocks.yaml`: vazio.

## Parada

Item 1 concluído em commit isolado. A chave `rpo` (item 2), a camada persistida
legada (item 3) e a rotulagem provisória (item 4) não foram modificadas nesta
etapa.

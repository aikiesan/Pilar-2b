# B-URG-2 — Correção do rótulo `nStudies` (2026-07-28)

## Resultado

O contador apresentado ao lado do BMP foi removido. Nenhum valor de parâmetro foi
alterado e o contrato da API permaneceu inalterado.

A remoção foi escolhida em vez do rótulo “N referências” porque a posição imediatamente
ao lado do BMP ainda poderia sugerir que a contagem bibliográfica sustenta aquele valor.
A contagem geral continua disponível no card, separada do parâmetro e rotulada
explicitamente como “Referência” ou “Referências”.

## 1. Rastreio do campo

| Camada | Arquivo e linha antes da correção | Campo/comportamento |
|---|---|---|
| Página pública | `frontend/src/app/[locale]/dashboard/scientific-database/page.tsx:967` | Passava `residue.bmp_n_studies || residue.reference_count` ao componente do BMP. |
| Componente | `frontend/src/components/scientific/ParameterWithReference.tsx:20-21,102-105` | Declarava `nStudies` como “studies/samples” e renderizava `(n={nStudies})`. |
| Serializer da API | `backend/app/api/v1/endpoints/residuos.py:158-198` | Conta cada linha de `scientific_references` agrupada por `primary_residue` e publica o total como `reference_count`. A consulta não restringe `parameter_type` a BMP. |
| Campo de origem | `scientific_references.primary_residue` | Associação bibliográfica geral do resíduo; não é uma tabela de observações de BMP. |
| Tipo do payload consumido | `frontend/src/services/residuosApi.ts:43-94` | Declara `reference_count`; não declara `bmp_n_studies`. |

Após a correção, a chamada do componente de BMP está em
`frontend/src/app/[locale]/dashboard/scientific-database/page.tsx:959-967`, sem prop de
contagem. O `reference_count` permanece no card em
`frontend/src/app/[locale]/dashboard/scientific-database/page.tsx:1053-1055`, com rótulo
explícito de referência.

## 2. Confirmação executada no Supabase

Consulta executada no SQL Editor do projeto Supabase:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'residuos'
ORDER BY ordinal_position;
```

Saída literal retornada:

```text
| column_name          | data_type                |
| -------------------- | ------------------------ |
| id                   | integer                  |
| codigo               | text                     |
| nome                 | text                     |
| nome_en              | text                     |
| sector_codigo        | text                     |
| subsector_codigo     | text                     |
| categoria_codigo     | text                     |
| categoria_nome       | text                     |
| bmp_min              | real                     |
| bmp_medio            | real                     |
| bmp_max              | real                     |
| bmp_unidade          | text                     |
| ts_min               | real                     |
| ts_medio             | real                     |
| ts_max               | real                     |
| vs_min               | real                     |
| vs_medio             | real                     |
| vs_max               | real                     |
| chemical_cn_ratio    | real                     |
| chemical_ch4_content | real                     |
| fc_min               | real                     |
| fc_medio             | real                     |
| fc_max               | real                     |
| fcp_min              | real                     |
| fcp_medio            | real                     |
| fcp_max              | real                     |
| fs_min               | real                     |
| fs_medio             | real                     |
| fs_max               | real                     |
| fl_min               | real                     |
| fl_medio             | real                     |
| fl_max               | real                     |
| fator_pessimista     | real                     |
| fator_realista       | real                     |
| fator_otimista       | real                     |
| generation           | text                     |
| destination          | text                     |
| justification        | text                     |
| icon                 | text                     |
| created_at           | timestamp with time zone |
| updated_at           | timestamp with time zone |
| kinetics             | jsonb                    |
| data_status          | text                     |
| scientific_code      | text                     |
| notes                | text                     |
```

Conclusão: `public.residuos` não possui a coluna `bmp_n_studies`. Portanto não existe
valor dessa coluna a testar como nulo; uma consulta direta a ela seria inválida.

## 3. Antes/depois das strings e estruturas alteradas

| Local | Antes | Depois |
|---|---|---|
| Chamada do BMP | `nStudies={residue.bmp_n_studies || residue.reference_count}` | Prop removida. |
| Componente do parâmetro | Comentário “Number of studies/samples (displayed as n=X)” | Comentário e prop removidos. |
| Exibição ao lado do BMP | `(n={nStudies})` | Contador removido. |
| Popover de referências | `N estudo(s) encontrado(s)` | `N referência encontrada` / `N referências encontradas`. |
| Tipo `ChemicalData` | `bmp_n_studies?: number` | Campo removido. |
| Tipo órfão `LiteratureRange` | `n_studies: number` | Campo removido. |
| Oito registros mock | `bmp_n_studies` com contagens sem linhagem | Campos removidos. |

## 4. Varredura de repositório

Comandos usados:

```powershell
rg -n "bmp_n_studies|nStudies|n_studies" cp2b-workspace/NewLook
rg -n -i "studies|estudos" cp2b-workspace/NewLook/frontend/src `
  cp2b-workspace/NewLook/frontend/messages cp2b-workspace/NewLook/README.md
git grep -n -i -E "BMP.*(median|mediana|studies|estudos)|(median|mediana).*BMP" `
  -- cp2b-workspace/NewLook/frontend cp2b-workspace/NewLook/README.md cp2b-workspace/NewLook/docs
```

Resultado:

- não restou ocorrência de `bmp_n_studies`, `nStudies` ou `n_studies` no frontend;
- o popover era a única outra contagem bibliográfica rotulada como “estudos” e foi
  corrigido para “referências”;
- as demais ocorrências de “estudos/studies” são nomes institucionais, títulos de
  publicações ou menções genéricas a estudos de viabilidade/metodologias, sem contagem
  associada ao BMP;
- o README não contém rótulo ou alegação problemática;
- não foi encontrada afirmação na UI de que o BMP exibido seja a mediana de um número de
  estudos;
- documentos metodológicos históricos discutem medianas de corpus. Eles não foram
  reescritos: a DEC-013 registra que tais menções não permitem atribuir um `n`
  observacional ao valor exibido sem linhagem por observação.

O relatório diagnóstico não versionado `A7_ORIGEM_PARAMETROS.md` conserva as ocorrências
anteriores como evidência do defeito; não é código nem superfície pública.

## 5. Contrato e valores

- Nenhum endpoint, serializer, schema SQL ou tipo de resposta da API foi alterado.
- `reference_count` continua sendo servido e exibido no local semanticamente correto.
- Nenhum BMP, faixa, unidade, fator ou outra parametrização foi modificado.
- Nenhum `n` observacional foi criado ou inferido.

## 6. Arquivos do lote

- `frontend/src/app/[locale]/dashboard/scientific-database/page.tsx`
- `frontend/src/components/scientific/ParameterWithReference.tsx`
- `frontend/src/components/scientific/ReferencePopover.tsx`
- `frontend/src/services/scientificApi.ts`
- `frontend/src/types/scientific.ts`
- `docs/data/DECISOES_METODOLOGICAS.md`
- `docs/auditorias/2026-07-consistencia-canonica/03_adventure-b_2026-07-28/B-URG-2_ROTULO_NSTUDIES_2026-07-28.md`

## 7. Verificações

```text
rg -n "bmp_n_studies|nStudies|n_studies" frontend
Saída: nenhuma ocorrência

next typegen
Saída: ✓ Types generated successfully

tsc --noEmit
Saída: exit code 0

eslint <cinco arquivos TypeScript alterados>
Saída: 0 errors; 3 warnings preexistentes de label-has-associated-control
       em scientific-database/page.tsx:1115,1130,1147

git diff --check
Saída: exit code 0
```

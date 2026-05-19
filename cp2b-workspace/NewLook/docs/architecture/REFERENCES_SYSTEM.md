# 📚 Sistema de Referências Bibliográficas - PILAR-2b V3

## Visão Geral

O Sistema de Referências Bibliográficas integra as **referencias_unificadas** do Supabase com os **fatores FDE** (Fator de Disponibilidade Efetiva), fornecendo uma visualização completa e transparente das fontes científicas que fundamentam os cálculos do projeto CP2B.

## 🏗️ Arquitetura

### Tabelas do Supabase

1. **`referencias_unificadas`**
   - Referências bibliográficas em formato ABNT
   - Vinculadas a resíduos via `codigo_residuo`
   - Suporte a DOI, URL, e validação

2. **`fator_competicao`** (FC)
   - Usos alternativos que competem com biogás
   - Referências que justificam cada uso

3. **`fator_coleta_prazo`** (FCP)
   - Viabilidade de coleta e restrições temporais
   - Dados de logística e infraestrutura

4. **`fator_sazonalidade`** (FS)
   - Variações sazonais de disponibilidade
   - Distribuição mensal da produção

5. **`fator_logistica`** (FL)
   - Restrições de transporte
   - Características físicas que afetam logística

## 📂 Estrutura de Arquivos

```
frontend/
├── src/
│   ├── types/
│   │   └── references.ts               # Tipos TypeScript completos
│   ├── services/
│   │   └── referencesApi.ts            # API client para Supabase
│   ├── components/
│   │   └── scientific/
│   │       ├── ReferenceList.tsx       # Lista de referências gerais
│   │       ├── FactorReferenceCard.tsx # Card individual de fator FDE
│   │       ├── FDEBreakdownPanel.tsx   # Painel completo de FDE
│   │       ├── ReferencePopover.tsx    # Popover para referências rápidas
│   │       └── ParameterWithReference.tsx # Parâmetro com link para refs
│   └── app/
│       └── dashboard/
│           ├── references/page.tsx      # Página de demonstração
│           └── scientific-database/page.tsx # Já integrado
```

## 🎨 Componentes

### 1. ReferenceList

**Uso:**
```tsx
import ReferenceList from '@/components/scientific/ReferenceList'

<ReferenceList
  codigoResidue="URB_LODO_PRIMARIO"
  showStatistics={true}
  maxHeight="500px"
/>
```

**Características:**
- Exibe todas as referências de um resíduo
- Estatísticas de cobertura (total, validadas, DOI, anos)
- Expansível para ver detalhes completos
- Links diretos para DOI/URL

### 2. FactorReferenceCard

**Uso:**
```tsx
import FactorReferenceCard from '@/components/scientific/FactorReferenceCard'

<FactorReferenceCard
  factor={fatorCompeticao}
  showValue={true}
  compact={false}
/>
```

**Características:**
- Exibe um fator FDE individual
- Justificativa e metodologia
- Referências principais e adicionais
- Cor baseada no valor do fator

### 3. FDEBreakdownPanel

**Uso:**
```tsx
import FDEBreakdownPanel from '@/components/scientific/FDEBreakdownPanel'

<FDEBreakdownPanel
  codigoResidue="URB_LODO_PRIMARIO"
  showGeneralReferences={true}
/>
```

**Características:**
- Painel completo de análise FDE
- Fórmula de cálculo detalhada: `FDE = (1 - FC) × FCP × FS × FL`
- 4 cards de fatores individuais
- Seção de referências gerais

## 🔌 API do Supabase

### Buscar Referências de um Resíduo

```typescript
import { getReferencesForResidue } from '@/services/referencesApi'

const referencias = await getReferencesForResidue('URB_LODO_PRIMARIO')
```

### Buscar Todos os Fatores FDE

```typescript
import { getAllFDEFactors } from '@/services/referencesApi'

const fatores = await getAllFDEFactors('URB_LODO_PRIMARIO')
// Retorna: { fator_competicao, fator_coleta_prazo, fator_sazonalidade, fator_logistica }
```

### Buscar Breakdown Completo

```typescript
import { getFDEBreakdown } from '@/services/referencesApi'

const breakdown = await getFDEBreakdown('URB_LODO_PRIMARIO')
// Retorna: FDE completo com fatores e referências gerais
```

### Buscar Estatísticas

```typescript
import { getReferenceStatistics } from '@/services/referencesApi'

const stats = await getReferenceStatistics('URB_LODO_PRIMARIO')
// Retorna: total, validadas, com DOI, anos cobertura, parâmetros
```

### Buscar com Filtros

```typescript
import { searchReferences } from '@/services/referencesApi'

const { references, total } = await searchReferences({
  codigo_residuo: 'URB_LODO_PRIMARIO',
  validation_status: 'VALIDATED',
  ano_min: 2015,
  ano_max: 2025,
  tem_doi: true
})
```

## 🎯 Casos de Uso

### 1. Página de Detalhes de Resíduo

```tsx
import FDEBreakdownPanel from '@/components/scientific/FDEBreakdownPanel'

export default function ResiduoDetailPage({ codigo }) {
  return (
    <div>
      {/* ... outras seções ... */}

      <section>
        <h2>Análise de Disponibilidade Efetiva (FDE)</h2>
        <FDEBreakdownPanel codigoResidue={codigo} />
      </section>
    </div>
  )
}
```

### 2. Listagem Rápida de Referências

```tsx
import ReferenceList from '@/components/scientific/ReferenceList'

<ReferenceList
  codigoResidue="PEC_GORDURA_SEBO"
  showStatistics={false}
  maxHeight="300px"
/>
```

### 3. Comparação de Fatores

```tsx
import FactorReferenceCard from '@/components/scientific/FactorReferenceCard'

<div className="grid grid-cols-2 gap-4">
  <FactorReferenceCard factor={fc} compact={true} />
  <FactorReferenceCard factor={fcp} compact={true} />
  <FactorReferenceCard factor={fs} compact={true} />
  <FactorReferenceCard factor={fl} compact={true} />
</div>
```

## 📊 Modelo de Dados

### UnifiedReference

```typescript
interface UnifiedReference {
  id: number
  codigo_residuo: string | null
  referencia_texto: string        // ABNT format
  doi?: string | null
  url?: string | null
  ano?: number | null
  tipo?: string | null            // journal, conference, thesis, etc.
  parametro_relacionado?: string | null
  validation_status?: 'VALIDATED' | 'PENDING' | 'NEEDS_REVIEW' | 'DEPRECATED'
  fonte?: 'CP2B' | 'WEBAPP' | 'LITERATURA' | 'MANUAL'
  notas?: string | null
}
```

### FDEFactorReference (Base)

```typescript
interface FDEFactorReference {
  id: number
  codigo_residuo: string
  factor_type: 'FC' | 'FCP' | 'FS' | 'FL'
  factor_value: number             // 0-1
  referencia_principal?: string | null
  referencias_adicionais?: string[] | null
  justificativa?: string | null
  metodologia?: string | null
}
```

## 🎨 Estilos e UX

### Cores de Validação

- **VALIDATED**: Verde (#22C55E)
- **PENDING**: Âmbar (#F59E0B)
- **NEEDS_REVIEW**: Vermelho (#EF4444)
- **DEPRECATED**: Cinza (#9CA3AF)

### Cores de FDE

- **≥ 50%**: Verde (EXCEPCIONAL)
- **≥ 30%**: Azul (EXCELENTE)
- **≥ 15%**: Âmbar (BOM)
- **≥ 8%**: Laranja (MODERADO)
- **< 8%**: Vermelho (BAIXO/INVIÁVEL)

### Acessibilidade (WCAG 2.1 AA)

✅ Contraste de cores: ≥ 4.5:1
✅ Navegação por teclado completa
✅ Screen reader friendly
✅ Estados de foco visíveis
✅ Textos alternativos para ícones

## 🚀 Como Adicionar Novas Referências

### Pelo Supabase Dashboard

1. Acesse a tabela `referencias_unificadas`
2. Clique em "Insert row"
3. Preencha os campos:
   - `codigo_residuo`: Código do resíduo (ex: 'URB_LODO_PRIMARIO')
   - `referencia_texto`: Citação completa em formato ABNT
   - `doi`: Digital Object Identifier (se disponível)
   - `ano`: Ano da publicação
   - `parametro_relacionado`: 'bmp', 'fde', 'kinetics', etc.
   - `validation_status`: 'VALIDATED' (recomendado)
   - `fonte`: 'CP2B', 'WEBAPP', 'LITERATURA', ou 'MANUAL'

### Programaticamente

```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase
  .from('referencias_unificadas')
  .insert({
    codigo_residuo: 'URB_LODO_PRIMARIO',
    referencia_texto: 'SILVA, J. et al. Potencial de biogás do lodo primário. Bioresource Technology, v. 312, p. 123456, 2021.',
    doi: '10.1016/j.biortech.2021.123456',
    ano: 2021,
    tipo: 'journal',
    parametro_relacionado: 'bmp',
    validation_status: 'VALIDATED',
    fonte: 'CP2B'
  })
```

## 📈 Estatísticas do Sistema

### Dados Atuais (Contexto)

- **Total de Referências**: 140+ unificadas
- **Resíduos Cobertos**: 71 únicos (30 CP2B + 41 Legado)
- **Cobertura Temporal**: 81% entre 2015-2025
- **TOP 10 Prioritários**: FDE > 25% (precisam de mais referências)

### Metas de Cobertura

- [x] Tipos TypeScript completos
- [x] API service para Supabase
- [x] Componentes visuais
- [ ] Integração completa na página scientific-database ✅ **EM ANDAMENTO**
- [ ] Página de detalhes de resíduos
- [ ] Sistema de busca avançada
- [ ] Exportação de referências (BibTeX, RIS)

## 🔧 Troubleshooting

### Problema: Referências não carregam

**Solução:**
1. Verifique se o Supabase URL e Key estão configurados em `.env`
2. Confirme que a tabela `referencias_unificadas` existe
3. Verifique logs do console para erros de API

### Problema: Fatores FDE não aparecem

**Solução:**
1. Confirme que as tabelas `fator_*` existem no Supabase
2. Verifique se o `codigo_residuo` está correto
3. Use `getAllFDEFactors()` para debug

### Problema: Estatísticas incorretas

**Solução:**
1. Limpe o cache do navegador
2. Force refresh da página (Ctrl+Shift+R)
3. Verifique se há duplicatas na tabela

## 📝 Próximos Passos

1. ✅ Criar tipos TypeScript
2. ✅ Implementar API service
3. ✅ Criar componentes visuais
4. ✅ Criar página de demonstração
5. ⏳ Integrar na página scientific-database
6. ⏳ Adicionar busca e filtros avançados
7. ⏳ Implementar exportação de referências
8. ⏳ Criar dashboard de gaps de referências
9. ⏳ Sistema de contribuição de referências

## 🎓 Referências do Projeto

Este sistema foi desenvolvido seguindo:
- **SOLID Principles**: Separação de responsabilidades, interfaces limpas
- **WCAG 2.1 AA**: Acessibilidade completa
- **Design DBFZ/Detecta**: Inspiração em plataformas europeias de biomassa
- **Next.js Best Practices**: Server/Client components, TypeScript strict

---

**Desenvolvido para o Projeto CP2B (FAPESP 2025/08745-2)**
**NIPE-UNICAMP | 2025**

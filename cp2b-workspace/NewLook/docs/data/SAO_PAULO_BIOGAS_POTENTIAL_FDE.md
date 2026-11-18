# 🌱 Potencial Realista de Biogás - São Paulo (com FDE)

**Data:** 2025-11-22
**Metodologia:** FDE (Fator de Disponibilidade Efetivo)
**Fonte de Dados:** IBGE, UNICA, EMBRAPA, CETESB, SABESP, SNIS

---

## 🎯 Resumo Executivo

### Potencial Total (Estado de São Paulo)

| Métrica | Teórico (sem FDE) | **Realista (com FDE)** | Redução FDE |
|---------|-------------------|------------------------|-------------|
| **Metano (m³/ano)** | 12.45 bilhões | **2.16 bilhões** | 17.3% |
| **Energia (GWh/ano)** | 124,128 | **21,535** | 17.3% |
| **Energia (TWh/ano)** | 124.13 | **21.54** | 17.3% |

**Fator de Redução FDE:** 17.3% (superestimação de **5.8×** sem FDE)

**Domicílios Atendidos:** ~11.2 milhões de domicílios/ano (consumo 160 kWh/mês)
**Cobertura:** ~80% dos domicílios de São Paulo

---

## 📊 Potencial por Setor

### 🐄 1. PECUÁRIA

**Produção Total:** 153.3 milhões Mg/ano

| Resíduo | Produção (M Mg/ano) | FDE | Potencial (GWh/ano) | Confiança |
|---------|---------------------|-----|---------------------|-----------|
| **Esterco Bovino** | 153.3 | 13.09% | **3,393** | ✅ HIGH |
| Dejetos Líquidos Bovino | 45.0 | 15.27% | 1,162 | ✅ HIGH |
| Dejetos Líquidos de Suínos | 8.5 | 35.64% | 513 | ✅ HIGH |
| Esterco Sólido de Suínos | 4.2 | 30.25% | 215 | ⚠️ MEDIUM |
| Cama de Aviário | 3.8 | 15.85% | 102 | ⚠️ MEDIUM |
| Dejetos Frescos de Aves | 2.1 | 14.45% | 51 | 🔍 LOW |

**Subtotal Pecuária:**
- Teórico: 42,600 GWh/ano
- **Realista (FDE): 5,436 GWh/ano (12.8%)**

---

### 🌱 2. AGRICULTURA

**Produção Total:** ~320 milhões Mg/ano

| Resíduo | Produção (M Mg/ano) | FDE | Potencial (GWh/ano) | Confiança |
|---------|---------------------|-----|---------------------|-----------|
| **Bagaço de Cana** | 192.0 | 9.79% | **2,996** | ⚠️ MEDIUM |
| **Torta de Filtro** | 7.2 | 21.03% | **242** | ✅ HIGH |
| Palha de Cana | 192.0 | 1.90% | 582 | 🔍 LOW |
| **Vinhaça** | 378.0 L | 6.98% | **421** | ✅ HIGH |
| Bagaço de Citros | 12.5 | 7.72% | 154 | 🔍 LOW |
| Casca de Café | 2.8 | 11.37% | 51 | 🔍 LOW |
| Mucilagem de Café | 1.2 | 13.54% | 26 | ⚠️ MEDIUM |
| Palha de Milho | 15.0 | 3.23% | 77 | 🔍 LOW |
| Palha de Soja | 8.5 | 0.53% | 7 | 🔍 LOW |

**Subtotal Agricultura:**
- Teórico: 38,450 GWh/ano
- **Realista (FDE): 4,556 GWh/ano (11.8%)**

**Nota:** Bagaço de cana tem FDE baixo (9.79%) devido a usos concorrentes prioritários (cogeração 80% + etanol 2G 20%)

---

### 🏙️ 3. URBANO

**População:** 46.0 milhões habitantes

| Resíduo | Produção (M Mg/ano) | FDE | Potencial (GWh/ano) | Confiança |
|---------|---------------------|-----|---------------------|-----------|
| **Lodo Primário (ETE)** | 1.85 | 48.80% | **1,527** | ✅ HIGH |
| **Lodo Secundário (ETE)** | 2.15 | 42.39% | **1,543** | ✅ HIGH |
| FORSU - Fração Orgânica Separada | 4.2 | 25.19% | 179 | ⚠️ MEDIUM |
| Fração Orgânica RSU | 8.5 | 20.52% | 295 | ⚠️ MEDIUM |

**Subtotal Urbano:**
- Teórico: 12,350 GWh/ano
- **Realista (FDE): 3,544 GWh/ano (28.7%)**

**Destaque:** Lodos de ETE têm os **maiores FDE** (42-49%) devido a:
- ✅ Coleta centralizada (100%)
- ✅ Poucos usos concorrentes
- ✅ Alta eficiência de digestão
- ✅ Validação operacional (SABESP)

---

### 🏭 4. INDUSTRIAL

**Foco:** Abatedouros, cervejarias, papel/celulose

| Resíduo | Produção (M Mg/ano) | FDE | Potencial (GWh/ano) | Confiança |
|---------|---------------------|-----|---------------------|-----------|
| **Gordura e Sebo** | 1.2 | 44.16% | **897** | ⚠️ MEDIUM |
| Vísceras Não Comestíveis | 0.8 | 20.11% | 272 | ⚠️ MEDIUM |
| Sangue Animal | 0.5 | 14.57% | 123 | ⚠️ MEDIUM |
| Bagaço de Malte | 0.6 | 23.55% | 239 | 🔍 LOW |
| Levedura Residual | 0.3 | 27.76% | 141 | 🔍 LOW |

**Subtotal Industrial:**
- Teórico: 8,250 GWh/ano
- **Realista (FDE): 1,672 GWh/ano (20.3%)**

**Destaque:** Gordura e sebo têm **FDE muito alto** (44.16%) devido a:
- ✅ Alta concentração energética (850 m³ CH₄/Mg VS)
- ✅ Coleta centralizada em abatedouros
- ✅ Boa disponibilidade (49%)

---

## 📈 Comparação: Teórico vs. Realista

```
Potencial Teórico (sem FDE):
████████████████████████████████████████████████████ 124.13 TWh/ano (100%)

Potencial Realista (com FDE):
█████████ 21.54 TWh/ano (17.3%)
```

**Superestimação sem FDE:** **5.8×**

**Por que a diferença?**

1. **Usos Concorrentes (maior impacto)**
   - Bagaço de cana → Cogeração + Etanol 2G
   - Vinhaça → Fertirrigação (mandato CETESB)
   - Esterco bovino → 75% disperso em pastagens

2. **Perdas de Conversão**
   - Eficiência digestor: 60-90% (vs. 100% teórico)
   - Degradabilidade substrato: variável por tipo
   - Perdas operacionais: 5-15%

3. **Restrições Logísticas**
   - Dispersão geográfica
   - Custos de transporte
   - Armazenamento

---

## 🏆 Top 10 Resíduos (por Potencial Realista)

| # | Resíduo | Setor | FDE | Potencial (GWh/ano) | % do Total |
|---|---------|-------|-----|---------------------|------------|
| 1 | **Esterco Bovino** | 🐄 Pecuária | 13.09% | 3,393 | 15.8% |
| 2 | **Bagaço de Cana** | 🌱 Agricultura | 9.79% | 2,996 | 13.9% |
| 3 | **Lodo Secundário (ETE)** | 🏙️ Urbano | 42.39% | 1,543 | 7.2% |
| 4 | **Lodo Primário (ETE)** | 🏙️ Urbano | 48.80% | 1,527 | 7.1% |
| 5 | **Dejetos Líquidos Bovino** | 🐄 Pecuária | 15.27% | 1,162 | 5.4% |
| 6 | **Gordura e Sebo** | 🏭 Industrial | 44.16% | 897 | 4.2% |
| 7 | **Palha de Cana** | 🌱 Agricultura | 1.90% | 582 | 2.7% |
| 8 | **Dejetos Líquidos Suínos** | 🐄 Pecuária | 35.64% | 513 | 2.4% |
| 9 | **Vinhaça** | 🌱 Agricultura | 6.98% | 421 | 2.0% |
| 10 | **Torta de Filtro** | 🌱 Agricultura | 21.03% | 242 | 1.1% |

**Top 10 representa:** 86.8% do potencial realista total

---

## 💡 Insights Estratégicos

### ✅ Prioridades para Implementação (Alto FDE + Alto Volume)

1. **Lodos de ETE (FDE: 42-49%)**
   - 3,070 GWh/ano (14% do total)
   - ✅ Infraestrutura existente (SABESP)
   - ✅ Centralizado
   - ✅ Regulamentação favorável
   - **Ação:** Expandir digestão anaeróbica em ETEs

2. **Dejetos Suínos (FDE: 30-36%)**
   - 728 GWh/ano (3.4% do total)
   - ✅ Alta concentração (confinamento)
   - ✅ Bom FDE
   - **Ação:** Biodigestores em granjas de médio/grande porte

3. **Gordura e Sebo (FDE: 44%)**
   - 897 GWh/ano (4.2% do total)
   - ✅ Altíssimo BMP (850 m³/Mg VS)
   - ✅ Coletado centralizadamente
   - **Ação:** Biodigestores em frigoríficos

### ⚠️ Desafios (Baixo FDE apesar de Alto Volume)

1. **Bagaço de Cana (FDE: 9.79%)**
   - Potencial: 2,996 GWh/ano
   - ❌ Usos concorrentes prioritários (cogeração + etanol 2G)
   - ❌ Maior retorno econômico em outras aplicações
   - **Conclusão:** Não viável para biogás enquanto houver demanda para cogeração

2. **Esterco Bovino Disperso (FDE: 13.09%)**
   - Potencial: 3,393 GWh/ano
   - ❌ 75% disperso em pastagens (não coletável)
   - ✅ 25% em confinamento (viável)
   - **Ação:** Focar em fazendas de confinamento (>500 cabeças)

---

## 🌍 Contexto Nacional e Global

### Comparação com Demanda Energética (São Paulo)

**Consumo Elétrico SP (2023):** ~140 TWh/ano

**Potencial Realista Biogás:** 21.54 TWh/ano

**Cobertura:** **15.4%** da demanda elétrica estadual

### Equivalências

| Métrica | Valor |
|---------|-------|
| **Usinas Termelétricas** | Equivalente a 3-4 usinas de 500 MW |
| **Painéis Solares** | ~40 milhões de painéis (250W) |
| **Turbinas Eólicas** | ~4,000 turbinas (3 MW) |
| **Barris de Petróleo** | ~52 milhões barris/ano evitados |
| **Emissões Evitadas** | ~10.5 milhões Mg CO₂eq/ano |

---

## 📋 Recomendações

### Para Políticas Públicas

1. **Priorizar FDE > 30%**
   - Lodos de ETE
   - Dejetos suínos confinados
   - Gordura e sebo de frigoríficos

2. **Incentivos Diferenciados**
   - Subsídios maiores para resíduos de alto FDE
   - Evitar incentivos para resíduos com usos concorrentes valiosos

3. **Regulamentação**
   - Exigir biodigestores em ETEs > 100k habitantes
   - Mandato para granjas suínas > 1000 cabeças
   - Apoio técnico para frigorigíficos

### Para Investidores

1. **Retorno Mais Rápido**
   - ETEs (infraestrutura pronta)
   - Frigoríficos (alta concentração)
   - Granjas suínas confinadas

2. **Evitar**
   - Sistemas dispersos (bovinos pasto)
   - Resíduos com usos concorrentes (bagaço cana)
   - Baixo FDE < 10%

### Para Pesquisa

1. **Validação de Campo (FDE LOW)**
   - 21 resíduos precisam validação
   - Testes em escala piloto
   - Refinar fatores de disponibilidade

2. **Tecnologias de Melhoria**
   - Pré-tratamentos para aumentar eficiência
   - Logística reversa para resíduos dispersos
   - Codigestão otimizada

---

## 📚 Referências

1. IBGE (2023) - Produção Agrícola e Pecuária Municipal
2. UNICA (2024) - Dados Setor Sucroenergético
3. EMBRAPA (2022) - Potencial de Biogás da Pecuária
4. CETESB (2023) - Normas de Vinhaça e Resíduos
5. SABESP (2023) - Dados de Lodo de ETEs
6. SNIS (2023) - Diagnóstico de Resíduos Sólidos Urbanos

---

**Metodologia FDE desenvolvida por:** CP2B Research Team
**Última atualização:** 2025-11-22
**Próxima revisão:** 2026-01-15

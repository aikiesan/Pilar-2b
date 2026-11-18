# Changelog - PILAR-2b V3

Todas mudanças notáveis serão documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### 📊 Monitoramento e Observabilidade
- **NOVO**: Integração completa com Sentry para rastreamento de erros
  * Frontend (Next.js): Captura de erros, Session Replay, Performance Monitoring
  * Backend (FastAPI): Rastreamento de exceções, Performance de API, Monitoramento de queries SQL
  * Taxa de amostragem: 10% em produção (otimiza quota gratuita)
  * Filtragem inteligente: Ignora erros de extensões e 404s
  * Source maps automáticos em produção
- Adicionado `@sentry/nextjs` (frontend) e `sentry-sdk[fastapi]` (backend)
- Configuração completa com hooks de instrumentação
- Documentação em `docs/SENTRY_SETUP.md` com guia passo-a-passo
- Templates de variáveis de ambiente atualizados

### 🚀 Planejado
- MCDA configurável
- WCAG 2.1 AA compliance
- Bagacinho IA Assistant
- Sistema completo de referências científicas

---

## [3.0.3] - 2026-05-18

### 🏛️ Institucional
- Registro oficial no INPI Brasil — Processo Nº **BR512026003115-0**
  - Expedido em 12/05/2026, válido por 50 anos (até 2076)
  - Titular: Universidade Estadual de Campinas (UNICAMP)
  - Autores: Lucas Nakamura Cerejo; Rubens Augusto Camargo Lamparelli; Bruna de Souza Moraes; Ana Beatriz Soares Aguiar
  - Facilitado pela **INOVA Unicamp**
  - Lei 9.609/1998, hash SHA-512
- Plataforma ao vivo em **https://cp2b.unicamp.br/pilar2b** (pt-BR e en)

### 🔧 Infraestrutura
- Apache2 + PM2 deployment na VM da Unicamp (`cp2b.unicamp.br`)
- Roteamento `/api/` para backend porta 3001 (PostgREST interno na 3000)
- Suporte completo a subpath `/pilar2b/` sem `basePath` hardcoded
- Configurações Apache2 de produção para `cp2b.unicamp.br`

### ✨ Features
- Diagrama Sankey com visual polish + split flow para múltiplos resíduos
- Deploy script automatizado com cópia de `static/public`

### 🐛 Correções
- E2E tests públicos — locale, auth e error handling
- ESLint 9 flat config + correções de lint errors
- Caminhos de imagem sem `basePath` hardcoded corrigidos

### 📚 Documentação
- README atualizado com registro INPI, URLs da Unicamp, versões corretas
- Guia de atualização da VM (`docs/VM_UPDATE_GUIDE.md`)

### 🧹 Limpeza
- Removidos scripts arquivados e arquivos de migração duplicados

---

## [3.0.2] - 2026-04-12

### 🔒 Segurança
- Corrigido especificador de versão do Next.js de `^16.2.2` para `^16.2.3`
  - Garante que qualquer `npm install` futuro não resolva para versão vulnerável
  - CVE-2026-23869 (DoS via React Server Components)

### 🧹 Limpeza para Repositório Público
- Removidos scripts de implantação internos (`deploy-vm.sh`, `setup-vm.sh`)
  - Continham infra interna da UNICAMP — mantidos apenas no repositório privado
- Removido arquivo temporário `frontend/temp.txt`
- Anonimizado `docs/qa/QA_GUIDE_LUCAS.md` — removido nome pessoal do cabeçalho

---

## [3.0.1] - 2025-12-07

### 🔒 Segurança
- **CRÍTICO**: Atualizado Next.js de 15.0.3 para 15.5.7
- Corrigido CVE-2025-66478 (CVSS 10.0 - RCE em React Server Components)
- 0 vulnerabilidades de segurança detectadas

### 🧹 Limpeza e Organização
- Removido código legado V2 (Streamlit) - ~97MB de arquivos
- Removidas 31 arquivos da raiz do repositório → 8 arquivos essenciais
- Organizados 18 documentos em `docs/` e `docs/archive/`
- Movidos scripts SQL para `backend/migrations/`
- Movidos scripts Python para `backend/scripts/utilities/`
- Removidos diretórios: `config/`, `src/` (código Streamlit antigo)
- Criado script de limpeza de branches: `scripts/cleanup-stale-branches.sh`

### 📚 Documentação
- Atualizado README.md com Next.js 15.5.7 e nota de segurança
- Criado REPOSITORY_ORGANIZATION_REPORT.md com análise completa
- Criado V2_PROJECT_MAP_ARCHIVED.md com instruções de restauração
- Adicionado deployment para Vercel além de Cloudflare Pages

### 🔧 Configuração
- Removida opção deprecated `swcMinify` do next.config.js (agora padrão)
- Atualizado eslint-config-next para 15.5.7

### 📊 Impacto
- Redução de 80% no tamanho do repositório (120MB → 23MB)
- Estrutura mais profissional e organizada
- Repositório 100% focado em V3 (Next.js + FastAPI)

---

## [3.0.0-alpha] - 2025-11-16

### ✨ Adicionado
- Estrutura inicial do projeto
- Configuração de ambiente
- Cópia de dados do project_map
- Documentação base

### 🔧 Configuração
- Setup Cursor + Claude Code
- Git workflow definido
- Scripts de sync e verificação

---

## [2.0.0] - 2025-10-13 (project_map - Referência)

Ver: https://github.com/aikiesan/project_map/blob/main/CHANGELOG.md

**Base para migração V3:**
- 8 módulos funcionais
- Bagacinho IA com RAG
- Sistema WCAG 2.1 Level A
- 20+ referências científicas
- Dados validados FAPESP

---

**Convenções:**
- ✨ Adicionado: Novas features
- 🔧 Configuração: Mudanças de config
- 🐛 Corrigido: Bug fixes
- 📚 Documentação: Docs
- ♻️ Refatoração: Code refactor
- 🚀 Performance: Melhorias
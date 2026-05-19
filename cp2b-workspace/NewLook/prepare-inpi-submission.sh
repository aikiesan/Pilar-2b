#!/bin/bash

# Script para preparar submissão do código-fonte ao INPI/INOVA Unicamp
# CP2B Maps V3 - Registro de Programa de Computador

echo "=========================================="
echo "CP2B Maps V3 - Preparação INPI/INOVA"
echo "=========================================="
echo ""

# Definir diretório de saída
OUTPUT_DIR="$(pwd)/inpi-submission"
DATE=$(date +%Y%m%d)
ZIP_NAME="cp2b-maps-v3-source-code-${DATE}.zip"

# Criar diretório de saída
mkdir -p "$OUTPUT_DIR"

echo "📦 Preparando arquivo para submissão..."
echo ""

# Verificar se estamos no diretório correto
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ ERRO: Execute este script do diretório cp2b-workspace/NewLook/"
    exit 1
fi

# Criar arquivo ZIP com código-fonte
echo "🗜️  Compactando código-fonte..."
zip -r "$OUTPUT_DIR/$ZIP_NAME" \
    frontend/ \
    backend/ \
    docs/ \
    README.md \
    CHANGELOG.md \
    CONTRIBUTING.md \
    DEPLOYMENT_GUIDE.md \
    DEVELOPMENT_STRATEGY.md \
    PRODUCTION_SETUP_GUIDE.md \
    SECURITY_AUDIT_REPORT.md \
    TESTING.md \
    TEST_STRUCTURE.md \
    -x "*/node_modules/*" \
    -x "*/.next/*" \
    -x "*/venv/*" \
    -x "*/__pycache__/*" \
    -x "*/dist/*" \
    -x "*/build/*" \
    -x "*/.pytest_cache/*" \
    -x "*/coverage/*" \
    -x "*/.git/*" \
    -x "*/.env*" \
    -x "*/playwright-report/*" \
    -x "*/test-results/*" \
    > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Arquivo criado com sucesso!"
    echo ""
    echo "📊 Estatísticas do arquivo:"
    ls -lh "$OUTPUT_DIR/$ZIP_NAME"
    echo ""

    # Calcular hash SHA-256 do arquivo ZIP
    echo "🔐 Calculando hash SHA-256..."
    if command -v sha256sum &> /dev/null; then
        HASH=$(sha256sum "$OUTPUT_DIR/$ZIP_NAME" | awk '{print $1}')
        echo "   $HASH"
    elif command -v shasum &> /dev/null; then
        HASH=$(shasum -a 256 "$OUTPUT_DIR/$ZIP_NAME" | awk '{print $1}')
        echo "   $HASH"
    else
        echo "   (comando sha256sum não disponível)"
    fi
    echo ""

    # Contar arquivos incluídos
    echo "📁 Contando arquivos incluídos..."
    FILE_COUNT=$(unzip -l "$OUTPUT_DIR/$ZIP_NAME" | tail -1 | awk '{print $2}')
    echo "   Total: $FILE_COUNT arquivos"
    echo ""

    # Criar arquivo de metadados
    METADATA_FILE="$OUTPUT_DIR/submission-metadata.txt"
    cat > "$METADATA_FILE" << EOF
=========================================
CP2B Maps V3 - Metadados da Submissão
=========================================

Data de preparação: $(date '+%d/%m/%Y %H:%M:%S')
Arquivo ZIP: $ZIP_NAME
Tamanho: $(ls -lh "$OUTPUT_DIR/$ZIP_NAME" | awk '{print $5}')
Total de arquivos: $FILE_COUNT
Hash SHA-256 (ZIP): $HASH

Hash SHA-256 (código-fonte completo):
d11a5674acc33ab8017c5c867e62eb20eeaf4adbb382e48f079eb73855c9cf59

Projeto: FAPESP 2025/08745-2
Instituição: NIPE-UNICAMP
Versão: 3.0.0 (Sprint 4 Complete)

URLs de Produção:
- Frontend: https://cp2bmaps.pages.dev
- Backend: https://newlook-production.up.railway.app
- API Docs: https://newlook-production.up.railway.app/docs

Contatos:
- INOVA Unicamp: https://www.inova.unicamp.br
- INPI: https://www.gov.br/inpi

Conteúdo incluído:
- Frontend completo (Next.js 16 + React + TypeScript)
- Backend completo (FastAPI + Python)
- Documentação técnica
- Arquivos de configuração
- README e guias de desenvolvimento

Conteúdo excluído:
- node_modules (dependências externas)
- .next (build artifacts)
- venv (ambiente virtual Python)
- __pycache__ (cache Python)
- .git (histórico de versões)
- .env (variáveis de ambiente secretas)
- test-results (resultados de testes)

PRÓXIMOS PASSOS:
1. Fazer upload do arquivo ZIP para Google Drive
2. Compartilhar com "Qualquer pessoa com o link pode visualizar"
3. Copiar link compartilhado
4. Preencher formulário INOVA Unicamp com o link
5. Revisar todas as informações antes de enviar
6. Confirmar lista de autores e contribuições

DOCUMENTAÇÃO DE APOIO:
- REGISTRO_INPI_INOVA_UNICAMP.md (respostas completas)
- REGISTRO_INPI_RESUMO_RAPIDO.md (guia rápido)

=========================================
EOF

    echo "📝 Arquivo de metadados criado: $METADATA_FILE"
    echo ""
    echo "✅ PREPARAÇÃO CONCLUÍDA!"
    echo ""
    echo "📂 Arquivos criados em: $OUTPUT_DIR/"
    echo "   - $ZIP_NAME"
    echo "   - submission-metadata.txt"
    echo ""
    echo "🚀 PRÓXIMOS PASSOS:"
    echo "   1. Fazer upload do arquivo ZIP para Google Drive"
    echo "   2. Compartilhar: 'Qualquer pessoa com o link pode visualizar'"
    echo "   3. Copiar link compartilhado"
    echo "   4. Preencher formulário INOVA com o link"
    echo "   5. Revisar e enviar"
    echo ""
    echo "📖 Documentação de apoio:"
    echo "   - ../../REGISTRO_INPI_INOVA_UNICAMP.md (respostas completas)"
    echo "   - ../../REGISTRO_INPI_RESUMO_RAPIDO.md (guia rápido)"
    echo ""
else
    echo "❌ ERRO: Falha ao criar arquivo ZIP"
    exit 1
fi

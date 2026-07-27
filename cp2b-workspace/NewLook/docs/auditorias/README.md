# Auditorias do PILAR-2b

Este diretório separa evidência histórica de fontes normativas. O índice
completo, relatório por relatório e com o commit original, está em
[2026-07 — consistência canônica](2026-07-consistencia-canonica/README.md).

## O que foi auditado

Entre 25/07 e 03/08/2026 foram auditados: origem dos números estaduais,
parâmetros BMP/FDE, atividade municipal, FORSU, lodos, banco legado, API, mapa,
UI, manuscrito, licença, atribuição, corpus bibliográfico e histórico Git.

## O que foi encontrado

1. números concorrentes e snapshots legados eram publicados por caminhos
   diferentes;
2. o corpus agregado de BMP não tinha observações nem gerador versionados;
3. A2c endereçava a tabela legada, B1-FINAL não era reproduzível e a atribuição
   do `bmp.max` de FORSU em A8 não era auditável;
4. o refactor `0c0d38a` quebrou a equivalência da rota pública, embora a queda
   anterior do total tenha vindo de mudanças paramétricas em `cb7967a`;
5. FORSU modelado por população coexistia com massa medida SNIS;
6. licença GPL-3.0 estava correta, mas atribuições FAPESP exibiam apenas um dos
   dois processos em superfícies diferentes;
7. FS era definido como fração temporal e aplicado sobre atividades anuais,
   descontando novamente massa já integrada ao longo do ano.

## O que foi decidido

- `feedstocks.yaml → pipeline → canonical_results.json` é a cadeia única;
- SNIS 2022 CO111 é a atividade preferencial de FORSU, com fallback municipal
  explícito; ES006 instancia os dois lodos;
- biomassa e gases vêm da mesma instância e as rotas pública/canônica devem ser
  iguais em 645/645 municípios;
- o corpus agregado fica em quarentena e R2 suspensa;
- o log metodológico é consecutivo e registra estados e sucessoras;
- GPL-3.0 é a licença do software; ambos os processos FAPESP são atribuídos;
- o CI rejeita afirmações numéricas canônicas copiadas à mão.
- FS representa apenas retenção após perda documentada em estocagem; sem fonte
  específica, FS=1,00.

## Estados históricos

- **ATIVO/APLICADO:** decisão ou correção vigente.
- **HISTÓRICO:** fotografia preservada, não fonte atual.
- **SUPERADO:** conclusão preservada, mas explicitamente inválida para uso.
- **QUARENTENA:** evidência preservada e proibida como entrada paramétrica.

Fontes atuais: [procedência](../PROCEDENCIA.md),
[decisões](../data/DECISOES_METODOLOGICAS.md) e
[resultados](../data/canonical_results.json).

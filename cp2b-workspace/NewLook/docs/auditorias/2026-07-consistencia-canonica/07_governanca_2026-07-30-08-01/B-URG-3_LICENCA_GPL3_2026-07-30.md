# B-URG-3 — consistência da licença GPL-3.0

Data da verificação: 2026-07-27

Branch: `fix/canonical-consistency-2026-07`

Decisão vinculante: GPL-3.0, conforme o registro INPI mantido via Inova UNICAMP.

## Resultado executivo

O código e os metadados locais foram alinhados à GNU General Public License
version 3. O texto integral da GPLv3 substituiu os avisos abreviados nos dois
arquivos `LICENSE` rastreados. A única afirmação que atribuía outra licença ao
projeto foi corrigida. README, CITATION, termos, página de citação e página
“sobre” já estavam coerentes com GPL-3.0.

Permanecem dois alertas que não foram alterados por este lote:

1. o dataset companion `10.25824/redu/F36WP9` está publicado como
   **CC BY-NC 4.0**, não como GPL-3.0;
2. `react-leaflet` e `@react-leaflet/core` declaram **Hippocratic License 2.1**,
   incompatível com a GPL-3.0 por acrescentar restrições de uso.

## Antes e depois das ocorrências alteradas

| Local | Antes | Depois |
|---|---|---|
| `/LICENSE` | Aviso abreviado de 17 linhas; o GitHub não o reconhecia (`NOASSERTION`, “Other”). | Texto integral e inalterado da GNU GPL version 3, 29 June 2007. A detecção automática deverá mudar após a publicação desta revisão no GitHub. |
| `/cp2b-workspace/NewLook/LICENSE` | Mesmo aviso abreviado de 17 linhas. | Texto integral e inalterado da GNU GPL version 3. |
| `backend/pyproject.toml` | Classificador GPLv3, mas sem campo PEP 621 `license`. | `license = {text = "GPL-3.0-only"}`, preservado o classificador GPLv3. |
| `frontend/package.json` | `"license": "GPL-3.0"`. | Identificador SPDX não ambíguo `"license": "GPL-3.0-only"`. |
| `frontend/package-lock.json` (pacote raiz) | `"license": "GPL-3.0"`. | Sincronizado com o manifesto: `"license": "GPL-3.0-only"`; licenças de terceiros foram preservadas. |
| `backend/app/main.py` | Sem aviso de licença no arquivo-fonte principal do backend. | Aviso GPLv3, exclusão de garantia, referência ao texto integral e `SPDX-License-Identifier: GPL-3.0-only`. |
| `frontend/src/app/layout.tsx` | Sem aviso de licença no arquivo-fonte principal do frontend. | Aviso GPLv3, exclusão de garantia, referência ao texto integral e `SPDX-License-Identifier: GPL-3.0-only`. |
| `DECISOES_METODOLOGICAS_RASCUNHO_D01-D11.md`, D11 | Afirmava que parte do repositório e da documentação declarava MIT e mantinha a decisão aberta. | D11 marcada como resolvida; a atribuição incorreta foi removida e a auditoria externa foi referenciada. |

### Ocorrências verificadas e já corretas

Não exigiram edição: `README.md`, `cp2b-workspace/NewLook/README.md`,
`CITATION.cff`, `frontend/src/app/[locale]/cite/page.tsx`,
`frontend/src/app/[locale]/terms/page.tsx` e os textos localizados da página
“sobre”. Todos apresentam GPL-3.0 ou não apresentam declaração conflitante.

A ocorrência de “MIT” em
`AUDITORIA_PILAR2B_2026-07-25.md` foi preservada: ela descreve licenças de
dependências de terceiros no `package-lock.json`, não a licença do PILAR-2b.
As ocorrências dentro de `package-lock.json` também foram preservadas pelo
mesmo motivo.

## Metadado público do GitHub

Consulta pública à API de `aikiesan/Pilar-2b` em 2026-07-27:

| Campo | Antes deste commit | Depois local |
|---|---|---|
| `license.key` | `other` | texto canônico GPLv3 presente; reclassificação depende de push e reindexação do GitHub |
| `license.spdx_id` | `NOASSERTION` | esperado `GPL-3.0`; ainda não verificável sem publicar o commit |
| descrição/tópicos | sem referência a MIT | sem alteração necessária |

O campo de licença do GitHub é derivado do arquivo `LICENSE`; não foi feita
mutação externa nesta auditoria.

## Dataset companion

DOI: <https://doi.org/10.25824/redu/F36WP9>

O endpoint público do REDU/Unicamp informa, para a versão 1.0 publicada em
2026-02-19:

```text
license.name = CC BY-NC 4.0
license.uri  = http://creativecommons.org/licenses/by-nc/4.0
```

O registro DataCite, por sua vez, retorna `rightsList: []`; portanto, a licença
não foi propagada para o metadado DataCite, embora esteja explícita no REDU.

**Divergência reportada:** CC BY-NC 4.0 no dataset versus GPL-3.0 no software.
Além de serem licenças diferentes, a cláusula NC restringe uso comercial e não
é compatível com a GPL para uma obra combinada. Isso não prova, por si só, um
erro: software e dados podem ter licenças distintas. Requer confirmação dos
responsáveis sobre a intenção editorial. Conforme o escopo do lote, nenhum
registro externo foi alterado.

Fontes consultadas:

- API pública do REDU:
  <https://redu.unicamp.br/api/datasets/:persistentId/?persistentId=doi:10.25824/redu/F36WP9>
- API pública DataCite:
  <https://api.datacite.org/dois/10.25824/redu/F36WP9>

## Compatibilidade das dependências

### JavaScript/TypeScript

Foram examinados os 942 pacotes rastreados em
`frontend/package-lock.json`. Licenças permissivas (MIT, BSD, ISC, Apache-2.0,
0BSD, BlueOak, CC0), LGPL-3.0-or-later e MPL-2.0 não geraram alerta de
incompatibilidade para este inventário.

Dependências incompatíveis, listadas sem remoção:

| Pacote | Versão | Relação | Licença declarada | Avaliação |
|---|---:|---|---|---|
| `react-leaflet` | 4.2.1 | direta | Hippocratic-2.1 | Incompatível: contém restrições adicionais de finalidade/uso não permitidas pela GPL-3.0. |
| `@react-leaflet/core` | 2.1.0 | transitiva | Hippocratic-2.1 | Incompatível pelo mesmo motivo. |

Alerta adicional: `leaflet.heat` 0.2.0 não declara licença no lockfile. O pacote
não foi classificado como incompatível, mas exige confirmação documental antes
de uma distribuição formal.

### Python

Foram consultados no PyPI os metadados das 36 entradas declaradas em
`backend/requirements.txt` (35 nomes únicos). As licenças encontradas foram MIT,
BSD, Apache-2.0, Unlicense, HPND/MIT-CMU e LGPL com exceções; nenhuma
incompatibilidade direta com GPL-3.0 foi identificada.

Limitação reproduzível: nove requisitos usam limites inferiores (`>=`) e não há
lockfile Python. A versão resolvida desses pacotes e de suas dependências
transitivas pode variar no tempo; por isso, esta conclusão cobre os metadados
diretos consultados em 2026-07-27, não uma árvore transitiva imutável.

## Critério

A GPL-3.0, seção 10, proíbe impor restrições adicionais aos direitos
concedidos. Por isso, licenças com restrições de finalidade de uso foram
sinalizadas. Licenças permissivas e copyleft compatíveis foram mantidas, com
suas obrigações próprias de aviso e atribuição.

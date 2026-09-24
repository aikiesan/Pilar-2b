/**
 * Finds Portuguese UI text in TypeScript/TSX source.
 *
 * Why an AST and not regexes: the first version of this check matched JSX text
 * and a few attributes line by line, and so missed three kinds of Portuguese
 * that all reached the English site —
 *   1. string literals outside JSX: `label: 'Biomassa'`, `: 'Sem dados'`;
 *   2. JSX text on its own line, between a tag on the line above and one below;
 *   3. anything without an accent: 'Fechar', 'Streams ativos', 'Clique para…'.
 * Walking the TypeScript AST sees every literal and every text node, never sees
 * comments, and can tell copy from code.
 *
 * What counts as code, and is skipped:
 *   - import/export module specifiers and object keys (`{ 'Agrícola': … }` maps
 *     an API value, it does not display one);
 *   - string literal *types* (`sector: 'URBANO' | 'PECUÁRIA'`);
 *   - operands of ===, !==, ==, != and `case` labels — comparisons against the
 *     backend's Portuguese codes, which are identifiers — and patterns handed
 *     to string matchers (`.includes('termelétrica')`), which test data;
 *   - arguments to console.* and logger.* — developer output, not UI;
 *   - the value of a `'pt-BR'` property: a localized record's Portuguese half
 *     (see src/lib/localized.ts) is exactly where Portuguese belongs.
 *
 * Everything else is copy. A genuine exception — a proper noun, an official
 * dataset name, a citation — is marked with `i18n-exempt: <reason>` in a comment
 * on the same line or on the line directly above.
 */

import ts from 'typescript';

/** Characters that occur in Portuguese and not in English UI text. */
export const PORTUGUESE_CHARS = /[ãõçáéíóúâêôàÃÕÇÁÉÍÓÚÂÊÔÀ]/;

/**
 * Accented place names that English text uses as they are ("the municipalities
 * of São Paulo"). Removed before the checks below, so they are never the reason
 * a string counts as Portuguese.
 */
export const ACCENTED_PLACE_NAMES =
  /(?<![A-Za-zÀ-ÿ])(?:São Paulo|Ribeirão Preto|São José dos Campos|Paraná|Goiás|Ceará|Piauí|Pará|Amapá|Maranhão|Rondônia|Brasília|Espírito Santo)(?![A-Za-zÀ-ÿ])/g;

/** A rate or density written the Portuguese way: "/ano", "/dia", "hab/…". */
export const PORTUGUESE_UNIT = /\/(ano|dia|mês|mes)\b|\bhab\.?\//;

/**
 * Unaccented words that are Portuguese and not English. Deliberately excludes
 * words both languages share ("total", "real", "ideal", "area", "biogas") and
 * ones English uses ("do", "no", "as", "a", "e").
 */
export const PORTUGUESE_WORDS = new Set([
  // function words
  'de', 'da', 'das', 'dos', 'para', 'com', 'sem', 'uma', 'pelo', 'pela', 'pelos', 'pelas',
  'nos', 'nas', 'ao', 'aos', 'ou', 'esta', 'este', 'isso', 'isto', 'mais', 'menos', 'nao',
  'sobre', 'entre', 'ate', 'apos', 'cada', 'onde', 'quando', 'como', 'seu', 'sua', 'seus', 'suas',
  // UI verbs
  'clique', 'carregando', 'selecione', 'selecionar', 'fechar', 'voltar', 'buscar', 'pesquisar',
  'baixar', 'limpar', 'salvar', 'cancelar', 'enviar', 'entrar', 'sair', 'abrir', 'aplicar',
  'copiar', 'compartilhar', 'exportar', 'tentar', 'novamente', 'ver', 'veja', 'resetar', 'redefinir',
  'expandir', 'recolher', 'mostrar', 'ocultar', 'escolha', 'digite', 'adicionar', 'remover',
  // UI nouns and adjectives
  'nenhum', 'nenhuma', 'erro', 'todos', 'todas', 'senha', 'resultado', 'resultados', 'detalhes',
  'fonte', 'fontes', 'dados', 'ano', 'anos', 'mapa', 'mapas', 'camada', 'camadas', 'filtro',
  'filtros', 'temas', 'potencial', 'cenario', 'residuo', 'residuos', 'municipio', 'municipios',
  'regiao', 'analise', 'analises', 'setor', 'setores', 'agricola', 'pecuaria', 'urbano', 'urbana',
  'tipo', 'tipos', 'valor', 'valores', 'inicio', 'proximo', 'anterior', 'pagina', 'usuario',
  'coleta', 'logistica', 'sazonalidade', 'competicao', 'fator', 'fatores', 'correcao', 'padrao',
  'habitantes', 'densidade', 'biomassa', 'biometano', 'bioenergia', 'metano', 'disponivel',
  'indisponivel', 'obrigatorio', 'invalido', 'ferramentas', 'legenda', 'escala', 'cores',
  'rodovias', 'gasodutos', 'subestacoes', 'usinas', 'estado', 'estados', 'cidade', 'ativo',
  'ativos', 'dominante', 'teorico', 'medio', 'prazo', 'otimista', 'conservador', 'fronteira',
]);

/** True when `text` reads as Portuguese UI copy. */
export function looksPortuguese(text) {
  const value = text.replace(ACCENTED_PLACE_NAMES, ' ').replace(/\s+/g, ' ').trim();
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(value)) return false;
  // URLs and e-mail addresses carry "com", "de" and friends as domain parts.
  if (/:\/\/|www\.|\S+@\S+\.\S+/.test(value)) return false;
  if (PORTUGUESE_CHARS.test(value)) return true;
  // Portuguese units read as one token ("m³/ano", "t/dia", "hab/km²") and would
  // otherwise pass as identifiers below.
  if (PORTUGUESE_UNIT.test(value)) return true;

  const words = value.match(/[A-Za-zÀ-ÿ]+/g) ?? [];
  if (words.length === 1) {
    // A lone lowercase or UPPERCASE token is an identifier or a code ('urbano',
    // 'ALTO'); a capitalised one is a label ('Fechar', 'Camadas').
    // Trailing punctuation is fine ('Carregando…', 'Região:'); anything else
    // around the word ('Dados_v2', 'mapa.csv') makes it an identifier.
    const [word] = words;
    const rest = value.replace(word, '');
    return (
      /^[A-Z][a-z]+$/.test(word) &&
      PORTUGUESE_WORDS.has(word.toLowerCase()) &&
      /^[\s.,:;!?…()"'\u2013\u2014-]*$/.test(rest)
    );
  }
  // Identifier-like strings (keys, class names, paths) have no spaces.
  if (!value.includes(' ')) return false;
  return words.some((word) => PORTUGUESE_WORDS.has(word.toLowerCase()));
}

const EXEMPT = /i18n-exempt:\s*\S/;
/** String methods whose arguments are patterns matched against data, not copy. */
const MATCHER_METHODS = new Set([
  'includes', 'startsWith', 'endsWith', 'indexOf', 'lastIndexOf', 'split', 'localeCompare', 'match', 'search',
]);
const BARE_EXEMPT = /i18n-exempt(?!:\s*\S)(?!-file)/;

/** Nodes a string can sit inside while still being plain data. */
function isDataNode(n) {
  return (
    ts.isObjectLiteralExpression(n) ||
    ts.isArrayLiteralExpression(n) ||
    ts.isPropertyAssignment(n) ||
    ts.isParenthesizedExpression(n) ||
    ts.isAsExpression(n) ||
    ts.isSatisfiesExpression?.(n) ||
    ts.isTemplateExpression(n) ||
    ts.isTemplateSpan(n) ||
    (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken)
  );
}

/**
 * A localized record's Portuguese half: `{ 'pt-BR': '…', en: '…' }`, where the
 * half may itself be a whole structure — `{ 'pt-BR': { title, sections: […] } }`.
 * Walks up through data nodes only, so a function inside the half is still
 * scanned like any other code.
 */
function isInPortugueseHalf(node) {
  for (let child = node, n = node.parent; n && isDataNode(n); child = n, n = n.parent) {
    if (ts.isPropertyAssignment(n) && n.initializer === child) {
      const name = n.name;
      if ((ts.isStringLiteral(name) || ts.isIdentifier(name)) && name.text === 'pt-BR') return true;
    }
  }
  return false;
}

function isCodeContext(node) {
  const parent = node.parent;
  if (!parent) return false;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) {
    return true;
  }
  if (ts.isImportTypeNode?.(parent) || ts.isLiteralTypeNode(parent)) return true;
  if ((ts.isPropertyAssignment(parent) || ts.isPropertySignature(parent)) && parent.name === node) return true;
  if (ts.isElementAccessExpression(parent) && parent.argumentExpression === node) return true;
  if (ts.isCaseClause(parent)) return true;
  if (ts.isCallExpression(parent) && ts.isPropertyAccessExpression(parent.expression)) {
    const method = parent.expression.name.text;
    if (MATCHER_METHODS.has(method)) return true;
    if (method === 'replace' || method === 'replaceAll') return parent.arguments[0] === node;
  }
  if (ts.isBinaryExpression(parent)) {
    const op = parent.operatorToken.kind;
    if (
      op === ts.SyntaxKind.EqualsEqualsEqualsToken ||
      op === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
      op === ts.SyntaxKind.EqualsEqualsToken ||
      op === ts.SyntaxKind.ExclamationEqualsToken
    ) {
      return true;
    }
  }
  if (isInPortugueseHalf(node)) return true;
  // Developer output.
  for (let n = parent; n; n = n.parent) {
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
        if (callee.expression.text === 'console' || callee.expression.text === 'logger') return true;
      }
      break;
    }
    if (ts.isBlock(n) || ts.isSourceFile(n)) break;
  }
  return false;
}

/**
 * Scans one file. Returns `{ findings, bareExemptions }`: each finding is
 * `{ line, text }` (1-based line); `bareExemptions` lists lines carrying an
 * `i18n-exempt` marker with no reason, which the gate rejects.
 */
export function scanSource(source, fileName = 'file.tsx') {
  const rawLines = source.split('\n');
  const findings = [];
  const bareExemptions = [];

  rawLines.forEach((line, index) => {
    if (BARE_EXEMPT.test(line)) bareExemptions.push(index + 1);
  });

  // A file whose every string is data (a bibliography, say) opts out whole.
  if (/i18n-exempt-file:\s*\S/.test(source)) return { findings, bareExemptions };

  const kind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);

  const isExempt = (line) =>
    EXEMPT.test(rawLines[line - 1] ?? '') || (line > 1 && EXEMPT.test(rawLines[line - 2] ?? '') && /^\s*(\/\/|\{?\s*\/\*)/.test(rawLines[line - 2]));

  const report = (node, text) => {
    if (!looksPortuguese(text)) return;
    const line = file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1;
    if (isExempt(line)) return;
    findings.push({ line, text: text.replace(/\s+/g, ' ').trim() });
  };

  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isCodeContext(node)) report(node, node.text);
    } else if (ts.isTemplateExpression(node)) {
      if (!isCodeContext(node)) {
        // Joined without separators: `${a}_medio_m3_yr` builds a field name,
        // and only copy has spaces of its own.
        const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)];
        report(node, parts.join(''));
      }
    } else if (ts.isJsxText(node)) {
      if (node.text.trim()) report(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);

  return { findings, bareExemptions };
}

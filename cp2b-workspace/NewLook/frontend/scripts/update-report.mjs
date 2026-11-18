#!/usr/bin/env node
/**
 * Update report: screenshots of the live site plus the patch notes of the
 * release, as one PDF to share with colleagues.
 *
 *   cd cp2b-workspace/NewLook/frontend
 *   node scripts/update-report.mjs                  # versions since 3.3.0, live site
 *   node scripts/update-report.mjs --since 3.5.0    # a shorter cycle
 *   node scripts/update-report.mjs --base http://localhost:3000   # a local build
 *
 * Writes update-report/PILAR-2b-atualizacao-<last version>.pdf and the PNGs
 * next to it. Needs the Playwright Chromium (`npx playwright install chromium`
 * once); CHROMIUM_PATH points at another Chromium binary instead.
 *
 * The screenshots are taken with the cookie banner answered "essential" (except
 * the one that shows the banner), and the analytics requests are blocked, so
 * the report adds no visits to the platform's counts.
 */
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND = path.resolve(HERE, '..')

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback
}
const BASE = option('base', 'https://cp2b.unicamp.br/pilar2b').replace(/\/$/, '')
const SINCE = option('since', '3.3.0')
const OUT = path.resolve(option('out', path.join(FRONTEND, 'update-report')))

const consentSource = await readFile(path.join(FRONTEND, 'src/lib/consent.ts'), 'utf8')
const CONSENT_VERSION = consentSource.match(/CONSENT_VERSION\s*=\s*'([^']+)'/)?.[1]
if (!CONSENT_VERSION) throw new Error('CONSENT_VERSION not found in src/lib/consent.ts')

const notes = JSON.parse(await readFile(path.join(FRONTEND, 'src/data/patch-notes.json'), 'utf8'))
const versionKey = (v) => v.split('.').map(Number).reduce((acc, n) => acc * 1000 + n, 0)
const entries = notes.entries.filter((e) => versionKey(e.version) >= versionKey(SINCE))
if (!entries.length) throw new Error(`no patch notes from ${SINCE} on`)

// 16:9, so two screenshots fit on an A4 page.
const DESKTOP = { width: 1440, height: 810 }
const PHONE = { width: 390, height: 844 }

/** What the report shows, in order. `act` runs after the page settles. */
const SHOTS = [
  {
    file: '01-inicio',
    url: '/pt-BR',
    title: 'Nova página inicial',
    caption: 'A página inicial apresenta a plataforma, com uma prévia do mapa, e leva direto ao mapa e ao catálogo de dados. Visual novo: terracota, títulos com serifa e tema claro.',
  },
  {
    file: '02-mapa',
    url: '/pt-BR/map',
    settle: 8000,
    title: 'Mapa',
    caption: 'O mapa abre no mapa base OpenStreetMap ("Mapa"), sem marca d\'água nem chave de API. No painel, a aba de fontes agora se chama "Fontes".',
  },
  {
    file: '03-menu-sobre',
    url: '/pt-BR/patch-notes',
    title: 'Menu Sobre: o CP2b no site do CP2b',
    caption: 'Menus reorganizados em Plataforma, Dados, Método e Sobre. O Sobre leva às páginas oficiais do CP2b (governança, parceiros, eixos, equipe, notícias...), marcadas com ↗; a antiga página Sobre redireciona para lá.',
    act: async (page) => {
      await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Sobre' }).click()
      await page.waitForTimeout(600)
    },
  },
  {
    file: '04-municipio',
    url: '/pt-BR/municipalities/campinas-sp',
    settle: 4000,
    title: 'Página de cada município',
    caption: 'Cada município tem uma página com endereço legível (/municipalities/campinas-sp): potencial de metano, posição no estado, divisão por setor e resíduo, vizinhos e como citar. Ao compartilhar o link, aparece uma imagem com o nome e o potencial do município.',
  },
  {
    file: '05-dados',
    url: '/pt-BR/data',
    title: 'Catálogo de dados',
    caption: 'Uma página por setor e por resíduo, com o potencial metanogênico (BMP), a caracterização química, as fontes e como citar, mais a legenda e os códigos das camadas em CSV.',
  },
  {
    file: '06-guia-faq',
    url: '/pt-BR/guide',
    title: 'Guia e perguntas frequentes',
    caption: 'As perguntas frequentes da plataforma agora ficam no fim do Guia. Avisos de erro nos dados vão pelo formulário de contato do CP2b.',
    act: async (page) => {
      await page.locator('#faq').scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
    },
  },
  {
    file: '07-cookies',
    url: '/pt-BR',
    fresh: true,
    title: 'Aviso de cookies e contagem anônima',
    caption: 'Duas opções equivalentes no aviso de cookies. As visitas passam a ser contadas de forma anônima para todos (sem cookie, sem identificador e sem IP; só totais por dia), conforme a Política de Privacidade.',
  },
  {
    file: '08-celular',
    url: '/pt-BR',
    phone: true,
    title: 'No celular',
    caption: 'No celular, uma barra inferior leva ao Mapa, aos Municípios, aos Dados e ao menu completo.',
  },
]

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
await mkdir(OUT, { recursive: true })

async function shoot(shot) {
  const context = await browser.newContext({
    viewport: shot.phone ? PHONE : DESKTOP,
    deviceScaleFactor: shot.phone ? 2 : 1,
    isMobile: !!shot.phone,
    hasTouch: !!shot.phone,
    locale: 'pt-BR',
  })
  await context.route(/\/api\/v1\/analytics\//, (route) => route.fulfill({ status: 204, body: '' }))
  if (!shot.fresh) {
    await context.addInitScript((version) => {
      window.localStorage.setItem(
        'pilar2b-cookie-consent',
        JSON.stringify({ consent: 'essential', version, timestamp: new Date().toISOString() })
      )
    }, CONSENT_VERSION)
  }
  const page = await context.newPage()
  const response = await page.goto(BASE + shot.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  if (!response || response.status() >= 400) console.warn(`  ! ${shot.url} answered ${response?.status()}`)
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(shot.settle ?? 1500)
  if (shot.act) await shot.act(page)
  const file = path.join(OUT, `${shot.file}.png`)
  await page.screenshot({ path: file })
  await context.close()
  console.log(`  ok  ${shot.file}.png  ${shot.url}`)
  return { ...shot, png: await readFile(file) }
}

console.log(`Screenshots of ${BASE} → ${OUT}`)
const shots = []
for (const shot of SHOTS) shots.push(await shoot(shot))

// ── PDF ──────────────────────────────────────────────────────────────────────
const KIND = {
  added: 'Novo',
  changed: 'Mudou',
  fixed: 'Corrigido',
  security: 'Segurança',
  data: 'Dados',
  removed: 'Removido',
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const day = (iso) =>
  new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(new Date(iso))

const latest = entries[0]
const oldest = entries[entries.length - 1]
const period = day(oldest.date) === day(latest.date) ? day(latest.date) : `${day(oldest.date)} a ${day(latest.date)}`

const figure = (s) => `
  <figure class="${s.phone ? 'phone' : ''}">
    <h3>${esc(s.title)}</h3>
    <img src="data:image/png;base64,${s.png.toString('base64')}" alt="${esc(s.title)}">
    <figcaption>${esc(s.caption)}</figcaption>
  </figure>`

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  @page { size: A4; margin: 16mm 14mm 18mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.45 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif; color: #2b2622; margin: 0; }
  h1, h2, h3 { font-family: Georgia, "Times New Roman", serif; color: #8a3b1e; margin: 0; }
  .cover { border-bottom: 3px solid #b5532b; padding-bottom: 10mm; margin-bottom: 8mm; }
  .eyebrow { text-transform: uppercase; letter-spacing: .12em; font-size: 8.5pt; color: #8b7d72; }
  h1 { font-size: 26pt; margin: 2mm 0 3mm; }
  .lead { font-size: 11.5pt; color: #4a423c; max-width: 160mm; }
  .meta { margin-top: 4mm; font-size: 9.5pt; color: #6b6058; }
  .meta a { color: #8a3b1e; }
  h2 { font-size: 15pt; margin: 6mm 0 3mm; }
  .version { break-inside: avoid; margin-bottom: 4mm; }
  .version h4 { margin: 0 0 1.5mm; font-size: 10.5pt; }
  .version h4 span { color: #8b7d72; font-weight: normal; }
  ul { margin: 0; padding-left: 5mm; }
  li { margin-bottom: 1mm; }
  .tag { display: inline-block; min-width: 17mm; font-size: 8pt; font-weight: 600; color: #8a3b1e; text-transform: uppercase; letter-spacing: .04em; }
  .tag.security { color: #a12a2a; }
  .shots { break-before: page; }
  figure { margin: 0 0 6mm; break-inside: avoid; }
  figure h3 { font-size: 12.5pt; margin-bottom: 2mm; }
  figure img { width: 100%; border: 1px solid #ded6cf; border-radius: 2mm; display: block; }
  figure.phone img { width: 55mm; }
  figcaption { font-size: 9.5pt; color: #4a423c; margin-top: 2mm; }
  footer { font-size: 8.5pt; color: #8b7d72; border-top: 1px solid #ded6cf; padding-top: 3mm; margin-top: 6mm; }
</style></head><body>
  <section class="cover">
    <div class="eyebrow">CP2b · Centro Paulista de Estudos em Biogás e Bioprodutos</div>
    <h1>PILAR-2b: o que há de novo</h1>
    <p class="lead">Resumo da atualização da plataforma PILAR-2b (versões ${esc(oldest.version)} a ${esc(latest.version)}): visual novo, página inicial, catálogo de dados, páginas de município, menus reorganizados e contagem anônima de visitas.</p>
    <div class="meta">Período: ${esc(period)} · Plataforma: <a href="https://cp2b.unicamp.br/pilar2b">cp2b.unicamp.br/pilar2b</a> · Registro completo em Novidades (/pilar2b/pt-BR/patch-notes)</div>
  </section>

  <h2>Mudanças por versão</h2>
  ${entries
    .map(
      (e) => `
  <div class="version">
    <h4>${esc(e.version)} · ${esc(e.title['pt-BR'])} <span>(${esc(day(e.date))})</span></h4>
    <ul>${e.changes
      .map((c) => `<li><span class="tag ${esc(c.kind)}">${esc(KIND[c.kind] ?? c.kind)}</span> ${esc(c.text['pt-BR'])}</li>`)
      .join('')}</ul>
  </div>`
    )
    .join('')}

  <section class="shots">
    <h2>Como ficou</h2>
    ${shots.map(figure).join('')}
  </section>

  <footer>Prints de ${esc(BASE)} em ${esc(day(new Date().toISOString()))}. PILAR-2b · CP2b / NIPE · Unicamp.</footer>
</body></html>`

const htmlFile = path.join(OUT, 'report.html')
await writeFile(htmlFile, html)
const page = await browser.newPage()
await page.setContent(html, { waitUntil: 'load' })
const pdfFile = path.join(OUT, `PILAR-2b-atualizacao-${latest.version}.pdf`)
await page.pdf({
  path: pdfFile,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="width:100%;font-size:8px;color:#8b7d72;text-align:center;font-family:Arial">PILAR-2b · atualização ' +
    esc(latest.version) +
    ' · <span class="pageNumber"></span>/<span class="totalPages"></span></div>',
})
await browser.close()
console.log(`\nPDF: ${pdfFile}`)

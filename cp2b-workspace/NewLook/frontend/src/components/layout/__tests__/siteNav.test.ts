/**
 * The navigation may only link to pages that exist, by labels both catalogues
 * carry: a section of the redesign joins the menus with its first page.
 */
import fs from 'fs'
import path from 'path'
import en from '../../../../messages/en.json'
import pt from '../../../../messages/pt-BR.json'
import { allNavHrefs, currentNavHref, FOOTER_LINKS, NAV_GROUPS, TAB_BAR } from '../siteNav'
import { METHOD_PAGES_ENABLED } from '@/lib/featureFlags'

const APP = path.join(__dirname, '../../../app/[locale]')

/** The page file a locale-free href renders from, or undefined. */
function pageFile(href: string): string | undefined {
  const route = href.split('#')[0]
  const file = path.join(APP, route, 'page.tsx')
  return fs.existsSync(file) ? file : undefined
}

describe('siteNav', () => {
  it.each(Array.from(new Set(allNavHrefs())))('%s is a page', (href) => {
    expect(pageFile(href)).toBeDefined()
  })

  it.each(allNavHrefs().filter((href) => href.includes('#')))('%s anchors a section on its page', (href) => {
    const [route, anchor] = href.split('#')
    expect(fs.readFileSync(pageFile(route) as string, 'utf8')).toContain(`id="${anchor}"`)
  })

  it.each([
    ['pt-BR', pt],
    ['en', en],
  ])('has every label, description and group intro in %s', (_locale, messages) => {
    const { nav, nav_descriptions, nav_intro } = messages.common
    for (const group of NAV_GROUPS) {
      expect(nav).toHaveProperty(group.labelKey)
      expect(nav_intro[group.id].lede).toBeTruthy()
      expect(nav_intro[group.id].cta).toBeTruthy()
      for (const item of group.items) {
        expect(nav).toHaveProperty(item.labelKey)
        if (item.descriptionKey) expect(nav_descriptions).toHaveProperty(item.descriptionKey)
      }
    }
    for (const item of [...TAB_BAR, ...FOOTER_LINKS]) expect(nav).toHaveProperty(item.labelKey)
  })

  it('links to no held-back Método page while METHOD_PAGES_ENABLED is off', () => {
    if (METHOD_PAGES_ENABLED) return
    const held = ['/method', '/method/fde', '/method/scenarios', '/method/validation']
    expect(allNavHrefs().filter((href) => held.includes(href.split('#')[0]))).toEqual([])
  })

  it('lists each page once per group', () => {
    for (const group of NAV_GROUPS) {
      const hrefs = group.items.map((item) => item.href)
      expect(new Set(hrefs).size).toBe(hrefs.length)
    }
  })

  describe('currentNavHref', () => {
    it.each([
      ['/map', '/map'],
      ['/data', '/data'],
      // A child page is current over its parent.
      ['/data/legend', '/data/legend'],
      // Pages under a menu entry belong to it.
      ['/data/agricultural/cana-bagaco', '/data'],
      ['/method/science-base', '/method/science-base'],
      ['/guide/primeiros-passos', '/guide'],
      // An anchor is a section, never the current page; "/" is never a section.
      ['/about', '/about'],
      ['/', undefined],
      ['/login', undefined],
      // A shared prefix is not a parent.
      ['/mapping', undefined],
    ])('%s → %s', (pathname, expected) => {
      expect(currentNavHref(pathname)).toBe(expected)
    })
  })
})

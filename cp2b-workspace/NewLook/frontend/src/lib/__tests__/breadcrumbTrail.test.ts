import type { BreadcrumbItem } from '@/components/ui/Breadcrumb'
import { navCrumbs } from '../breadcrumbTrail'
import { METHOD_PAGES_ENABLED } from '../featureFlags'

// The keys stand in for the labels, so the trail reads as the menu tree.
const crumbs = (pathname: string, tail: BreadcrumbItem[] = []) => navCrumbs(pathname, (key) => key, tail)

describe('navCrumbs', () => {
  it('climbs from home through the menu group to the page', () => {
    expect(crumbs('/proximity')).toEqual([
      { label: 'home', href: '/' },
      { label: 'group_platform', href: '/map' },
      { label: 'proximity_logistics' },
    ])
  })

  it('does not link the group to the page the visitor is on', () => {
    expect(crumbs('/data')).toEqual([
      { label: 'home', href: '/' },
      { label: 'group_data' },
      { label: 'data_catalog' },
    ])
  })

  it('says a group that opens on its own entry once, below that entry', () => {
    expect(crumbs('/data/agricultural', [{ label: 'Agricultural' }])).toEqual([
      { label: 'home', href: '/' },
      { label: 'group_data', href: '/data' },
      { label: 'Agricultural' },
    ])
  })

  it('puts a municipality under the municipalities index', () => {
    expect(crumbs('/municipalities/campinas-sp', [{ label: 'Campinas' }])).toEqual([
      { label: 'home', href: '/' },
      { label: 'group_platform', href: '/map' },
      { label: 'municipalities', href: '/municipalities' },
      { label: 'Campinas' },
    ])
  })

  it('puts the guide articles under the guide', () => {
    expect(crumbs('/guide/mapa', [{ label: 'Mapa' }]).slice(-2)).toEqual([
      { label: 'guide_usage', href: '/guide' },
      { label: 'Mapa' },
    ])
  })

  it('names the science base under Método', () => {
    expect(crumbs('/method/science-base')).toEqual([
      { label: 'home', href: '/' },
      METHOD_PAGES_ENABLED ? { label: 'group_method', href: '/method' } : { label: 'group_method' },
      { label: 'scientific_database' },
    ])
  })

  it('falls back to home for a page no menu lists', () => {
    expect(crumbs('/patch-notes-old')).toEqual([{ label: 'home', href: '/' }])
  })
})

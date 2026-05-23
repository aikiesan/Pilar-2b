import { Page, Locator, expect } from '@playwright/test'

/**
 * Dashboard Page Object Model
 *
 * Encapsulates interactions with the authenticated dashboard hub.
 * The dashboard is a feature-overview landing page that links to the
 * map, calculator, scientific database, and other tools.
 */
export class DashboardPage {
  readonly page: Page

  // Core layout
  readonly header: Locator
  readonly main: Locator

  // Feature cards — each tool is presented as a navigable card
  readonly featureCards: Locator

  // Loading skeleton (shown while auth check runs)
  readonly loadingSkeleton: Locator

  // Navigation links to sub-features
  readonly mapLink: Locator
  readonly technologyRoutesLink: Locator

  constructor(page: Page) {
    this.page = page

    this.header = page.locator('header').first()
    this.main = page.locator('main, [role="main"]').first()

    this.featureCards = page.locator('[class*="card"], [class*="feature"], article').filter({
      hasText: /[Mm]apa|[Mm]ap|[Cc]alculadora|[Cc]alculator|[Rr]ota|[Rr]oute/,
    })

    this.loadingSkeleton = page.locator('[class*="skeleton"], [aria-busy="true"]').first()

    this.mapLink = page.locator('a[href*="/map"]').first()
    this.technologyRoutesLink = page
      .locator('a[href*="technology-routes"], a[href*="rotas"]')
      .first()
  }

  async goto(locale: string = 'pt-BR') {
    await this.page.goto(`/${locale}/dashboard`)
  }

  async waitForLoad() {
    // Wait for skeleton to disappear, then confirm main content is visible
    try {
      await this.loadingSkeleton.waitFor({ state: 'hidden', timeout: 15_000 })
    } catch {
      // Skeleton may not always be present
    }
    await this.main.waitFor({ state: 'visible', timeout: 20_000 })
  }

  async isAuthenticatedView(): Promise<boolean> {
    // Authenticated dashboard shows feature cards; unauthenticated redirects to login
    const url = this.page.url()
    return !url.includes('/login')
  }

  async getFeatureCardCount(): Promise<number> {
    return await this.featureCards.count()
  }
}

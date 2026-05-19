import { Page, Locator, expect } from '@playwright/test'

/**
 * Login Page Object Model
 *
 * Encapsulates all interactions with the login page for E2E tests.
 * Provides a clean API for authentication testing.
 */
export class LoginPage {
  readonly page: Page

  // Form elements
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly rememberMeCheckbox: Locator
  readonly forgotPasswordLink: Locator
  readonly createAccountLink: Locator

  // Feedback elements
  readonly errorMessage: Locator
  readonly loadingSpinner: Locator

  // Navigation elements
  readonly logoLink: Locator

  constructor(page: Page) {
    this.page = page

    // Form elements
    this.emailInput = page.locator('#email')
    this.passwordInput = page.locator('#password')
    this.submitButton = page.locator('button[type="submit"]')
    this.rememberMeCheckbox = page.locator('#remember-me')
    this.forgotPasswordLink = page.locator('a[href="#"]').filter({ hasText: /forgot|esqueceu/i })
    this.createAccountLink = page.locator('a[href*="/register"]').first()

    // Feedback elements
    this.errorMessage = page.locator('[role="alert"]')
    this.loadingSpinner = page.locator('[class*="animate-spin"]')

    // Navigation
    this.logoLink = page.locator('a[aria-label*="home"], a[aria-label*="voltar"]').first()
  }

  /**
   * Navigate to login page
   */
  async goto(locale: string = 'pt-BR') {
    await this.page.goto(`/${locale}/login`)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Fill in login credentials
   */
  async fillCredentials(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
  }

  /**
   * Submit the login form
   */
  async submit() {
    await this.submitButton.click()
  }

  /**
   * Perform complete login flow
   */
  async login(email: string, password: string) {
    await this.fillCredentials(email, password)
    await this.submit()
  }

  /**
   * Wait for login to complete (redirect to dashboard)
   */
  async waitForLoginSuccess() {
    await this.page.waitForURL(/\/dashboard/, { timeout: 15000 })
  }

  /**
   * Wait for error message to appear
   */
  async waitForError() {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Get error message text
   */
  async getErrorText(): Promise<string> {
    return await this.errorMessage.textContent() || ''
  }

  /**
   * Check if login form is visible and ready
   */
  async isReady(): Promise<boolean> {
    return (
      (await this.emailInput.isVisible()) &&
      (await this.passwordInput.isVisible()) &&
      (await this.submitButton.isVisible())
    )
  }

  /**
   * Check if submit button is disabled (loading state)
   */
  async isLoading(): Promise<boolean> {
    return await this.submitButton.isDisabled()
  }

  /**
   * Navigate to register page
   */
  async goToRegister() {
    await this.createAccountLink.click()
    await this.page.waitForURL(/\/register/)
  }

  /**
   * Navigate back to home
   */
  async goToHome() {
    await this.logoLink.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Verify accessibility basics
   */
  async checkAccessibility() {
    // Email input should have label
    await expect(this.page.locator('label[for="email"]')).toBeVisible()

    // Password input should have label
    await expect(this.page.locator('label[for="password"]')).toBeVisible()

    // Submit button should have accessible label
    const submitLabel = await this.submitButton.getAttribute('aria-label')
    expect(submitLabel).toBeTruthy()

    // Error messages should have role="alert"
    const errorContainer = this.page.locator('[role="alert"]')
    // Only check if error is present
    if (await this.errorMessage.isVisible()) {
      await expect(errorContainer).toHaveAttribute('aria-live', 'assertive')
    }
  }
}

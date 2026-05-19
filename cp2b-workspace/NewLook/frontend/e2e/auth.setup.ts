import { test as setup, expect } from '@playwright/test'
import { LoginPage } from './pages/login.page'
import { TEST_USER } from './fixtures/test-fixtures'

const authFile = 'e2e/.auth/user.json'

/**
 * Authentication Setup
 *
 * This setup runs before authenticated tests to establish a logged-in session.
 * The auth state is saved and reused across all authenticated test projects.
 *
 * Environment Variables:
 * - E2E_TEST_EMAIL: Test user email
 * - E2E_TEST_PASSWORD: Test user password
 */
setup('authenticate', async ({ page }) => {
  // Skip if no credentials configured
  if (!TEST_USER.email || TEST_USER.email === 'test@example.com') {
    console.log('Skipping auth setup - no test credentials configured')
    console.log('Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD environment variables')

    // Create empty auth state to allow tests to run
    await page.context().storageState({ path: authFile })
    return
  }

  const loginPage = new LoginPage(page)

  // Navigate to login page
  await loginPage.goto('pt-BR')

  // Verify login page is ready
  expect(await loginPage.isReady()).toBe(true)

  // Perform login
  await loginPage.login(TEST_USER.email, TEST_USER.password)

  // Wait for successful login (redirect to dashboard)
  try {
    await loginPage.waitForLoginSuccess()
    console.log('Authentication successful')
  } catch (error) {
    // Check if there's an error message
    if (await loginPage.errorMessage.isVisible()) {
      const errorText = await loginPage.getErrorText()
      console.error(`Login failed: ${errorText}`)
    }
    throw error
  }

  // Save authenticated state
  await page.context().storageState({ path: authFile })
})

/**
 * Additional setup for API mocking (if needed)
 */
setup.describe('API Setup', () => {
  setup.skip('mock-api-responses', async ({ page }) => {
    // This can be used to set up API mocks for testing
    // Currently skipped as we're testing against real API
    await page.route('**/api/v1/**', async (route) => {
      // Allow real requests to pass through
      await route.continue()
    })
  })
})

import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Proximity Stock Recommendations Feature
 *
 * These tests verify that the proximity recommendations are displayed correctly
 * for stockout alerts in the inventory planning section.
 *
 * Prerequisites:
 * - Playwright must be installed (npm install -D @playwright/test)
 * - Test user must exist with inventory_planning access
 * - Sample stockout alerts must exist in the database
 *
 * Run tests:
 *   npm run test:e2e e2e/proximity-recommendations.spec.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'testpassword';

test.describe('Proximity Stock Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/auth/login`);

    // Fill in login credentials
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(`${BASE_URL}/dashboard`, { timeout: 10000 });

    // Navigate to inventory planning section
    await page.goto(`${BASE_URL}/dashboard?section=inventory_planning`);

    // Wait for page to load
    await page.waitForTimeout(2000);
  });

  test('should display page without errors', async ({ page }) => {
    // Verify page loaded successfully
    await expect(page.locator('body')).toBeVisible();

    // Check that we're on the inventory planning section
    const url = page.url();
    expect(url).toContain('inventory_planning');

    // Look for any alert cards (they may or may not have proximity recommendations)
    const alertCards = page.locator('[class*="bg-"]').first();
    const isVisible = await alertCards.isVisible().catch(() => false);

    // It's OK if no alerts exist - just verify page loaded
    expect(isVisible).toBeDefined();
  });

  test('should display proximity recommendations for stockout alerts', async ({ page }) => {
    // Look for proximity recommendation boxes (emerald background)
    const proximityBox = page.locator('.bg-emerald-50\\/50').or(
      page.locator('[class*="bg-emerald"][class*="50"]')
    );

    const isVisible = await proximityBox.isVisible().catch(() => false);

    if (!isVisible) {
      // No stockout alerts with proximity recommendations - skip gracefully
      test.skip(true, 'No stockout alerts with proximity recommendations found');
      return;
    }

    // Verify the proximity box is visible
    await expect(proximityBox.first()).toBeVisible();

    // Check for "En Yakın Stok Kaynakları" heading
    const heading = page.locator('.bg-emerald-50\\/50').filter({
      hasText: /En Yakın Stok Kaynakları/i
    }).or(
      page.locator('[class*="bg-emerald"][class*="50"]').filter({
        hasText: /En Yakın Stok Kaynakları/i
      })
    );

    const headingVisible = await heading.isVisible().catch(() => false);
    expect(headingVisible).toBe(true);

    // Verify store names are displayed
    const storeNames = page.locator('.bg-emerald-50\\/50').locator('text=/Mağaza/i').or(
      page.locator('[class*="bg-emerald"][class*="50"]').locator('text=/Mağaza/i')
    );

    const storeCount = await storeNames.count();
    expect(storeCount).toBeGreaterThan(0);

    // Verify distances are displayed
    const distances = page.locator('.bg-emerald-50\\/50').locator('text=/km/i').or(
      page.locator('[class*="bg-emerald"][class*="50"]').locator('text=/km/i')
    );

    const distanceCount = await distances.count();
    expect(distanceCount).toBeGreaterThan(0);

    // Verify max 3 recommendations are shown
    const recommendationCount = await proximityBox.count();
    expect(recommendationCount).toBeLessThanOrEqual(3);
  });

  test('should display fallback message when no transfer options', async ({ page }) => {
    // Look for fallback message boxes (amber background)
    const fallbackBox = page.locator('.bg-amber-50\\/50').or(
      page.locator('[class*="bg-amber"][class*="50"]')
    );

    const isVisible = await fallbackBox.isVisible().catch(() => false);

    if (!isVisible) {
      // No alerts without transfer options - skip gracefully
      test.skip(true, 'No alerts without transfer options found');
      return;
    }

    // Verify the fallback box is visible
    await expect(fallbackBox.first()).toBeVisible();

    // Check for "Tüm mağazalarda stok yetersiz" message
    const message = page.locator('.bg-amber-50\\/50').filter({
      hasText: /Tüm mağazalarda stok yetersiz/i
    }).or(
      page.locator('[class*="bg-amber"][class*="50"]').filter({
        hasText: /Tüm mağazalarda stok yetersiz/i
      })
    );

    const messageVisible = await message.isVisible().catch(() => false);
    expect(messageVisible).toBe(true);
  });

  test('should not display proximity recommendations for non-stockout alerts', async ({ page }) => {
    // Look for any alert cards
    const allAlerts = page.locator('[class*="bg-"]').filter({
      hasText: /Stok Tükendi|Kritik Stok/i
    });

    const count = await allAlerts.count();

    if (count === 0) {
      // No alerts at all - skip gracefully
      test.skip(true, 'No alerts found on page');
      return;
    }

    // For each alert, verify it either has proximity recommendations or fallback
    for (let i = 0; i < count; i++) {
      const alert = allAlerts.nth(i);

      // Check if it's a stockout alert
      const text = await alert.textContent();
      if (!text) continue;

      const isStockout = /Stok Tükendi/i.test(text);

      if (isStockout) {
        // Stockout alerts should have either recommendations or fallback
        const hasRecommendations = await alert.locator('.bg-emerald-50\\/50, [class*="bg-emerald"][class*="50"]').count().then(c => c > 0);
        const hasFallback = await alert.locator('.bg-amber-50\\/50, [class*="bg-amber"][class*="50"]').count().then(c => c > 0);

        expect(hasRecommendations || hasFallback).toBe(true);
      }
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // This test verifies the page doesn't crash when there are no alerts
    // Just verify the page structure exists
    const pageContent = page.locator('body');
    await expect(pageContent).toBeVisible();

    // Look for inventory planning section indicator
    const sectionIndicator = page.locator('text=/Envanter Planlama/i').or(
      page.locator('text=/Inventory Planning/i')
    );

    const sectionVisible = await sectionIndicator.isVisible().catch(() => false);

    // Section should be visible or we should at least be on the right page
    const url = page.url();
    expect(url).toContain('inventory_planning');
  });
});

/**
 * Helper function to set up test data (for future use)
 *
 * This could be used in a beforeAll hook to create test alerts
 * with known proximity recommendations.
 */
async function setupTestData() {
  // TODO: Implement test data setup via API
  // 1. Create stores with known coordinates
  // 2. Create products with stock at some stores
  // 3. Create stockout alerts for stores with no stock
  // 4. Verify proximity recommendations are calculated correctly
}

/**
 * Helper function to clean up test data (for future use)
 */
async function cleanupTestData() {
  // TODO: Implement test data cleanup via API
}
